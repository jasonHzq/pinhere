# Pinhere

Pinhere turns a selected DOM element and annotated screenshot into a structured defect that an AI coding agent can claim through a stable API.

## Repository

- `apps/web`: full-stack React Router application, Hono API, Drizzle schema, PontxSpec and webhook worker.
- `apps/extension`: shared Chrome 116+ and Safari 15.4+ Manifest V3 web extension, including an iPhone/iPad touch-first picker.
- `apps/cli`: npm CLI for device pairing, issue queues, repository bindings, and the Codex App Server background harness.
- `skills/pinhere`: installable AI workflow for repairing the current Pinhere queue without a daemon.

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

Build the Safari payload with `pnpm --filter @pinhere/extension build:safari`. See [`apps/extension/SAFARI.md`](apps/extension/SAFARI.md) for iOS/iPadOS packaging, TestFlight, and App Store Connect instructions.

## AI repair paths

Every newly created extension issue includes a one-click repair prompt containing its Issue ID and the public Pinhere Skill URL.

For an AI-assisted, one-session queue repair, install `skills/pinhere/SKILL.md` in the coding agent. The Skill installs the CLI when needed, opens browser pairing, repairs the current queue, then exits when the queue is empty.

For unattended Codex repair:

```bash
npm install --global @pinhere/cli
pinhere auth login
pinhere projects list
pinhere agent bind --project prj_example --path /absolute/path/to/repository --mode yolo
pinhere agent service install
```

`yolo` is the default mode. Use `--mode workspace` for sandboxed automatic repair. `--mode confirm` asks in an attached terminal and safely declines approval requests in a headless service. The service creates a native Codex thread for every issue; its run record appears on the issue page and can reopen the conversation through `codex://threads/<thread-id>`.

For local CLI development, set `PINHERE_BASE_URL=http://localhost:5173` before pairing and run commands with `pnpm --filter @pinhere/cli dev -- ...`.

## Validation

```bash
pnpm check
```

The contract test validates PontxSpec locale parity and ensures every declared `operationId` is registered by the Hono API.
