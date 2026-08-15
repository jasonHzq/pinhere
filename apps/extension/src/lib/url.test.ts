import { expect, it } from "vitest";
import { sanitizeUrl } from "./url";
it("redacts sensitive URL fields", () => { const result = sanitizeUrl("https://a.test/x?tab=2&token=secret#session=value"); expect(result).toContain("tab=2"); expect(result).not.toContain("secret"); expect(result).not.toContain("value"); });
