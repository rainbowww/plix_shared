import React from 'react';
import {
  Sparkles,
  Type,
  ListMusic,
  Music2,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Check,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { AppLanguage } from '../types';

interface StepNavProps {
  currentStep: number;
  completedSteps: number[];
  onSelectStep: (step: number) => void;
  language: AppLanguage;
  onBackToGenre: () => void;
}

export const STEPS_DATA = [
  {
    id: 1,
    nameKo: '컨셉 설정',
    nameEn: 'Concept Setup',
    icon: Sparkles,
    descKo: '장르·무드·공간 파라미터',
    descEn: 'Genre, mood & scene tuning',
  },
  {
    id: 2,
    nameKo: '제목 & SEO',
    nameEn: 'Titles & SEO',
    icon: Type,
    descKo: '8개 이모지 제목 & 키워드',
    descEn: '8 Emoji titles & search tags',
  },
  {
    id: 3,
    nameKo: '트랙리스트',
    nameEn: 'Tracklist Arc',
    icon: ListMusic,
    descKo: '감정 곡선 & 수록곡 설계',
    descEn: 'Emotional curve & BPM',
  },
  {
    id: 4,
    nameKo: 'Suno 스튜디오',
    nameEn: 'Suno Studio',
    icon: Music2,
    descKo: '180자 Style 태그 & 팁',
    descEn: 'Style & Exclude tags',
  },
  {
    id: 5,
    nameKo: '구조형 가사',
    nameEn: 'Structured Lyrics',
    icon: FileText,
    descKo: '[Intro]~[Outro] 섹션 가사',
    descEn: 'Section-based lyrics',
  },
  {
    id: 6,
    nameKo: '썸네일 캔버스',
    nameEn: '1280×720 Canvas',
    icon: ImageIcon,
    descKo: '웹폰트 타이포 썸네일',
    descEn: 'Web font typography PNG',
  },
  {
    id: 7,
    nameKo: '업로드킷 패키징',
    nameEn: 'Upload Kit',
    icon: UploadCloud,
    descKo: '타임라인, 설명란, 고정댓글',
    descEn: 'Timeline, description, tags',
  },
];

export function StepNav({
  currentStep,
  completedSteps,
  onSelectStep,
  language,
  onBackToGenre,
}: StepNavProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white border-b-4 lg:border-b-0 lg:border-r-4 border-[#111111] p-3 lg:p-5 flex lg:flex-col overflow-x-auto lg:overflow-visible">
      <div className="hidden lg:block mb-4 px-1">
        <button
          onClick={onBackToGenre}
          className="flex items-center gap-1.5 text-xs font-mono-neo text-[#111111] hover:text-[#ff477e] font-extrabold mb-2.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'ko' ? '장르 선택으로 돌아가기' : 'BACK TO GENRE'}</span>
        </button>
        <span className="font-mono-neo text-[10px] font-black tracking-wider text-[#ff477e] uppercase bg-[#ff477e]/10 px-2 py-0.5 border border-[#ff477e]">
          PIPELINE STEPS
        </span>
        <h2 className="font-gaegu text-2xl font-bold text-[#111111] mt-1.5">
          {language === 'ko' ? '7단계 제작 파이프라인' : '7-Step Workflow'}
        </h2>
      </div>

      <nav className="flex lg:flex-col gap-2 min-w-max lg:min-w-0 w-full">
        {STEPS_DATA.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isAccessible = step.id === 1 || isCompleted || completedSteps.includes(step.id - 1);
          const name = language === 'ko' ? step.nameKo : step.nameEn;
          const desc = language === 'ko' ? step.descKo : step.descEn;

          return (
            <button
              key={step.id}
              onClick={() => {
                if (isAccessible) onSelectStep(step.id);
              }}
              disabled={!isAccessible}
              className={`group flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#ff477e] text-white border-3 border-[#111111] shadow-[4px_4px_0_#111111]'
                  : isCompleted
                  ? 'bg-[#00ffca] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0_#111111] hover:translate-x-[-1px] hover:shadow-[3px_3px_0_#111111]'
                  : isAccessible
                  ? 'bg-white text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0_#111111] hover:bg-[#fffbf2] hover:translate-x-[-1px] hover:shadow-[3px_3px_0_#111111]'
                  : 'bg-zinc-100 text-zinc-400 border-2 border-zinc-300 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono-neo font-black shrink-0 border-2 border-[#111111] ${
                    isActive
                      ? 'bg-white text-[#111111]'
                      : isCompleted
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#111111]'
                  }`}
                >
                  {isCompleted && !isActive ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold text-xs sm:text-sm leading-tight ${isActive ? 'text-white' : 'text-[#111111]'}`}>
                      {name}
                    </span>
                  </div>
                  <span className={`hidden lg:block text-[11px] truncate max-w-[140px] ${isActive ? 'text-white/90' : 'text-zinc-600'}`}>
                    {desc}
                  </span>
                </div>
              </div>

              <div className="hidden lg:flex items-center pl-1">
                {!isAccessible && <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                {isCompleted && !isActive && <span className="w-2 h-2 rounded-full bg-[#111111]" />}
                {isActive && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

