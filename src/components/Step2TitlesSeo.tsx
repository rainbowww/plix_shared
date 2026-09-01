import { useState } from 'react';
import { TitleSeoData } from '../types';
import { copyToClipboard } from '../utils/helpers';
import {
  Sparkles,
  Copy,
  Check,
  Star,
  RefreshCw,
  Tag,
  Search,
  Tv,
  FileText,
  LayoutTemplate,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface Step2TitlesSeoProps {
  data?: TitleSeoData;
  favoriteTitle?: string;
  onSelectFavorite: (title: string) => void;
  onGenerate: () => void;
  onNext: () => void;
  isLoading: boolean;
  error?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Step2TitlesSeo({
  data,
  favoriteTitle,
  onSelectFavorite,
  onGenerate,
  onNext,
  isLoading,
  error,
  onShowToast,
}: Step2TitlesSeoProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      onShowToast(`${label} 복사되었습니다!`, 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      onShowToast('복사에 실패했습니다.', 'error');
    }
  };

  const currentHook = favoriteTitle || data?.hookTitle || (data?.videoTitles && data.videoTitles[0]) || '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffd166] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <Sparkles className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 2: EMOJI TITLES & YOUTUBE SEO</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            조회수를 부르는 이모지 제목과 SEO 키워드
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            원하는 제목의 ⭐ 별표를 누르면 해당 제목이 메인 타이틀(Hook Title)로 지정되어 다음 단계들에 자동 반영됩니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="px-5 py-3 bg-white hover:bg-[#fffbf2] border-3 border-[#111111] text-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#ff477e] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{data ? '새로 다시 생성' : '제목 생성하기'}</span>
          </button>

          {data && (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>3단계 트랙리스트</span>
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
            <h3 className="text-lg font-mono-neo font-bold text-[#111111]">제목 생성 중 오류가 발생했습니다</h3>
            <p className="text-sm text-[#333333] mt-1 max-w-md mx-auto font-medium">{error}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] animate-pulse flex items-center px-5 justify-between"
              >
                <div className="space-y-2 w-3/4">
                  <div className="h-4 bg-zinc-200 rounded w-5/6" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-200" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] animate-pulse" />
            <div className="h-48 rounded-2xl bg-white border-3 border-[#111111] shadow-[4px_4px_0_#111111] animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Content when Data Available */}
      {data && !isLoading && (
        <div className="space-y-8">
          {/* Active Hook Title Alert */}
          {currentHook && (
            <div className="bg-[#ffd166] border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#111111] text-[#111111] flex items-center justify-center font-bold shrink-0 shadow-[2px_2px_0_#111111]">
                  <Star className="w-5 h-5 fill-[#ff477e] text-[#ff477e]" />
                </div>
                <div>
                  <span className="text-[11px] font-mono-neo font-extrabold tracking-wider text-[#111111] uppercase">
                    현재 확정 메인 타이틀 (Hook Title)
                  </span>
                  <h3 className="text-lg font-bold text-[#111111] mt-0.5">{currentHook}</h3>
                </div>
              </div>

              <button
                onClick={() => handleCopy(currentHook, 'hook', '메인 타이틀')}
                className="px-4 py-2 bg-white hover:bg-[#fffbf2] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] flex items-center gap-2 shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                {copiedKey === 'hook' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'hook' ? '복사됨' : '타이틀 복사'}</span>
              </button>
            </div>
          )}

          {/* 8 Video Titles Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                <Tv className="w-4 h-4 text-[#ff477e]" />
                <span>영상 제목 후보 8종 (클릭 시 즐겨찾기 지정)</span>
              </h2>
              <span className="text-xs text-[#333333] font-mono-neo font-bold">25~40자 내외</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {data.videoTitles.map((title, idx) => {
                const isFav = currentHook === title;
                return (
                  <div
                    key={idx}
                    className={`group relative p-4 rounded-2xl border-3 border-[#111111] transition-all duration-200 flex items-center justify-between gap-3 ${
                      isFav
                        ? 'bg-[#00ffca] shadow-[5px_5px_0_#111111]'
                        : 'bg-white hover:bg-[#fffbf2] shadow-[4px_4px_0_#111111] hover:shadow-[5px_5px_0_#111111]'
                    }`}
                  >
                    <div
                      onClick={() => onSelectFavorite(title)}
                      className="flex-1 cursor-pointer flex items-start gap-3"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFavorite(title);
                        }}
                        className={`p-1.5 rounded-lg border border-[#111111] transition-colors shrink-0 mt-0.5 ${
                          isFav
                            ? 'text-[#ff477e] bg-white'
                            : 'text-zinc-400 bg-[#fffbf2] hover:text-[#ff477e]'
                        }`}
                        title="메인 타이틀로 지정"
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-[#ff477e]' : ''}`} />
                      </button>

                      <div className="space-y-1">
                        <p className="text-sm font-bold leading-snug text-[#111111]">
                          {title}
                        </p>
                        <span className="text-[11px] text-[#444444] font-mono-neo font-bold">
                          #{idx + 1} · {title.length}자
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(title, `title-${idx}`, '제목')}
                      className="p-2 rounded-xl bg-white hover:bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-[#111111] transition-colors shrink-0 cursor-pointer"
                      title="제목 복사"
                    >
                      {copiedKey === `title-${idx}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3-Column Middle Section: Channel Names & Thumbnail Copy & Description */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Channel Names */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                  <Tv className="w-4 h-4 text-[#ff477e]" />
                  <span>채널명 아이디어 (5개)</span>
                </h3>
              </div>
              <div className="space-y-2">
                {data.channelNames.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#fffbf2] border-2 border-[#111111] text-xs font-bold text-[#111111]"
                  >
                    <span>{name}</span>
                    <button
                      onClick={() => handleCopy(name, `ch-${i}`, '채널명')}
                      className="text-[#111111] hover:text-[#ff477e] p-1 cursor-pointer"
                    >
                      {copiedKey === `ch-${i}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Thumbnail Copy Preset */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                  <LayoutTemplate className="w-4 h-4 text-[#ff477e]" />
                  <span>썸네일 추천 카피</span>
                </h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#fffbf2] border-2 border-[#111111]">
                  <div className="text-[10px] text-[#555555] font-mono-neo font-bold uppercase mb-1">메인 카피 (Main)</div>
                  <div className="font-extrabold text-sm text-[#111111]">{data.thumbnailCopy.main}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#fffbf2] border-2 border-[#111111]">
                  <div className="text-[10px] text-[#555555] font-mono-neo font-bold uppercase mb-1">서브 카피 (Sub)</div>
                  <div className="font-semibold text-[#111111]">{data.thumbnailCopy.sub}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#fffbf2] border-2 border-[#111111]">
                  <div className="text-[10px] text-[#555555] font-mono-neo font-bold uppercase mb-1">뱃지 (Badge)</div>
                  <div className="font-mono-neo font-bold text-[#ff477e]">{data.thumbnailCopy.badge}</div>
                </div>
              </div>
            </div>

            {/* Description Intro */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                  <FileText className="w-4 h-4 text-[#ff477e]" />
                  <span>설명란 도입부</span>
                </h3>
                <button
                  onClick={() => handleCopy(data.description, 'desc', '설명란')}
                  className="text-xs text-[#ff477e] font-mono-neo font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'desc' ? '복사됨' : '복사'}</span>
                </button>
              </div>
              <p className="text-xs text-[#111111] font-medium leading-relaxed whitespace-pre-wrap bg-[#fffbf2] p-3.5 rounded-xl border-2 border-[#111111]">
                {data.description}
              </p>
            </div>
          </div>

          {/* Hashtags & SEO Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hashtags */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                  <Tag className="w-4 h-4 text-[#ff477e]" />
                  <span>해시태그 (12개)</span>
                </h3>
                <button
                  onClick={() => handleCopy(data.hashtags.join(' '), 'all-hash', '전체 해시태그')}
                  className="text-xs text-[#ff477e] font-mono-neo font-bold hover:underline cursor-pointer"
                >
                  {copiedKey === 'all-hash' ? '복사완료!' : '전체 복사'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleCopy(tag, `tag-${idx}`, tag)}
                    className="px-2.5 py-1 rounded-lg bg-[#fffbf2] hover:bg-[#ffd166] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-xs font-bold text-[#111111] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
                    title="클릭하여 복사"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* SEO Search Keywords */}
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] flex items-center gap-2 uppercase">
                  <Search className="w-4 h-4 text-[#ff477e]" />
                  <span>유튜브 SEO 검색 키워드 (15개)</span>
                </h3>
                <button
                  onClick={() => handleCopy(data.seoKeywords.join(', '), 'all-seo', '전체 SEO 키워드')}
                  className="text-xs text-[#ff477e] font-mono-neo font-bold hover:underline cursor-pointer"
                >
                  {copiedKey === 'all-seo' ? '복사완료!' : '전체 복사 (쉼표)'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.seoKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleCopy(kw, `kw-${idx}`, kw)}
                    className="px-2.5 py-1 rounded-lg bg-[#fffbf2] hover:bg-[#00ffca] border-2 border-[#111111] shadow-[2px_2px_0_#111111] text-xs font-bold text-[#111111] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
                    title="클릭하여 복사"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Next Step Action */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onNext}
              className="w-full sm:w-auto px-8 py-4 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-base uppercase shadow-[6px_6px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <span>3단계: 트랙리스트 & 감정 곡선 설계하기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Initial state prompt to generate */}
      {!data && !isLoading && !error && (
        <div className="bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ffd166] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center mx-auto text-[#111111]">
            <Sparkles className="w-7 h-7 fill-[#111111]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-mono-neo font-extrabold text-[#111111]">제목과 SEO 키워드를 생성할 준비가 되었습니다</h3>
            <p className="text-sm text-[#333333] mt-1 font-medium">
              설정하신 컨셉을 바탕으로 유튜브 시청자를 사로잡는 이모지 제목 8종과 검색어들을 뽑아냅니다.
            </p>
          </div>
          <button
            onClick={onGenerate}
            className="px-8 py-3.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>지금 제목 & SEO 생성하기</span>
          </button>
        </div>
      )}
    </div>
  );
}
