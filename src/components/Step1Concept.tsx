import React from 'react';
import { Concept } from '../types';
import { Sparkles, Sliders, Music, Clock, Users, Mic2, Compass } from 'lucide-react';

interface Step1ConceptProps {
  concept: Concept;
  onChange: (concept: Concept) => void;
  onNext: () => void;
  isLoading?: boolean;
}

const GENRE_OPTIONS = [
  '로파이 힙합',
  '시티팝',
  '재즈 카페',
  '보사노바',
  '앰비언트',
  '어쿠스틱 발라드',
  'R&B 소울',
  '피아노 연주곡',
  '신스웨이브',
  'K-인디 감성',
  '빗소리 ASMR+피아노',
  '직접 입력',
];

const MOOD_OPTIONS = [
  '몽환적인',
  '쓸쓸한',
  '설레는',
  '차분한',
  '나른한',
  '따뜻한',
  '도시적인',
  '아련한',
  '직접 입력',
];

const SCENE_OPTIONS = [
  '비 오는 새벽 서울 골목',
  '해질녘 한강',
  '눈 내리는 기차 안',
  '늦은 밤 편의점 앞',
  '햇살 드는 카페 창가',
  '새벽 4시 텅 빈 지하철',
  '직접 입력',
];

const TIME_OPTIONS = ['새벽', '아침', '오후', '밤', '직접 입력'];
const SEASON_OPTIONS = ['봄', '여름', '가을', '겨울', '사계절', '직접 입력'];
const AUDIENCE_OPTIONS = ['수험생', '야근 직장인', '카페 BGM', '불면', '드라이브', '직접 입력'];
const VOCAL_OPTIONS = ['연주곡(보컬 없음)', '여성', '남성', '듀엣'];
const LYRICS_LANG_OPTIONS = ['한국어', '영어', '없음'];

const PRESETS = [
  {
    name: '🌧️ 비 오는 새벽 로파이',
    data: {
      genre: '로파이 힙합',
      genreCustom: '',
      mood: '쓸쓸한',
      moodCustom: '',
      scene: '비 오는 새벽 서울 골목',
      sceneCustom: '',
      timeOfDay: '새벽',
      season: '가을',
      targetAudience: '야근 직장인',
      vocalType: '연주곡(보컬 없음)',
      lyricsLang: '없음',
      trackCount: 10,
      avgDurationMin: 3,
      freeKeywords: '창문에 맺힌 빗방울, 식은 아메리카노, 따뜻한 조명',
    },
  },
  {
    name: '🌆 퇴근길 한강 시티팝',
    data: {
      genre: '시티팝',
      genreCustom: '',
      mood: '도시적인',
      moodCustom: '',
      scene: '해질녘 한강',
      sceneCustom: '',
      timeOfDay: '오후',
      season: '여름',
      targetAudience: '드라이브',
      vocalType: '여성',
      lyricsLang: '한국어',
      trackCount: 10,
      avgDurationMin: 3,
      freeKeywords: '노을빛 한강 다리, 네온사인, 80년대 레트로 신스, 청량함',
    },
  },
  {
    name: '☕ 햇살 드는 카페 재즈',
    data: {
      genre: '재즈 카페',
      genreCustom: '',
      mood: '나른한',
      moodCustom: '',
      scene: '햇살 드는 카페 창가',
      sceneCustom: '',
      timeOfDay: '오후',
      season: '봄',
      targetAudience: '카페 BGM',
      vocalType: '연주곡(보컬 없음)',
      lyricsLang: '없음',
      trackCount: 12,
      avgDurationMin: 3,
      freeKeywords: '원두 향기, 여유로운 오후, 부드러운 콘트라베이스, 따뜻한 브런치',
    },
  },
  {
    name: '❄️ 눈 내리는 밤 어쿠스틱',
    data: {
      genre: '어쿠스틱 발라드',
      genreCustom: '',
      mood: '아련한',
      moodCustom: '',
      scene: '눈 내리는 기차 안',
      sceneCustom: '',
      timeOfDay: '밤',
      season: '겨울',
      targetAudience: '불면',
      vocalType: '듀엣',
      lyricsLang: '한국어',
      trackCount: 8,
      avgDurationMin: 4,
      freeKeywords: '하얀 입김, 창밖 설경, 통기타 아르페지오, 그리운 기억',
    },
  },
];

export function Step1Concept({ concept, onChange, onNext, isLoading }: Step1ConceptProps) {
  const updateField = <K extends keyof Concept>(field: K, value: Concept[K]) => {
    onChange({
      ...concept,
      [field]: value,
    });
  };

  const applyPreset = (presetData: Partial<Concept>) => {
    onChange({
      ...concept,
      ...presetData,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00ffca] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
              <Sparkles className="w-3.5 h-3.5 fill-[#111111]" />
              <span>STEP 1: PLAYLIST CONCEPT</span>
            </div>
            <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
              어떤 음악 플레이리스트를 만들까요?
            </h1>
            <p className="text-[#333333] text-sm mt-1 max-w-xl font-medium">
              원하는 장르, 감정 무드, 장면 및 사운드 스펙을 설정하세요. 기본값이 미리 세팅되어 바로 시작할 수 있습니다.
            </p>
          </div>

          <button
            onClick={onNext}
            disabled={isLoading}
            className="self-start md:self-auto px-6 py-3.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>제목 & SEO 생성하기</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-6 pt-5 border-t-2 border-[#111111]">
          <div className="flex items-center gap-2 text-xs font-mono-neo font-bold text-[#111111] mb-3 uppercase">
            <Compass className="w-4 h-4 text-[#ff477e]" />
            <span>빠른 원클릭 컨셉 프리셋:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(preset.data)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] hover:shadow-[3px_3px_0_#111111] text-xs font-bold text-[#111111] transition-all truncate cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Core Mood & Atmosphere */}
        <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b-2 border-[#111111]">
            <div className="p-2 bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] rounded-lg">
              <Music className="w-4 h-4 text-[#111111]" />
            </div>
            <h2 className="text-lg font-mono-neo font-extrabold text-[#111111] uppercase">음악 장르 & 무드 설정</h2>
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
              음악 장르 <span className="text-[#ff477e]">*</span>
            </label>
            <select
              value={concept.genre}
              onChange={(e) => updateField('genre', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e] focus:shadow-[4px_4px_0_#111111] transition-all"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {concept.genre === '직접 입력' && (
              <input
                type="text"
                value={concept.genreCustom}
                onChange={(e) => updateField('genreCustom', e.target.value)}
                placeholder="예: 드림팝, 칠합, 하이퍼팝 등 직접 입력"
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-medium text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              />
            )}
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
              감정 무드 <span className="text-[#ff477e]">*</span>
            </label>
            <select
              value={concept.mood}
              onChange={(e) => updateField('mood', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e] focus:shadow-[4px_4px_0_#111111] transition-all"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {concept.mood === '직접 입력' && (
              <input
                type="text"
                value={concept.moodCustom}
                onChange={(e) => updateField('moodCustom', e.target.value)}
                placeholder="예: 벅차오르는, 몽글몽글한, 긴장감 넘치는 등"
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-medium text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              />
            )}
          </div>

          {/* Scene */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
              배경 장면 (Scene) <span className="text-[#ff477e]">*</span>
            </label>
            <select
              value={concept.scene}
              onChange={(e) => updateField('scene', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e] focus:shadow-[4px_4px_0_#111111] transition-all"
            >
              {SCENE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {concept.scene === '직접 입력' && (
              <input
                type="text"
                value={concept.sceneCustom}
                onChange={(e) => updateField('sceneCustom', e.target.value)}
                placeholder="예: 제주도 해안도로 드라이브, 모닥불 앞 등"
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-medium text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              />
            )}
          </div>

          {/* Time & Season Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">시간대</label>
              <select
                value={concept.timeOfDay}
                onChange={(e) => updateField('timeOfDay', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">계절</label>
              <select
                value={concept.season}
                onChange={(e) => updateField('season', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              >
                {SEASON_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Audio Specs & Vocal */}
        <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b-2 border-[#111111]">
            <div className="p-2 bg-[#00ffca] border-2 border-[#111111] shadow-[2px_2px_0_#111111] rounded-lg">
              <Sliders className="w-4 h-4 text-[#111111]" />
            </div>
            <h2 className="text-lg font-mono-neo font-extrabold text-[#111111] uppercase">타겟 청자 & 수록곡 스펙</h2>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
              <Users className="w-3.5 h-3.5 inline mr-1 text-[#ff477e]" />
              타겟 청자 / 상황
            </label>
            <select
              value={concept.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Vocal Type & Lyrics Language Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
                <Mic2 className="w-3.5 h-3.5 inline mr-1 text-[#ff477e]" />
                보컬 구성
              </label>
              <select
                value={concept.vocalType}
                onChange={(e) => updateField('vocalType', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              >
                {VOCAL_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">가사 언어</label>
              <select
                value={concept.lyricsLang}
                onChange={(e) => updateField('lyricsLang', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-semibold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
              >
                {LYRICS_LANG_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders: Track Count & Duration */}
          <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[3px_3px_0_#111111] space-y-5">
            {/* Track Count Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono-neo font-bold mb-2">
                <span className="text-[#111111] flex items-center gap-1.5 uppercase">
                  <Music className="w-3.5 h-3.5 text-[#ff477e]" /> 수록곡 수
                </span>
                <span className="px-2.5 py-0.5 bg-[#ffd166] border border-[#111111] text-[#111111] font-extrabold text-sm shadow-[1px_1px_0_#111111]">
                  {concept.trackCount}곡
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={20}
                step={1}
                value={concept.trackCount}
                onChange={(e) => updateField('trackCount', parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-white border-2 border-[#111111] rounded-lg appearance-none cursor-pointer accent-[#ff477e]"
              />
              <div className="flex justify-between text-[11px] text-[#444444] mt-1 font-mono-neo font-bold">
                <span>8곡 (미니)</span>
                <span>10곡 (기본)</span>
                <span>15곡</span>
                <span>20곡 (롱)</span>
              </div>
            </div>

            {/* Average Track Duration Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono-neo font-bold mb-2">
                <span className="text-[#111111] flex items-center gap-1.5 uppercase">
                  <Clock className="w-3.5 h-3.5 text-[#ff477e]" /> 곡당 평균 길이
                </span>
                <span className="px-2.5 py-0.5 bg-[#00ffca] border border-[#111111] text-[#111111] font-extrabold text-sm shadow-[1px_1px_0_#111111]">
                  약 {concept.avgDurationMin}분 (총 {concept.trackCount * concept.avgDurationMin}분)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                step={1}
                value={concept.avgDurationMin}
                onChange={(e) => updateField('avgDurationMin', parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-white border-2 border-[#111111] rounded-lg appearance-none cursor-pointer accent-[#ff477e]"
              />
              <div className="flex justify-between text-[11px] text-[#444444] mt-1 font-mono-neo font-bold">
                <span>2분 (숏폼)</span>
                <span>3분 (표준)</span>
                <span>4분</span>
                <span>5분 (장편)</span>
              </div>
            </div>
          </div>

          {/* Free Keyword Textarea */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-bold text-[#111111] uppercase">
              자유 키워드 및 추가 요청사항
            </label>
            <textarea
              rows={3}
              value={concept.freeKeywords}
              onChange={(e) => updateField('freeKeywords', e.target.value)}
              placeholder="예: 빗소리 질감, 빈티지 테이프 노이즈, 첼로 솔로, 새벽 4시의 공기감 등 자유롭게 적어주세요."
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-medium text-sm placeholder:text-zinc-400 shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e] focus:shadow-[4px_4px_0_#111111] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Floating Navigation */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-4 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-base uppercase shadow-[6px_6px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          <span>2단계: 이모지 제목 & SEO 키워드 생성하기</span>
        </button>
      </div>
    </div>
  );
}
