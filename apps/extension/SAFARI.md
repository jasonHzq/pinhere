# Pinhere Safari Web Extension

`dist-safari` is the browser-extension payload shared by iPhone, iPad, and Mac Safari. It targets Safari 15.4 or newer and uses the same React UI and API contract as the Chrome extension.

## Build the payload

```bash
pnpm --filter @pinhere/extension build:safari
```

To also create the uploadable ZIP used by the website and App Store Connect:

```bash
pnpm --filter @pinhere/extension package:safari
```

The archive is written to `apps/web/public/downloads/pinhere-safari-extension-v0.1.1.zip`.

## Package for iOS/iPadOS with Xcode

Install the full Xcode application, then run from the repository root:

```bash
xcrun safari-web-extension-packager apps/extension/dist-safari \
  --project-location apps/safari \
  --app-name Pinhere \
  --bundle-identifier dev.pinhere.safari \
  --swift \
  --ios-only
```

Older Xcode releases call the tool `safari-web-extension-converter`; its arguments are equivalent. Select an Apple Developer team for both the iOS app and extension targets, then run the iOS app on a device or simulator. Enable Pinhere under Settings > Apps > Safari > Extensions and allow website access.

The ZIP can alternatively be uploaded to App Store Connect's Safari Web Extension packaging flow, which creates a TestFlight-ready wrapper without a local Xcode conversion.

## OAuth behavior

Chrome continues to use `identity.launchWebAuthFlow`. Safari opens Pinhere authorization in a tab, returns to `/zh-CN/extension/authorized`, exchanges the short-lived PKCE code in the background, and closes the tab. No password or website session is stored in extension storage.
