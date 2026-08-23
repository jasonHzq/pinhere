import extensionPackage from "../../../extension/package.json";

export const chromeExtensionRelease = {
  version: extensionPackage.version,
  downloadUrl: `/downloads/pinhere-extension-v${extensionPackage.version}.zip`
} as const;
