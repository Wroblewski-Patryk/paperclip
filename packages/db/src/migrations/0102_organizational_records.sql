CREATE TABLE "organizational_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"statement" text NOT NULL,
	"rationale" text,
	"consequences" text,
	"resolution" text,
	"confidence" integer,
	"owner_agent_id" uuid,
	"owner_user_id" text,
	"goal_id" uuid,
	"project_id" uuid,
	"issue_id" uuid,
	"supersedes_id" uuid,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"review_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_supersedes_id_organizational_records_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."organizational_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizational_records" ADD CONSTRAINT "organizational_records_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizational_records_company_kind_status_idx" ON "organizational_records" USING btree ("company_id","kind","status");--> statement-breakpoint
CREATE INDEX "organizational_records_company_owner_idx" ON "organizational_records" USING btree ("company_id","owner_agent_id");--> statement-breakpoint
CREATE INDEX "organizational_records_company_review_idx" ON "organizational_records" USING btree ("company_id","review_at");--> statement-breakpoint
CREATE INDEX "organizational_records_company_due_idx" ON "organizational_records" USING btree ("company_id","due_at");--> statement-breakpoint
CREATE INDEX "organizational_records_goal_idx" ON "organizational_records" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "organizational_records_project_idx" ON "organizational_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "organizational_records_issue_idx" ON "organizational_records" USING btree ("issue_id");
