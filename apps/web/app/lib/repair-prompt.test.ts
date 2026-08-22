import { describe, expect, it } from "vitest";
import { PINHERE_SKILL_URL, repairPrompt } from "./repair-prompt";

describe("repairPrompt", () => {
  it("hands off the exact issue and the installable skill", () => {
    const prompt = repairPrompt("iss_example");
    expect(prompt).toContain("iss_example");
    expect(prompt).toContain(PINHERE_SKILL_URL);
    expect(prompt).toContain("Pinhere CLI");
  });
});
