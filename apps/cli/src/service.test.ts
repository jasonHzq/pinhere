import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { repairPrompt } from "./service.js";

describe("Pinhere repair handoff", () => {
  it("leaves repository workflow decisions to the harness", async () => {
    const skill = await readFile(new URL("../skill/SKILL.md", import.meta.url), "utf8");
    const prompt = repairPrompt({
      id: "iss_example",
      projectId: "prj_example",
      title: "Example issue",
      description: "Example description",
      pageUrl: "https://example.com",
      dom: { cssSelector: "#target", xpath: "//*[@id='target']", outerHTML: "<div id='target'></div>" },
      status: "in_progress"
    });

    expect(skill).toContain("current harness's own workflow");
    expect(prompt).toContain("current harness's own workflow");
    expect(`${skill}\n${prompt}`).not.toMatch(/do not (?:commit|push|deploy)|open a (?:pull request|PR)/i);
  });
});
