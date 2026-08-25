import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installPinhereSkill, resolveSkillsRoot } from "./skill-install.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("Pinhere Skill installer", () => {
  it("copies the complete skill directory and updates it recoverably", async () => {
    const root = await mkdtemp(join(tmpdir(), "pinhere-skill-install-"));
    temporaryDirectories.push(root);
    const sourceDir = join(root, "source");
    const skillsRoot = join(root, "skills");
    const backupRoot = join(root, "backups");
    await mkdir(join(sourceDir, "references"), { recursive: true });
    await writeFile(join(sourceDir, "SKILL.md"), "---\nname: pinhere\ndescription: Test Pinhere.\n---\n\nRead references/details.md.\n");
    await writeFile(join(sourceDir, "references", "details.md"), "version one\n");

    const installed = await installPinhereSkill({ sourceDir, skillsRoot, backupRoot, homeDir: root });
    expect(installed.changed).toBe(true);
    expect(await readFile(join(skillsRoot, "pinhere", "references", "details.md"), "utf8")).toBe("version one\n");

    const unchanged = await installPinhereSkill({ sourceDir, skillsRoot, backupRoot, homeDir: root });
    expect(unchanged.changed).toBe(false);

    await writeFile(join(sourceDir, "references", "details.md"), "version two\n");
    const updated = await installPinhereSkill({ sourceDir, skillsRoot, backupRoot, homeDir: root });
    expect(updated.changed).toBe(true);
    expect(updated.backupPath).toBeTruthy();
    expect(await readFile(join(updated.backupPath!, "references", "details.md"), "utf8")).toBe("version one\n");
    expect(await readFile(join(skillsRoot, "pinhere", "references", "details.md"), "utf8")).toBe("version two\n");
  });

  it("prefers an active Codex home and otherwise uses the open skills standard", async () => {
    const root = await mkdtemp(join(tmpdir(), "pinhere-skill-path-"));
    temporaryDirectories.push(root);
    expect(await resolveSkillsRoot({ agent: "auto", homeDir: root, env: { CODEX_HOME: join(root, "codex-home") } }))
      .toEqual({ agent: "codex", skillsRoot: join(root, "codex-home", "skills") });
    expect(await resolveSkillsRoot({ agent: "auto", homeDir: root, env: {} }))
      .toEqual({ agent: "standard", skillsRoot: join(root, ".agents", "skills") });
  });
});
