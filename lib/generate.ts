import { GoogleGenAI, Type } from '@google/genai';

export { Type };

// ─────────────────────────────────────────────────────────────
// 외장형(BYOK) 전용 — 서버는 API 키를 보유하지 않는다.
// 모든 호출은 요청마다 브라우저가 보내온 "그 사용자의 키"로만 나간다.
// 서버 키 폴백이 없으므로 A 고객의 실패가 다른 고객·운영자 키 소비로
// 이어지지 않고, 사용자 키는 저장·캐시되지 않는다(요청 지역변수로만 사용).
// ─────────────────────────────────────────────────────────────

export class NoProviderKeyError extends Error {
  constructor() {
    super(
      '사용 가능한 API 키가 없습니다. 우측 상단 설정(⚙)에서 본인의 API 키를 입력하고 연결 테스트 후 저장해 주세요.'
    );
    this.name = 'NoProviderKeyError';
  }
}

type Provider = {
  id: string;
  apiKey: string;
  enabled?: boolean;
  isPaid?: boolean;
  kind?: string;
  model: string;
  baseUrl?: string;
};

function stripFence(text: string): string {
  let t = String(text || '').trim();
  if (t.startsWith('```json')) t = t.slice(7);
  else if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  return t.trim();
}

function isRateLimit(err: any): boolean {
  const m = String((err && err.message) || err);
  return m.includes('429') || m.includes('RESOURCE_EXHAUSTED');
}

function retryDelayMs(err: any, round: number): number {
  const m = String((err && err.message) || err);
  const hit = m.match(/retry in ([0-9.]+)s/i);
  if (isRateLimit(err)) {
    return Math.min(20000, hit ? Math.ceil(parseFloat(hit[1]) * 1000) : 12000);
  }
  return (round + 1) * 800;
}

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  maxAttempts?: number;
  providers?: any[];
}) {
  const startTime = Date.now();
  const rounds = params.maxAttempts || 2;

  // 사용자 공급자만 사용한다. 무료 → 유료 순서.
  const usable: Provider[] = (params.providers || []).filter(
    (p: any) => p && p.apiKey && p.enabled
  );
  const chain = [
    ...usable.filter((p) => !p.isPaid),
    ...usable.filter((p) => p.isPaid),
  ];

  if (!chain.length) throw new NoProviderKeyError();

  const sys = (params.config && params.config.systemInstruction) || '';
  const user =
    typeof params.contents === 'string'
      ? params.contents
      : JSON.stringify(params.contents);
  const schema = params.config && params.config.responseSchema;
  const hint = schema ? '\n\n[출력] 설명 없이 유효한 JSON 하나만 출력하라.' : '';
  const flatPrompt = (sys ? '[지침] ' + sys + '\n\n' : '') + user + hint;

  let lastError: any = null;

  for (let round = 0; round < rounds; round++) {
    for (const p of chain) {
      try {
        let text = '';

        if (p.kind === 'gemini') {
          const gai = new GoogleGenAI({ apiKey: p.apiKey });
          const resp: any = await gai.models.generateContent({
            model: p.model,
            contents: params.contents,
            config: params.config,
          });
          text = resp.text || '';
        } else {
          const url = String(p.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
          const body: any = {
            model: p.model,
            messages: [{ role: 'user', content: flatPrompt }],
            temperature: (params.config && params.config.temperature) ?? 1.1,
          };
          if (schema) body.response_format = { type: 'json_object' };
          const r = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + p.apiKey,
            },
            body: JSON.stringify(body),
          });
          if (!r.ok) throw new Error(p.id + ':' + r.status);
          const j: any = await r.json();
          text =
            (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) ||
            '';
        }

        const parsed = JSON.parse(stripFence(text) || '{}');
        return {
          ...parsed,
          _telemetry: {
            model: 'user:' + p.id,
            inTokens: 0,
            outTokens: 0,
            latencyMs: Date.now() - startTime,
            costUsd: 0,
          },
        };
      } catch (e: any) {
        lastError = e;
        // 키 값은 절대 로그에 남기지 않는다 — 공급자 id와 사유만 기록.
        console.warn(
          '[provider ' + p.id + '] failed:',
          String((e && e.message) || e).slice(0, 90)
        );
      }
    }

    if (round < rounds - 1) {
      await new Promise((r) => setTimeout(r, retryDelayMs(lastError, round)));
    }
  }

  throw (
    lastError ||
    new Error('등록하신 API 키로 생성에 실패했습니다. 키 상태와 잔여 쿼터를 확인해 주세요.')
  );
}
