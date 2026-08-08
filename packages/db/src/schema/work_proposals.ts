import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";

export const workProposals = pgTable("work_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  sourceIssueId: uuid("source_issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  proposedByAgentId: uuid("proposed_by_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  targetParentAgentId: uuid("target_parent_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  problemStatement: text("problem_statement").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),
  scopeContract: jsonb("scope_contract").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  evidence: jsonb("evidence").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  status: text("status").notNull().default("submitted"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyKeyUnique: uniqueIndex("work_proposals_company_key_unique").on(table.companyId, table.idempotencyKey),
  targetStatusIdx: index("work_proposals_target_status_idx").on(table.targetParentAgentId, table.status),
  statusCheck: check("work_proposals_status_check", sql`${table.status} in ('submitted', 'acknowledged', 'converted', 'rejected')`),
}));
