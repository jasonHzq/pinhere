import { describe, expect, it } from "vitest";
import { parseExtensionRedirectUri } from "./extension-oauth.server";

describe("parseExtensionRedirectUri", () => {
  it("accepts Chrome's HTTPS callback origin", () => {
    expect(parseExtensionRedirectUri("https://abcdefghijklmnop.chromiumapp.org/oauth2")?.hostname).toBe("abcdefghijklmnop.chromiumapp.org");
  });

  it("accepts Safari's same-origin completion page", () => {
    expect(parseExtensionRedirectUri("https://pinhere.dev/zh-CN/extension/authorized", "https://pinhere.dev")?.pathname).toBe("/zh-CN/extension/authorized");
    expect(parseExtensionRedirectUri("http://localhost:5173/en/extension/authorized", "http://localhost:5173")?.pathname).toBe("/en/extension/authorized");
  });

  it("rejects arbitrary web callbacks and non-HTTPS Chrome callbacks", () => {
    expect(parseExtensionRedirectUri("https://evil.test/zh-CN/extension/authorized", "https://pinhere.dev")).toBeNull();
    expect(parseExtensionRedirectUri("https://pinhere.dev/oauth2", "https://pinhere.dev")).toBeNull();
    expect(parseExtensionRedirectUri("http://abcdefghijklmnop.chromiumapp.org/oauth2")).toBeNull();
  });
});
