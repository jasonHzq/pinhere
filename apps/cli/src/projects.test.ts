import { describe, expect, it } from "vitest";
import { exposeProjectIdentifiers, publicBinding, publicProject, requireProjectIdentifier } from "./projects.js";

const projects = [{ id: "prj_internal_secret", identifier: "payment-center", name: "Payment Center", description: "Checkout" }];

describe("public project identifiers", () => {
  it("accepts identifiers and rejects internal IDs", () => {
    expect(requireProjectIdentifier("payment-center")).toBe("payment-center");
    expect(() => requireProjectIdentifier("prj_internal_secret")).toThrow(/identifier, not its internal ID/);
  });

  it("never exposes a project ID in project or binding output", () => {
    expect(publicProject(projects[0]!)).toEqual({ identifier: "payment-center", name: "Payment Center", description: "Checkout" });
    expect(publicBinding({ projectId: "prj_internal_secret", path: "/repo", harness: "codex", mode: "workspace", paused: true }, projects))
      .toEqual({ project: "payment-center", path: "/repo", harness: "codex", mode: "workspace", status: "paused" });
  });

  it("replaces nested project IDs with identifiers", () => {
    expect(exposeProjectIdentifiers({ issue: { id: "issue-1", projectId: "prj_internal_secret" } }, projects))
      .toEqual({ issue: { id: "issue-1", projectIdentifier: "payment-center" } });
  });
});
