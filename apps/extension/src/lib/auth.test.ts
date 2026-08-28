import { describe, expect, it } from "vitest";
import { isSafariOAuthCallback } from "./auth";

describe("Safari OAuth callback", () => {
  it("accepts only the configured Pinhere completion page with a code", () => {
    expect(isSafariOAuthCallback("https://pinhere.dev/zh-CN/extension/authorized?code=ph_code_test")).toBe(true);
    expect(isSafariOAuthCallback("https://pinhere.dev/zh-CN/extension/authorized")).toBe(false);
    expect(isSafariOAuthCallback("https://evil.test/zh-CN/extension/authorized?code=ph_code_test")).toBe(false);
  });
});
