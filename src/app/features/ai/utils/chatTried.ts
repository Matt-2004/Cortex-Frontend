/**
 * Remembers, in this browser only, that the user has asked the assistant a
 * question — so the Overview's setup checklist can tick "Test in chat".
 * A per-viewer convenience: losing it only re-shows a checklist step.
 */
const KEY = "cortex.chat-tried";
const listeners = new Set<() => void>();

export function markChatTried() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: the step just stays unticked.
  }
  listeners.forEach((listener) => listener());
}

export function hasTriedChat(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribeChatTried(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
