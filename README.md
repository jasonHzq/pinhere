# Pinhere

Pinhere turns a selected DOM element and annotated screenshot into a structured defect that an AI coding agent can claim through a stable API.

New issues receive a project-prefixed, lowercase English readable ID asynchronously through Qwen, so issue creation stays fast. The temporary creation ID remains a permanent lookup alias for compatibility.

Projects have an arbitrary display name and an immutable 3–32 character identifier made of lowercase letters, numbers, and single dashes. A Chinese display name is supported; choose a short English identifier such as `payment-center`. Public issue IDs use one URL-safe dash-case string, for example `payment-center-checkout-button-does-not-submit`.

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
npm install --global pinhere
pinhere auth login
pinhere projects list
pinhere agent bind --project pinhere --path /absolute/path/to/repository --mode yolo
pinhere agent doctor
pinhere agent service install
```

Project commands use the public project identifier, such as `pinhere`; internal project IDs are never needed. `yolo` is the default mode. Use `--mode workspace` for sandboxed automatic repair. `--mode confirm` asks in an attached terminal and safely declines approval requests in a headless service. The service creates a native Codex thread for every issue; its run record appears on the issue page and can reopen the conversation through `codex://threads/<thread-id>`.

`pinhere agent doctor` discovers Codex across supported installation layouts and accepts a candidate only after both its version command and a real app-server protocol handshake succeed. Service installation persists that verified execution plan rather than relying on a login shell's PATH.

The service controls the single machine-wide daemon. Pause or resume one bound project without stopping the others:

```bash
pinhere agent pause --project pinhere
pinhere agent resume --project pinhere
```

The daemon reports its own health every 30 seconds, independently of issue processing. Bound projects are scheduled in parallel. Each project defaults to one serial automatic repair; change **Automatic repair capacity** from the project's management dialog to allow 2–8 concurrent repairs within that project. Lowering the limit does not interrupt active repairs and takes effect when the next slot is filled.

Codex turn state is observed through both completion events and `thread/read`. Transient observation failures are logged; three consecutive failures mark the agent run failed and release the issue instead of silently renewing its lease until the two-hour turn timeout.

For local CLI development, set `PINHERE_BASE_URL=http://localhost:5173` before pairing and run commands with `pnpm --filter pinhere dev -- ...`.

## Validation

```bash
pnpm check
```

The contract test validates PontxSpec locale parity and ensures every declared `operationId` is registered by the Hono API.
