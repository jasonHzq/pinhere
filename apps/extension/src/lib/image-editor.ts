import type { Rect } from "@/types";

export const IMAGE_EDITOR_DRAFT_KEY = "pinhere_image_editor_draft";
export const IMAGE_EDITOR_RESULT_KEY = "pinhere_image_editor_result";

export type ImageEditorDraft = {
  sessionId: string;
  screenshot: string;
  crop: Rect;
  initialCrop: Rect;
};

export type ImageEditorResult = {
  sessionId: string;
  crop: Rect;
};

function isRect(value: unknown): value is Rect {
  if (!value || typeof value !== "object") return false;
  const rect = value as Partial<Rect>;
  return [rect.x, rect.y, rect.width, rect.height].every((part) => typeof part === "number" && Number.isFinite(part))
    && (rect.width ?? 0) > 0
    && (rect.height ?? 0) > 0;
}

export function readImageEditorResult(value: unknown): ImageEditorResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Partial<ImageEditorResult>;
  return typeof result.sessionId === "string" && isRect(result.crop)
    ? { sessionId: result.sessionId, crop: result.crop }
    : null;
}

export function imageEditorUrl(sessionId: string) {
  return chrome.runtime.getURL(`image-editor.html?session=${encodeURIComponent(sessionId)}`);
}
