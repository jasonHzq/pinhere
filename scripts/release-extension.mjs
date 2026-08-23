import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = join(repositoryRoot, "apps/extension/package.json");
const manifestPath = join(repositoryRoot, "apps/extension/manifests/chrome.json");
const distPath = join(repositoryRoot, "apps/extension/dist");
const downloadsPath = join(repositoryRoot, "apps/web/public/downloads");
const checkOnly = process.argv.includes("--check");
const requestedVersion = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const chromeVersion = /^\d+(?:\.\d+){0,3}$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function filesUnder(path) {
  return readdirSync(path, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? filesUnder(join(path, entry.name)) : [join(path, entry.name)])
    .sort();
}

const extensionPackage = readJson(packagePath);
if (requestedVersion) extensionPackage.version = requestedVersion;
if (!chromeVersion.test(extensionPackage.version)) {
  throw new Error(`Chrome 扩展版本必须是 1 到 4 段数字：${extensionPackage.version}`);
}

const manifest = readJson(manifestPath);
const archiveName = `pinhere-extension-v${extensionPackage.version}.zip`;
const archivePath = join(downloadsPath, archiveName);

if (checkOnly) {
  if (requestedVersion) throw new Error("--check 不能同时指定版本号");
  if (manifest.version !== extensionPackage.version) {
    throw new Error(`扩展版本不同步：package=${extensionPackage.version}, manifest=${manifest.version}`);
  }
  if (!existsSync(archivePath) || statSync(archivePath).size === 0) {
    throw new Error(`官网安装包不存在：${relative(repositoryRoot, archivePath)}`);
  }
  const archivedManifest = JSON.parse(execFileSync("unzip", ["-p", archivePath, "manifest.json"], { encoding: "utf8" }));
  if (archivedManifest.version !== extensionPackage.version) {
    throw new Error(`官网安装包版本错误：zip=${archivedManifest.version}, package=${extensionPackage.version}`);
  }
  console.log(`Chrome 扩展发布产物已同步：v${extensionPackage.version} → /downloads/${archiveName}`);
  process.exit(0);
}

if (requestedVersion) writeJson(packagePath, extensionPackage);
if (manifest.version !== extensionPackage.version) {
  manifest.version = extensionPackage.version;
  writeJson(manifestPath, manifest);
}

execFileSync("pnpm", ["--filter", "@pinhere/extension", "build"], { cwd: repositoryRoot, stdio: "inherit" });
mkdirSync(downloadsPath, { recursive: true });
rmSync(archivePath, { force: true });

// ZIP stores file modification times. Normalize them and sort paths so a
// no-op build produces the same archive bytes locally and in CI.
const normalizedTime = new Date("1980-01-01T00:00:00.000Z");
const files = filesUnder(distPath);
for (const file of files) utimesSync(file, normalizedTime, normalizedTime);
execFileSync("zip", ["-X", "-q", archivePath, ...files.map((file) => relative(distPath, file))], { cwd: distPath });

console.log(`Chrome 扩展已发布：v${extensionPackage.version} → ${relative(repositoryRoot, archivePath)}`);
