import { describe, expect, it } from "vitest";
import { localeNavigationTarget } from "./locale-navigation";

describe("localeNavigationTarget", () => {
  it("switches the workspace locale without leaving the current page", () => {
    expect(localeNavigationTarget({ pathname: "/zh-CN/app/projects" }, "en")).toBe("/en/app/projects");
  });

  it("preserves issue routes, query parameters, and hashes", () => {
    expect(localeNavigationTarget({
      pathname: "/en/app/issues/pinhere-missing-language-switch",
      search: "?from=board",
      hash: "#activity"
    }, "zh-CN")).toBe("/zh-CN/app/issues/pinhere-missing-language-switch?from=board#activity");
  });

  it("adds a locale prefix when the current path does not have one", () => {
    expect(localeNavigationTarget({ pathname: "/app/settings" }, "en")).toBe("/en/app/settings");
  });
});
