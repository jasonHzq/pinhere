import { describe, expect, it } from "vitest";
import { parseExtensionRedirectUri } from "./extension-oauth.server";

describe("parseExtensionRedirectUri", () => {
  it("accepts Chrome's HTTPS callback origin", () => {
    expect(parseExtensionRedirectUri("https://abcdefghijklmnop.chromiumapp.org/oauth2")?.hostname).toBe("abcdefghijklmnop.chromiumapp.org");
  });

  it("rejects non-Chrome and non-HTTPS callback origins", () => {
    expect(parseExtensionRedirectUri("https://pinhere.dev/oauth2")).toBeNull();
    expect(parseExtensionRedirectUri("http://abcdefghijklmnop.chromiumapp.org/oauth2")).toBeNull();
  });
});
