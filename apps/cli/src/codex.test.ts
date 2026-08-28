import { describe, expect, it } from "vitest";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexPolicy, CodexHarness } from "./codex.js";

describe("Codex agent modes", () => {
  it("defaults can map to unattended danger-full-access execution", () => {
    expect(codexPolicy("yolo")).toEqual({ approvalPolicy: "never", sandboxPolicy: { type: "dangerFullAccess" } });
  });

  it("keeps safer modes available", () => {
    expect(codexPolicy("workspace")).toMatchObject({ approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite" } });
    expect(codexPolicy("confirm")).toMatchObject({ approvalPolicy: "onRequest", sandboxPolicy: { type: "workspaceWrite" } });
  });
});

describe("Codex process failure handling", () => {
  it("rejects initialization when app-server exits immediately", async () => {
    const root = await mkdtemp(join(tmpdir(), "pinhere-codex-exit-"));
    const executable = join(root, "codex");
    await writeFile(executable, "#!/bin/sh\nexit 127\n");
    await chmod(executable, 0o700);
    const harness = new CodexHarness({ executable, searchPath: "/usr/bin:/bin", source: "override", version: "test" });
    try {
      await expect(harness.start()).rejects.toThrow(/exited \(127\)|closed/);
    } finally {
      harness.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("polls thread state when a terminal turn notification is missed", async () => {
    const root = await mkdtemp(join(tmpdir(), "pinhere-codex-poll-"));
    const executable = join(root, "codex");
    await writeFile(executable, `#!${process.execPath}
const readline = require("node:readline");
const lines = readline.createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id === undefined) return;
  let result = {};
  if (message.method === "thread/start") result = { thread: { id: "thread_test" } };
  if (message.method === "turn/start") result = { turn: { id: "turn_test", status: "inProgress" } };
  if (message.method === "thread/read") result = { thread: { id: "thread_test", turns: [{ id: "turn_test", status: "interrupted" }] } };
  process.stdout.write(JSON.stringify({ id: message.id, result }) + "\\n");
});
`);
    await chmod(executable, 0o700);
    const harness = new CodexHarness(
      { executable, searchPath: "/usr/bin:/bin", source: "override", version: "test" },
      { turnPollIntervalMs: 10, turnTimeoutMs: 1_000 }
    );
    try {
      const threadId = await harness.createThread(root);
      await expect(harness.runTurn(threadId, root, "test", "yolo")).rejects.toThrow("interrupted");
    } finally {
      harness.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
