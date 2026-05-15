CREATE TABLE IF NOT EXISTS "company_core_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"base_url" text,
	"workspace_id" text,
	"workspace_name" text,
	"knowledge_enabled" boolean DEFAULT false NOT NULL,
	"knowledge_api_key" text,
	"knowledge_profile_id" text,
	"knowledge_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tools_enabled" boolean DEFAULT false NOT NULL,
	"tools_api_key" text,
	"tools_profile_id" text,
	"tools_command_mode" text DEFAULT 'approval_required' NOT NULL,
	"tools_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_core_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_core_settings_company_uq" ON "company_core_settings" USING btree ("company_id");
