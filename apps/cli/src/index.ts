#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { hostname, platform } from "node:os";
import { resolve, join } from "node:path";
import { PinhereApi } from "./api.js";
import { configDir, readConfig, updateConfig, writeConfig, type AgentMode } from "./config.js";
import { defaultAgentName, installService, runWorker, serviceAction } from "./service.js";

const VERSION = "0.1.0";
const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
const args = argv.filter((value) => value !== "--json");

function flag(name: string) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(name: string) { return args.includes(`--${name}`); }
function output(value: unknown) { process.stdout.write(`${jsonMode ? JSON.stringify(value) : format(value)}\n`); }
function format(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function openUrl(url: string) {
  const command = platform() === "darwin" ? "open" : platform() === "win32" ? "cmd" : "xdg-open";
  const commandArgs = platform() === "win32" ? ["/c", "start", "", url] : [url];
  execFile(command, commandArgs, () => undefined);
}

async function authLogin() {
  const current = await readConfig();
  const api = new PinhereApi(current);
  const pairing = await api.post<{ deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number }>("/agent-pairings", {
    name: flag("name") ?? defaultAgentName(), platform: `${platform()}-${process.arch}`, harness: "codex"
  }, false);
  output(jsonMode ? { status: "pending", userCode: pairing.userCode, verificationUri: pairing.verificationUri } : `Open ${pairing.verificationUri}\nPairing code: ${pairing.userCode}`);
  openUrl(pairing.verificationUri);
  const deadline = Date.now() + pairing.expiresIn * 1_000;
  while (Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, pairing.interval * 1_000));
    const result = await api.post<{ status: "pending" | "paired"; token?: string; agent?: { id: string; name: string } }>("/agent-pairings/token", { deviceCode: pairing.deviceCode }, false);
    if (result.status !== "paired" || !result.token || !result.agent) continue;
    await writeConfig({ ...current, token: result.token, agentId: result.agent.id, agentName: result.agent.name });
    output(jsonMode ? { status: "paired", agent: result.agent } : `Paired as ${result.agent.name}.`);
    return;
  }
  throw new Error("Pairing code expired. Run pinhere auth login again.");
}

async function api() { return new PinhereApi(await readConfig()); }

async function issueGet(issueId: string) {
  const client = await api();
  const issue = await client.get<any>(`/issues/${encodeURIComponent(issueId)}`);
  if (has("download-screenshot") && issue.screenshotUrl) {
    const downloaded = await client.download(issue.screenshotUrl);
    const extension = downloaded.contentType === "image/png" ? "png" : downloaded.contentType === "image/jpeg" ? "jpg" : "webp";
    const directory = join(configDir, "screenshots");
    await mkdir(directory, { recursive: true });
    const screenshotPath = join(directory, `${issue.id}.${extension}`);
    await writeFile(screenshotPath, downloaded.bytes, { mode: 0o600 });
    issue.screenshotPath = screenshotPath;
  }
  output(issue);
}

async function main() {
  if (!args.length || has("help") || args[0] === "help") {
    output(`Pinhere CLI ${VERSION}\n\nCommands:\n  auth login|status|logout\n  projects list\n  project bind <project-id> --path <repo>\n  issues list|get|claim|claim-next|heartbeat|complete|release\n  agent bind|status|run\n  agent service install|start|stop|status`);
    return;
  }
  if (args[0] === "--version" || args[0] === "version") { output(VERSION); return; }

  if (args[0] === "auth" && args[1] === "login") return authLogin();
  if (args[0] === "auth" && args[1] === "status") {
    const config = await readConfig();
    output({ paired: Boolean(config.token), agentId: config.agentId ?? null, agentName: config.agentName ?? null, baseUrl: config.baseUrl }); return;
  }
  if (args[0] === "auth" && args[1] === "logout") {
    const config = await readConfig();
    await writeConfig({ ...config, token: undefined, agentId: undefined, agentName: undefined }); output("Pinhere credentials removed."); return;
  }

  if (args[0] === "projects" && args[1] === "list") { output(await (await api()).get("/projects")); return; }
  if (args[0] === "project" && args[1] === "bind") {
    const projectId = args[2]; if (!projectId) throw new Error("Usage: pinhere project bind <project-id> --path <repo>");
    const path = resolve(flag("path") ?? process.cwd());
    const config = await updateConfig((current) => ({ ...current, bindings: [...current.bindings.filter((item) => item.projectId !== projectId), { projectId, path, harness: "codex", mode: "yolo" }] }));
    output(config.bindings.find((item) => item.projectId === projectId)); return;
  }

  if (args[0] === "issues" && args[1] === "list") {
    const query = new URLSearchParams(); if (flag("project")) query.set("projectId", flag("project")!); if (flag("status")) query.set("status", flag("status")!);
    output(await (await api()).get(`/issues?${query}`)); return;
  }
  if (args[0] === "issues" && args[1] === "get" && args[2]) return issueGet(args[2]);
  if (args[0] === "issues" && args[1] === "claim" && args[2]) { output(await (await api()).post(`/issues/${encodeURIComponent(args[2])}/claim`, {})); return; }
  if (args[0] === "issues" && args[1] === "claim-next") {
    const projectId = flag("project"); if (!projectId) throw new Error("--project is required");
    output(await (await api()).post("/issues/claim-next", { projectId })); return;
  }
  if (args[0] === "issues" && args[1] === "heartbeat" && args[2]) { output(await (await api()).post(`/issues/${encodeURIComponent(args[2])}/heartbeat`, {})); return; }
  if (args[0] === "issues" && args[1] === "complete" && args[2]) {
    const summary = flag("summary"); if (!summary) throw new Error("--summary is required");
    output(await (await api()).post(`/issues/${encodeURIComponent(args[2])}/complete`, { summary })); return;
  }
  if (args[0] === "issues" && args[1] === "release" && args[2]) {
    output(await (await api()).post(`/issues/${encodeURIComponent(args[2])}/release`, { reason: flag("reason") })); return;
  }

  if (args[0] === "agent" && args[1] === "bind") {
    const projectId = flag("project"); if (!projectId) throw new Error("--project is required");
    const path = resolve(flag("path") ?? process.cwd());
    const mode = (flag("mode") ?? "yolo") as AgentMode;
    if (!["yolo", "workspace", "confirm"].includes(mode)) throw new Error("--mode must be yolo, workspace, or confirm");
    const config = await updateConfig((current) => ({ ...current, bindings: [...current.bindings.filter((item) => item.projectId !== projectId), { projectId, path, harness: "codex", mode }] }));
    output(config.bindings.find((item) => item.projectId === projectId)); return;
  }
  if (args[0] === "agent" && args[1] === "status") {
    const config = await readConfig(); output({ paired: Boolean(config.token), agentId: config.agentId ?? null, hostname: hostname(), bindings: config.bindings, defaultMode: "yolo" }); return;
  }
  if (args[0] === "agent" && args[1] === "run") return runWorker({ once: has("once") });
  if (args[0] === "agent" && args[1] === "service") {
    const action = args[2];
    if (action === "install") { output({ installed: await installService(process.argv[1]!) }); return; }
    if (action === "start" || action === "stop" || action === "status") { const result = await serviceAction(action, process.argv[1]!); output(result.stdout || result.stderr || `${action} completed`); return; }
  }
  throw new Error(`Unknown command: ${args.join(" ")}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonMode) process.stderr.write(`${JSON.stringify({ error: { message } })}\n`);
  else process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});

