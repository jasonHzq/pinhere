import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SkillAgent = "auto" | "codex" | "standard";

type InstallSkillOptions = {
  agent?: SkillAgent;
  skillsRoot?: string;
  sourceDir?: string;
  backupRoot?: string;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
};

export type SkillInstallResult = {
  installed: true;
  changed: boolean;
  agent: Exclude<SkillAgent, "auto">;
  version: string;
  skillPath: string;
  backupPath?: string;
  instruction: string;
};

async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function digestDirectory(root: string) {
  const hash = createHash("sha256");
  async function visit(relative = "") {
    const entries = await readdir(join(root, relative), { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const child = join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Skill packages may not contain symbolic links: ${child}`);
      if (entry.isDirectory()) {
        hash.update(`directory:${child}\n`);
        await visit(child);
      } else if (entry.isFile()) {
        hash.update(`file:${child}\n`);
        hash.update(await readFile(join(root, child)));
      }
    }
  }
  await visit();
  return hash.digest("hex");
}

export async function resolveSkillsRoot(options: Pick<InstallSkillOptions, "agent" | "homeDir" | "env"> = {}) {
  const agent = options.agent ?? "auto";
  const home = options.homeDir ?? homedir();
  const env = options.env ?? process.env;
  const codexHome = env.CODEX_HOME ? resolve(env.CODEX_HOME) : join(home, ".codex");
  if (agent === "codex") return { agent, skillsRoot: join(codexHome, "skills") } as const;
  if (agent === "standard") return { agent, skillsRoot: join(home, ".agents", "skills") } as const;
  if (env.CODEX_HOME || await exists(join(home, ".codex"))) {
    return { agent: "codex", skillsRoot: join(codexHome, "skills") } as const;
  }
  return { agent: "standard", skillsRoot: join(home, ".agents", "skills") } as const;
}

export async function installPinhereSkill(options: InstallSkillOptions = {}): Promise<SkillInstallResult> {
  const sourceDir = options.sourceDir ?? fileURLToPath(new URL("../skill", import.meta.url));
  const skill = await readFile(join(sourceDir, "SKILL.md"), "utf8");
  if (!/^---\s*[\s\S]*?^name:\s*pinhere\s*$/m.test(skill)) {
    throw new Error("Bundled Pinhere Skill has invalid or missing frontmatter");
  }
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
  const resolved = options.skillsRoot
    ? { agent: options.agent === "standard" ? "standard" as const : "codex" as const, skillsRoot: resolve(options.skillsRoot) }
    : await resolveSkillsRoot(options);
  const target = join(resolved.skillsRoot, "pinhere");
  const skillPath = join(target, "SKILL.md");
  const home = options.homeDir ?? homedir();
  const backupRoot = options.backupRoot ?? join(home, ".pinhere", "backups", "skills");

  await mkdir(resolved.skillsRoot, { recursive: true, mode: 0o700 });
  const stagingParent = await mkdtemp(join(resolved.skillsRoot, ".pinhere-install-"));
  const staging = join(stagingParent, "pinhere");
  let backupPath: string | undefined;
  try {
    await cp(sourceDir, staging, { recursive: true, errorOnExist: true });
    const currentExists = await exists(target);
    if (currentExists && await digestDirectory(target) === await digestDirectory(staging)) {
      return {
        installed: true,
        changed: false,
        agent: resolved.agent,
        version: manifest.version ?? "unknown",
        skillPath,
        instruction: `Read ${skillPath} now and continue the current task without waiting for an agent restart.`
      };
    }

    if (currentExists) {
      const displaced = join(resolved.skillsRoot, `.pinhere-previous-${process.pid}-${Date.now()}`);
      await rename(target, displaced);
      try {
        await rename(staging, target);
      } catch (error) {
        await rename(displaced, target);
        throw error;
      }
      await mkdir(backupRoot, { recursive: true, mode: 0o700 });
      backupPath = join(backupRoot, `pinhere-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`);
      try {
        await rename(displaced, backupPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
        await cp(displaced, backupPath, { recursive: true });
        await rm(displaced, { recursive: true, force: true });
      }
    } else {
      await rename(staging, target);
    }

    return {
      installed: true,
      changed: true,
      agent: resolved.agent,
      version: manifest.version ?? "unknown",
      skillPath,
      backupPath,
      instruction: `Read ${skillPath} now and continue the current task without waiting for an agent restart.`
    };
  } finally {
    await rm(stagingParent, { recursive: true, force: true });
  }
}
