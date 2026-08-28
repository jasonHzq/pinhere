import { describe, expect, it } from "vitest";
import { manualIssueDescription, manualIssuePayload, pageBelongsToProject } from "./manual-issue";

describe("manual issue creation", () => {
  it("accepts pages assigned to the selected project", () => {
    expect(pageBelongsToProject("https://example.com/account?tab=profile", ["https://example.com"])).toBe(true);
    expect(pageBelongsToProject("https://other.example.com/account", ["https://example.com"])).toBe(false);
    expect(pageBelongsToProject("not a URL", ["https://example.com"])).toBe(false);
  });

  it("creates a valid issue payload without fabricated page DOM", () => {
    expect(manualIssuePayload({
      projectId: "project-1",
      title: "  Checkout is blocked  ",
      description: manualIssueDescription(true),
      pageUrl: "  https://example.com/checkout  "
    })).toMatchObject({
      projectId: "project-1",
      title: "Checkout is blocked",
      pageUrl: "https://example.com/checkout",
      source: "web",
      dom: {
        cssSelector: "",
        tagName: "manual-report",
        viewport: { width: 1, height: 1, devicePixelRatio: 1 },
        boundingRect: { width: 0, height: 0 }
      }
    });
  });
});
