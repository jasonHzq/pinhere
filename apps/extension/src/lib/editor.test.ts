import { describe, expect, it, vi } from "vitest";
import { captureAndOpenEditor } from "./editor";

describe("captureAndOpenEditor", () => {
  it("requests the editor before asynchronous capture work starts", async () => {
    const calls: string[] = [];

    await captureAndOpenEditor(
      async () => { calls.push("open-editor"); return true; },
      async () => { calls.push("store-capture"); },
      async () => { calls.push("open-fallback"); }
    );

    expect(calls).toEqual(["open-editor", "store-capture"]);
  });

  it("opens a popup fallback only after the capture is stored", async () => {
    const calls: string[] = [];
    const fallback = vi.fn(async () => { calls.push("open-fallback"); });

    await captureAndOpenEditor(
      async () => { calls.push("open-editor"); return false; },
      async () => { calls.push("store-capture"); },
      fallback
    );

    expect(calls).toEqual(["open-editor", "store-capture", "open-fallback"]);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("opens the popup fallback when Chrome leaves sidePanel.open pending", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];

    try {
      const result = captureAndOpenEditor(
        () => new Promise<boolean>(() => undefined),
        async () => { calls.push("store-capture"); },
        async () => { calls.push("open-fallback"); },
        400
      );

      await vi.advanceTimersByTimeAsync(400);
      await result;
      expect(calls).toEqual(["store-capture", "open-fallback"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the popup fallback when sidePanel.open rejects", async () => {
    const calls: string[] = [];

    await captureAndOpenEditor(
      async () => { throw new Error("side panel unavailable"); },
      async () => { calls.push("store-capture"); },
      async () => { calls.push("open-fallback"); }
    );

    expect(calls).toEqual(["store-capture", "open-fallback"]);
  });
});
