ALTER TABLE "integrations" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "provider_account_name" text;--> statement-breakpoint
ALTER TABLE "repo_connections" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "repo_connections" ADD COLUMN "provider_account_name" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_connections" ADD CONSTRAINT "repo_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integrations_organization_id_idx" ON "integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repo_connections_organization_id_idx" ON "repo_connections" USING btree ("organization_id");