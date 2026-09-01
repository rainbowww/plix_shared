// ImagiPark — ChatGPT 네트워크 훅 (MAIN world 주입 전용)
// ─────────────────────────────────────────────────────────────────
// 목적:
//   ChatGPT 는 /backend-api/conversation SSE 스트림으로 응답을 보내고,
//   이미지가 준비되면 JSON 이벤트 안에 `asset_pointer: "file-service://file_..."`
//   형태로 file_ID 를 먼저 내려준다. 이 시점은 DOM 이 해당 이미지를 렌더링하기
//   **이전**이므로, 우리가 이걸 가로채면 DOM 기반 휴리스틱보다 훨씬 빠르고
//   정확하게 "이미지 생성 완료" 를 알 수 있다.
//
// 설치:
//   manifest.json content_scripts 에 world:"MAIN" + run_at:"document_start"
//   로 등록. isolated world (chatgpt-dom.js) 에서는 window.fetch 를 훅킹할 수
//   없지만 MAIN world 에서는 가능.
//
// 전달 경로:
//   fetch 훅 → window.postMessage({ __imagipark_src__: "net-hook", ... })
//   → isolated world 의 chatgpt-dom.js 가 message 이벤트로 수신
//
// 실패 안전성:
//   ChatGPT 가 SSE 포맷을 바꾸면 fid 추출이 실패할 수 있으나, 그 경우 이벤트가
//   단순히 "오지 않는" 것이므로 chatgpt-dom.js 의 기존 DOM 휴리스틱으로
//   자동 폴백된다. (이 훅은 완전히 fire-and-forget 부가 신호)
//
// 성능:
//   response.clone() 로 body 를 두 갈래로 분기 — 원본 스트림은 그대로 페이지가
//   사용, 복제 스트림만 우리가 스캔. 메모리는 최근 16KB 윈도우만 유지.
(function () {
  "use strict";

  // 중복 주입 방어 (SPA 네비게이션 후 재주입 대비)
  if (window.__IMAGIPARK_NET_HOOK_V1__) return;
  window.__IMAGIPARK_NET_HOOK_V1__ = true;

  const TAG = "[ImagiPark/net-hook]";

  function post(payload) {
    try {
      window.postMessage(
        Object.assign({ __imagipark_src__: "net-hook" }, payload),
        location.origin
      );
    } catch (_) {}
  }

  // ChatGPT 의 대화 endpoint 패턴 — 빌드별 변형 대응
  // estuary 등 새 라우팅 prefix 포함 + 변형(conversation|messages|chat) 모두 매칭
  function isConversationUrl(url) {
    if (!url) return false;
    return (
      /\/backend-api\/(?:[a-z0-9-]+\/)*conversation(\b|\?|\/|$)/i.test(url) ||
      /\/backend-api\/(?:[a-z0-9-]+\/)*messages(\b|\?|\/|$)/i.test(url) ||
      /\/backend-api\/estuary\/[a-z0-9_-]+/i.test(url) ||
      /\/backend-api\/lat\/conversation/i.test(url) ||
      /\/backend-api\/f\/conversation/i.test(url)
    );
  }

  // SSE 청크 스캔: 이미지 포인터 근처의 file_ID 만 추출 (오탐 최소화)
  // 매칭 대상 키:
  //   - "asset_pointer" : "file-service://file_..."   (이미지 자산)
  //   - "image_url"     : "...file_..."               (일부 빌드)
  //   - "image_gen_id"  : "file_..."
  //   - "content_type":"image_asset_pointer" 근처의 file_
  function scanChunk(text, seenFids) {
    // 핵심 패턴 1: asset_pointer / image_url / image_gen_id 같은 키 바로 뒤의 file_
    const imgRe =
      /(?:asset_pointer|image_url|image_gen_id|image_request_id|download_url|file_id|attachment_id|content_ref|image_id)[^"]{0,10}"[^"]*file[_-]([A-Za-z0-9]{16,})/g;
    let m;
    while ((m = imgRe.exec(text)) !== null) {
      const fid = m[1];
      if (seenFids.has(fid)) continue;
      seenFids.add(fid);
      post({ type: "IMAGIPARK_NET_IMAGE", fid, at: Date.now() });
    }
    // 보조 패턴: "content_type":"image_asset_pointer" 블록 내부의 file_
    // (키 순서가 달라져도 잡히도록)
    const blockRe = /"content_type"\s*:\s*"image_asset_pointer"[\s\S]{0,400}?file[_-]([A-Za-z0-9]{16,})/g;
    while ((m = blockRe.exec(text)) !== null) {
      const fid = m[1];
      if (seenFids.has(fid)) continue;
      seenFids.add(fid);
      post({ type: "IMAGIPARK_NET_IMAGE", fid, at: Date.now() });
    }
    // estuary 대응 — 이미지 content endpoint URL 자체가 스트림에 문자열로 등장하는 경우
    //   예: "https://chatgpt.com/backend-api/estuary/content?id=file_XXXX..."
    const estuaryRe = /estuary\/content\?id=file[_-]([A-Za-z0-9]{16,})/g;
    while ((m = estuaryRe.exec(text)) !== null) {
      const fid = m[1];
      if (seenFids.has(fid)) continue;
      seenFids.add(fid);
      post({ type: "IMAGIPARK_NET_IMAGE", fid, at: Date.now() });
    }

    // 스트림 완료 플래그 — 참고용 (DOM 의 Stop 버튼 사라짐과 거의 동시)
    if (
      /"is_complete"\s*:\s*true/.test(text) ||
      /"message_stream_complete"/.test(text) ||
      /"status"\s*:\s*"finished_successfully"/.test(text) ||
      /"done"\s*:\s*true/.test(text)
    ) {
      post({ type: "IMAGIPARK_NET_STREAM_COMPLETE", at: Date.now() });
    }

    // Rate limit / 429 감지 — 서버가 SSE 본문 또는 JSON 으로 내려주는 에러 메시지
    //   {"error":{"message":"You're generating images too quickly...", "code":"rate_limit_exceeded", ...}}
    // 또는 "rate limit" / "generating images too quickly" 문자열 포함
    if (
      /"code"\s*:\s*"rate_limit_exceeded"/i.test(text) ||
      /generating images too quickly/i.test(text) ||
      /rate[_\s-]?limit/i.test(text) && /"type"\s*:\s*"images"/i.test(text)
    ) {
      // 메시지에서 대기 시간 추출 시도 ("Please wait for 3 minutes" → 180)
      let waitSec = 180;
      const mWait = text.match(/wait\s+for\s+(\d+)\s*(minute|min|second|sec)/i);
      if (mWait) {
        const n = parseInt(mWait[1], 10);
        waitSec = /min/i.test(mWait[2]) ? n * 60 : n;
      }
      post({ type: "IMAGIPARK_NET_RATE_LIMIT", waitSec, at: Date.now() });
    }
  }

  // ───── fetch 훅 ─────
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const p = origFetch.apply(this, arguments);
    return p.then((res) => {
      try {
        // 디버그 모드 — window.__IMAGIPARK_NET_DEBUG__ = true 로 켜면
        // backend-api 로 가는 모든 요청 URL 을 콘솔에 찍어서, SSE endpoint 가
        // 새 경로로 바뀌었는지 파악할 수 있게 한다.
        if (window.__IMAGIPARK_NET_DEBUG__ && /\/backend-api\//.test(url)) {
          const matched = isConversationUrl(url);
          console.log(
            "%c[net-hook dbg]" + (matched ? " ★ MATCH" : "") + " " + url,
            matched ? "color:#4ade80" : "color:#888"
          );
        }
        // HTTP 상태코드 기반 rate limit 감지 (본문 파싱 전에도 감지 가능)
        if (isConversationUrl(url) && res && res.status === 429) {
          post({ type: "IMAGIPARK_NET_RATE_LIMIT", waitSec: 180, at: Date.now(), source: "http429" });
        }
        if (isConversationUrl(url) && res && res.body) {
          // clone 으로 body 를 평행 스트림으로 분기 — 원본은 페이지가 사용
          let cloned;
          try {
            cloned = res.clone();
          } catch (_) {
            return res;
          }
          (async () => {
            const reader = cloned.body.getReader();
            const dec = new TextDecoder();
            const seen = new Set();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                scanChunk(buf, seen);
                // 메모리 보호 — 최근 16KB 윈도우 유지 (패턴 경계가 잘려도 다음 청크에서 회수)
                if (buf.length > 65536) buf = buf.slice(-16384);
              }
              // flush
              buf += dec.decode();
              scanChunk(buf, seen);
              post({ type: "IMAGIPARK_NET_STREAM_CLOSED", at: Date.now() });
            } catch (_) {
              // 페이지가 abort 해도 무시
            }
          })();
        }
      } catch (e) {
        console.warn(TAG, "fetch hook error", e);
      }
      return res;
    });
  };

  // ───── XHR 훅 (보조) ─────
  // 일부 빌드가 XHR 로 스트리밍을 할 경우 대비. responseText 증분만 스캔.
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__imagipark_url__ = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (isConversationUrl(this.__imagipark_url__ || "")) {
        const seen = new Set();
        let lastLen = 0;
        this.addEventListener("readystatechange", () => {
          try {
            if (this.readyState >= 3 && typeof this.responseText === "string") {
              const txt = this.responseText;
              if (txt.length > lastLen) {
                scanChunk(txt.slice(lastLen), seen);
                lastLen = txt.length;
              }
            }
          } catch (_) {}
        });
      }
      return origSend.apply(this, arguments);
    };
  } catch (_) {
    // XHR 훅 실패는 치명적이지 않음 — fetch 훅으로 대부분 커버
  }

  console.log(TAG, "installed v1 (MAIN world)");
})();
