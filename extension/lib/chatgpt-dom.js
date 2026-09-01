// IMAGIPARK — ChatGPT DOM 유틸
// 셀렉터는 fallback 배열로 관리 (ChatGPT가 자주 변경됨).
(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // 모듈 수명 내내 유지되는 "이미 완료 처리한 file_ID" 집합.
  // ChatGPT 가 이전 턴의 이미지를 DOM 에서 잠깐 떼었다 다시 붙이면
  // 다음 턴의 waitForImagesInLastMessage 가 그것을 "새 이미지" 로 오판
  // → 엉뚱한 턴에 조기 리턴하는 버그가 있었음.
  // 매 호출 시 baseline 스냅샷에 이 세트의 id 를 "fid:" 접두사로 병합해 차단.
  // 반환 직전 detectedFid 를 여기에 추가.
  const _lifetimeSeenFids = new Set();

  // ─────────────────────────────────────────────────────────────
  // 네트워크 훅 (MAIN world 의 lib/chatgpt-net-hook.js) 수신기
  //   - SSE 스트림에서 이미지 file_ID 를 DOM 보다 먼저 받아온다.
  //   - 수신한 fid 를 FIFO 큐에 적재, waitForImagesInLastMessage 가 최우선 신호로 사용.
  //   - 이 큐가 비어 있거나 포맷 변경으로 이벤트가 안 오면 DOM 휴리스틱으로 자동 폴백.
  const _netImageQueue = []; // [{fid, at}]
  const _netImageSeen = new Set();
  let _netStreamCompleteAt = 0;
  let _netStreamClosedAt = 0;
  // Rate limit 상태 — 이 턴의 waitForImagesInLastMessage 가 RateLimitError 로 빠르게 실패하도록.
  // waitSec: 서버 권장 대기 시간(초). sidepanel 이 이 값을 보고 적절히 sleep.
  let _rateLimitAt = 0;
  let _rateLimitWaitSec = 0;

  window.addEventListener("message", (ev) => {
    try {
      if (ev.source !== window) return;
      const d = ev.data;
      if (!d || d.__imagipark_src__ !== "net-hook") return;
      if (d.type === "IMAGIPARK_NET_IMAGE" && d.fid) {
        if (_netImageSeen.has(d.fid)) return;
        _netImageSeen.add(d.fid);
        _netImageQueue.push({ fid: d.fid, at: d.at || Date.now() });
        console.log("[ImagiPark/ChatGPT] net hook fid=" + d.fid + " q=" + _netImageQueue.length);
      } else if (d.type === "IMAGIPARK_NET_STREAM_COMPLETE") {
        _netStreamCompleteAt = d.at || Date.now();
      } else if (d.type === "IMAGIPARK_NET_STREAM_CLOSED") {
        _netStreamClosedAt = d.at || Date.now();
      } else if (d.type === "IMAGIPARK_NET_RATE_LIMIT") {
        _rateLimitAt = d.at || Date.now();
        _rateLimitWaitSec = Math.max(60, Math.min(600, d.waitSec || 180));
        console.warn("[ImagiPark/ChatGPT] 🚦 rate limit 감지 — 권장 대기 " + _rateLimitWaitSec + "초");
      }
    } catch (_) {}
  });

  const SELECTORS = {
    composer: [
      "#prompt-textarea",
      'div[contenteditable="true"][data-id]',
      'div[contenteditable="true"]',
    ],
    sendButton: [
      'button[data-testid="send-button"]',
      'button[data-testid="fruitjuice-send-button"]',
      'button#composer-submit-button',
      '#composer-submit-button',
      'button[aria-label*="보내" i]',
      'button[aria-label*="send" i]',
      'button[aria-label*="submit" i]',
      'form button[type="submit"]',
    ],
    stopButton: [
      'button[data-testid="stop-button"]',
      'button#composer-submit-button[aria-label*="중지" i]',
      'button#composer-submit-button[aria-label*="stop" i]',
      'button[aria-label*="중지" i]',
      'button[aria-label*="stop" i]',
      'button[data-testid="composer-stop-button"]',
    ],
    attachButton: [
      "#composer-plus-btn",                       // ★ 실제 DOM 은 id (최우선)
      'button#composer-plus-btn',
      'button[data-testid="composer-plus-btn"]',
      'button[data-testid="composer-action-button"]',
      'button[aria-label*="첨부" i]',
      'button[aria-label*="attach" i]',
      'button[aria-label*="도구" i]',
      'button[aria-label*="tools" i]',
      'button[aria-label*="더하기" i]',
      'button[aria-label*="plus" i]',
      'button[aria-label*="추가 작업" i]',
      'button[aria-label*="add" i]',
    ],
    menuItem: [
      '[role="menuitem"]',
      '[role="option"]',
      '[data-radix-collection-item]',
      'div[role="menu"] button',
      'div[role="menu"] [role="button"]',
    ],
    assistantMessage: [
      '[data-message-author-role="assistant"]',
      'div[data-testid^="conversation-turn-"] [data-message-author-role="assistant"]',
    ],
  };

  function q(selList, root = document) {
    for (const s of selList) {
      const el = root.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function qa(selList, root = document) {
    for (const s of selList) {
      const nodes = root.querySelectorAll(s);
      if (nodes.length) return Array.from(nodes);
    }
    return [];
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // --- 공유 abort 체커 -------------------------------------------------
  let abortChecker = null;
  function setAbortChecker(fn) { abortChecker = fn; }
  function clearAbortChecker() { abortChecker = null; }
  function checkAbort() {
    if (abortChecker && abortChecker()) {
      const e = new Error("ABORTED");
      e.aborted = true;
      throw e;
    }
  }

  // --- 사용자 수동 완료 신호 ----------------------------------------
  let _manualComplete = false;
  function setManualComplete() { _manualComplete = true; }
  function consumeManualComplete() {
    if (_manualComplete) { _manualComplete = false; return true; }
    return false;
  }

  async function waitFor(predicate, { timeout = 30000, interval = 200 } = {}) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      checkAbort();
      try {
        const v = predicate();
        if (v) return v;
      } catch (e) {
        if (e && e.aborted) throw e;
      }
      await sleep(interval);
    }
    throw new Error("waitFor timeout: " + predicate.toString().slice(0, 80));
  }

  function getComposer() {
    return q(SELECTORS.composer);
  }

  function getComposerForm() {
    const c = getComposer();
    if (!c) return null;
    return (
      c.closest("form") ||
      c.closest('[data-testid*="composer"]') ||
      c.parentElement?.parentElement?.parentElement ||
      null
    );
  }

  /**
   * 명시 셀렉터 실패 시 composer 주변에서 "전송 버튼으로 보이는 것"을 찾음.
   * 휴리스틱: composer의 부모 form 내부에서 가장 우측(오른쪽 끝)의 보이는 버튼.
   */
  function findSendButtonHeuristic() {
    const form = getComposerForm();
    if (!form) return null;
    const btns = Array.from(form.querySelectorAll("button")).filter(
      (b) => b.offsetParent !== null
    );
    if (!btns.length) return null;
    // 우측에 위치한 버튼일수록 전송 가능성 높음
    btns.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.right - ra.right;
    });
    // aria-label/title에 send/보내/submit 계열 키워드 있는 것 우선
    const kw = /(send|submit|보내|전송)/i;
    const preferred = btns.find((b) => {
      const al = (b.getAttribute("aria-label") || "") + " " + (b.title || "");
      return kw.test(al);
    });
    return preferred || btns[0];
  }

  // 음성/받아쓰기/읽어주기 버튼 — 정지 버튼으로 오인하면 안 되는 것들
  //   ⚠ 회귀 이력 (치명): ChatGPT 새 컴포저의 **음성 모드 버튼은 파형 아이콘**이라
  //     <rect> 를 여러 개 포함한다. 아래 SVG 휴리스틱이 "rect 가 있으면 stop" 이었던 탓에
  //     이 버튼이 항상 stop 으로 오탐 → "스트리밍이 안 끝남" 상태가 영구화되어
  //     waitForSendButtonReady 가 15초 타임아웃 (previous turn not stably finished).
  function _btnSignature(btn) {
    if (!btn) return "";
    return (
      (btn.getAttribute("aria-label") || "") + " " +
      (btn.title || "") + " " +
      (btn.getAttribute("data-testid") || "") + " " +
      (btn.className || "")
    );
  }

  function isVoiceOrMicButton(btn) {
    if (!btn) return false;
    return /(음성|보이스|voice|dictate|받아쓰기|마이크|mic|읽어주기|read\s*aloud|speak|audio)/i.test(
      _btnSignature(btn)
    );
  }

  // aria-label/title/data-testid 문자열에서 stop 모드인지 판별
  function isStopMode(btn) {
    if (!btn) return false;
    // 음성/마이크 계열은 절대 stop 이 아니다 (최우선 배제)
    if (isVoiceOrMicButton(btn)) return false;

    const s = _btnSignature(btn);
    if (/(stop|중지|중단|멈춤|생성\s*중지|stop generating|streaming)/i.test(s)) return true;

    // SVG 아이콘 휴리스틱 — stop 아이콘은 "정사각형 하나".
    //   파형(음성) 아이콘은 rect 가 여러 개이므로 개수로 구분한다.
    const svg = btn.querySelector && btn.querySelector("svg");
    if (svg) {
      const rects = svg.querySelectorAll ? svg.querySelectorAll("rect") : [];
      if (rects.length === 1) return true; // 단일 사각형 = stop 아이콘
      if (rects.length > 1) return false;  // 파형 등 다중 사각형 = stop 아님
      // circle+stop path 조합도 종종 사용
      const paths = svg.querySelectorAll("path");
      for (const p of paths) {
        const d = (p.getAttribute("d") || "").toLowerCase();
        if (/m\s*\d+\s*,?\s*\d+\s*h\s*\d+\s*v\s*\d+\s*h\s*-?\d+\s*z/i.test(d)) return true;
      }
    }
    return false;
  }

  function getSendButton() {
    // 모든 후보를 모은 뒤 **실제로 스트리밍 중인** stop 버튼만 제외.
    //   ⚠ 회귀 이력: isStopMode 로만 걸렀더니, 응답 종료 후에도 aria-label="답변 중지"
    //     라벨이 남은 #composer-submit-button 이 계속 제외되어 "send 버튼 못 찾음" →
    //     [clickSend] 전송 실패. 라벨은 낡을 수 있으므로 data-testid 와 disabled 를 우선 본다.
    const set = new Set();
    for (const s of SELECTORS.sendButton) {
      document.querySelectorAll(s).forEach((b) => set.add(b));
    }
    const heu = findSendButtonHeuristic();
    if (heu) set.add(heu);
    for (const b of set) {
      if (!b) continue;
      if (isRealStopButton(b)) continue;
      if (b.offsetParent === null) continue;
      return b;
    }
    // 폴백 — 후보가 전부 걸러졌지만 submit 버튼이 활성 상태라면 그것이 전송 버튼이다
    const submit = document.querySelector("#composer-submit-button");
    if (submit && submit.offsetParent !== null && !isDisabledEl(submit) && !isRealStopButton(submit)) {
      return submit;
    }
    return null;
  }

  // "지금 실제로 응답을 중지시킬 수 있는 버튼인가" 판별.
  //   판정 우선순위: disabled(잔재) → 음성/마이크 → data-testid(권위) → 라벨·아이콘 휴리스틱
  function isRealStopButton(btn) {
    if (!btn) return false;
    if (isDisabledEl(btn)) return false;        // 비활성 = 스트리밍 종료 후 잔재
    if (isVoiceOrMicButton(btn)) return false;
    const testid = (btn.getAttribute && btn.getAttribute("data-testid")) || "";
    if (testid === "stop-button") return true;  // testid 가 가장 신뢰도 높음
    if (testid === "send-button") return false;
    return isStopMode(btn);
  }

  // disabled 상태의 정지 버튼 = 스트리밍이 이미 끝났는데 DOM 에만 남은 잔재.
  //   ⚠ 회귀 이력 (치명): ChatGPT 는 응답 종료 후에도
  //     <button id="composer-submit-button" data-testid="stop-button"
  //             aria-label="답변 중지" disabled> 를 그대로 남겨둔다.
  //     이걸 '아직 응답 중' 으로 오판해 waitForSendButtonReady 가 영영 통과하지 못했고,
  //     disabled 버튼은 click() 해도 반응이 없어 강제 종료 폴백도 무력했다.
  function isDisabledEl(el) {
    if (!el) return true;
    if (el.disabled === true) return true;
    if (el.getAttribute && el.getAttribute("aria-disabled") === "true") return true;
    return false;
  }

  function getStopButton() {
    // 명시 selector 우선 (aria-label/testid 기반 — 신뢰도 높음)
    for (const s of SELECTORS.stopButton) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null && isRealStopButton(el)) return el;
    }
    // ⚠ 회귀 이력: composer form 의 **모든 버튼**에 아이콘 휴리스틱을 적용했더니
    //   음성 모드 버튼(파형 = 다중 rect)이 stop 으로 오탐되어 스트리밍이 영원히
    //   안 끝나는 상태가 됐다. 휴리스틱은 "전송 버튼이 정지로 바뀌는" 그 버튼에만 적용한다.
    const submit =
      document.querySelector("#composer-submit-button") ||
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('form button[type="submit"]');
    if (submit && submit.offsetParent !== null && isRealStopButton(submit)) return submit;
    return null;
  }

  /**
   * contenteditable / textarea 에 텍스트 주입.
   * ChatGPT는 ProseMirror/Lexical 기반 contenteditable을 사용하므로
   * paste 이벤트(DataTransfer)가 가장 안정적.
   */
  function setPromptText(text) {
    const el = getComposer();
    if (!el) throw new Error("Composer not found");
    el.focus();

    if (el.tagName === "TEXTAREA") {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    // 1) 전체 선택 → 삭제 (기존 내용 제거)
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false);
    } catch (_) {}

    // 2) 우선 paste 이벤트로 주입 (ProseMirror/Lexical 호환)
    let inserted = false;
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      // 일부 브라우저에서 clipboardData가 read-only로 설정되지 않을 때
      if (!pasteEvent.clipboardData) {
        Object.defineProperty(pasteEvent, "clipboardData", { value: dt });
      }
      el.dispatchEvent(pasteEvent);
      inserted = true;
    } catch (e) {
      console.warn("[ImagiPark/ChatGPT] paste 주입 실패, fallback 시도", e);
    }

    // 3) fallback — execCommand
    if (!inserted || !(el.innerText || "").trim()) {
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch (_) {}
    }

    // 4) 마지막 fallback — 직접 노드 구성 + InputEvent
    if (!(el.innerText || "").trim()) {
      // Trusted Types 정책이 켜진 페이지(Gemini 등)에서 innerHTML 금지 → DOM API 사용
      while (el.firstChild) el.removeChild(el.firstChild);
      const p = document.createElement("p");
      p.textContent = text;
      el.appendChild(p);
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: text,
        })
      );
    }
  }

  function composerIsEmpty() {
    const el = getComposer();
    if (!el) return true;
    const txt = (el.innerText || el.value || "").trim();
    return txt.length === 0;
  }

  function pressEnter() {
    const el = getComposer();
    if (!el) return;
    el.focus();
    const evInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    el.dispatchEvent(new KeyboardEvent("keydown", evInit));
    el.dispatchEvent(new KeyboardEvent("keypress", evInit));
    el.dispatchEvent(new KeyboardEvent("keyup", evInit));
  }

  /**
   * 전송 시도:
   *  1) send 버튼 클릭
   *  2) "전송 성공" 판정 — 아래 중 하나라도 참이면 OK
   *     - composer 가 비워짐
   *     - Stop 버튼이 나타남 (응답 시작)
   *     - 유저 말풍선(user-turn) 수 증가
   *  3) 2.5초 내 성공 신호 없으면 Enter 키 fallback
   *  4) 재시도 2.5초 내에도 없으면 에러
   *
   * 배경: ChatGPT 빌드에 따라 contenteditable 의 텍스트가 전송 후에도
   * 잠깐 남아있어 "미확인 → Enter fallback" 가 남발되던 문제를 OR 조건으로 완화.
   */
  function countUserTurns() {
    // user-turn 후보 셀렉터들을 느슨히 합산
    const sels = [
      '[data-message-author-role="user"]',
      '[data-testid^="conversation-turn"] [data-message-author-role="user"]',
    ];
    let max = 0;
    for (const s of sels) {
      try {
        const n = document.querySelectorAll(s).length;
        if (n > max) max = n;
      } catch (_) {}
    }
    return max;
  }

  async function clickSend() {
    const textBefore = (getComposer()?.innerText || "").trim();
    if (!textBefore) throw new Error("composer에 전송할 텍스트가 없습니다");

    // 전송 성공 판정 baseline
    const userTurnsBefore = countUserTurns();
    const sendSucceeded = () =>
      composerIsEmpty() ||
      !!getStopButton() ||
      countUserTurns() > userTurnsBefore;

    let clicked = false;
    try {
      const btn = await waitFor(
        () => {
          const b = getSendButton();
          if (b && !b.disabled && b.offsetParent !== null) return b;
          return null;
        },
        { timeout: 6000, interval: 150 }
      );
      btn.click();
      clicked = true;
      console.log("[ImagiPark/ChatGPT] send 버튼 클릭 완료");
    } catch (_) {
      console.warn("[ImagiPark/ChatGPT] send 버튼 못 찾음");
    }

    // 1차 성공 대기: 3초
    const ok1 = await waitFor(sendSucceeded, {
      timeout: 3000,
      interval: 120,
    }).then(() => true).catch(() => false);
    if (ok1) return;

    // Enter 키 fallback
    console.warn("[ImagiPark/ChatGPT] 전송 미확인, Enter 키 fallback");
    pressEnter();

    // 2차 성공 대기: 3초
    const ok2 = await waitFor(sendSucceeded, {
      timeout: 3000,
      interval: 120,
    }).then(() => true).catch(() => false);
    if (ok2) return;

    throw new Error(
      "전송이 실패했습니다 (성공 신호 없음). " +
      (clicked ? "버튼 클릭은 했으나 " : "버튼을 못 찾아 ") +
      "ChatGPT가 입력을 수락하지 않았습니다. + 메뉴에서 '이미지 만들기'가 켜져 있는지, composer에 텍스트가 제대로 들어갔는지 확인하세요."
    );
  }

  async function waitForResponseStart(timeout = 15000) {
    // stop 버튼이 나타나거나, 마지막 assistant 메시지가 증가하면 응답 시작으로 간주
    const startCount = qa(SELECTORS.assistantMessage).length;
    await waitFor(
      () => getStopButton() || qa(SELECTORS.assistantMessage).length > startCount,
      { timeout, interval: 200 }
    );
  }

  async function waitForResponseComplete(timeout = 10 * 60 * 1000) {
    // 응답 시작: stop 버튼 출현 또는 assistant 메시지 증가
    try {
      await waitForResponseStart(15000);
    } catch (_) {
      throw new Error(
        "ChatGPT 응답이 시작되지 않았습니다. 프롬프트 전송 실패 가능성. (composer/전송버튼 셀렉터 확인 필요)"
      );
    }

    // 완료 판단 — 세 가지 경로 중 하나라도 충족되면 종료:
    //  (A) 텍스트 응답: stop 없음 + 텍스트가 STABILITY_MS 동안 변하지 않음
    //  (B) 이미지만 있는 응답: stop 없음 + <img> 존재 + action 버튼(good/bad) 붙음
    //      → ChatGPT 가 이미지 모드에서 스크립트 요청을 이미지로만 응답한 경우.
    //         이때 innerText 가 계속 empty 라 (A) 경로가 영영 안 끊기는 문제 방지.
    //  (C) SSE 스트림 실제 종료 신호(_netStreamClosedAt) + stop 없음 + 3초 경과
    const STABILITY_MS = 2000;
    const IMG_ONLY_GRACE_MS = 3000;
    const t0 = Date.now();
    let lastText = "";
    let stableSince = 0;
    let imgOnlySince = 0;
    let streamClosedAckAt = 0;
    // (D) stop 오탐 무력화: stop 이 계속 보여도 텍스트가 오래 얼어 있으면 완료로 간주
    let frozenTxt = "";
    let frozenSince = 0;
    const FROZEN_OVERRIDE_MS = 15000;
    let lastDiagAt = 0;

    while (Date.now() - t0 < timeout) {
      checkAbort();
      // 사용자 수동 완료 신호 — 즉시 통과
      if (consumeManualComplete()) {
        console.log("[ImagiPark/ChatGPT] ✋ 사용자 수동 완료 신호 — 응답 즉시 인정");
        return;
      }
      const stop = getStopButton();
      const lastEl = qa(SELECTORS.assistantMessage).pop();
      const txt = lastEl ? (lastEl.innerText || lastEl.textContent || "") : "";

      // (D) stop 표시 여부와 무관한 텍스트 동결 추적 — stop 버튼 오탐(음성 버튼 등)이
      //     남아 있어도, 실제 스트리밍이 끝났다면 텍스트는 더 이상 변하지 않는다.
      if (txt && txt === frozenTxt) {
        if (!frozenSince) frozenSince = Date.now();
        if (Date.now() - frozenSince >= FROZEN_OVERRIDE_MS) {
          console.warn(
            "[ImagiPark/ChatGPT] waitForResponseComplete 종료 — 텍스트가 " +
            (FROZEN_OVERRIDE_MS / 1000) + "초간 동결" +
            (stop ? " (stop 버튼이 계속 보이지만 오탐으로 판단해 무시)" : "")
          );
          return;
        }
      } else {
        frozenTxt = txt;
        frozenSince = txt ? Date.now() : 0;
      }

      // 15초마다 진단 로그 — 어떤 조건이 완료를 막고 있는지 콘솔로 추적 가능하게
      if (Date.now() - lastDiagAt > 15000) {
        lastDiagAt = Date.now();
        let stopSig = "";
        if (stop) {
          stopSig = [
            stop.tagName,
            stop.id ? "#" + stop.id : "",
            stop.getAttribute("data-testid") || "",
            stop.getAttribute("aria-label") || "",
          ].filter(Boolean).join(" ");
        }
        console.log(
          `[ImagiPark/ChatGPT] 응답 대기 ${Math.round((Date.now() - t0) / 1000)}s — ` +
          `stop=${stop ? "<" + stopSig + ">" : "없음"}, 메시지텍스트=${txt.length}자, ` +
          `streamClosed=${_netStreamClosedAt > t0}`
        );
      }

      if (stop) {
        stableSince = 0;
        imgOnlySince = 0;
        streamClosedAckAt = 0;
        lastText = "";
        await sleep(500);
        continue;
      }

      // (A) 텍스트 안정화
      if (txt && txt === lastText) {
        if (!stableSince) stableSince = Date.now();
        if (Date.now() - stableSince >= STABILITY_MS) return;
      } else if (txt) {
        lastText = txt;
        stableSince = 0;
      }

      // (B) 이미지만 있는 응답 — 텍스트 거의 없음 + 이미지 요소 + image action 버튼
      const hasImgInMsg = !!(lastEl && lastEl.querySelector("img"));
      const textTooShort = !txt || txt.trim().length < 20;
      const imgActionPresent = countImageActionButtons() > 0;
      if (hasImgInMsg && textTooShort && imgActionPresent) {
        if (!imgOnlySince) imgOnlySince = Date.now();
        if (Date.now() - imgOnlySince >= IMG_ONLY_GRACE_MS) {
          console.log("[ImagiPark/ChatGPT] waitForResponseComplete 종료 — 이미지-only 응답 감지");
          return;
        }
      } else {
        imgOnlySince = 0;
      }

      // (C) SSE 스트림이 실제로 닫혔다는 확실한 신호 + 3초 여유
      if (_netStreamClosedAt > t0) {
        if (!streamClosedAckAt) streamClosedAckAt = Date.now();
        if (Date.now() - streamClosedAckAt >= 3000) {
          console.log("[ImagiPark/ChatGPT] waitForResponseComplete 종료 — SSE 스트림 닫힘 확정");
          return;
        }
      }

      // (E) 감지 불가 탈출구 — 캔버스 등으로 assistant 메시지를 못 찾는 경우:
      //     stop 없음 + 텍스트/이미지 아무것도 감지 못한 채 45초 경과 → 완료로 간주.
      //     (10분 hang 보다 낫다 — 이후 파싱 단계가 텍스트 유무를 다시 검증한다)
      if (!txt && !hasImgInMsg && Date.now() - t0 > 45000) {
        console.warn("[ImagiPark/ChatGPT] waitForResponseComplete 종료 — 45초간 감지 불가 (캔버스 응답?). 완료로 간주하고 진행");
        return;
      }

      await sleep(500);
    }
    throw new Error("응답 완료 감지 타임아웃");
  }

  function getLastAssistantMessage() {
    const list = qa(SELECTORS.assistantMessage);
    if (!list.length) return "";
    return list[list.length - 1];
  }

  function getLastAssistantText() {
    const el = getLastAssistantMessage();
    return el ? el.innerText || el.textContent || "" : "";
  }

  // 현재 대화에 존재하는 어시스턴트 메시지 수 — 전송 성공 판정에 사용
  function countAssistantMessages() {
    return qa(SELECTORS.assistantMessage).length;
  }

  function findAttachButtonHeuristic() {
    // composer form 안에서 좌측의 아이콘 버튼 중 하나가 + 버튼일 가능성
    const form = getComposerForm();
    if (!form) return null;
    const btns = Array.from(form.querySelectorAll("button")).filter(
      (b) => b.offsetParent !== null
    );
    if (!btns.length) return null;
    // 좌측 우선 정렬
    btns.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.left - rb.left;
    });
    // 전송 버튼(우측) 제외
    const kwSend = /(send|submit|보내|전송|stop|중지)/i;
    for (const b of btns) {
      const al =
        (b.getAttribute("aria-label") || "") +
        " " +
        (b.title || "") +
        " " +
        (b.getAttribute("data-testid") || "");
      if (kwSend.test(al)) continue;
      // 대개 + 버튼은 plus/add 관련 키워드
      if (/(plus|add|attach|첨부|도구|tools|더하기|추가)/i.test(al)) return b;
    }
    // 키워드 매칭 실패 시 가장 좌측 버튼 반환 (마지막 수단)
    return btns[0];
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent !== null) return true;
    const cs = window.getComputedStyle(el);
    if (!cs) return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function _isInSidebarLike(el) {
    try {
      return !!(el.closest && el.closest('nav, aside, [class*="sidebar" i], [id*="sidebar" i], [data-testid*="history" i]'));
    } catch (_) { return false; }
  }

  function getPopupRoots() {
    // ⚠ 회귀 이력 (치명): 후보에 '[data-state="open"]' 이 있었는데, ChatGPT **사이드바**가
    //   바로 data-state="open" 이다. 그래서 사이드바가 "열린 팝업 메뉴" 로 잡혀
    //   isAttachmentMenuOpen() 이 항상 true → '+' 메뉴가 안 열렸는데도 열렸다고 판단하고
    //   사이드바 안에서 '이미지 만들기' 를 찾다가 waitFor timeout.
    //   (진단 덤프에 사이드바 항목 49개가 찍힌 것이 그 증거)
    const sels = [
      '[role="menu"]',
      '[data-radix-menu-content]',
      '[data-radix-popper-content-wrapper]',
      '[cmdk-list]',
      '[role="listbox"]',
      '[role="dialog"]',
    ];
    const out = [];
    const seen = new Set();
    for (const s of sels) {
      document.querySelectorAll(s).forEach((el) => {
        if (!el || seen.has(el) || !isVisible(el)) return;
        if (_isInSidebarLike(el)) return; // 사이드바 패널은 팝업이 아니다
        seen.add(el);
        out.push(el);
      });
    }
    return out;
  }

  // composer "+" 메뉴에만 등장하는 대표 항목들 — 메뉴가 진짜 열렸는지 확인용
  const COMPOSER_MENU_LABELS = [
    "이미지 만들기", "create image",
    "사진 및 파일 첨부", "add photos", "upload",
    "웹 검색", "web search",
    "심층 리서치", "deep research",
  ];

  function isAttachmentMenuOpen() {
    const roots = getPopupRoots();
    if (!roots.length) return false;
    // 팝업이 있다는 것만으로는 부족 — 컴포저 메뉴 특유의 항목이 실제로 보여야 한다
    for (const r of roots) {
      const nodes = r.querySelectorAll
        ? r.querySelectorAll('[role="menuitem"], [role="option"], button, a, [cmdk-item], [data-radix-collection-item]')
        : [];
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        const t = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (!t || t.length > 60) continue;
        if (COMPOSER_MENU_LABELS.some((l) => t.includes(l))) return true;
      }
    }
    return false;
  }

  // 이미지 모드가 이미 켜져 있는지 — composer 의 활성 도구 칩으로 판별.
  // 켜져 있으면 메뉴를 열 필요가 없다 (사용자가 미리 켜두는 경우가 많음).
  function isImageModeActive() {
    const form = getComposerForm();
    if (!form) return false;
    const nodes = Array.from(
      form.querySelectorAll('[class*="pill" i], [class*="chip" i], [class*="badge" i], [role="button"], button, span, div')
    );
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const t = (el.innerText || el.textContent || "").trim();
      if (!t || t.length > 24) continue;
      if (/^(이미지 만들기|이미지|create image|image)$/i.test(t)) return true;
    }
    return false;
  }

  function fireClick(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    } catch (_) {}
    try { el.click(); } catch (_) {}
  }

  function findClickableByText(candidates, roots) {
    const wants = (Array.isArray(candidates) ? candidates : [candidates])
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean);
    const scopes = (roots && roots.length ? roots : getPopupRoots()).filter(Boolean);
    const pool = scopes.length ? scopes : [document];
    const nodeSel = [
      '[role="menuitem"]',
      '[role="option"]',
      '[role="button"]',
      'button',
      '[data-radix-collection-item]',
      '[cmdk-item]',
      'li',
      'div',
      'span',
    ].join(", ");
    for (const root of pool) {
      const nodes = root.querySelectorAll ? root.querySelectorAll(nodeSel) : [];
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        if (isNavigationalElement(el)) continue; // 사이드바 대화 링크 등 이동 요소 차단
        const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (!txt) continue;
        if (txt.length > 120) continue;
        for (const want of wants) {
          if (txt.includes(want)) return el.closest("button,[role='button'],[role='menuitem'],[role='option'],[data-radix-collection-item],[cmdk-item]") || el;
        }
      }
    }
    return null;
  }

  // 클릭하면 다른 대화/페이지로 이동해버리는 요소인지 판별.
  //   ⚠ 회귀 이력 (치명): 팝업 root 를 못 찾으면 document 전체를 스캔했는데, 후보 텍스트에
  //     "이미지" 같은 느슨한 단어가 있어 **사이드바의 이전 대화 링크**(제목에 "이미지" 포함,
  //     예: "썸네일 이미지 생성")를 클릭 → 그 대화로 SPA 이동 → 이전 이미지 대화에
  //     프롬프트가 전송되는 사고가 발생. "이미지 생성했던 대화만 자꾸 불려오는" 증상의 원인.
  function isNavigationalElement(el) {
    // ⚠ 정밀 차단만: 새 composer 메뉴의 정상 항목("이미지 만들기" 등)이 <a> 로 렌더링되는
    //   빌드가 있어, 모든 앵커를 차단하면 메뉴 자체를 못 찾는 회귀 발생
    //   ([ensureImageMode] waitFor timeout). 실제 사고 원인이었던
    //   ① 대화로 이동하는 링크(/c/<id>) ② 사이드바/히스토리 영역만 차단한다.
    try {
      const a = el.closest ? el.closest("a[href]") : null;
      if (a) {
        const href = a.getAttribute("href") || "";
        if (/\/c\/[^/?#]+/.test(href)) return true; // 이전 대화 링크
      }
      if (
        el.closest &&
        el.closest('nav, aside, [id*="history" i], [data-testid*="history" i], [class*="sidebar" i]')
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function findMenuActionByText(candidates, roots) {
    const wants = (Array.isArray(candidates) ? candidates : [candidates])
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean);
    const scopes = (roots && roots.length ? roots : getPopupRoots()).filter(Boolean);
    const pool = scopes.length ? scopes : [document];
    const nodeSel = [
      '[role="menuitem"]',
      '[role="option"]',
      '[role="button"]',
      'button',
      '[data-radix-collection-item]',
      '[cmdk-item]',
      'a',
    ].join(", ");
    for (const root of pool) {
      const nodes = root.querySelectorAll ? root.querySelectorAll(nodeSel) : [];
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        if (isNavigationalElement(el)) continue; // 사이드바 대화 링크 등 이동 요소 차단
        const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (!txt) continue;
        if (txt.length > 120) continue; // 메뉴 라벨+설명은 그리 길지 않다 — 본문 긴 텍스트만 배제
        for (const want of wants) {
          if (txt.includes(want)) return el;
        }
      }
    }
    return null;
  }

  // "+" 버튼 — 실제 DOM 은 **id** 가 composer-plus-btn 이다.
  //   ⚠ 회귀 이력: SELECTORS.attachButton 이 data-testid="composer-plus-btn" 로만 찾아
  //     매칭 실패 → 휴리스틱이 엉뚱한 버튼을 눌러 메뉴가 안 열림 (popupRoots=0).
  function getPlusButton() {
    const direct =
      document.querySelector("#composer-plus-btn") ||
      document.querySelector('button[id="composer-plus-btn"]') ||
      document.querySelector('[data-testid="composer-plus-btn"]');
    if (direct && isVisible(direct)) return direct;
    return q(SELECTORS.attachButton) || findAttachButtonHeuristic();
  }

  // 메뉴 행 — 새 UI 는 div[tabindex="0"][data-fill] 구조를 쓴다.
  function findMenuRowByText(candidates) {
    const wants = (Array.isArray(candidates) ? candidates : [candidates])
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean);
    const rows = Array.from(
      document.querySelectorAll('div[tabindex="0"][data-fill], [role="menuitem"], [role="option"], [cmdk-item]')
    );
    for (const el of rows) {
      if (!isVisible(el)) continue;
      if (isNavigationalElement(el)) continue;
      const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
      if (!txt || txt.length > 120) continue;
      for (const want of wants) {
        if (txt.startsWith(want) || txt.includes(want)) return el;
      }
    }
    return null;
  }

  async function openAttachmentMenu() {
    const btn = getPlusButton();
    if (!btn) throw new Error("Attach(+) 버튼을 찾을 수 없습니다 (#composer-plus-btn 미발견)");
    console.log("[ImagiPark/ChatGPT] '+' 버튼 클릭:", btn.id || btn.getAttribute("data-testid") || btn.tagName);
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      fireClick(btn);
      try {
        await waitFor(
          () =>
            isAttachmentMenuOpen() ||
            !!findMenuRowByText(["이미지 만들기", "create image"]),
          { timeout: 2500, interval: 100 }
        );
        return;
      } catch (e) {
        lastErr = e;
        await sleep(250);
      }
    }
    throw lastErr || new Error("attachment menu did not open");
  }

  // ─── 방법 1: 키보드 "@" 단축키로 이미지 모드 켜기 (창 크기·좌표 무관, UI 변경에 강함) ───
  //   composer 에 "@이미지 만들기" 를 입력하면 + 메뉴와 동일한 목록이 필터링되어 뜬다.
  //   후보가 1개로 좁혀진 뒤 Enter 를 누르면 칩이 삽입된다.
  //   ⚠ 필터 로딩 전에 Enter 를 누르면 그냥 전송돼버리므로, 메뉴가 실제로 보이는지
  //     확인한 뒤에만 Enter 를 보낸다. 확인 실패 시 입력한 텍스트를 되돌리고 포기.
  async function ensureImageModeByAtMention() {
    const composer = getComposer();
    if (!composer) throw new Error("composer 없음 (@ 방식 불가)");
    const query = "@이미지 만들기";

    composer.focus();
    await sleep(120);
    // 기존 내용이 있으면 안 됨 — 호출측에서 비운 상태로 진입한다고 가정하되 한 번 더 확인
    setPromptText("");
    await sleep(120);

    // 한 글자씩 입력해 자동완성 필터가 반응하도록 한다
    for (const ch of query) {
      document.execCommand && document.execCommand("insertText", false, ch);
      await sleep(40);
    }
    await sleep(700); // 필터 결과 로딩 대기

    const row = findMenuRowByText(["이미지 만들기", "create image"]);
    if (!row) {
      // 메뉴가 안 떴다 — Enter 를 누르면 그대로 전송되므로 입력을 지우고 실패 처리
      setPromptText("");
      throw new Error("@ 자동완성 목록에 '이미지 만들기'가 없음");
    }

    // 후보가 실제로 보이는 상태에서만 Enter (선택)
    for (const type of ["keydown", "keyup"]) {
      composer.dispatchEvent(
        new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })
      );
    }
    await sleep(600);

    // 칩이 삽입되면 composer 의 검색어 텍스트는 사라진다 — 남아 있으면 실패로 간주
    const left = (composer.innerText || composer.textContent || "").trim();
    if (left.includes("@이미지")) {
      setPromptText("");
      throw new Error("@ 방식 선택 실패 (검색어 잔여)");
    }
    return true;
  }

  async function clickMenuItemByText(candidates) {
    const found = await waitFor(
      () => findMenuActionByText(candidates),
      { timeout: 5000, interval: 150 }
    );
    fireClick(found);
  }

  // ─────────────────────────────────────────────────────────────
  // Chat / Work(글쓰기) 모드 — 스크립트 턴은 반드시 Chat 모드여야 한다.
  //   ChatGPT 상단의 [Chat | Work] 토글이 Work 로 켜져 있으면 응답이 캔버스
  //   문서로 생성돼, 우리가 파싱하는 일반 assistant 메시지 흐름과 어긋난다.
  //   (증상: 만화 스크립트가 글쓰기 모드에서 생성됨)
  // ─────────────────────────────────────────────────────────────
  const CHAT_LABELS = ["chat", "채팅"];
  const WORK_LABELS = ["work", "작업", "글쓰기"];

  function _isActiveTab(el) {
    if (!el) return false;
    const sel = el.getAttribute && (el.getAttribute("aria-selected") || el.getAttribute("data-state"));
    if (sel === "true" || sel === "active" || sel === "on") return true;
    if (el.getAttribute && el.getAttribute("aria-checked") === "true") return true;
    if (el.className && /\b(active|selected)\b/i.test(String(el.className))) return true;
    return false;
  }

  // 상단 토글 후보 수집 — 화면 상단(y<220)의 짧은 라벨 버튼/탭만
  function _findModeToggle(labels) {
    const nodes = Array.from(
      document.querySelectorAll('[role="tab"], [role="radio"], button, [role="button"]')
    );
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      // 사이드바·대화 링크 제외
      if (isNavigationalElement(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top > 220) continue; // 상단 영역만
      const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
      if (!txt || txt.length > 12) continue; // "Chat"/"Work" 처럼 아주 짧은 라벨
      if (labels.some((l) => txt === l)) return el;
    }
    return null;
  }

  // Chat 모드 보장. Work(글쓰기)가 활성이면 Chat 으로 전환.
  // 토글 자체가 없는 빌드면 noop (반환 false).
  async function ensureChatMode() {
    const chatTab = _findModeToggle(CHAT_LABELS);
    const workTab = _findModeToggle(WORK_LABELS);
    if (!chatTab && !workTab) return { supported: false, switched: false };

    // Work 가 활성이거나, Chat 이 비활성이면 Chat 클릭
    const workActive = _isActiveTab(workTab);
    const chatActive = _isActiveTab(chatTab);
    if (chatActive && !workActive) return { supported: true, switched: false };
    if (!chatTab) return { supported: true, switched: false };

    console.log("[ImagiPark/ChatGPT] Work(글쓰기) 모드 감지 — Chat 모드로 전환");
    fireClick(chatTab);
    await sleep(700);
    const nowChat = _findModeToggle(CHAT_LABELS);
    return { supported: true, switched: true, ok: _isActiveTab(nowChat) };
  }

  // 진단용 — "+" 메뉴에 실제로 어떤 항목이 있는지 콘솔에 덤프.
  // ensureImageMode 실패 시 자동 호출되어, DOM 변경 시 원인 파악을 돕는다.
  function dumpMenuCandidates(tag) {
    try {
      const roots = getPopupRoots();
      const scopes = roots && roots.length ? roots : [document];
      const out = [];
      for (const root of scopes) {
        const nodes = root.querySelectorAll
          ? root.querySelectorAll('[role="menuitem"], [role="option"], [role="button"], button, a, [cmdk-item], [data-radix-collection-item]')
          : [];
        for (const el of nodes) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
          if (!txt || txt.length > 120) continue;
          const a = el.closest && el.closest("a[href]");
          out.push({
            text: txt.slice(0, 60),
            tag: el.tagName,
            role: el.getAttribute && el.getAttribute("role"),
            testid: el.getAttribute && (el.getAttribute("data-testid") || ""),
            href: a ? a.getAttribute("href") : "",
            blocked: isNavigationalElement(el),
          });
        }
      }
      console.log(`[ImagiPark/ChatGPT] ▼ 메뉴 후보 덤프 (${tag}) — popupRoots=${(roots || []).length}, 항목=${out.length}`);
      out.slice(0, 40).forEach((d, i) =>
        console.log(`  [${i}] "${d.text}" <${d.tag} role=${d.role || "-"} testid=${d.testid || "-"} href=${d.href || "-"}>${d.blocked ? " ⛔차단됨" : ""}`)
      );
      return out;
    } catch (e) {
      console.warn("[ImagiPark/ChatGPT] 메뉴 덤프 실패", e);
      return [];
    }
  }

  async function ensureImageMode() {
    // 🛡 클릭이 다른 대화로 이동시키면 즉시 복귀시키는 최종 안전망.
    //   (finder 의 isNavigationalElement 가 1차 방어지만, ChatGPT UI 변경으로
    //    새 형태의 이동 요소가 매칭될 가능성에 대비해 URL 로도 검증한다)
    const beforePath = location.pathname;
    const assertNoNavigation = async () => {
      const afterPath = location.pathname;
      if (afterPath !== beforePath && /\/c\//.test(afterPath)) {
        console.warn("[ImagiPark/ChatGPT]", `이미지 모드 클릭이 다른 대화로 이동시킴 (${beforePath} → ${afterPath}) — 복귀`);
        try { history.back(); } catch (_) {}
        await sleep(1200);
        throw new Error("이미지 모드 전환 클릭이 이전 대화로 이동했습니다 — 복귀 후 재시도해주세요 (ChatGPT UI 변경 감지)");
      }
    };

    // 이미 켜져 있으면 아무것도 하지 않는다 (사용자가 미리 켜둔 경우 포함)
    if (isImageModeActive()) {
      console.log("[ImagiPark/ChatGPT] 이미지 모드 이미 활성 — 전환 생략");
      return { ok: true, already: true };
    }

    // 이미 노출된 툴 버튼이 있으면 바로 클릭
    const direct = findMenuActionByText(["이미지 만들기", "Create image"], [getComposerForm() || document]);
    if (direct) {
      fireClick(direct);
      await sleep(800);
      await assertNoNavigation();
      return { ok: true, method: "direct" };
    }

    // ── 방법 A: "+" 버튼(#composer-plus-btn) → 메뉴 행(div[tabindex=0][data-fill]) 클릭 ──
    try {
      await openAttachmentMenu();
      const row = findMenuRowByText(["이미지 만들기", "create image"]);
      if (!row) throw new Error("메뉴에 '이미지 만들기' 행 없음");
      // 새 UI 는 pointer 이벤트에 반응 — pointerdown/up + click 을 함께 발생
      try {
        row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        row.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      } catch (_) { /* PointerEvent 미지원 시 아래 click 으로 폴백 */ }
      fireClick(row);
      await sleep(800);
      await assertNoNavigation();
      console.log("[ImagiPark/ChatGPT] 이미지 모드 활성 — '+' 메뉴 방식");
      return { ok: true, method: "plus-menu" };
    } catch (e1) {
      try { document.body.click(); } catch (_) {} // 메뉴 닫기
      await sleep(200);

      // ── 방법 B: 키보드 "@이미지 만들기" → Enter (좌표·창크기 무관, UI 변경에 강함) ──
      try {
        await ensureImageModeByAtMention();
        await assertNoNavigation();
        console.log("[ImagiPark/ChatGPT] 이미지 모드 활성 — '@' 단축키 방식");
        return { ok: true, method: "at-mention" };
      } catch (e2) {
        dumpMenuCandidates("ensureImageMode 실패");
        throw new Error(`이미지 모드 전환 실패 — +메뉴: ${e1.message} / @방식: ${e2.message}`);
      }
    }
  }

  // 이미지 모드를 **끄는** 헬퍼. 스크립트 생성 턴처럼 텍스트 응답을 강제해야 하는
  // 상황에서 호출. ChatGPT 는 composer 상단에 활성 도구 칩(chip)으로 "이미지 만들기"
  // 가 표시되며, 그 칩의 X 버튼을 눌러야 해제된다.
  //
  // 감지 방법(우선순위):
  //   1) aria-label/title 에 "이미지" 가 포함된 **선택 해제(remove)** 버튼 탐색
  //   2) composer 주변의 "pill / chip" 스타일 요소 중 "이미지 만들기" 텍스트를 가진 것
  //      에서 내부의 close 버튼(X, ✕, dismiss 등) 클릭
  //   3) 칩이 안 보이면 이미 이미지 모드가 꺼진 상태로 간주 → noop
  //
  // 이미지 모드가 원래 꺼져있어도 오류 없이 반환(fire-and-forget).
  async function disableImageMode() {
    const form = getComposerForm() || document;

    // 1) 명시적 제거 버튼 탐색
    const removeBtn = Array.from(form.querySelectorAll("button")).find((b) => {
      const al = (b.getAttribute("aria-label") || "").toLowerCase();
      const ti = (b.title || "").toLowerCase();
      const txt = (b.textContent || "").trim();
      const hasImgHint =
        /이미지|image|create image|만들기/i.test(al + " " + ti);
      const looksLikeRemove =
        /remove|제거|dismiss|해제|close/i.test(al + " " + ti) ||
        txt === "✕" || txt === "×" || txt === "X";
      return hasImgHint && looksLikeRemove;
    });
    if (removeBtn) {
      fireClick(removeBtn);
      await sleep(500);
      return true;
    }

    // 2) composer 영역 안의 활성 칩/필 요소에서 close 버튼 찾기
    const chips = Array.from(form.querySelectorAll("[class*='pill'], [class*='chip'], [role='button']"))
      .filter((el) => /이미지 만들기|Create image|이미지/i.test(el.textContent || ""));
    for (const chip of chips) {
      // 칩 내부의 X 버튼 (SVG 아이콘 버튼일 수도 있음)
      const x = chip.querySelector("button") ||
                chip.parentElement?.querySelector('button[aria-label*="remove" i],button[aria-label*="제거"]');
      if (x) {
        fireClick(x);
        await sleep(500);
        return true;
      }
      // 칩 자체가 토글이면 한 번 클릭해 해제 시도 (활성 상태 → 해제)
      if (chip.getAttribute("aria-pressed") === "true" || chip.getAttribute("data-state") === "on") {
        fireClick(chip);
        await sleep(500);
        return true;
      }
    }

    // 3) 칩을 못 찾으면 이미 꺼진 상태
    return false;
  }

  /**
   * 마지막 assistant 메시지에 실제 이미지가 minCount 이상 로드될 때까지 대기.
   * 완료 조건(모두 충족):
   *   1) stop 버튼이 사라짐 (스트리밍 종료)
   *   2) 마지막 메시지가 baseline과 다름 (새 메시지 생성됨)
   *   3) 메시지 안에 http URL 이미지가 minCount 이상, complete + naturalWidth > 100
   *   4) 위 상태가 1.2초간 유지 (URL 교체 방지)
   * 실패 조건:
   *   - 텍스트만 안정화되고 이미지 없음이 20초 유지 → 거절/모드 꺼짐으로 간주하고 throw
   *   - 타임아웃 (기본 10분)
   */
  /**
   * 응답 메시지 주변에서 "응답 완료" 신호(피드백/복사/편집 등 액션 버튼) 감지.
   * ChatGPT는 응답이 완전히 끝나야만 이 버튼들을 렌더링하므로 가장 확실한 완료 신호.
   */
  function findMessageContainer(el) {
    if (!el) return null;
    return (
      el.closest("article") ||
      el.closest('[data-testid^="conversation-turn"]') ||
      el.parentElement?.parentElement ||
      el
    );
  }

  // 문서 전체의 "이미지 전용" 액션 버튼(👍/👎 이미지) 개수.
  // ChatGPT 는 이미지가 실제로 렌더링 완료된 턴에만 이 두 testid 를 달아주므로
  // "이미지 생성 완료" 판정의 가장 확실한 단일 신호로 사용.
  // (일반 텍스트 응답에는 good-response-turn-action-button 이 달리고,
  //  이미지 응답에는 good-image-/ bad-image- 가 붙음 — 분리된 testid 임을 이용.)
  function countImageActionButtons() {
    return document.querySelectorAll(
      '[data-testid="good-image-turn-action-button"],' +
      '[data-testid="bad-image-turn-action-button"]'
    ).length;
  }

  // 문서 전체의 "good-response" 버튼 개수를 리턴.
  // 어시스턴트 응답이 완료될 때마다 하나씩 추가되므로, baseline과 비교하면
  // "새 응답이 완료됐는지" 정확하게 판별 가능.
  function countGoodResponseButtons() {
    // testid 우선
    const byTid = document.querySelectorAll(
      '[data-testid="good-response-turn-action-button"]'
    );
    if (byTid.length) return byTid.length;
    // fallback: aria-label 정확 매칭
    let n = 0;
    document.querySelectorAll("button").forEach((b) => {
      const al = (b.getAttribute("aria-label") || "").trim();
      if (/^(Good response|좋은 응답)$/i.test(al)) n++;
    });
    return n;
  }

  // 실제 로드된 이미지 (엄격)
  function countLoadedImages() {
    return Array.from(document.querySelectorAll("img")).filter((i) => {
      const src = i.currentSrc || i.src || "";
      return /^(https?:|blob:|data:image\/)/i.test(src) && i.complete && i.naturalWidth > 80;
    }).length;
  }

  // 모든 <img> 태그 개수 (로드 상태 무시). 새 이미지가 아직 로드 안 됐어도 DOM에는 추가됨.
  function countAllImgElements() {
    // src가 있는 것만 (자리표시자 placeholder 제외)
    return Array.from(document.querySelectorAll("img")).filter((i) => {
      const src = i.currentSrc || i.src || i.getAttribute("src") || "";
      return src.length > 0;
    }).length;
  }

  // "이미지 편집" / "Edit image" 텍스트가 있는 요소 개수.
  // 이미지가 생성됐을 때만 이 UI가 나타남.
  function countImageEditButtons() {
    let n = 0;
    // 버튼/링크/role 요소 + 모든 텍스트 포함 검사
    document.querySelectorAll("button, [role='button'], a, span").forEach((el) => {
      const s = (el.innerText || el.textContent || "").trim();
      if (!s) return;
      if (/^\s*이미지 편집\s*$/i.test(s) || /^\s*Edit image\s*$/i.test(s)) n++;
    });
    return n;
  }

  // 마지막 assistant 메시지 DOM의 후손 노드 수 — 컨텐츠가 추가되면 증가
  function countLastMessageDescendants() {
    const el = getLastAssistantMessage();
    if (!el) return 0;
    return el.querySelectorAll("*").length;
  }

  /**
   * 근본적 방법: 문서 전체의 img src URL을 스냅샷으로 저장 후
   * 스냅샷에 없는 새 URL의 이미지가 등장하는지 MutationObserver + 폴링으로 추적.
   *
   * ChatGPT가 생성한 이미지는 매번 고유한 URL을 가지므로(sdmntpr...oaiusercontent.com 등)
   * 스냅샷 비교만으로 정확히 "새 생성 이미지"를 식별할 수 있음.
   */
  // 이미지 감지 후 "SSE 스트림이 실제로 닫힐 때까지" 추가 대기.
  // 이유: fid 는 스트림 중간에 내려와서 `_netImageQueue` 에 들어가지만,
  // 서버는 그 후에도 수백ms~수초 동안 toolcall·메시지 종료 이벤트를 더 내려보낸다.
  // 이 동안 다음 프롬프트를 전송하면 이전 응답이 중단되어 이미지 생성이 실패 처리됨.
  // `_netStreamClosedAt` 은 fetch hook 의 reader done 에서만 기록되므로 가장 확실한 종료 신호.
  //
  // sinceMs: 이 시각 이후에 닫힌 스트림만 인정. detectedAt 기반으로 넘기면 "이번 턴의 스트림 종료" 만 유효.
  // maxMs: 안전장치 — 닫힘 신호가 유실돼도 영원히 걸리지 않도록 상한.
  async function waitForStreamSealed(sinceMs, maxMs = 5000) {
    const t0 = Date.now();
    // 이미 닫혔으면 즉시 통과
    if (_netStreamClosedAt >= sinceMs) return true;
    while (Date.now() - t0 < maxMs) {
      if (window.__IMAGIPARK_ABORTED__) return false;
      if (_netStreamClosedAt >= sinceMs) {
        // 닫힌 직후 작은 안정화 창 (DOM 최종 업데이트·action 버튼 부착 여유)
        await sleep(250);
        return true;
      }
      await sleep(100);
    }
    console.warn("[ImagiPark/ChatGPT] waitForStreamSealed 타임아웃 — 스트림 닫힘 신호 미수신, 진행");
    return false;
  }

  // imgActions 경로에서 src/fid 를 못 찾은 채 반복된 시간 (hang 방지 게이지)
  // 전역 변수로 두되, 각 waitForImagesInLastMessage 호출마다 지역적으로 리셋.
  async function waitForImagesInLastMessage(minCount, timeoutMs = 10 * 60 * 1000) {
    // "imgActions 가 fired 됐지만 src/fid 없음" 이 처음 관찰된 시각
    let imgActionsEmptySince = 0;
    // 상한 — 이 시간을 넘기면 마지막 시도 후 DOM 전체 강제 스캔하여 뭐라도 찾거나 포기
    const IMG_ACTIONS_EMPTY_MAX_MS = 60000;
    // ---- URL 정규화 ----
    // ChatGPT 가 이미지를 리렌더링할 때 ts/timestamp/signature 같은 쿼리 파라미터를
    // 주기적으로 갱신한다. 같은 파일(file_ID)인데 쿼리만 바뀐 URL 을 "새 이미지"로 오인하지
    // 않도록, 동적 파라미터를 제거한 "정규 URL"을 사용해 비교한다.
    //
    // file_ID 만 있는 경우도 많으므로, 가능하면 pathname 의 file_* 추출도 백업 키로 사용.
    const DYNAMIC_PARAMS = [
      "ts", "t", "timestamp", "_ts", "sig", "signature",
      "token", "expires", "Expires", "X-Amz-Date", "X-Amz-Expires", "X-Amz-Signature",
    ];
    const normalizeImgSrc = (src) => {
      if (!src) return "";
      // data: URL 은 해시가 이미 짧기도 하고 변경도 드묾 — 그대로
      if (/^data:/i.test(src)) return src;
      try {
        const u = new URL(src, location.origin);
        for (const p of DYNAMIC_PARAMS) u.searchParams.delete(p);
        // 남은 파라미터들도 file_id 만 남기는 식으로 핵심 식별자 추출 시도
        const fid = u.searchParams.get("id") || u.searchParams.get("file_id") || "";
        const core = (u.origin + u.pathname + (fid ? "#id=" + fid : "")).toLowerCase();
        return core;
      } catch (_) {
        return src.split("?")[0].toLowerCase();
      }
    };
    // URL 에 file_ID 가 보이면 그것만으로도 중복 식별 키 추가
    const extractFileId = (src) => {
      if (!src) return "";
      const m = src.match(/file[_-]([A-Za-z0-9]{16,})/);
      return m ? m[1] : "";
    };

    // ---- 1. baseline 스냅샷 ----
    const takeSrcSnapshot = () => {
      const set = new Set();
      document.querySelectorAll("img").forEach((img) => {
        const src = img.currentSrc || img.src || img.getAttribute("src") || "";
        if (src) {
          set.add(normalizeImgSrc(src));
          const fid = extractFileId(src);
          if (fid) set.add("fid:" + fid);
        }
      });
      return set;
    };
    const initialSrcs = takeSrcSnapshot();
    // ★ 모듈 전역의 "이미 반환한 적 있는 fid" 를 baseline 에 합쳐, 과거 턴 이미지가
    //   DOM 에서 제거됐다 다시 붙더라도 "새 이미지" 로 오판되지 않게 한다.
    for (const oldFid of _lifetimeSeenFids) initialSrcs.add("fid:" + oldFid);
    const baselineEl = getLastAssistantMessage();

    // ───── 🅰 턴 스코프 락 — 이번 전송으로 새로 생긴 assistant turn 을 특정 ─────
    // ChatGPT 가 다른 턴을 재렌더링해도 이번 턴 컨테이너 내부만 보고 판정하도록
    // 전역 카운트 오염 문제를 원천 차단. baseline 은 호출 시점의 turn 집합.
    const TURN_SELECTOR =
      '[data-testid^="conversation-turn-"], article[data-testid^="conversation-turn"]';
    const baselineTurnIds = new Set(
      Array.from(document.querySelectorAll(TURN_SELECTOR))
        .map((el) => el.getAttribute("data-testid") || "")
        .filter(Boolean)
    );
    function findNewAssistantTurnContainer() {
      const turns = Array.from(document.querySelectorAll(TURN_SELECTOR));
      // 역순: 가장 최근에 추가된 assistant turn 을 우선
      for (let i = turns.length - 1; i >= 0; i--) {
        const el = turns[i];
        const tid = el.getAttribute("data-testid") || "";
        if (!tid || baselineTurnIds.has(tid)) continue;
        // assistant 메시지를 포함하는 turn 만 채택 (user turn 제외)
        if (el.querySelector('[data-message-author-role="assistant"]')) return el;
      }
      return null;
    }
    function countImageActionsIn(root) {
      if (!root) return 0;
      return root.querySelectorAll(
        '[data-testid="good-image-turn-action-button"],' +
        '[data-testid="bad-image-turn-action-button"]'
      ).length;
    }

    // ───── 🅱 네트워크 훅 baseline — 이 시점 이후에 들어오는 fid 만 취급 ─────
    const netBaselineIdx = _netImageQueue.length;
    // Rate limit baseline — 이 turn 시작 이후에 발생한 rate limit 만 처리
    const rateLimitBaselineAt = Date.now();

    // 새 이미지 src인지 판별 — 정규 URL 과 file_ID 둘 다 baseline 에 없어야 통과
    const isNewGeneratedImgSrc = (src) => {
      if (!src) return false;
      if (/^data:image\/svg/i.test(src)) return false;
      if (!/^(https?:|blob:|data:image\/(png|jpe?g|webp|gif))/i.test(src)) return false;
      if (src.length < 20) return false;
      const norm = normalizeImgSrc(src);
      if (initialSrcs.has(norm)) return false;          // 같은 URL (정규화 후)
      const fid = extractFileId(src);
      if (fid && initialSrcs.has("fid:" + fid)) return false; // 같은 file_ID (쿼리만 달라진 경우)
      return true;
    };

    // ---- 2. MutationObserver로 실시간 감지 ----
    let detectedSrc = null;
    let detectedAt = 0;
    let detectedFid = null;

    // 중복·재렌더 방어는 URL 정규화(initialSrcs) + sidepanel 의 _seenFileIds 에 위임.
    // 지오그래픽(DOM 스코프) 체크는 ChatGPT/Gemini 의 DOM 구조 차이로 오판 여지가 커서 제거.
    const tryImg = (img) => {
      if (detectedSrc) return;
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      if (!isNewGeneratedImgSrc(src)) return;
      detectedSrc = src;
      detectedFid = extractFileId(src);
      detectedAt = Date.now();
      console.log("[ImagiPark/ChatGPT] 새 이미지 감지:", src.slice(0, 100), "fid=" + detectedFid);
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (detectedSrc) return;
        // 새 노드 추가
        if (m.addedNodes && m.addedNodes.length) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.tagName === "IMG") {
              tryImg(node);
            } else if (node.querySelectorAll) {
              node.querySelectorAll("img").forEach(tryImg);
            }
          }
        }
        // img의 src/srcset 속성 변경
        if (m.type === "attributes" && m.target && m.target.tagName === "IMG") {
          tryImg(m.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });

    // ---- 3. 폴링 루프 ----
    // 완료 판단 우선순위:
    //   🅱 [G0] 네트워크 훅 — 새 fid 가 SSE 로 수신됨 + !streaming + 400ms 안정 → 즉시 완료
    //   🅰 [G1] 턴 스코프 imgActions — 이번 턴 컨테이너 내부의 👍/👎 이미지 버튼 +1s
    //   [G2] (폴백) 전역 imgActions 증가 +1s (컨테이너를 못 찾을 때만)
    //   [G3] 이미지 URL 감지 + !streaming + 1.5s
    //   [G4] 텍스트만 끝나고 90s 경과 → 실패
    const t0 = Date.now();
    const turnStartAt = t0;
    const baselineButtons = document.querySelectorAll("button").length;
    const baselineImgActionsGlobal = countImageActionButtons();
    const baselineAssistantCount = countAssistantMessages();
    let newMessageAppeared = false;
    let actionsIncreasedSince = 0;
    let imgActionsSince = 0;   // G1/G2 안정화 타이머
    let netGateSince = 0;      // G0 안정화 타이머
    let lastProgressLog = 0;

    try {
      while (Date.now() - t0 < timeoutMs) {
        checkAbort();

        // ✋ 사용자 수동 완료 신호 — DOM detection 못 했어도 즉시 종료 (사용자 화면엔 보임)
        if (consumeManualComplete()) {
          console.log("[ImagiPark/ChatGPT] ✋ 사용자 수동 완료 신호 — 이미지 대기 즉시 종료 (detectedSrc=" + (detectedSrc ? "yes" : "no") + ")");
          await sleep(200);
          return { detectedSrc: detectedSrc || null, fileId: detectedFid || null };
        }

        // 🚦 Rate limit 선감지 — 이번 turn 시작 이후 429 신호가 왔으면 바로 특수 에러 throw
        //  - 네트워크 훅(_rateLimitAt) + DOM 메시지 텍스트 스캔 두 경로
        if (_rateLimitAt >= rateLimitBaselineAt) {
          const err = new Error(
            "ChatGPT rate limit — " + _rateLimitWaitSec + "초 대기 후 재시도 필요"
          );
          err.__rateLimit__ = true;
          err.waitSec = _rateLimitWaitSec;
          throw err;
        }
        // DOM 백업 검사 — 네트워크 훅이 놓쳐도 메시지 본문에 에러가 노출되는 경우
        const _lastMsgEl = getLastAssistantMessage();
        if (_lastMsgEl) {
          const _txt = (_lastMsgEl.innerText || _lastMsgEl.textContent || "");
          if (_txt && /generating images too quickly|rate[_\s-]?limit|too many image requests|3\s*분\s*후에\s*다시/i.test(_txt)) {
            const mWait = _txt.match(/(\d+)\s*(minute|min|분)/i);
            const waitSec = mWait ? (parseInt(mWait[1], 10) * 60) : 180;
            const err = new Error("ChatGPT rate limit (DOM) — " + waitSec + "초 대기 후 재시도 필요");
            err.__rateLimit__ = true;
            err.waitSec = waitSec;
            throw err;
          }
        }

        // 새 메시지 감지 (응답 시작 판정용) — 3중 신호 중 하나라도 뜨면 시작으로 인정
        //  (1) 마지막 assistant 엘리먼트가 baseline 과 다름 (React DOM 교체 대응)
        //  (2) assistant 메시지 수가 baseline 대비 증가 (엘리먼트 재사용되는 경우 대비)
        //  (3) 네트워크 훅이 이번 턴 이후 활동 감지 (fid 수신 OR stream closed)
        //      → 이미지 SSE 가 돌고있으면 DOM 렌더링이 늦어도 "응답 시작" 확정
        const el = getLastAssistantMessage();
        if (el && el !== baselineEl) newMessageAppeared = true;
        if (countAssistantMessages() > baselineAssistantCount) newMessageAppeared = true;
        if (_netImageQueue.length > netBaselineIdx) newMessageAppeared = true;
        if (_netStreamClosedAt > turnStartAt || _netStreamCompleteAt > turnStartAt) newMessageAppeared = true;

        // 응답 시작 타임아웃 (60초로 확장) — DOM·네트워크 모두 조용할 때만 실패 판정
        const startStall = Date.now() - t0 > 60000;
        const stopBtn = getStopButton();
        if (!newMessageAppeared && !stopBtn && startStall) {
          throw new Error(
            "응답이 시작되지 않았습니다. 전송이 실패했거나 ChatGPT가 메시지를 수신하지 못했습니다."
          );
        }

        const streaming = !!stopBtn;

        // 턴 스코프 컨테이너 — 매 루프 재탐색 (React 가 노드 교체할 수 있음)
        const thisTurnEl = findNewAssistantTurnContainer();

        // Observer 백업 이미지 스캔 — 턴 컨테이너 우선
        if (!detectedSrc) {
          if (thisTurnEl) {
            thisTurnEl.querySelectorAll("img").forEach(tryImg);
          } else {
            document.querySelectorAll("img").forEach(tryImg);
          }
        }

        // ═════════════════════════════════════════════════════════════
        // G0. 🅱 네트워크 훅 — 이 호출 baseline 이후 수신된 새 fid 확인
        // ═════════════════════════════════════════════════════════════
        // SSE 스트림이 fid 를 먼저 내려주므로 DOM 이 늦게 렌더돼도 확정 가능.
        // !streaming + 400ms 안정이면 즉시 완료. DOM 에 아직 src 가 없으면
        // 짧은 재폴링으로 확보 시도 후, 실패 시 fid 만으로 반환.
        const netNew = _netImageQueue
          .slice(netBaselineIdx)
          .filter((q) => !_lifetimeSeenFids.has(q.fid));
        if (netNew.length && !streaming) {
          if (!netGateSince) netGateSince = Date.now();
          if (Date.now() - netGateSince >= 400) {
            const targetFid = netNew[netNew.length - 1].fid;
            let srcHit = "";
            const findSrcByFid = () => {
              const scan = (root) => {
                const imgs = root.querySelectorAll("img");
                for (const im of imgs) {
                  const s = im.currentSrc || im.src || im.getAttribute("src") || "";
                  if (extractFileId(s) === targetFid) return s;
                }
                return "";
              };
              return (thisTurnEl && scan(thisTurnEl)) || scan(document.body);
            };
            srcHit = findSrcByFid();
            // 아직 DOM 에 안 붙었으면 최대 1s 짧게 재폴링
            for (let k = 0; !srcHit && k < 10; k++) {
              await sleep(100);
              srcHit = findSrcByFid();
            }
            detectedFid = targetFid;
            detectedSrc = srcHit || detectedSrc || "";
            _lifetimeSeenFids.add(targetFid);
            // 🔒 SSE 스트림 실제 종료까지 추가 대기 — 다음 턴 전송 시 이전 응답 중단 방지
            await waitForStreamSealed(Date.now(), 8000);
            console.log(
              "[ImagiPark/ChatGPT] 완료(🅱 네트워크 훅) fid=" + targetFid +
                " src=" + !!srcHit +
                " netQ=" + _netImageQueue.length +
                " streamClosed=" + (_netStreamClosedAt > 0) +
                " lifetimeSeen=" + _lifetimeSeenFids.size
            );
            return { detectedSrc, fileId: detectedFid };
          }
        } else {
          netGateSince = 0;
        }

        // ═════════════════════════════════════════════════════════════
        // G1/G2. 🅰 이미지 액션 버튼 — 턴 스코프 우선, 못 찾으면 전역 fallback
        // ═════════════════════════════════════════════════════════════
        let scopedImgActions = 0;
        let globalImgActions = countImageActionButtons();
        let scopeMode = "global";
        let condition = false;
        if (thisTurnEl) {
          scopedImgActions = countImageActionsIn(thisTurnEl);
          scopeMode = "scoped";
          condition = scopedImgActions > 0 && !streaming;
        } else {
          condition = globalImgActions > baselineImgActionsGlobal && !streaming;
        }

        if (condition) {
          if (!imgActionsSince) imgActionsSince = Date.now();
          if (Date.now() - imgActionsSince >= 1000) {
            // detectedSrc 보강 스캔
            if (!detectedSrc) {
              const scanRoots = thisTurnEl
                ? [thisTurnEl, document.body]
                : [getLastAssistantMessage(), document.body].filter(Boolean);
              const scanOnce = (strict) => {
                for (const root of scanRoots) {
                  const imgs = root.querySelectorAll("img");
                  for (const im of imgs) {
                    const s = im.currentSrc || im.src || im.getAttribute("src") || "";
                    if (!isNewGeneratedImgSrc(s)) continue;
                    if (strict && !(im.complete && im.naturalWidth > 80)) continue;
                    if (!strict && !extractFileId(s)) continue;
                    return { src: s, fid: extractFileId(s) };
                  }
                }
                return null;
              };
              let hit = scanOnce(true) || scanOnce(false);
              for (let k = 0; !hit && k < 5; k++) {
                await sleep(100);
                hit = scanOnce(true) || scanOnce(false);
              }
              if (hit) {
                detectedSrc = hit.src;
                detectedFid = hit.fid;
                detectedAt = Date.now();
              }
            }
            // 🛡 실제로 이미지를 찾지 못했으면 반환하지 말 것 (bounded).
            // 이전 턴에서 남은 버튼, 도구/모델 피커, 응답 액션 등이 global 카운트를
            // 부풀려 imgActions 조건이 오인 발화하는 경우가 있음. detectedSrc/detectedFid
            // 가 모두 비어있으면 실제 이미지 생성이 아닌 것이므로 루프 계속 + 타이머 리셋.
            // 단, 60초 이상 이 상태가 지속되면 hang 방지를 위해 최종 강제 스캔 → 실패 throw.
            if (!detectedSrc && !detectedFid) {
              if (!imgActionsEmptySince) imgActionsEmptySince = Date.now();
              const emptyElapsed = Date.now() - imgActionsEmptySince;

              // 60초 넘게 "버튼은 있는데 이미지 못 찾음" 상태면 강제 최종 스캔
              if (emptyElapsed > IMG_ACTIONS_EMPTY_MAX_MS) {
                console.warn(
                  "[ImagiPark/ChatGPT] ⚠️ imgActions 발화 후 " + Math.floor(emptyElapsed / 1000) +
                  "s 동안 이미지 감지 실패 — DOM 전역 강제 스캔"
                );
                // 모든 img 태그를 보고 가장 최근에 추가된 큰 이미지를 골라 반환
                const allImgs = Array.from(document.querySelectorAll("img"));
                let best = null;
                for (const im of allImgs) {
                  const s = im.currentSrc || im.src || im.getAttribute("src") || "";
                  if (!s || s.length < 20) continue;
                  if (!/^(https?:|blob:|data:image\/(png|jpe?g|webp))/i.test(s)) continue;
                  if (initialSrcs.has(normalizeImgSrc(s))) continue;
                  const fid = extractFileId(s);
                  if (fid && _lifetimeSeenFids.has(fid)) continue;
                  // 이미지 크기가 충분히 큰 것만 (avatar·icon 제외)
                  if (im.complete && im.naturalWidth > 200) {
                    if (!best || im.naturalWidth > best.w) {
                      best = { src: s, fid, w: im.naturalWidth };
                    }
                  }
                }
                if (best) {
                  detectedSrc = best.src;
                  detectedFid = best.fid;
                  if (detectedFid) _lifetimeSeenFids.add(detectedFid);
                  await waitForStreamSealed(Date.now(), 8000);
                  console.log(
                    "[ImagiPark/ChatGPT] 완료(🅰 강제 스캔 최종) fid=" + (detectedFid || "-") +
                    " w=" + best.w + " lifetimeSeen=" + _lifetimeSeenFids.size
                  );
                  return { detectedSrc, fileId: detectedFid };
                }
                throw new Error(
                  "이미지 생성 액션 버튼은 나타났으나 " + Math.floor(emptyElapsed / 1000) +
                  "s 동안 이미지 src/fid 를 확보하지 못했습니다. ChatGPT UI 변경 가능성."
                );
              }

              // 상한 이내면 루프 계속 (타이머 리셋해 다음 stabilization 대기)
              console.warn(
                "[ImagiPark/ChatGPT] ⚠️ imgActions 조건 발화했지만 이미지 src/fid 확보 실패 — 루프 계속 " +
                Math.floor(emptyElapsed / 1000) + "s/" + Math.floor(IMG_ACTIONS_EMPTY_MAX_MS / 1000) + "s " +
                "(scoped=" + scopedImgActions + " global=" + globalImgActions + "/" + baselineImgActionsGlobal + ")"
              );
              imgActionsSince = 0;
            } else {
              imgActionsEmptySince = 0; // 감지 성공 — 타이머 리셋
              if (detectedFid) _lifetimeSeenFids.add(detectedFid);
              // 🔒 SSE 스트림 실제 종료까지 추가 대기
              await waitForStreamSealed(Date.now(), 8000);
              console.log(
                "[ImagiPark/ChatGPT] 완료(🅰 imgActions +1s, " + scopeMode +
                  ") scoped=" + scopedImgActions +
                  " global=" + globalImgActions + "/" + baselineImgActionsGlobal +
                  " detectedSrc=" + !!detectedSrc +
                  " fid=" + (detectedFid || "-") +
                  " streamClosed=" + (_netStreamClosedAt > 0) +
                  " lifetimeSeen=" + _lifetimeSeenFids.size
              );
              return { detectedSrc, fileId: detectedFid };
            }
          }
        } else {
          imgActionsSince = 0;
        }

        // ═════════════════════════════════════════════════════════════
        // G3. 이미지 URL 감지 + !streaming + 1.5s (DOM 기반 성공 경로)
        // ═════════════════════════════════════════════════════════════
        if (detectedSrc && !streaming && Date.now() - detectedAt >= 1500) {
          if (detectedFid) _lifetimeSeenFids.add(detectedFid);
          // 🔒 SSE 스트림 실제 종료까지 추가 대기 (DOM-only 경로는 특히 중요)
          await waitForStreamSealed(Date.now(), 8000);
          console.log(
            "[ImagiPark/ChatGPT] 완료(G3 URL 감지) fid=" +
              (detectedFid || "-") +
              " streamClosed=" + (_netStreamClosedAt > 0) +
              " lifetimeSeen=" + _lifetimeSeenFids.size
          );
          await sleep(300);
          return { detectedSrc, fileId: detectedFid };
        }

        // ═════════════════════════════════════════════════════════════
        // G4. 텍스트만 끝나고 90초 경과 → 실패
        // ═════════════════════════════════════════════════════════════
        const curButtons = document.querySelectorAll("button").length;
        const buttonsIncreased = curButtons >= baselineButtons + 3;
        if (!streaming && buttonsIncreased && newMessageAppeared && !detectedSrc && !netNew.length) {
          if (!actionsIncreasedSince) actionsIncreasedSince = Date.now();
          if (Date.now() - actionsIncreasedSince >= 90000) {
            throw new Error(
              "응답은 종료됐지만 이미지가 DOM에 나타나지 않았습니다 (90초 초과). 모델이 이미지를 생성하지 못했거나 차단됐을 수 있습니다."
            );
          }
        } else if (!buttonsIncreased) {
          actionsIncreasedSince = 0;
        }

        // 진행 로그
        const elapsed = Math.floor((Date.now() - t0) / 1000);
        if (elapsed > 0 && elapsed % 30 === 0 && elapsed !== lastProgressLog) {
          lastProgressLog = elapsed;
          console.log(
            `[ImagiPark/ChatGPT] 이미지 대기 ${elapsed}s (detectedSrc=${!!detectedSrc}, streaming=${streaming}, turn=${thisTurnEl ? "scoped" : "global"}, scopedImgActions=${scopedImgActions}, globalImgActions=${globalImgActions}/${baselineImgActionsGlobal}, netQ=${_netImageQueue.length - netBaselineIdx})`
          );
        }

        await sleep(400);
      }
      throw new Error(
        `이미지 생성 타임아웃 (${Math.floor(timeoutMs / 60000)}분). 이미지가 DOM에 추가되지 않았습니다.`
      );
    } finally {
      observer.disconnect();
    }
  }

  /**
   * 파일(이미지)을 composer에 첨부. ChatGPT는 paste 이벤트에 File을 실어
   * DataTransfer로 전달하면 이미지 업로드 UI로 인식함.
   * @param {Array<{mime:string,b64:string,name?:string}>} specs
   */
  async function attachFiles(specs) {
    if (!Array.isArray(specs) || !specs.length) return 0;
    const el = getComposer();
    if (!el) throw new Error("Composer not found (attachFiles)");
    el.focus();

    const dt = new DataTransfer();
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const bin = atob(s.b64);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      const file = new File([bytes], s.name || ("ref_" + (i + 1) + ".png"), {
        type: s.mime || "image/png",
      });
      try { dt.items.add(file); } catch (e) { console.warn("[ImagiPark/ChatGPT] add file failed", e); }
    }

    const ev = new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    if (!ev.clipboardData) {
      try { Object.defineProperty(ev, "clipboardData", { value: dt }); } catch (_) {}
    }
    el.dispatchEvent(ev);

    // 업로드 UI가 composer 주변에 렌더될 때까지 대기 (썸네일·progress 등장)
    await sleep(1500);
    return specs.length;
  }

  window.__IMAGIPARK_DOM__ = {
    SELECTORS,
    sleep,
    waitFor,
    setAbortChecker,
    clearAbortChecker,
    getComposer,
    getSendButton,
    getStopButton,
    setPromptText,
    clickSend,
    waitForResponseComplete,
    getLastAssistantText,
    countAssistantMessages,
    openAttachmentMenu,
    clickMenuItemByText,
    ensureImageMode,
    isImageModeActive,
    isAttachmentMenuOpen,
    ensureChatMode,
    dumpMenuCandidates,
    disableImageMode,
    waitForImagesInLastMessage,
    attachFiles,
    setManualComplete,
    consumeManualComplete,
  };
})();
