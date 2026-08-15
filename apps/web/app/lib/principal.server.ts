import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { apiTokens, authUsers, extensionTokens } from "~/db/schema";
import { getAuth } from "./auth.server";
import { digestSecret } from "./ids.server";

export type Principal = {
  userId: string;
  actorType: "user" | "api_token" | "extension";
  actorId: string;
  scopes: string[];
};

async function devPrincipal(): Promise<Principal | null> {
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (production || !process.env.PINHERE_DEV_USER_ID) return null;
  const db = getDatabase();
  await db.insert(authUsers).values({
    id: process.env.PINHERE_DEV_USER_ID,
    name: "Pinhere Developer",
    email: `${process.env.PINHERE_DEV_USER_ID}@localhost.invalid`,
    emailVerified: true
  }).onConflictDoNothing();
  return {
    userId: process.env.PINHERE_DEV_USER_ID,
    actorType: "user",
    actorId: process.env.PINHERE_DEV_USER_ID,
    scopes: ["*"]
  };
}

export async function getPrincipal(request: Request): Promise<Principal | null> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7);
    const digest = digestSecret(token);
    const db = getDatabase();

    if (token.startsWith("ph_pat_")) {
      const [record] = await db
        .select()
        .from(apiTokens)
        .where(and(eq(apiTokens.digest, digest), isNull(apiTokens.revokedAt)))
        .limit(1);
      if (record && (!record.expiresAt || record.expiresAt > new Date())) {
        await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, record.id));
        return { userId: record.userId, actorType: "api_token", actorId: record.id, scopes: record.scopes };
      }
    }

    if (token.startsWith("ph_ext_")) {
      const [record] = await db
        .select()
        .from(extensionTokens)
        .where(and(eq(extensionTokens.accessDigest, digest), isNull(extensionTokens.revokedAt), gt(extensionTokens.accessExpiresAt, new Date())))
        .limit(1);
      if (record) {
        return { userId: record.userId, actorType: "extension", actorId: record.id, scopes: record.scopes };
      }
    }
    return null;
  }

  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (session?.user) {
      return { userId: session.user.id, actorType: "user", actorId: session.user.id, scopes: ["*"] };
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
  }
  return devPrincipal();
}

export function hasScope(principal: Principal, scope: string) {
  return principal.scopes.includes("*") || principal.scopes.includes(scope);
}
