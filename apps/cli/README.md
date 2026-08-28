# Pinhere CLI

Pair a local Codex installation with Pinhere and repair browser-reported issues in the matching repository.

```bash
npm install --global pinhere
pinhere skill install --agent auto
pinhere auth login
pinhere projects list
pinhere agent bind --project pinhere --path /absolute/path/to/repository --mode yolo
pinhere agent doctor
pinhere agent service install
```

`pinhere agent doctor` verifies the selected Codex executable by completing an app-server handshake in the same deterministic environment used by the daemon. This supports standalone, package-manager, Homebrew, and macOS desktop-bundled Codex installations without assuming one fixed path.

Use the project's public identifier in every `--project` argument. To stop or restart polling for only one binding while the machine-wide service keeps running:

```bash
pinhere agent pause --project pinhere
pinhere agent resume --project pinhere
```

Use `pinhere help` for the command list. `yolo` is the unattended default; `workspace` keeps Codex inside its workspace sandbox, and `confirm` requests approval in an attached terminal.

Give an AI the bootstrap instructions at <https://pinhere.dev/.well-known/pinhere-skill-install.md>. The installer copies the complete bundled Skill directory, including future references, scripts, assets, and agent metadata. The raw workflow remains available at <https://pinhere.dev/.well-known/pinhere-skill.md>.
