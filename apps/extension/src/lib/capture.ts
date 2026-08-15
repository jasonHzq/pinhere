import type { PendingCapture } from "@/types";

export const PENDING_CAPTURE_KEY = "pinhere_pending_capture";

export async function readPendingCapture() {
  const value = await chrome.storage.session.get(PENDING_CAPTURE_KEY);
  return (value[PENDING_CAPTURE_KEY] as PendingCapture | undefined) ?? null;
}

export async function clearPendingCapture() {
  await chrome.storage.session.remove(PENDING_CAPTURE_KEY);
  await chrome.action.setBadgeText({ text: "" });
  await chrome.action.setTitle({ title: "打开 Pinhere" });
}
