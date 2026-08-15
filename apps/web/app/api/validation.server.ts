import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { ZodType } from "zod";
import { getDatabase } from "~/db/client.server";
import { idempotencyRecords } from "~/db/schema";
import { ApiError } from "./errors.server";

export async function jsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError("invalid_json", "Request body must be valid JSON", 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid request", 422);
  }
  return parsed.data;
}

export function expectedVersion(request: Request, current: number) {
  const ifMatch = request.headers.get("if-match");
  if (!ifMatch) throw new ApiError("if_match_required", "If-Match is required", 412);
  const normalized = ifMatch.replaceAll('"', "");
  if (normalized !== String(current)) {
    throw new ApiError("version_conflict", "The resource changed; reload it and try again", 412);
  }
}

function requestDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function findIdempotentResponse(userId: string, operationId: string, key: string | null, body: unknown) {
  if (!key) return null;
  if (key.length < 8 || key.length > 200) throw new ApiError("invalid_idempotency_key", "Idempotency-Key must contain 8 to 200 characters", 400);
  const db = getDatabase();
  const [record] = await db
    .select()
    .from(idempotencyRecords)
    .where(and(
      eq(idempotencyRecords.userId, userId),
      eq(idempotencyRecords.operationId, operationId),
      eq(idempotencyRecords.key, key),
      gt(idempotencyRecords.expiresAt, new Date())
    ))
    .limit(1);
  if (!record) return null;
  if (record.requestHash !== requestDigest(body)) {
    throw new ApiError("idempotency_conflict", "This Idempotency-Key was used with a different request", 409);
  }
  return Response.json(record.response, { status: record.status, headers: { "Idempotency-Replayed": "true" } });
}

export async function saveIdempotentResponse(userId: string, operationId: string, key: string | null, body: unknown, status: number, response: unknown) {
  if (!key) return;
  const db = getDatabase();
  await db.insert(idempotencyRecords).values({
    userId,
    operationId,
    key,
    requestHash: requestDigest(body),
    status,
    response,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }).onConflictDoNothing();
}
