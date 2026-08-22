import { describe, expect, it } from "vitest";
import { codexPolicy } from "./codex.js";

describe("Codex agent modes", () => {
  it("defaults can map to unattended danger-full-access execution", () => {
    expect(codexPolicy("yolo")).toEqual({ approvalPolicy: "never", sandboxPolicy: { type: "dangerFullAccess" } });
  });

  it("keeps safer modes available", () => {
    expect(codexPolicy("workspace")).toMatchObject({ approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite" } });
    expect(codexPolicy("confirm")).toMatchObject({ approvalPolicy: "onRequest", sandboxPolicy: { type: "workspaceWrite" } });
  });
});
