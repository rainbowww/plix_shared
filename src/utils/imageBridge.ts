// PLIX 웹앱 → PLIX Bridge 확장 통신 헬퍼.
// 확장이 설치돼 있으면 content script(plix-relay)가 <html data-plix-bridge="1"> 를 심고
// window.postMessage 요청을 chrome.runtime 으로 중계한다.
// 확장이 없으면 자동 입력이 불가하므로 클립보드 복사 + 새 탭 열기로 폴백한다.

export type ImagePlatform = 'gemini' | 'chatgpt';

const HOME: Record<ImagePlatform, string> = {
  gemini: 'https://gemini.google.com/app',
  chatgpt: 'https://chatgpt.com/',
};

export function isBridgeInstalled(): boolean {
  try {
    return document.documentElement.getAttribute('data-plix-bridge') === '1';
  } catch {
    return false;
  }
}

function requestBridge(
  platform: ImagePlatform,
  prompt: string,
  timeoutMs = 45000
): Promise<{ ok: boolean; error?: string | null }> {
  return new Promise((resolve) => {
    const id = 'plix-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    let done = false;

    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      const d: any = event.data;
      if (!d || d.__PLIX_BRIDGE__ !== 'RESULT' || d.id !== id) return;
      cleanup();
      resolve({ ok: !!d.ok, error: d.error });
    };
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMsg);
    };

    window.addEventListener('message', onMsg);
    window.postMessage({ __PLIX_BRIDGE__: 'REQUEST', id, platform, prompt }, '*');

    setTimeout(() => {
      if (done) return;
      cleanup();
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 이미지 생성 바로가기.
 * - 확장 설치됨: 대상 새 대화에 프롬프트 자동 입력 + 이미지 모드 + 전송까지 실행.
 * - 미설치: 프롬프트를 클립보드에 복사하고 대상 사이트를 새 탭으로 연다(수동 붙여넣기).
 * 반환 mode 로 호출부가 안내 토스트를 띄운다.
 */
export async function launchImageGeneration(
  platform: ImagePlatform,
  prompt: string
): Promise<{ mode: 'auto' | 'fallback'; ok: boolean; error?: string | null }> {
  if (isBridgeInstalled()) {
    const r = await requestBridge(platform, prompt);
    if (r.ok) return { mode: 'auto', ok: true };
    // 자동 실패 시에도 사용자가 이어서 할 수 있도록 폴백.
    await copyToClipboard(prompt);
    window.open(HOME[platform], '_blank', 'noopener');
    return { mode: 'auto', ok: false, error: r.error };
  }

  await copyToClipboard(prompt);
  window.open(HOME[platform], '_blank', 'noopener');
  return { mode: 'fallback', ok: true };
}
