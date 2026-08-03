CREATE TABLE "admission_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"reason" text,
	"prior_state" text,
	"initiator_actor_type" text,
	"initiator_actor_id" text,
	"maintenance_owner_agent_id" uuid,
	"maintenance_issue_id" uuid,
	"required_evidence" jsonb,
	"drain_started_at" timestamp with time zone,
	"maintenance_started_at" timestamp with time zone,
	"reopen_started_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"drain_snapshot" jsonb,
	"replay_snapshot" jsonb,
	"reopen_attempt_id" uuid,
	"reopen_result" text,
	"last_error_code" text,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_controls_scope_type_check" CHECK ("admission_controls"."scope_type" in ('company', 'project')),
	CONSTRAINT "admission_controls_state_check" CHECK ("admission_controls"."state" in ('open', 'draining', 'maintenance', 'reopening')),
	CONSTRAINT "admission_controls_version_check" CHECK ("admission_controls"."version" > 0),
	CONSTRAINT "admission_controls_company_scope_check" CHECK ("admission_controls"."scope_type" <> 'company' or "admission_controls"."scope_id" = "admission_controls"."company_id")
);
--> statement-breakpoint
CREATE TABLE "admission_control_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"admission_control_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"control_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"evidence" jsonb,
	"status" text DEFAULT 'requested' NOT NULL,
	"result" jsonb,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_control_transitions_status_check" CHECK ("admission_control_transitions"."status" in ('requested', 'committed', 'failed')),
	CONSTRAINT "admission_control_transitions_from_state_check" CHECK ("admission_control_transitions"."from_state" is null or "admission_control_transitions"."from_state" in ('open', 'draining', 'maintenance', 'reopening')),
	CONSTRAINT "admission_control_transitions_to_state_check" CHECK ("admission_control_transitions"."to_state" in ('open', 'draining', 'maintenance', 'reopening')),
	CONSTRAINT "admission_control_transitions_version_check" CHECK ("admission_control_transitions"."control_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "admission_control_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "admission_version" integer;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "dedupe_key" text;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "deferred_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "replayed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "replay_result" text;
--> statement-breakpoint
ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_maintenance_owner_agent_id_agents_id_fk" FOREIGN KEY ("maintenance_owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_maintenance_issue_id_issues_id_fk" FOREIGN KEY ("maintenance_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_control_transitions" ADD CONSTRAINT "admission_control_transitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_control_transitions" ADD CONSTRAINT "admission_control_transitions_admission_control_id_admission_controls_id_fk" FOREIGN KEY ("admission_control_id") REFERENCES "public"."admission_controls"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD CONSTRAINT "agent_wakeup_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD CONSTRAINT "agent_wakeup_requests_admission_control_id_admission_controls_id_fk" FOREIGN KEY ("admission_control_id") REFERENCES "public"."admission_controls"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "admission_controls_company_scope_unique" ON "admission_controls" USING btree ("company_id","scope_type","scope_id");
--> statement-breakpoint
CREATE INDEX "admission_controls_company_state_idx" ON "admission_controls" USING btree ("company_id","state");
--> statement-breakpoint
CREATE UNIQUE INDEX "admission_control_transitions_control_key_unique" ON "admission_control_transitions" USING btree ("admission_control_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "admission_control_transitions_company_created_idx" ON "admission_control_transitions" USING btree ("company_id","created_at");
--> statement-breakpoint
CREATE INDEX "agent_wakeup_requests_company_project_status_idx" ON "agent_wakeup_requests" USING btree ("company_id","project_id","status");
--> statement-breakpoint
CREATE INDEX "agent_wakeup_requests_control_status_idx" ON "agent_wakeup_requests" USING btree ("admission_control_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_wakeup_requests_deferred_dedupe_unique" ON "agent_wakeup_requests" USING btree ("company_id","dedupe_key") WHERE status = 'deferred_by_maintenance';
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "heartbeat_runs"
		WHERE "wakeup_request_id" IS NOT NULL
		GROUP BY "wakeup_request_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot enforce one heartbeat run per wakeup request: duplicate wakeup_request_id values exist';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "heartbeat_runs_wakeup_request_unique_idx" ON "heartbeat_runs" USING btree ("wakeup_request_id") WHERE "heartbeat_runs"."wakeup_request_id" is not null;
--> statement-breakpoint
INSERT INTO "admission_controls" (
	"company_id",
	"scope_type",
	"scope_id",
	"state",
	"version",
	"reason",
	"prior_state",
	"initiator_actor_type",
	"initiator_actor_id",
	"maintenance_started_at",
	"opened_at",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	'company',
	"id",
	CASE
		WHEN "status" = 'paused' AND "pause_reason" IS DISTINCT FROM 'budget' THEN 'maintenance'
		ELSE 'open'
	END,
	1,
	CASE
		WHEN "status" = 'paused' AND "pause_reason" IS DISTINCT FROM 'budget'
			THEN COALESCE("pause_reason", 'legacy_company_pause')
		ELSE NULL
	END,
	"status",
	'system',
	'0107_admission_control',
	CASE
		WHEN "status" = 'paused' AND "pause_reason" IS DISTINCT FROM 'budget' THEN COALESCE("paused_at", now())
		ELSE NULL
	END,
	CASE
		WHEN "status" = 'paused' AND "pause_reason" IS DISTINCT FROM 'budget' THEN NULL
		ELSE now()
	END,
	now(),
	now()
FROM "companies"
ON CONFLICT ("company_id", "scope_type", "scope_id") DO NOTHING;
