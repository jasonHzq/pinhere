import type { PendingCapture } from "@/types";

export const PENDING_CAPTURE_KEY = "pinhere_pending_capture";

export function pendingCaptureBelongsToTab(
  capture: PendingCapture,
  tab: Pick<chrome.tabs.Tab, "id" | "url"> | undefined
) {
  if (!tab?.url) return false;
  if (capture.tabId !== undefined) return capture.tabId === tab.id;

  // Captures saved by older extension versions have no tab id. Restrict their
  // recovery to the same origin so stale work from another site cannot leak
  // into the currently opened popup/side panel.
  try {
    return new URL(capture.pageUrl).origin === new URL(tab.url).origin;
  } catch {
    return false;
  }
}

export async function readPendingCapture() {
  const value = await chrome.storage.local.get(PENDING_CAPTURE_KEY);
  return (value[PENDING_CAPTURE_KEY] as PendingCapture | undefined) ?? null;
}

export async function clearPendingCapture() {
  await chrome.storage.local.remove(PENDING_CAPTURE_KEY);
  await chrome.action.setBadgeText({ text: "" });
  await chrome.action.setTitle({ title: "打开 Pinhere" });
}
