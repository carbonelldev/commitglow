CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "organizations" (
 	"id" text PRIMARY KEY NOT NULL,
 	"name" text NOT NULL,
 	"slug" text NOT NULL,
 	"owner_id" text NOT NULL,
 	"plan" "plan" DEFAULT 'free' NOT NULL,
 	"stripe_customer_id" text,
 	"is_personal" boolean DEFAULT false NOT NULL,
 	"created_at" timestamp DEFAULT now() NOT NULL,
 	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" "organization_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "usage_events" ADD COLUMN "organization_id" text;--> statement-breakpoint
INSERT INTO "organizations" ("id", "name", "slug", "owner_id", "plan", "is_personal", "created_at", "updated_at")
SELECT
  'org_' || md5("id"),
  COALESCE(NULLIF("name", ''), split_part("email", '@', 1), 'Personal') || '''s workspace',
  'workspace-' || substr(md5("id"), 1, 12),
  "id",
  COALESCE("plan", 'free'),
  true,
  now(),
  now()
FROM "user"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "organization_members" ("id", "user_id", "organization_id", "role", "created_at", "updated_at")
SELECT
  'mem_' || md5("id"),
  "id",
  'org_' || md5("id"),
  'owner',
  now(),
  now()
FROM "user"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "projects" SET "organization_id" = 'org_' || md5("user_id") WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "usage_events" SET "organization_id" = 'org_' || md5("user_id") WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_unique_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_owner_id_idx" ON "organizations" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_organization_id_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_events_organization_id_idx" ON "usage_events" USING btree ("organization_id");
