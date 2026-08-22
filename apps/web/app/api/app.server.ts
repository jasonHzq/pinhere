import { del, put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDatabase } from "~/db/client.server";
import {
  apiTokens,
  attachments,
  extensionCodes,
  extensionTokens,
  issueEvents,
  issues,
  outboxEvents,
  projectOrigins,
  projects,
  webhookDeliveries,
  webhooks
} from "~/db/schema";
import { createId, createSecret, digestSecret, resourceEtag } from "~/lib/ids.server";
import { issueExtensionAuthorizationCode, parseExtensionRedirectUri } from "~/lib/extension-oauth.server";
import { normalizeOrigin, sanitizePageUrl } from "~/lib/origin";
import { getPrincipal, hasScope, type Principal } from "~/lib/principal.server";
import { assertPublicWebhookUrl, deliverWebhook, newWebhookSecret, processWebhookWork } from "~/lib/webhook.server";
import { ApiError, errorResponse } from "./errors.server";
import { expectedVersion, findIdempotentResponse, jsonBody, saveIdempotentResponse } from "./validation.server";
export { IMPLEMENTED_OPERATION_IDS } from "./operations";

const app = new Hono();
const projectInput = z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(1_000).default(""), origins: z.array(z.string()).max(50).default([]) });
const domSchema = z.object({
  cssSelector: z.string().max(2_000), xpath: z.string().max(2_000), tagName: z.string().max(100),
  attributes: z.record(z.string(), z.string().max(2_000)), text: z.string().max(5_000), outerHTML: z.string().max(30_000),
  viewport: z.object({ width: z.number().positive(), height: z.number().positive(), devicePixelRatio: z.number().positive().max(8) }),
  boundingRect: z.object({ x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative() })
});
const issueInput = z.object({
  projectId: z.string(), title: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(20_000),
  pageUrl: z.string().url(), dom: domSchema, attachmentId: z.string().optional(), source: z.enum(["extension", "web", "api"]).default("extension")
});

function data(value: unknown, status = 200, headers?: HeadersInit) {
  return Response.json({ data: value }, { status, headers });
}

function cursorDate(value: string | undefined) {
  if (!value) return null;
  try { return new Date(Buffer.from(value, "base64url").toString("utf8")); } catch { throw new ApiError("invalid_cursor", "Cursor is invalid", 400); }
}

function nextCursor(date: Date | undefined, hasMore: boolean) {
  return hasMore && date ? Buffer.from(date.toISOString()).toString("base64url") : null;
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; cause?: { code?: string } };
  return value.code === "23505" || value.cause?.code === "23505";
}

async function principal(request: Request, scope: string) {
  const value = await getPrincipal(request);
  if (!value) throw new ApiError("unauthorized", "Authentication is required", 401);
  if (!hasScope(value, scope)) throw new ApiError("insufficient_scope", `Missing scope: ${scope}`, 403);
  return value;
}

async function ownedProject(userId: string, projectId: string) {
  const [project] = await getDatabase().select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  if (!project) throw new ApiError("project_not_found", "Project was not found", 404);
  return project;
}

async function ownedIssue(userId: string, issueId: string) {
  const [issue] = await getDatabase().select().from(issues).where(and(eq(issues.id, issueId), eq(issues.userId, userId))).limit(1);
  if (!issue) throw new ApiError("issue_not_found", "Issue was not found", 404);
  return issue;
}

async function addIssueEvent(issueId: string, p: Principal, type: string, eventData: Record<string, unknown> = {}) {
  await getDatabase().insert(issueEvents).values({
    id: createId("evt"), issueId, userId: p.userId, actorType: p.actorType, actorId: p.actorId, type, data: eventData
  });
}

function background(task: Promise<unknown>) {
  if (process.env.VERCEL) waitUntil(task);
  else void task.catch(console.error);
}

app.onError((error) => errorResponse(error));

app.get("/api/v1/projects", async (c) => {
  const p = await principal(c.req.raw, "projects:read");
  const rows = await getDatabase().select().from(projects).where(eq(projects.userId, p.userId)).orderBy(desc(projects.updatedAt));
  return data(rows);
});

app.post("/api/v1/projects", async (c) => {
  const p = await principal(c.req.raw, "projects:write");
  const body = await jsonBody(c.req.raw, projectInput);
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "createProject", key, body);
  if (replay) return replay;
  const normalized = [...new Set(body.origins.map(normalizeOrigin))];
  const id = createId("prj");
  const db = getDatabase();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({ id, userId: p.userId, name: body.name, description: body.description });
      if (normalized.length) await tx.insert(projectOrigins).values(normalized.map((origin) => ({ projectId: id, userId: p.userId, origin })));
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError("origin_already_assigned", "One of these origins already belongs to another project", 409);
    throw error;
  }
  const response = { data: await ownedProject(p.userId, id) };
  await saveIdempotentResponse(p.userId, "createProject", key, body, 201, response);
  return Response.json(response, { status: 201 });
});

app.get("/api/v1/projects/:projectId", async (c) => {
  const p = await principal(c.req.raw, "projects:read");
  const project = await ownedProject(p.userId, c.req.param("projectId"));
  const origins = await getDatabase().select({ origin: projectOrigins.origin }).from(projectOrigins).where(eq(projectOrigins.projectId, project.id));
  return data({ ...project, origins: origins.map((item) => item.origin) }, 200, { ETag: resourceEtag(project.version) });
});

app.patch("/api/v1/projects/:projectId", async (c) => {
  const p = await principal(c.req.raw, "projects:write");
  const project = await ownedProject(p.userId, c.req.param("projectId"));
  const body = await jsonBody(c.req.raw, projectInput.partial().omit({ origins: true }));
  const key = c.req.header("idempotency-key") ?? null;
  const requestValue = { projectId: project.id, ifMatch: c.req.header("if-match"), ...body };
  const replay = await findIdempotentResponse(p.userId, "updateProject", key, requestValue);
  if (replay) return replay;
  expectedVersion(c.req.raw, project.version);
  const [updated] = await getDatabase().update(projects).set({ ...body, updatedAt: new Date(), version: project.version + 1 }).where(and(eq(projects.id, project.id), eq(projects.version, project.version))).returning();
  if (!updated) throw new ApiError("version_conflict", "The project changed; reload it and try again", 412);
  const response = { data: updated };
  await saveIdempotentResponse(p.userId, "updateProject", key, requestValue, 200, response);
  return Response.json(response, { headers: { ETag: resourceEtag(updated!.version) } });
});

app.delete("/api/v1/projects/:projectId", async (c) => {
  const p = await principal(c.req.raw, "projects:write");
  const project = await ownedProject(p.userId, c.req.param("projectId"));
  expectedVersion(c.req.raw, project.version);
  const blobs = await getDatabase().select({ url: attachments.blobUrl }).from(attachments)
    .innerJoin(issues, eq(attachments.issueId, issues.id)).where(eq(issues.projectId, project.id));
  const [deleted] = await getDatabase().delete(projects).where(and(eq(projects.id, project.id), eq(projects.version, project.version))).returning({ id: projects.id });
  if (!deleted) throw new ApiError("version_conflict", "The project changed; reload it and try again", 412);
  if (process.env.BLOB_READ_WRITE_TOKEN && blobs.length) background(del(blobs.map((item) => item.url)));
  return new Response(null, { status: 204 });
});

app.post("/api/v1/projects/:projectId/origins", async (c) => {
  const p = await principal(c.req.raw, "projects:write");
  const project = await ownedProject(p.userId, c.req.param("projectId"));
  const body = await jsonBody(c.req.raw, z.object({ origin: z.string() }));
  const origin = normalizeOrigin(body.origin);
  const key = c.req.header("idempotency-key") ?? null;
  const requestValue = { projectId: project.id, origin };
  const replay = await findIdempotentResponse(p.userId, "addProjectOrigin", key, requestValue);
  if (replay) return replay;
  try {
    await getDatabase().transaction(async (tx) => {
      await tx.insert(projectOrigins).values({ projectId: project.id, userId: p.userId, origin });
      await tx.update(projects).set({ updatedAt: new Date(), version: sql`${projects.version} + 1` }).where(eq(projects.id, project.id));
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError("origin_already_assigned", "This origin already belongs to a project", 409);
    throw error;
  }
  const response = { data: { origin, projectVersion: project.version + 1 } };
  await saveIdempotentResponse(p.userId, "addProjectOrigin", key, requestValue, 201, response);
  return Response.json(response, { status: 201 });
});

app.delete("/api/v1/projects/:projectId/origins/:encodedOrigin", async (c) => {
  const p = await principal(c.req.raw, "projects:write");
  const project = await ownedProject(p.userId, c.req.param("projectId"));
  const origin = normalizeOrigin(decodeURIComponent(c.req.param("encodedOrigin")));
  const db = getDatabase();
  const removed = await db.transaction(async (tx) => {
    const [deleted] = await tx.delete(projectOrigins).where(and(eq(projectOrigins.projectId, project.id), eq(projectOrigins.origin, origin))).returning({ origin: projectOrigins.origin });
    if (deleted) await tx.update(projects).set({ updatedAt: new Date(), version: sql`${projects.version} + 1` }).where(eq(projects.id, project.id));
    return deleted;
  });
  return new Response(null, { status: 204, headers: removed ? { ETag: resourceEtag(project.version + 1) } : undefined });
});

app.get("/api/v1/projects/resolve", async (c) => {
  const p = await principal(c.req.raw, "projects:read");
  const origin = normalizeOrigin(c.req.query("url") ?? "");
  const [match] = await getDatabase().select({ project: projects, origin: projectOrigins.origin }).from(projectOrigins)
    .innerJoin(projects, eq(projectOrigins.projectId, projects.id))
    .where(and(eq(projectOrigins.userId, p.userId), eq(projectOrigins.origin, origin))).limit(1);
  return data({ project: match?.project ?? null, origin });
});

app.get("/api/v1/issues", async (c) => {
  const p = await principal(c.req.raw, "issues:read");
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 50), 1), 100);
  const cursor = cursorDate(c.req.query("cursor"));
  const status = c.req.query("status") as "open" | "in_progress" | "done" | undefined;
  const projectId = c.req.query("projectId");
  const updatedAfter = c.req.query("updatedAfter") ? new Date(c.req.query("updatedAfter")!) : null;
  const conditions = [eq(issues.userId, p.userId)];
  if (status) conditions.push(eq(issues.status, status));
  if (projectId) conditions.push(eq(issues.projectId, projectId));
  if (cursor) conditions.push(lt(issues.createdAt, cursor));
  if (updatedAfter) conditions.push(gt(issues.updatedAt, updatedAfter));
  const rows = await getDatabase().select().from(issues).where(and(...conditions)).orderBy(desc(issues.createdAt)).limit(limit + 1);
  const page = rows.slice(0, limit);
  const response = { data: page, meta: { nextCursor: nextCursor(page.at(-1)?.createdAt, rows.length > limit) } };
  const tag = `\"${createHash("sha256").update(JSON.stringify(response)).digest("base64url")}\"`;
  if (c.req.header("if-none-match") === tag) return new Response(null, { status: 304, headers: { ETag: tag } });
  return Response.json(response, { headers: { ETag: tag, "Cache-Control": "private, no-cache" } });
});

app.post("/api/v1/issues", async (c) => {
  const p = await principal(c.req.raw, "issues:create");
  const body = await jsonBody(c.req.raw, issueInput);
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "createIssue", key, body);
  if (replay) return replay;
  await ownedProject(p.userId, body.projectId);
  const pageUrl = sanitizePageUrl(body.pageUrl);
  const origin = normalizeOrigin(pageUrl);
  const [assigned] = await getDatabase().select().from(projectOrigins).where(and(
    eq(projectOrigins.projectId, body.projectId), eq(projectOrigins.userId, p.userId), eq(projectOrigins.origin, origin)
  )).limit(1);
  if (!assigned) throw new ApiError("origin_not_assigned", "The page origin is not assigned to this project", 409);
  if (body.attachmentId) {
    const [attachment] = await getDatabase().select().from(attachments).where(and(eq(attachments.id, body.attachmentId), eq(attachments.userId, p.userId), isNull(attachments.issueId))).limit(1);
    if (!attachment) throw new ApiError("attachment_not_found", "Attachment was not found or is already attached", 404);
  }
  const id = createId("iss");
  const eventId = createId("evt");
  const webhookEventId = createId("whe");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.insert(issues).values({ ...body, id, userId: p.userId, pageUrl });
    if (body.attachmentId) {
      const [bound] = await tx.update(attachments).set({ issueId: id }).where(and(eq(attachments.id, body.attachmentId), eq(attachments.userId, p.userId), isNull(attachments.issueId))).returning({ id: attachments.id });
      if (!bound) throw new ApiError("attachment_already_used", "Attachment is already attached to another issue", 409);
    }
    await tx.insert(issueEvents).values({ id: eventId, issueId: id, userId: p.userId, actorType: p.actorType, actorId: p.actorId, type: "issue.created", data: {} });
    await tx.insert(outboxEvents).values({
      id: webhookEventId, userId: p.userId, aggregateId: id, type: "issue.created",
      payload: {
        eventId: webhookEventId, projectId: body.projectId, issueId: id, createdAt: new Date().toISOString(),
        prompt: `请使用 Pinhere Skill 处理缺陷 ${id}。先调用 claimIssue，再调用 getIssue 获取完整上下文。`
      }
    });
  });
  const issue = await ownedIssue(p.userId, id);
  const response = { data: issue };
  await saveIdempotentResponse(p.userId, "createIssue", key, body, 201, response);
  background(processWebhookWork());
  return Response.json(response, { status: 201, headers: { ETag: resourceEtag(issue.version) } });
});

app.get("/api/v1/issues/:issueId", async (c) => {
  const p = await principal(c.req.raw, "issues:read");
  const issue = await ownedIssue(p.userId, c.req.param("issueId"));
  return data({ ...issue, screenshotUrl: issue.attachmentId ? `/api/v1/attachments/${issue.attachmentId}` : null }, 200, { ETag: resourceEtag(issue.version) });
});

app.patch("/api/v1/issues/:issueId", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const issue = await ownedIssue(p.userId, c.req.param("issueId"));
  const body = await jsonBody(c.req.raw, issueInput.pick({ title: true, description: true }).partial());
  const key = c.req.header("idempotency-key") ?? null;
  const requestValue = { issueId: issue.id, ifMatch: c.req.header("if-match"), ...body };
  const replay = await findIdempotentResponse(p.userId, "updateIssue", key, requestValue);
  if (replay) return replay;
  expectedVersion(c.req.raw, issue.version);
  const [updated] = await getDatabase().update(issues).set({ ...body, updatedAt: new Date(), version: issue.version + 1 }).where(and(eq(issues.id, issue.id), eq(issues.version, issue.version))).returning();
  if (!updated) throw new ApiError("version_conflict", "The issue changed; reload it and try again", 412);
  await addIssueEvent(issue.id, p, "issue.updated", body);
  const response = { data: updated };
  await saveIdempotentResponse(p.userId, "updateIssue", key, requestValue, 200, response);
  return Response.json(response, { headers: { ETag: resourceEtag(updated!.version) } });
});

app.delete("/api/v1/issues/:issueId", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const issue = await ownedIssue(p.userId, c.req.param("issueId"));
  expectedVersion(c.req.raw, issue.version);
  const [attachment] = issue.attachmentId ? await getDatabase().select().from(attachments).where(eq(attachments.id, issue.attachmentId)).limit(1) : [];
  const [deleted] = await getDatabase().delete(issues).where(and(eq(issues.id, issue.id), eq(issues.version, issue.version))).returning({ id: issues.id });
  if (!deleted) throw new ApiError("version_conflict", "The issue changed; reload it and try again", 412);
  if (attachment && process.env.BLOB_READ_WRITE_TOKEN) background(del(attachment.blobUrl));
  return new Response(null, { status: 204 });
});

app.get("/api/v1/issues/:issueId/events", async (c) => {
  const p = await principal(c.req.raw, "issues:read");
  const issue = await ownedIssue(p.userId, c.req.param("issueId"));
  const rows = await getDatabase().select().from(issueEvents).where(eq(issueEvents.issueId, issue.id)).orderBy(asc(issueEvents.createdAt));
  return data(rows);
});

async function claimById(issueId: string, p: Principal) {
  const [claimed] = await getDatabase().update(issues).set({
    status: "in_progress", claimedByTokenId: p.actorId, claimedAt: new Date(), updatedAt: new Date(), version: sql`${issues.version} + 1`
  }).where(and(eq(issues.id, issueId), eq(issues.userId, p.userId), eq(issues.status, "open"))).returning();
  if (!claimed) {
    await ownedIssue(p.userId, issueId);
    throw new ApiError("issue_already_claimed", "Issue is already being processed", 409);
  }
  await addIssueEvent(issueId, p, "issue.claimed");
  return claimed;
}

app.post("/api/v1/issues/:issueId/claim", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const requestValue = { issueId: c.req.param("issueId") };
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "claimIssue", key, requestValue);
  if (replay) return replay;
  const response = { data: await claimById(c.req.param("issueId"), p) };
  await saveIdempotentResponse(p.userId, "claimIssue", key, requestValue, 200, response);
  return Response.json(response);
});

app.post("/api/v1/issues/claim-next", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const body = await jsonBody(c.req.raw, z.object({ projectId: z.string() }));
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "claimNextIssue", key, body);
  if (replay) return replay;
  await ownedProject(p.userId, body.projectId);
  const result = await getDatabase().execute(sql`
    with candidate as (
      select id from issue
      where "userId" = ${p.userId} and "projectId" = ${body.projectId} and status = 'open'
      order by "createdAt" asc
      for update skip locked
      limit 1
    )
    update issue set
      status = 'in_progress', "claimedByTokenId" = ${p.actorId}, "claimedAt" = now(), "updatedAt" = now(), version = version + 1
    from candidate where issue.id = candidate.id
    returning issue.*
  `);
  const claimed = (result as unknown as { rows: Array<{ id: string }> }).rows?.[0] ?? (result as unknown as Array<{ id: string }>)[0];
  if (!claimed) {
    const response = { data: { issue: null } };
    await saveIdempotentResponse(p.userId, "claimNextIssue", key, body, 200, response);
    return Response.json(response);
  }
  await addIssueEvent(claimed.id, p, "issue.claimed");
  const response = { data: { issue: claimed } };
  await saveIdempotentResponse(p.userId, "claimNextIssue", key, body, 200, response);
  return Response.json(response);
});

async function stateChange(p: Principal, issueId: string, target: "open" | "done", eventType: string, summary?: string) {
  const issue = await ownedIssue(p.userId, issueId);
  if (issue.status !== "in_progress") throw new ApiError("invalid_issue_state", "Issue is not being processed", 409);
  if (p.actorType !== "user" && issue.claimedByTokenId !== p.actorId) throw new ApiError("claim_owner_mismatch", "Only the claiming token can change this issue", 403);
  const [updated] = await getDatabase().update(issues).set({
    status: target,
    claimedByTokenId: target === "open" ? null : issue.claimedByTokenId,
    claimedAt: target === "open" ? null : issue.claimedAt,
    completedAt: target === "done" ? new Date() : null,
    completionSummary: target === "done" ? summary : null,
    updatedAt: new Date(), version: issue.version + 1
  }).where(and(eq(issues.id, issue.id), eq(issues.status, "in_progress"), eq(issues.version, issue.version))).returning();
  if (!updated) throw new ApiError("issue_state_conflict", "The issue state changed; reload it and try again", 409);
  await addIssueEvent(issue.id, p, eventType, summary ? { summary } : {});
  return updated;
}

app.post("/api/v1/issues/:issueId/release", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const body = await jsonBody(c.req.raw, z.object({ reason: z.string().max(2_000).optional() }));
  const requestValue = { issueId: c.req.param("issueId"), ...body };
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "releaseIssue", key, requestValue);
  if (replay) return replay;
  const response = { data: await stateChange(p, c.req.param("issueId"), "open", "issue.released", body.reason) };
  await saveIdempotentResponse(p.userId, "releaseIssue", key, requestValue, 200, response);
  return Response.json(response);
});

app.post("/api/v1/issues/:issueId/complete", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const body = await jsonBody(c.req.raw, z.object({ summary: z.string().trim().min(1).max(10_000) }));
  const requestValue = { issueId: c.req.param("issueId"), ...body };
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "completeIssue", key, requestValue);
  if (replay) return replay;
  const response = { data: await stateChange(p, c.req.param("issueId"), "done", "issue.completed", body.summary) };
  await saveIdempotentResponse(p.userId, "completeIssue", key, requestValue, 200, response);
  return Response.json(response);
});

app.post("/api/v1/issues/:issueId/reopen", async (c) => {
  const p = await principal(c.req.raw, "issues:write");
  const issue = await ownedIssue(p.userId, c.req.param("issueId"));
  const requestValue = { issueId: issue.id };
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "reopenIssue", key, requestValue);
  if (replay) return replay;
  if (issue.status !== "done") throw new ApiError("invalid_issue_state", "Only completed issues can be reopened", 409);
  const [updated] = await getDatabase().update(issues).set({ status: "open", claimedByTokenId: null, claimedAt: null, completedAt: null, completionSummary: null, updatedAt: new Date(), version: issue.version + 1 }).where(and(eq(issues.id, issue.id), eq(issues.status, "done"), eq(issues.version, issue.version))).returning();
  if (!updated) throw new ApiError("issue_state_conflict", "The issue state changed; reload it and try again", 409);
  await addIssueEvent(issue.id, p, "issue.reopened");
  const response = { data: updated };
  await saveIdempotentResponse(p.userId, "reopenIssue", key, requestValue, 200, response);
  return Response.json(response);
});

app.post("/api/v1/attachments", async (c) => {
  const p = await principal(c.req.raw, "attachments:write");
  const body = await jsonBody(c.req.raw, z.object({ fileName: z.string().max(200), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), base64: z.string() }));
  const key = c.req.header("idempotency-key") ?? null;
  const replay = await findIdempotentResponse(p.userId, "createAttachment", key, body);
  if (replay) return replay;
  const bytes = Buffer.from(body.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (bytes.byteLength > 2 * 1024 * 1024) throw new ApiError("attachment_too_large", "Screenshot exceeds the 2 MiB limit", 413);
  const id = createId("att");
  const pathname = `screenshots/${p.userId}/${id}/${body.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const blob = process.env.BLOB_READ_WRITE_TOKEN
    ? await put(pathname, bytes, { access: "private", contentType: body.contentType, addRandomSuffix: false })
    : { url: `data:${body.contentType};base64,${bytes.toString("base64")}`, pathname };
  await getDatabase().insert(attachments).values({ id, userId: p.userId, blobUrl: blob.url, pathname, fileName: body.fileName, contentType: body.contentType, byteSize: bytes.byteLength });
  const response = { data: { id, fileName: body.fileName, contentType: body.contentType, byteSize: bytes.byteLength } };
  await saveIdempotentResponse(p.userId, "createAttachment", key, body, 201, response);
  return Response.json(response, { status: 201 });
});

app.get("/api/v1/attachments/:attachmentId", async (c) => {
  const p = await principal(c.req.raw, "issues:read");
  const [attachment] = await getDatabase().select().from(attachments).where(and(eq(attachments.id, c.req.param("attachmentId")), eq(attachments.userId, p.userId))).limit(1);
  if (!attachment) throw new ApiError("attachment_not_found", "Attachment was not found", 404);
  if (attachment.blobUrl.startsWith("data:")) {
    const base64 = attachment.blobUrl.slice(attachment.blobUrl.indexOf(",") + 1);
    return new Response(Buffer.from(base64, "base64"), { headers: { "content-type": attachment.contentType, "cache-control": "private, max-age=300" } });
  }
  const response = await fetch(attachment.blobUrl, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
  if (!response.ok) throw new ApiError("attachment_unavailable", "Attachment storage is unavailable", 503);
  return new Response(response.body, { headers: { "content-type": attachment.contentType, "cache-control": "private, max-age=300" } });
});

app.get("/api/v1/tokens", async (c) => {
  const p = await principal(c.req.raw, "*");
  if (p.actorType !== "user") throw new ApiError("user_session_required", "A website session is required", 403);
  const rows = await getDatabase().select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, scopes: apiTokens.scopes, lastUsedAt: apiTokens.lastUsedAt, expiresAt: apiTokens.expiresAt, createdAt: apiTokens.createdAt }).from(apiTokens).where(and(eq(apiTokens.userId, p.userId), isNull(apiTokens.revokedAt))).orderBy(desc(apiTokens.createdAt));
  return data(rows);
});

app.post("/api/v1/tokens", async (c) => {
  const p = await principal(c.req.raw, "*");
  if (p.actorType !== "user") throw new ApiError("user_session_required", "A website session is required", 403);
  const body = await jsonBody(c.req.raw, z.object({ name: z.string().trim().min(1).max(100), expiresAt: z.string().datetime().optional() }));
  const token = createSecret("ph_pat");
  const id = createId("pat");
  const scopes = ["projects:read", "issues:read", "issues:write"];
  await getDatabase().insert(apiTokens).values({ id, userId: p.userId, name: body.name, prefix: token.slice(0, 16), digest: digestSecret(token), scopes, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null });
  return data({ id, name: body.name, token, prefix: token.slice(0, 16), scopes }, 201);
});

app.delete("/api/v1/tokens/:tokenId", async (c) => {
  const p = await principal(c.req.raw, "*");
  if (p.actorType !== "user") throw new ApiError("user_session_required", "A website session is required", 403);
  await getDatabase().update(apiTokens).set({ revokedAt: new Date() }).where(and(eq(apiTokens.id, c.req.param("tokenId")), eq(apiTokens.userId, p.userId)));
  return new Response(null, { status: 204 });
});

app.get("/api/v1/webhooks", async (c) => {
  const p = await principal(c.req.raw, "*");
  const rows = await getDatabase().select({ id: webhooks.id, projectId: webhooks.projectId, name: webhooks.name, url: webhooks.url, enabled: webhooks.enabled, createdAt: webhooks.createdAt, updatedAt: webhooks.updatedAt, version: webhooks.version }).from(webhooks).where(eq(webhooks.userId, p.userId)).orderBy(desc(webhooks.createdAt));
  return data(rows);
});

app.post("/api/v1/webhooks", async (c) => {
  const p = await principal(c.req.raw, "*");
  const body = await jsonBody(c.req.raw, z.object({ name: z.string().trim().min(1).max(100), url: z.string().url(), projectId: z.string().optional() }));
  try { await assertPublicWebhookUrl(body.url); } catch (error) { throw new ApiError("invalid_webhook_url", error instanceof Error ? error.message : "Invalid webhook URL", 422); }
  if (body.projectId) await ownedProject(p.userId, body.projectId);
  const id = createId("whk");
  const generated = newWebhookSecret();
  const [hook] = await getDatabase().insert(webhooks).values({ id, userId: p.userId, projectId: body.projectId, name: body.name, url: body.url, secretDigest: generated.digest, secretEncrypted: generated.encrypted }).returning();
  return data({ ...hook, secretDigest: undefined, secretEncrypted: undefined, secret: generated.secret }, 201);
});

async function ownedWebhook(userId: string, webhookId: string) {
  const [hook] = await getDatabase().select().from(webhooks).where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId))).limit(1);
  if (!hook) throw new ApiError("webhook_not_found", "Webhook was not found", 404);
  return hook;
}

app.patch("/api/v1/webhooks/:webhookId", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  const body = await jsonBody(c.req.raw, z.object({ name: z.string().trim().min(1).max(100), url: z.string().url(), enabled: z.boolean() }).partial());
  const key = c.req.header("idempotency-key") ?? null;
  const requestValue = { webhookId: hook.id, ifMatch: c.req.header("if-match"), ...body };
  const replay = await findIdempotentResponse(p.userId, "updateWebhook", key, requestValue);
  if (replay) return replay;
  expectedVersion(c.req.raw, hook.version);
  if (body.url) try { await assertPublicWebhookUrl(body.url); } catch (error) { throw new ApiError("invalid_webhook_url", error instanceof Error ? error.message : "Invalid webhook URL", 422); }
  const [updated] = await getDatabase().update(webhooks).set({ ...body, version: hook.version + 1, updatedAt: new Date() }).where(and(eq(webhooks.id, hook.id), eq(webhooks.version, hook.version))).returning();
  if (!updated) throw new ApiError("version_conflict", "The webhook changed; reload it and try again", 412);
  const response = { data: { ...updated, secretDigest: undefined, secretEncrypted: undefined } };
  await saveIdempotentResponse(p.userId, "updateWebhook", key, requestValue, 200, response);
  return Response.json(response);
});

app.delete("/api/v1/webhooks/:webhookId", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  expectedVersion(c.req.raw, hook.version);
  const [deleted] = await getDatabase().delete(webhooks).where(and(eq(webhooks.id, hook.id), eq(webhooks.version, hook.version))).returning({ id: webhooks.id });
  if (!deleted) throw new ApiError("version_conflict", "The webhook changed; reload it and try again", 412);
  return new Response(null, { status: 204 });
});

app.post("/api/v1/webhooks/:webhookId/rotate-secret", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  const generated = newWebhookSecret();
  await getDatabase().update(webhooks).set({ secretDigest: generated.digest, secretEncrypted: generated.encrypted, updatedAt: new Date(), version: hook.version + 1 }).where(eq(webhooks.id, hook.id));
  return data({ secret: generated.secret });
});

app.post("/api/v1/webhooks/:webhookId/test", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  const id = createId("whd");
  await getDatabase().insert(webhookDeliveries).values({ id, webhookId: hook.id, eventId: createId("whe"), eventType: "issue.created", payload: { eventId: "test", projectId: hook.projectId, issueId: "iss_test", createdAt: new Date().toISOString(), prompt: "Pinhere webhook test" }, nextAttemptAt: new Date() });
  await deliverWebhook(id);
  return data({ deliveryId: id }, 202);
});

app.get("/api/v1/webhooks/:webhookId/deliveries", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  const rows = await getDatabase().select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookId, hook.id)).orderBy(desc(webhookDeliveries.createdAt)).limit(100);
  return data(rows);
});

app.post("/api/v1/webhooks/:webhookId/deliveries/:deliveryId/retry", async (c) => {
  const p = await principal(c.req.raw, "*");
  const hook = await ownedWebhook(p.userId, c.req.param("webhookId"));
  const [delivery] = await getDatabase().select().from(webhookDeliveries).where(and(eq(webhookDeliveries.id, c.req.param("deliveryId")), eq(webhookDeliveries.webhookId, hook.id))).limit(1);
  if (!delivery) throw new ApiError("delivery_not_found", "Delivery was not found", 404);
  await getDatabase().update(webhookDeliveries).set({ status: "pending", nextAttemptAt: new Date(), updatedAt: new Date() }).where(eq(webhookDeliveries.id, delivery.id));
  background(deliverWebhook(delivery.id));
  return data({ deliveryId: delivery.id }, 202);
});

app.post("/api/v1/oauth/extension/authorize", async (c) => {
  const p = await principal(c.req.raw, "*");
  if (p.actorType !== "user") throw new ApiError("user_session_required", "A website session is required", 403);
  const body = await jsonBody(c.req.raw, z.object({ redirectUri: z.string().url(), codeChallenge: z.string().min(43).max(128) }));
  const redirectUri = parseExtensionRedirectUri(body.redirectUri);
  if (!redirectUri) throw new ApiError("invalid_redirect_uri", "Only Chrome extension callback URLs are allowed", 422);
  return data({ redirectUrl: await issueExtensionAuthorizationCode(p.userId, redirectUri, body.codeChallenge) });
});

app.post("/api/v1/oauth/token", async (c) => {
  const body = await jsonBody(c.req.raw, z.discriminatedUnion("grantType", [
    z.object({ grantType: z.literal("authorization_code"), code: z.string(), redirectUri: z.string().url(), codeVerifier: z.string().min(43).max(128) }),
    z.object({ grantType: z.literal("refresh_token"), refreshToken: z.string() })
  ]));
  const db = getDatabase();
  let userId: string;
  let oldTokenId: string | undefined;
  if (body.grantType === "authorization_code") {
    const digest = digestSecret(body.code);
    const [grant] = await db.select().from(extensionCodes).where(and(eq(extensionCodes.codeDigest, digest), isNull(extensionCodes.usedAt), gt(extensionCodes.expiresAt, new Date()))).limit(1);
    const challenge = createHash("sha256").update(body.codeVerifier).digest("base64url");
    if (!grant || grant.redirectUri !== body.redirectUri || grant.codeChallenge !== challenge) throw new ApiError("invalid_grant", "Authorization code or PKCE verifier is invalid", 401);
    const [consumed] = await db.update(extensionCodes).set({ usedAt: new Date() }).where(and(eq(extensionCodes.codeDigest, digest), isNull(extensionCodes.usedAt), gt(extensionCodes.expiresAt, new Date()))).returning({ codeDigest: extensionCodes.codeDigest });
    if (!consumed) throw new ApiError("invalid_grant", "Authorization code was already used", 401);
    userId = grant.userId;
  } else {
    const [record] = await db.select().from(extensionTokens).where(and(eq(extensionTokens.refreshDigest, digestSecret(body.refreshToken)), isNull(extensionTokens.revokedAt), gt(extensionTokens.refreshExpiresAt, new Date()))).limit(1);
    if (!record) throw new ApiError("invalid_grant", "Refresh token is invalid or expired", 401);
    userId = record.userId;
    oldTokenId = record.id;
  }
  const accessToken = createSecret("ph_ext");
  const refreshToken = createSecret("ph_rft");
  const tokenId = createId("ext");
  const accessExpiresAt = new Date(Date.now() + 15 * 60_000);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 3_600_000);
  await db.transaction(async (tx) => {
    if (oldTokenId) {
      const [rotated] = await tx.update(extensionTokens).set({ revokedAt: new Date(), rotatedAt: new Date() }).where(and(eq(extensionTokens.id, oldTokenId), isNull(extensionTokens.revokedAt))).returning({ id: extensionTokens.id });
      if (!rotated) throw new ApiError("invalid_grant", "Refresh token was already rotated", 401);
    }
    await tx.insert(extensionTokens).values({ id: tokenId, userId, accessDigest: digestSecret(accessToken), refreshDigest: digestSecret(refreshToken), scopes: ["projects:read", "issues:create", "attachments:write"], accessExpiresAt, refreshExpiresAt });
  });
  return data({ accessToken, refreshToken, expiresIn: 900, tokenType: "Bearer", scopes: ["projects:read", "issues:create", "attachments:write"] });
});

export { app as pinhereApi };
