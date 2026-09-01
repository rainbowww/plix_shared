import React from 'react';
import { X, Settings, Cpu, Key, Globe, Copy, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';
import { AppSettings, AppLanguage } from '../types';

// API 키 발급 바로가기 (사용자 편의)
const API_KEY_LINKS: Record<string, string> = {
  'gemini-free':  'https://aistudio.google.com/apikey',
  'gemini-paid':  'https://aistudio.google.com/apikey',
  'openrouter-a': 'https://openrouter.ai/keys',
  'openrouter-b': 'https://openrouter.ai/keys',
  'groq-free':    'https://console.groq.com/keys',
  'claude-paid':  'https://console.anthropic.com/settings/keys',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChangeSettings: (updated: AppSettings) => void;
  language: AppLanguage;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  language,
}: SettingsModalProps) {
  const [snapshot, setSnapshot] = React.useState<AppSettings>(settings);
  React.useEffect(() => { if (isOpen) setSnapshot(settings); }, [isOpen]);
  const handleCancel = () => { onChangeSettings(snapshot); onClose(); };

  // 연결 테스트 상태 (공급자 id 별)
  const [testState, setTestState] = React.useState<
    Record<string, { status: 'idle' | 'running' | 'ok' | 'fail'; detail: string }>
  >({});

  const runConnectionTest = async (p: AppSettings['providers'][number]) => {
    if (!p.apiKey) {
      setTestState((s) => ({
        ...s,
        [p.id]: { status: 'fail', detail: language === 'ko' ? '키를 먼저 입력하세요.' : 'Enter a key first.' },
      }));
      return;
    }
    setTestState((s) => ({ ...s, [p.id]: { status: 'running', detail: '' } }));
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: p.apiKey, kind: p.kind, baseUrl: p.baseUrl, model: p.model }),
      });
      const data = await res.json().catch(() => ({}));
      setTestState((s) => ({
        ...s,
        [p.id]: {
          status: data.ok ? 'ok' : 'fail',
          detail: data.detail || (data.ok ? 'OK' : 'FAIL'),
        },
      }));
    } catch {
      setTestState((s) => ({
        ...s,
        [p.id]: { status: 'fail', detail: language === 'ko' ? '서버에 연결할 수 없습니다.' : 'Cannot reach server.' },
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white border-3 border-[#111111] shadow-[8px_8px_0_#111111] max-h-[90vh] overflow-y-auto p-6 text-[#111111] relative">
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
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-gaegu font-bold text-[#111111]">
              {language === 'ko' ? '시스템 설정' : 'System Settings'}
            </h2>
            <p className="text-xs text-[#555555] font-mono-neo font-bold">
              {language === 'ko'
                ? 'AI 엔진, 모델 및 생성 옵션을 커스텀합니다.'
                : 'Configure AI engine, model, and generation options.'}
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-4 text-sm font-mono-neo">
          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 font-extrabold text-[#111111] text-xs uppercase mb-1.5">
              <Cpu className="w-4 h-4 text-[#ff477e]" />
              <span>{language === 'ko' ? '기본 Gemini 모델' : 'Default Gemini Model'}</span>
            </label>
            <select
              value={settings.model}
              onChange={(e) => onChangeSettings({ ...settings, model: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffbf2] border-2 border-[#111111] text-[#111111] font-bold focus:outline-none focus:border-[#ff477e] text-xs shadow-[3px_3px_0_#111111] cursor-pointer"
            >
              <option value="gemini-3.6-flash">gemini-3.6-flash (권장 / 최고 속도 & 정확도)</option>
              <option value="gemini-3.7-flash">gemini-3.7-flash (최신 고지능 모델)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (오토 업데이트)</option>
            </select>
          </div>

          {/* Multi-Provider LLM Keys (free-first fallback) */}
          <div className="border-t-2 border-[#111111] pt-4">
            <label className="flex items-center gap-2 font-extrabold text-[#111111] text-xs uppercase mb-1">
              <Key className="w-4 h-4 text-[#00ffca]" />
              <span>{language === 'ko' ? 'LLM 프로바이더 키 (무료부터 자동 폴백)' : 'LLM Provider Keys (free-first fallback)'}</span>
            </label>
            <p className="text-xs text-[#555555] font-medium mb-2">
              {language === 'ko'
                ? '무료 티어를 먼저 소진하고, 유료(💳)는 체크한 것만 사용합니다. 키는 이 브라우저에 암호화 저장되며 서버에 보관되지 않습니다. 입력 후 [테스트]로 연결을 확인하세요.'
                : 'Free tiers are used first; paid (💳) only when enabled. Keys are encrypted in this browser and never stored on the server. Use [Test] to verify.'}
            </p>
            <div className="space-y-2">
              {settings.providers.map((p, idx) => {
                const keyUrl = API_KEY_LINKS[p.id];
                return (
                <div key={p.id} className="p-2 rounded-lg bg-[#fffbf2] border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
                  <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => {
                      const np = settings.providers.map((x, i) => (i === idx ? { ...x, enabled: e.target.checked } : x));
                      onChangeSettings({ ...settings, providers: np });
                    }}
                    className="w-4 h-4 accent-[#ff477e] cursor-pointer shrink-0"
                    title={language === 'ko' ? '사용' : 'enable'}
                  />
                  <span className={`text-xs font-extrabold w-24 shrink-0 ${p.isPaid ? 'text-[#ff477e]' : 'text-[#111111]'}`}>
                    {p.label}
                  </span>
                  <input
                    type="password"
                    value={p.apiKey}
                    placeholder={p.isPaid ? 'API Key (유료)' : 'API Key'}
                    onChange={(e) => {
                      const np = settings.providers.map((x, i) => (i === idx ? { ...x, apiKey: e.target.value } : x));
                      onChangeSettings({ ...settings, providers: np });
                    }}
                    className="flex-1 px-2 py-1.5 rounded-md bg-white border border-[#111111] text-[#111111] font-bold text-xs focus:border-[#ff477e] outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {keyUrl && (
                    <a
                      href={keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={language === 'ko' ? 'API 키 발급 바로가기' : 'Get API key'}
                      className="shrink-0 p-1.5 rounded-md bg-[#00ffca] hover:bg-[#00e5b5] border border-[#111111] text-[#111111] shadow-[1px_1px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => runConnectionTest(p)}
                    disabled={testState[p.id]?.status === 'running'}
                    title={language === 'ko' ? '연결 테스트' : 'Test connection'}
                    className="shrink-0 px-2 py-1.5 rounded-md bg-[#ffd166] hover:bg-[#ffc233] border border-[#111111] text-[#111111] text-[11px] font-extrabold shadow-[1px_1px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {testState[p.id]?.status === 'running'
                      ? '...'
                      : language === 'ko'
                        ? '테스트'
                        : 'Test'}
                  </button>
                  </div>
                  {testState[p.id] && testState[p.id].status !== 'running' && (
                    <div
                      className={`mt-1.5 pl-6 text-[11px] font-bold ${
                        testState[p.id].status === 'ok' ? 'text-[#0a7d5a]' : 'text-[#c1121f]'
                      }`}
                    >
                      {testState[p.id].status === 'ok' ? '✅ ' : '⚠️ '}
                      {testState[p.id].detail}
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>

          {/* Temperature / Creativity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-2 font-extrabold text-[#111111] text-xs uppercase">
                <Sparkles className="w-4 h-4 text-[#ffd166]" />
                <span>{language === 'ko' ? '창의성 (Temperature)' : 'Creativity (Temperature)'}</span>
              </label>
              <span className="font-mono text-xs text-[#ff477e] font-extrabold">
                {settings.temperature}
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.1"
              value={settings.temperature}
              onChange={(e) =>
                onChangeSettings({ ...settings, temperature: parseFloat(e.target.value) })
              }
              className="w-full accent-[#ff477e] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#555555] font-bold mt-1">
              <span>{language === 'ko' ? '정밀한 SEO' : 'Precise SEO'}</span>
              <span>{language === 'ko' ? '감성적/창의적' : 'Creative Vibe'}</span>
            </div>
          </div>

          {/* Telemetry Monitor Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
            <div>
              <div className="font-extrabold text-xs text-[#111111] uppercase">
                {language === 'ko' ? '실시간 LiteLLM 모니터 위젯' : 'Live LiteLLM Monitor Widget'}
              </div>
              <div className="text-[11px] text-[#555555] font-medium">
                {language === 'ko' ? '토큰 소비량 및 비용 실시간 표시' : 'Show tokens and estimated cost'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showMonitor}
              onChange={(e) => onChangeSettings({ ...settings, showMonitor: e.target.checked })}
              className="w-4 h-4 accent-[#ff477e] cursor-pointer"
            />
          </div>

          {/* Auto-copy toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#fffbf2] border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
            <div>
              <div className="font-extrabold text-xs text-[#111111] uppercase">
                {language === 'ko' ? '프롬프트 자동 클립보드 복사' : 'Auto-Copy Prompts to Clipboard'}
              </div>
              <div className="text-[11px] text-[#555555] font-medium">
                {language === 'ko' ? '생성 완료 시 원클릭 편의 기능' : 'Copy prompt automatically'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCopyPrompts}
              onChange={(e) =>
                onChangeSettings({ ...settings, autoCopyPrompts: e.target.checked })
              }
              className="w-4 h-4 accent-[#ff477e] cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-[#111111] flex justify-end gap-2 sticky bottom-0 bg-white pb-1">
          <button
            onClick={handleCancel}
            className="px-5 py-2 rounded-xl bg-white hover:bg-[#fffbf2] border-2 border-[#111111] text-[#111111] font-mono-neo font-bold text-xs uppercase shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-colors cursor-pointer"
          >
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00ffca] hover:bg-[#00e5b5] border-2 border-[#111111] text-[#111111] font-mono-neo font-extrabold text-xs uppercase shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-colors cursor-pointer"
          >
            {language === 'ko' ? '완료' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
