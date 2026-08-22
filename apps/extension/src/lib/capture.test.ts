import { describe, expect, it } from "vitest";
import type { PendingCapture } from "@/types";
import { pendingCaptureBelongsToTab } from "./capture";

const capture = (overrides: Partial<PendingCapture> = {}): PendingCapture => ({
  tabId: 42,
  pageUrl: "https://pontx.dev/docs",
  dom: {} as PendingCapture["dom"],
  screenshot: "data:image/png;base64,test",
  ...overrides
});

describe("pendingCaptureBelongsToTab", () => {
  it("restores a capture only in the tab that created it", () => {
    expect(pendingCaptureBelongsToTab(capture(), { id: 42, url: "https://pontx.dev/docs" })).toBe(true);
    expect(pendingCaptureBelongsToTab(capture(), { id: 7, url: "https://pinhere.dev/zh-CN/app" })).toBe(false);
  });

  it("matches legacy captures by origin", () => {
    const legacyCapture = capture({ tabId: undefined });
    expect(pendingCaptureBelongsToTab(legacyCapture, { id: 7, url: "https://pontx.dev/guide" })).toBe(true);
    expect(pendingCaptureBelongsToTab(legacyCapture, { id: 7, url: "https://pinhere.dev/" })).toBe(false);
  });

  it("rejects tabs without a valid URL", () => {
    expect(pendingCaptureBelongsToTab(capture(), { id: 42 })).toBe(false);
  });
});
