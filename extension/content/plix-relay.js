// PLIX 웹앱(plix-shared-bice.vercel.app) ↔ 확장 다리.
// 웹페이지는 확장 ID를 몰라도 window.postMessage 로 요청하고, 이 content script 가
// chrome.runtime 으로 중계한다. 응답도 postMessage 로 돌려준다.
//
// 페이지 → 확장:  window.postMessage({ __PLIX_BRIDGE__: 'REQUEST', id, platform, prompt }, '*')
// 확장 → 페이지:  window.postMessage({ __PLIX_BRIDGE__: 'RESULT',  id, ok, error }, '*')
// 설치 감지:      페이지는 document.documentElement[data-plix-bridge="1"] 로 확인.

(function () {
  'use strict';
  try {
    document.documentElement.setAttribute('data-plix-bridge', '1');
  } catch (_) {}

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__PLIX_BRIDGE__ !== 'REQUEST') return;

    const { id, platform, prompt } = data;

    if (data.__PING__) {
      window.postMessage({ __PLIX_BRIDGE__: 'RESULT', id, ok: true, pong: true }, '*');
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'PLIX_GENERATE', platform, prompt },
      (resp) => {
        const err = chrome.runtime.lastError;
        window.postMessage(
          {
            __PLIX_BRIDGE__: 'RESULT',
            id,
            ok: !!(resp && resp.ok) && !err,
            error: err ? err.message : (resp && resp.error) || null,
          },
          '*'
        );
      }
    );
  });
})();
