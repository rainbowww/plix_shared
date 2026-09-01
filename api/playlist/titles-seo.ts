import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateContentWithRetry, Type } from '../../lib/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { concept, providers } = req.body;
    const effectiveGenre = concept.genre === '직접 입력' ? concept.genreCustom : concept.genre;
    const effectiveMood = concept.mood === '직접 입력' ? concept.moodCustom : concept.mood;
    const effectiveScene = concept.scene === '직접 입력' ? concept.sceneCustom : concept.scene;

    const SEED_TIMES = ['이른 아침', '오전', '햇살 좋은 한낮', '나른한 오후', '해질녘', '저녁', '밤', '자정', '새벽 1시', '새벽 4시', '일요일 오후', '토요일 밤'];
    const SEED_SCENES = ['비 오는 골목', '눈 내리는 창가', '옥탑방 불빛', '마감 직전 도서관', '한강 벤치', '심야 버스 맨 뒷자리', '편의점 앞 파라솔', '캠핑 텐트 속 랜턴', '오래된 LP 카페', '기차 창가', '골목 끝 세탁소 불빛', '비 갠 뒤 놀이터'];
    const SEED_EMOTIONS = ['혼자이고 싶은 날', '아무 생각 없이 멍하니', '오래된 그리움', '작은 설렘', '번아웃 끝의 위로', '조용한 집중', '몽상', '고요한 해방감'];
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const seedTime = String(concept.timeOfDay || '').trim() || pick(SEED_TIMES);
    const seedScene = String(effectiveScene || '').trim() || pick(SEED_SCENES);
    const seedEmotion = pick(SEED_EMOTIONS);
    const varietySeed = `${seedTime} / ${seedScene} / ${seedEmotion}`;

    const prompt = `[플레이리스트 컨셉 정보]
- 장르: ${effectiveGenre || '로파이 힙합'}
- 무드: ${effectiveMood || '몽환적인, 차분한'}
- 장면: ${effectiveScene || '비 오는 새벽 서울 골목'}
- 시간대: ${seedTime}, 계절: ${concept.season || '장르에 어울리게 자유'}
- 타겟 청자: ${concept.targetAudience || '이 장르·무드를 즐기는 리스너'}
- 보컬 유형: ${concept.vocalType || '연주곡(보컬 없음)'}
- 가사 언어: ${concept.lyricsLang || '한국어'}
- 자유 키워드: ${concept.freeKeywords || '없음'}
- ★이번 회차 소재 시드: ${varietySeed}
- 최우선 규칙: 사용자가 고른 장면·시간대가 절대 기준이다.
- '새벽 3시' 등 특정 표현 반복 금지.

위 컨셉을 바탕으로 유튜브 플레이리스트 영상에 필요한 감성 이모지 제목 8개, 채널명 후보 5개, 최고 추천 제목(hookTitle), 감성 설명란 도입부 3~5문장, 해시태그 12개, SEO 검색 키워드 15개, 썸네일 카피(main, sub, badge)를 생성하라.`;

    const parsed = await generateContentWithRetry({
      providers: providers || [],
      contents: prompt,
      config: {
        temperature: 1.15,
        topP: 0.95,
        systemInstruction: '너는 15년차 음악감독 + 유튜브 SEO 전문가 + 아트디렉터다.\n한국인이 실제 검색창에 치는 현실적 말투로 작성한다.\n요청된 JSON 스키마만 출력한다.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            videoTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
            channelNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            hookTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            seoKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            thumbnailCopy: {
              type: Type.OBJECT,
              properties: {
                main: { type: Type.STRING },
                sub: { type: Type.STRING },
                badge: { type: Type.STRING },
              },
              required: ['main', 'sub', 'badge'],
            },
          },
          required: ['videoTitles', 'channelNames', 'hookTitle', 'description', 'hashtags', 'seoKeywords', 'thumbnailCopy'],
        },
      },
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating titles:', error);
    res.status(500).json({ error: error.message || '제목 생성에 실패했습니다.' });
  }
}
