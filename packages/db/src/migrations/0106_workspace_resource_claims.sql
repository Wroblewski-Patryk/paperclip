CREATE TABLE "workspace_resource_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"execution_workspace_id" uuid NOT NULL,
	"resource_key" text NOT NULL,
	"heartbeat_run_id" uuid NOT NULL,
	"issue_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_resource_claims" ADD CONSTRAINT "workspace_resource_claims_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "workspace_resource_claims" ADD CONSTRAINT "workspace_resource_claims_execution_workspace_id_execution_workspaces_id_fk" FOREIGN KEY ("execution_workspace_id") REFERENCES "public"."execution_workspaces"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "workspace_resource_claims" ADD CONSTRAINT "workspace_resource_claims_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "workspace_resource_claims" ADD CONSTRAINT "workspace_resource_claims_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null;
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_resource_claims_active_resource_uq" ON "workspace_resource_claims" USING btree ("company_id","execution_workspace_id","resource_key") WHERE "workspace_resource_claims"."status" = 'active';
--> statement-breakpoint
CREATE INDEX "workspace_resource_claims_heartbeat_run_idx" ON "workspace_resource_claims" USING btree ("heartbeat_run_id");
