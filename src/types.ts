export type AppLanguage = 'ko' | 'en';

export interface TelemetryLog {
  id: string;
  timestamp: string;
  endpoint: string;
  model: string;
  latencyMs: number;
  inTokens: number;
  outTokens: number;
  costUsd: number;
  status: 'success' | 'error';
}

export interface TelemetryState {
  totalInTokens: number;
  totalOutTokens: number;
  totalRequests: number;
  successfulRequests: number;
  totalCostUsd: number;
  logs: TelemetryLog[];
}

export interface ProviderConfig {
  id: string;          // 'gemini-free' | 'openrouter-a' | ...
  label: string;       // UI 표시명
  apiKey: string;      // 사용자 입력 키 (빈 값이면 비활성 취급)
  baseUrl: string;     // OpenAI 호환 엔드포인트 ('' 이면 네이티브 Gemini)
  model: string;       // 모델명 (-latest 별칭 권장)
  kind: 'gemini' | 'openai';  // 호출 방식
  isPaid: boolean;     // 유료 여부
  enabled: boolean;    // 사용 여부 (유료는 기본 false)
}

export interface AppSettings {
  model: string;
  customApiKey: string;
  temperature: number;
  language: AppLanguage;
  autoCopyPrompts: boolean;
  showMonitor: boolean;
  providers: ProviderConfig[];  // 다중 프로바이더 폴백 체인
}

export interface GenrePreset {
  id: string;
  nameKo: string;
  nameEn: string;
  iconName: string;
  bgColor: string; // e.g. '#7C3AED'
  textColor?: string;
  defaultMood: string;
  defaultScene: string;
  defaultKeywords: string;
  defaultVocal: string;
}

export interface Concept {
  genre: string;
  genreCustom: string;
  mood: string;
  moodCustom: string;
  scene: string;
  sceneCustom: string;
  timeOfDay: string;
  season: string;
  targetAudience: string;
  vocalType: string;
  lyricsLang: string;
  trackCount: number; // 8~20, default 10
  avgDurationMin: number; // 2~5, default 3
  freeKeywords: string;
}

export interface ThumbnailCopy {
  main: string;
  sub: string;
  badge: string;
}

export interface TitleSeoData {
  videoTitles: string[]; // 8 titles with emoji
  channelNames: string[]; // 5 channel names
  hookTitle: string;
  description: string;
  hashtags: string[]; // 12 items
  seoKeywords: string[]; // 15 items
  thumbnailCopy: ThumbnailCopy;
}

export interface TrackItem {
  index: number;
  titleKo: string;
  titleEn: string;
  moodTag: string;
  bpm: number;
  key: string;
  instruments: string[];
  durationSec: number;
  sunoPrompt: string;
}

export interface SunoData {
  styleOfMusic: string; // comma-separated, <=180 chars
  excludeStyles: string;
  personaHint: string;
  advancedTips: string[]; // 5 practical Korean tips
}

export interface LyricsData {
  trackIndex: number;
  trackTitle: string;
  selectedSections: string[];
  sections: { [sectionName: string]: string };
  fullText: string;
  englishTranslation?: string;
}

export interface ThumbnailPromptData {
  prompt: string;
  negativePrompt: string;
  palette: string[]; // 5 hex colors (#RRGGBB)
}

export interface ThumbnailConfig {
  fontFamily: string; // 'Pretendard' | 'Gowun Batang' | 'Noto Sans KR'
  mainFontSize: number;
  textColor: string;
  shadowColor: string;
  shadowBlur: number;
  position: 'bottom-left' | 'bottom-right' | 'center' | 'top-left';
  showBadge: boolean;
  selectedImageIndex: number;
  fallbackGradient: string;
  includePlaylistBg?: boolean;
  customMainText?: string;
  customSubText?: string;
  customBadgeText?: string;
}

export interface UploadKitData {
  timeline?: string;
  fullDescription?: string;
  pinnedComment: string;
  tags: string[];
  ctaLine: string;
  aiNotice?: string;
}

export interface ProjectState {
  concept: Concept;
  titleSeo?: TitleSeoData;
  favoriteTitle?: string;
  tracks?: TrackItem[];
  sunoData?: SunoData;
  lyricsMap: { [trackIndex: number]: LyricsData };
  activeLyricsTrackIndex?: number;
  thumbnailPromptData?: ThumbnailPromptData;
  thumbnailImages: string[];
  thumbnailConfig: ThumbnailConfig;
  uploadKit?: UploadKitData;
  completedSteps: number[];
  currentStep: number; // 0 = Genre Selection Grid, 1 = Concept Tuning, 2..7
}

// 🛡️ Snapshot & Rollback Data Models
export interface SnapshotItem {
  id: string;
  timestamp: number; // Date.now()
  timeFormatted: string; // "2026-08-19 15:56:12"
  tag: string; // e.g. "Step 3 트랙리스트 생성 완료", "[자동 백업] 전체 생성 전"
  description?: string;
  step: number;
  state: ProjectState;
  settings?: AppSettings;
}
