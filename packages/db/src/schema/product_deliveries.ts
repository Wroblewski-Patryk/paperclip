import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const productDeliveries = pgTable("product_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  problemStatement: text("problem_statement").notNull(),
  decisionContract: jsonb("decision_contract").$type<Record<string, unknown>>().notNull(),
  stage: text("stage").notNull().default("proposed"),
  ownerAgentId: uuid("owner_agent_id").references(() => agents.id, { onDelete: "set null" }),
  localSha: text("local_sha"),
  originSha: text("origin_sha"),
  integrationSha: text("integration_sha"),
  deployedSha: text("deployed_sha"),
  deploymentUrl: text("deployment_url"),
  blocker: text("blocker"),
  needsDecision: boolean("needs_decision").notNull().default(false),
  evidence: jsonb("evidence").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  observedAt: timestamp("observed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyStageIdx: index("product_deliveries_company_stage_idx").on(table.companyId, table.stage),
  projectStageIdx: index("product_deliveries_project_stage_idx").on(table.projectId, table.stage),
  stageCheck: check("product_deliveries_stage_check", sql`${table.stage} in ('proposed', 'admitted', 'implementing', 'evidence_complete', 'review_rejected', 'review_accepted', 'integrated', 'push_ready', 'deployed', 'observed_healthy', 'rolled_back', 'outcome_accepted')`),
}));
