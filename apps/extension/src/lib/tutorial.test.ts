import { describe, expect, it } from "vitest";
import { shouldShowCaptureTutorial } from "./tutorial";

describe("shouldShowCaptureTutorial", () => {
  it("shows the tutorial until the user explicitly dismisses it", () => {
    expect(shouldShowCaptureTutorial(undefined)).toBe(true);
    expect(shouldShowCaptureTutorial(false)).toBe(true);
    expect(shouldShowCaptureTutorial(true)).toBe(false);
  });
});
