import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type } from '../_lib/generate';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, selectedTitle, hookTitle, providers } = req.body;
    const title = selectedTitle || hookTitle || '새벽 감성 플레이리스트';

    const prompt = `[플레이리스트 컨셉]
- 타이틀: ${title}
- 장르: ${concept.genre}, 무드: ${concept.mood}, 장면: ${concept.scene}

1280x720 썸네일 생성용 영문 프롬프트와 컬러 팔레트를 작성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
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
      },
    });

    res.json({ promptData: parsed, images: [], _telemetry: parsed._telemetry });
  } catch (error: any) {
    console.error('Error generating thumbnail prompt:', error);
    res.status(500).json({ error: error.message || '썸네일 프롬프트 생성에 실패했습니다.' });
  }
}
