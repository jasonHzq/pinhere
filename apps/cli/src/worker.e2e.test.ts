import { execFile } from "node:child_process";
import { once } from "node:events";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entrypoint = join(cliRoot, "src", "index.ts");
const projectId = "prj_worker_internal";
const issueId = "payment-center-worker-e2e";
let configDirectory = "";
let fakeCodex = "";
let baseUrl = "";
let claimBody: Record<string, unknown> | undefined;
const runUpdates: Array<Record<string, unknown>> = [];

async function jsonBody(request: IncomingMessage) {
  let body = "";
  for await (const chunk of request) body += String(chunk);
  return body ? JSON.parse(body) as Record<string, unknown> : {};
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  const send = (data: unknown) => response.end(JSON.stringify({ data }));
  if (request.method === "POST" && request.url === "/api/v1/agents/heartbeat") return send({ ok: true });
  if (request.method === "POST" && request.url === "/api/v1/issues/claim-next") {
    claimBody = await jsonBody(request);
    return send({ issue: {
      id: issueId, projectId, title: "Worker E2E", description: "No source change is required", pageUrl: "https://example.com",
      dom: { cssSelector: "#target", xpath: "//*[@id='target']", outerHTML: "<button id='target'>Test</button>" }, status: "in_progress"
    } });
  }
  if (request.method === "POST" && request.url === "/api/v1/agent-runs") return send({ id: "run_worker", status: "running" });
  if (request.method === "PATCH" && request.url === "/api/v1/agent-runs/run_worker") {
    runUpdates.push(await jsonBody(request));
    return send({ id: "run_worker", status: runUpdates.at(-1)?.status });
  }
  if (request.method === "GET" && request.url === `/api/v1/issues/${issueId}`) {
    return send({ id: issueId, projectId, title: "Worker E2E", description: "No source change is required", pageUrl: "https://example.com", dom: { cssSelector: "#target", xpath: "", outerHTML: "" }, status: "done", completionSummary: "Worker E2E complete" });
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: { message: `Unhandled ${request.method} ${request.url}` } }));
});

beforeAll(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  baseUrl = `http://127.0.0.1:${address.port}`;
  configDirectory = await mkdtemp(join(tmpdir(), "pinhere-worker-e2e-"));
  fakeCodex = join(configDirectory, "fake-codex.mjs");
  await writeFile(fakeCodex, `#!/usr/bin/env node
import { createInterface } from "node:readline";
if (process.argv.includes("--version")) { console.log("codex-cli worker-e2e"); process.exit(0); }
const lines = createInterface({ input: process.stdin });
const send = (message) => process.stdout.write(JSON.stringify(message) + "\\n");
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: {} });
  else if (message.method === "thread/start") send({ id: message.id, result: { thread: { id: "thread_worker_e2e" } } });
  else if (message.method === "turn/start") {
    send({ id: message.id, result: { turn: { id: "turn_worker_e2e" } } });
    setTimeout(() => send({ method: "turn/completed", params: { turn: { id: "turn_worker_e2e", status: "completed" } } }), 20);
  }
});
`);
  await chmod(fakeCodex, 0o700);
  await writeFile(join(configDirectory, "config.json"), JSON.stringify({
    baseUrl, token: "test-token", agentId: "agt_worker", agentName: "Worker Agent", pollIntervalSeconds: 1,
    bindings: [{ projectId, projectIdentifier: "payment-center", path: cliRoot, harness: "codex", mode: "workspace", paused: false }]
  }));
});

afterAll(async () => {
  server.close();
  await rm(configDirectory, { recursive: true, force: true });
});

describe("unattended worker end to end", () => {
  it("claims by internal mapping, opens a Codex thread, and completes the run", async () => {
    await execFileAsync(process.execPath, ["--import", "tsx", entrypoint, "agent", "run", "--once"], {
      cwd: cliRoot,
      env: {
        ...process.env,
        PINHERE_CONFIG_DIR: configDirectory,
        PINHERE_BASE_URL: baseUrl,
        PINHERE_CODEX_BIN: fakeCodex,
        PINHERE_DISABLE_NOTIFICATIONS: "1"
      },
      timeout: 10_000
    });
    expect(claimBody).toEqual({ projectId });
    expect(runUpdates).toContainEqual(expect.objectContaining({ externalThreadId: "thread_worker_e2e", status: "running" }));
    expect(runUpdates).toContainEqual(expect.objectContaining({ status: "succeeded", summary: "Worker E2E complete" }));
  });
});
