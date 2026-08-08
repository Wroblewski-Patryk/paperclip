CREATE TABLE "autonomy_canary_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"envelope_id" uuid NOT NULL,
	"decision_id" uuid,
	"action_class" text NOT NULL,
	"candidate_criteria" jsonb NOT NULL,
	"max_executions" integer DEFAULT 1 NOT NULL,
	"used_executions" integer DEFAULT 0 NOT NULL,
	"max_concurrency" integer DEFAULT 1 NOT NULL,
	"allowed_risk" jsonb DEFAULT '["low"]'::jsonb NOT NULL,
	"environments" jsonb DEFAULT '["local"]'::jsonb NOT NULL,
	"budget" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"rollback_requirement" jsonb NOT NULL,
	"verification_requirement" jsonb NOT NULL,
	"issuer_type" text NOT NULL,
	"issuer_id" text NOT NULL,
	"rationale" text NOT NULL,
	"stop_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experiment" jsonb NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"stopped_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_canary_authorizations_status_check" CHECK ("autonomy_canary_authorizations"."status" in ('ACTIVE','EXHAUSTED','EXPIRED','STOPPED','REVOKED')),
	CONSTRAINT "autonomy_canary_authorizations_issuer_check" CHECK ("autonomy_canary_authorizations"."issuer_type" in ('user','system')),
	CONSTRAINT "autonomy_canary_authorizations_execution_limit_check" CHECK ("autonomy_canary_authorizations"."max_executions" > 0 and "autonomy_canary_authorizations"."used_executions" >= 0 and "autonomy_canary_authorizations"."used_executions" <= "autonomy_canary_authorizations"."max_executions")
);
--> statement-breakpoint
CREATE TABLE "autonomy_interrupts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"severity" text NOT NULL,
	"scope" jsonb NOT NULL,
	"source" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preemptible_work_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autonomy_interrupts_status_check" CHECK ("autonomy_interrupts"."status" in ('ACTIVE','EXPIRED','CLEARED','REVALIDATION_REQUIRED')),
	CONSTRAINT "autonomy_interrupts_severity_check" CHECK ("autonomy_interrupts"."severity" in ('info','warning','critical'))
);
--> statement-breakpoint
CREATE TABLE "issue_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"status" text DEFAULT 'UNKNOWN' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"owner_agent_id" uuid,
	"owner_user_id" text,
	"source" text NOT NULL,
	"reason" text NOT NULL,
	"hierarchy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"canonical_owner" text DEFAULT 'paperclip' NOT NULL,
	"target_canonical_owner" text DEFAULT 'roost' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_intents_status_check" CHECK ("issue_intents"."status" in ('ACTIVE','RECONFIRM_REQUIRED','SUPERSEDED','OBSOLETE','SATISFIED_ELSEWHERE','UNKNOWN'))
);
--> statement-breakpoint
CREATE TABLE "learned_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle" text DEFAULT 'PROPOSED' NOT NULL,
	"scope" jsonb NOT NULL,
	"provenance" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"expected_effect" jsonb NOT NULL,
	"observed_effect" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rollback_condition" jsonb NOT NULL,
	"supersedes_policy_id" uuid,
	"owner_agent_id" uuid,
	"review_at" timestamp with time zone,
	"canonical_owner" text DEFAULT 'paperclip' NOT NULL,
	"target_canonical_owner" text DEFAULT 'roost' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learned_policies_lifecycle_check" CHECK ("learned_policies"."lifecycle" in ('PROPOSED','EXPERIMENTAL','ACTIVE','SUSPECT','ROLLED_BACK','SUPERSEDED','RETIRED')),
	CONSTRAINT "learned_policies_confidence_check" CHECK ("learned_policies"."confidence" >= 0 and "learned_policies"."confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "policy_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"scope" jsonb NOT NULL,
	"owner_agent_id" uuid,
	"owner_user_id" text,
	"rationale" text NOT NULL,
	"risk_acceptance" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_exceptions_status_check" CHECK ("policy_exceptions"."status" in ('ACTIVE','EXPIRED','REVOKED','USED'))
);
--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD COLUMN "signal_type" text DEFAULT 'ORACLE_VERDICT' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD COLUMN "evaluator_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD COLUMN "evidence_available" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "sample_key" text;--> statement-breakpoint
UPDATE "autonomy_decisions" SET "sample_key" = "state_digest" WHERE "sample_key" IS NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ALTER COLUMN "sample_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "sample_identity" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "decision_model_version" text DEFAULT 'work-selection-v2' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "calibration_cohort" text DEFAULT 'work-selection-v2' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "envelope_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "operator_decision" jsonb;--> statement-breakpoint
ALTER TABLE "autonomy_decisions" ADD COLUMN "counterfactual_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "canary_authorization_id" uuid;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "liveness_status" text DEFAULT 'STARTING' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "liveness_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "preemption_class" text DEFAULT 'SAFE_POINT_ONLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "constraint_impact_status" text;--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD COLUMN "constraint_impact_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "dependency_type" text DEFAULT 'finish_to_start' NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "blocking_condition" text;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "expected_resolving_outcome" jsonb;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "owner_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "last_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "stale_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "resolution_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_relations" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "autonomy_canary_authorizations" ADD CONSTRAINT "autonomy_canary_authorizations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_canary_authorizations" ADD CONSTRAINT "autonomy_canary_authorizations_envelope_id_autonomy_envelopes_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."autonomy_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_canary_authorizations" ADD CONSTRAINT "autonomy_canary_authorizations_decision_id_autonomy_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."autonomy_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_interrupts" ADD CONSTRAINT "autonomy_interrupts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_intents" ADD CONSTRAINT "issue_intents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_intents" ADD CONSTRAINT "issue_intents_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_intents" ADD CONSTRAINT "issue_intents_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learned_policies" ADD CONSTRAINT "learned_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learned_policies" ADD CONSTRAINT "learned_policies_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_exceptions" ADD CONSTRAINT "policy_exceptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_exceptions" ADD CONSTRAINT "policy_exceptions_policy_id_learned_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."learned_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_exceptions" ADD CONSTRAINT "policy_exceptions_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autonomy_canary_authorizations_company_status_idx" ON "autonomy_canary_authorizations" USING btree ("company_id","status","valid_until");--> statement-breakpoint
CREATE INDEX "autonomy_canary_authorizations_decision_idx" ON "autonomy_canary_authorizations" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "autonomy_interrupts_company_status_idx" ON "autonomy_interrupts" USING btree ("company_id","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_intents_company_issue_uq" ON "issue_intents" USING btree ("company_id","issue_id");--> statement-breakpoint
CREATE INDEX "issue_intents_company_status_idx" ON "issue_intents" USING btree ("company_id","status","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "learned_policies_company_key_version_uq" ON "learned_policies" USING btree ("company_id","key","version");--> statement-breakpoint
CREATE INDEX "learned_policies_company_lifecycle_idx" ON "learned_policies" USING btree ("company_id","lifecycle","review_at");--> statement-breakpoint
CREATE INDEX "policy_exceptions_company_status_idx" ON "policy_exceptions" USING btree ("company_id","status","valid_until");--> statement-breakpoint
ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autonomy_decisions_company_sample_idx" ON "autonomy_decisions" USING btree ("company_id","sample_key","decision_model_version");--> statement-breakpoint
ALTER TABLE "autonomy_decision_evaluations" ADD CONSTRAINT "autonomy_decision_evaluations_signal_type_check" CHECK ("autonomy_decision_evaluations"."signal_type" in ('ORACLE_VERDICT','OPERATOR_DECISION','COUNTERFACTUAL_WEAK_EVIDENCE'));--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_liveness_status_check" CHECK ("autonomy_executions"."liveness_status" in ('STARTING','RUNNING','WAITING_VALID','STALLED','UNCERTAIN','TERMINAL'));--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_preemption_class_check" CHECK ("autonomy_executions"."preemption_class" in ('PREEMPTIBLE','SAFE_POINT_ONLY','NON_PREEMPTIBLE'));--> statement-breakpoint
ALTER TABLE "autonomy_executions" ADD CONSTRAINT "autonomy_executions_constraint_impact_status_check" CHECK ("autonomy_executions"."constraint_impact_status" is null or "autonomy_executions"."constraint_impact_status" in ('SUPPORTED','AMBIGUOUS','CONTRADICTED','NOT_MEASURABLE'));
