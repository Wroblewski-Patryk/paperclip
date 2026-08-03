CREATE TABLE "roost_product_map_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_snapshot_id" text NOT NULL,
	"packet_digest" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"envelope" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error_code" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roost_product_map_outbox_status_check" CHECK ("roost_product_map_outbox"."status" in ('pending', 'published', 'dead')),
	CONSTRAINT "roost_product_map_outbox_attempt_count_check" CHECK ("roost_product_map_outbox"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "roost_product_map_outbox" ADD CONSTRAINT "roost_product_map_outbox_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roost_product_map_outbox_company_key_unique" ON "roost_product_map_outbox" USING btree ("company_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "roost_product_map_outbox_pending_order_idx" ON "roost_product_map_outbox" USING btree ("company_id","status","observed_at","created_at");