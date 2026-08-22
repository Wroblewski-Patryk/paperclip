import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";

export const admissionControls = pgTable(
  "admission_controls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    projectId: uuid("project_id"),
    state: text("state").notNull().default("open"),
    version: integer("version").notNull().default(1),
    reason: text("reason"),
    priorState: text("prior_state"),
    initiatorActorType: text("initiator_actor_type"),
    initiatorActorId: text("initiator_actor_id"),
    maintenanceOwnerAgentId: uuid("maintenance_owner_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    maintenanceIssueId: uuid("maintenance_issue_id").references((): AnyPgColumn => issues.id, {
      onDelete: "set null",
    }),
    requiredEvidence: jsonb("required_evidence").$type<Array<Record<string, unknown>>>(),
    policy: jsonb("policy").$type<Record<string, unknown>>(),
    drainStartedAt: timestamp("drain_started_at", { withTimezone: true }),
    maintenanceStartedAt: timestamp("maintenance_started_at", { withTimezone: true }),
    reopenStartedAt: timestamp("reopen_started_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    drainSnapshot: jsonb("drain_snapshot").$type<Record<string, number>>(),
    replaySnapshot: jsonb("replay_snapshot").$type<Record<string, number>>(),
    reopenAttemptId: uuid("reopen_attempt_id"),
    reopenResult: text("reopen_result"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeUnique: uniqueIndex("admission_controls_company_scope_unique").on(
      table.companyId,
      table.scopeType,
      table.scopeId,
    ),
    companyIdUnique: unique("admission_controls_company_id_key").on(
      table.companyId,
      table.id,
    ),
    companyStateIdx: index("admission_controls_company_state_idx").on(table.companyId, table.state),
    scopeTypeCheck: check(
      "admission_controls_scope_type_check",
      sql`${table.scopeType} in ('company', 'project')`,
    ),
    stateCheck: check(
      "admission_controls_state_check",
      sql`${table.state} in ('open', 'draining', 'maintenance', 'reopening')`,
    ),
    versionCheck: check("admission_controls_version_check", sql`${table.version} > 0`),
    companyScopeCheck: check(
      "admission_controls_company_scope_check",
      sql`${table.scopeType} <> 'company' or ${table.scopeId} = ${table.companyId}`,
    ),
    projectScopeCheck: check(
      "admission_controls_project_scope_check",
      sql`(
        ${table.scopeType} = 'company' and ${table.projectId} is null
      ) or (
        ${table.scopeType} = 'project' and ${table.projectId} is not null and ${table.scopeId} = ${table.projectId}
      )`,
    ),
    projectCompanyFk: foreignKey({
      columns: [table.companyId, table.projectId],
      foreignColumns: [projects.companyId, projects.id],
      name: "admission_controls_company_project_id_projects_company_id_id_fk",
    }).onDelete("cascade"),
  }),
);
