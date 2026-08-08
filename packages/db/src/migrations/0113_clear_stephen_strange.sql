CREATE TABLE "delegation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"from_agent_id" uuid NOT NULL,
	"to_parent_agent_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delegation_reports_kind_check" CHECK ("delegation_reports"."kind" in ('result', 'evidence', 'status', 'blocker', 'risk', 'budget', 'review', 'outcome'))
);
--> statement-breakpoint
CREATE TABLE "work_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"source_issue_id" uuid NOT NULL,
	"proposed_by_agent_id" uuid NOT NULL,
	"target_parent_agent_id" uuid NOT NULL,
	"title" text NOT NULL,
	"problem_statement" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"scope_contract" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_proposals_status_check" CHECK ("work_proposals"."status" in ('submitted', 'acknowledged', 'converted', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "delegation_reports" ADD CONSTRAINT "delegation_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_reports" ADD CONSTRAINT "delegation_reports_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_reports" ADD CONSTRAINT "delegation_reports_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_reports" ADD CONSTRAINT "delegation_reports_to_parent_agent_id_agents_id_fk" FOREIGN KEY ("to_parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_proposed_by_agent_id_agents_id_fk" FOREIGN KEY ("proposed_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_target_parent_agent_id_agents_id_fk" FOREIGN KEY ("target_parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delegation_reports_company_key_unique" ON "delegation_reports" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "delegation_reports_parent_created_idx" ON "delegation_reports" USING btree ("to_parent_agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_proposals_company_key_unique" ON "work_proposals" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "work_proposals_target_status_idx" ON "work_proposals" USING btree ("target_parent_agent_id","status");