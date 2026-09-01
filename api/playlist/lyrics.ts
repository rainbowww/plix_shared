import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type, NoProviderKeyError } from '../../lib/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { track, concept, selectedSections, providers } = req.body;

    const sectionsToInclude =
      selectedSections && selectedSections.length > 0
        ? selectedSections
        : ['Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Bridge', 'Outro'];

    const prompt = `[곡 정보]
- 트랙명: ${track.titleKo} (${track.titleEn})
- 분위기: ${track.moodTag}
- BPM: ${track.bpm}, Key: ${track.key}
- 요청된 곡 구조 섹션: ${sectionsToInclude.join(', ')}

Suno AI 가사창에 그대로 복사할 수 있는 가사를 작성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullText: { type: Type.STRING },
            sections: {
              type: Type.OBJECT,
              properties: {
                Intro: { type: Type.STRING },
                'Verse 1': { type: Type.STRING },
                'Pre-Chorus': { type: Type.STRING },
                Chorus: { type: Type.STRING },
                'Verse 2': { type: Type.STRING },
                Bridge: { type: Type.STRING },
                Outro: { type: Type.STRING },
              },
            },
            englishTranslation: { type: Type.STRING },
          },
          required: ['fullText', 'sections'],
        },
      },
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating lyrics:', error);
    res.status(error instanceof NoProviderKeyError ? 400 : 500).json({ error: error.message || '가사 생성에 실패했습니다.' });
  }
}
