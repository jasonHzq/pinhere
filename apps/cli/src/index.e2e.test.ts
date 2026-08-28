import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entrypoint = join(cliRoot, "src", "index.ts");
const internalProjectId = "prj_do_not_expose";
let configDirectory = "";
let baseUrl = "";
let requestedProjectId = "";

const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.url === "/api/v1/projects") {
    response.end(JSON.stringify({ data: [{ id: internalProjectId, userId: "usr_secret", identifier: "payment-center", name: "Payment Center", description: "Checkout" }] }));
    return;
  }
  if (request.url?.startsWith("/api/v1/issues?")) {
    requestedProjectId = new URL(request.url, baseUrl).searchParams.get("projectId") ?? "";
    response.end(JSON.stringify({ data: [{ id: "payment-center-button-broken", projectId: internalProjectId, title: "Broken" }] }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: { message: "Not found" } }));
});

async function run(...args: string[]) {
  return execFileAsync(process.execPath, ["--import", "tsx", entrypoint, ...args], {
    cwd: cliRoot,
    env: { ...process.env, PINHERE_CONFIG_DIR: configDirectory, PINHERE_BASE_URL: baseUrl }
  });
}

beforeAll(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  baseUrl = `http://127.0.0.1:${address.port}`;
  configDirectory = await mkdtemp(join(tmpdir(), "pinhere-cli-e2e-"));
  await writeFile(join(configDirectory, "config.json"), JSON.stringify({
    baseUrl,
    token: "test-token",
    agentId: "agt_internal",
    agentName: "Test Agent",
    bindings: [],
    pollIntervalSeconds: 15
  }));
});

afterAll(async () => {
  server.close();
  await rm(configDirectory, { recursive: true, force: true });
});

describe("CLI identifier-only flow", () => {
  it("supports conventional help and version aliases", async () => {
    const shortHelp = await run("-h");
    const longHelp = await run("--help");
    const shortVersion = await run("-V");
    expect(shortHelp.stdout).toContain("Pinhere CLI 0.2.5");
    expect(shortHelp.stdout).toBe(longHelp.stdout);
    expect(shortVersion.stdout).toBe("0.2.5\n");
  });

  it("prints pretty project JSON without internal IDs", async () => {
    const { stdout } = await run("projects", "list", "--json");
    expect(stdout).toContain('\n  {\n    "identifier": "payment-center"');
    expect(stdout).not.toContain(internalProjectId);
    expect(stdout).not.toContain("usr_secret");
  });

  it("binds, pauses, and resumes one project by identifier", async () => {
    const bound = await run("agent", "bind", "--project", "payment-center", "--path", cliRoot, "--mode", "workspace", "--json");
    expect(JSON.parse(bound.stdout)).toMatchObject({ project: "payment-center", status: "active", mode: "workspace" });
    expect(bound.stdout).not.toContain(internalProjectId);

    const paused = await run("agent", "pause", "--project", "payment-center", "--json");
    expect(JSON.parse(paused.stdout)).toMatchObject({ project: "payment-center", status: "paused" });

    const status = await run("agent", "status", "--json");
    expect(JSON.parse(status.stdout).bindings).toEqual([expect.objectContaining({ project: "payment-center", status: "paused" })]);
    expect(status.stdout).not.toContain(internalProjectId);

    const resumed = await run("agent", "resume", "--project", "payment-center", "--json");
    expect(JSON.parse(resumed.stdout)).toMatchObject({ project: "payment-center", status: "active" });

    const stored = JSON.parse(await readFile(join(configDirectory, "config.json"), "utf8"));
    expect(stored.bindings[0]).toMatchObject({ projectId: internalProjectId, projectIdentifier: "payment-center", paused: false });
  });

  it("resolves issue filters internally and exposes only the identifier", async () => {
    const { stdout } = await run("issues", "list", "--project", "payment-center", "--json");
    expect(requestedProjectId).toBe(internalProjectId);
    expect(JSON.parse(stdout)[0]).toMatchObject({ projectIdentifier: "payment-center" });
    expect(stdout).not.toContain(internalProjectId);
  });

  it("rejects project IDs at the command boundary", async () => {
    await expect(run("agent", "bind", "--project", internalProjectId, "--json"))
      .rejects.toMatchObject({ stderr: expect.stringContaining("Use the project identifier") });
  });
});
