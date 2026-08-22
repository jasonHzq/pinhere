import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type AgentMode = "yolo" | "workspace" | "confirm";
export type Binding = { projectId: string; path: string; harness: "codex"; mode: AgentMode };
export type Config = {
  baseUrl: string;
  token?: string;
  agentId?: string;
  agentName?: string;
  bindings: Binding[];
  pollIntervalSeconds: number;
};

export const configDir = process.env.PINHERE_CONFIG_DIR
  ? resolve(process.env.PINHERE_CONFIG_DIR)
  : join(homedir(), ".pinhere");
export const configPath = join(configDir, "config.json");

const defaults: Config = {
  baseUrl: process.env.PINHERE_BASE_URL ?? "https://pinhere.dev",
  bindings: [],
  pollIntervalSeconds: 15
};

export async function readConfig(): Promise<Config> {
  try {
    return { ...defaults, ...JSON.parse(await readFile(configPath, "utf8")) as Partial<Config> };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...defaults };
    throw error;
  }
}

export async function writeConfig(config: Config) {
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(configPath, 0o600).catch(() => undefined);
}

export async function updateConfig(update: (current: Config) => Config) {
  const next = update(await readConfig());
  await writeConfig(next);
  return next;
}

