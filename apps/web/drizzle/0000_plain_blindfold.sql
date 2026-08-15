CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."issue_source" AS ENUM('extension', 'web', 'api');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"digest" text NOT NULL,
	"scopes" text[] NOT NULL,
	"lastUsedAt" timestamp with time zone,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"revokedAt" timestamp with time zone,
	CONSTRAINT "api_token_digest_unique" UNIQUE("digest")
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"issueId" text,
	"blobUrl" text NOT NULL,
	"pathname" text NOT NULL,
	"fileName" text NOT NULL,
	"contentType" text NOT NULL,
	"byteSize" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_code" (
	"codeDigest" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"redirectUri" text NOT NULL,
	"codeChallenge" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "extension_token" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accessDigest" text NOT NULL,
	"refreshDigest" text NOT NULL,
	"scopes" text[] NOT NULL,
	"accessExpiresAt" timestamp with time zone NOT NULL,
	"refreshExpiresAt" timestamp with time zone NOT NULL,
	"rotatedAt" timestamp with time zone,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extension_token_accessDigest_unique" UNIQUE("accessDigest"),
	CONSTRAINT "extension_token_refreshDigest_unique" UNIQUE("refreshDigest")
);
--> statement-breakpoint
CREATE TABLE "idempotency_record" (
	"userId" text NOT NULL,
	"key" text NOT NULL,
	"operationId" text NOT NULL,
	"requestHash" text NOT NULL,
	"status" integer NOT NULL,
	"response" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_record_userId_key_operationId_pk" PRIMARY KEY("userId","key","operationId")
);
--> statement-breakpoint
CREATE TABLE "issue_event" (
	"id" text PRIMARY KEY NOT NULL,
	"issueId" text NOT NULL,
	"userId" text NOT NULL,
	"actorType" text NOT NULL,
	"actorId" text,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"pageUrl" text NOT NULL,
	"dom" jsonb NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"source" "issue_source" DEFAULT 'extension' NOT NULL,
	"attachmentId" text,
	"claimedByTokenId" text,
	"claimedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"completionSummary" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_event" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"aggregateId" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"processedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_origin" (
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"origin" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_origin_projectId_origin_pk" PRIMARY KEY("projectId","origin")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"webhookId" text NOT NULL,
	"eventId" text NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" timestamp with time zone DEFAULT now() NOT NULL,
	"responseStatus" integer,
	"responseBody" text,
	"lastError" text,
	"deliveredAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secretDigest" text NOT NULL,
	"secretEncrypted" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_issueId_issue_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_code" ADD CONSTRAINT "extension_code_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_token" ADD CONSTRAINT "extension_token_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_event" ADD CONSTRAINT "issue_event_issueId_issue_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_origin" ADD CONSTRAINT "project_origin_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_origin" ADD CONSTRAINT "project_origin_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_webhookId_webhook_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."webhook"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_token_user_idx" ON "api_token" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "attachment_user_idx" ON "attachment" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "extension_token_user_idx" ON "extension_token" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "issue_event_issue_idx" ON "issue_event" USING btree ("issueId","createdAt");--> statement-breakpoint
CREATE INDEX "issue_project_status_created_idx" ON "issue" USING btree ("projectId","status","createdAt");--> statement-breakpoint
CREATE INDEX "issue_user_updated_idx" ON "issue" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox_event" USING btree ("processedAt","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "project_origin_user_unique" ON "project_origin" USING btree ("userId","origin");--> statement-breakpoint
CREATE INDEX "project_user_idx" ON "project" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_delivery_event_unique" ON "webhook_delivery" USING btree ("webhookId","eventId");--> statement-breakpoint
CREATE INDEX "webhook_delivery_retry_idx" ON "webhook_delivery" USING btree ("status","nextAttemptAt");--> statement-breakpoint
CREATE INDEX "webhook_user_idx" ON "webhook" USING btree ("userId");