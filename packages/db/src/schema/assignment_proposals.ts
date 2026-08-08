import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { admissionDecisions } from "./admission_decisions.js";
import { productDeliveries } from "./product_deliveries.js";

export const assignmentProposals = pgTable("assignment_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  proposedAssigneeAgentId: uuid("proposed_assignee_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  proposedByAgentId: uuid("proposed_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
  proposedByUserId: text("proposed_by_user_id"),
  parentAgentId: uuid("parent_agent_id").references(() => agents.id, { onDelete: "set null" }),
  routingMode: text("routing_mode").notNull().default("direct_child"),
  deliveryId: uuid("delivery_id").references(() => productDeliveries.id, { onDelete: "set null" }),
  delegationPath: jsonb("delegation_path").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  scopeContract: jsonb("scope_contract").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  budgetContract: jsonb("budget_contract").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  acceptanceCriteria: jsonb("acceptance_criteria").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  reviewerAgentId: uuid("reviewer_agent_id").references(() => agents.id, { onDelete: "set null" }),
  admissionDecisionId: uuid("admission_decision_id").references(() => admissionDecisions.id, { onDelete: "set null" }),
  status: text("status").notNull().default("proposed"),
  idempotencyKey: text("idempotency_key").notNull(),
  reason: text("reason").notNull(),
  disposition: text("disposition"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyKeyUnique: uniqueIndex("assignment_proposals_company_key_unique").on(table.companyId, table.idempotencyKey),
  issueStatusIdx: index("assignment_proposals_issue_status_idx").on(table.issueId, table.status),
  statusCheck: check("assignment_proposals_status_check", sql`${table.status} in ('proposed', 'admitted', 'applied', 'needs_decision', 'waiting_for_signal', 'paused_by_budget', 'rejected_as_duplicate', 'not_worth_doing', 'deferred_by_maintenance', 'rejected')`),
  routingModeCheck: check("assignment_proposals_routing_mode_check", sql`${table.routingMode} in ('direct_child', 'product_delivery_fast_path')`),
}));
