import { describe, expect, it } from "vitest";
import chromeManifest from "../../manifests/chrome.json";

describe("Chrome extension manifest", () => {
  it("uses the action popover and never registers a side panel", () => {
    expect(chromeManifest.action.default_popup).toBe("popup.html");
    expect(chromeManifest.permissions).not.toContain("sidePanel");
    expect(chromeManifest).not.toHaveProperty("side_panel");
  });
});
