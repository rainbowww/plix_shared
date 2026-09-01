import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Concept, ThumbnailConfig, ThumbnailCopy, ThumbnailPromptData } from '../types';
import { copyToClipboard } from '../utils/helpers';
import { launchImageGeneration, isBridgeInstalled } from '../utils/imageBridge';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Type,
  Palette,
  Layout,
  ArrowRight,
  ShieldCheck,
  Upload,
  ExternalLink,
} from 'lucide-react';

interface Step6ThumbnailProps {
  concept: Concept;
  hookTitle?: string;
  thumbnailCopy?: ThumbnailCopy;
  promptData?: ThumbnailPromptData;
  images: string[];
  config: ThumbnailConfig;
  onUpdateConfig: (config: ThumbnailConfig) => void;
  onGeneratePromptAndImage: () => void;
  onNext: () => void;
  isLoading: boolean;
  error?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const GRADIENT_PRESETS = [
  { name: '새벽 네이비', bg: 'linear-gradient(135deg, #090a14 0%, #151a2e 50%, #202b48 100%)', text: '#ffffff' },
  { name: '노을 앰버', bg: 'linear-gradient(135deg, #1f110c 0%, #3d1f14 50%, #683018 100%)', text: '#fae5b8' },
  { name: '로파이 퍼플', bg: 'linear-gradient(135deg, #120d1c 0%, #231638 50%, #3d245c 100%)', text: '#f3e8ff' },
  { name: '비 오는 숲', bg: 'linear-gradient(135deg, #0a1410 0%, #12281e 50%, #1d3e2f 100%)', text: '#d1fae5' },
  { name: '미드나잇 골드', bg: 'linear-gradient(135deg, #0b0b12 0%, #1a1724 50%, #2e2619 100%)', text: '#c8a96a' },
];

export function Step6Thumbnail({
  concept,
  hookTitle,
  thumbnailCopy,
  promptData,
  images,
  config,
  onUpdateConfig,
  onGeneratePromptAndImage,
  onNext,
  isLoading,
  error,
  onShowToast,
}: Step6ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);

  // Active texts (allow custom overrides or fallback to 2단계 thumbnailCopy)
  const activeMain = config.customMainText ?? (thumbnailCopy?.main || '새벽 3시 방구석');
  const activeSub = config.customSubText ?? (thumbnailCopy?.sub || '잠 못 드는 밤에 듣는 로파이');
  const activeBadge = config.customBadgeText ?? (thumbnailCopy?.badge || 'PLAYLIST · 1H');

  // Palette colors
  const palette = promptData?.palette && promptData.palette.length === 5
    ? promptData.palette
    : ['#ffffff', '#000000', '#c8a96a', '#e2e8f0', '#94a3b8'];

  // Render Canvas Function (1280x720 true resolution)
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    try {
      // 1. Wait for web fonts to be completely ready (prevents Korean character boxes □)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const W = 1280;
      const H = 720;
      canvas.width = W;
      canvas.height = H;

      // 2. Draw Background (Custom uploaded image OR AI Image OR Fallback Gradient)
      const selectedImgSrc = customImage || (images.length > 0 ? images[config.selectedImageIndex || 0] : null);

      if (selectedImgSrc && selectedImgSrc.startsWith('data:')) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = selectedImgSrc;
        });

        // Cover fill aspect ratio
        const scale = Math.max(W / img.width, H / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (W - nw) / 2;
        const ny = (H - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
      } else {
        // Fallback Gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        if (config.fallbackGradient.includes('linear-gradient')) {
          // Preset colors
          const preset = GRADIENT_PRESETS.find((p) => p.bg === config.fallbackGradient) || GRADIENT_PRESETS[0];
          if (preset.name === '노을 앰버') {
            grad.addColorStop(0, '#1f110c');
            grad.addColorStop(0.5, '#3d1f14');
            grad.addColorStop(1, '#683018');
          } else if (preset.name === '로파이 퍼플') {
            grad.addColorStop(0, '#120d1c');
            grad.addColorStop(0.5, '#231638');
            grad.addColorStop(1, '#3d245c');
          } else if (preset.name === '비 오는 숲') {
            grad.addColorStop(0, '#0a1410');
            grad.addColorStop(0.5, '#12281e');
            grad.addColorStop(1, '#1d3e2f');
          } else if (preset.name === '미드나잇 골드') {
            grad.addColorStop(0, '#0b0b12');
            grad.addColorStop(0.5, '#1a1724');
            grad.addColorStop(1, '#2e2619');
          } else {
            grad.addColorStop(0, '#090a14');
            grad.addColorStop(0.5, '#151a2e');
            grad.addColorStop(1, '#202b48');
          }
        } else {
          grad.addColorStop(0, '#0b0b12');
          grad.addColorStop(1, '#1f1f2e');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Subtle artistic noise/circles for fallback aesthetic
        ctx.fillStyle = 'rgba(200, 169, 106, 0.04)';
        ctx.beginPath();
        ctx.arc(W * 0.8, H * 0.3, 300, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.beginPath();
        ctx.arc(W * 0.2, H * 0.8, 250, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw Bottom 40% Linear Black Gradient for readability
      const shadowGrad = ctx.createLinearGradient(0, H * 0.45, 0, H);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, W, H);

      // Also top subtle gradient if position is top
      if (config.position === 'top-left') {
        const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
        topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // 4. Setup Typography coordinates based on position
      const fontName = config.fontFamily || 'Pretendard';
      let startX = 80;
      let startY = 560;
      let textAlign: CanvasTextAlign = 'left';

      if (config.position === 'bottom-right') {
        startX = W - 80;
        startY = 560;
        textAlign = 'right';
      } else if (config.position === 'center') {
        startX = W / 2;
        startY = 420;
        textAlign = 'center';
      } else if (config.position === 'top-left') {
        startX = 80;
        startY = 140;
        textAlign = 'left';
      }

      ctx.textAlign = textAlign;

      // Text Shadow setup
      ctx.shadowColor = config.shadowColor || 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = config.shadowBlur || 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Draw Badge (if enabled)
      if (config.showBadge && activeBadge) {
        ctx.save();
        const badgeY = config.position === 'top-left' ? startY - 50 : startY - 120;
        ctx.font = `700 20px "${fontName}", sans-serif`;
        ctx.fillStyle = '#fae5b8';

        // Badge pill background
        const badgeMetrics = ctx.measureText(activeBadge);
        const bw = badgeMetrics.width + 28;
        const bh = 34;
        let bx = startX;
        if (textAlign === 'right') bx = startX - bw;
        if (textAlign === 'center') bx = startX - bw / 2;

        ctx.fillStyle = 'rgba(200, 169, 106, 0.25)';
        ctx.strokeStyle = 'rgba(200, 169, 106, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, badgeY - 24, bw, bh, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fae5b8';
        ctx.fillText(activeBadge, textAlign === 'left' ? bx + 14 : textAlign === 'right' ? bx + bw - 14 : startX, badgeY);
        ctx.restore();
      }

      // Draw Main Title (Auto-wrapping & font scaling if exceeding 80% width)
      let mainFontSize = config.mainFontSize || 72;
      ctx.font = `800 ${mainFontSize}px "${fontName}", sans-serif`;

      const maxLineWidth = W * 0.82;
      let words = activeMain.split(' ');
      let lines: string[] = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Auto shrink if still too wide
      while (lines.some((l) => ctx.measureText(l).width > maxLineWidth) && mainFontSize > 36) {
        mainFontSize -= 4;
        ctx.font = `800 ${mainFontSize}px "${fontName}", sans-serif`;
      }

      ctx.fillStyle = config.textColor || '#ffffff';
      const lineHeight = mainFontSize * 1.18;

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;
        ctx.fillText(line, startX, lineY);
      });

      // Draw Subtitle
      if (activeSub) {
        const subY = startY + lines.length * lineHeight + 14;
        ctx.font = `500 28px "${fontName}", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(activeSub, startX, subY);
      }

      setIsRendering(false);
    } catch (err) {
      console.error('Canvas render error:', err);
      setIsRendering(false);
    }
  }, [
    customImage,
    images,
    config,
    activeMain,
    activeSub,
    activeBadge,
  ]);

  // Re-render canvas whenever relevant config changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Download 1280x720 PNG
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `thumbnail_1280x720_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('1280×720 고해상도 썸네일이 다운로드되었습니다!', 'success');
    } catch (err) {
      console.error('PNG download error:', err);
      onShowToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
  };

  // Upload Custom Image File
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImage(event.target.result as string);
          onShowToast('커스텀 배경 이미지가 적용되었습니다.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyPrompt = async () => {
    if (!promptData?.prompt) return;
    const ok = await copyToClipboard(promptData.prompt);
    if (ok) {
      setCopiedPrompt(true);
      onShowToast('Imagen 영문 프롬프트가 복사되었습니다!', 'success');
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const [launching, setLaunching] = useState<null | 'gemini' | 'chatgpt'>(null);
  const handleLaunch = async (platform: 'gemini' | 'chatgpt') => {
    if (!promptData?.prompt || launching) return;
    const name = platform === 'gemini' ? 'Gemini' : 'ChatGPT';
    setLaunching(platform);
    try {
      const r = await launchImageGeneration(platform, promptData.prompt);
      if (r.mode === 'auto' && r.ok) {
        onShowToast(`${name} 새 대화에 프롬프트를 입력하고 이미지 생성을 시작했습니다.`, 'success');
      } else if (r.mode === 'auto' && !r.ok) {
        onShowToast(`${name} 자동 실행에 실패해 프롬프트를 복사하고 새 탭을 열었습니다. 붙여넣기(Ctrl+V) 후 전송하세요.`, 'info');
      } else {
        onShowToast(`확장 미설치 — 프롬프트를 복사하고 ${name}를 새 탭으로 열었습니다. 붙여넣기(Ctrl+V) 후 전송하세요.`, 'info');
      }
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffd166] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase shadow-[2px_2px_0_#111111] mb-2 -rotate-1">
            <ImageIcon className="w-3.5 h-3.5 fill-[#111111]" />
            <span>STEP 6: 1280×720 THUMBNAIL STUDIO</span>
          </div>
          <h1 className="font-gaegu text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
            클릭을 부르는 유튜브 1280×720 썸네일
          </h1>
          <p className="text-[#333333] text-sm mt-1 font-medium">
            2-Pass 엔진: 90~140단어 Imagen 프롬프트 생성 & HTML5 캔버스 한글 타이포그래피 합성 (Pretendard/바탕체 지원).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGeneratePromptAndImage}
            disabled={isLoading}
            className="px-5 py-3 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            <span>{promptData ? '썸네일 재합성' : 'AI 썸네일 생성'}</span>
          </button>

          <button
            onClick={onNext}
            className="px-6 py-3 bg-[#00ffca] hover:bg-[#00e5b5] text-[#111111] border-3 border-[#111111] font-mono-neo font-extrabold text-sm uppercase shadow-[4px_4px_0_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-all"
          >
            <span>7단계 업로드킷</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Canvas Stage (Left) & Controls Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Canvas Stage (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[6px_6px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00ffca] border border-[#111111]" />
                <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">1280 × 720 실시간 캔버스 프리뷰</h3>
              </div>
              <span className="text-xs font-mono-neo font-bold text-[#555555]">16:9 유튜브 표준 비율</span>
            </div>

            {/* Canvas Container with 16:9 ratio and CSS scale down */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-3 border-[#111111] shadow-[4px_4px_0_#111111] bg-[#111111] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
                style={{ imageRendering: 'auto' }}
              />
              {isRendering && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs font-mono-neo font-bold text-[#ffd166]">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  <span>폰트 & 그래픽 렌더링 중...</span>
                </div>
              )}
            </div>

            {/* Download and Image Source Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <label className="px-4 py-2 bg-white hover:bg-[#fffbf2] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#ff477e]" />
                  <span>내 배경 이미지 업로드</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {customImage && (
                  <button
                    onClick={() => {
                      setCustomImage(null);
                      onShowToast('기본 배경으로 복원되었습니다.', 'info');
                    }}
                    className="text-xs text-[#555555] hover:text-[#ff477e] font-mono-neo font-bold underline cursor-pointer"
                  >
                    업로드 초기화
                  </button>
                )}
              </div>

              <button
                onClick={handleDownloadPng}
                className="px-6 py-2.5 bg-[#ff477e] hover:bg-[#ff2d6c] text-white border-2 border-[#111111] font-mono-neo font-extrabold text-xs uppercase flex items-center gap-2 shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>1280×720 PNG 다운로드</span>
              </button>
            </div>
          </div>

          {/* AI Image Generation Prompt Box (Pass A Output) */}
          {promptData && (
            <div className="bg-white border-3 border-[#111111] rounded-2xl p-5 shadow-[4px_4px_0_#111111] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff477e]" />
                  <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">Pass A: Imagen 영문 프롬프트 (90~140단어)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onGeneratePromptAndImage}
                    disabled={isLoading}
                    title="같은 컨셉으로 프롬프트를 새로 생성합니다"
                    className="px-3 py-1 bg-white hover:bg-[#00ffca] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? '재생성 중' : '프롬프트 재생성'}</span>
                  </button>
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1 bg-white hover:bg-[#ffd166] border-2 border-[#111111] text-xs font-mono-neo font-bold text-[#111111] shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#ff477e]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? '복사됨' : '프롬프트 복사'}</span>
                  </button>
                </div>
              </div>
              <p className="p-3.5 rounded-xl bg-[#fffbf2] border-2 border-[#111111] text-xs font-mono-neo text-[#111111] font-medium leading-relaxed select-all">
                {promptData.prompt}
              </p>

              {/* 이미지 생성 바로가기 */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-mono-neo font-extrabold text-[#555555] uppercase">이미지 생성 바로가기</span>
                <button
                  onClick={() => handleLaunch('chatgpt')}
                  disabled={!!launching}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-[#333] text-white border-2 border-[#111111] text-xs font-mono-neo font-extrabold shadow-[2px_2px_0_#00ffca] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{launching === 'chatgpt' ? '실행 중…' : 'ChatGPT로 생성'}</span>
                </button>
                <button
                  onClick={() => handleLaunch('gemini')}
                  disabled={!!launching}
                  className="px-3 py-1.5 bg-[#4285F4] hover:bg-[#2f6fe0] text-white border-2 border-[#111111] text-xs font-mono-neo font-extrabold shadow-[2px_2px_0_#111111] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{launching === 'gemini' ? '실행 중…' : 'Gemini로 생성'}</span>
                </button>
                {!isBridgeInstalled() && (
                  <span className="text-[11px] text-[#999] font-medium">
                    (PLIX Bridge 확장 설치 시 자동 입력·전송 / 미설치 시 복사+새 탭)
                  </span>
                )}
              </div>

              <div className="text-[11px] text-[#555555] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00ffca]" />
                <span>네거티브 스페이스(글자 여백) 확보 & 텍스트/워터마크 배제 완료</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Typography & Aesthetic Controls (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-3 border-[#111111] rounded-2xl p-6 shadow-[6px_6px_0_#111111] space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#111111]">
              <Sliders className="w-4 h-4 text-[#ff477e]" />
              <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase">타이포그래피 & 스타일 편집</h3>
            </div>

            {/* 1. Editable Texts */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase mb-1">메인 카피 (Main Title)</label>
                <input
                  type="text"
                  value={activeMain}
                  onChange={(e) => onUpdateConfig({ ...config, customMainText: e.target.value })}
                  placeholder="예: 새벽 3시 방구석"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-bold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase mb-1">서브 카피 (Subtitle)</label>
                <input
                  type="text"
                  value={activeSub}
                  onChange={(e) => onUpdateConfig({ ...config, customSubText: e.target.value })}
                  placeholder="예: 잠 못 드는 밤에 듣는 로파이"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-bold text-sm shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-mono-neo font-extrabold text-[#111111] uppercase">상단 뱃지 표시</label>
                <input
                  type="checkbox"
                  checked={config.showBadge}
                  onChange={(e) => onUpdateConfig({ ...config, showBadge: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#ff477e] cursor-pointer"
                />
              </div>
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-mono-neo font-extrabold text-[#111111] uppercase">PLAYLIST 배경 텍스트 효과</label>
            <input
              type="checkbox"
              checked={config.includePlaylistBg ?? true}
              onChange={(e) => onUpdateConfig({ ...config, includePlaylistBg: e.target.checked })}
              className="w-4 h-4 rounded accent-[#ff477e] cursor-pointer"
            />
          </div>
              {config.showBadge && (
                <input
                  type="text"
                  value={activeBadge}
                  onChange={(e) => onUpdateConfig({ ...config, customBadgeText: e.target.value })}
                  placeholder="예: PLAYLIST · 1H"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-bold shadow-[2px_2px_0_#111111] focus:outline-none focus:border-[#ff477e]"
                />
              )}
            </div>

            {/* 2. WebFont Selector */}
            <div className="space-y-2 pt-3 border-t-2 border-[#111111]">
              <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#ff477e]" />
                웹폰트 선택 (Web Fonts)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Pretendard', label: 'Pretendard (모던)' },
                  { id: 'Gowun Batang', label: '고운바탕 (감성명조)' },
                  { id: 'Noto Sans KR', label: '노토산스 (볼드)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdateConfig({ ...config, fontFamily: f.id })}
                    className={`px-3 py-2 rounded-xl text-xs font-mono-neo font-bold border-2 border-[#111111] transition-all cursor-pointer truncate ${
                      config.fontFamily === f.id
                        ? 'bg-[#ffd166] text-[#111111] shadow-[2px_2px_0_#111111]'
                        : 'bg-white text-[#555555] hover:text-[#111111]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Text Position */}
            <div className="space-y-2 pt-3 border-t-2 border-[#111111]">
              <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-[#ff477e]" />
                텍스트 배치 위치
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'bottom-left', label: '좌하단' },
                  { id: 'bottom-right', label: '우하단' },
                  { id: 'center', label: '중앙' },
                  { id: 'top-left', label: '좌상단' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onUpdateConfig({ ...config, position: p.id as any })}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono-neo font-bold border-2 border-[#111111] transition-all cursor-pointer ${
                      config.position === p.id
                        ? 'bg-[#00ffca] text-[#111111] shadow-[2px_2px_0_#111111]'
                        : 'bg-white text-[#555555] hover:text-[#111111]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Font Size & Shadow Blur Sliders */}
            <div className="space-y-4 pt-3 border-t-2 border-[#111111]">
              <div>
                <div className="flex justify-between text-xs font-mono-neo font-extrabold text-[#111111] uppercase mb-1">
                  <span>메인 폰트 크기</span>
                  <span className="font-mono-neo text-[#ff477e] font-extrabold">{config.mainFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={48}
                  max={96}
                  step={2}
                  value={config.mainFontSize}
                  onChange={(e) => onUpdateConfig({ ...config, mainFontSize: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-[#fffbf2] border border-[#111111] rounded-lg appearance-none cursor-pointer accent-[#ff477e]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono-neo font-extrabold text-[#111111] uppercase mb-1">
                  <span>그림자 강도 (가독성 강화)</span>
                  <span className="font-mono-neo text-[#ff477e] font-extrabold">{config.shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={config.shadowBlur}
                  onChange={(e) => onUpdateConfig({ ...config, shadowBlur: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-[#fffbf2] border border-[#111111] rounded-lg appearance-none cursor-pointer accent-[#ff477e]"
                />
              </div>
            </div>

            {/* 5. 5-Color AI Palette & Custom Color */}
            <div className="space-y-2 pt-3 border-t-2 border-[#111111]">
              <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#ff477e]" />
                  글자색 (AI 추천 5색 팔레트)
                </span>
                <span className="font-mono-neo text-[10px] text-[#555555]">{config.textColor}</span>
              </label>

              <div className="flex items-center gap-2">
                {palette.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateConfig({ ...config, textColor: color })}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-xl border-2 border-[#111111] transition-transform cursor-pointer shadow-[2px_2px_0_#111111] ${
                      config.textColor.toLowerCase() === color.toLowerCase()
                        ? 'scale-110 ring-2 ring-[#ff477e]'
                        : 'hover:scale-105'
                    }`}
                    title={`색상: ${color} (${idx === 0 ? '글자색 추천' : idx === 1 ? '그림자색 추천' : '포인트'})`}
                  />
                ))}

                {/* Custom Color Input */}
                <input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => onUpdateConfig({ ...config, textColor: e.target.value })}
                  className="w-8 h-8 rounded-xl bg-transparent border-2 border-[#111111] shadow-[2px_2px_0_#111111] cursor-pointer"
                  title="직접 색상 선택"
                />
              </div>
            </div>

            {/* 6. Fallback Gradient Presets */}
            <div className="space-y-2 pt-3 border-t-2 border-[#111111]">
              <label className="block text-xs font-mono-neo font-extrabold text-[#111111] uppercase">텍스트 전용 배경 그라데이션</label>
              <div className="grid grid-cols-2 gap-2">
                {GRADIENT_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCustomImage(null);
                      onUpdateConfig({ ...config, fallbackGradient: p.bg });
                    }}
                    style={{ background: p.bg }}
                    className={`px-3 py-2 rounded-xl text-xs font-mono-neo font-bold text-white border-2 border-[#111111] text-left cursor-pointer transition-all ${
                      config.fallbackGradient === p.bg && !customImage
                        ? 'shadow-[3px_3px_0_#ff477e] scale-102'
                        : 'opacity-80 hover:opacity-100 shadow-[2px_2px_0_#111111]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
