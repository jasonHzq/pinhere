# Pinhere

Pinhere turns a selected DOM element and annotated screenshot into a structured defect that an AI coding agent can claim through a stable API.

## Repository

- `apps/web`: full-stack React Router application, Hono API, Drizzle schema, PontxSpec and webhook worker.
- `apps/extension`: Chrome 116+ Manifest V3 side-panel extension.

There are intentionally no shared packages. The API contract is owned by the full-stack Web application in `apps/web/specs` and is published read-only at `/.well-known/pontx.json`.

## Local development

```bash
cp .env.example apps/web/.env
pnpm install
pnpm --filter @pinhere/web db:generate
pnpm --filter @pinhere/web db:migrate
pnpm dev
```

For local UI work without external authentication, set `PINHERE_DEV_USER_ID`. This fallback is rejected whenever `VERCEL_ENV=production` or `NODE_ENV=production`.

Load `apps/extension/dist` from `chrome://extensions` after running `pnpm --filter @pinhere/extension build`.

## Validation

```bash
pnpm check
```

The contract test validates PontxSpec locale parity and ensures every declared `operationId` is registered by the Hono API.
