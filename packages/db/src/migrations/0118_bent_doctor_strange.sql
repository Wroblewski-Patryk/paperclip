ALTER TABLE "product_outcomes" DROP CONSTRAINT "product_outcomes_status_check";--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD COLUMN "acceptance_predicates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD COLUMN "predicate_results" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD COLUMN "acceptance_decision" jsonb;--> statement-breakpoint
ALTER TABLE "product_outcomes" ADD CONSTRAINT "product_outcomes_status_check" CHECK ("product_outcomes"."status" in ('unachieved', 'observing', 'achieved', 'accepted', 'accepted_with_risk', 'partial', 'rejected', 'rolled_back', 'unknown'));