import React from 'react';
import { X, HelpCircle, Music, Lightbulb, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { AppLanguage } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export function HelpModal({ isOpen, onClose, language }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border-3 border-[#111111] shadow-[8px_8px_0_#111111] p-6 text-[#111111] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white hover:bg-[#ff477e] hover:text-white border-2 border-[#111111] text-[#111111] flex items-center justify-center shadow-[2px_2px_0_#111111] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-[#111111]">
          <div className="p-2 rounded-xl bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-[#111111]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-gaegu font-bold text-[#111111]">
              {language === 'ko' ? 'AI Playlist Creator 완벽 가이드' : 'AI Playlist Creator User Guide'}
            </h2>
            <p className="text-xs text-[#555555] font-mono-neo font-bold">
              {language === 'ko'
                ? 'Suno AI 프롬프트 작성법부터 유튜브 수익화 채널 운영 노하우까지'
                : 'From Suno AI prompting to YouTube playlist growth'}
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm">
          {/* Section 1: Workflow */}
          <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[3px_3px_0_#111111] space-y-2.5">
            <div className="flex items-center gap-2 font-mono-neo font-extrabold text-[#111111] uppercase">
              <Sparkles className="w-4 h-4 text-[#ff477e]" />
              <span>{language === 'ko' ? '1. 7단계 제작 파이프라인' : '1. The 7-Step Production Pipeline'}</span>
            </div>
            <ul className="text-xs text-[#222222] font-medium space-y-1.5 list-disc list-inside leading-relaxed">
              <li><strong>Step 1</strong>: 무드와 테마에 맞는 장르 선택 및 디테일 파라미터 튜닝</li>
              <li><strong>Step 2</strong>: 유튜브 알고리즘을 타는 이모지 제목 8개 & 고노출 검색 키워드 추출</li>
              <li><strong>Step 3</strong>: 잔잔한 인트로 → 60% 클라이맥스 → 여운의 아웃트로 감정곡선 트랙리스트 설계</li>
              <li><strong>Step 4</strong>: Suno AI 전용 180자 Style of Music 태그 & Exclude Styles 최적화</li>
              <li><strong>Step 5</strong>: [Intro], [Verse], [Chorus] 구조 태그가 포함된 감성 가사 생성</li>
              <li><strong>Step 6</strong>: 1280×720 웹폰트 캔버스 썸네일 합성 및 16:9 PNG 내보내기</li>
              <li><strong>Step 7</strong>: 시간 누적 타임라인, 완성형 설명란, 고정 댓글, 20개 태그 패키징</li>
            </ul>
          </div>

          {/* Section 2: Suno Tips */}
          <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[3px_3px_0_#111111] space-y-2.5">
            <div className="flex items-center gap-2 font-mono-neo font-extrabold text-[#111111] uppercase">
              <Music className="w-4 h-4 text-[#ff477e]" />
              <span>{language === 'ko' ? '2. Suno AI 실전 마스터링 팁' : '2. Suno AI Pro Prompting Secrets'}</span>
            </div>
            <p className="text-xs text-[#222222] leading-relaxed">
              Suno의 <strong>Style of Music</strong>란에는 문장형 묘사보다 <strong>콤마(,)로 나열된 영문 메타 태그</strong>(예: <code className="bg-white px-1.5 py-0.5 border border-[#111111] rounded font-mono font-bold text-[#ff477e]">lofi hip hop, warm rhodes piano, vinyl crackle, 85bpm, tape saturation</code>)가 훨씬 뛰어난 오디오 퀄리티를 만들어냅니다.
            </p>
            <p className="text-xs text-[#222222] leading-relaxed">
              가사란에는 반드시 <code className="bg-white px-1 py-0.5 border border-[#111111] rounded font-mono font-bold text-[#ff477e]">[Verse 1]</code>, <code className="bg-white px-1 py-0.5 border border-[#111111] rounded font-mono font-bold text-[#ff477e]">[Chorus]</code>, <code className="bg-white px-1 py-0.5 border border-[#111111] rounded font-mono font-bold text-[#ff477e]">[Guitar Solo]</code>, <code className="bg-white px-1 py-0.5 border border-[#111111] rounded font-mono font-bold text-[#ff477e]">[Outro]</code> 등의 메타 태그를 넣어 곡의 다이내믹한 전개를 제어하세요.
            </p>
          </div>

          {/* Section 3: Creator Credit */}
          <div className="p-4 rounded-xl bg-[#00ffca] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="font-mono-neo font-extrabold text-[#111111] flex items-center gap-1.5 text-xs uppercase">
                <ExternalLink className="w-4 h-4 text-[#111111]" />
                <span>Developer: AIPUTER</span>
              </div>
              <p className="text-[11px] text-[#111111] font-medium mt-0.5">
                유튜브 플레이리스트 제작 실전 튜토리얼과 AI 음악 워크플로우를 확인하세요.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://www.youtube.com/@AIPUTER"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white hover:bg-[#ff477e] hover:text-white border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase flex items-center gap-1.5 shrink-0 transition-colors shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <span>@AIPUTER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.youtube.com/@plablist"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase flex items-center gap-1.5 shrink-0 transition-colors shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <span>@plablist</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-[#111111] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#111111] hover:bg-[#333333] text-white font-mono-neo font-bold text-xs uppercase transition-colors cursor-pointer shadow-[2px_2px_0_#ff477e]"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
