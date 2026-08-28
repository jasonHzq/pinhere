import { describe, expect, it } from "vitest";
import { issueInput, issueUpdateInput } from "./issue-input.server";

describe("issue input schemas", () => {
  it("parses an issue update without deriving from the refined creation schema", () => {
    expect(issueUpdateInput.parse({ title: "Updated title" })).toEqual({ title: "Updated title" });
    expect(issueUpdateInput.parse({ description: "Updated description" })).toEqual({ description: "Updated description" });
  });

  it("keeps the create-only attachment refinement", () => {
    const shared = {
      projectId: "project-1",
      title: "Issue title",
      description: "Issue description",
      pageUrl: "https://example.com/page",
      dom: {
        cssSelector: "body",
        xpath: "/html/body",
        tagName: "body",
        attributes: {},
        text: "Page",
        outerHTML: "<body>Page</body>",
        viewport: { width: 1280, height: 720, devicePixelRatio: 1 },
        boundingRect: { x: 0, y: 0, width: 1280, height: 720 }
      }
    };

    expect(issueInput.safeParse({
      ...shared,
      attachmentId: "attachment-1",
      screenshot: { fileName: "page.png", contentType: "image/png", base64: "AAAA" }
    }).success).toBe(false);
  });
});
