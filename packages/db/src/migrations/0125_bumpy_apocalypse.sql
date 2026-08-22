ALTER TABLE "admission_controls" ADD COLUMN "project_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "admission_controls" control
    LEFT JOIN "projects" project
      ON project."id" = control."scope_id"
      AND project."company_id" = control."company_id"
    WHERE control."scope_type" = 'project'
      AND project."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope admission controls safely: a project control references a missing or cross-company project';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "admission_control_transitions" transition
    JOIN "admission_controls" control ON control."id" = transition."admission_control_id"
    WHERE transition."company_id" <> control."company_id"
  ) THEN
    RAISE EXCEPTION 'Cannot constrain admission control transitions: cross-company references exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "agent_wakeup_requests" request
    JOIN "projects" project ON project."id" = request."project_id"
    WHERE request."project_id" IS NOT NULL
      AND request."company_id" <> project."company_id"
  ) OR EXISTS (
    SELECT 1
    FROM "agent_wakeup_requests" request
    JOIN "admission_controls" control ON control."id" = request."admission_control_id"
    WHERE request."admission_control_id" IS NOT NULL
      AND request."company_id" <> control."company_id"
  ) THEN
    RAISE EXCEPTION 'Cannot constrain wakeup requests: cross-company references exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "heartbeat_runs" run
    JOIN "agent_wakeup_requests" request ON request."id" = run."wakeup_request_id"
    WHERE run."wakeup_request_id" IS NOT NULL
      AND run."company_id" <> request."company_id"
  ) THEN
    RAISE EXCEPTION 'Cannot constrain heartbeat runs: cross-company wakeup references exist';
  END IF;
END $$;--> statement-breakpoint
UPDATE "admission_controls"
SET "project_id" = "scope_id"
WHERE "scope_type" = 'project';--> statement-breakpoint
CREATE UNIQUE INDEX "admission_controls_company_id_unique" ON "admission_controls" USING btree ("company_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_wakeup_requests_company_id_unique" ON "agent_wakeup_requests" USING btree ("company_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_company_id_unique" ON "projects" USING btree ("company_id","id");--> statement-breakpoint
ALTER TABLE "admission_control_transitions" ADD CONSTRAINT "admission_control_transitions_company_control_id_admission_controls_company_id_id_fk" FOREIGN KEY ("company_id","admission_control_id") REFERENCES "public"."admission_controls"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_company_project_id_projects_company_id_id_fk" FOREIGN KEY ("company_id","project_id") REFERENCES "public"."projects"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD CONSTRAINT "agent_wakeup_requests_company_project_id_projects_company_id_id_fk" FOREIGN KEY ("company_id","project_id") REFERENCES "public"."projects"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD CONSTRAINT "agent_wakeup_requests_company_control_id_admission_controls_company_id_id_fk" FOREIGN KEY ("company_id","admission_control_id") REFERENCES "public"."admission_controls"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD CONSTRAINT "heartbeat_runs_company_wakeup_request_id_agent_wakeup_requests_company_id_id_fk" FOREIGN KEY ("company_id","wakeup_request_id") REFERENCES "public"."agent_wakeup_requests"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_controls" ADD CONSTRAINT "admission_controls_project_scope_check" CHECK ((
        "admission_controls"."scope_type" = 'company' and "admission_controls"."project_id" is null
      ) or (
        "admission_controls"."scope_type" = 'project' and "admission_controls"."project_id" is not null and "admission_controls"."scope_id" = "admission_controls"."project_id"
      ));
