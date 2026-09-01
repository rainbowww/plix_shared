import { useState } from 'react';
import { LyricsData, TrackItem } from '../types';
import { copyToClipboard } from '../utils/helpers';
import {
  FileText,
  RefreshCw,
  Copy,
  Check,
  Languages,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ListMusic,
  AlertTriangle,
} from 'lucide-react';

interface Step5LyricsProps {
  tracks?: TrackItem[];
  lyricsMap: { [trackIndex: number]: LyricsData };
  activeTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onGenerateLyrics: (trackIndex: number, selectedSections: string[]) => void;
  onNext: () => void;
  isLoading: boolean;
  error?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ALL_SECTIONS = [
  'Intro',
  'Verse 1',
  'Pre-Chorus',
  'Chorus',
  'Verse 2',
  'Bridge',
  'Outro',
];

export function Step5Lyrics({
  tracks,
  lyricsMap,
  activeTrackIndex,
  onSelectTrack,
  onGenerateLyrics,
  onNext,
  isLoading,
  error,
  onShowToast,
}: Step5LyricsProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(ALL_SECTIONS);
  const [showEnglish, setShowEnglish] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'sections'>('raw');
  const [collapsedSections, setCollapsedSections] = useState<{ [sec: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentTrack = tracks && tracks.length > 0 ? tracks[activeTrackIndex] : null;
  const currentLyrics = lyricsMap[activeTrackIndex];

  const toggleSectionCheckbox = (sec: string) => {
    if (selectedSections.includes(sec)) {
      if (selectedSections.length === 1) {
        onShowToast('최소 하나의 섹션은 선택되어야 합니다.', 'info');
        return;
      }
      setSelectedSections(selectedSections.filter((s) => s !== sec));
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  };

  const selectAllSections = () => setSelectedSections(ALL_SECTIONS);

  const toggleCollapse = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      onShowToast(`${label} 복사되었습니다!`, 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00ffca] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <FileText className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 5: STRUCTURED EMOTIONAL LYRICS</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            Suno 태그가 박힌 완성형 가사
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            원하는 곡을 선택하고 [Intro], [Verse 1], [Chorus] 등 섹션을 지정하여 감각적인 가사를 만듭니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onGenerateLyrics(activeTrackIndex, selectedSections)}
            disabled={isLoading || !currentTrack}
            className="px-5 py-3 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            <span>{currentLyrics ? '가사 재생성' : '가사 생성하기'}</span>
          </button>

          {currentLyrics && (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-[#ffd166] hover:bg-[#ffc338] text-[#111111] border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>6단계 썸네일</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Track Selector & Section Structure Controls */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Track Selector Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase flex items-center gap-1.5">
              <ListMusic className="w-4 h-4 text-[#ff477e]" />
              가사 작사할 트랙 선택 (3단계 연동)
            </label>
            <select
              value={activeTrackIndex}
              onChange={(e) => onSelectTrack(Number(e.target.value))}
              disabled={!tracks || tracks.length === 0}
              className="w-full px-4 py-3 rounded-xl bg-white border-3 border-[#111111] text-[#111111] font-mono-neo font-bold text-sm shadow-[3px_3px_0_#111111] focus:outline-none focus:border-[#ff477e]"
            >
              {tracks && tracks.length > 0 ? (
                tracks.map((t, idx) => (
                  <option key={idx} value={idx}>
                    Track {idx + 1}. {t.titleKo} ({t.titleEn}) — {t.moodTag}
                  </option>
                ))
              ) : (
                <option value={0}>3단계에서 트랙리스트를 먼저 생성해주세요</option>
              )}
            </select>
          </div>

          {/* Active Track Specs Pill Card */}
          {currentTrack && (
            <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex flex-col justify-center space-y-1 text-xs">
              <div className="font-mono-neo font-bold text-[#555555] uppercase">선택된 트랙 사운드 스펙</div>
              <div className="font-bold text-[#111111] text-sm">
                {currentTrack.titleKo} · <span className="font-mono-neo text-[#ff477e] font-extrabold">{currentTrack.bpm} BPM</span> · Key:{' '}
                {currentTrack.key}
              </div>
              <div className="text-[#333333] font-medium truncate">악기: {currentTrack.instruments?.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Section Checkboxes */}
        <div className="space-y-3 pt-3 border-t-2 border-[#111111]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-neo font-extrabold text-[#111111] uppercase">곡 구조 섹션 선택 (체크한 섹션만 생성)</span>
            <button
              onClick={selectAllSections}
              className="text-[#ff477e] hover:underline font-mono-neo font-bold cursor-pointer uppercase"
            >
              전체 선택
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map((sec) => {
              const isChecked = selectedSections.includes(sec);
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => toggleSectionCheckbox(sec)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono-neo font-bold flex items-center gap-2 border-2 border-[#111111] transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#00ffca] text-[#111111] shadow-[3px_3px_0_#111111] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white text-[#555555] hover:text-[#111111] shadow-[2px_2px_0_#111111]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border border-[#111111] flex items-center justify-center text-[10px] ${
                      isChecked ? 'bg-[#111111] text-white font-bold' : 'bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>[{sec}]</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-[#ffe5ec] border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#ff477e] border-2 border-[#111111] text-white flex items-center justify-center mx-auto shadow-[2px_2px_0_#111111]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-mono-neo font-bold text-[#111111]">가사 생성 중 오류가 발생했습니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">{error}</p>
          </div>
          <button
            onClick={() => onGenerateLyrics(activeTrackIndex, selectedSections)}
            className="px-6 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-mono-neo font-bold text-sm shadow-[3px_3px_0_#ff477e] cursor-pointer"
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* Skeleton Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-64 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
        </div>
      )}

      {/* Main Lyrics Display */}
      {currentLyrics && !isLoading && (
        <div className="space-y-6">
          {/* Controls Bar: Raw vs Section View & Translation Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-3 border-[#111111] p-4 rounded-2xl shadow-[4px_4px_0_#111111]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-neo font-extrabold border-2 border-[#111111] transition-all cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-[#ffd166] text-[#111111] shadow-[2px_2px_0_#111111]'
                    : 'bg-white text-[#555555] hover:text-[#111111]'
                }`}
              >
                Suno 복붙용 한 덩어리 뷰
              </button>
              <button
                onClick={() => setViewMode('sections')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-neo font-extrabold border-2 border-[#111111] transition-all cursor-pointer ${
                  viewMode === 'sections'
                    ? 'bg-[#ffd166] text-[#111111] shadow-[2px_2px_0_#111111]'
                    : 'bg-white text-[#555555] hover:text-[#111111]'
                }`}
              >
                섹션별 접기/펼치기 뷰
              </button>
            </div>

            <div className="flex items-center gap-3">
              {currentLyrics.englishTranslation && (
                <button
                  onClick={() => setShowEnglish(!showEnglish)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-neo font-bold flex items-center gap-1.5 border-2 border-[#111111] transition-all cursor-pointer ${
                    showEnglish
                      ? 'bg-[#00ffca] text-[#111111] shadow-[2px_2px_0_#111111]'
                      : 'bg-white text-[#555555] hover:text-[#111111]'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>{showEnglish ? '한국어 가사 보기' : '영어 번역본 보기'}</span>
                </button>
              )}

              <button
                onClick={() =>
                  handleCopy(
                    showEnglish && currentLyrics.englishTranslation
                      ? currentLyrics.englishTranslation
                      : currentLyrics.fullText,
                    'full-lyrics',
                    '전체 가사'
                  )
                }
                className="px-4 py-1.5 rounded-xl bg-[#ff477e] hover:bg-[#ff2d6c] border-2 border-[#111111] text-xs font-mono-neo font-extrabold text-white flex items-center gap-1.5 shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                {copiedKey === 'full-lyrics' ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'full-lyrics' ? '전체 복사됨' : 'Suno 가사 전체 복사'}</span>
              </button>
            </div>
          </div>

          {/* View 1: Unified Raw Text Block */}
          {viewMode === 'raw' && (
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#555555] pb-2 border-b-2 border-[#111111]">
                <span className="font-mono-neo font-extrabold text-[#ff477e]">
                  {showEnglish ? 'English Translated Lyrics' : 'Suno AI Prompt-Ready Lyrics (Korean)'}
                </span>
                <span className="font-mono-neo font-bold">줄바꿈 및 [태그] 포함</span>
              </div>
              <pre className="p-5 rounded-xl bg-[#fffbf2] border-2 border-[#111111] font-sans text-sm text-[#111111] font-medium whitespace-pre-wrap leading-relaxed select-all max-h-[500px] overflow-y-auto shadow-inner">
                {showEnglish && currentLyrics.englishTranslation
                  ? currentLyrics.englishTranslation
                  : currentLyrics.fullText}
              </pre>
            </div>
          )}

          {/* View 2: Collapsible Sections View */}
          {viewMode === 'sections' && (
            <div className="space-y-3">
              {Object.entries(currentLyrics.sections).map(([secName, content]) => {
                const isCollapsed = collapsedSections[secName];
                return (
                  <div key={secName} className="bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] overflow-hidden">
                    <div
                      onClick={() => toggleCollapse(secName)}
                      className="p-4 flex items-center justify-between bg-[#fffbf2] hover:bg-[#ffd166] cursor-pointer transition-colors border-b-2 border-[#111111]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-[#00ffca] border border-[#111111] text-[#111111] font-mono-neo text-xs font-extrabold">
                          [{secName}]
                        </span>
                        <span className="text-xs text-[#333333] font-bold truncate">
                          {content.split('\n')[0] || '가사 내용'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(`[${secName}]\n${content}`, `sec-${secName}`, `[${secName}] 가사`);
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#ffd166] border border-[#111111] text-[#111111] text-xs shadow-[1px_1px_0_#111111]"
                          title="이 섹션 복사"
                        >
                          {copiedKey === `sec-${secName}` ? (
                            <Check className="w-3.5 h-3.5 text-[#ff477e]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-[#111111]" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-[#111111]" />
                        )}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 text-sm text-[#111111] font-medium leading-relaxed whitespace-pre-wrap bg-white font-sans">
                        {content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Next Step Action */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onNext}
              className="w-full sm:w-auto px-8 py-4 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-base uppercase shadow-[6px_6px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <span>6단계: 글자 박힌 1280×720 썸네일 만들기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Initial State Prompt */}
      {!currentLyrics && !isLoading && !error && (
        <div className="bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00ffca] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center mx-auto text-[#111111]">
            <FileText className="w-7 h-7 fill-[#111111]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-mono-neo font-extrabold text-[#111111]">구조 선택형 가사를 생성합니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">
              {currentTrack
                ? `Track ${activeTrackIndex + 1}. [${currentTrack.titleKo}]에 딱 맞는 감성 가사를 지어냅니다.`
                : '3단계에서 수록곡을 지정한 후 가사를 생성할 수 있습니다.'}
            </p>
          </div>
          {currentTrack && (
            <button
              onClick={() => onGenerateLyrics(activeTrackIndex, selectedSections)}
              className="px-8 py-3.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 mx-auto cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>가사 생성하기</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
