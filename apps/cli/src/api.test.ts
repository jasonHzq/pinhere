import { describe, expect, it } from "vitest";
import { issuePath } from "./api";

describe("issuePath", () => {
  it("encodes readable identifiers before appending actions", () => {
    expect(issuePath("payment-center/checkout-button", "/complete"))
      .toBe("/issues/payment-center%2Fcheckout-button/complete");
  });
});
