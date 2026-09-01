import React from 'react';
import {
  Settings,
  HelpCircle,
  Wand2,
  Loader2,
  Download,
  ArrowLeft,
  Save,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage } from '../types';
import { I18N } from '../utils/constants';

interface HeaderProps {
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenSnapshots: () => void;
  onQuickSaveSnapshot: () => void;
  snapshotCount: number;
  onAutoGenerateAll: () => void;
  isAutoGenerating: boolean;
  autoGenStatusText?: string;
  onExportAllTxt: () => void;
  hasData: boolean;
  currentStep: number;
  onGoToGenreGrid: () => void;
}

export function Header({
  language,
  onChangeLanguage,
  onOpenSettings,
  onOpenHelp,
  onOpenSnapshots,
  onQuickSaveSnapshot,
  snapshotCount,
  onAutoGenerateAll,
  isAutoGenerating,
  autoGenStatusText,
  onExportAllTxt,
  hasData,
  currentStep,
  onGoToGenreGrid,
}: HeaderProps) {
  const t = I18N[language];
  const isKo = language === 'ko';

  return (
    <header className="sticky top-0 z-40 bg-white border-b-4 border-[#111111] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 cursor-pointer group" onClick={onGoToGenreGrid}>
        <div className="w-10 h-10 border-3 border-[#111111] rounded-xl overflow-hidden shadow-[3px_3px_0_#111111] -rotate-3 group-hover:rotate-0 transition-transform bg-[#ffd166]">
          <img
            src="https://yt3.googleusercontent.com/pmbOUf-vbWR90IJjnkZyiW-aoYb-YSPSuANwYSlwop-ZIcgjzns4jGco9s8Ui6dZ42d-8JSgEQ=s900-c-k-c0x00ffffff-no-rj"
            alt="Plab List"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="font-gaegu text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] leading-none">
            {t.appTitle || 'AI PLAYLIST STUDIO'}
          </h1>
          {currentStep > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGoToGenreGrid();
              }}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 border-2 border-[#111111] bg-[#fffbf2] hover:bg-[#ffeec2] shadow-[2px_2px_0_#111111] text-xs font-mono-neo font-bold text-[#111111] transition-all ml-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{t.backToGenre}</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 🛡️ Snapshot & Rollback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onQuickSaveSnapshot}
            title={isKo ? '현재 상태를 스냅샷 슬롯에 즉시 저장' : 'Save snapshot of current state'}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border-3 border-[#111111] bg-white hover:bg-[#fffbf2] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111] text-[#111111] font-mono-neo text-xs font-bold transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKo ? '💾 저장' : '💾 SAVE'}</span>
          </button>

          <button
            onClick={onOpenSnapshots}
            title={isKo ? '저장된 스냅샷으로 복구/롤백' : 'Rollback to saved snapshot'}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border-3 border-[#111111] bg-[#00ffca] hover:bg-[#00e5b5] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111] text-[#111111] font-mono-neo text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKo ? '↩ 복구' : '↩ RESTORE'}</span>
            <span className="px-1 py-0.2 bg-[#111111] text-white text-[10px] font-mono-neo font-bold">
              {snapshotCount}/12
            </span>
          </button>
        </div>

        {/* 1-Click Auto Generate Button */}
        <button
          onClick={onAutoGenerateAll}
          disabled={isAutoGenerating}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 border-3 border-[#111111] bg-[#ff477e] hover:bg-[#ff2d6c] text-white font-mono-neo font-extrabold text-xs uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all cursor-pointer disabled:opacity-60"
        >
          {isAutoGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span className="truncate max-w-[120px]">{autoGenStatusText || t.autoGenLoading}</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">{t.autoGenAll}</span>
              <span className="sm:hidden">⚡ AUTO</span>
            </>
          )}
        </button>

        {/* Export Txt button if data exists */}
        {hasData && (
          <button
            onClick={onExportAllTxt}
            title={t.exportTxt}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 border-3 border-[#111111] bg-white hover:bg-[#ffd166] text-xs font-mono-neo font-bold text-[#111111] shadow-[3px_3px_0_#111111] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title={t.headerSettings}
          className="p-1.5 sm:p-2 border-3 border-[#111111] bg-white hover:bg-[#ffd166] text-[#111111] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111] transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Help Button */}
        <button
          onClick={onOpenHelp}
          title={t.headerHelp}
          className="p-1.5 sm:p-2 border-3 border-[#111111] bg-white hover:bg-[#00ffca] text-[#111111] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111] transition-all cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Language Pill Switch */}
        <div className="flex items-center border-3 border-[#111111] bg-white shadow-[3px_3px_0_#111111]">
          <button
            onClick={() => onChangeLanguage('ko')}
            className={`px-2 py-1 text-xs font-mono-neo font-extrabold transition-all cursor-pointer ${
              language === 'ko'
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-zinc-100'
            }`}
          >
            KR
          </button>
          <button
            onClick={() => onChangeLanguage('en')}
            className={`px-2 py-1 text-xs font-mono-neo font-extrabold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-zinc-100'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

