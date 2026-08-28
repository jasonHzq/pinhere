import { execFile, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_PROBE_TIMEOUT_MS = 8_000;

export type CodexLaunchSource = "override" | "path" | "desktop" | "known-location";
export type CodexLaunch = {
  executable: string;
  searchPath: string;
  source: CodexLaunchSource;
  version: string;
};

type Candidate = Omit<CodexLaunch, "version">;
type DiscoveryOptions = {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  platformName?: NodeJS.Platform;
  nodeExecutable?: string;
  probeTimeoutMs?: number;
};

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function buildCodexSearchPath(executable: string, options: Pick<DiscoveryOptions, "env" | "nodeExecutable" | "platformName"> = {}) {
  const env = options.env ?? process.env;
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const platformName = options.platformName ?? platform();
  const fallback = platformName === "win32"
    ? [dirname(nodeExecutable), dirname(executable)]
    : [dirname(nodeExecutable), dirname(executable), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
  return unique([...fallback, ...(env.PATH ?? "").split(delimiter)]).join(delimiter);
}

export function codexLaunchEnvironment(launch: Pick<CodexLaunch, "executable" | "searchPath">, env: NodeJS.ProcessEnv = process.env) {
  return { ...env, PATH: launch.searchPath };
}

async function executable(path: string) {
  return access(path, process.platform === "win32" ? undefined : 0o1).then(() => true, () => false);
}

async function locatedCodex(env: NodeJS.ProcessEnv, platformName: NodeJS.Platform) {
  const locator = platformName === "win32" ? "where" : "which";
  const args = platformName === "win32" ? ["codex"] : ["-a", "codex"];
  try {
    const result = await execFileAsync(locator, args, { env, timeout: 5_000 });
    return result.stdout.split(/\r?\n/).map((value) => value.trim()).filter((value) => value.startsWith("/") || platformName === "win32");
  } catch {
    return [];
  }
}

export async function discoverCodexCandidates(options: DiscoveryOptions = {}) {
  const env = options.env ?? process.env;
  const home = options.homeDir ?? homedir();
  const platformName = options.platformName ?? platform();
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const candidates: Array<{ executable: string; source: CodexLaunchSource }> = [];
  if (env.PINHERE_CODEX_BIN) candidates.push({ executable: env.PINHERE_CODEX_BIN, source: "override" });
  for (const path of await locatedCodex(env, platformName)) candidates.push({ executable: path, source: "path" });
  if (platformName === "darwin") {
    for (const path of [
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      "/Applications/Codex.app/Contents/Resources/codex",
      join(home, "Applications", "ChatGPT.app", "Contents", "Resources", "codex"),
      join(home, "Applications", "Codex.app", "Contents", "Resources", "codex")
    ]) candidates.push({ executable: path, source: "desktop" });
  }
  for (const path of platformName === "win32"
    ? []
    : [join(home, ".local", "bin", "codex"), join(home, "Library", "pnpm", "codex"), "/opt/homebrew/bin/codex", "/usr/local/bin/codex"]
  ) candidates.push({ executable: path, source: "known-location" });

  const seen = new Set<string>();
  const available: Candidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.executable) || !await executable(candidate.executable)) continue;
    seen.add(candidate.executable);
    available.push({
      ...candidate,
      searchPath: env.PINHERE_CODEX_PATH ?? buildCodexSearchPath(candidate.executable, { env, nodeExecutable, platformName })
    });
  }
  return available;
}

async function appServerHandshake(candidate: Candidate, timeoutMs: number) {
  const child = spawn(candidate.executable, ["app-server", "--listen", "stdio://"], {
    env: codexLaunchEnvironment(candidate),
    stdio: ["pipe", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${String(chunk)}`.slice(-4_000); });
  const lines = createInterface({ input: child.stdout });
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        lines.removeListener("line", onLine);
        child.removeListener("error", onError);
        child.removeListener("exit", onExit);
        if (error) reject(error); else resolve();
      };
      const onLine = (line: string) => {
        try {
          const message = JSON.parse(line) as { id?: number; error?: { message?: string } };
          if (message.id !== 1) return;
          if (message.error) finish(new Error(message.error.message ?? "initialize failed"));
          else {
            child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
            finish();
          }
        } catch { /* Ignore non-protocol output while probing. */ }
      };
      const onError = (error: Error) => finish(error);
      const onExit = (code: number | null) => finish(new Error(`exited (${code ?? "signal"})${stderr ? `: ${stderr.trim()}` : ""}`));
      const timer = setTimeout(() => finish(new Error(`initialize timed out after ${timeoutMs}ms`)), timeoutMs);
      timer.unref();
      lines.on("line", onLine);
      child.on("error", onError);
      child.on("exit", onExit);
      child.stdin.write(`${JSON.stringify({ method: "initialize", id: 1, params: { clientInfo: { name: "pinhere-probe", title: "Pinhere probe", version: "0.2.4" } } })}\n`);
    });
  } finally {
    lines.close();
    child.kill();
  }
}

export async function probeCodexCandidate(candidate: Candidate, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): Promise<CodexLaunch> {
  const environment = codexLaunchEnvironment(candidate);
  const versionResult = await execFileAsync(candidate.executable, ["--version"], { env: environment, timeout: timeoutMs });
  const version = versionResult.stdout.trim() || versionResult.stderr.trim();
  if (!version) throw new Error("version check returned no output");
  await appServerHandshake(candidate, timeoutMs);
  return { ...candidate, version };
}

export async function resolveCodexLaunch(options: DiscoveryOptions = {}) {
  const candidates = await discoverCodexCandidates(options);
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      return await probeCodexCandidate(candidate, options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS);
    } catch (error) {
      failures.push(`${candidate.executable}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const detail = failures.length ? ` Checked candidates:\n- ${failures.join("\n- ")}` : " No executable candidates were found.";
  throw new Error(`No working Codex CLI with app-server support was found.${detail}`);
}

export function launchFromEnvironment(env: NodeJS.ProcessEnv = process.env): CodexLaunch | undefined {
  if (!env.PINHERE_CODEX_BIN) return undefined;
  return {
    executable: env.PINHERE_CODEX_BIN,
    searchPath: env.PINHERE_CODEX_PATH ?? buildCodexSearchPath(env.PINHERE_CODEX_BIN, { env }),
    source: "override",
    version: "preconfigured"
  };
}
