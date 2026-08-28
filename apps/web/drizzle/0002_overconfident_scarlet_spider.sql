CREATE TYPE "public"."agent_harness" AS ENUM('codex');--> statement-breakpoint
CREATE TYPE "public"."agent_pairing_status" AS ENUM('pending', 'approved', 'used');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "agent_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenId" text NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"harness" "agent_harness" DEFAULT 'codex' NOT NULL,
	"version" text,
	"lastSeenAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_instance_tokenId_unique" UNIQUE("tokenId")
);
--> statement-breakpoint
CREATE TABLE "agent_pairing" (
	"id" text PRIMARY KEY NOT NULL,
	"deviceCodeDigest" text NOT NULL,
	"userCodeDigest" text NOT NULL,
	"userCodeDisplay" text NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"harness" "agent_harness" DEFAULT 'codex' NOT NULL,
	"status" "agent_pairing_status" DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"approvedAt" timestamp with time zone,
	"usedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_pairing_deviceCodeDigest_unique" UNIQUE("deviceCodeDigest"),
	CONSTRAINT "agent_pairing_userCodeDigest_unique" UNIQUE("userCodeDigest")
);
--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"issueId" text NOT NULL,
	"agentInstanceId" text NOT NULL,
	"harness" "agent_harness" DEFAULT 'codex' NOT NULL,
	"externalThreadId" text,
	"status" "agent_run_status" DEFAULT 'queued' NOT NULL,
	"summary" text,
	"error" text,
	"startedAt" timestamp with time zone,
	"finishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "claimExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_instance" ADD CONSTRAINT "agent_instance_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_instance" ADD CONSTRAINT "agent_instance_tokenId_api_token_id_fk" FOREIGN KEY ("tokenId") REFERENCES "public"."api_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_pairing" ADD CONSTRAINT "agent_pairing_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_issueId_issue_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_agentInstanceId_agent_instance_id_fk" FOREIGN KEY ("agentInstanceId") REFERENCES "public"."agent_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_instance_user_idx" ON "agent_instance" USING btree ("userId","lastSeenAt");--> statement-breakpoint
CREATE INDEX "agent_pairing_expiry_idx" ON "agent_pairing" USING btree ("status","expiresAt");--> statement-breakpoint
CREATE INDEX "agent_run_issue_idx" ON "agent_run" USING btree ("issueId","createdAt");--> statement-breakpoint
CREATE INDEX "agent_run_instance_status_idx" ON "agent_run" USING btree ("agentInstanceId","status","createdAt");