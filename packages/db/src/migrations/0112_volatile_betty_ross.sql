ALTER TABLE "assignment_proposals" ADD COLUMN "parent_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "routing_mode" text DEFAULT 'direct_child' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "delivery_id" uuid;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "delegation_path" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "scope_contract" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "budget_contract" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD COLUMN "reviewer_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_parent_agent_id_agents_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_delivery_id_product_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."product_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_reviewer_agent_id_agents_id_fk" FOREIGN KEY ("reviewer_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_proposals" ADD CONSTRAINT "assignment_proposals_routing_mode_check" CHECK ("assignment_proposals"."routing_mode" in ('direct_child', 'product_delivery_fast_path'));