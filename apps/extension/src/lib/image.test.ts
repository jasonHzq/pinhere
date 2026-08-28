import { describe, expect, it } from "vitest";
import { viewportRectToImageRect } from "./image";

describe("viewportRectToImageRect", () => {
  it("scales a CSS-pixel selection to a HiDPI screenshot", () => {
    expect(viewportRectToImageRect(
      { width: 2880, height: 1800 },
      { width: 1440, height: 900 },
      { x: 120, y: 80, width: 640, height: 360 }
    )).toEqual({ x: 240, y: 160, width: 1280, height: 720 });
  });

  it("clips a partly offscreen rectangle to the captured image", () => {
    expect(viewportRectToImageRect(
      { width: 1000, height: 800 },
      { width: 1000, height: 800 },
      { x: -20, y: 760, width: 100, height: 100 }
    )).toEqual({ x: 0, y: 760, width: 80, height: 40 });
  });
});
