-- Migration 0098 introduced this column before the historical snapshot branch
-- was reconciled. Preserve any existing values while making the canonical
-- snapshot match the deployed schema.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "icon" text;
