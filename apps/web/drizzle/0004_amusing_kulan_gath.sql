CREATE TABLE "issue_identifier_alias" (
	"userId" text NOT NULL,
	"identifier" text NOT NULL,
	"issueId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_identifier_alias_userId_identifier_pk" PRIMARY KEY("userId","identifier")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "identifier" text;--> statement-breakpoint
WITH normalized AS (
	SELECT
		id,
		"userId",
		trim(both '-' from left(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), 32)) AS base
	FROM "project"
), ranked AS (
	SELECT
		id,
		base,
		row_number() OVER (PARTITION BY "userId", base ORDER BY id) AS position
	FROM normalized
)
UPDATE "project" AS project
SET identifier = CASE
	WHEN length(ranked.base) < 3 THEN 'project-' || right(regexp_replace(lower(project.id), '[^a-z0-9]+', '', 'g'), 8)
	WHEN ranked.position = 1 THEN ranked.base
	ELSE trim(both '-' from left(ranked.base, 23)) || '-' || right(regexp_replace(lower(project.id), '[^a-z0-9]+', '', 'g'), 8)
END
FROM ranked
WHERE project.id = ranked.id;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "identifier" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_identifier_alias" ADD CONSTRAINT "issue_identifier_alias_userId_auth_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_identifier_alias" ADD CONSTRAINT "issue_identifier_alias_issueId_issue_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_identifier_alias_issue_idx" ON "issue_identifier_alias" USING btree ("issueId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_identifier_unique" ON "project" USING btree ("userId","identifier");--> statement-breakpoint
INSERT INTO "issue_identifier_alias" ("userId", identifier, "issueId")
SELECT "userId", "readableId", id
FROM issue
WHERE "readableId" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE issue
SET
	"readableId" = project.identifier || '-pending-' || lower(regexp_replace(issue.id, '^[^_]+_', '')),
	"readableIdStatus" = 'pending'
FROM project
WHERE issue."projectId" = project.id;
