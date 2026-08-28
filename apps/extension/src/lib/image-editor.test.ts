import { describe, expect, it } from "vitest";
import { readImageEditorResult } from "./image-editor";

describe("readImageEditorResult", () => {
  it("accepts a crop returned by the focused editor", () => {
    expect(readImageEditorResult({
      sessionId: "editor-1",
      crop: { x: 12, y: 18, width: 640, height: 360 }
    })).toEqual({
      sessionId: "editor-1",
      crop: { x: 12, y: 18, width: 640, height: 360 }
    });
  });

  it("rejects malformed or empty selections", () => {
    expect(readImageEditorResult({ sessionId: "editor-1", crop: { x: 0, y: 0, width: 0, height: 20 } })).toBeNull();
    expect(readImageEditorResult({ crop: { x: 0, y: 0, width: 20, height: 20 } })).toBeNull();
  });
});
