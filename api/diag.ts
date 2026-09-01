import type { VercelRequest, VercelResponse } from '@vercel/node';

// 임시 진단용. 어떤 모듈이 런타임에서 로드에 실패하는지 원문 오류를 돌려준다.
// 원인 확정 후 삭제한다.

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const out: Record<string, any> = {
    node: process.version,
    cwd: process.cwd(),
  };

  try {
    const genai = await import('@google/genai');
    out.googleGenai = { ok: true, exports: Object.keys(genai).slice(0, 12) };
  } catch (e: any) {
    out.googleGenai = { ok: false, name: e?.name, message: String(e?.message).slice(0, 400) };
  }

  try {
    const lib = await import('../lib/generate');
    out.libGenerate = { ok: true, exports: Object.keys(lib) };
  } catch (e: any) {
    out.libGenerate = { ok: false, name: e?.name, message: String(e?.message).slice(0, 400) };
  }

  try {
    const wf = await import('../lib/workflow');
    out.libWorkflow = { ok: true, hasSteps: !!(wf as any).WORKFLOW?.steps };
  } catch (e: any) {
    out.libWorkflow = { ok: false, name: e?.name, message: String(e?.message).slice(0, 400) };
  }

  res.json(out);
}
