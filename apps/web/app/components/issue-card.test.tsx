import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { IssueCard, type IssueSummary } from "./issue-card";

const baseIssue: IssueSummary = {
  id: "pinhere-dropdown-is-obscured",
  idStatus: "generated",
  projectId: "prj_1",
  title: "Dropdown is obscured",
  description: "The menu is hidden behind the issue list.",
  pageUrl: "https://pinhere.dev/zh-CN/app",
  status: "in_progress",
  createdAt: "2026-08-28T07:00:00.000Z",
  updatedAt: "2026-08-28T07:30:00.000Z"
};

function render(issue: IssueSummary) {
  return renderToStaticMarkup(
    <StaticRouter location="/zh-CN/app">
      <IssueCard issue={issue} />
    </StaticRouter>
  );
}

describe("IssueCard", () => {
  it("shows the claiming agent and healthy heartbeat on an in-progress issue", () => {
    const html = render({
      ...baseIssue,
      claimedAgent: {
        id: "agt_1",
        name: "Pinhere E2E Agent",
        health: "online",
        lastSeenAt: "2026-08-28T07:29:30.000Z"
      }
    });

    expect(html).toContain("Pinhere E2E Agent");
    expect(html).toContain("心跳正常");
    expect(html).toContain("lucide-bot");
  });

  it("does not show stale claim ownership after an issue is completed", () => {
    const html = render({
      ...baseIssue,
      status: "done",
      claimedAgent: {
        id: "agt_1",
        name: "Pinhere E2E Agent",
        health: "offline",
        lastSeenAt: null
      }
    });

    expect(html).not.toContain("Pinhere E2E Agent");
    expect(html).not.toContain("心跳已停止");
  });
});
