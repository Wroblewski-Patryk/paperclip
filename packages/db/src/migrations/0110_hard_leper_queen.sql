CREATE TABLE "assignment_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"issue_id" uuid NOT NULL,
	"proposed_assignee_agent_id" uuid NOT NULL,
	"proposed_by_agent_id" uuid,
	"proposed_by_user_id" text,
	"admission_decision_id" uuid,
	"status" text DEFAULT 'proposed' NOT NULL,
	"idempotency_key" text NOT NULL,
	"reason" text NOT NULL,
	"disposition" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_proposals_status_check" CHECK ("assignment_proposals"."status" in ('proposed', 'admitted', 'applied', 'needs_decision', 'waiting_for_signal', 'paused_by_budget', 'rejected_as_duplicate', 'not_worth_doing', 'deferred_by_maintenance', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_proposed_assignee_agent_id_agents_id_fk" FOREIGN KEY ("proposed_assignee_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_proposed_by_agent_id_agents_id_fk" FOREIGN KEY ("proposed_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_admission_decision_id_admission_decisions_id_fk" FOREIGN KEY ("admission_decision_id") REFERENCES "public"."admission_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_proposals_company_key_unique" ON "assignment_proposals" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "assignment_proposals_issue_status_idx" ON "assignment_proposals" USING btree ("issue_id","status");