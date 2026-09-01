import { GoogleGenAI, Type } from '@google/genai';

export { Type };

function getGenAI() {
  const apiKey =
    (Math.random() > 0.5
      ? process.env.GEMINI_API_KEY
      : process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY) ||
    process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
];

let MODEL_CHAIN_CACHE: string[] = [];

async function resolveModelChain(ai: any): Promise<string[]> {
  if (MODEL_CHAIN_CACHE.length) return MODEL_CHAIN_CACHE;
  try {
    const chain: string[] = [];
    const pager: any = await ai.models.list();
    for await (const md of pager) {
      const name = String(md.name || '').replace('models/', '');
      const actions = JSON.stringify(
        md.supportedActions || md.supportedGenerationMethods || []
      );
      if (!actions.includes('generateContent')) continue;
      if (!name.startsWith('gemini')) continue;
      if (/embedding|aqa|tts|image|vision|live|audio/.test(name)) continue;
      chain.push(name);
    }
    const score = (n: string) =>
      n.includes('flash-lite-latest')
        ? 0
        : n.includes('flash-latest')
          ? 1
          : n.includes('lite')
            ? 2
            : n.includes('flash')
              ? 3
              : n.includes('latest')
                ? 4
                : 5;
    chain.sort((a, b) => score(a) - score(b));
    if (chain.length) MODEL_CHAIN_CACHE = chain.slice(0, 6);
  } catch (e) {
    console.warn(
      '[Model auto-detect] list failed, using static fallback:',
      String(e).slice(0, 80)
    );
  }
  if (!MODEL_CHAIN_CACHE.length) MODEL_CHAIN_CACHE = FALLBACK_MODELS;
  return MODEL_CHAIN_CACHE;
}

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  maxAttempts?: number;
  fallbackGenerator?: () => any;
  providers?: any[];
}) {
  let lastError: any = null;
  const maxAttempts = params.maxAttempts || 4;
  const startTime = Date.now();

  const _provs = (params.providers || []).filter(
    (p: any) => p && p.apiKey && p.enabled
  );
  const _chain = [
    ..._provs.filter((p: any) => !p.isPaid),
    ..._provs.filter((p: any) => p.isPaid),
  ];
  if (_chain.length) {
    const _sys = (params.config && params.config.systemInstruction) || '';
    const _user =
      typeof params.contents === 'string'
        ? params.contents
        : JSON.stringify(params.contents);
    const _schema = params.config && params.config.responseSchema;
    const _hint = _schema
      ? '\n\n[출력] 설명 없이 유효한 JSON 하나만 출력하라.'
      : '';
    const _prompt = (_sys ? '[지침] ' + _sys + '\n\n' : '') + _user + _hint;
    for (const p of _chain) {
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
          const url =
            String(p.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
          const b: any = {
            model: p.model,
            messages: [{ role: 'user', content: _prompt }],
            temperature: 1.1,
          };
          if (_schema) b.response_format = { type: 'json_object' };
          const r = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + p.apiKey,
            },
            body: JSON.stringify(b),
          });
          if (!r.ok) throw new Error(p.id + ':' + r.status);
          const j: any = await r.json();
          text =
            (j.choices &&
              j.choices[0] &&
              j.choices[0].message &&
              j.choices[0].message.content) ||
            '';
        }
        text = text.trim();
        if (text.startsWith('```json')) text = text.slice(7);
        else if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        const parsed = JSON.parse(text.trim() || '{}');
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
        console.warn(
          '[provider ' + p.id + '] failed:',
          String((e && e.message) || e).slice(0, 90)
        );
      }
    }
  }

  const ai = getGenAI();
  const modelChain = await resolveModelChain(ai);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const modelToUse = modelChain[attempt % modelChain.length];
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: params.contents,
        config: params.config,
      });

      const latencyMs = Date.now() - startTime;
      let text = response.text || '';
      text = text.trim();
      if (text.startsWith('```json')) text = text.slice(7);
      else if (text.startsWith('```')) text = text.slice(3);
      if (text.endsWith('```')) text = text.slice(0, -3);
      text = text.trim();

      const parsed = JSON.parse(text || '{}');
      const inTokens =
        response.usageMetadata?.promptTokenCount ||
        Math.ceil(JSON.stringify(params.contents).length / 3.8);
      const outTokens =
        response.usageMetadata?.candidatesTokenCount ||
        Math.ceil(text.length / 3.8);
      const costUsd = inTokens * 0.00000015 + outTokens * 0.0000006;

      return {
        ...parsed,
        _telemetry: { model: modelToUse, inTokens, outTokens, latencyMs, costUsd },
      };
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Gemini API] Attempt ${attempt + 1}/${maxAttempts} with model '${modelToUse}' failed:`,
        err?.message || err
      );
      if (attempt < maxAttempts - 1) {
        const emsg = String((err && err.message) || err);
        const is429 =
          emsg.includes('429') || emsg.includes('RESOURCE_EXHAUSTED');
        const retryMatch = emsg.match(/retry in ([0-9.]+)s/i);
        const delayMs = is429
          ? Math.min(
              20000,
              retryMatch
                ? Math.ceil(parseFloat(retryMatch[1]) * 1000)
                : 12000
            )
          : (attempt + 1) * 800;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  MODEL_CHAIN_CACHE = [];
  throw (
    lastError ||
    new Error('현재 AI 서버 트래픽이 많습니다. 잠시 후 다시 시도해 주세요.')
  );
}
