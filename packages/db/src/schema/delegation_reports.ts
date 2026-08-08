import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const delegationReports = pgTable("delegation_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  fromAgentId: uuid("from_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  toParentAgentId: uuid("to_parent_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyKeyUnique: uniqueIndex("delegation_reports_company_key_unique").on(table.companyId, table.idempotencyKey),
  parentCreatedIdx: index("delegation_reports_parent_created_idx").on(table.toParentAgentId, table.createdAt),
  kindCheck: check("delegation_reports_kind_check", sql`${table.kind} in ('result', 'evidence', 'status', 'blocker', 'risk', 'budget', 'review', 'outcome')`),
}));
