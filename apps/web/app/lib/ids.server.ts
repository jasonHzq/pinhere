import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function createSecret(prefix: string, bytes = 32) {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

export function digestSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeDigestEqual(value: string, digest: string) {
  const actual = Buffer.from(digestSecret(value));
  const expected = Buffer.from(digest);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function resourceEtag(version: number) {
  return `\"${version}\"`;
}
