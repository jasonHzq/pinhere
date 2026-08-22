import { and, eq, lt, sql } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { issueEvents, issues } from "~/db/schema";
import { createId } from "~/lib/ids.server";

export const CLAIM_LEASE_MS = 4 * 60 * 60 * 1_000;

export function claimExpiry() {
  return new Date(Date.now() + CLAIM_LEASE_MS);
}

export async function releaseExpiredClaims() {
  const released = await getDatabase().update(issues).set({
    status: "open",
    claimedByTokenId: null,
    claimedAt: null,
    claimExpiresAt: null,
    updatedAt: new Date(),
    version: sql`${issues.version} + 1`
  }).where(and(eq(issues.status, "in_progress"), lt(issues.claimExpiresAt, new Date()))).returning({ id: issues.id, userId: issues.userId });
  if (released.length) {
    await getDatabase().insert(issueEvents).values(released.map((issue) => ({
      id: createId("evt"), issueId: issue.id, userId: issue.userId, actorType: "system", actorId: null,
      type: "issue.claim_expired", data: {}
    })));
  }
  return { released: released.length };
}
