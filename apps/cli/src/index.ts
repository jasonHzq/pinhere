#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { hostname, platform } from "node:os";
import { resolve, join } from "node:path";
import { issuePath, PinhereApi } from "./api.js";
import { resolveCodexLaunch } from "./codex-launch.js";
import { configDir, readConfig, updateConfig, writeConfig, type AgentMode } from "./config.js";
import { defaultAgentName, installService, runWorker, serviceAction } from "./service.js";
import { installPinhereSkill, type SkillAgent } from "./skill-install.js";
import { exposeProjectIdentifiers, listProjects, publicBinding, publicProject, requireProjectIdentifier, resolveProject, type Project } from "./projects.js";

const VERSION = "0.2.5";
const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
const args = argv.filter((value) => value !== "--json");

function flag(name: string) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(name: string) { return args.includes(`--${name}`); }
function output(value: unknown) { process.stdout.write(`${format(value)}\n`); }
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

async function outputApi(value: unknown, client: PinhereApi, projects?: Project[]) {
  output(exposeProjectIdentifiers(value, projects ?? await listProjects(client)));
}

async function issueGet(issueId: string) {
  const client = await api();
  const issue = await client.get<any>(issuePath(issueId));
  if (has("download-screenshot") && issue.screenshotUrl) {
    const downloaded = await client.download(issue.screenshotUrl);
    const extension = downloaded.contentType === "image/png" ? "png" : downloaded.contentType === "image/jpeg" ? "jpg" : "webp";
    const directory = join(configDir, "screenshots");
    await mkdir(directory, { recursive: true });
    const safeIdentifier = String(issue.id).replace(/[^a-z0-9._-]+/gi, "-");
    const screenshotPath = join(directory, `${safeIdentifier}.${extension}`);
    await writeFile(screenshotPath, downloaded.bytes, { mode: 0o600 });
    issue.screenshotPath = screenshotPath;
  }
  await outputApi(issue, client);
}

async function bindProject(projectIdentifier: string, path: string, mode: AgentMode) {
  const client = await api();
  const { project, projects } = await resolveProject(client, projectIdentifier);
  const binding = { projectId: project.id, projectIdentifier: project.identifier, path, harness: "codex" as const, mode, paused: false };
  const config = await updateConfig((current) => ({
    ...current,
    bindings: [...current.bindings.filter((item) => item.projectId !== project.id && item.projectIdentifier !== project.identifier), binding]
  }));
  output(publicBinding(config.bindings.find((item) => item.projectId === project.id)!, projects));
}

async function setBindingPaused(projectIdentifier: string, paused: boolean) {
  const client = await api();
  const { project, projects } = await resolveProject(client, projectIdentifier);
  let found = false;
  const config = await updateConfig((current) => ({
    ...current,
    bindings: current.bindings.map((binding) => {
      if (binding.projectId !== project.id && binding.projectIdentifier !== project.identifier) return binding;
      found = true;
      return { ...binding, projectIdentifier: project.identifier, paused };
    })
  }));
  if (!found) throw new Error(`Project '${projectIdentifier}' is not bound. Run: pinhere agent bind --project ${projectIdentifier} --path <repo>`);
  output(publicBinding(config.bindings.find((item) => item.projectId === project.id)!, projects));
}

async function main() {
  if (!args.length || has("help") || args.includes("-h") || args[0] === "help") {
    output(`Pinhere CLI ${VERSION}\n\nCommands:\n  skill install [--agent auto|codex|standard] [--target <skills-root>]\n  auth login|status|logout\n  projects list\n  project bind <project-identifier> --path <repo>\n  issues list|get|claim|claim-next|heartbeat|complete|release\n  agent bind|pause|resume|status|doctor|run\n  agent service install|start|stop|status`);
    return;
  }
  if (args[0] === "--version" || args[0] === "-V" || args[0] === "version") { output(VERSION); return; }

  if (args[0] === "skill" && args[1] === "install") {
    const agent = (flag("agent") ?? "auto") as SkillAgent;
    if (!["auto", "codex", "standard"].includes(agent)) throw new Error("--agent must be auto, codex, or standard");
    output(await installPinhereSkill({ agent, skillsRoot: flag("target") })); return;
  }

  if (args[0] === "auth" && args[1] === "login") return authLogin();
  if (args[0] === "auth" && args[1] === "status") {
    const config = await readConfig();
    output({ paired: Boolean(config.token), agentId: config.agentId ?? null, agentName: config.agentName ?? null, baseUrl: config.baseUrl }); return;
  }
  if (args[0] === "auth" && args[1] === "logout") {
    const config = await readConfig();
    await writeConfig({ ...config, token: undefined, agentId: undefined, agentName: undefined }); output("Pinhere credentials removed."); return;
  }

  if (args[0] === "projects" && args[1] === "list") {
    output((await listProjects(await api())).map(publicProject)); return;
  }
  if (args[0] === "project" && args[1] === "bind") {
    const projectIdentifier = requireProjectIdentifier(args[2]);
    const path = resolve(flag("path") ?? process.cwd());
    await bindProject(projectIdentifier, path, "yolo"); return;
  }

  if (args[0] === "issues" && args[1] === "list") {
    const client = await api();
    const query = new URLSearchParams();
    let projects: Project[] | undefined;
    if (flag("project")) {
      const resolved = await resolveProject(client, requireProjectIdentifier(flag("project")));
      projects = resolved.projects; query.set("projectId", resolved.project.id);
    }
    if (flag("status")) query.set("status", flag("status")!);
    await outputApi(await client.get(`/issues?${query}`), client, projects); return;
  }
  if (args[0] === "issues" && args[1] === "get" && args[2]) return issueGet(args[2]);
  if (args[0] === "issues" && args[1] === "claim" && args[2]) { const client = await api(); await outputApi(await client.post(issuePath(args[2], "/claim"), {}), client); return; }
  if (args[0] === "issues" && args[1] === "claim-next") {
    const client = await api();
    const { project, projects } = await resolveProject(client, requireProjectIdentifier(flag("project")));
    await outputApi(await client.post("/issues/claim-next", { projectId: project.id }), client, projects); return;
  }
  if (args[0] === "issues" && args[1] === "heartbeat" && args[2]) { const client = await api(); await outputApi(await client.post(issuePath(args[2], "/heartbeat"), {}), client); return; }
  if (args[0] === "issues" && args[1] === "complete" && args[2]) {
    const summary = flag("summary"); if (!summary) throw new Error("--summary is required");
    const client = await api(); await outputApi(await client.post(issuePath(args[2], "/complete"), { summary }), client); return;
  }
  if (args[0] === "issues" && args[1] === "release" && args[2]) {
    const client = await api(); await outputApi(await client.post(issuePath(args[2], "/release"), { reason: flag("reason") }), client); return;
  }

  if (args[0] === "agent" && args[1] === "bind") {
    const projectIdentifier = requireProjectIdentifier(flag("project"));
    const path = resolve(flag("path") ?? process.cwd());
    const mode = (flag("mode") ?? "yolo") as AgentMode;
    if (!["yolo", "workspace", "confirm"].includes(mode)) throw new Error("--mode must be yolo, workspace, or confirm");
    await bindProject(projectIdentifier, path, mode); return;
  }
  if (args[0] === "agent" && (args[1] === "pause" || args[1] === "resume")) {
    await setBindingPaused(requireProjectIdentifier(flag("project")), args[1] === "pause"); return;
  }
  if (args[0] === "agent" && args[1] === "status") {
    const config = await readConfig();
    const projects = config.token ? await listProjects(new PinhereApi(config)).catch(() => []) : [];
    output({ paired: Boolean(config.token), agent: config.agentName ?? null, hostname: hostname(), bindings: config.bindings.map((binding) => publicBinding(binding, projects)), defaultMode: "yolo" }); return;
  }
  if (args[0] === "agent" && args[1] === "doctor") {
    const launch = await resolveCodexLaunch();
    output({ ok: true, codex: { executable: launch.executable, source: launch.source, version: launch.version } }); return;
  }
  if (args[0] === "agent" && args[1] === "run") return runWorker({ once: has("once") });
  if (args[0] === "agent" && args[1] === "service") {
    const action = args[2];
    if (action === "install") { output({ installed: true, ...await installService(process.argv[1]!) }); return; }
    if (action === "start" || action === "stop" || action === "status") { output(await serviceAction(action, process.argv[1]!)); return; }
  }
  throw new Error(`Unknown command: ${args.join(" ")}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonMode) process.stderr.write(`${JSON.stringify({ error: { message } }, null, 2)}\n`);
  else process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
