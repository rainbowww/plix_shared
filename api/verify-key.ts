import type { VercelRequest, VercelResponse } from '@vercel/node';

// 고객이 입력한 API 키의 "연결 테스트" 전용 엔드포인트.
// 키는 이 요청 안에서만 사용하고 저장·로그·캐시하지 않는다.
// 브라우저에서 각 공급자로 직접 호출하면 CORS에 막히므로 서버가 중계만 한다.

const TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, init: any) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, kind, baseUrl, model } = (req.body || {}) as {
    apiKey?: string;
    kind?: string;
    baseUrl?: string;
    model?: string;
  };

  if (!apiKey) return res.status(400).json({ ok: false, detail: 'API 키가 비어 있습니다.' });

  try {
    if (kind === 'gemini') {
      const r = await fetchWithTimeout(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' +
          encodeURIComponent(apiKey),
        { method: 'GET' }
      );
      if (r.ok) {
        const j: any = await r.json().catch(() => ({}));
        const n = Array.isArray(j.models) ? j.models.length : 0;
        return res.json({ ok: true, detail: `연결 성공 (사용 가능 모델 ${n}개)` });
      }
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        return res.json({ ok: false, detail: '키가 유효하지 않습니다. 다시 확인해 주세요.' });
      }
      if (r.status === 429) {
        return res.json({ ok: false, detail: '키는 유효하나 현재 쿼터를 초과했습니다.' });
      }
      return res.json({ ok: false, detail: `연결 실패 (HTTP ${r.status})` });
    }

    const base = String(baseUrl || '').replace(/\/+$/, '');
    if (!base) return res.json({ ok: false, detail: 'baseUrl이 설정되지 않았습니다.' });

    const isAnthropic = /(^|\.)api\.anthropic\.com$/i.test(new URL(base).hostname);
    const headers: Record<string, string> = isAnthropic
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : { Authorization: 'Bearer ' + apiKey };

    const r = await fetchWithTimeout(base + '/models', { method: 'GET', headers });
    if (r.ok) {
      const j: any = await r.json().catch(() => ({}));
      const list = Array.isArray(j.data) ? j.data : [];
      const found = model && list.some((m: any) => m && m.id === model);
      return res.json({
        ok: true,
        detail: found
          ? `연결 성공 (${model} 사용 가능)`
          : `연결 성공 (모델 ${list.length}개)`,
      });
    }
    if (r.status === 401 || r.status === 403) {
      return res.json({ ok: false, detail: '키가 유효하지 않습니다. 다시 확인해 주세요.' });
    }
    if (r.status === 429) {
      return res.json({ ok: false, detail: '키는 유효하나 현재 쿼터를 초과했습니다.' });
    }
    return res.json({ ok: false, detail: `연결 실패 (HTTP ${r.status})` });
  } catch (e: any) {
    const msg = e && e.name === 'AbortError' ? '응답 시간 초과' : '연결할 수 없습니다';
    // 키가 섞일 수 있는 원문 에러는 남기지 않는다.
    console.warn('[verify-key] failed:', kind, msg);
    return res.json({ ok: false, detail: msg });
  }
}
