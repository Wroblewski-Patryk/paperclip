CREATE TABLE "autonomy_decision_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"evaluator_source" text NOT NULL,
	"verdict" text NOT NULL,
	"alternative_issue_id" uuid,
	"rationale" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actual_outcome_quality" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_decision_evaluations_verdict_check" CHECK ("autonomy_decision_evaluations"."verdict" in ('agree','disagree','insufficient_evidence','alternative','unsafe','stale_state'))
);
--> statement-breakpoint
CREATE TABLE "autonomy_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"cycle_id" uuid,
	"constraint_id" uuid,
	"envelope_id" uuid,
	"selected_issue_id" uuid,
	"state_digest" text NOT NULL,
	"action_class" text NOT NULL,
	"mode" text NOT NULL,
	"disposition" text NOT NULL,
	"reason_code" text NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rejected_alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decision_vector" jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" text NOT NULL,
	"estimated_cost" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expected_outcome" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"evidence_fresh_until" timestamp with time zone NOT NULL,
	"invalidation_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invalidated_reason" text,
	"later_result" jsonb,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_decisions_mode_check" CHECK ("autonomy_decisions"."mode" in ('SHADOW','RECOMMEND','LIMITED_AUTO','AUTO')),
	CONSTRAINT "autonomy_decisions_status_check" CHECK ("autonomy_decisions"."status" in ('active','invalidated','dispatched','completed','failed','no_action')),
	CONSTRAINT "autonomy_decisions_confidence_check" CHECK ("autonomy_decisions"."confidence" >= 0 and "autonomy_decisions"."confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "autonomy_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"action_class" text NOT NULL,
	"stage" text DEFAULT 'SHADOW' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"budget" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"concurrency" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollback" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"graduation_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"graduation_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"downgrade_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"graduated_at" timestamp with time zone,
	"downgraded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_envelopes_stage_check" CHECK ("autonomy_envelopes"."stage" in ('SHADOW','RECOMMEND','LIMITED_AUTO','AUTO'))
);
--> statement-breakpoint
CREATE TABLE "autonomy_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"run_id" uuid,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"precondition_snapshot" jsonb NOT NULL,
	"dispatch_postcondition" jsonb,
	"execution_postcondition" jsonb,
	"outcome_verification" jsonb,
	"predicted_impact" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actual_impact" jsonb,
	"cost_coverage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accepted_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_executions_status_check" CHECK ("autonomy_executions"."status" in ('PENDING','ACCEPTED','FAILED','UNCERTAIN','RUNNING','COMPLETED','OUTCOME_VERIFIED','OUTCOME_FAILED'))
);
--> statement-breakpoint
CREATE TABLE "operational_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"affected_count" integer DEFAULT 0 NOT NULL,
	"owner_agent_id" uuid,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_issue_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposed_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flow_slo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operational_constraints_status_check" CHECK ("operational_constraints"."status" in ('active','observing','resolved','superseded'))
);
--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD CONSTRAINT "autonomy_decision_evaluations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD CONSTRAINT "autonomy_decision_evaluations_decision_id_autonomy_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."autonomy_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD CONSTRAINT "autonomy_decision_evaluations_alternative_issue_id_issues_id_fk" FOREIGN KEY ("alternative_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD CONSTRAINT "autonomy_decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD CONSTRAINT "autonomy_decisions_cycle_id_supervision_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."supervision_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD CONSTRAINT "autonomy_decisions_constraint_id_operational_constraints_id_fk" FOREIGN KEY ("constraint_id") REFERENCES "public"."operational_constraints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD CONSTRAINT "autonomy_decisions_envelope_id_autonomy_envelopes_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."autonomy_envelopes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD CONSTRAINT "autonomy_decisions_selected_issue_id_issues_id_fk" FOREIGN KEY ("selected_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_envelopes" ADD CONSTRAINT "autonomy_envelopes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_decision_id_autonomy_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."autonomy_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_constraints" ADD CONSTRAINT "operational_constraints_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_constraints" ADD CONSTRAINT "operational_constraints_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_decision_evaluations_decision_evaluator_uq" ON "autonomy_decision_evaluations" USING btree ("decision_id","evaluator_source");--> statement-breakpoint
CREATE INDEX "autonomy_decision_evaluations_company_verdict_idx" ON "autonomy_decision_evaluations" USING btree ("company_id","verdict","evaluated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_decisions_company_digest_uq" ON "autonomy_decisions" USING btree ("company_id","state_digest","mode");--> statement-breakpoint
CREATE INDEX "autonomy_decisions_company_status_idx" ON "autonomy_decisions" USING btree ("company_id","status","decided_at");--> statement-breakpoint
CREATE INDEX "autonomy_decisions_issue_idx" ON "autonomy_decisions" USING btree ("selected_issue_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_envelopes_company_key_uq" ON "autonomy_envelopes" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "autonomy_envelopes_company_stage_idx" ON "autonomy_envelopes" USING btree ("company_id","stage","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_executions_company_idempotency_uq" ON "autonomy_executions" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_executions_decision_uq" ON "autonomy_executions" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "autonomy_executions_company_status_idx" ON "autonomy_executions" USING btree ("company_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "operational_constraints_company_key_uq" ON "operational_constraints" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "operational_constraints_company_status_idx" ON "operational_constraints" USING btree ("company_id","status","last_observed_at");