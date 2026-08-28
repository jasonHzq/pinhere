import { describe, expect, it } from "vitest";
import extensionPackage from "../../../extension/package.json";
import { chromeExtensionRelease } from "./extension-release";

describe("chromeExtensionRelease", () => {
  it("derives the website download from the extension package version", () => {
    expect(chromeExtensionRelease).toEqual({
      version: extensionPackage.version,
      downloadUrl: `/downloads/pinhere-extension-v${extensionPackage.version}.zip`
    });
  });
});
