import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type } from '../../lib/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, providers } = req.body;

    const prompt = `[플레이리스트 컨셉 & 트랙 분위기]
- 장르: ${concept.genre}
- 무드: ${concept.mood}
- 장면: ${concept.scene}
- 보컬 설정: ${concept.vocalType}

Suno AI 최적화 프롬프트 팩을 생성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            styleOfMusic: { type: Type.STRING },
            excludeStyles: { type: Type.STRING },
            personaHint: { type: Type.STRING },
            advancedTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['styleOfMusic', 'excludeStyles', 'personaHint', 'advancedTips'],
        },
      },
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating Suno prompts:', error);
    res.status(500).json({ error: error.message || 'Suno 프롬프트 생성에 실패했습니다.' });
  }
}
