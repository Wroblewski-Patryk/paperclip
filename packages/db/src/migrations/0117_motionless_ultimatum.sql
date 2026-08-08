ALTER TABLE "supervision_findings" ADD COLUMN "bottleneck_type" text;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "bottleneck_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "bottleneck_stage" text;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "dependency" text;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "sla_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "next_allowed_action" text;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "escalation_condition" text;--> statement-breakpoint
ALTER TABLE "supervision_findings" ADD COLUMN "bottleneck_resolved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "supervision_findings_bottleneck_idx" ON "supervision_findings" USING btree ("company_id","bottleneck_type","sla_due_at");