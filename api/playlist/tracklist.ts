import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type, NoProviderKeyError } from '../../lib/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, selectedTitle, providers } = req.body;
    const trackCount = Math.max(8, Math.min(20, Number(concept.trackCount) || 10));
    const avgDurationMin = Math.max(2, Math.min(5, Number(concept.avgDurationMin) || 3));

    const prompt = `[플레이리스트 정보]
- 확정 영상 제목: ${selectedTitle || '새벽 감성 플레이리스트'}
- 장르: ${concept.genre}
- 무드: ${concept.mood}
- 장면: ${concept.scene}
- 보컬 유형: ${concept.vocalType}
- 수록곡 수: ${trackCount}곡
- 곡당 평균 길이: 약 ${avgDurationMin}분

감정 곡선(Emotional Curve)을 반영한 ${trackCount}개 트랙 리스트를 생성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.INTEGER },
                  titleKo: { type: Type.STRING },
                  titleEn: { type: Type.STRING },
                  moodTag: { type: Type.STRING },
                  bpm: { type: Type.INTEGER },
                  key: { type: Type.STRING },
                  instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
                  durationSec: { type: Type.INTEGER },
                  sunoPrompt: { type: Type.STRING },
                },
                required: ['index', 'titleKo', 'titleEn', 'moodTag', 'bpm', 'key', 'instruments', 'durationSec', 'sunoPrompt'],
              },
            },
          },
          required: ['tracks'],
        },
      },
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating tracklist:', error);
    res.status(error instanceof NoProviderKeyError ? 400 : 500).json({ error: error.message || '트랙리스트 생성에 실패했습니다.' });
  }
}
