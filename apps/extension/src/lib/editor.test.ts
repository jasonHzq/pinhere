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
});
