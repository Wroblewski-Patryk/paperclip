CREATE TABLE "delivery_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"role" text DEFAULT 'implementation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"from_stage" text NOT NULL,
	"to_stage" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_transitions_stages_check" CHECK ("delivery_transitions"."from_stage" <> "delivery_transitions"."to_stage")
);
--> statement-breakpoint
CREATE TABLE "product_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"problem_statement" text NOT NULL,
	"decision_contract" jsonb NOT NULL,
	"stage" text DEFAULT 'proposed' NOT NULL,
	"owner_agent_id" uuid,
	"local_sha" text,
	"origin_sha" text,
	"integration_sha" text,
	"deployed_sha" text,
	"deployment_url" text,
	"blocker" text,
	"needs_decision" boolean DEFAULT false NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_deliveries_stage_check" CHECK ("product_deliveries"."stage" in ('proposed', 'admitted', 'implementing', 'evidence_complete', 'review_rejected', 'review_accepted', 'integrated', 'push_ready', 'deployed', 'observed_healthy', 'rolled_back', 'outcome_accepted'))
);
--> statement-breakpoint
CREATE TABLE "product_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"status" text DEFAULT 'unachieved' NOT NULL,
	"statement" text NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accepted_by_agent_id" uuid,
	"accepted_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_outcomes_status_check" CHECK ("product_outcomes"."status" in ('unachieved', 'observing', 'achieved', 'accepted', 'rejected', 'rolled_back'))
);
--> statement-breakpoint
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_transitions" ADD CONSTRAINT "delivery_transitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_transitions" ADD CONSTRAINT "delivery_transitions_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_deliveries" ADD CONSTRAINT "product_deliveries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_deliveries" ADD CONSTRAINT "product_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_deliveries" ADD CONSTRAINT "product_deliveries_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD CONSTRAINT "product_outcomes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD CONSTRAINT "product_outcomes_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD CONSTRAINT "product_outcomes_accepted_by_agent_id_agents_id_fk" FOREIGN KEY ("accepted_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_tasks_delivery_issue_unique" ON "delivery_tasks" USING btree ("delivery_id","issue_id");--> statement-breakpoint
CREATE INDEX "delivery_tasks_issue_idx" ON "delivery_tasks" USING btree ("issue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_transitions_delivery_key_unique" ON "delivery_transitions" USING btree ("delivery_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "delivery_transitions_company_created_idx" ON "delivery_transitions" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "product_deliveries_company_stage_idx" ON "product_deliveries" USING btree ("company_id","stage");--> statement-breakpoint
CREATE INDEX "product_deliveries_project_stage_idx" ON "product_deliveries" USING btree ("project_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "product_outcomes_delivery_unique" ON "product_outcomes" USING btree ("delivery_id");