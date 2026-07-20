CREATE TABLE "catalog_team_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"catalog_id" text NOT NULL,
	"catalog_key" text NOT NULL,
	"package_name" text,
	"package_version" text,
	"origin_hash" text NOT NULL,
	"status" text DEFAULT 'installed' NOT NULL,
	"bindings" jsonb DEFAULT '{"agents":{},"projects":{},"routines":{}}'::jsonb NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_team_installations" ADD CONSTRAINT "catalog_team_installations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_team_installations_company_idx" ON "catalog_team_installations" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_team_installations_company_catalog_uq" ON "catalog_team_installations" USING btree ("company_id","catalog_id");
