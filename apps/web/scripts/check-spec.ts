import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Spec = { pontx: string; style: string; apis: Record<string, { operationId: string; method: string; path: string }> };
const root = resolve(import.meta.dirname, "..");
const zh = JSON.parse(await readFile(resolve(root, "specs/spec.pontx.json"), "utf8")) as Spec;
const en = JSON.parse(await readFile(resolve(root, "specs/locales/en-US/spec.pontx.json"), "utf8")) as Spec;
const honoSource = await readFile(resolve(root, "app/api/app.server.ts"), "utf8");

assert.equal(zh.pontx, "2.1");
assert.equal(zh.style, "RESTFul");
assert.deepEqual(Object.keys(zh.apis).sort(), Object.keys(en.apis).sort(), "Locale operation sets differ");
for (const [key, operation] of Object.entries(zh.apis)) {
  const localized = en.apis[key];
  assert(localized, `Missing English operation ${key}`);
  assert.equal(operation.operationId, key, `${key} operationId must match its key`);
  assert.equal(localized.operationId, operation.operationId, `${key} operationId differs by locale`);
  assert.equal(localized.method, operation.method, `${key} method differs by locale`);
  assert.equal(localized.path, operation.path, `${key} path differs by locale`);
  const honoPath = `/api/v1${operation.path.replaceAll(/\{([^}]+)\}/g, ":$1")}`;
  const registration = `app.${operation.method.toLowerCase()}(\"${honoPath}\"`;
  assert(honoSource.includes(registration), `${key} has no ${operation.method} ${honoPath} Hono route`);
}
console.info(`Validated ${Object.keys(zh.apis).length} localized Pinhere operations.`);
