import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const authUsers = pgTable("auth_user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: now(),
  updatedAt: now()
});

export const authSessions = pgTable(
  "auth_session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: now(),
    updatedAt: now(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" })
  },
  (table) => [index("auth_session_user_idx").on(table.userId)]
);

export const authAccounts = pgTable(
  "auth_account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: now(),
    updatedAt: now()
  },
  (table) => [index("auth_account_user_idx").on(table.userId)]
);

export const authVerifications = pgTable(
  "auth_verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: now(),
    updatedAt: now()
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)]
);

export const authRateLimits = pgTable("auth_rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull()
});

export const issueStatus = pgEnum("issue_status", ["open", "in_progress", "done"]);
export const issueSource = pgEnum("issue_source", ["extension", "web", "api"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "delivered", "failed"]);

export const projects = pgTable(
  "project",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text().notNull().default(""),
    createdAt: now(),
    updatedAt: now(),
    version: integer().notNull().default(1)
  },
  (table) => [index("project_user_idx").on(table.userId, table.updatedAt)]
);

export const projectOrigins = pgTable(
  "project_origin",
  {
    projectId: text().notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    origin: text().notNull(),
    createdAt: now()
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.origin] }),
    uniqueIndex("project_origin_user_unique").on(table.userId, table.origin)
  ]
);

export type DomContext = {
  cssSelector: string;
  xpath: string;
  tagName: string;
  attributes: Record<string, string>;
  text: string;
  outerHTML: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  boundingRect: { x: number; y: number; width: number; height: number };
};

export const issues = pgTable(
  "issue",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: text().notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull(),
    pageUrl: text().notNull(),
    dom: jsonb().$type<DomContext>().notNull(),
    status: issueStatus().notNull().default("open"),
    source: issueSource().notNull().default("extension"),
    attachmentId: text(),
    claimedByTokenId: text(),
    claimedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    completionSummary: text(),
    createdAt: now(),
    updatedAt: now(),
    version: integer().notNull().default(1)
  },
  (table) => [
    index("issue_project_status_created_idx").on(table.projectId, table.status, table.createdAt),
    index("issue_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("issue_attachment_unique").on(table.attachmentId)
  ]
);

export const issueEvents = pgTable(
  "issue_event",
  {
    id: text().primaryKey(),
    issueId: text().notNull().references(() => issues.id, { onDelete: "cascade" }),
    userId: text().notNull(),
    actorType: text().notNull(),
    actorId: text(),
    type: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: now()
  },
  (table) => [index("issue_event_issue_idx").on(table.issueId, table.createdAt)]
);

export const attachments = pgTable(
  "attachment",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    issueId: text().references(() => issues.id, { onDelete: "cascade" }),
    blobUrl: text().notNull(),
    pathname: text().notNull().unique(),
    fileName: text().notNull(),
    contentType: text().notNull(),
    byteSize: integer().notNull(),
    createdAt: now()
  },
  (table) => [index("attachment_user_idx").on(table.userId)]
);

export const apiTokens = pgTable(
  "api_token",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    name: text().notNull(),
    prefix: text().notNull(),
    digest: text().notNull().unique(),
    scopes: text().array().notNull(),
    lastUsedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: now(),
    revokedAt: timestamp({ withTimezone: true })
  },
  (table) => [index("api_token_user_idx").on(table.userId, table.createdAt)]
);

export const extensionCodes = pgTable(
  "extension_code",
  {
    codeDigest: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    redirectUri: text().notNull(),
    codeChallenge: text().notNull(),
    createdAt: now(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true })
  }
);

export const extensionTokens = pgTable(
  "extension_token",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    accessDigest: text().notNull().unique(),
    refreshDigest: text().notNull().unique(),
    scopes: text().array().notNull(),
    accessExpiresAt: timestamp({ withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp({ withTimezone: true }).notNull(),
    rotatedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: now()
  },
  (table) => [index("extension_token_user_idx").on(table.userId)]
);

export const webhooks = pgTable(
  "webhook",
  {
    id: text().primaryKey(),
    userId: text().notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: text().references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    url: text().notNull(),
    secretDigest: text().notNull(),
    secretEncrypted: text().notNull(),
    enabled: boolean().notNull().default(true),
    createdAt: now(),
    updatedAt: now(),
    version: integer().notNull().default(1)
  },
  (table) => [index("webhook_user_idx").on(table.userId)]
);

export const webhookDeliveries = pgTable(
  "webhook_delivery",
  {
    id: text().primaryKey(),
    webhookId: text().notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    eventId: text().notNull(),
    eventType: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    status: deliveryStatus().notNull().default("pending"),
    attempt: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    responseStatus: integer(),
    responseBody: text(),
    lastError: text(),
    deliveredAt: timestamp({ withTimezone: true }),
    createdAt: now(),
    updatedAt: now()
  },
  (table) => [
    uniqueIndex("webhook_delivery_event_unique").on(table.webhookId, table.eventId),
    index("webhook_delivery_retry_idx").on(table.status, table.nextAttemptAt)
  ]
);

export const outboxEvents = pgTable(
  "outbox_event",
  {
    id: text().primaryKey(),
    userId: text().notNull(),
    aggregateId: text().notNull(),
    type: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    createdAt: now(),
    processedAt: timestamp({ withTimezone: true })
  },
  (table) => [index("outbox_unprocessed_idx").on(table.processedAt, table.createdAt)]
);

export const idempotencyRecords = pgTable(
  "idempotency_record",
  {
    userId: text().notNull(),
    key: text().notNull(),
    operationId: text().notNull(),
    requestHash: text().notNull(),
    status: integer().notNull(),
    response: jsonb().$type<unknown>().notNull(),
    createdAt: now(),
    expiresAt: timestamp({ withTimezone: true }).notNull()
  },
  (table) => [primaryKey({ columns: [table.userId, table.key, table.operationId] })]
);
