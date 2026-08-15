CREATE TABLE "decision_queue_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"deferred_until" timestamp with time zone,
	"note" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_queue_preferences" ADD CONSTRAINT "decision_queue_preferences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decision_queue_preferences_company_deferred_idx" ON "decision_queue_preferences" USING btree ("company_id","deferred_until");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_queue_preferences_company_source_uq" ON "decision_queue_preferences" USING btree ("company_id","source_type","source_id") WHERE "decision_queue_preferences"."source_id" IS NOT NULL;