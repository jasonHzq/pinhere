# Pinhere AI repair handoff

Pinhere ships three complementary repair paths:

1. The browser extension copies an Issue ID plus an instruction to install/use the Pinhere Skill.
2. The Skill installs and pairs `@pinhere/cli`, then processes the current issue queue inside the user's active AI session and exits when the queue is empty.
3. A paired CLI background service binds a project to a local repository and starts a new Codex App Server thread for every claimed issue.

The shared platform consists of device pairing, scoped Agent tokens, local project bindings, atomic issue claims with expiring leases, Agent Instance heartbeats, Agent Run history, and `codex://threads/<threadId>` handoff. Codex is the only v1 Harness. CLI distribution uses npm/npx. Agent mode is user-configurable and defaults to `yolo`; `workspace` and `confirm` are also available.

Acceptance requires one-click copying, one-time browser pairing, queue processing without idle polling in Skill mode, login-started background repair in Harness mode, non-focusing notifications, resumable Codex conversations, lease recovery after crashes, and full API/spec/test coverage.
