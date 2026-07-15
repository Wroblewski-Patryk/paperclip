-- Reconcile migration-only changes with the canonical Drizzle snapshot after
-- the historical 0095/0098 snapshot branch was linearized. These operations
-- are idempotent because 0098-0100 may already have applied them.
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "completion_evidence" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "heartbeat_runs_company_created_idx" ON "heartbeat_runs" USING btree ("company_id","created_at");--> statement-breakpoint
