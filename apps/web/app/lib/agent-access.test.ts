import { describe, expect, it } from "vitest";
import { buildAgentAccessPrompt } from "./agent-access";

describe("buildAgentAccessPrompt", () => {
  it("builds an unattended prompt with the selected project and current origin", () => {
    const prompt = buildAgentAccessPrompt({ en: false, mode: "autopilot", origin: "https://pinhere.dev", projectIdentifier: "checkout" });
    expect(prompt).toContain("https://pinhere.dev/.well-known/pinhere-skill-install.md");
    expect(prompt).toContain("--project checkout");
    expect(prompt).toContain("--mode yolo");
    expect(prompt).toContain("service install");
  });

  it("keeps the supervised flow foreground-only", () => {
    const prompt = buildAgentAccessPrompt({ en: true, mode: "on-demand", origin: "https://example.com" });
    expect(prompt).toContain("<project-identifier>");
    expect(prompt).toContain("--mode workspace");
    expect(prompt).toContain("Do not install a background service");
  });

  it("points custom integrations at the machine-readable contract", () => {
    const prompt = buildAgentAccessPrompt({ en: false, mode: "custom", origin: "https://example.com", projectIdentifier: "shop" });
    expect(prompt).toContain("/.well-known/pontx.json");
    expect(prompt).toContain("issue.created -> claim");
    expect(prompt).toContain("项目「shop」");
  });
});
