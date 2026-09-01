# PLIX Bridge (Chrome 확장 v1.0.0)

PLIX 6단계 썸네일 프롬프트를 **ChatGPT·Gemini 새 대화에 자동 입력하고 이미지 생성까지 실행**합니다.
프롬프트 주입 로직(`lib/*-dom.js`, `content/bridge.js`)은 ImagiPark 검증본을 그대로 재사용합니다.

## 설치 (개발자 모드)
1. Chrome 주소창 → `chrome://extensions`
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드** → 이 `extension/` 폴더 선택
4. ChatGPT / Gemini 에 **로그인**해 둔다.

## 사용
1. PLIX(https://plix-shared-bice.vercel.app) 6단계에서 프롬프트 생성
2. **[ChatGPT로 생성]** 또는 **[Gemini로 생성]** 클릭
3. 확장이 대상 탭을 열어 새 대화 → 이미지 모드 → 프롬프트 입력 → 전송까지 실행

확장 미설치 시: 프롬프트가 클립보드에 복사되고 대상 사이트가 새 탭으로 열립니다(수동 붙여넣기).

## 주의
- 대상 탭이 **화면에 보이는 상태**여야 합니다(백그라운드면 브라우저가 타이머를 억제해 실패 가능).
- 사이트 UI가 바뀌면 `lib/gemini-dom.js` / `lib/chatgpt-dom.js` 의 selector 갱신 필요.
- 도메인이 바뀌면 `manifest.json` 의 `host_permissions` / `content_scripts` 의 plix 주소를 갱신.
