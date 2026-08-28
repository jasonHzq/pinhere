import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCodexSearchPath, discoverCodexCandidates, resolveCodexLaunch } from "./codex-launch.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fakeCodex() {
  const root = await mkdtemp(join(tmpdir(), "pinhere-codex-discovery-"));
  temporaryDirectories.push(root);
  const server = join(root, "codex-server.mjs");
  const wrapper = join(root, "codex");
  await writeFile(server, `
import { createInterface } from "node:readline";
if (process.argv.includes("--version")) { console.log("codex-cli 9.9.9"); process.exit(0); }
const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + "\\n");
});
`);
  await writeFile(wrapper, `#!/bin/sh\nexec node "${server}" "$@"\n`);
  await chmod(wrapper, 0o700);
  return { root, wrapper };
}

describe("Codex CLI capability discovery", () => {
  it("validates a package-manager wrapper in the daemon execution environment", async () => {
    const { root, wrapper } = await fakeCodex();
    const launch = await resolveCodexLaunch({
      env: { PINHERE_CODEX_BIN: wrapper, PATH: "/usr/bin:/bin" },
      homeDir: root,
      platformName: "darwin",
      nodeExecutable: process.execPath,
      probeTimeoutMs: 2_000
    });
    expect(launch).toMatchObject({ executable: wrapper, source: "override", version: "codex-cli 9.9.9" });
    expect(launch.searchPath.split(":")).toContain(dirname(process.execPath));
  });

  it("deduplicates discovered candidates and constructs a deterministic search path", async () => {
    const { root, wrapper } = await fakeCodex();
    const candidates = await discoverCodexCandidates({ env: { PINHERE_CODEX_BIN: wrapper, PATH: dirname(wrapper) }, homeDir: root, platformName: "darwin" });
    expect(candidates.filter((candidate) => candidate.executable === wrapper)).toHaveLength(1);
    expect(buildCodexSearchPath(wrapper, { env: { PATH: "/usr/bin:/bin" }, nodeExecutable: process.execPath, platformName: "darwin" }))
      .toContain(dirname(process.execPath));
  });
});
