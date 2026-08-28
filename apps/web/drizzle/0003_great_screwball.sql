CREATE TYPE "public"."issue_readable_id_status" AS ENUM('pending', 'generated', 'fallback');--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "readableId" text;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "readableIdStatus" "issue_readable_id_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE "issue" SET "readableIdStatus" = 'fallback';--> statement-breakpoint
CREATE UNIQUE INDEX "issue_user_readable_id_unique" ON "issue" USING btree ("userId","readableId");
