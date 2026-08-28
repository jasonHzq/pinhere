import { describe, expect, it, vi } from "vitest";
import { captureAndOpenEditor, openEditorSurface } from "./editor";

describe("openEditorSurface", () => {
  it("opens the capture editor in the current page modal", async () => {
    const openModal = vi.fn(async () => undefined);

    await openEditorSurface(openModal);

    expect(openModal).toHaveBeenCalledOnce();
  });
});

describe("captureAndOpenEditor", () => {
  it("starts capture storage and editor opening without serializing them", async () => {
    const calls: string[] = [];
    let finishStorage!: () => void;
    const storageFinished = new Promise<void>((resolve) => { finishStorage = resolve; });

    const result = captureAndOpenEditor(
      async () => { calls.push("store-capture"); await storageFinished; },
      async () => { calls.push("open-editor"); }
    );

    expect(calls).toEqual(["store-capture", "open-editor"]);
    finishStorage();
    await result;
  });

  it("opens exactly one editor surface", async () => {
    const openEditor = vi.fn(async () => undefined);

    await captureAndOpenEditor(
      async () => undefined,
      openEditor
    );

    expect(openEditor).toHaveBeenCalledOnce();
  });

  it("reports capture storage failures after opening the editor shell", async () => {
    const openEditor = vi.fn(async () => undefined);

    await expect(captureAndOpenEditor(
      async () => { throw new Error("capture failed"); },
      openEditor
    )).rejects.toThrow("capture failed");

    expect(openEditor).toHaveBeenCalledOnce();
  });
});
