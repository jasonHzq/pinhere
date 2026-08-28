import { describe, expect, it } from "vitest";
import chromeManifest from "../../manifests/chrome.json";

describe("Chrome extension manifest", () => {
  it("keeps the action popover and exposes the in-page capture editor", () => {
    expect(chromeManifest.action.default_popup).toBe("popup.html");
    expect(chromeManifest.permissions).not.toContain("sidePanel");
    expect(chromeManifest.web_accessible_resources).toEqual([
      expect.objectContaining({
        resources: expect.arrayContaining(["capture-editor.html", "assets/*"]),
        use_dynamic_url: true
      })
    ]);
  });
});
