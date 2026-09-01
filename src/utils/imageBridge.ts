// 이미지 생성 바로가기 — 확장 없이 PLIX가 새 창만 연다.
// 고객은 이미 구글/GPT에 로그인돼 있으므로 새 대화창이 바로 뜬다.
// - ChatGPT: ?q= URL 파라미터를 네이티브 지원 → 프롬프트 자동 입력 + 자동 전송.
// - Gemini: URL 프리필 네이티브 미지원 → 새 창만 열고 프롬프트는 클립보드에 복사(고객이 Ctrl+V).

export type ImagePlatform = 'gemini' | 'chatgpt';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 새 창으로 이미지 생성 사이트를 연다.
 * @returns prefilled=true 면 프롬프트가 URL로 자동 입력·전송됨(ChatGPT),
 *          false 면 클립보드에 복사만 됨(Gemini — 고객이 붙여넣기).
 */
export async function openImageChat(
  platform: ImagePlatform,
  prompt: string
): Promise<{ prefilled: boolean; copied: boolean }> {
  const copied = await copyToClipboard(prompt);

  if (platform === 'chatgpt') {
    // 이미지 프롬프트임을 명시해 이미지 생성으로 이어지게 한다.
    const q = 'Create this image (1280x720, 16:9):\n\n' + prompt;
    const url = 'https://chatgpt.com/?q=' + encodeURIComponent(q);
    window.open(url, '_blank', 'noopener');
    return { prefilled: true, copied };
  }

  // Gemini: 새 대화창만 열고, 프롬프트는 클립보드로.
  window.open('https://gemini.google.com/app', '_blank', 'noopener');
  return { prefilled: false, copied };
}
