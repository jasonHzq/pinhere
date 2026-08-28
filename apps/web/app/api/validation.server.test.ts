import { describe, expect, it } from "vitest";
import { expectedVersion, versionPrecondition } from "./validation.server";

describe("version preconditions", () => {
  it("prefers the Pinhere-specific header so hosting proxies do not evaluate it", () => {
    const request = new Request("https://pinhere.dev/api/v1/issues/example", {
      headers: { "If-Match": '"3"', "X-Pinhere-If-Match": '"4"' }
    });

    expect(versionPrecondition(request)).toBe('"4"');
    expect(() => expectedVersion(request, 4)).not.toThrow();
  });

  it("keeps accepting legacy If-Match requests at the application server", () => {
    const request = new Request("https://pinhere.dev/api/v1/issues/example", {
      headers: { "If-Match": '"4"' }
    });

    expect(() => expectedVersion(request, 4)).not.toThrow();
  });
});
