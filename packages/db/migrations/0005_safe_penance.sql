CREATE TABLE "demo_generation_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"provider" "provider" DEFAULT 'github' NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"branch" text NOT NULL,
	"commit_fingerprint" text NOT NULL,
	"commit_count" integer NOT NULL,
	"model" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "demo_generation_cache_repo_idx" ON "demo_generation_cache" USING btree ("provider","owner","name","branch");--> statement-breakpoint
CREATE INDEX "demo_generation_cache_updated_at_idx" ON "demo_generation_cache" USING btree ("updated_at");