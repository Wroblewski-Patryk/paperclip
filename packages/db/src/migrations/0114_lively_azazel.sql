CREATE TABLE "native_safeguards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"title" text NOT NULL,
	"target" text NOT NULL,
	"implementation_ref" text,
	"regression_test_ref" text,
	"removal_condition" text,
	"owner_agent_id" uuid,
	"root_cause_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"source_kind" text NOT NULL,
	"external_cycle_id" text NOT NULL,
	"trigger_kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"budget" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_evidence_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"root_cause_id" uuid,
	"intervention_id" uuid,
	"cycle_id" uuid,
	"native_safeguard_id" uuid,
	"observation_window_id" uuid,
	"source_kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"label" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"fingerprint" text NOT NULL,
	"problem_class" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"classification" text DEFAULT 'unclassified' NOT NULL,
	"source_kind" text NOT NULL,
	"source_ref" text,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"affected_component" text,
	"project_id" uuid,
	"issue_id" uuid,
	"delivery_id" uuid,
	"delivery_task_id" uuid,
	"affected_agent_id" uuid,
	"owner_agent_id" uuid,
	"owner_user_id" text,
	"admission_decision_id" uuid,
	"root_cause_id" uuid,
	"native_safeguard_id" uuid,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"recurrence_count" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"economics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recovery_state" text DEFAULT 'healthy' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cooldown_until" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"retained_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"finding_id" uuid NOT NULL,
	"root_cause_id" uuid,
	"cycle_id" uuid,
	"admission_decision_id" uuid,
	"issue_id" uuid,
	"delivery_id" uuid,
	"owner_agent_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"change_summary" text NOT NULL,
	"expected_effect" text NOT NULL,
	"rollback_plan" text NOT NULL,
	"budget" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_observation_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"intervention_id" uuid,
	"native_safeguard_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"expected_effect" text NOT NULL,
	"success_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"measurements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conclusion" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"root_cause_id" uuid,
	"cycle_id" uuid,
	"run_id" uuid,
	"issue_id" uuid,
	"fingerprint" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_root_causes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"fingerprint" text NOT NULL,
	"problem_class" text NOT NULL,
	"status" text DEFAULT 'hypothesis' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"hypothesis" text,
	"resolution" text,
	"owner_agent_id" uuid,
	"owner_user_id" text,
	"project_id" uuid,
	"issue_id" uuid,
	"confirmed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"retained_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "native_safeguards" ADD CONSTRAINT "native_safeguards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "native_safeguards" ADD CONSTRAINT "native_safeguards_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "native_safeguards" ADD CONSTRAINT "native_safeguards_root_cause_id_supervision_root_causes_id_fk" FOREIGN KEY ("root_cause_id") REFERENCES "public"."supervision_root_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_cycles" ADD CONSTRAINT "supervision_cycles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_finding_id_supervision_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."supervision_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_root_cause_id_supervision_root_causes_id_fk" FOREIGN KEY ("root_cause_id") REFERENCES "public"."supervision_root_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_intervention_id_supervision_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."supervision_interventions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_cycle_id_supervision_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."supervision_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_native_safeguard_id_native_safeguards_id_fk" FOREIGN KEY ("native_safeguard_id") REFERENCES "public"."native_safeguards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_evidence_refs" ADD CONSTRAINT "supervision_evidence_refs_observation_window_id_supervision_observation_windows_id_fk" FOREIGN KEY ("observation_window_id") REFERENCES "public"."supervision_observation_windows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_delivery_task_id_delivery_tasks_id_fk" FOREIGN KEY ("delivery_task_id") REFERENCES "public"."delivery_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_affected_agent_id_agents_id_fk" FOREIGN KEY ("affected_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_admission_decision_id_admission_decisions_id_fk" FOREIGN KEY ("admission_decision_id") REFERENCES "public"."admission_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_root_cause_id_supervision_root_causes_id_fk" FOREIGN KEY ("root_cause_id") REFERENCES "public"."supervision_root_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD CONSTRAINT "supervision_findings_native_safeguard_id_native_safeguards_id_fk" FOREIGN KEY ("native_safeguard_id") REFERENCES "public"."native_safeguards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_finding_id_supervision_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."supervision_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_root_cause_id_supervision_root_causes_id_fk" FOREIGN KEY ("root_cause_id") REFERENCES "public"."supervision_root_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_cycle_id_supervision_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."supervision_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_admission_decision_id_admission_decisions_id_fk" FOREIGN KEY ("admission_decision_id") REFERENCES "public"."admission_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_interventions" ADD CONSTRAINT "supervision_interventions_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_observation_windows" ADD CONSTRAINT "supervision_observation_windows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_observation_windows" ADD CONSTRAINT "supervision_observation_windows_finding_id_supervision_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."supervision_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_observation_windows" ADD CONSTRAINT "supervision_observation_windows_intervention_id_supervision_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."supervision_interventions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_observation_windows" ADD CONSTRAINT "supervision_observation_windows_native_safeguard_id_native_safeguards_id_fk" FOREIGN KEY ("native_safeguard_id") REFERENCES "public"."native_safeguards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_finding_id_supervision_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."supervision_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_root_cause_id_supervision_root_causes_id_fk" FOREIGN KEY ("root_cause_id") REFERENCES "public"."supervision_root_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_cycle_id_supervision_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."supervision_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_recurrences" ADD CONSTRAINT "supervision_recurrences_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_root_causes" ADD CONSTRAINT "supervision_root_causes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_root_causes" ADD CONSTRAINT "supervision_root_causes_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_root_causes" ADD CONSTRAINT "supervision_root_causes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_root_causes" ADD CONSTRAINT "supervision_root_causes_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "native_safeguards_company_key_uq" ON "native_safeguards" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "native_safeguards_company_status_idx" ON "native_safeguards" USING btree ("company_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "native_safeguards_root_cause_idx" ON "native_safeguards" USING btree ("root_cause_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supervision_cycles_company_external_uq" ON "supervision_cycles" USING btree ("company_id","source_kind","external_cycle_id");--> statement-breakpoint
CREATE INDEX "supervision_cycles_company_status_idx" ON "supervision_cycles" USING btree ("company_id","status","started_at");--> statement-breakpoint
CREATE INDEX "supervision_evidence_refs_finding_idx" ON "supervision_evidence_refs" USING btree ("finding_id","created_at");--> statement-breakpoint
CREATE INDEX "supervision_evidence_refs_company_source_idx" ON "supervision_evidence_refs" USING btree ("company_id","source_kind","source_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "supervision_findings_company_fingerprint_uq" ON "supervision_findings" USING btree ("company_id","fingerprint");--> statement-breakpoint
CREATE INDEX "supervision_findings_company_status_idx" ON "supervision_findings" USING btree ("company_id","status","severity","updated_at");--> statement-breakpoint
CREATE INDEX "supervision_findings_owner_idx" ON "supervision_findings" USING btree ("owner_agent_id","status");--> statement-breakpoint
CREATE INDEX "supervision_findings_project_idx" ON "supervision_findings" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "supervision_findings_root_cause_idx" ON "supervision_findings" USING btree ("root_cause_id","status");--> statement-breakpoint
CREATE INDEX "supervision_findings_delivery_idx" ON "supervision_findings" USING btree ("delivery_id","status");--> statement-breakpoint
CREATE INDEX "supervision_interventions_finding_status_idx" ON "supervision_interventions" USING btree ("finding_id","status","created_at");--> statement-breakpoint
CREATE INDEX "supervision_interventions_company_status_idx" ON "supervision_interventions" USING btree ("company_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "supervision_observation_windows_company_status_idx" ON "supervision_observation_windows" USING btree ("company_id","status","ends_at");--> statement-breakpoint
CREATE INDEX "supervision_observation_windows_finding_idx" ON "supervision_observation_windows" USING btree ("finding_id","status");--> statement-breakpoint
CREATE INDEX "supervision_recurrences_finding_occurred_idx" ON "supervision_recurrences" USING btree ("finding_id","occurred_at");--> statement-breakpoint
CREATE INDEX "supervision_recurrences_company_fingerprint_idx" ON "supervision_recurrences" USING btree ("company_id","fingerprint","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "supervision_root_causes_company_fingerprint_uq" ON "supervision_root_causes" USING btree ("company_id","fingerprint");--> statement-breakpoint
CREATE INDEX "supervision_root_causes_company_status_idx" ON "supervision_root_causes" USING btree ("company_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "supervision_root_causes_owner_idx" ON "supervision_root_causes" USING btree ("owner_agent_id","status");