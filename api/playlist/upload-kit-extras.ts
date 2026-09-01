import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type } from '../../lib/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, selectedTitle, hookTitle, providers } = req.body;
    const title = selectedTitle || hookTitle || '새벽 감성 플레이리스트';

    const prompt = `[플레이리스트 정보]
- 영상 제목: ${title}
- 장르/무드: ${concept.genre} / ${concept.mood}

유튜브 업로드용 고정 댓글, 태그, CTA, 투명성 고지를 생성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pinnedComment: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            ctaLine: { type: Type.STRING },
            aiNotice: { type: Type.STRING },
          },
          required: ['pinnedComment', 'tags', 'ctaLine', 'aiNotice'],
        },
      },
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating upload kit extras:', error);
    res.status(500).json({ error: error.message || '업로드킷 생성에 실패했습니다.' });
  }
}
