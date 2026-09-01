import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type } from '../../lib/generate';
import { WORKFLOW } from '../../lib/workflow';

// Step-6 썸네일 프롬프트 — 서버 정본(workflow.json steps.thumbnail_prompt)을 그대로 적용한다.
// 무료·유료 키 불문 동일 규칙. 규칙 미통과 시 재생성 → 그래도 실패하면 보정 후 위반내역을 함께 반환한다.

const SPEC: any = WORKFLOW.steps.thumbnail_prompt;
const RULES: any = SPEC.rules;
const GENRES: Record<string, any> = SPEC.genres as any;

const WORDS_MIN: number = RULES.words_min;
const WORDS_MAX: number = RULES.words_max;
const MUST_INCLUDE: string[] = [...(RULES.must_include || [])];
const FORBIDDEN: string[] = [...(RULES.forbidden || [])];
const PLAYLIST_LINE: string = RULES.playlist_line;
const NEGATIVE_BASE: string = RULES.negative;
const MAX_ATTEMPTS = 3;

function pickLexicon(genreRaw: string): { key: string; lex: any } {
  const g = String(genreRaw || '').toLowerCase();
  for (const key of Object.keys(GENRES)) {
    if (key === 'default') continue;
    const matches: string[] = [...((GENRES[key] || {}).match || [])];
    if (matches.some((m) => g.includes(String(m).toLowerCase()))) {
      return { key, lex: GENRES[key] };
    }
  }
  return { key: 'default', lex: GENRES.default };
}

function fill(tpl: string, vars: Record<string, string>): string {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (_m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : ''
  );
}

function words(s: string): string[] {
  return String(s || '').trim().split(/\s+/).filter(Boolean);
}

function norm(s: string): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function findForbidden(prompt: string): string[] {
  const hit: string[] = [];
  for (const w of FORBIDDEN) {
    const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(prompt)) hit.push(w);
  }
  return hit;
}

// 규칙 게이트: 위반 항목을 사람이 읽을 수 있는 문자열 배열로 반환한다(빈 배열 = 통과).
function checkRules(prompt: string, palette: any): string[] {
  const bad: string[] = [];
  const n = words(prompt).length;
  if (n < WORDS_MIN || n > WORDS_MAX) {
    bad.push(`word_count=${n} (허용 ${WORDS_MIN}~${WORDS_MAX})`);
  }
  for (const token of MUST_INCLUDE) {
    if (!String(prompt).includes(token)) bad.push(`must_include 누락: ${token}`);
  }
  if (!norm(prompt).endsWith(norm(PLAYLIST_LINE))) {
    bad.push('playlist_line 문장으로 끝나지 않음');
  }
  const f = findForbidden(prompt);
  if (f.length) bad.push(`금지어 포함: ${f.join(', ')}`);
  if (!Array.isArray(palette) || palette.length !== 5) {
    bad.push(`palette=${Array.isArray(palette) ? palette.length : 'none'} (5색 필요)`);
  }
  return bad;
}

// 보정: 재생성으로도 통과하지 못한 결과를 규칙에 최대한 맞춘다(없는 내용을 지어내지는 않는다).
function repair(prompt: string, palette: any, lex: any): { prompt: string; palette: string[] } {
  let p = norm(prompt);

  for (const w of FORBIDDEN) {
    const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    p = p.replace(re, '');
  }
  p = norm(p.replace(/\s+([,.])/g, '$1'));

  const line = norm(PLAYLIST_LINE);
  if (p.endsWith(line)) p = norm(p.slice(0, p.length - line.length));
  // playlist_line 앞부분이 words_max를 넘지 않도록만 자른다(문장 단위 우선).
  const lineWords = words(line).length;
  const budget = Math.max(0, WORDS_MAX - lineWords);
  if (words(p).length > budget) {
    const sentences = p.split(/(?<=\.)\s+/);
    let acc: string[] = [];
    for (const s of sentences) {
      if (words(acc.join(' ') + ' ' + s).length > budget) break;
      acc.push(s);
    }
    p = acc.length ? norm(acc.join(' ')) : words(p).slice(0, budget).join(' ');
  }
  p = norm(p + (p.endsWith('.') || p.length === 0 ? '' : '.') + ' ' + line);

  let pal: string[] = Array.isArray(palette) ? palette.filter((c: any) => typeof c === 'string') : [];
  const hint: string[] = [...((lex || {}).palette || [])];
  for (let i = 0; pal.length < 5 && i < hint.length; i++) {
    if (!pal.includes(hint[i])) pal.push(hint[i]);
  }
  pal = pal.slice(0, 5);

  return { prompt: p, palette: pal };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, selectedTitle, hookTitle, providers } = req.body || {};
    const c = concept || {};
    const title = selectedTitle || hookTitle || '새벽 감성 플레이리스트';
    const genreRaw = c.genreCustom || c.genre || '';
    const { key: genreKey, lex } = pickLexicon(genreRaw);

    const system = fill(SPEC.system, {
      words_min: String(WORDS_MIN),
      words_max: String(WORDS_MAX),
      forbidden: FORBIDDEN.join(', '),
      playlist_line: PLAYLIST_LINE,
    });

    const negative = [NEGATIVE_BASE, lex.avoid].filter(Boolean).join(', ');

    const userPrompt = fill(SPEC.prompt, {
      genre: genreRaw || genreKey,
      title,
      mood: c.moodCustom || c.mood || '',
      scene: c.sceneCustom || c.scene || '',
      lex_scene: lex.scene || '',
      lex_subject: lex.subject || '',
      lex_lighting: lex.lighting || '',
      lex_camera: lex.camera || '',
      lex_mood: [...(lex.mood || [])].join(', '),
      lex_avoid: lex.avoid || '',
      lex_palette: [...(lex.palette || [])].join(', '),
      negative,
    });

    const config: any = {
      systemInstruction: system,
      temperature: (SPEC.params && SPEC.params.temperature) ?? 0.45,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          negativePrompt: { type: Type.STRING },
          palette: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['prompt', 'negativePrompt', 'palette'],
      },
    };

    let parsed: any = null;
    let bad: string[] = [];
    let attempts = 0;
    let telemetry: any = null;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      attempts = i + 1;
      const contents =
        i === 0
          ? userPrompt
          : userPrompt +
            `\n\n[재작성 지시] 직전 출력이 규칙을 위반했다: ${bad.join(' / ')}. ` +
            `프롬프트는 정확히 ${WORDS_MIN}~${WORDS_MAX} 단어여야 하고, 금지어를 쓰지 말고, ` +
            `반드시 다음 문장으로 끝나야 한다: "${PLAYLIST_LINE}"`;

      parsed = await generateContentWithRetry({ providers: providers || [], contents, config });
      telemetry = parsed._telemetry || telemetry;
      bad = checkRules(parsed.prompt, parsed.palette);
      if (!bad.length) break;
      console.warn(`[workflow gate] attempt ${attempts} 위반: ${bad.join(' / ')}`);
    }

    let repaired = false;
    if (bad.length) {
      const fixed = repair(parsed.prompt, parsed.palette, lex);
      parsed.prompt = fixed.prompt;
      parsed.palette = fixed.palette;
      repaired = true;
      bad = checkRules(parsed.prompt, parsed.palette);
    }

    // negativePrompt 는 정본 negative + 장르 avoid 를 항상 포함시킨다.
    const np = String(parsed.negativePrompt || '');
    parsed.negativePrompt = np.includes(NEGATIVE_BASE) ? np : [negative, np].filter(Boolean).join(', ');

    const promptData = {
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt,
      palette: parsed.palette,
    };

    res.json({
      promptData,
      images: [],
      _telemetry: telemetry,
      _workflow: {
        version: SPEC.version,
        genre: genreKey,
        attempts,
        repaired,
        passed: bad.length === 0,
        violations: bad,
        wordCount: words(promptData.prompt).length,
      },
    });
  } catch (error: any) {
    console.error('Error generating thumbnail prompt:', error);
    res.status(500).json({ error: error.message || '썸네일 프롬프트 생성에 실패했습니다.' });
  }
}
