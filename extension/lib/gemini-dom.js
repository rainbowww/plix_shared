// IMAGIPARK — Gemini DOM 유틸
// 셀렉터는 fallback 배열로 관리 (Gemini UI도 자주 변경됨).
// Gemini는 Angular + Material + Quill 기반이라 ChatGPT와 구조가 크게 다름.
(function () {
  "use strict";

  const SELECTORS = {
    // Gemini 입력창: Quill(.ql-editor) contenteditable
    composer: [
      'rich-textarea .ql-editor[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"]',
    ],
    // 전송(보내기) 버튼
    sendButton: [
      'button.send-button',
      'button[aria-label*="보내기" i]',
      'button[aria-label*="Send message" i]',
      'button[aria-label*="Send" i]',
      'button[mattooltip*="Send" i]',
      'button[mattooltip*="보내" i]',
      'send-button button',
      '.send-button-container button',
    ],
    // 응답 중단(정지) 버튼
    stopButton: [
      'button.stop',
      'button[aria-label*="중지" i]',
      'button[aria-label*="Stop" i]',
      'button[aria-label*="응답 중지" i]',
      'button[aria-label*="Stop response" i]',
      'button[mattooltip*="Stop" i]',
      'button[mattooltip*="중지" i]',
      'stop-button button',
    ],
    // 도구/+ 버튼 — Gemini 입력 영역 좌하단의 "도구" 드로어 토글
    //   사용자 환경 확인된 HTML 기반 selector:
    //     <button mat-icon-button class="...toolbox-drawer-button..." aria-label="도구" aria-haspopup="menu">
    //   이 3가지 단서는 사이드바 케밥 메뉴에 없으므로 글로벌 검색해도 안전함.
    attachButton: [
      'button.toolbox-drawer-button[aria-haspopup="menu"]',
      'button.toolbox-drawer-button',
      'button[aria-label="도구"][aria-haspopup="menu"]',
      'button[aria-label="도구"]',
      'button[aria-label="Tools"][aria-haspopup="menu"]',
      'button[aria-label="Tools"]',
      // 부분 매칭 (라벨이 "도구 메뉴" 같은 변형 케이스 대비)
      'button[aria-label*="도구" i][aria-haspopup="menu"]',
      'button[aria-label*="Tools" i][aria-haspopup="menu"]',
      // 구버전 호환
      'toolbox-drawer-button button',
      '[class*="toolbox-drawer-button"]',
      'button[mattooltip*="도구" i]',
    ],
    // 드로어/메뉴 아이템 — Gemini DOM 변경 이력:
    //   • 구버전: <toolbox-drawer-item> + role=menuitem + aria-pressed
    //   • 신버전: <button class="toolbox-drawer-item-list-button"> + role=menuitemcheckbox + aria-checked
    menuItem: [
      'button.toolbox-drawer-item-list-button',
      'button[role="menuitemcheckbox"]',
      'toolbox-drawer-item button',
      'toolbox-drawer-item',
      '[role="menuitem"]',
      '[role="option"]',
      '.mat-mdc-menu-item',
      'button.mat-mdc-menu-item',
      'div[role="menu"] button',
    ],
    // 모델 응답 (Gemini는 model-response / message-content 커스텀 엘리먼트)
    assistantMessage: [
      'model-response',
      'message-content.model-response-text',
      'message-content',
      '.model-response-text',
      '.response-container .markdown',
    ],
    // 응답 컨테이너 (턴 단위)
    responseContainer: [
      'response-container',
      '.conversation-container',
      '[data-test-id="response"]',
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
  // 사용자 화면에는 응답이 보이는데 ImagiPark 가 detection 못 해 무한 대기하는 케이스 대비.
  // 사이드패널 버튼 → bridge → setManualComplete() → 대기 루프에서 즉시 완료 처리.
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

  // 입력창 컨테이너 안에 있는 contenteditable 만 composer 로 인정.
  // 모델 응답(model-response, response-container, message-content) 안의
  // contenteditable(예: 응답 인라인 편집 필드, 이미지 재생성 시 자동 추가되는 입력 영역)을
  // composer 로 오인하면 텍스트가 엉뚱한 곳으로 주입되어 전송이 무효화되는 회귀 발생.
  function _isInsideResponseArea(el) {
    if (!el) return false;
    return !!(
      el.closest("model-response") ||
      el.closest("response-container") ||
      el.closest("message-content") ||
      el.closest('[class*="response-container"]') ||
      el.closest('[class*="model-response"]')
    );
  }
  function _isInsideInputArea(el) {
    if (!el) return false;
    return !!(
      el.closest("rich-textarea") ||
      el.closest("input-area-v2") ||
      el.closest(".input-area-container") ||
      el.closest('[class*="input-area"]')
    );
  }
  function getComposer() {
    // 1) input-area 안에 있는 .ql-editor 우선 — 가장 신뢰할 수 있는 매칭
    for (const sel of SELECTORS.composer) {
      const cands = document.querySelectorAll(sel);
      for (const c of cands) {
        if (!c) continue;
        if (c.offsetParent === null) continue;             // 보이지 않으면 skip
        if (_isInsideResponseArea(c)) continue;            // 응답 영역 내부 편집 필드 차단
        if (!_isInsideInputArea(c)) continue;              // 입력 영역에 속하지 않으면 skip
        return c;
      }
    }
    // 2) 그래도 못 찾으면 입력 영역 필터를 풀고 응답영역만 차단 — 마지막 fallback
    for (const sel of SELECTORS.composer) {
      const cands = document.querySelectorAll(sel);
      for (const c of cands) {
        if (!c) continue;
        if (c.offsetParent === null) continue;
        if (_isInsideResponseArea(c)) continue;
        return c;
      }
    }
    return null;
  }

  function getComposerForm() {
    const c = getComposer();
    if (!c) return null;
    return (
      c.closest("input-area-v2") ||
      c.closest(".input-area-container") ||
      c.closest("form") ||
      c.closest('[class*="input-area"]') ||
      c.closest('rich-textarea')?.parentElement ||
      c.parentElement?.parentElement?.parentElement ||
      null
    );
  }

  function findSendButtonHeuristic() {
    const form = getComposerForm();
    if (!form) return null;
    const btns = Array.from(form.querySelectorAll("button")).filter(
      (b) => b.offsetParent !== null
    );
    if (!btns.length) return null;
    btns.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.right - ra.right;
    });
    const kw = /(send|submit|보내|전송)/i;
    const preferred = btns.find((b) => {
      const al =
        (b.getAttribute("aria-label") || "") + " " +
        (b.getAttribute("mattooltip") || "") + " " +
        (b.title || "");
      return kw.test(al);
    });
    return preferred || btns[0];
  }

  function isStopMode(btn) {
    if (!btn) return false;
    const s =
      (btn.getAttribute("aria-label") || "") + " " +
      (btn.getAttribute("mattooltip") || "") + " " +
      (btn.title || "") + " " +
      (btn.className || "");
    return /(stop|중지|중단|stop response|응답 중지)/i.test(s);
  }

  function getSendButton() {
    const set = new Set();
    for (const s of SELECTORS.sendButton) {
      document.querySelectorAll(s).forEach((b) => set.add(b));
    }
    const heu = findSendButtonHeuristic();
    if (heu) set.add(heu);
    for (const b of set) {
      if (!b) continue;
      if (isStopMode(b)) continue;
      if (b.offsetParent === null) continue;
      return b;
    }
    return null;
  }

  function getStopButton() {
    // 이전 안정 동작으로 복구 — `_isInsideResponseArea` 차단을 제거.
    // (응답 영역 ghost 버튼 회귀는 waitForResponseComplete 의 stop-무관 fallback 으로 차단)
    for (const s of SELECTORS.stopButton) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null) return el;
    }
    const form = getComposerForm();
    if (form) {
      const btns = Array.from(form.querySelectorAll("button"));
      for (const b of btns) {
        if (isStopMode(b) && b.offsetParent !== null) return b;
      }
    }
    // Gemini는 send-button이 응답 중에 stop 역할로 바뀌기도 함
    const send = document.querySelector("button.send-button, send-button button");
    if (send && isStopMode(send) && send.offsetParent !== null) return send;
    return null;
  }

  /**
   * Quill(.ql-editor) contenteditable에 텍스트 주입.
   * Gemini는 Quill 에디터를 쓰기 때문에 paste 이벤트가 가장 안정적.
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

    // 1) 전체 선택 → 삭제
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false);
    } catch (_) {}

    // 2) paste 이벤트 (Quill 호환)
    let inserted = false;
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      if (!pasteEvent.clipboardData) {
        Object.defineProperty(pasteEvent, "clipboardData", { value: dt });
      }
      el.dispatchEvent(pasteEvent);
      inserted = true;
    } catch (e) {
      console.warn("[ImagiPark/Gemini] paste 주입 실패, fallback 시도", e);
    }

    // 3) execCommand fallback
    if (!inserted || !(el.innerText || "").trim()) {
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch (_) {}
    }

    // 4) Quill 직접 주입 (마지막 fallback)
    if (!(el.innerText || "").trim()) {
      // Gemini는 Trusted Types 정책을 켜둬서 innerHTML 할당이 거부됨.
      // DOM API로 노드를 하나씩 제거/추가하면 정책 위반 없음.
      while (el.firstChild) el.removeChild(el.firstChild);
      // Quill은 <p> 단위로 라인을 구성함. 줄바꿈을 <p>로 분리.
      const lines = text.split("\n");
      for (const line of lines) {
        const p = document.createElement("p");
        if (line.length === 0) {
          p.appendChild(document.createElement("br"));
        } else {
          p.textContent = line;
        }
        el.appendChild(p);
      }
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
    // Quill의 기본 placeholder인 "\n"만 남는 경우가 있어 길이 체크
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

  // Angular/Material 컴포넌트는 단순 .click() 만으로 트리거되지 않을 때가 있어
  // pointer/mouse 풀시퀀스로 실제 사용자 클릭처럼 dispatch.
  // ⚠️ dispatchEvent("click") + btn.click() 둘 다 호출하면 toggle 버튼이 두 번 클릭되어
  //    열렸다 닫히는 회귀 — 둘 중 하나만.
  function robustClick(btn) {
    if (!btn) return false;
    try {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const opts = {
        bubbles: true, cancelable: true, composed: true,
        clientX: cx, clientY: cy, button: 0,
        view: window, pointerType: "mouse", isPrimary: true,
      };
      try { btn.dispatchEvent(new PointerEvent("pointerover",  opts)); } catch (_) {}
      try { btn.dispatchEvent(new PointerEvent("pointerenter", opts)); } catch (_) {}
      try { btn.dispatchEvent(new PointerEvent("pointerdown",  opts)); } catch (_) {}
      try { btn.dispatchEvent(new MouseEvent  ("mousedown",    opts)); } catch (_) {}
      try { btn.dispatchEvent(new PointerEvent("pointerup",    opts)); } catch (_) {}
      try { btn.dispatchEvent(new MouseEvent  ("mouseup",      opts)); } catch (_) {}
      // dispatchEvent("click") 한 번만 — btn.click() 중복 제거 (toggle 회귀 차단)
      let dispatched = false;
      try { dispatched = btn.dispatchEvent(new MouseEvent("click", opts)); } catch (_) {}
      // 만약 click 이벤트가 cancel 됐거나 기본 처리 안 되면 fallback 으로 .click() 한 번
      if (!dispatched) {
        try { btn.click(); } catch (_) {}
      }
      return true;
    } catch (e) {
      try { btn.click(); } catch (_) {}
      return true;
    }
  }

  async function clickSend() {
    const composer = getComposer();
    const textBefore = (composer?.innerText || "").trim();
    if (!textBefore) throw new Error("composer에 전송할 텍스트가 없습니다");

    // 진단 로그 — 어떤 composer/버튼을 사용했는지 파악
    console.log("[ImagiPark/Gemini] clickSend 시작",
      "textLen=" + textBefore.length,
      "composer=" + (composer && composer.tagName),
      "inputArea=" + !!(composer && composer.closest("input-area-v2,rich-textarea"))
    );

    let clicked = false;
    let chosenBtn = null;
    try {
      const btn = await waitFor(
        () => {
          const b = getSendButton();
          if (b && !b.disabled && b.offsetParent !== null &&
              b.getAttribute("aria-disabled") !== "true") return b;
          return null;
        },
        { timeout: 8000, interval: 150 }
      );
      chosenBtn = btn;
      robustClick(btn); // 단순 .click() 대신 pointer/mouse 풀시퀀스
      clicked = true;
      console.log("[ImagiPark/Gemini] send 버튼 클릭 완료",
        "label=" + (btn.getAttribute("aria-label") || btn.getAttribute("mattooltip") || "")
      );
    } catch (_) {
      console.warn("[ImagiPark/Gemini] send 버튼 못 찾음 (8s timeout)");
    }

    const emptied = await waitFor(composerIsEmpty, {
      timeout: 2500,
      interval: 150,
    }).then(() => true).catch(() => false);

    if (emptied) return;

    console.warn("[ImagiPark/Gemini] 전송 미확인 — composer text=",
      ((getComposer()?.innerText || "").trim()).slice(0, 80));

    // 2차 시도: 같은 버튼을 robustClick 한번 더 (Angular 가 첫 시퀀스 무시했을 가능성)
    if (chosenBtn) {
      console.warn("[ImagiPark/Gemini] robustClick 재시도");
      robustClick(chosenBtn);
      const emptiedRetry = await waitFor(composerIsEmpty, {
        timeout: 2000, interval: 150,
      }).then(() => true).catch(() => false);
      if (emptiedRetry) return;
    }

    // 3차 시도: 폼 submit 직접 호출 (Quill+Material 일부 케이스에서 form submit 이 먹힘)
    try {
      const composer = getComposer();
      const form = composer && (composer.closest("form") || composer.closest("input-area-v2"));
      if (form) {
        console.warn("[ImagiPark/Gemini] form submit 시도");
        try { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); } catch (_) {}
        if (typeof form.requestSubmit === "function") {
          try { form.requestSubmit(); } catch (_) {}
        }
        const emptiedForm = await waitFor(composerIsEmpty, {
          timeout: 1500, interval: 150,
        }).then(() => true).catch(() => false);
        if (emptiedForm) return;
      }
    } catch (_) {}

    // 4차 시도: composer 에 Enter 키
    console.warn("[ImagiPark/Gemini] Enter 키 fallback 시도");
    pressEnter();

    const emptied2 = await waitFor(composerIsEmpty, {
      timeout: 2500,
      interval: 150,
    }).then(() => true).catch(() => false);

    if (emptied2) return;

    // 마지막 진단 — 페이지에 보이는 에러/안내 텍스트 추출 시도
    const visibleErrors = [];
    document.querySelectorAll(
      '[role="alert"], [class*="error" i], [class*="banner" i], [class*="toast" i], [class*="snackbar" i]'
    ).forEach((el) => {
      if (el.offsetParent === null) return;
      const t = (el.innerText || "").trim();
      if (t && t.length < 200) visibleErrors.push(t);
    });
    if (visibleErrors.length) {
      console.warn("[ImagiPark/Gemini] 페이지 에러/배너 감지:", visibleErrors);
    }

    throw new Error(
      "전송이 실패했습니다 (composer가 비워지지 않음). " +
      (clicked ? "버튼 클릭은 했으나 " : "버튼을 못 찾아 ") +
      "Gemini가 입력을 수락하지 않았습니다. " +
      (visibleErrors.length ? `페이지 알림: "${visibleErrors[0].slice(0, 80)}"` :
        "도구에서 '이미지'가 켜져 있는지, composer에 텍스트가 정상 주입됐는지 확인하세요.")
    );
  }

  async function waitForResponseStart(timeout = 20000) {
    const startCount = qa(SELECTORS.assistantMessage).length;
    await waitFor(
      () => getStopButton() || qa(SELECTORS.assistantMessage).length > startCount,
      { timeout, interval: 200 }
    );
  }

  // 마지막 어시스턴트 응답 컨테이너 안에서 완료 시 등장하는 액션 버튼들의 개수
  // (좋아요 / 싫어요 / 다시 생성 / 복사 / 공유 등) — 응답이 완전히 끝났을 때만 등장
  function _lastAssistantActionCount() {
    const last = getLastAssistantMessage();
    if (!last) return 0;
    // last 의 가까운 message-actions / response-container 부모를 탐색
    let cur = last;
    for (let depth = 0; cur && depth < 8; depth++) {
      // 현재 노드 + 형제·자식에서 액션 버튼 카운트
      const root = cur;
      const acts = root.querySelectorAll(
        'button[aria-label*="좋아요" i], button[aria-label*="싫어요" i], ' +
        'button[aria-label*="like" i], button[aria-label*="dislike" i], ' +
        'button[aria-label*="복사" i], button[aria-label*="copy" i], ' +
        'button[aria-label*="공유" i], button[aria-label*="share" i], ' +
        'button[aria-label*="다시 생성" i], button[aria-label*="regenerate" i], ' +
        'button[aria-label*="새로 고침" i], button[aria-label*="refresh" i]'
      );
      if (acts.length >= 2) return acts.length;
      cur = cur.parentElement;
    }
    return 0;
  }

  async function waitForResponseComplete(timeout = 10 * 60 * 1000) {
    try {
      await waitForResponseStart(20000);
    } catch (_) {
      throw new Error(
        "Gemini 응답이 시작되지 않았습니다. 전송 실패 가능성. (composer/전송버튼 셀렉터 확인 필요)"
      );
    }

    // ─── 완료 감지 다중 신호 ───
    // (A) 빠른 경로 :  stop 부재 + 텍스트 2.5s 안정
    // (B) 액션 fallback : 액션 버튼 2개+ + 텍스트 5s 안정 (stop 무관)
    // (C) 강제 fallback : 텍스트 200자+ + 5s 안정 (stop 무관)
    // (D) 보호 fallback : 텍스트 100자+ + 30s 안정 (모든 신호 무시)
    const t0 = Date.now();
    let lastText = "";
    let stableSince = 0;

    while (Date.now() - t0 < timeout) {
      checkAbort();

      // 사용자 수동 완료 신호 — 즉시 통과
      if (consumeManualComplete()) {
        console.log("[ImagiPark/Gemini] ✋ 사용자 수동 완료 신호 — 응답 즉시 인정");
        return;
      }

      const stop = getStopButton();
      const lastEl = qa(SELECTORS.assistantMessage).pop();
      const txt = lastEl ? (lastEl.innerText || lastEl.textContent || "") : "";

      // 텍스트 안정성 — stop 상태와 무관하게 지속 추적
      if (txt && txt === lastText) {
        if (!stableSince) stableSince = Date.now();
      } else {
        lastText = txt;
        stableSince = 0;
      }
      const stableMs = stableSince ? Date.now() - stableSince : 0;
      const len = (txt || "").length;

      // (A) 빠른 경로 — stop 사라짐 + 텍스트 2.5s 안정
      if (!stop && stableMs >= 2500) return;

      // (B) 액션 버튼 등장 + 텍스트 5s 안정 (stop 무관)
      //   응답이 완전히 끝나면 좋아요/싫어요/복사/다시생성 버튼이 등장.
      //   Gemini 가 stop 버튼을 깔끔히 못 치우는 케이스 회피.
      const actCount = _lastAssistantActionCount();
      if (actCount >= 2 && stableMs >= 5000 && len >= 50) {
        console.log("[ImagiPark/Gemini] 응답 완료 (액션 " + actCount + " + 안정 5s, stop=" + !!stop + ")");
        return;
      }

      // (C) 텍스트 충분히 김 + 5s 안정 (stop 무관)
      //   stop 버튼 detection 이 false positive 일 때 영원히 막히는 것 방지.
      if (len >= 200 && stableMs >= 5000) {
        console.log("[ImagiPark/Gemini] 응답 완료 (텍스트 " + len + "자 + 안정 5s, stop=" + !!stop + ")");
        return;
      }

      // (D) 마지막 보호 — 30초 안정이면 무조건 완료 (텍스트 100자+)
      if (len >= 100 && stableMs >= 30000) {
        console.log("[ImagiPark/Gemini] 응답 완료 (보호 fallback — 30s 안정, stop=" + !!stop + ")");
        return;
      }

      await sleep(500);
    }
    throw new Error("응답 완료 감지 타임아웃");
  }

  function getLastAssistantMessage() {
    const list = qa(SELECTORS.assistantMessage);
    if (!list.length) return null;
    return list[list.length - 1];
  }

  function getLastAssistantText() {
    const el = getLastAssistantMessage();
    return el ? el.innerText || el.textContent || "" : "";
  }

  function countAssistantMessages() {
    return qa(SELECTORS.assistantMessage).length;
  }

  function findAttachButtonHeuristic() {
    const form = getComposerForm();
    if (!form) return null;
    const btns = Array.from(form.querySelectorAll("button")).filter(
      (b) => b.offsetParent !== null
    );
    if (!btns.length) return null;
    btns.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.left - rb.left;
    });
    const kwSend = /(send|submit|보내|전송|stop|중지)/i;
    for (const b of btns) {
      const al =
        (b.getAttribute("aria-label") || "") + " " +
        (b.getAttribute("mattooltip") || "") + " " +
        (b.title || "");
      if (kwSend.test(al)) continue;
      // "도구·tools" 만 인정 — "추가/add" 같은 일반 키워드는 사이드바 케밥 메뉴까지 잡힐 수 있어 제외
      if (/(도구|tools)/i.test(al)) return b;
    }
    return null; // ⚠️ 무작정 leftmost 버튼을 반환하면 잘못된 메뉴가 열림 — null 로 명시 실패
  }

  // 텍스트 "도구"/"Tools" 매칭 헬퍼 (공통)
  function _isToolsLabel(txt) {
    if (!txt) return false;
    const t = txt.trim();
    if (/^도구$|^Tools$/i.test(t)) return true;
    if (t.length <= 10 && /도구|^tools/i.test(t)) return true;
    return false;
  }

  // 입력 영역 안에서 visible text 가 "도구"/"Tools" 인 버튼 찾기 — selector 실패 fallback
  // composer 의 form 밖에 도구 버튼이 배치되는 Gemini UI 변경에 대비, composer 주변 8단계 부모까지 확장 검색.
  function _findToolsButtonByText() {
    const composer = getComposer();
    if (!composer) return null;
    const containers = [];
    let cur = composer;
    for (let depth = 0; cur && depth < 8; depth++) {
      containers.push(cur);
      cur = cur.parentElement;
    }
    for (const root of containers) {
      if (!root || !root.querySelectorAll) continue;
      const btns = root.querySelectorAll("button");
      for (const b of btns) {
        if (!b || b.offsetParent === null) continue;
        if (_isToolsLabel(b.innerText || b.textContent)) return b;
      }
    }
    return null;
  }

  // 마지막 fallback — 전체 document 에서 visible text "도구" 인 버튼 중 화면 하단(=입력창 근처) 우선 선택
  // 사이드바 상단의 "도구" 같은 단어가 있어도 viewport 위치로 구별 (화면 위쪽 40% 영역 제외).
  function _findToolsButtonByViewportPosition() {
    const allBtns = document.querySelectorAll("button");
    const vh = window.innerHeight;
    const candidates = [];
    for (const b of allBtns) {
      if (!b || b.offsetParent === null) continue;
      if (!_isToolsLabel(b.innerText || b.textContent)) continue;
      const rect = b.getBoundingClientRect();
      if (rect.top < vh * 0.4) continue; // 화면 상단 40% 제외 (사이드바·헤더)
      if (rect.width < 20 || rect.height < 16) continue; // 너무 작은 ghost 요소 제외
      candidates.push(b);
    }
    // 가장 화면 하단에 가까운 버튼 우선 (입력창 좌하단)
    candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return candidates[0] || null;
  }

  async function openAttachmentMenu() {
    // attachButton selector 들이 이미 unique 한 단서(toolbox-drawer-button + aria-label="도구" + aria-haspopup="menu")
    // 를 사용하므로 글로벌 검색해도 사이드바 메뉴와 충돌하지 않음.
    let btn = null;
    let matchedBy = "";

    // 1차 — 정확한 selector (글로벌)
    for (const s of SELECTORS.attachButton) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null) { btn = el; matchedBy = "selector:" + s; break; }
    }
    // 2차 — composer 주변 컨테이너에서 "도구" 텍스트 매칭
    if (!btn) {
      const t = _findToolsButtonByText();
      if (t) { btn = t; matchedBy = "text:composer근처"; }
    }
    // 3차 — viewport 하단의 "도구" 텍스트 (사이드바 영역 자동 제외)
    if (!btn) {
      const t = _findToolsButtonByViewportPosition();
      if (t) { btn = t; matchedBy = "text:viewport하단"; }
    }
    // 4차 — 휴리스틱 (마지막 보호)
    if (!btn) {
      btn = findAttachButtonHeuristic();
      if (btn) matchedBy = "heuristic";
    }
    if (!btn) throw new Error("도구/+ 버튼을 찾을 수 없습니다 (입력 영역 안에서 매칭 실패)");
    console.log("[ImagiPark/Gemini] 도구 버튼 클릭 [" + matchedBy + "]:",
      (btn.getAttribute("aria-label") || btn.getAttribute("mattooltip") || btn.className || (btn.innerText || "").trim()).slice(0, 60));
    robustClick(btn);
    // ⚠️ 메뉴가 실제로 등장했는지 확인 — '[class*="toolbox-drawer"]' 같이 도구 버튼 자체가
    //    매칭하는 selector 는 false positive 라 제외. drawer 아이템(개별 메뉴 항목) 가시 여부만 인정.
    await waitFor(
      () => {
        // 새 구조: button.toolbox-drawer-item-list-button (visible)
        const items = document.querySelectorAll(
          'button.toolbox-drawer-item-list-button, button[role="menuitemcheckbox"], toolbox-drawer-item, [role="menuitem"]'
        );
        for (const it of items) {
          if (it && it.offsetParent !== null) return true;
        }
        return false;
      },
      { timeout: 5000, interval: 100 }
    );
  }

  // 현재 화면에 보이는 menu item 들의 텍스트와 selector 매칭 정보 덤프 (진단 용)
  function _dumpMenuItems(label) {
    const seen = new Set();
    const out = [];
    for (const s of SELECTORS.menuItem) {
      const matched = document.querySelectorAll(s);
      let cnt = 0;
      matched.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        cnt++;
        const visible = el.offsetParent !== null;
        const txt = (el.innerText || el.textContent || "").trim().slice(0, 40);
        out.push((visible ? "✓" : "✗") + " [" + s + "] " + txt);
      });
    }
    // 일반 button 도 추가로 살펴보기 (selector 자체가 누락된 케이스 진단)
    const allBtns = document.querySelectorAll("button");
    let extraCount = 0;
    allBtns.forEach((b) => {
      if (seen.has(b)) return;
      if (b.offsetParent === null) return;
      const txt = (b.innerText || "").trim();
      if (!txt || txt.length > 30) return;
      // 도구 메뉴 항목이 가질만한 키워드들만
      if (!/이미지|Image|Canvas|Research|동영상|음악|학습|Video|Music|Study/i.test(txt)) return;
      extraCount++;
      out.push("[추가] [button] " + txt + " | role=" + (b.getAttribute("role") || "") + " | class=" + (b.className || "").slice(0, 80));
    });
    console.log("═══ [ImagiPark/Gemini] menu 진단 (" + label + ") ═══");
    out.forEach((l) => console.log("  " + l));
    console.log("═══ end menu 진단 (총 " + out.length + " 항목, 추가 button " + extraCount + ") ═══");
  }

  async function clickMenuItemByText(candidates) {
    const wants = Array.isArray(candidates) ? candidates : [candidates];
    let found;
    let dumpedEarly = false;
    const startedAt = Date.now();
    try {
      found = await waitFor(
        () => {
          // 1.5초 경과 후 첫 번째 매칭 실패 사이클에 한 번 진단 덤프 (early signal)
          if (!dumpedEarly && Date.now() - startedAt > 1500) {
            dumpedEarly = true;
            _dumpMenuItems("1.5s 시점, 매칭 실패 중");
          }
          const seen = new Set();
          const items = [];
          for (const s of SELECTORS.menuItem) {
            document.querySelectorAll(s).forEach((el) => {
              if (!seen.has(el)) { seen.add(el); items.push(el); }
            });
          }
          for (const it of items) {
            if (!it || it.offsetParent === null) continue;
            const txt = (it.innerText || it.textContent || "").trim();
            for (const w of wants) {
              if (txt.includes(w)) return it;
            }
          }
          return null;
        },
        { timeout: 8000, interval: 200 }
      );
    } catch (e) {
      _dumpMenuItems("최종 timeout, wants=" + JSON.stringify(wants));
      console.error("[ImagiPark/Gemini] ❌ menu item 매칭 최종 실패. wants=" + JSON.stringify(wants));
      throw e;
    }
    console.log("[ImagiPark/Gemini] ✅ menu item 클릭:", (found.innerText || "").trim().slice(0, 30));
    robustClick(found);
  }

  /**
   * Gemini에서 "이미지" 도구를 활성화.
   * 도구 드로어(toolbox-drawer)를 열고 "이미지" 항목을 클릭.
   * 이미 활성 상태면 그냥 종료.
   */
  // 활성 상태인 "이미지" 도구 항목을 찾음 — 신·구 selector 모두 커버
  function _findActiveImageItem() {
    const sels = [
      // 신버전: aria-checked 체크
      'button.toolbox-drawer-item-list-button[aria-checked="true"]',
      'button[role="menuitemcheckbox"][aria-checked="true"]',
      // 구버전: aria-pressed
      'toolbox-drawer-item[aria-pressed="true"]',
      'button[aria-pressed="true"]',
      '.toolbox-drawer-item-selected',
    ];
    for (const sel of sels) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (!el || el.offsetParent === null) continue;
        if (/이미지|Image/i.test(el.textContent || "")) return el;
      }
    }
    return null;
  }

  // ─── 이미지 모드 활성 캐시 ───
  let _imageModeKnownActive = false;
  // 사이드패널이 새 batch 시작 시 명시적으로 호출 — stale 캐시 방어
  function resetImageModeCache() {
    if (_imageModeKnownActive) console.log("[ImagiPark/Gemini] 이미지 모드 캐시 reset (새 batch 시작)");
    _imageModeKnownActive = false;
  }

  // ─── 2차 폴백: "이미지 만들기" 를 setup turn 으로 전송해 이미지 모드 유도 ───
  //   사용자 제공 로직 반영:
  //     1) 채팅 입력창 찾기 (contenteditable / textarea)
  //     2) "이미지 만들기" 텍스트 주입 + input 이벤트
  //     3) 전송 버튼 click (없으면 Enter 키 fallback)
  //   DOM 토글이 (Gemini UI 변경 등으로) 실패할 때만 사용 — 정상 케이스는 1차에서 통과.
  async function _ensureImageModeByPrompt() {
    const chatInput = getComposer() || document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
    if (!chatInput) throw new Error("채팅 입력창을 찾을 수 없습니다 (이미지 모드 프롬프트 폴백)");

    chatInput.focus();
    const PROMPT = "이미지 만들기";

    // 텍스트 주입 — 정식 setPromptText 우선 (Quill 호환), 실패 시 직접 주입
    try {
      setPromptText(PROMPT);
    } catch (_) {
      if (chatInput.tagName === "DIV") {
        chatInput.innerText = PROMPT;
      } else {
        chatInput.value = PROMPT;
      }
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    await sleep(500); // UI 반영 대기

    // 전송 버튼 또는 Enter 키
    let sent = false;
    try {
      const sendBtn = getSendButton();
      if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
        try { robustClick(sendBtn); } catch (_) { sendBtn.click(); }
        sent = true;
        console.log("[ImagiPark/Gemini] '이미지 만들기' setup turn 전송 (버튼 클릭)");
      }
    } catch (_) {}
    if (!sent) {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter", keyCode: 13, bubbles: true, cancelable: true,
      });
      chatInput.dispatchEvent(enterEvent);
      console.log("[ImagiPark/Gemini] '이미지 만들기' setup turn 전송 (Enter 키)");
    }

    // Gemini 가 응답할 시간 — 본격 사용자 프롬프트 직전에 짧게 대기
    await sleep(2500);
  }

  // ─── 1차 (빠른 경로): 사용자 제공 명시적 selector 로 직접 토글 ───
  //   1) "업로드 및 도구" aria-label 의 + 버튼 클릭
  //   2) 400ms 대기 후 .cdk-overlay-container 안의 role="menuitemcheckbox" 중
  //      "이미지 만들기" 텍스트를 가진 버튼 클릭
  //   장점: 단일 selector 시퀀스 — 도구 메뉴 구조 변경 회귀에 견고.
  //   실패하면 false 반환 → 호출자가 기존 다단 fallback 으로 진행.
  // 다국어 후보 — Gemini UI 언어 설정(한국어/영어)에 따라 aria-label·메뉴 텍스트가 다름.
  //   한국어 하드코딩 시 영어 UI 사용자는 빠른 경로가 항상 실패하고 느린 fallback 으로 빠짐.
  const PLUS_BUTTON_LABELS = ["업로드 및 도구", "Upload and tools", "Uploads and tools", "Upload files and more"];
  const IMAGE_MENU_TEXTS = ["이미지 만들기", "Create image", "Create images"];

  async function _ensureImageModeByExplicitSelectors() {
    // (1) + 버튼 찾기 — aria-label 다국어 후보 매칭
    let matchedLabel = "";
    const plusButton = Array.from(document.querySelectorAll("button"))
      .find((btn) => {
        const lbl = btn.getAttribute && btn.getAttribute("aria-label");
        if (!lbl || btn.offsetParent === null) return false;
        const hit = PLUS_BUTTON_LABELS.find((c) => lbl.includes(c));
        if (hit) { matchedLabel = hit; return true; }
        return false;
      });
    if (!plusButton) return false;

    console.log("[ImagiPark/Gemini] + 버튼 클릭 (aria-label '" + matchedLabel + "')");
    try { robustClick(plusButton); } catch (_) { plusButton.click(); }

    // (2) 400ms 대기 후 메뉴 안 이미지 항목 클릭 (다국어 후보)
    await sleep(400);
    const overlay = document.querySelector(".cdk-overlay-container");
    if (!overlay) {
      console.warn("[ImagiPark/Gemini] .cdk-overlay-container 미발견");
      return false;
    }
    const imageCreateBtn = Array.from(overlay.querySelectorAll('button[role="menuitemcheckbox"]'))
      .find((btn) => {
        const txt = (btn.textContent || "").trim();
        return IMAGE_MENU_TEXTS.some((c) => txt.includes(c));
      });
    if (!imageCreateBtn) {
      console.warn("[ImagiPark/Gemini] menuitemcheckbox 이미지 항목 미발견 (후보: " + IMAGE_MENU_TEXTS.join(", ") + ")");
      return false;
    }

    // 이미 활성 상태면 다시 클릭하지 않음 (toggle off 방지)
    const alreadyChecked = imageCreateBtn.getAttribute("aria-checked") === "true";
    if (alreadyChecked) {
      console.log("[ImagiPark/Gemini] '이미지 만들기' 이미 체크됨 — 클릭 skip");
      try { document.body.click(); } catch (_) {} // 메뉴 닫기
      await sleep(200);
      return true;
    }

    console.log("[ImagiPark/Gemini] '이미지 만들기' menuitemcheckbox 클릭");
    try { robustClick(imageCreateBtn); } catch (_) { imageCreateBtn.click(); }
    await sleep(500);
    return true;
  }

  async function ensureImageMode() {
    if (_imageModeKnownActive) {
      console.log("[ImagiPark/Gemini] 이미지 모드 캐시 활성 — skip (메뉴 안 열림)");
      return;
    }

    // (1) 활성 칩이 이미 보이면 skip + 캐시 set
    if (_findActiveImageItem()) {
      console.log("[ImagiPark/Gemini] 이미지 모드 이미 활성 (메뉴 외부 감지) — skip + 캐시 set");
      _imageModeKnownActive = true;
      return;
    }

    // (2) ★ 빠른 경로 (사용자 제공 로직): + 버튼 → 메뉴 → 이미지 만들기 menuitemcheckbox
    try {
      const ok = await _ensureImageModeByExplicitSelectors();
      if (ok) {
        // 활성 칩 검증
        if (_findActiveImageItem()) {
          _imageModeKnownActive = true;
          console.log("[ImagiPark/Gemini] 이미지 모드 활성 (빠른 경로 — 명시적 selector)");
          return;
        }
        // 칩 감지 실패해도 menuitemcheckbox aria-checked=true 였으니 활성으로 간주
        _imageModeKnownActive = true;
        console.log("[ImagiPark/Gemini] 이미지 모드 활성 (빠른 경로 — 칩 검증은 미확인이나 menuitemcheckbox 클릭 성공)");
        return;
      }
    } catch (e) {
      console.warn("[ImagiPark/Gemini] 빠른 경로 실패 — 기존 다단 fallback 으로 진행:", e && e.message);
    }

    // (3) 다단 fallback — 기존 selector chain
    let domToggleError = null;
    try {
      await openAttachmentMenu();
      await sleep(250);

      if (_findActiveImageItem()) {
        console.log("[ImagiPark/Gemini] 이미지 모드 이미 활성 (메뉴 안 확인) — 캐시 set");
        _imageModeKnownActive = true;
        try { document.body.click(); } catch (_) {}
        await sleep(200);
        return;
      }

      await clickMenuItemByText(["이미지 만들기", "이미지", "Create image", "Image", "Imagen"]);
      await sleep(600);

      if (_findActiveImageItem()) {
        _imageModeKnownActive = true;
        console.log("[ImagiPark/Gemini] 이미지 모드 활성 (다단 fallback)");
        return;
      }
      domToggleError = new Error("도구 메뉴 클릭은 성공했으나 활성 칩 미감지");
    } catch (e) {
      domToggleError = e;
    }

    // (4) 최종 폴백: "이미지 만들기" 프롬프트 setup turn
    try { document.body.click(); } catch (_) {}
    console.warn("[ImagiPark/Gemini] DOM 토글 모두 실패 — 프롬프트 setup 폴백:", domToggleError && domToggleError.message);
    await _ensureImageModeByPrompt();
    _imageModeKnownActive = true;
    console.log("[ImagiPark/Gemini] 이미지 모드 활성 (프롬프트 setup turn)");
  }

  // 이미지 도구 비활성화 — 스크립트 turn 직전에 호출해서 텍스트 응답이 막히지 않도록.
  async function disableImageMode() {
    const target = _findActiveImageItem();
    if (!target) {
      _imageModeKnownActive = false; // 캐시도 일관되게 무효화
      return false;
    }

    // (1) 활성 칩 직접 클릭으로 토글
    try {
      target.click();
      await sleep(500);
      if (!_findActiveImageItem()) { _imageModeKnownActive = false; return true; }
    } catch (_) {}

    // (2) 도구 드로어 다시 열어 항목 재클릭
    try {
      await openAttachmentMenu();
      await clickMenuItemByText(["이미지 만들기", "이미지", "Create image", "Image", "Imagen"]);
      await sleep(500);
      try { document.body.click(); } catch (_) {}
      if (!_findActiveImageItem()) { _imageModeKnownActive = false; return true; }
    } catch (_) {}

    return false;
  }

  /**
   * 마지막 응답에 이미지가 생성됐는지 추적.
   * Gemini 이미지는 보통 googleusercontent.com / lh3.googleusercontent.com /
   * data:image/... / blob: 형태로 로딩됨.
   *
   * 완료 조건(둘 중 하나):
   *   A) 새 생성 이미지 URL + stop 없음 + 1.5초 안정
   *   B) 응답 액션 버튼 세트(재생성/복사/공유 등) 등장 + stop 없음 + 2초 안정
   */
  async function waitForImagesInLastMessage(minCount, timeoutMs = 10 * 60 * 1000) {
    // URL 정규화 — 동적 쿼리 제거 + file_ID 추출 (ChatGPT 와 동일 로직)
    const DYNAMIC_PARAMS = [
      "ts", "t", "timestamp", "_ts", "sig", "signature",
      "token", "expires", "Expires", "X-Amz-Date", "X-Amz-Expires", "X-Amz-Signature",
    ];
    const normalizeImgSrc = (src) => {
      if (!src) return "";
      if (/^data:/i.test(src)) return src;
      try {
        const u = new URL(src, location.origin);
        for (const p of DYNAMIC_PARAMS) u.searchParams.delete(p);
        const fid = u.searchParams.get("id") || u.searchParams.get("file_id") || "";
        return (u.origin + u.pathname + (fid ? "#id=" + fid : "")).toLowerCase();
      } catch (_) {
        return src.split("?")[0].toLowerCase();
      }
    };
    const extractFileId = (src) => {
      if (!src) return "";
      const m = src.match(/file[_-]([A-Za-z0-9]{16,})/);
      return m ? m[1] : "";
    };

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
    const baselineEl = getLastAssistantMessage();

    const isNewGeneratedImgSrc = (src) => {
      if (!src) return false;
      // SVG 차단 — Gemini sparkle/aurora 로딩 애니메이션
      if (/^data:image\/svg/i.test(src)) return false;
      if (/\.svg(\?|$|#)/i.test(src)) return false;
      // gstatic.com 차단 — UI 아이콘
      if (/gstatic\.com/i.test(src)) return false;
      // 작은 base64 차단 — 진짜 생성 이미지는 수십~수백 KB (≥10000자 base64).
      //   Gemini 가 이미지 생성 중 placeholder/avatar 로 작은 base64 PNG 를 표시하는 케이스 차단.
      if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src) && src.length < 10000) return false;
      // Format whitelist
      if (!/^(https?:|blob:|data:image\/(png|jpe?g|webp|gif))/i.test(src)) return false;
      if (src.length < 20) return false;
      const norm = normalizeImgSrc(src);
      if (initialSrcs.has(norm)) return false;
      const fid = extractFileId(src);
      if (fid && initialSrcs.has("fid:" + fid)) return false;
      return true;
    };

    let detectedSrc = null;
    let detectedAt = 0;
    let detectedFid = null;

    // 진짜 Gemini 생성 이미지 URL 패턴 — 가장 신뢰도 높은 소스
    const isPrimarySource = (src) => /^blob:|googleusercontent\.com/i.test(src || "");

    const tryImg = (img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      if (!isNewGeneratedImgSrc(src)) return;
      // 이미 detected 가 있는 경우 — 더 신뢰도 높은 소스로만 갱신 (placeholder → real 교체)
      if (detectedSrc) {
        if (isPrimarySource(detectedSrc)) return; // 이미 진짜 이미지 — 갱신 안 함
        if (!isPrimarySource(src)) return;        // 새 src 도 placeholder — 무시
        // detectedSrc 가 placeholder, 새 src 가 진짜 → 교체
      }
      detectedSrc = src;
      detectedFid = extractFileId(src);
      detectedAt = Date.now();
      console.log("[ImagiPark/Gemini] 새 이미지 감지:",
        src.slice(0, 100), "fid=" + detectedFid, "primary=" + isPrimarySource(src));
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (detectedSrc) return;
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

    const t0 = Date.now();
    const baselineButtons = document.querySelectorAll("button").length;
    let newMessageAppeared = false;
    let actionsIncreasedSince = 0;
    let lastProgressLog = 0;

    try {
      while (Date.now() - t0 < timeoutMs) {
        checkAbort();

        // 사용자 수동 완료 신호 — 즉시 완료 처리
        // (이미지 detection 못 했어도 사용자 화면엔 보일 수 있음 → 일단 통과시키고 사용자에게 후처리 위임)
        if (consumeManualComplete()) {
          console.log("[ImagiPark/Gemini] ✋ 사용자 수동 완료 신호 — 이미지 대기 즉시 종료 (detectedSrc=" + (detectedSrc ? "yes" : "no") + ")");
          await sleep(200);
          return { detectedSrc: detectedSrc || null, fileId: detectedFid || null };
        }

        const el = getLastAssistantMessage();
        if (el && el !== baselineEl) newMessageAppeared = true;

        if (!newMessageAppeared && !getStopButton() && Date.now() - t0 > 60000) {
          throw new Error(
            "응답이 시작되지 않았습니다 (60s 초과). 전송이 실패했거나 Gemini가 메시지를 수신하지 못했습니다."
          );
        }

        const streaming = !!getStopButton();

        if (!detectedSrc) {
          document.querySelectorAll("img").forEach(tryImg);
        }

        // A) 이미지 URL 감지 기반 완료 (빠른 성공 경로)
        //    스트리밍 종료 + 이미지가 1.5초 안정되면 완료
        if (detectedSrc && !streaming && Date.now() - detectedAt >= 1500) {
          console.log("[ImagiPark/Gemini] 완료(이미지 URL 감지)");
          await sleep(300);
          return { detectedSrc, fileId: detectedFid };
        }

        // A-2) Fallback: 이미지가 이미 DOM 에 있고 충분히 안정됐는데 stop 버튼이 사라지지 않는 경우
        //   — Gemini 가 이미지 생성 후에도 설명 텍스트를 이어서 스트리밍하는 케이스.
        //   사용자에겐 이미 이미지가 보이는데 ImagiPark 가 영원히 대기하는 회귀 차단.
        //   이미지 안정 12초 이상이면 streaming 무시하고 완료 처리.
        if (detectedSrc && Date.now() - detectedAt >= 12000) {
          console.log("[ImagiPark/Gemini] 완료(이미지 안정 12s — 스트리밍 무시)");
          await sleep(300);
          return { detectedSrc, fileId: detectedFid };
        }

        // 텍스트 응답만 완료되고 이미지 아직 안 뜬 상황 — 추가로 최대 90초 대기
        // 90초 내에도 이미지가 안 오면 "이미지 없음"으로 판단해 throw.
        // (액션 버튼 개수 조건만으로 완료 판정 시 다음 턴이 조기 시작되는 버그 방지)
        const curButtons = document.querySelectorAll("button").length;
        const buttonsIncreased = curButtons >= baselineButtons + 3;
        if (!streaming && buttonsIncreased && newMessageAppeared && !detectedSrc) {
          if (!actionsIncreasedSince) actionsIncreasedSince = Date.now();
          if (Date.now() - actionsIncreasedSince >= 90000) {
            throw new Error(
              "응답은 종료됐지만 이미지가 DOM에 나타나지 않았습니다 (90초 초과). 모델이 이미지를 생성하지 못했거나 차단됐을 수 있습니다."
            );
          }
        } else if (!buttonsIncreased) {
          actionsIncreasedSince = 0;
        }

        const elapsed = Math.floor((Date.now() - t0) / 1000);
        if (elapsed > 0 && elapsed % 30 === 0 && elapsed !== lastProgressLog) {
          lastProgressLog = elapsed;
          console.log(
            `[ImagiPark/Gemini] 이미지 대기 ${elapsed}s (detectedSrc=${!!detectedSrc}, streaming=${streaming}, buttons=${curButtons}/${baselineButtons})`
          );
        }

        await sleep(500);
      }
      throw new Error(
        `이미지 생성 타임아웃 (${Math.floor(timeoutMs / 60000)}분). 이미지가 DOM에 추가되지 않았습니다.`
      );
    } finally {
      observer.disconnect();
    }
  }

  /**
   * 파일(이미지)을 Gemini composer에 첨부. Quill 에디터에 paste 이벤트로
   * File을 넣으면 이미지 첨부 UI로 인식되는 케이스가 많음.
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
      try { dt.items.add(file); } catch (e) { console.warn("[ImagiPark/Gemini] add file failed", e); }
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

    await sleep(1800);
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
    disableImageMode,
    waitForImagesInLastMessage,
    attachFiles,
    setManualComplete,
    consumeManualComplete,
    resetImageModeCache,
  };
})();
