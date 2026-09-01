// ImagiPark content bridge
// 매니페스트 content_scripts 에 의해 각 플랫폼 페이지에 자동 주입된다.
// 선행 파일(chatgpt-dom.js / gemini-dom.js)이 window.__IMAGIPARK_DOM__ 을 세팅한 뒤
// 이 파일이 chrome.runtime.onMessage 로 sidepanel의 명령을 받아 어댑터 함수를 호출.
//
// isolated world 에서 실행 — page JS 와 window 객체는 분리되어 있지만
// DOM 은 공유하므로 어댑터가 하는 모든 DOM 조작이 정상 동작.

(function () {
  "use strict";
  // 중복 주입 방어 (programmatic 재주입 시)
  if (window.__IMAGIPARK_BRIDGE_READY__) return;
  window.__IMAGIPARK_BRIDGE_READY__ = true;

  // 어댑터가 abort 를 감지할 수 있도록 checker 연결
  try {
    if (window.__IMAGIPARK_DOM__ && window.__IMAGIPARK_DOM__.setAbortChecker) {
      window.__IMAGIPARK_ABORTED__ = false;
      window.__IMAGIPARK_DOM__.setAbortChecker(
        () => window.__IMAGIPARK_ABORTED__ === true
      );
    }
  } catch (_) {}

  function DOM() {
    if (!window.__IMAGIPARK_DOM__) {
      throw new Error(
        "어댑터 미주입 — 페이지가 아직 준비되지 않았거나 content_script 순서 문제"
      );
    }
    return window.__IMAGIPARK_DOM__;
  }

  // ───────── 이미지 수집: renderer.js 의 guestFetchAllImageMessages 이식 ─────────
  // opts.allowedFileIds: [String] — 이 file_ID 목록에 포함된 이미지만 수집
  //                                 (sidepanel 이 생성 중에 기록한 fid 들)
  //                                 undefined·빈 배열 이면 필터 없이 전체 수집 (구버전 호환)
  async function fetchAllImageMessages(opts) {
    opts = opts || {};
    const allowedSet = (Array.isArray(opts.allowedFileIds) && opts.allowedFileIds.length)
      ? new Set(opts.allowedFileIds)
      : null; // null = 화이트리스트 모드 꺼짐

    // 이미지 URL 에서 file_ID 추출 (어댑터의 extractFileId 와 동일 규칙)
    function extractFid(src) {
      if (!src) return "";
      const m = src.match(/file[_-]([A-Za-z0-9]{16,})/);
      return m ? m[1] : "";
    }

    const dom = DOM();
    const selectors = dom.SELECTORS.assistantMessage;
    let nodes = [];
    let selectorUsed = null;
    for (const sel of selectors) {
      const ns = document.querySelectorAll(sel);
      if (ns.length) {
        nodes = Array.from(ns);
        selectorUsed = sel;
        break;
      }
    }
    let usedFallback = false;
    if (!nodes.length) {
      nodes = [document.body];
      usedFallback = true;
    }
    const totalImgInDoc = document.querySelectorAll("img").length;

    function expandToNearestImgContainer(n) {
      if (!n) return n;
      let cur = n;
      let depth = 0;
      while (cur && cur !== document.body && depth < 12) {
        if (cur.querySelectorAll && cur.querySelectorAll("img").length > 0) return cur;
        cur = cur.parentElement;
        depth++;
      }
      return n;
    }
    const expanded = nodes.map(expandToNearestImgContainer);
    const seen = new Set();
    nodes = [];
    for (const n of expanded) {
      if (seen.has(n)) continue;
      seen.add(n);
      nodes.push(n);
    }
    const nodesWithImg = nodes.filter(
      (n) => n && n.querySelectorAll && n.querySelectorAll("img").length > 0
    ).length;
    if (nodesWithImg === 0 && totalImgInDoc > 0) {
      nodes = [document.body];
      usedFallback = true;
    }

    const sampleSrcs = [];
    {
      const all = Array.from(document.querySelectorAll("img"));
      all.sort((a, b) => (b.naturalWidth || 0) - (a.naturalWidth || 0));
      for (let k = 0; k < all.length && sampleSrcs.length < 6; k++) {
        const s2 = all[k].currentSrc || all[k].src || "";
        if (!s2) continue;
        sampleSrcs.push({
          src: s2.slice(0, 140),
          complete: all[k].complete,
          w: all[k].naturalWidth,
          h: all[k].naturalHeight,
        });
      }
    }

    function bytesToB64(bytes) {
      let binary = "";
      const chunk = 0x8000;
      for (let off = 0; off < bytes.length; off += chunk) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(off, Math.min(off + chunk, bytes.length))
        );
      }
      return btoa(binary);
    }
    function imgToDataURL(im) {
      try {
        const cv = document.createElement("canvas");
        cv.width = im.naturalWidth;
        cv.height = im.naturalHeight;
        const ctx = cv.getContext("2d");
        ctx.drawImage(im, 0, 0);
        return cv.toDataURL("image/png");
      } catch (e) {
        return { error: (e && e.message) || String(e) };
      }
    }

    const methodCounts = { fetch: 0, canvas: 0, failed: 0 };
    const fetchErrors = [];
    const results = [];
    const perNode = [];
    const seenSrc = new Set();

    for (let m = 0; m < nodes.length; m++) {
      const root = nodes[m];
      const allImgs = Array.from(root.querySelectorAll("img"));
      const imgs = allImgs.filter((im) => {
        const s = im.currentSrc || im.src || "";
        if (!/^(https?:|blob:|data:image\/(png|jpe?g|webp|gif))/i.test(s)) return false;
        if (/^data:image\/svg/i.test(s)) return false;
        if (/gstatic\.com\/.*\/(icon|logo|avatar)/i.test(s)) return false;
        if (!(im.complete && im.naturalWidth > 80)) return false;
        if (seenSrc.has(s)) return false;
        // ★ file_ID 화이트리스트 — 우리가 실제 생성한 이미지만 통과
        if (allowedSet) {
          const fid = extractFid(s);
          if (!fid || !allowedSet.has(fid)) return false;
        }
        seenSrc.add(s);
        return true;
      });
      perNode.push({ total: allImgs.length, kept: imgs.length });
      if (!imgs.length) continue;
      const msgImages = [];
      for (const im of imgs) {
        const src = im.currentSrc || im.src;
        let method = null;
        let mime = "image/png";
        let b64 = null;
        try {
          const resp = await fetch(src);
          if (resp.ok) {
            const blob = await resp.blob();
            const buf = await blob.arrayBuffer();
            b64 = bytesToB64(new Uint8Array(buf));
            mime = blob.type || "image/png";
            method = "fetch";
          } else {
            fetchErrors.push({ src: src.slice(0, 80), status: resp.status });
          }
        } catch (e) {
          fetchErrors.push({
            src: src.slice(0, 80),
            error: ((e && e.message) || String(e)).slice(0, 100),
          });
        }
        if (!b64) {
          const data = imgToDataURL(im);
          if (typeof data === "string" && /^data:image\/[^;]+;base64,/.test(data)) {
            const parts = data.split(",");
            b64 = parts[1];
            const mm = parts[0].match(/^data:([^;]+);/);
            if (mm) mime = mm[1];
            method = "canvas";
          } else if (data && data.error) {
            fetchErrors.push({ src: src.slice(0, 80), canvasError: data.error });
          }
        }
        if (b64) {
          methodCounts[method] = (methodCounts[method] || 0) + 1;
          msgImages.push({ mime, b64, src, method });
        } else {
          methodCounts.failed += 1;
        }
      }
      if (msgImages.length) results.push({ messageIndex: m, images: msgImages });
    }
    return {
      debug: {
        selectorUsed,
        usedFallback,
        nodeCount: nodes.length,
        totalImgInDoc,
        perNode,
        sampleSrcs,
        fetchErrors,
        methodCounts,
      },
      messages: results,
    };
  }

  // ───────── 명령 디스패치 ─────────
  const HANDLERS = {
    async IMAGIPARK_PING() {
      return { ok: true, hasAdapter: !!window.__IMAGIPARK_DOM__ };
    },
    async IMAGIPARK_GET_VISIBILITY() {
      // 백그라운드 탭이면 타이머 억제·rAF 정지·포커스 부재로 조작이 실패하기 쉽다.
      // 전송 직전에 확인해 사용자에게 경고하기 위한 정보.
      return {
        ok: true,
        hidden: !!document.hidden,
        hasFocus: typeof document.hasFocus === "function" ? document.hasFocus() : true,
        visibilityState: document.visibilityState || "",
      };
    },
    async IMAGIPARK_CLICK_NEW_CHAT() {
      // 페이지의 "새 채팅" 버튼을 직접 클릭 — URL 이동만으로 기존 대화에서
      // 벗어나지 못했을 때의 폴백. 플랫폼별 selector 를 순서대로 시도한다.
      const SELECTORS = [
        '[data-testid="create-new-chat-button"]',
        '[data-testid="new-chat-button"]',
        'a[data-discover="true"][href="/"]',
        'nav a[href="/"]',
        '[data-test-id="new-chat-button"]',      // Gemini
        '[aria-label*="새 채팅"]',
        '[aria-label*="New chat"]',
        '[aria-label*="새 대화"]',
      ];
      for (const sel of SELECTORS) {
        let el = null;
        try { el = document.querySelector(sel); } catch (_) { continue; }
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue; // 보이지 않는 요소 skip
        try {
          el.click();
          return { ok: true, clicked: true, selector: sel };
        } catch (_) { /* 다음 selector */ }
      }
      // 텍스트 기반 최후 탐색
      const nodes = Array.from(document.querySelectorAll("a,button"));
      for (const el of nodes) {
        const txt = (el.textContent || "").trim();
        if (!/^(새 채팅|새 대화|New chat)$/i.test(txt)) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        try {
          el.click();
          return { ok: true, clicked: true, selector: "text:" + txt };
        } catch (_) {}
      }
      return { ok: true, clicked: false };
    },
    async IMAGIPARK_ENSURE_CHAT_MODE() {
      // Chat / Work(글쓰기) 토글이 Work 로 켜져 있으면 Chat 으로 전환.
      // 지원하지 않는 플랫폼·빌드는 noop.
      const dom = DOM();
      if (typeof dom.ensureChatMode !== "function") {
        return { ok: true, supported: false };
      }
      const r = await dom.ensureChatMode();
      return { ok: true, ...(r || {}) };
    },
    async IMAGIPARK_DUMP_MENU() {
      // 진단용 — "+" 메뉴를 열고 항목을 콘솔에 덤프해서 반환
      const dom = DOM();
      if (typeof dom.dumpMenuCandidates !== "function") {
        return { ok: true, supported: false, items: [] };
      }
      try {
        if (typeof dom.openAttachmentMenu === "function") await dom.openAttachmentMenu();
      } catch (_) { /* 메뉴가 안 열려도 현재 상태를 덤프 */ }
      const items = dom.dumpMenuCandidates("수동 진단");
      return { ok: true, supported: true, items };
    },
    async IMAGIPARK_RESET_ABORT() {
      window.__IMAGIPARK_ABORTED__ = false;
      return { ok: true };
    },
    async IMAGIPARK_ABORT() {
      window.__IMAGIPARK_ABORTED__ = true;
      return { ok: true };
    },
    async IMAGIPARK_MANUAL_COMPLETE() {
      const dom = DOM();
      if (typeof dom.setManualComplete === "function") {
        dom.setManualComplete();
        return { ok: true };
      }
      return { ok: true, supported: false };
    },
    async IMAGIPARK_RESET_IMAGE_MODE_CACHE() {
      // 새 batch 시작 시 호출 — 이미지 모드 활성 캐시 무효화 (Gemini 전용, 다른 플랫폼은 noop)
      const dom = DOM();
      if (typeof dom.resetImageModeCache === "function") {
        dom.resetImageModeCache();
        return { ok: true };
      }
      return { ok: true, supported: false };
    },
    async IMAGIPARK_SET_PROMPT(msg) {
      DOM().setPromptText(msg.text);
      return { ok: true };
    },
    async IMAGIPARK_ENSURE_IMAGE_MODE() {
      if (typeof DOM().ensureImageMode !== "function") {
        throw new Error("ensureImageMode not supported on this platform");
      }
      await DOM().ensureImageMode();
      return { ok: true };
    },
    async IMAGIPARK_DISABLE_IMAGE_MODE() {
      // 이미지 모드 비활성화. 지원 안 하는 플랫폼(Gemini 등)은 noop.
      if (typeof DOM().disableImageMode !== "function") {
        return { ok: true, supported: false };
      }
      const removed = await DOM().disableImageMode();
      return { ok: true, supported: true, removed: !!removed };
    },
    async IMAGIPARK_GET_COMPOSER() {
      const c = DOM().getComposer && DOM().getComposer();
      return { ok: true, text: c ? (c.innerText || c.value || "").trim() : "" };
    },
    async IMAGIPARK_CLICK_SEND() {
      await DOM().clickSend();
      return { ok: true };
    },
    async IMAGIPARK_WAIT_RESPONSE() {
      await DOM().waitForResponseComplete();
      return { ok: true };
    },
    async IMAGIPARK_GET_LAST_TEXT() {
      return { ok: true, text: DOM().getLastAssistantText() };
    },
    async IMAGIPARK_COUNT_ASSISTANT() {
      const fn = DOM().countAssistantMessages;
      return { ok: true, count: typeof fn === "function" ? fn() : 0 };
    },
    async IMAGIPARK_WAIT_IMAGES(msg) {
      try {
        const r = await DOM().waitForImagesInLastMessage(
          msg.minCount || 1,
          msg.timeoutMs || 10 * 60 * 1000
        );
        // 어댑터가 객체를 반환하면 detectedSrc·fileId 를 sidepanel 로 전달
        return {
          ok: true,
          detectedSrc: r && r.detectedSrc ? r.detectedSrc : null,
          fileId: r && r.fileId ? r.fileId : null,
        };
      } catch (e) {
        // Rate limit 은 sidepanel 이 인지해서 자동 대기·재시도 할 수 있게 특수 필드로 포장
        if (e && e.__rateLimit__) {
          return {
            ok: false,
            rateLimit: true,
            waitSec: e.waitSec || 180,
            error: e.message || "rate_limit",
          };
        }
        throw e;
      }
    },
    async IMAGIPARK_WAIT_SEND_READY(msg) {
      // 다음 턴을 보낼 수 있는 상태인가? 의미 = "이전 응답 스트리밍이 끝났다"
      // 사용자 ✋ 수동 완료 신호도 즉시 통과.
      const timeoutMs = Number(msg.timeoutMs) || 15000;
      const stableMs = Number(msg.stableMs) || 1000;
      const deadline = Date.now() + timeoutMs;
      let stableSince = 0;
      // 잔여 응답 강제 중지 — 이전 턴(캔버스 등)이 스트리밍을 끝내지 않아
      // '답변 중지' 버튼이 계속 남아 composer 가 잠기는 케이스.
      // 이 함수가 호출됐다는 것 = 이전 턴 결과는 이미 확보·파싱된 상태이므로,
      // stop 이 6초 이상 유지되면 직접 클릭해 잔여 스트리밍을 끊고 진행한다 (1회).
      let stopSince = 0;
      let forcedStop = false;

      const isReady = () => {
        const stop = DOM().getStopButton && DOM().getStopButton();
        if (stop) return false;
        const c = DOM().getComposer && DOM().getComposer();
        if (!c) return false;
        return true;
      };

      while (Date.now() < deadline) {
        {
          const stopBtn = DOM().getStopButton && DOM().getStopButton();
          if (stopBtn) {
            if (!stopSince) stopSince = Date.now();
            if (!forcedStop && Date.now() - stopSince > 6000) {
              forcedStop = true;
              try {
                console.log("[ImagiPark] 이전 턴 응답이 끝나지 않음 — '답변 중지' 클릭으로 강제 종료 후 진행");
                stopBtn.click();
              } catch (_) {}
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            }
          } else {
            stopSince = 0;
          }
        }
        if (window.__IMAGIPARK_ABORTED__) return { ok: false, error: "aborted" };
        // ✋ 사용자 수동 완료 신호 — 이전 turn 종료 대기에서도 즉시 통과
        //   stop 버튼 detection 회귀로 영영 못 통과하는 케이스의 escape hatch
        try {
          if (DOM().consumeManualComplete && DOM().consumeManualComplete()) {
            console.log("[ImagiPark] ✋ 사용자 수동 완료 — waitForSendButtonReady 즉시 통과");
            return { ok: true };
          }
        } catch (_) {}
        if (isReady()) {
          if (!stableSince) stableSince = Date.now();
          if (Date.now() - stableSince >= stableMs) return { ok: true };
        } else {
          stableSince = 0;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      // 어떤 요소 때문에 "아직 스트리밍 중" 으로 판정됐는지 함께 보고 —
      // 정지 버튼 오탐(예: 음성 모드 버튼) 추적용
      let why = "";
      try {
        const stop = DOM().getStopButton && DOM().getStopButton();
        if (stop) {
          const sig = [
            stop.tagName,
            stop.id ? "#" + stop.id : "",
            stop.getAttribute("data-testid") ? `testid=${stop.getAttribute("data-testid")}` : "",
            stop.getAttribute("aria-label") ? `aria=${stop.getAttribute("aria-label")}` : "",
          ].filter(Boolean).join(" ");
          why = ` — stop 버튼으로 감지된 요소: <${sig}>`;
          console.warn("[ImagiPark] waitForSendButtonReady 타임아웃 — stop 후보:", stop);
        } else {
          const c = DOM().getComposer && DOM().getComposer();
          why = c ? " — stop 버튼 없음(원인 불명)" : " — composer 를 찾지 못함";
        }
      } catch (_) {}
      throw new Error(`previous turn not stably finished within ${timeoutMs}ms (need ${stableMs}ms continuous)${why}`);
    },
    async IMAGIPARK_ATTACH_FILES(msg) {
      await DOM().attachFiles(msg.specs || []);
      return { ok: true };
    },
    async IMAGIPARK_EDITOR_SCAN_IMAGES(msg) {
      // 현재 페이지의 assistant 메시지들에서 이미지 URL 수집 (편집 탭용)
      // ⚠ 회귀 이력:
      //   (1) document.querySelectorAll("img") 전체 훑기 → 추천카드·아이콘 혼입
      //   (2) fetchAllImageMessages 의 expandToNearestImgContainer → 부모 12단계 위로
      //       올라가 사이드바·추천카드 포함
      //   (3) assistantMessage selector strict scope → DOM 변경으로 0 매칭 시 완전 실패
      // 해결: 2단 폴백
      //   1차) assistantMessage selector strict scope
      //   2차) 0 매칭 시 → 플랫폼별 URL 패턴 화이트리스트 로 전체 document 스캔
      //         (ChatGPT chat 이미지 / Gemini 생성 이미지 패턴만 통과 — asset/icon 차단)
      const includeB64 = !!(msg && msg.includeB64);
      const dom = DOM();
      const selectors = (dom.SELECTORS && dom.SELECTORS.assistantMessage) || [];

      // ─── 플랫폼 감지 (URL 화이트리스트 결정용) ───
      const host = location.host;
      const isChatGPT = /chatgpt\.com|chat\.openai\.com/i.test(host);
      const isGemini = /gemini\.google\.com/i.test(host);

      // chat-origin URL 화이트리스트 (asset/icon/온보딩카드/GPT로고 차단)
      // ⚠ 회귀:
      //   (1) ChatGPT 신규 온보딩이 Transformation 등 추천 카드 그래픽 주입
      //   (2) oaiusercontent.com 만으로 허용하면 사이드바 GPT 아이콘/로고도 통과
      //   해결: ChatGPT 는 URL 에 반드시 `file-` 식별자가 들어있을 때만 통과
      //         (실제 대화에서 생성/업로드된 파일은 모두 file-XXXXX 식별자 보유)
      function isChatImageUrl(s) {
        if (!s) return false;
        if (/^data:image\/(png|jpe?g|webp|gif)/i.test(s)) return true;
        if (/^blob:/i.test(s)) return true;
        if (isChatGPT) {
          // 핵심 조건: URL 에 file_XXXXX 또는 file-XXXXX 식별자가 있어야 함
          //   예) chatgpt.com/backend-api/estuary/content?id=file_0000... (underscore — 실제 ChatGPT 형식)
          //       oaiusercontent.com/file-AbCd... (hyphen — 일부 변형)
          //   GPT 아이콘 / 추천카드 / 온보딩 카드는 file 식별자 없음 → 차단
          //   ⚠ 회귀 이력: hyphen 만 허용 → 실제 채팅 이미지 (underscore) 가 모두 거부됨
          if (!/file[_-][A-Za-z0-9]{8,}/i.test(s)) return false;
          // 도메인 화이트리스트 추가 검증
          if (/chatgpt\.com\/backend-api\//i.test(s)) return true;
          if (/oaiusercontent\.com/i.test(s)) return true;
          return false;
        }
        if (isGemini) {
          if (/googleusercontent\.com\/image_generation_content\//i.test(s)) return true;
          if (/lh3\.googleusercontent\.com/i.test(s)) return true;
          if (/googleusercontent\.com\/proxy\//i.test(s)) return true;
          if (/gstatic\.com/i.test(s)) return false;
          return false;
        }
        return true;
      }

      // 진단 로그 — 실제 어떤 URL 들이 잡혔는지/걸러졌는지 콘솔에 출력
      const _debugSeen = [];
      const _debugRejected = [];

      // ─── scope 결정: <main> 우선 (사이드바 자동 제외) ───
      //   ⚠ 회귀 이력:
      //     - assistant-selector 만 쓰면 매칭은 되어도 그 div 안에 <img> 가 없는 케이스가 있어
      //       (이미지가 sibling 컨테이너에 분리됨) 0 results 반환.
      //     - 그래서 채팅 본문 전체를 담는 <main> 을 우선 scope 로 사용.
      //       사이드바는 <main> 바깥이라 GPT 아이콘 자동 제외 + 채팅 이미지는 모두 포함.
      //     - URL 화이트리스트 (file_ / file-) 가 추가 보호막.
      let nodes = [];
      let scopeUsed = "main-element";
      let usedUrlFallback = false;
      const mainEl = document.querySelector("main") || document.querySelector('[role="main"]');
      if (mainEl) {
        nodes = [mainEl];
      } else {
        // <main> 없으면 assistant selector 시도
        for (const sel of selectors) {
          const ns = document.querySelectorAll(sel);
          if (ns.length) {
            nodes = Array.from(ns);
            scopeUsed = "assistant-selector";
            break;
          }
        }
        if (!nodes.length) {
          // 최후 수단 — body 전체
          usedUrlFallback = true;
          nodes = [document.body];
          scopeUsed = "body-fallback";
        }
      }

      const seen = new Set();
      const out = [];
      for (const root of nodes) {
        const imgs = Array.from(root.querySelectorAll("img"));
        for (const im of imgs) {
          const s = im.currentSrc || im.src || im.getAttribute("src") || "";
          if (!s) continue;
          if (!/^(https?:|blob:|data:image\/(png|jpe?g|webp|gif))/i.test(s)) continue;
          if (/^data:image\/svg/i.test(s)) continue;
          if (/\.svg(\?|$|#)/i.test(s)) continue;
          if (/gstatic\.com/i.test(s)) continue;
          // icon/avatar 필터
          const w = im.naturalWidth || im.width || 0;
          const h = im.naturalHeight || im.height || 0;
          if (w && w < 120) continue;
          if (h && h < 120) continue;
          // ★ URL 화이트리스트 — 항상 적용 (strict scope 도 ChatGPT 온보딩 카드 회귀 차단)
          if (!isChatImageUrl(s)) {
            _debugRejected.push({ src: s.slice(0, 250), w, h, reason: "url-whitelist" });
            continue;
          }
          if (seen.has(s)) continue;
          seen.add(s);
          out.push(s);
          _debugSeen.push({ src: s.slice(0, 250), w, h });
        }
      }
      try {
        console.log("[ImagiPark/EditorScan] scope:", scopeUsed,
          "usedUrlFallback:", usedUrlFallback,
          "nodeCount:", nodes.length,
          "passed:", _debugSeen.length,
          "rejected:", _debugRejected.length);
        if (_debugSeen.length) {
          console.log("[ImagiPark/EditorScan] PASSED URLs ↓");
          _debugSeen.forEach((d, i) => console.log(`  [${i}] ${d.w}x${d.h} ${d.src}`));
        }
        if (_debugRejected.length) {
          console.log("[ImagiPark/EditorScan] REJECTED URLs ↓");
          _debugRejected.forEach((d, i) => console.log(`  [${i}] ${d.reason} ${d.w}x${d.h} ${d.src}`));
        }
      } catch (_) {}
      // 시간순 (오래된 것 먼저) — DOM 의 위쪽이 대화 시작점이라 그대로 유지.
      // 길이 제한 200장 — 매우 긴 대화 히스토리도 대부분 커버.
      const urls = out.slice(0, 200);

      if (!includeB64) {
        return { ok: true, images: urls, nodeCount: nodes.length, usedUrlFallback };
      }

      // b64 까지 한 번에 처리 (round-trip 단축용 — editorPullFromChat 가 사용)
      function bytesToB64(bytes) {
        let binary = "";
        const chunk = 0x8000;
        for (let off = 0; off < bytes.length; off += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(off, Math.min(off + chunk, bytes.length)));
        }
        return btoa(binary);
      }
      const fetched = [];
      for (const u of urls) {
        try {
          const r = await fetch(u, { cache: "no-store" });
          if (!r.ok) { fetched.push({ src: u, error: `fetch ${r.status}` }); continue; }
          const blob = await r.blob();
          const buf = await blob.arrayBuffer();
          const b64 = bytesToB64(new Uint8Array(buf));
          fetched.push({ src: u, b64, mime: blob.type || "image/png" });
        } catch (e) {
          fetched.push({ src: u, error: (e && e.message) || String(e) });
        }
      }
      return { ok: true, images: urls, fetched, nodeCount: nodes.length, usedUrlFallback };
    },
    async IMAGIPARK_FETCH_IMAGE_B64(msg) {
      // 이미지 URL 을 fetch 해서 base64 로 반환 (sidepanel 의 시트 미리보기·저장용)
      const url = msg && msg.url;
      if (!url) return { ok: false, error: "URL 필요" };
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { ok: false, error: `fetch ${res.status}` };
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let off = 0; off < bytes.length; off += chunk) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(off, Math.min(off + chunk, bytes.length))
          );
        }
        return { ok: true, b64: btoa(binary), mime: blob.type || "image/png", size: bytes.length };
      } catch (e) {
        return { ok: false, error: (e && e.message) || String(e) };
      }
    },
    async IMAGIPARK_ATTACH_IMAGE_URL(msg) {
      // URL 의 이미지를 fetch 해서 composer 에 첨부 — 일관성 유지용
      const url = msg && msg.url;
      if (!url) return { ok: false, error: "URL 필요" };
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { ok: false, error: `fetch ${res.status}` };
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let off = 0; off < bytes.length; off += chunk) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(off, Math.min(off + chunk, bytes.length))
          );
        }
        const b64 = btoa(binary);
        await DOM().attachFiles([{
          mime: blob.type || "image/png",
          b64,
          name: msg.name || "previous.png",
        }]);
        return { ok: true, mime: blob.type, size: bytes.length };
      } catch (e) {
        return { ok: false, error: (e && e.message) || String(e) };
      }
    },
    async IMAGIPARK_FETCH_IMAGES(msg) {
      return { ok: true, ...(await fetchAllImageMessages({
        allowedFileIds: (msg && msg.allowedFileIds) || null,
      })) };
    },
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const handler = HANDLERS[msg && msg.type];
    if (!handler) return false; // 이 content script 의 관심사가 아님
    (async () => {
      try {
        const out = await handler(msg);
        sendResponse(out);
      } catch (e) {
        sendResponse({
          ok: false,
          aborted: !!(e && e.aborted),
          error: (e && e.message) || String(e),
          stack: (e && e.stack) || "",
        });
      }
    })();
    return true; // async sendResponse
  });
})();
