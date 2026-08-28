import { describe, expect, it } from "vitest";
import { visibleIssueIdentifier } from "./issue-reference";

describe("extension issue references", () => {
  it("keeps a pending readable identifier out of the success UI", () => {
    expect(visibleIssueIdentifier({ id: "pinhere-pending-opaque", idStatus: "pending" })).toBeNull();
    expect(visibleIssueIdentifier({ id: "pinhere-capture-button-is-obscured", idStatus: "generated" })).toBe(
      "pinhere-capture-button-is-obscured"
    );
    expect(visibleIssueIdentifier({ id: "pinhere-reported-product-issue", idStatus: "fallback" })).toBe(
      "pinhere-reported-product-issue"
    );
  });
});
