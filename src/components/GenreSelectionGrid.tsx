import React from 'react';
import {
  Moon,
  PartyPopper,
  GlassWater,
  Wine,
  Trees,
  BookOpen,
  Dumbbell,
  Sparkles,
  SunMedium,
  Coffee,
  Film,
  PlusCircle,
  ExternalLink,
  Sparkle,
} from 'lucide-react';
import { GENRE_PRESETS, I18N } from '../utils/constants';
import { AppLanguage, GenrePreset } from '../types';

interface GenreSelectionGridProps {
  language: AppLanguage;
  onSelectGenre: (preset: GenrePreset, autoStart?: boolean) => void;
  onQuickStart: (preset: GenrePreset) => void;
}

export function GenreSelectionGrid({
  language,
  onSelectGenre,
  onQuickStart,
}: GenreSelectionGridProps) {
  const t = I18N[language];

  // Helper to render Lucide icon with Neo-brutalist stroke
  const renderIcon = (name: string) => {
    const props = { className: 'w-10 h-10 md:w-11 md:h-11 text-[#111111] stroke-[2.5]' };
    switch (name) {
      case 'Moon':
        return <Moon {...props} />;
      case 'PartyPopper':
        return <PartyPopper {...props} />;
      case 'GlassWater':
        return <GlassWater {...props} />;
      case 'Wine':
        return <Wine {...props} />;
      case 'Trees':
        return <Trees {...props} />;
      case 'BookOpen':
        return <BookOpen {...props} />;
      case 'Dumbbell':
        return <Dumbbell {...props} />;
      case 'Sparkles':
        return <Sparkles {...props} />;
      case 'SunMedium':
        return <SunMedium {...props} />;
      case 'Coffee':
        return <Coffee {...props} />;
      case 'Film':
        return <Film {...props} />;
      case 'PlusCircle':
      default:
        return <PlusCircle {...props} />;
    }
  };

  // Neo Brutalist Preset background colors (clean, vibrant, high-contrast)
  const getNeoBgColor = (id: string) => {
    switch (id) {
      case 'lofi':
        return '#f1f0ea';
      case 'kpop':
        return '#ffdeeb';
      case 'jazz':
        return '#ffe8d6';
      case 'rnb':
        return '#e8dff5';
      case 'indie':
        return '#ddf5e6';
      case 'study':
        return '#fff1c5';
      case 'workout':
        return '#ffccd5';
      case 'meditation':
        return '#d0f4de';
      case 'citypop':
        return '#c5f6fa';
      case 'acoustic':
        return '#fde2e4';
      case 'cinematic':
        return '#e2ece9';
      case 'custom':
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-12 flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Left Column: Hero Content */}
      <div className="w-full lg:col-span-5 flex flex-col items-start text-left space-y-5 lg:pr-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00ffca] border-2 border-[#111111] font-mono-neo text-xs font-black uppercase shadow-[2px_2px_0_#111111] -rotate-1">
          <Sparkle className="w-3.5 h-3.5 fill-[#111111]" />
          <span>SUNO V5 AI PRODUCER</span>
        </div>

        <h2 className="font-gaegu text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#ff477e] leading-[0.95] -rotate-1">
          {language === 'ko' ? (
            <>
              장르를<br />선택하세요!
            </>
          ) : (
            <>
              SELECT A<br />GENRE!
            </>
          )}
        </h2>

        <p className="text-base sm:text-lg text-[#222222] font-medium leading-relaxed max-w-lg">
          {t.genreSubtitle || '오늘 유튜브 채널을 가득 채울 플레이리스트의 주인공은? 원하는 분위기를 골라보세요.'}
        </p>

        {/* Big Neo-Brutalist YouTube Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
          <a
            href="https://www.youtube.com/@plablist"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#ff0000] hover:bg-[#e60000] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[6px_6px_0_#111111] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all cursor-pointer group"
          >
            <span>{t.promoBtn || 'Plab List 바로가기'}</span>
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform stroke-[3]" />
          </a>
        </div>
      </div>

      {/* Right Column: Matrix Grid of Genre Cards */}
      <div className="w-full lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
        {GENRE_PRESETS.map((preset) => {
          const name = language === 'ko' ? preset.nameKo : preset.nameEn;
          const bg = getNeoBgColor(preset.id);

          return (
            <div
              key={preset.id}
              onClick={() => onSelectGenre(preset)}
              style={{ backgroundColor: bg }}
              className="group relative bg-white border-3 border-[#111111] p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer shadow-[5px_5px_0_rgba(17,17,17,0.12)] hover:shadow-[8px_8px_0_#111111] hover:border-[#ff477e] hover:scale-[1.04] hover:-rotate-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all duration-200 aspect-square rounded-2xl"
            >
              {/* Icon Container */}
              <div className="mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform duration-200">
                {renderIcon(preset.iconName)}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-mono-neo font-extrabold text-[#111111] tracking-tight uppercase">
                {name}
              </h3>

              {/* Mini Badge on Hover */}
              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono-neo font-bold px-1.5 py-0.5 bg-[#111111] text-white">
                START →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

