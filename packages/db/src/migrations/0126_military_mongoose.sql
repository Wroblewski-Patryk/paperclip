ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_company_id_key" UNIQUE USING INDEX "admission_controls_company_id_unique";--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD CONSTRAINT "agent_wakeup_requests_company_id_key" UNIQUE USING INDEX "agent_wakeup_requests_company_id_unique";--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_key" UNIQUE USING INDEX "projects_company_id_unique";
