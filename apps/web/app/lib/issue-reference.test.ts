import { describe, expect, it } from "vitest";
import { issueApiPath, issueDetailPath, visibleIssueIdentifier } from "./issue-reference";

describe("issue reference URLs", () => {
  it("keeps dash-case identifiers readable", () => {
    expect(issueApiPath("payment-center-checkout-button-broken")).toBe(
      "/api/v1/issues/payment-center-checkout-button-broken"
    );
  });

  it("also safely accepts optional slash-separated identifiers", () => {
    expect(issueApiPath("payment-center/checkout-button-broken", "/claim")).toBe(
      "/api/v1/issues/payment-center%2Fcheckout-button-broken/claim"
    );
    expect(issueDetailPath("zh-CN", "payment-center/checkout-button-broken")).toBe(
      "/zh-CN/app/issues/payment-center%2Fcheckout-button-broken"
    );
  });

  it("keeps a pending readable identifier out of the UI", () => {
    expect(visibleIssueIdentifier({ id: "payment-center-pending-opaque", idStatus: "pending" })).toBeNull();
    expect(visibleIssueIdentifier({ id: "payment-center-checkout-button-broken", idStatus: "generated" })).toBe(
      "payment-center-checkout-button-broken"
    );
  });
});
