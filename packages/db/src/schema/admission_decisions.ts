import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { admissionControls } from "./admission_controls.js";

export const admissionDecisions = pgTable(
  "admission_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    admissionControlId: uuid("admission_control_id").notNull().references(() => admissionControls.id, { onDelete: "cascade" }),
    controlVersion: integer("control_version").notNull(),
    fingerprint: text("fingerprint").notNull(),
    source: text("source").notNull(),
    disposition: text("disposition").notNull(),
    admitted: boolean("admitted").notNull().default(false),
    reasonCode: text("reason_code").notNull(),
    reason: text("reason"),
    evidenceHash: text("evidence_hash"),
    retryCount: integer("retry_count").notNull().default(0),
    expectedValue: integer("expected_value"),
    observed: jsonb("observed").$type<Record<string, unknown>>(),
    limits: jsonb("limits").$type<Record<string, unknown>>(),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    observationUntil: timestamp("observation_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedIdx: index("admission_decisions_company_created_idx").on(table.companyId, table.createdAt),
    fingerprintCreatedIdx: index("admission_decisions_fingerprint_created_idx").on(table.companyId, table.fingerprint, table.createdAt),
    issueCreatedIdx: index("admission_decisions_issue_created_idx").on(table.issueId, table.createdAt),
    dispositionCheck: check(
      "admission_decisions_disposition_check",
      sql`${table.disposition} in ('admitted', 'deferred_by_maintenance', 'needs_decision', 'waiting_for_signal', 'paused_by_budget', 'rejected_as_duplicate', 'accepted_risk', 'not_worth_doing')`,
    ),
    retryCheck: check("admission_decisions_retry_count_check", sql`${table.retryCount} >= 0`),
    versionCheck: check("admission_decisions_control_version_check", sql`${table.controlVersion} > 0`),
  }),
);
