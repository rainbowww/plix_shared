import { useState } from 'react';
import { SunoData, TrackItem } from '../types';
import { copyToClipboard, downloadTextFile } from '../utils/helpers';
import {
  Music2,
  RefreshCw,
  Copy,
  Check,
  Download,
  Lightbulb,
  Sparkles,
  SlidersHorizontal,
  VolumeX,
  UserCheck,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface Step4SunoProps {
  sunoData?: SunoData;
  tracks?: TrackItem[];
  onGenerate: () => void;
  onNext: () => void;
  isLoading: boolean;
  error?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Step4Suno({
  sunoData,
  tracks,
  onGenerate,
  onNext,
  isLoading,
  error,
  onShowToast,
}: Step4SunoProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      onShowToast(`${label} 복사되었습니다!`, 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      onShowToast('복사에 실패했습니다.', 'error');
    }
  };

  // Export all track prompts as a single .txt file
  const handleExportAllPromptsTxt = () => {
    if (!tracks || tracks.length === 0) {
      onShowToast('내보낼 트랙 정보가 없습니다.', 'error');
      return;
    }

    let fileContent = `=========================================\n`;
    fileContent += `  SUNO AI MASTER PROMPT KIT\n`;
    fileContent += `=========================================\n\n`;

    if (sunoData) {
      fileContent += `[공통 스타일 태그 (Style of Music)]\n${sunoData.styleOfMusic}\n\n`;
      fileContent += `[제외 스타일 (Exclude Styles)]\n${sunoData.excludeStyles}\n\n`;
      fileContent += `[보컬/사운드 페르소나]\n${sunoData.personaHint}\n\n`;
    }

    fileContent += `-----------------------------------------\n`;
    fileContent += `  수록곡별 개별 맞춤 프롬프트 리스트\n`;
    fileContent += `-----------------------------------------\n\n`;

    tracks.forEach((track, idx) => {
      const numStr = String(track.index || idx + 1).padStart(2, '0');
      fileContent += `== ${numStr}. ${track.titleKo} (${track.titleEn}) ==\n`;
      fileContent += `BPM: ${track.bpm} | Key: ${track.key} | Mood: ${track.moodTag}\n`;
      fileContent += `Suno Prompt:\n${track.sunoPrompt}\n\n`;
    });

    downloadTextFile('suno_playlist_prompts.txt', fileContent);
    onShowToast('전체 프롬프트 텍스트 파일이 다운로드되었습니다!', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffd166] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <Music2 className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 4: SUNO AI PROMPT PACK</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            Suno AI v3/v3.5/v4/v5 최적화 메타 태그
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            Suno AI의 'Style of Music'과 'Exclude Styles'에 바로 복사해 넣을 수 있는 최적의 콤마 나열 태그입니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="px-5 py-3 bg-white hover:bg-[#fffbf2] border-3 border-[#111111] text-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#ff477e] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{sunoData ? '프롬프트 재생성' : 'Suno 프롬프트 생성'}</span>
          </button>

          {sunoData && (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>5단계 가사 생성</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-[#ffe5ec] border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#ff477e] border-2 border-[#111111] text-white flex items-center justify-center mx-auto shadow-[2px_2px_0_#111111]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-mono-neo font-bold text-[#111111]">Suno 프롬프트 생성 중 오류가 발생했습니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">{error}</p>
          </div>
          <button
            onClick={onGenerate}
            className="px-6 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-mono-neo font-bold text-sm shadow-[3px_3px_0_#ff477e] cursor-pointer"
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* Skeleton Loading */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-28 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
            <div className="h-32 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
          </div>
          <div className="h-44 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
        </div>
      )}

      {/* Main Content */}
      {sunoData && !isLoading && (
        <div className="space-y-6">
          {/* Quick Bulk Download Button Bar */}
          <div className="bg-[#fffbf2] border-3 border-[#111111] rounded-2xl p-4 shadow-[4px_4px_0_#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ffd166] border-2 border-[#111111] text-[#111111] flex items-center justify-center font-bold shadow-[2px_2px_0_#111111]">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111]">곡별 프롬프트 전체 .txt 내보내기</h3>
                <p className="text-xs text-[#555555] font-medium">
                  3단계의 모든 수록곡 전용 프롬프트를 구분자(`== 01. 곡명 ==`)와 함께 텍스트 파일로 저장합니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportAllPromptsTxt}
              className="px-5 py-2.5 bg-[#00ffca] hover:bg-[#00e5b5] text-[#111111] border-2 border-[#111111] font-mono-neo font-extrabold text-xs uppercase flex items-center gap-2 shrink-0 cursor-pointer shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Download className="w-4 h-4" />
              <span>.txt 파일 다운로드</span>
            </button>
          </div>

          {/* 1. Style of Music (Primary Suno Box) */}
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#ff477e]" />
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">Style of Music (스타일 태그)</h3>
                <span className="px-2 py-0.5 rounded bg-[#ffd166] border border-[#111111] text-[10px] text-[#111111] font-mono-neo font-bold">
                  {sunoData.styleOfMusic.length} / 180자
                </span>
              </div>
              <button
                onClick={() => handleCopy(sunoData.styleOfMusic, 'style', '스타일 태그')}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              >
                {copiedKey === 'style' ? <Check className="w-3.5 h-3.5 text-[#ff477e]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'style' ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] font-mono-neo text-xs text-[#111111] font-bold leading-relaxed select-all break-all shadow-inner">
              {sunoData.styleOfMusic}
            </div>
            <p className="text-[11px] text-[#555555] font-medium">
              💡 Suno 생성 화면의 <strong>Style of Music</strong> 입력창에 그대로 붙여넣으세요.
            </p>
          </div>

          {/* 2. Exclude Styles & Persona Hint Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exclude Styles */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-[#ff477e]" />
                  <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">Exclude Styles (제외할 스타일)</h3>
                </div>
                <button
                  onClick={() => handleCopy(sunoData.excludeStyles, 'exclude', '제외 스타일')}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'exclude' ? <Check className="w-3.5 h-3.5 text-[#ff477e]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'exclude' ? '복사됨' : '복사'}</span>
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#ffe5ec] border-2 border-[#111111] font-mono-neo text-xs text-[#111111] font-bold leading-relaxed select-all">
                {sunoData.excludeStyles}
              </div>
              <p className="text-[11px] text-[#555555] font-medium">
                Suno 고급 옵션의 <strong>Exclude Styles</strong> 칸에 넣어 원치 않는 사운드를 배제합니다.
              </p>
            </div>

            {/* Persona Hint */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#00ffca]" />
                  <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">Persona Hint (보컬/연주 페르소나)</h3>
                </div>
                <button
                  onClick={() => handleCopy(sunoData.personaHint, 'persona', '페르소나 힌트')}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'persona' ? <Check className="w-3.5 h-3.5 text-[#00ffca]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'persona' ? '복사됨' : '복사'}</span>
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#e6fff9] border-2 border-[#111111] text-xs text-[#111111] font-medium leading-relaxed select-all">
                {sunoData.personaHint}
              </div>
              <p className="text-[11px] text-[#555555] font-medium">
                보컬 톤이나 연주 감정선을 유지하기 위한 영문 디렉팅 가이드입니다.
              </p>
            </div>
          </div>

          {/* 3. Advanced Suno Tips (5 Practical Tips in Korean) */}
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#111111]">
              <Lightbulb className="w-5 h-5 text-[#ffd166] fill-[#ffd166]" />
              <h3 className="text-base font-mono-neo font-extrabold text-[#111111] uppercase">Suno AI 실전 마스터 팁 (5가지)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sunoData.advancedTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[3px_3px_0_#111111] space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#ff477e] border border-[#111111] text-white text-xs font-mono-neo font-extrabold flex items-center justify-center shadow-[1px_1px_0_#111111]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono-neo font-extrabold text-[#111111]">꿀팁 #{idx + 1}</span>
                  </div>
                  <p className="text-xs text-[#333333] font-medium leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Next Step Action */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onNext}
              className="w-full sm:w-auto px-8 py-4 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-base uppercase shadow-[6px_6px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <span>5단계: 구조 선택형 감성 가사 생성하기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Initial state prompt to generate */}
      {!sunoData && !isLoading && !error && (
        <div className="bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ffd166] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center mx-auto text-[#111111]">
            <Music2 className="w-7 h-7 fill-[#111111]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-mono-neo font-extrabold text-[#111111]">Suno AI 프롬프트를 생성합니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">
              장르, 악기 질감, 믹싱 효과, 공간감, Exclude 태그까지 최적화된 프롬프트 팩을 완성합니다.
            </p>
          </div>
          <button
            onClick={onGenerate}
            className="px-8 py-3.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Suno 프롬프트 생성하기</span>
          </button>
        </div>
      )}
    </div>
  );
}
