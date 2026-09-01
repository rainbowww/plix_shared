import React, { useState, useMemo } from 'react';
import { Concept, TitleSeoData, TrackItem, UploadKitData, ProjectState } from '../types';
import { formatDuration, copyToClipboard, downloadTextFile, downloadJsonFile } from '../utils/helpers';
import {
  UploadCloud,
  Copy,
  Check,
  Download,
  Save,
  FolderOpen,
  MessageSquare,
  Tag,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Step7UploadKitProps {
  concept: Concept;
  titleSeo?: TitleSeoData;
  favoriteTitle?: string;
  tracks?: TrackItem[];
  uploadKit?: UploadKitData;
  projectState: ProjectState;
  onLoadProject: (state: ProjectState) => void;
  onGenerateExtras: () => void;
  isLoading: boolean;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Step7UploadKit({
  concept,
  titleSeo,
  favoriteTitle,
  tracks,
  uploadKit,
  projectState,
  onLoadProject,
  onGenerateExtras,
  isLoading,
  onShowToast,
}: Step7UploadKitProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedTitle = favoriteTitle || titleSeo?.hookTitle || (titleSeo?.videoTitles && titleSeo.videoTitles[0]) || '새벽 감성 플레이리스트';

  // 1. Calculate Timestamps in Code (Cumulative durationSec sum)
  const timelineText = useMemo(() => {
    if (!tracks || tracks.length === 0) return '00:00 트랙 정보 없음';

    let currentSec = 0;
    const lines: string[] = [];

    tracks.forEach((track) => {
      const timeTag = formatDuration(currentSec);
      lines.push(`${timeTag} ${track.titleKo} (${track.titleEn})`);
      currentSec += Number(track.durationSec) || 180;
    });

    return lines.join('\n');
  }, [tracks]);

  // 2. Full Unified YouTube Description Block
  const fullDescriptionText = useMemo(() => {
    let result = '';

    // Title & Intro
    result += `✨ ${selectedTitle}\n\n`;
    if (titleSeo?.description) {
      result += `${titleSeo.description}\n\n`;
    }

    result += `─────────────────────────────────────────\n`;
    result += `🎧 TRACKLIST & TIMELINE\n`;
    result += `─────────────────────────────────────────\n`;
    result += `${timelineText}\n\n`;

    // CTA Line
    if (uploadKit?.ctaLine) {
      result += `📢 ${uploadKit.ctaLine}\n\n`;
    }

    // AI Transparency Notice
    result += `─────────────────────────────────────────\n`;
    result += `ℹ️ AI MUSIC INFORMATION\n`;
    result += `─────────────────────────────────────────\n`;
    if (uploadKit?.aiNotice) {
      result += `${uploadKit.aiNotice}\n\n`;
    } else {
      result += `본 영상의 모든 음원은 Suno AI를 활용하여 오리지널 작곡 및 사운드 디자인된 트랙들로 구성되었습니다.\n`;
      result += `영상에 사용된 썸네일 및 비주얼 아트워크 또한 AI 모델을 통해 자체 제작되었습니다.\n\n`;
    }

    // Hashtags
    if (titleSeo?.hashtags && titleSeo.hashtags.length > 0) {
      result += `${titleSeo.hashtags.join(' ')}\n`;
    }

    return result;
  }, [selectedTitle, titleSeo, timelineText, uploadKit]);

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

  // Export Full Project as JSON
  const handleSaveProjectJson = () => {
    const filename = `playlist_project_${Date.now()}.json`;
    downloadJsonFile(filename, projectState);
    onShowToast('프로젝트가 .json 파일로 저장되었습니다!', 'success');
  };

  // Load Project from JSON
  const handleLoadProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target?.result as string);
          if (loaded && loaded.concept) {
            onLoadProject(loaded);
            onShowToast('프로젝트를 성공적으로 불러왔습니다!', 'success');
          } else {
            onShowToast('유효하지 않은 프로젝트 파일입니다.', 'error');
          }
        } catch (err) {
          console.error(err);
          onShowToast('JSON 파싱 실패: 올바른 프로젝트 파일을 선택하세요.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Export Complete Text Kit as .txt
  const handleExportFullTxt = () => {
    let full = `=================================================\n`;
    full += `  AI PLAYLIST CREATOR — COMPLETE UPLOAD KIT\n`;
    full += `=================================================\n\n`;

    full += `[확정 영상 제목 (Title)]\n${selectedTitle}\n\n`;

    if (titleSeo?.videoTitles) {
      full += `[영상 제목 후보군 (8종)]\n${titleSeo.videoTitles.join('\n')}\n\n`;
    }

    full += `[유튜브 설명란 완성본 (Description)]\n${fullDescriptionText}\n\n`;

    if (uploadKit?.pinnedComment) {
      full += `[고정 댓글 (Pinned Comment)]\n${uploadKit.pinnedComment}\n\n`;
    }

    if (uploadKit?.tags) {
      full += `[유튜브 검색 태그 (20개)]\n${uploadKit.tags.join(', ')}\n\n`;
    }

    if (tracks && tracks.length > 0) {
      full += `=================================================\n`;
      full += `  SUNO PROMPTS & TRACK SPECS\n`;
      full += `=================================================\n\n`;
      tracks.forEach((t, i) => {
        full += `== Track ${i + 1}. ${t.titleKo} (${t.titleEn}) ==\n`;
        full += `BPM: ${t.bpm} | Key: ${t.key} | Mood: ${t.moodTag} | Duration: ${formatDuration(t.durationSec)}\n`;
        full += `Suno Prompt: ${t.sunoPrompt}\n\n`;
      });
    }

    downloadTextFile(`youtube_playlist_kit_${Date.now()}.txt`, full);
    onShowToast('전체 업로드 키트 .txt 파일이 다운로드되었습니다!', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00ffca] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <UploadCloud className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 7: YOUTUBE UPLOAD KIT & PACKAGING</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            유튜브 업로드에 필요한 모든 것
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            코드 계산 타임라인, 완성된 설명란, 고정 댓글, 20개 유튜브 태그를 한 번에 확인하고 복사하세요.
          </p>
        </div>

        {/* Project Save / Load / TXT Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSaveProjectJson}
            className="px-3.5 py-2.5 bg-white hover:bg-[#fffbf2] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="현재 프로젝트 전체 상태를 JSON으로 저장"
          >
            <Save className="w-4 h-4 text-[#ff477e]" />
            <span>프로젝트 저장 (.json)</span>
          </button>

          <label className="px-3.5 py-2.5 bg-white hover:bg-[#fffbf2] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 cursor-pointer transition-all">
            <FolderOpen className="w-4 h-4 text-[#ff477e]" />
            <span>불러오기</span>
            <input type="file" accept=".json" onChange={handleLoadProjectJson} className="hidden" />
          </label>

          <button
            onClick={handleExportFullTxt}
            className="px-4 py-2.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-2 border-[#111111] font-mono-neo font-extrabold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>전체 텍스트 (.txt)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Description (Left) & Comments / Tags (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Full YouTube Description Box (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff477e] border border-[#111111]" />
                <h3 className="text-base font-mono-neo font-extrabold text-[#111111] uppercase">유튜브 설명란 완성본</h3>
              </div>
              <button
                onClick={() => handleCopy(fullDescriptionText, 'full-desc', '설명란 전체')}
                className="px-4 py-2 bg-[#ffd166] hover:bg-[#ffc338] text-[#111111] border-2 border-[#111111] font-mono-neo font-extrabold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                {copiedKey === 'full-desc' ? <Check className="w-4 h-4 text-[#ff477e]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'full-desc' ? '전체 복사완료!' : '설명란 전체 복사'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] font-sans text-xs text-[#111111] font-medium whitespace-pre-wrap leading-relaxed select-all max-h-[550px] overflow-y-auto shadow-inner">
              {fullDescriptionText}
            </pre>
          </div>
        </div>

        {/* Right: Pinned Comment & 20 YouTube Tags & Extras (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pinned Comment Box */}
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ff477e]" />
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">질문형 고정 댓글 (2~3문장)</h3>
              </div>
              {uploadKit?.pinnedComment && (
                <button
                  onClick={() => handleCopy(uploadKit.pinnedComment, 'pin', '고정 댓글')}
                  className="px-3 py-1 bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'pin' ? <Check className="w-3.5 h-3.5 text-[#ff477e]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pin' ? '복사됨' : '복사'}</span>
                </button>
              )}
            </div>

            {uploadKit?.pinnedComment ? (
              <p className="p-3.5 rounded-xl bg-[#fffbf2] border-2 border-[#111111] text-xs font-medium text-[#111111] leading-relaxed select-all">
                {uploadKit.pinnedComment}
              </p>
            ) : (
              <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#111111] text-center space-y-2">
                <p className="text-xs text-[#555555] font-medium">댓글 참여를 높이는 질문형 고정 댓글을 생성합니다.</p>
                <button
                  onClick={onGenerateExtras}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-2 border-[#111111] font-mono-neo font-extrabold text-xs uppercase flex items-center gap-1.5 mx-auto shadow-[2px_2px_0_#111111] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>고정 댓글 & 태그 생성</span>
                </button>
              </div>
            )}
          </div>

          {/* YouTube 20 Tags Box */}
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#ff477e]" />
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">유튜브 태그 20개 (한글12 + 영문8)</h3>
              </div>
              {uploadKit?.tags && uploadKit.tags.length > 0 && (
                <button
                  onClick={() => handleCopy(uploadKit.tags.join(', '), 'tags', '태그 20개')}
                  className="px-3 py-1 bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'tags' ? <Check className="w-3.5 h-3.5 text-[#ff477e]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'tags' ? '복사됨' : '전체 복사 (쉼표)'}</span>
                </button>
              )}
            </div>

            {uploadKit?.tags && uploadKit.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {uploadKit.tags.map((t, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleCopy(t, `tag-${idx}`, t)}
                    className="px-2.5 py-1 rounded-lg bg-[#fffbf2] hover:bg-[#00ffca] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#555555]">태그가 아직 생성되지 않았습니다.</p>
            )}
          </div>

          {/* AI Disclaimer Transparency */}
          <div className="bg-[#fffbf2] border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono-neo font-extrabold text-[#111111] uppercase">
              <ShieldCheck className="w-4 h-4 text-[#00ffca]" />
              <span>AI 음원 유튜브 수익화 & 고지 가이드</span>
            </div>
            <p className="text-[11px] text-[#333333] font-medium leading-relaxed">
              Suno AI에서 생성된 음악의 유튜브 수익화는 <strong>Suno 유료 플랜(Pro/Premier)</strong> 계정에서 생성된 음원에 한해 상업적 이용이 허용됩니다. 설명란에 AI 음악 투명성 고지 문구를 포함하면 안전합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
