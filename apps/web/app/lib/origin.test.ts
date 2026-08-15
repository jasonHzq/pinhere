import { describe, expect, it } from "vitest";
import { normalizeOrigin, sanitizePageUrl } from "./origin";

describe("URL safety", () => {
  it("matches only normalized scheme, host and port", () => {
    expect(normalizeOrigin("HTTPS://Example.COM/path?q=1")).toBe("https://example.com");
    expect(normalizeOrigin("http://localhost:5173/a")).toBe("http://localhost:5173");
  });

  it("redacts likely credentials while retaining navigation context", () => {
    const result = sanitizePageUrl("https://app.test/orders/4?tab=info&access_token=abc#session=def");
    expect(result).toContain("tab=info");
    expect(result).not.toContain("abc");
    expect(result).not.toContain("def");
  });
});
