import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AppLanguage } from '../types';
import { I18N } from '../utils/constants';

interface FooterProps {
  language: AppLanguage;
}

export function Footer({ language }: FooterProps) {
  const t = I18N[language];

  return (
    <footer className="w-full py-5 border-t-4 border-[#111111] bg-white text-[#111111] mt-auto select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="font-mono-neo text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#111111]">
          CREATOR: AIPUTER // SUNO V5 STUDIO
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://www.youtube.com/@AIPUTER"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ff0000] hover:bg-[#e60000] text-white border-2 border-[#111111] font-mono-neo font-bold text-xs uppercase shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111] transition-all cursor-pointer group"
          >
            <span>{t.youtubeBtn || 'YouTube 바로가기'}</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform stroke-[2.5]" />
          </a>
        </div>
      </div>
    </footer>
  );
}

