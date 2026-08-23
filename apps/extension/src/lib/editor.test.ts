import { describe, expect, it, vi } from "vitest";
import { captureAndOpenEditor } from "./editor";

describe("captureAndOpenEditor", () => {
  it("stores the capture before opening the editor popup", async () => {
    const calls: string[] = [];

    await captureAndOpenEditor(
      async () => { calls.push("store-capture"); },
      async () => { calls.push("open-popup"); }
    );

    expect(calls).toEqual(["store-capture", "open-popup"]);
  });

  it("opens exactly one editor popup", async () => {
    const openPopup = vi.fn(async () => undefined);

    await captureAndOpenEditor(
      async () => undefined,
      openPopup
    );

    expect(openPopup).toHaveBeenCalledOnce();
  });

  it("does not open an editor when the capture cannot be stored", async () => {
    const openPopup = vi.fn(async () => undefined);

    await expect(captureAndOpenEditor(
      async () => { throw new Error("capture failed"); },
      openPopup
    )).rejects.toThrow("capture failed");

    expect(openPopup).not.toHaveBeenCalled();
  });
});
