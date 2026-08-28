# Chrome extension release

Release an upgraded Chrome extension with one command from the repository root:

```bash
pnpm extension:release 0.1.4
```

The command:

1. updates `apps/extension/package.json` and the Chrome manifest to the requested version;
2. builds the production extension;
3. creates `apps/web/public/downloads/pinhere-extension-v<version>.zip`;
4. lets the website display the new version and link to that ZIP automatically.

The root build regenerates the ZIP before building the website. CI verifies that the package, manifest, ZIP contents, and committed release artifact remain synchronized.
