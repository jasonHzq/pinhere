import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { launchAgentPlist, repairPrompt, runnableBindings } from "./service.js";

describe("Pinhere repair handoff", () => {
  it("leaves repository workflow decisions to the harness", async () => {
    const skill = await readFile(new URL("../skill/SKILL.md", import.meta.url), "utf8");
    const prompt = repairPrompt({
      id: "payment-center-checkout-button-broken",
      projectId: "prj_example",
      title: "Example issue",
      description: "Example description",
      pageUrl: "https://example.com",
      dom: { cssSelector: "#target", xpath: "//*[@id='target']", outerHTML: "<div id='target'></div>" },
      status: "in_progress"
    });

    expect(skill).toContain("current harness's own workflow");
    expect(skill).toContain("public `identifier`");
    expect(skill).toContain("pinhere agent pause --project <project-identifier>");
    expect(skill).not.toContain("<project-id>");
    expect(prompt).toContain("current harness's own workflow");
    expect(`${skill}\n${prompt}`).not.toMatch(/do not (?:commit|push|deploy)|open a (?:pull request|PR)/i);
  });

  it("tells the agent when the issue was located by a visual region instead of a DOM selector", () => {
    const prompt = repairPrompt({
      id: "cross-dom-layout-issue",
      projectId: "prj_example",
      title: "Example visual issue",
      description: "Two adjacent nodes are misaligned",
      pageUrl: "https://example.com",
      dom: { cssSelector: "", xpath: "", outerHTML: "" },
      status: "in_progress"
    });

    expect(prompt).toContain("visual screenshot region");
    expect(prompt).not.toContain("Selector:");
  });
});

describe("project-level polling control", () => {
  it("skips paused bindings without stopping other projects", () => {
    const bindings = [
      { projectId: "prj_a", projectIdentifier: "alpha", path: "/a", harness: "codex" as const, mode: "workspace" as const, paused: true },
      { projectId: "prj_b", projectIdentifier: "beta", path: "/b", harness: "codex" as const, mode: "workspace" as const, paused: false }
    ];
    expect(runnableBindings(bindings).map((binding) => binding.projectIdentifier)).toEqual(["beta"]);
  });

  it("pins the discovered Codex executable into the macOS service", () => {
    const plist = launchAgentPlist("/opt/node", "/opt/pinhere", {
      executable: "/Users/example/.local/bin/codex",
      searchPath: "/opt/node/bin:/Users/example/.local/bin:/usr/bin:/bin",
      source: "path",
      version: "codex-cli 1.0.0"
    }, "/tmp/pinhere.log");
    expect(plist).toContain("<key>PINHERE_CODEX_BIN</key><string>/Users/example/.local/bin/codex</string>");
    expect(plist).toContain("<key>PINHERE_CODEX_PATH</key><string>/opt/node/bin:/Users/example/.local/bin:/usr/bin:/bin</string>");
  });
});
