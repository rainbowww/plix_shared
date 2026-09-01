// PLIX Bridge 컨트롤러(service worker).
// plix-relay 로부터 { platform, prompt } 를 받아 대상 탭을 열고,
// bridge.js(content) 에 명령을 순서대로 보내 이미지 생성을 실행한다.
//
// 시퀀스: 탭 열기/포커스 → PING(준비 대기) → NEW_CHAT → ENSURE_IMAGE_MODE
//         → SET_PROMPT → WAIT_SEND_READY → CLICK_SEND
// 주입 로직(bridge.js/*-dom.js)은 ImagiPark 검증본 그대로 사용.

const HOME = {
  gemini: 'https://gemini.google.com/app',
  chatgpt: 'https://chatgpt.com/',
};

function sendToTab(tabId, message, { retries = 1 } = {}) {
  return new Promise((resolve, reject) => {
    let left = retries;
    const attempt = () => {
      chrome.tabs.sendMessage(tabId, message, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          if (left-- > 0) return setTimeout(attempt, 400);
          return reject(new Error(err.message));
        }
        resolve(resp);
      });
    };
    attempt();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// content script(bridge.js) 가 준비될 때까지 PING.
async function waitReady(tabId, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await sendToTab(tabId, { type: 'IMAGIPARK_PING' }, { retries: 0 });
      if (r && r.ok && r.hasAdapter) return true;
    } catch (_) {
      /* 아직 주입 전 — 재시도 */
    }
    await sleep(500);
  }
  throw new Error('대상 페이지 준비 시간 초과 (로그인/로딩 확인)');
}

async function openTarget(platform) {
  const url = HOME[platform];
  if (!url) throw new Error('지원하지 않는 platform: ' + platform);
  const host = platform === 'gemini' ? 'gemini.google.com' : 'chatgpt.com';

  // 이미 열린 탭이 있으면 재사용, 없으면 새로 연다.
  const existing = await chrome.tabs.query({ url: `https://${host}/*` });
  if (existing && existing.length) {
    const tab = existing[0];
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) {
      try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (_) {}
    }
    return tab.id;
  }
  const tab = await chrome.tabs.create({ url, active: true });
  return tab.id;
}

async function runGenerate(platform, prompt) {
  if (!prompt || !prompt.trim()) throw new Error('프롬프트가 비어 있습니다.');

  const tabId = await openTarget(platform);
  await waitReady(tabId);

  await sendToTab(tabId, { type: 'IMAGIPARK_RESET_ABORT' }, { retries: 2 });

  // 새 대화 (기존 대화 오염 방지). 실패해도 계속.
  try { await sendToTab(tabId, { type: 'IMAGIPARK_CLICK_NEW_CHAT' }, { retries: 2 }); } catch (_) {}
  await sleep(600);
  // 새 대화 후 다시 준비 확인
  await waitReady(tabId, { timeoutMs: 15000 });

  // 이미지 모드 보장 (Gemini/ChatGPT 각 어댑터가 처리, 미지원 시 bridge 가 throw → 무시)
  try { await sendToTab(tabId, { type: 'IMAGIPARK_ENSURE_IMAGE_MODE' }, { retries: 2 }); } catch (_) {}

  // 프롬프트 주입
  await sendToTab(tabId, { type: 'IMAGIPARK_SET_PROMPT', text: prompt }, { retries: 2 });

  // 전송 버튼 활성 대기 후 전송
  try {
    await sendToTab(tabId, { type: 'IMAGIPARK_WAIT_SEND_READY', timeoutMs: 15000 }, { retries: 1 });
  } catch (_) {}
  await sendToTab(tabId, { type: 'IMAGIPARK_CLICK_SEND' }, { retries: 2 });

  return { ok: true, tabId };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'PLIX_GENERATE') return false;
  runGenerate(msg.platform, msg.prompt)
    .then((r) => sendResponse(r))
    .catch((e) => sendResponse({ ok: false, error: (e && e.message) || String(e) }));
  return true; // async
});
