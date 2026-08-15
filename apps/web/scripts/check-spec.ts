import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
// @ts-expect-error The checked-in generator is plain ESM so Node can run it without a build step.
import { buildSpec } from "./build-spec.mjs";

type Spec = { name: string; pontx: string; style: string; apis: Record<string, { operationId: string; method: string; path: string }> };
const root = resolve(import.meta.dirname, "..");
const zh = JSON.parse(await readFile(resolve(root, "specs/spec.pontx.json"), "utf8")) as Spec;
const en = JSON.parse(await readFile(resolve(root, "specs/locales/en-US/spec.pontx.json"), "utf8")) as Spec;
const honoSource = await readFile(resolve(root, "app/api/app.server.ts"), "utf8");
const operationSource = await readFile(resolve(root, "app/api/operations.ts"), "utf8");

assert.equal(zh.name, "pinhere");
assert.equal(zh.pontx, "2.1");
assert.equal(zh.style, "RESTFul");
assert.deepEqual(zh, buildSpec("zh-CN"), "Canonical spec drifted from scripts/build-spec.mjs");
assert.deepEqual(en, buildSpec("en-US"), "English locale drifted from scripts/build-spec.mjs");
for (const [key, operation] of Object.entries(zh.apis)) {
  const localized = en.apis[key];
  assert(localized, `Missing English operation ${key}`);
  assert.equal(operation.operationId, key.split("/").at(-1), `${key} operationId must match the final hierarchy segment`);
  assert.equal(localized.operationId, operation.operationId, `${key} operationId differs by locale`);
  assert.equal(localized.method, operation.method, `${key} method differs by locale`);
  assert.equal(localized.path, operation.path, `${key} path differs by locale`);
  assert(operationSource.includes(`"${operation.operationId}"`), `${operation.operationId} is missing from IMPLEMENTED_OPERATION_IDS`);
  const honoPath = `/api/v1${operation.path.replaceAll(/\{([^}]+)\}/g, ":$1")}`;
  const registration = `app.${operation.method.toLowerCase()}(\"${honoPath}\"`;
  assert(honoSource.includes(registration), `${key} has no ${operation.method} ${honoPath} Hono route`);
}
const registeredRoutes = [...honoSource.matchAll(/app\.(get|post|patch|delete)\(\"(\/api\/v1[^\"?]*)\"/g)]
  .map((match) => `${match[1]!.toUpperCase()} ${match[2]!.replaceAll(/:([^/]+)/g, "{$1}")}`)
  .sort();
const documentedRoutes = Object.values(zh.apis).map((operation) => `${operation.method} /api/v1${operation.path}`).sort();
assert.deepEqual(documentedRoutes, registeredRoutes, "Implemented and documented route surfaces differ");
console.info(`Validated ${Object.keys(zh.apis).length} localized Pinhere operations.`);
