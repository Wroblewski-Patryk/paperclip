CREATE TABLE "admission_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"issue_id" uuid,
	"agent_id" uuid,
	"admission_control_id" uuid NOT NULL,
	"control_version" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"disposition" text NOT NULL,
	"admitted" boolean DEFAULT false NOT NULL,
	"reason_code" text NOT NULL,
	"reason" text,
	"evidence_hash" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"expected_value" integer,
	"observed" jsonb,
	"limits" jsonb,
	"cooldown_until" timestamp with time zone,
	"observation_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_decisions_disposition_check" CHECK ("admission_decisions"."disposition" in ('admitted', 'deferred_by_maintenance', 'needs_decision', 'waiting_for_signal', 'paused_by_budget', 'rejected_as_duplicate', 'accepted_risk', 'not_worth_doing')),
	CONSTRAINT "admission_decisions_retry_count_check" CHECK ("admission_decisions"."retry_count" >= 0),
	CONSTRAINT "admission_decisions_control_version_check" CHECK ("admission_decisions"."control_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "admission_controls" ADD COLUMN "policy" jsonb;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_admission_control_id_admission_controls_id_fk" FOREIGN KEY ("admission_control_id") REFERENCES "public"."admission_controls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_decisions_company_created_idx" ON "admission_decisions" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "admission_decisions_fingerprint_created_idx" ON "admission_decisions" USING btree ("company_id","fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "admission_decisions_issue_created_idx" ON "admission_decisions" USING btree ("issue_id","created_at");