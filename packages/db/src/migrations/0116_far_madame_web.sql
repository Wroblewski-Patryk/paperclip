CREATE TABLE "supervision_shadow_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"external_source" text NOT NULL,
	"external_cycle_id" text NOT NULL,
	"native_cycle_id" uuid,
	"status" text DEFAULT 'compared' NOT NULL,
	"matched_fingerprints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"only_native" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"only_external" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity_mismatches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"compared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supervision_shadow_comparisons" ADD CONSTRAINT "supervision_shadow_comparisons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_shadow_comparisons" ADD CONSTRAINT "supervision_shadow_comparisons_native_cycle_id_supervision_cycles_id_fk" FOREIGN KEY ("native_cycle_id") REFERENCES "public"."supervision_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supervision_shadow_comparisons_company_cycle_uq" ON "supervision_shadow_comparisons" USING btree ("company_id","external_source","external_cycle_id");--> statement-breakpoint
CREATE INDEX "supervision_shadow_comparisons_company_compared_idx" ON "supervision_shadow_comparisons" USING btree ("company_id","compared_at");