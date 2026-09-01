import { useState, useMemo } from 'react';
import { TrackItem } from '../types';
import { formatDuration, formatDurationKorean, parseDurationToSeconds, copyToClipboard } from '../utils/helpers';
import {
  ListMusic,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface Step3TracklistProps {
  tracks?: TrackItem[];
  onUpdateTracks: (tracks: TrackItem[]) => void;
  onGenerate: () => void;
  onNext: () => void;
  isLoading: boolean;
  error?: string | null;
  selectedTitle?: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Step3Tracklist({
  tracks,
  onUpdateTracks,
  onGenerate,
  onNext,
  isLoading,
  error,
  selectedTitle,
  onShowToast,
}: Step3TracklistProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [durationInputVal, setDurationInputVal] = useState<string>('');

  // Total Duration calculated strictly in code
  const totalDurationSec = useMemo(() => {
    if (!tracks || tracks.length === 0) return 0;
    return tracks.reduce((acc, curr) => acc + (Number(curr.durationSec) || 0), 0);
  }, [tracks]);

  // Average BPM calculated strictly in code
  const avgBpm = useMemo(() => {
    if (!tracks || tracks.length === 0) return 0;
    const sum = tracks.reduce((acc, curr) => acc + (Number(curr.bpm) || 0), 0);
    return Math.round(sum / tracks.length);
  }, [tracks]);

  const handleCopyPrompt = async (prompt: string, idx: number) => {
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopiedIndex(idx);
      onShowToast(`트랙 ${idx + 1} 프롬프트 복사됨!`, 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!tracks) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIndex];
    newTracks[targetIndex] = temp;

    // Update index numbers
    const reindexed = newTracks.map((t, idx) => ({ ...t, index: idx + 1 }));
    onUpdateTracks(reindexed);
    onShowToast(`트랙 순서가 변경되었습니다.`, 'info');
  };

  const handleStartEditDuration = (idx: number, currentSec: number) => {
    setEditingDurationIndex(idx);
    setDurationInputVal(formatDuration(currentSec));
  };

  const handleSaveDuration = (idx: number) => {
    if (!tracks) return;
    const newSec = parseDurationToSeconds(durationInputVal);
    const updated = tracks.map((t, i) => (i === idx ? { ...t, durationSec: newSec } : t));
    onUpdateTracks(updated);
    setEditingDurationIndex(null);
    onShowToast(`재생시간이 수정되었습니다 (${formatDuration(newSec)}).`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00ffca] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <ListMusic className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 3: EMOTIONAL ARC & TRACKLIST</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            완벽한 리스닝 경험을 위한 트랙리스트
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            잔잔한 인트로에서 시작해 60~70% 지점의 감정 최고점(Climax)을 거쳐 깊은 여운으로 끝나는 감정 곡선 구조입니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="px-5 py-3 bg-white hover:bg-[#fffbf2] border-3 border-[#111111] text-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#ff477e] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{tracks && tracks.length > 0 ? '트랙리스트 재생성' : '트랙리스트 생성하기'}</span>
          </button>

          {tracks && tracks.length > 0 && (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>4단계 Suno 프롬프트</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Title Context */}
      {selectedTitle && (
        <div className="px-5 py-3 rounded-xl bg-[#ffd166] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center gap-2.5 text-xs text-[#111111]">
          <span className="font-mono-neo font-extrabold uppercase">선택된 메인 영상 제목:</span>
          <span className="font-bold truncate">{selectedTitle}</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-[#ffe5ec] border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#ff477e] border-2 border-[#111111] text-white flex items-center justify-center mx-auto shadow-[2px_2px_0_#111111]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-mono-neo font-bold text-[#111111]">트랙리스트 생성 중 오류가 발생했습니다</h3>
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
        <div className="space-y-4">
          <div className="h-14 bg-white border-3 border-[#111111] rounded-xl shadow-[4px_4px_0_#111111] animate-pulse" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-20 bg-white border-3 border-[#111111] rounded-2xl shadow-[4px_4px_0_#111111] animate-pulse" />
          ))}
        </div>
      )}

      {/* Main Tracklist View */}
      {tracks && tracks.length > 0 && !isLoading && (
        <div className="space-y-6">
          {/* Emotional Curve Stats & Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-[#111111] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-[#555555] uppercase font-mono-neo font-bold">총 재생시간 (코드 계산)</div>
                <div className="text-lg font-bold text-[#111111] font-mono-neo mt-0.5">
                  {formatDurationKorean(totalDurationSec)} <span className="text-xs text-[#555555] font-normal">({formatDuration(totalDurationSec)})</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#00ffca] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-[#111111] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-[#555555] uppercase font-mono-neo font-bold">평균 템포 / 스케일</div>
                <div className="text-lg font-bold text-[#111111] font-mono-neo mt-0.5">
                  {avgBpm} BPM <span className="text-xs text-[#555555] font-normal">({tracks.length}곡 구성)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ff477e] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-[#555555] uppercase font-mono-neo font-bold">감정 최고점 (Climax)</div>
                <div className="text-sm font-bold text-[#ff477e] font-mono-neo mt-0.5">
                  Track {Math.ceil(tracks.length * 0.6)}~{Math.ceil(tracks.length * 0.7)} 빌드업
                </div>
              </div>
            </div>
          </div>

          {/* Emotional Curve Visual Indicator */}
          <div className="p-4 rounded-2xl bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111]">
            <div className="flex items-center justify-between text-xs font-mono-neo font-bold text-[#111111] mb-2 uppercase">
              <span className="flex items-center gap-1.5 text-[#111111]">
                <Activity className="w-3.5 h-3.5 text-[#ff477e]" /> 감정 곡선 흐름 (Emotional Arc)
              </span>
              <span className="text-[11px] text-[#555555]">곡마다 차별화된 BPM 및 무드 전개</span>
            </div>
            <div className="flex items-end gap-1.5 h-16 pt-2 border-b-2 border-[#111111]">
              {tracks.map((t, i) => {
                const ratio = (t.bpm - 60) / 100;
                const heightPct = Math.max(25, Math.min(100, ratio * 100));
                const isClimax = i + 1 >= Math.floor(tracks.length * 0.55) && i + 1 <= Math.ceil(tracks.length * 0.75);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full border-2 border-[#111111] rounded-t-md transition-all duration-300 ${
                        isClimax
                          ? 'bg-[#ff477e] shadow-[2px_2px_0_#111111]'
                          : 'bg-[#ffd166] group-hover:bg-[#00ffca]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono-neo font-bold text-[#111111]">{i + 1}</span>

                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#111111] text-white border-2 border-white px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-xl font-mono-neo">
                      {t.titleKo} · {t.bpm}BPM
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracks Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#111111] px-2 font-mono-neo font-bold uppercase">
              <span>총 {tracks.length}개 트랙 (순서 변경 및 재생시간 인라인 수정 가능)</span>
              <span>Suno AI 프롬프트 1클릭 복사</span>
            </div>

            <div className="space-y-2.5">
              {tracks.map((track, idx) => (
                <div
                  key={idx}
                  className="bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] hover:shadow-[5px_5px_0_#111111] rounded-2xl p-4 transition-all duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Index + Titles + Tags */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 items-center">
                      <div className="w-8 h-8 rounded-xl bg-[#ffd166] border-2 border-[#111111] text-[#111111] font-mono-neo font-extrabold text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_#111111]">
                        {String(track.index || idx + 1).padStart(2, '0')}
                      </div>
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="text-[#111111] hover:text-[#ff477e] disabled:opacity-20 p-0.5 cursor-pointer"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === tracks.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="text-[#111111] hover:text-[#ff477e] disabled:opacity-20 p-0.5 cursor-pointer"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#111111] truncate">{track.titleKo}</span>
                        <span className="text-xs text-[#555555] truncate">({track.titleEn})</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#00ffca] border border-[#111111] text-[11px] text-[#111111] font-mono-neo font-bold">
                          {track.moodTag}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#555555] font-mono-neo font-bold">
                        <span className="flex items-center gap-1 text-[#111111]">
                          <Activity className="w-3 h-3 text-[#ff477e]" /> {track.bpm} BPM
                        </span>
                        <span>Key: {track.key}</span>
                        <span className="text-[#555555]">[{track.instruments?.slice(0, 3).join(', ')}]</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Duration Editor + Suno Prompt Box */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                    {/* Inline Duration Editor */}
                    <div className="flex items-center gap-1.5 bg-[#fffbf2] border-2 border-[#111111] px-3 py-1.5 rounded-xl text-xs font-mono-neo font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#111111]" />
                      {editingDurationIndex === idx ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={durationInputVal}
                            onChange={(e) => setDurationInputVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveDuration(idx)}
                            className="w-14 px-1 py-0.5 rounded bg-white text-[#111111] text-center text-xs focus:outline-none border-2 border-[#ff477e]"
                            placeholder="3:20"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveDuration(idx)}
                            className="px-1.5 py-0.5 rounded bg-[#ff477e] text-white font-bold text-[10px]"
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditDuration(idx, track.durationSec)}
                          className="text-[#111111] hover:text-[#ff477e] font-extrabold hover:underline"
                          title="클릭하여 재생시간 수정"
                        >
                          {formatDuration(track.durationSec)}
                        </button>
                      )}
                    </div>

                    {/* Suno Prompt Copy Button */}
                    <button
                      onClick={() => handleCopyPrompt(track.sunoPrompt, idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono-neo font-bold flex items-center gap-2 border-2 border-[#111111] transition-all cursor-pointer ${
                        copiedIndex === idx
                          ? 'bg-[#00ffca] text-[#111111] shadow-[2px_2px_0_#111111]'
                          : 'bg-white hover:bg-[#ffd166] text-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px]'
                      }`}
                      title={track.sunoPrompt}
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-[#111111]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIndex === idx ? '프롬프트 복사됨' : 'Suno 프롬프트 복사'}</span>
                    </button>
                  </div>
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
              <span>4단계: Suno 최적화 프롬프트 생성하기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Initial state prompt to generate */}
      {(!tracks || tracks.length === 0) && !isLoading && !error && (
        <div className="bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00ffca] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center mx-auto text-[#111111]">
            <ListMusic className="w-7 h-7 fill-[#111111]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-mono-neo font-extrabold text-[#111111]">감정 곡선 트랙리스트를 설계합니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">
              오프닝 인트로, 60~70% 지점 감정 클라이맥스, 마무리 아웃트로까지 세밀하게 프로듀싱된 곡 목록을 생성합니다.
            </p>
          </div>
          <button
            onClick={onGenerate}
            className="px-8 py-3.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>트랙리스트 생성하기</span>
          </button>
        </div>
      )}
    </div>
  );
}
