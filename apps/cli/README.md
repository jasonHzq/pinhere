# Pinhere CLI

Pair a local Codex installation with Pinhere and repair browser-reported issues in the matching repository.

```bash
npm install --global pinhere
pinhere auth login
pinhere projects list
pinhere agent bind --project prj_example --path /absolute/path/to/repository --mode yolo
pinhere agent service install
```

Use `pinhere help` for the command list. `yolo` is the unattended default; `workspace` keeps Codex inside its workspace sandbox, and `confirm` requests approval in an attached terminal.

Documentation and the installable AI workflow are available at <https://pinhere.dev/.well-known/pinhere-skill.md>.
