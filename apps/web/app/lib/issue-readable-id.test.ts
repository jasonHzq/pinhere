import { describe, expect, it, vi } from "vitest";
import { dashCaseEnglish, fallbackIssueSlug, generateIssueSlug, pendingIssueIdentifier, projectIdentifierPrefix, publicIssue } from "./issue-readable-id.server";
import { isProjectIdentifier, normalizeProjectIdentifier } from "./project-identifier";

const issue = {
  title: "结算按钮点击后没有响应",
  description: "用户点击结算按钮后页面没有提交订单。",
  pageUrl: "https://shop.example.com/checkout?token=secret",
  dom: { tagName: "BUTTON", text: "提交订单" }
};

describe("readable issue identifiers", () => {
  it("uses the stable project identifier and preserves legacy fallbacks", () => {
    expect(projectIdentifierPrefix({ id: "prj_12ABC", name: "结算项目", identifier: "payment-center" })).toBe("payment-center");
    expect(projectIdentifierPrefix({ id: "prj_12ABC", name: "Checkout Web" })).toBe("checkout-web");
    expect(projectIdentifierPrefix({ id: "prj_12ABC", name: "结算项目" })).toBe("prj-12abc");
    expect(pendingIssueIdentifier({ id: "prj_12ABC", name: "结算项目", identifier: "payment-center" }, "iss_1234567890abcdef")).toBe("payment-center-pending-1234567890abcdef");
  });

  it("normalizes and validates project identifiers", () => {
    expect(normalizeProjectIdentifier(" Payment Center 2 ")).toBe("payment-center-2");
    expect(isProjectIdentifier("payment-center-2")).toBe(true);
    expect(isProjectIdentifier("支付中心")).toBe(false);
  });

  it("keeps only lowercase English dash-case words", () => {
    expect(dashCaseEnglish(" Checkout_BUTTON fails, AGAIN! 42 ")).toBe("checkout-button-fails-again");
    expect(fallbackIssueSlug(issue)).toBe("button-reported-issue");
  });

  it("calls the OpenAI-compatible Qwen endpoint without exposing query data", async () => {
    let capturedRequest: RequestInit | undefined;
    const fetcher: typeof fetch = vi.fn(async (_input, init) => {
      capturedRequest = init;
      return Response.json({ choices: [{ message: { content: "checkout-button-does-not-submit" } }] });
    });
    await expect(generateIssueSlug(issue, { apiKey: "test-key", baseUrl: "https://qwen.example/v1", model: "qwen3.5-flash" }, fetcher)).resolves.toBe("checkout-button-does-not-submit");
    expect(fetcher).toHaveBeenCalledWith("https://qwen.example/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(String(capturedRequest?.body)).not.toContain("token=secret");
    expect(String(capturedRequest?.body)).toContain('"enable_thinking":false');
  });

  it("rejects unusable model output", async () => {
    const fetcher: typeof fetch = vi.fn(async () => Response.json({ choices: [{ message: { content: "你好" } }] }));
    await expect(generateIssueSlug(issue, { apiKey: "test-key", baseUrl: "https://qwen.example/v1" }, fetcher)).rejects.toThrow("invalid identifier");
  });

  it("exposes the readable identifier as the API id without leaking storage fields", () => {
    expect(publicIssue({ id: "iss_internal", readableId: "payment-center-checkout-button-does-not-submit", readableIdStatus: "generated" as const, title: "Broken checkout" })).toEqual({
      id: "payment-center-checkout-button-does-not-submit",
      idStatus: "generated",
      title: "Broken checkout"
    });
    expect(publicIssue({ id: "iss_pending", readableId: null, readableIdStatus: "pending" as const })).toEqual({ id: "issue-pending", idStatus: "pending" });
  });
});
