import { describe, expect, it } from "vitest";
import { authEntryPath, safeReturnTo, workspacePath } from "./auth-navigation";

describe("authentication navigation", () => {
  it("sends authenticated visitors to their localized workspace", () => {
    expect(authEntryPath("en", true)).toBe("/en/app");
    expect(authEntryPath("zh-CN", true)).toBe("/zh-CN/app");
    expect(authEntryPath("en", false)).toBe("/en/sign-in");
  });

  it("accepts internal return paths and rejects external or recursive sign-in targets", () => {
    expect(safeReturnTo("/en/app/settings?tab=agent", "en")).toBe("/en/app/settings?tab=agent");
    expect(safeReturnTo("https://example.com", "en")).toBe(workspacePath("en"));
    expect(safeReturnTo("//example.com", "en")).toBe(workspacePath("en"));
    expect(safeReturnTo("/en/sign-in", "en")).toBe(workspacePath("en"));
  });
});
