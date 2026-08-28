import { asc, eq } from "drizzle-orm";
import { getDatabase } from "../app/db/client.server";
import { issues } from "../app/db/schema";
import { assignReadableIssueId } from "../app/lib/issue-readable-id.server";

const db = getDatabase();
if (process.argv.includes("--retry-fallback")) {
  await db
    .update(issues)
    .set({ readableIdStatus: "pending", updatedAt: new Date() })
    .where(eq(issues.readableIdStatus, "fallback"));
}
const pending = await db
  .select({ id: issues.id })
  .from(issues)
  .where(eq(issues.readableIdStatus, "pending"))
  .orderBy(asc(issues.createdAt));

let processed = 0;
let failed = 0;
for (const issue of pending) {
  try {
    if (await assignReadableIssueId(issue.id)) processed += 1;
    else failed += 1;
  } catch (error) {
    failed += 1;
    console.error(`Could not generate a readable ID for ${issue.id}:`, error);
  }
}

const remaining = await db
  .select({ status: issues.readableIdStatus })
  .from(issues)
  .where(eq(issues.readableIdStatus, "pending"));
const generated = await db
  .select({ id: issues.id })
  .from(issues)
  .where(eq(issues.readableIdStatus, "generated"));
const fallback = await db
  .select({ id: issues.id })
  .from(issues)
  .where(eq(issues.readableIdStatus, "fallback"));

console.log(JSON.stringify({ selected: pending.length, processed, failed, pending: remaining.length, generated: generated.length, fallback: fallback.length }));
if (failed) process.exitCode = 1;
