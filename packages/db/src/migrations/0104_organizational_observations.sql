CREATE TABLE "organizational_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source_class" text NOT NULL,
	"provenance" jsonb NOT NULL,
	"confidence" integer,
	"observed_at" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"freshness_window_hours" integer,
	"goal_id" uuid,
	"project_id" uuid,
	"issue_id" uuid,
	"agent_id" uuid,
	"run_id" uuid,
	"parent_observation_id" uuid,
	"supersedes_id" uuid,
	"outcome_layer" text,
	"outcome_result" text,
	"causal_role" text,
	"external_category" text,
	"measurement" jsonb,
	"promotion_target" jsonb,
	"promoted_at" timestamp with time zone,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_parent_observation_id_organizational_observations_id_fk" FOREIGN KEY ("parent_observation_id") REFERENCES "public"."organizational_observations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_supersedes_id_organizational_observations_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."organizational_observations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_observations" ADD CONSTRAINT "organizational_observations_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizational_observations_company_kind_status_idx" ON "organizational_observations" USING btree ("company_id","kind","status");--> statement-breakpoint
CREATE INDEX "organizational_observations_company_freshness_idx" ON "organizational_observations" USING btree ("company_id","valid_until","observed_at");--> statement-breakpoint
CREATE INDEX "organizational_observations_project_idx" ON "organizational_observations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "organizational_observations_issue_idx" ON "organizational_observations" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "organizational_observations_parent_idx" ON "organizational_observations" USING btree ("parent_observation_id");
