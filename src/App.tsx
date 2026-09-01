import React, { useState, useEffect, useCallback } from 'react';
import {
  Concept,
  TitleSeoData,
  TrackItem,
  SunoData,
  LyricsData,
  ThumbnailPromptData,
  ThumbnailConfig,
  UploadKitData,
  ProjectState,
  AppLanguage,
  AppSettings,
  TelemetryState,
  GenrePreset,
  SnapshotItem,
} from './types';
import { Header } from './components/Header';
import { StepNav } from './components/StepNav';
import { Step1Concept } from './components/Step1Concept';
import { Step2TitlesSeo } from './components/Step2TitlesSeo';
import { Step3Tracklist } from './components/Step3Tracklist';
import { Step4Suno } from './components/Step4Suno';
import { Step5Lyrics } from './components/Step5Lyrics';
import { Step6Thumbnail } from './components/Step6Thumbnail';
import { Step7UploadKit } from './components/Step7UploadKit';
import { GenreSelectionGrid } from './components/GenreSelectionGrid';
import { LiveTelemetryMonitor } from './components/LiveTelemetryMonitor';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { SnapshotModal } from './components/SnapshotModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { downloadTextFile, formatDuration } from './utils/helpers';
import { I18N, DEFAULT_PROVIDERS, GENRE_PRESETS } from './utils/constants';
import { saveProviderKeys, loadProviderKeys } from './utils/secureStore';

const DEFAULT_CONCEPT: Concept = {
  genre: 'Lo-fi',
  genreCustom: '',
  mood: '몽환적인, 차분한 새벽 감성',
  moodCustom: '',
  scene: '비 오는 새벽 서울 골목길과 창문',
  sceneCustom: '',
  timeOfDay: '',
  season: '',
  targetAudience: '',
  vocalType: '연주곡 (보컬 없음)',
  lyricsLang: '한국어 (Korean)',
  trackCount: 10,
  avgDurationMin: 3,
  freeKeywords: 'lofi hip hop, chill beats, cozy rain, study music, late night insomnia',
};

const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  fontFamily: 'Pretendard',
  mainFontSize: 72,
  textColor: '#ffffff',
  shadowColor: 'rgba(0, 0, 0, 0.85)',
  shadowBlur: 16,
  position: 'bottom-left',
  showBadge: true,
  fallbackGradient: 'linear-gradient(135deg, #090a14 0%, #151a2e 50%, #202b48 100%)',
  selectedImageIndex: 0,
  includePlaylistBg: true,
};

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-2.5-flash',
  customApiKey: '',
  temperature: 0.7,
  language: 'ko',
  autoCopyPrompts: true,
  showMonitor: true,
  providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
};

// 현재 컨셉의 장르 슬롯 키(lofi·pop·…·custom). 스냅샷을 장르별 1칸으로 관리한다.
function genreIdOfConcept(c: { genre?: string; genreCustom?: string }): string {
  if (c.genreCustom && c.genreCustom.trim()) return 'custom';
  const p = GENRE_PRESETS.find((g) => g.nameKo === c.genre || g.nameEn === c.genre);
  return p ? p.id : 'custom';
}

const STORAGE_KEY = 'ai_playlist_creator_state_v3';
const SETTINGS_KEY = 'ai_playlist_creator_settings_v3';
const SNAPSHOTS_KEY = 'ai_playlist_snapshots_v3';

// 설정 저장 — API 키는 평문 localStorage 에 남기지 않는다.
// 일반 설정만 SETTINGS_KEY 에 두고, 키는 secureStore(AES-GCM, 추출불가 기기키)로 분리 저장한다.
function persistSettings(next: AppSettings) {
  try {
    const sanitized = {
      ...next,
      providers: (next.providers || []).map((p) => ({ ...p, apiKey: '' })),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
    void saveProviderKeys(next.providers || []);
  } catch (e) {
    console.error('Failed to persist settings:', e);
  }
}

export default function App() {
  // Global Language & Modals
  const [language, setLanguage] = useState<AppLanguage>('ko');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Global Step State (0 = Genre Selection Grid, 1 = Concept Tuning, 2..7)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step Data States
  const [concept, setConcept] = useState<Concept>(DEFAULT_CONCEPT);
  const [titleSeo, setTitleSeo] = useState<TitleSeoData | undefined>(undefined);
  const [favoriteTitle, setFavoriteTitle] = useState<string>('');
  const [tracks, setTracks] = useState<TrackItem[] | undefined>(undefined);
  const [sunoData, setSunoData] = useState<SunoData | undefined>(undefined);
  const [lyricsMap, setLyricsMap] = useState<{ [trackIndex: number]: LyricsData }>({});
  const [activeLyricsTrackIndex, setActiveLyricsTrackIndex] = useState<number>(0);
  const [thumbnailPromptData, setThumbnailPromptData] = useState<ThumbnailPromptData | undefined>(undefined);
  const [thumbnailImages, setThumbnailImages] = useState<string[]>([]);
  const [thumbnailConfig, setThumbnailConfig] = useState<ThumbnailConfig>(DEFAULT_THUMBNAIL_CONFIG);
  const [uploadKit, setUploadKit] = useState<UploadKitData | undefined>(undefined);

  // 🛡️ Snapshot List State (Max 3 slots)
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);

  // Telemetry Monitor State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    totalInTokens: 389,
    totalOutTokens: 231,
    totalRequests: 1,
    successfulRequests: 1,
    totalCostUsd: 0.000197,
    logs: [
      {
        id: 'init-1',
        timestamp: new Date().toLocaleTimeString(),
        endpoint: '/api/playlist/ready',
        model: 'gemini-2.5-flash',
        latencyMs: 1240,
        inTokens: 389,
        outTokens: 231,
        costUsd: 0.000197,
        status: 'success',
      },
    ],
  });

  // Loading and Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto Generate All Flow State
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  const [autoGenStatusText, setAutoGenStatusText] = useState<string>('');

  // Toast Notifications State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // Helper to record Telemetry
  const recordTelemetry = (telemetryData: any, endpoint: string, success: boolean = true) => {
    const inTokens = telemetryData?.inTokens || 350;
    const outTokens = telemetryData?.outTokens || 280;
    const latencyMs = telemetryData?.latencyMs || 1500;
    const model = telemetryData?.model || settings.model;
    const costUsd = telemetryData?.costUsd || ((inTokens * 0.00000015) + (outTokens * 0.0000006));

    setTelemetry((prev) => ({
      totalInTokens: prev.totalInTokens + inTokens,
      totalOutTokens: prev.totalOutTokens + outTokens,
      totalRequests: prev.totalRequests + 1,
      successfulRequests: prev.successfulRequests + (success ? 1 : 0),
      totalCostUsd: prev.totalCostUsd + costUsd,
      logs: [
        ...prev.logs,
        {
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toLocaleTimeString(),
          endpoint,
          model,
          latencyMs,
          inTokens,
          outTokens,
          costUsd,
          status: success ? 'success' : 'error',
        },
      ],
    }));
  };

  const loadSnapshots = async () => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSnapshots(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse local snapshots:', e);
    }
  };

  // 🛡️ Snapshot: Save Snapshot Handler
  const handleSaveSnapshot = async (tag?: string, description?: string) => {
    const currentState: ProjectState = {
      concept,
      titleSeo,
      favoriteTitle,
      tracks,
      sunoData,
      lyricsMap,
      thumbnailPromptData,
      thumbnailImages,
      thumbnailConfig,
      uploadKit,
      completedSteps,
      currentStep,
    };

    const now = new Date();
    const timeFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const genreId = genreIdOfConcept(concept);
    const newSnapshot: SnapshotItem = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      genreId,
      timestamp: Date.now(),
      timeFormatted,
      tag: tag || (language === 'ko' ? `Step ${currentStep} 작업 상태` : `Step ${currentStep} state`),
      description,
      step: currentStep,
      state: currentState,
      settings,
    };

    // 장르별 1칸: 같은 장르 슬롯을 덮어쓰고, 12칸(장르 11 + 커스텀 1)으로 제한.
    const updatedLocal = [newSnapshot, ...snapshots.filter((s) => (s.genreId || 'custom') !== genreId)].slice(0, 12);
    setSnapshots(updatedLocal);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updatedLocal));

    showToast(
      language === 'ko'
        ? `💾 스냅샷이 안전하게 저장되었습니다! (${newSnapshot.tag})`
        : `💾 Snapshot saved! (${newSnapshot.tag})`,
      'success'
    );
  };

  // 🛡️ Quick 1-Click Save Snapshot
  const handleQuickSaveSnapshot = async () => {
    const stepLabel = currentStep === 0 ? '장르 그리드' : `Step ${currentStep}`;
    const genre = concept.genre || '로파이';
    const tag = language === 'ko' ? `${stepLabel} [${genre}] 저장점` : `${stepLabel} [${genre}] checkpoint`;
    await handleSaveSnapshot(tag);
  };

  // 🛡️ Snapshot: Restore Handler
  const handleRestoreSnapshot = (snapshot: SnapshotItem) => {
    if (!snapshot || !snapshot.state) {
      showToast('스냅샷 데이터를 읽을 수 없습니다.', 'error');
      return;
    }

    const state = snapshot.state;
    if (state.concept) setConcept(state.concept);
    if (state.titleSeo) setTitleSeo(state.titleSeo);
    if (state.favoriteTitle !== undefined) setFavoriteTitle(state.favoriteTitle);
    if (state.tracks) setTracks(state.tracks);
    if (state.sunoData) setSunoData(state.sunoData);
    if (state.lyricsMap) setLyricsMap(state.lyricsMap);
    if (state.thumbnailPromptData) setThumbnailPromptData(state.thumbnailPromptData);
    if (state.thumbnailImages) setThumbnailImages(state.thumbnailImages);
    if (state.thumbnailConfig) setThumbnailConfig({ includePlaylistBg: true, ...state.thumbnailConfig });
    if (state.uploadKit) setUploadKit(state.uploadKit);
    if (state.completedSteps) setCompletedSteps(state.completedSteps);
    if (state.currentStep !== undefined) setCurrentStep(state.currentStep);

    if (snapshot.settings) {
      setSettings(snapshot.settings);
    }

    showToast(
      language === 'ko'
        ? `↩ "${snapshot.tag}" (${snapshot.timeFormatted}) 시점으로 롤백되었습니다.`
        : `↩ Rolled back to "${snapshot.tag}" (${snapshot.timeFormatted}).`,
      'success'
    );
  };

  // 🛡️ Snapshot: Delete Handler
  const handleDeleteSnapshot = async (id: string) => {
    let updated: SnapshotItem[] = [];
    if (id === 'all') {
      updated = [];
    } else {
      updated = snapshots.filter((s) => s.id !== id);
    }
    setSnapshots(updated);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));

    showToast(language === 'ko' ? '스냅샷이 삭제되었습니다.' : 'Snapshot deleted.', 'info');
  };

  // Load from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProjectState;
        if (parsed.concept) setConcept(parsed.concept);
        if (parsed.titleSeo) setTitleSeo(parsed.titleSeo);
        if (parsed.favoriteTitle) setFavoriteTitle(parsed.favoriteTitle);
        if (parsed.tracks) setTracks(parsed.tracks);
        if (parsed.sunoData) setSunoData(parsed.sunoData);
        if (parsed.lyricsMap) setLyricsMap(parsed.lyricsMap);
        if (parsed.thumbnailPromptData) setThumbnailPromptData(parsed.thumbnailPromptData);
        if (parsed.thumbnailImages) setThumbnailImages(parsed.thumbnailImages);
        if (parsed.thumbnailConfig) setThumbnailConfig({ includePlaylistBg: true, ...parsed.thumbnailConfig });
        if (parsed.uploadKit) setUploadKit(parsed.uploadKit);
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps);
      }

      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // 기존 저장분에 providers 없으면 기본 체인 병합
        if (!parsedSettings.providers || !parsedSettings.providers.length) {
          parsedSettings.providers = DEFAULT_PROVIDERS.map((p) => ({ ...p }));
        }
        setSettings(parsedSettings);
        if (parsedSettings.language) setLanguage(parsedSettings.language);
      }

      // 암호화 보관된 사용자 API 키 복호화 후 병합 (이 브라우저에서만 열린다)
      void (async () => {
        const keys = await loadProviderKeys();
        if (keys && Object.keys(keys).length) {
          setSettings((prev) => ({
            ...prev,
            providers: (prev.providers || []).map((p) =>
              keys[p.id] ? { ...p, apiKey: keys[p.id] } : p
            ),
          }));
        }
      })();

      loadSnapshots();
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }
  }, []);

  // Save to local storage on state change
  useEffect(() => {
    try {
      const stateToSave: ProjectState = {
        concept,
        titleSeo,
        favoriteTitle,
        tracks,
        sunoData,
        lyricsMap,
        thumbnailPromptData,
        thumbnailImages,
        thumbnailConfig,
        uploadKit,
        currentStep,
        completedSteps,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [
    concept,
    titleSeo,
    favoriteTitle,
    tracks,
    sunoData,
    lyricsMap,
    thumbnailPromptData,
    thumbnailImages,
    thumbnailConfig,
    uploadKit,
    currentStep,
    completedSteps,
  ]);

  const markStepCompleted = (stepNum: number) => {
    setCompletedSteps((prev) => (prev.includes(stepNum) ? prev : [...prev, stepNum]));
  };

  // Selecting a Genre from the Grid
  const handleSelectGenrePreset = (preset: GenrePreset, autoStart: boolean = false) => {
    setConcept((prev) => ({
      ...prev,
      genre: preset.nameKo,
      genreCustom: '',
      mood: preset.defaultMood,
      scene: preset.defaultScene,
      freeKeywords: preset.defaultKeywords,
      vocalType: preset.defaultVocal,
      timeOfDay: '',
      season: '',
      targetAudience: '',
    }));
    markStepCompleted(1);
    setCurrentStep(1);

    if (autoStart) {
      setTimeout(() => {
        handleAutoGenerateAll();
      }, 200);
    }
  };

  // 1. API: Generate Titles & SEO (Step 2)
  const handleGenerateTitlesSeo = async (customConcept?: Concept) => {
    const targetConcept = customConcept || concept;
    setIsLoading(true);
    setLoadingStep(2);
    setError(null);

    try {
      const res = await fetch('/api/playlist/titles-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: targetConcept, providers: settings.providers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/titles-seo', true);

      const titleSeoData: TitleSeoData = {
        videoTitles: data.videoTitles,
        channelNames: data.channelNames,
        hookTitle: data.hookTitle,
        description: data.description,
        hashtags: data.hashtags,
        seoKeywords: data.seoKeywords,
        thumbnailCopy: data.thumbnailCopy,
      };

      setTitleSeo(titleSeoData);
      if (!favoriteTitle) {
        setFavoriteTitle(titleSeoData.hookTitle || titleSeoData.videoTitles[0] || '');
      }
      markStepCompleted(2);
      showToast(language === 'ko' ? '이모지 제목 8종과 SEO 키워드가 생성되었습니다!' : '8 Titles & SEO generated!', 'success');
      return titleSeoData;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/titles-seo', false);
      setError(err.message || '제목 생성에 실패했습니다.');
      showToast(err.message || '제목 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 2. API: Generate Tracklist (Step 3)
  const handleGenerateTracklist = async (customConcept?: Concept, customTitle?: string) => {
    const targetConcept = customConcept || concept;
    const targetTitle = customTitle || favoriteTitle || titleSeo?.hookTitle || (titleSeo?.videoTitles && titleSeo.videoTitles[0]) || '';

    setIsLoading(true);
    setLoadingStep(3);
    setError(null);

    try {
      const res = await fetch('/api/playlist/tracklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: targetConcept, selectedTitle: targetTitle, providers: settings.providers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/tracklist', true);

      const trackList: TrackItem[] = data.tracks;
      setTracks(trackList);
      markStepCompleted(3);
      showToast(
        language === 'ko'
          ? `${trackList.length}곡의 감정 곡선 트랙리스트가 완성되었습니다!`
          : `${trackList.length} Tracks Arc generated!`,
        'success'
      );
      return trackList;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/tracklist', false);
      setError(err.message || '트랙리스트 생성 실패');
      showToast(err.message || '트랙리스트 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 3. API: Generate Suno Prompts (Step 4)
  const handleGenerateSuno = async (customConcept?: Concept, customTracks?: TrackItem[]) => {
    const targetConcept = customConcept || concept;
    const targetTracks = customTracks || tracks;

    setIsLoading(true);
    setLoadingStep(4);
    setError(null);

    try {
      const res = await fetch('/api/playlist/suno-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: targetConcept, tracks: targetTracks, providers: settings.providers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/suno-prompt', true);

      const sunoResult: SunoData = {
        styleOfMusic: data.styleOfMusic,
        excludeStyles: data.excludeStyles,
        personaHint: data.personaHint,
        advancedTips: data.advancedTips,
      };

      setSunoData(sunoResult);
      markStepCompleted(4);
      showToast(
        language === 'ko'
          ? 'Suno AI v3/v4/v5 최적화 프롬프트 팩이 완성되었습니다!'
          : 'Suno AI Prompt Pack ready!',
        'success'
      );
      return sunoResult;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/suno-prompt', false);
      setError(err.message || 'Suno 프롬프트 생성 실패');
      showToast(err.message || 'Suno 프롬프트 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 4. API: Generate Lyrics (Step 5)
  const handleGenerateLyrics = async (
    trackIndex: number,
    customTrack?: TrackItem,
    customSections?: string[]
  ) => {
    const targetTrack = customTrack || (tracks && tracks[trackIndex]);
    if (!targetTrack) {
      showToast('해당 트랙을 찾을 수 없습니다.', 'error');
      return;
    }

    setIsLoading(true);
    setLoadingStep(5);
    setError(null);

    try {
      const res = await fetch('/api/playlist/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: settings.providers,
          track: targetTrack,
          concept,
          selectedSections: customSections,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/lyrics', true);

      const lyricsResult: LyricsData = {
        trackIndex,
        trackTitle: `${targetTrack.titleKo} (${targetTrack.titleEn})`,
        selectedSections: customSections || ['Intro', 'Verse 1', 'Chorus', 'Bridge', 'Outro'],
        sections: data.sections || {},
        fullText: data.fullText || '',
        englishTranslation: data.englishTranslation,
      };

      setLyricsMap((prev) => ({ ...prev, [trackIndex]: lyricsResult }));
      setActiveLyricsTrackIndex(trackIndex);
      markStepCompleted(5);
      showToast(
        language === 'ko'
          ? `[트랙 ${trackIndex + 1}] "${targetTrack.titleKo}" 가사가 생성되었습니다!`
          : `Lyrics generated for Track ${trackIndex + 1}!`,
        'success'
      );
      return lyricsResult;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/lyrics', false);
      setError(err.message || '가사 생성 실패');
      showToast(err.message || '가사 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 5. API: Generate Thumbnail Prompt & Palette (Step 6)
  const handleGenerateThumbnail = async (customConcept?: Concept, customTitle?: string) => {
    const targetConcept = customConcept || concept;
    const targetTitle = customTitle || favoriteTitle || titleSeo?.hookTitle || (titleSeo?.videoTitles && titleSeo.videoTitles[0]) || '';

    setIsLoading(true);
    setLoadingStep(6);
    setError(null);

    try {
      const res = await fetch('/api/playlist/thumbnail-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: settings.providers,
          concept: targetConcept,
          selectedTitle: targetTitle,
          thumbnailCopy: titleSeo?.thumbnailCopy,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/thumbnail-prompt', true);

        const rawPromptData: ThumbnailPromptData = data.promptData;
    const PLAYLIST_CLAUSE = 'In the background, the word "PLAYLIST" is rendered in massive, bold futuristic typography, partially obscured by the subject\'s head and shoulders to create a cinematic depth-of-field effect.';
    // 서버 워크플로우 게이트(정본 playlist_line)를 통과한 프롬프트는 클라이언트에서 중복 주입하지 않는다.
    const serverEnforcedPlaylist = data._workflow?.passed === true || /\bPLAYLIST\b/.test(rawPromptData.prompt);
    const promptData: ThumbnailPromptData = (!serverEnforcedPlaylist && (thumbnailConfig.includePlaylistBg ?? true))
      ? { ...rawPromptData, prompt: /No other text/i.test(rawPromptData.prompt)
          ? rawPromptData.prompt.replace(/(\. ?No other text)/i, `. ${PLAYLIST_CLAUSE} No other text`)
          : rawPromptData.prompt + ` ${PLAYLIST_CLAUSE} No other text, subtitles, or symbols.` }
      : rawPromptData;
      setThumbnailPromptData(promptData);
      if (data.images && data.images.length > 0) {
        setThumbnailImages(data.images);
      }
      markStepCompleted(6);
      showToast(
        language === 'ko'
          ? '1280×720 썸네일 전용 프롬프트와 컬러 팔레트가 준비되었습니다!'
          : '1280x720 Thumbnail prompt & palette ready!',
        'success'
      );
      return promptData;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/thumbnail-prompt', false);
      setError(err.message || '썸네일 프롬프트 생성 실패');
      showToast(err.message || '썸네일 프롬프트 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 6. API: Generate Upload Kit Extras (Step 7)
  const handleGenerateUploadKitExtras = async (
    customConcept?: Concept,
    customTitle?: string,
    customTracks?: TrackItem[]
  ) => {
    const targetConcept = customConcept || concept;
    const targetTitle = customTitle || favoriteTitle || titleSeo?.hookTitle || (titleSeo?.videoTitles && titleSeo.videoTitles[0]) || '';
    const targetTracks = customTracks || tracks;

    setIsLoading(true);
    setLoadingStep(7);
    setError(null);

    try {
      const res = await fetch('/api/playlist/upload-kit-extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: settings.providers,
          concept: targetConcept,
          selectedTitle: targetTitle,
          tracks: targetTracks,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      recordTelemetry(data._telemetry, '/api/playlist/upload-kit-extras', true);

      // Build timeline string
      let timelineStr = '';
      if (targetTracks && targetTracks.length > 0) {
        let currentSeconds = 0;
        timelineStr = targetTracks
          .map((t) => {
            const timeCode = formatDuration(currentSeconds);
            currentSeconds += t.durationSec || 180;
            return `${timeCode} ${t.titleKo} (${t.titleEn})`;
          })
          .join('\n');
      }

      // Build full description
      const fullDesc = `🎧 ${targetTitle}

${titleSeo?.description || '오늘 하루 지친 당신에게 전하는 감성 플레이리스트입니다.'}

[ ⏳ Tracklist & Timeline ]
${timelineStr}

${data.ctaLine || '🌙 오늘 밤이 조금이라도 편안하셨다면, 구독과 좋아요로 다음 음악을 함께해주세요.'}

[ 🏷️ Tags & Keywords ]
${titleSeo?.hashtags?.join(' ') || '#로파이 #플레이리스트 #새벽감성'}

${data.aiNotice || '⚠️ 이 영상의 모든 음원과 가사는 Suno AI를 활용하여 작곡/작사된 오리지널 창작곡입니다.'}`;

      const uploadKitData: UploadKitData = {
        timeline: timelineStr,
        fullDescription: fullDesc,
        pinnedComment: data.pinnedComment,
        tags: data.tags,
        ctaLine: data.ctaLine,
        aiNotice: data.aiNotice,
      };

      setUploadKit(uploadKitData);
      markStepCompleted(7);
      showToast(
        language === 'ko'
          ? '유튜브 업로드용 타임라인 & 설명란 패키징이 완성되었습니다!'
          : 'YouTube Upload Kit package ready!',
        'success'
      );
      return uploadKitData;
    } catch (err: any) {
      console.error(err);
      recordTelemetry(null, '/api/playlist/upload-kit-extras', false);
      setError(err.message || '업로드킷 생성 실패');
      showToast(err.message || '업로드킷 생성 실패', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // 1-Click Auto Generate All Pipeline (With Safe Auto-Snapshot)
  const handleAutoGenerateAll = async () => {
    if (isAutoGenerating) return;

    // 🛡️ CRITICAL MANDATE: Automatically take a snapshot before starting large generation
    await handleSaveSnapshot('[자동 백업] 전체 자동 생성 시작 전');

    setIsAutoGenerating(true);
    setError(null);
    showToast(language === 'ko' ? '전체 7단계 자동 생성을 시작합니다...' : 'Starting 7-Step Auto Generation...', 'info');

    try {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Step 2: Titles & SEO
      setAutoGenStatusText(language === 'ko' ? '1/5 제목 & SEO 생성 중...' : '1/5 Titles & SEO...');
      const seoData = await handleGenerateTitlesSeo(concept);
      const chosenTitle = seoData.hookTitle || seoData.videoTitles[0] || '';
      setFavoriteTitle(chosenTitle);
      await wait(600);

      // Step 3: Tracklist
      setAutoGenStatusText(language === 'ko' ? '2/5 감정 곡선 트랙리스트 설계 중...' : '2/5 Tracklist Arc...');
      const generatedTracks = await handleGenerateTracklist(concept, chosenTitle);
      await wait(600);

      // Step 4: Suno Prompts
      setAutoGenStatusText(language === 'ko' ? '3/5 Suno AI 프롬프트 팩 최적화 중...' : '3/5 Suno Prompts...');
      await handleGenerateSuno(concept, generatedTracks);
      await wait(600);

      // Step 5: Lyrics for Track 1
      setAutoGenStatusText(language === 'ko' ? '4/5 1번 트랙 감성 가사 생성 중...' : '4/5 Track 1 Lyrics...');
      if (generatedTracks && generatedTracks.length > 0) {
        await handleGenerateLyrics(0, generatedTracks[0]);
        await wait(600);
      }

      // Step 6 & 7: Thumbnail & Upload Kit Extras
      setAutoGenStatusText(language === 'ko' ? '5/5 썸네일 & 업로드킷 패키징 중...' : '5/5 Thumbnail & Kit...');
      await handleGenerateThumbnail(concept, chosenTitle);
      await wait(600);
      await handleGenerateUploadKitExtras(concept, chosenTitle, generatedTracks);

      // 🛡️ Save completion snapshot
      await handleSaveSnapshot('[완성] 7단계 자동 생성 완료');

      // All done!
      setCurrentStep(7);
      showToast(
        language === 'ko'
          ? '🎉 모든 7단계 AI 플레이리스트 패키지가 완성되었습니다!'
          : '🎉 7-Step Playlist Kit completed!',
        'success'
      );
    } catch (err: any) {
      console.error('Auto generate all failed:', err);
      showToast(
        language === 'ko'
          ? `자동 생성 중단: ${err.message || '오류 발생'}`
          : `Auto generate interrupted: ${err.message}`,
        'error'
      );
    } finally {
      setIsAutoGenerating(false);
      setAutoGenStatusText('');
    }
  };

  // Export All Text Package (.txt)
  const handleExportAllTxt = () => {
    const title = favoriteTitle || titleSeo?.hookTitle || '새벽 감성 플레이리스트';

    let content = `===============================================================
[ AI PLAYLIST CREATOR - 전체 완성 패키지 ]
영상 제목: ${title}
생성 일시: ${new Date().toLocaleString()}
===============================================================

1. [ 컨셉 정보 ]
- 장르: ${concept.genre} ${concept.genreCustom ? `(${concept.genreCustom})` : ''}
- 무드: ${concept.mood} ${concept.moodCustom ? `(${concept.moodCustom})` : ''}
- 공간/상황: ${concept.scene} ${concept.sceneCustom ? `(${concept.sceneCustom})` : ''}
- 시간/계절: ${concept.timeOfDay || '자유 선택'} / ${concept.season || '무관'}
- 타겟 리스너: ${concept.targetAudience}
- 보컬 구성: ${concept.vocalType}
- 총 수록곡: ${tracks ? tracks.length : 10}곡 (곡당 약 ${concept.avgDurationMin}분)

2. [ 추천 제목 8종 & SEO ]
${titleSeo?.videoTitles?.map((t, i) => `${i + 1}. ${t}`).join('\n') || '미생성'}

* 채널명 후보: ${titleSeo?.channelNames?.join(', ') || '미생성'}
* 썸네일 카피 메인: ${titleSeo?.thumbnailCopy?.main || '미생성'} / 서브: ${titleSeo?.thumbnailCopy?.sub || ''} / 뱃지: ${titleSeo?.thumbnailCopy?.badge || ''}

3. [ 수록곡 트랙리스트 & 감정 곡선 ]
${
  tracks
    ?.map(
      (t) =>
        `#${t.index} [${formatDuration(t.durationSec)}] ${t.titleKo} (${t.titleEn}) - BPM: ${t.bpm}, Key: ${t.key}\n  Suno Prompt: ${t.sunoPrompt}`
    )
    .join('\n\n') || '미생성'
}

4. [ Suno AI 전용 프롬프트 팩 ]
- Style of Music (180자 태그):
${sunoData?.styleOfMusic || '미생성'}

- Exclude Styles (부정 태그):
${sunoData?.excludeStyles || '미생성'}

- Persona Hint:
${sunoData?.personaHint || '미생성'}

5. [ 대표 수록곡 가사 (Track 1) ]
${lyricsMap[0]?.fullText || '미생성'}

6. [ 1280x720 썸네일 AI 이미지 프롬프트 ]
${thumbnailPromptData?.prompt || '미생성'}
- Palette: ${thumbnailPromptData?.palette?.join(', ') || '미생성'}

7. [ 유튜브 업로드용 완성 설명란 & 타임라인 ]
${uploadKit?.fullDescription || '미생성'}

8. [ 고정 댓글 ]
${uploadKit?.pinnedComment || '미생성'}

9. [ 20개 검색 태그 ]
${uploadKit?.tags?.join(', ') || '미생성'}
`;

    downloadTextFile(`playlist_package_${Date.now()}.txt`, content);
    showToast('전체 완성 패키지 .txt 파일이 다운로드되었습니다.', 'success');
  };

  const currentProjectState: ProjectState = {
    concept,
    titleSeo,
    favoriteTitle,
    tracks,
    sunoData,
    lyricsMap,
    thumbnailPromptData,
    thumbnailImages,
    thumbnailConfig,
    uploadKit,
    currentStep,
    completedSteps,
  };

  const handleLoadProject = (state: ProjectState) => {
    if (state.concept) setConcept(state.concept);
    if (state.titleSeo) setTitleSeo(state.titleSeo);
    if (state.favoriteTitle) setFavoriteTitle(state.favoriteTitle);
    if (state.tracks) setTracks(state.tracks);
    if (state.sunoData) setSunoData(state.sunoData);
    if (state.lyricsMap) setLyricsMap(state.lyricsMap);
    if (state.thumbnailPromptData) setThumbnailPromptData(state.thumbnailPromptData);
    if (state.thumbnailImages) setThumbnailImages(state.thumbnailImages);
    if (state.thumbnailConfig) setThumbnailConfig(state.thumbnailConfig);
    if (state.uploadKit) setUploadKit(state.uploadKit);
    if (state.completedSteps) setCompletedSteps(state.completedSteps);
    showToast('프로젝트를 성공적으로 불러왔습니다.', 'success');
  };

  const hasData = Boolean(titleSeo || tracks || sunoData);

  return (
    <ErrorBoundary
      snapshots={snapshots}
      onRestoreSnapshot={handleRestoreSnapshot}
    >
      <div className="min-h-screen flex flex-col bg-[#fffbf2] text-[#111111] font-['Inter','Pretendard',sans-serif] selection:bg-[#111111] selection:text-[#fffbf2] antialiased">
        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={closeToast}
        />

        {/* Global Header with 💾 Save & ↩ Restore Snapshot */}
        <Header
          language={language}
          onChangeLanguage={(newLang) => {
            setLanguage(newLang);
            setSettings((prev) => {
              const next = { ...prev, language: newLang };
              persistSettings(next);
              return next;
            });
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
          onQuickSaveSnapshot={handleQuickSaveSnapshot}
          snapshotCount={snapshots.length}
          onAutoGenerateAll={() => {
            // 매번 랜덤 장르로 시작 (커스텀 제외 11개 중 무작위)
            const pool = GENRE_PRESETS.filter((g) => g.id !== 'custom');
            const pick = pool[Math.floor(Math.random() * pool.length)];
            handleSelectGenrePreset(pick, true);
          }}
          isAutoGenerating={isAutoGenerating}
          autoGenStatusText={autoGenStatusText}
          onExportAllTxt={handleExportAllTxt}
          hasData={hasData}
          currentStep={currentStep}
          onGoToGenreGrid={() => setCurrentStep(0)}
        />

        {/* Main Body */}
        {currentStep === 0 ? (
          /* Step 0: Benchmark Genre Selection Grid */
          <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-300">
            <GenreSelectionGrid
              language={language}
              onSelectGenre={(preset) => handleSelectGenrePreset(preset, false)}
              onQuickStart={(preset) => handleSelectGenrePreset(preset, true)}
            />
          </main>
        ) : (
          /* Steps 1 to 7: Detailed Production Workflow */
          <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto">
            {/* Step Navigation Sidebar */}
            <StepNav
              currentStep={currentStep}
              completedSteps={completedSteps}
              onSelectStep={(step) => setCurrentStep(step)}
              language={language}
              onBackToGenre={() => setCurrentStep(0)}
            />

            {/* Active Step Panel */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-5xl">
              {/* Step 1: Concept */}
              {currentStep === 1 && (
                <Step1Concept
                  concept={concept}
                  onChange={setConcept}
                  onNext={() => {
                    markStepCompleted(1);
                    setCurrentStep(2);
                  }}
                  isLoading={isLoading && loadingStep === 1}
                />
              )}

              {/* Step 2: Titles & SEO */}
              {currentStep === 2 && (
                <Step2TitlesSeo
                  data={titleSeo}
                  favoriteTitle={favoriteTitle}
                  onSelectFavorite={setFavoriteTitle}
                  onGenerate={() => handleGenerateTitlesSeo()}
                  onNext={() => {
                    markStepCompleted(2);
                    setCurrentStep(3);
                  }}
                  isLoading={isLoading && loadingStep === 2}
                  error={error}
                  onShowToast={showToast}
                />
              )}

              {/* Step 3: Tracklist */}
              {currentStep === 3 && (
                <Step3Tracklist
                  tracks={tracks}
                  onUpdateTracks={setTracks}
                  onGenerate={() => handleGenerateTracklist()}
                  onNext={() => {
                    markStepCompleted(3);
                    setCurrentStep(4);
                  }}
                  isLoading={isLoading && loadingStep === 3}
                  error={error}
                  selectedTitle={favoriteTitle}
                  onShowToast={showToast}
                />
              )}

              {/* Step 4: Suno Prompts */}
              {currentStep === 4 && (
                <Step4Suno
                  sunoData={sunoData}
                  tracks={tracks}
                  onGenerate={() => handleGenerateSuno()}
                  onNext={() => {
                    markStepCompleted(4);
                    setCurrentStep(5);
                  }}
                  isLoading={isLoading && loadingStep === 4}
                  error={error}
                  onShowToast={showToast}
                />
              )}

              {/* Step 5: Structured Lyrics */}
              {currentStep === 5 && (
                <Step5Lyrics
                  tracks={tracks}
                  lyricsMap={lyricsMap}
                  activeTrackIndex={activeLyricsTrackIndex}
                  onSelectTrack={setActiveLyricsTrackIndex}
                  onGenerateLyrics={(trackIndex, selectedSections) =>
                    handleGenerateLyrics(trackIndex, undefined, selectedSections)
                  }
                  onNext={() => {
                    markStepCompleted(5);
                    setCurrentStep(6);
                  }}
                  isLoading={isLoading && loadingStep === 5}
                  error={error}
                  onShowToast={showToast}
                />
              )}

              {/* Step 6: 1280x720 Thumbnail Canvas */}
              {currentStep === 6 && (
                <Step6Thumbnail
                  concept={concept}
                  hookTitle={favoriteTitle || titleSeo?.hookTitle}
                  thumbnailCopy={titleSeo?.thumbnailCopy}
                  promptData={thumbnailPromptData}
                  images={thumbnailImages}
                  config={thumbnailConfig}
                  onUpdateConfig={setThumbnailConfig}
                  onGeneratePromptAndImage={() => handleGenerateThumbnail()}
                  onNext={() => {
                    markStepCompleted(6);
                    setCurrentStep(7);
                  }}
                  isLoading={isLoading && loadingStep === 6}
                  error={error}
                  onShowToast={showToast}
                />
              )}

              {/* Step 7: YouTube Upload Kit */}
              {currentStep === 7 && (
                <Step7UploadKit
                  concept={concept}
                  titleSeo={titleSeo}
                  favoriteTitle={favoriteTitle}
                  tracks={tracks}
                  uploadKit={uploadKit}
                  projectState={currentProjectState}
                  onLoadProject={handleLoadProject}
                  onGenerateExtras={() => handleGenerateUploadKitExtras()}
                  isLoading={isLoading && loadingStep === 7}
                  onShowToast={showToast}
                />
              )}
            </main>
          </div>
        )}

        {/* Global Snapshot & Rollback Modal */}
        <SnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
          snapshots={snapshots}
          onSaveSnapshot={handleSaveSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          language={language}
          currentStep={currentStep}
        />

        {/* Global Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onChangeSettings={(updated) => {
            setSettings(updated);
            persistSettings(updated);
          }}
          language={language}
        />

        {/* Global Help Modal */}
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          language={language}
        />

        {/* Live Telemetry Monitor Widget */}
        {settings.showMonitor && (
          <LiveTelemetryMonitor
            telemetry={telemetry}
            isOpen={true}
            onClose={() =>
              setSettings((prev) => {
                const updated = { ...prev, showMonitor: false };
                persistSettings(updated);
                return updated;
              })
            }
            language={language}
            onClearLogs={() => {
              setTelemetry({
                totalInTokens: 0,
                totalOutTokens: 0,
                totalRequests: 0,
                successfulRequests: 0,
                totalCostUsd: 0,
                logs: [],
              });
              showToast('모니터 로그가 초기화되었습니다.', 'info');
            }}
          />
        )}

        {/* Global Footer */}
        <Footer language={language} />
      </div>
    </ErrorBoundary>
  );
}
