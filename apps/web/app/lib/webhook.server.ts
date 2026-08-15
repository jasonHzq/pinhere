import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { outboxEvents, webhookDeliveries, webhooks } from "~/db/schema";
import { createId, createSecret, digestSecret } from "./ids.server";

const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000, 24 * 3_600_000];

function encryptionKey() {
  const source = process.env.BETTER_AUTH_SECRET;
  if (!source) throw new Error("BETTER_AUTH_SECRET is required to encrypt webhook secrets");
  return createHash("sha256").update(`pinhere:webhook:${source}`).digest();
}

export function encryptWebhookSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWebhookSecret(value: string) {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted webhook secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] === 0;
}

function isPrivateIpv6(address: string) {
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
}

export async function assertPublicWebhookUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Webhook URL must be a public HTTPS URL");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new Error("Private and metadata hosts are not allowed");
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) => family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address))) {
    throw new Error("Webhook host resolves to a private address");
  }
  return url;
}

export function newWebhookSecret() {
  const secret = createSecret("ph_whsec");
  return { secret, digest: digestSecret(secret), encrypted: encryptWebhookSecret(secret) };
}

async function materializeOutbox() {
  const db = getDatabase();
  const events = await db.select().from(outboxEvents).where(isNull(outboxEvents.processedAt)).orderBy(asc(outboxEvents.createdAt)).limit(50);
  for (const event of events) {
    const hooks = await db.select().from(webhooks).where(and(
      eq(webhooks.userId, event.userId),
      eq(webhooks.enabled, true)
    ));
    const matching = hooks.filter((hook) => !hook.projectId || hook.projectId === event.payload.projectId);
    if (matching.length) {
      await db.insert(webhookDeliveries).values(matching.map((hook) => ({
        id: createId("whd"),
        webhookId: hook.id,
        eventId: event.id,
        eventType: event.type,
        payload: event.payload,
        nextAttemptAt: new Date()
      }))).onConflictDoNothing();
    }
    await db.update(outboxEvents).set({ processedAt: new Date() }).where(eq(outboxEvents.id, event.id));
  }
}

export async function deliverWebhook(deliveryId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);
  if (!row || !row.webhook.enabled || row.delivery.status === "delivered") return;

  const rawBody = JSON.stringify({
    id: row.delivery.eventId,
    type: row.delivery.eventType,
    createdAt: row.delivery.createdAt.toISOString(),
    data: row.delivery.payload
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", decryptWebhookSecret(row.webhook.secretEncrypted))
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let responseStatus: number | null = null;
  let responseBody = "";
  let lastError: string | null = null;

  try {
    const target = await assertPublicWebhookUrl(row.webhook.url);
    const response = await fetch(target, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "user-agent": "Pinhere-Webhooks/1.0",
        "pinhere-event": row.delivery.eventType,
        "pinhere-delivery": row.delivery.id,
        "pinhere-signature": `t=${timestamp},v1=${signature}`
      },
      body: rawBody
    });
    responseStatus = response.status;
    responseBody = (await response.text()).slice(0, 2_000);
    if (response.status >= 300 && response.status < 400) throw new Error("Webhook redirects are not followed");
    if (response.status < 200 || response.status >= 300) throw new Error(`Webhook returned HTTP ${response.status}`);
    await db.update(webhookDeliveries).set({
      status: "delivered",
      attempt: row.delivery.attempt + 1,
      responseStatus,
      responseBody,
      deliveredAt: new Date(),
      updatedAt: new Date(),
      lastError: null
    }).where(eq(webhookDeliveries.id, deliveryId));
    return;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Webhook delivery failed";
  } finally {
    clearTimeout(timeout);
  }

  const nextAttempt = row.delivery.attempt + 1;
  const delay = RETRY_DELAYS_MS[nextAttempt - 1];
  await db.update(webhookDeliveries).set({
    status: delay ? "pending" : "failed",
    attempt: nextAttempt,
    nextAttemptAt: new Date(Date.now() + (delay ?? 0)),
    responseStatus,
    responseBody,
    lastError,
    updatedAt: new Date()
  }).where(eq(webhookDeliveries.id, deliveryId));
}

export async function processWebhookWork() {
  await materializeOutbox();
  const db = getDatabase();
  const due = await db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.status, "pending"), lte(webhookDeliveries.nextAttemptAt, new Date())))
    .limit(25);
  await Promise.all(due.map(({ id }) => deliverWebhook(id)));
  return { processed: due.length };
}

export async function retryDeliveries(ids: string[]) {
  if (!ids.length) return;
  await getDatabase().update(webhookDeliveries).set({ status: "pending", nextAttemptAt: new Date(), updatedAt: new Date() }).where(inArray(webhookDeliveries.id, ids));
}
