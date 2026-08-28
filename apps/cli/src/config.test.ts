import { describe, expect, it } from "vitest";
import type { AgentMode } from "./config.js";

describe("CLI configuration contract", () => {
  it("keeps the documented agent modes stable", () => {
    const modes: AgentMode[] = ["yolo", "workspace", "confirm"];
    expect(modes).toEqual(["yolo", "workspace", "confirm"]);
  });
});

