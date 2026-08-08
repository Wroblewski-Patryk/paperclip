import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { productDeliveries } from "./product_deliveries.js";
import { agents } from "./agents.js";

export const productOutcomes = pgTable("product_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  deliveryId: uuid("delivery_id").notNull().references(() => productDeliveries.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("unachieved"),
  statement: text("statement").notNull(),
  acceptanceCriteria: jsonb("acceptance_criteria").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  acceptancePredicates: jsonb("acceptance_predicates").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  predicateResults: jsonb("predicate_results").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  acceptanceDecision: jsonb("acceptance_decision").$type<Record<string, unknown>>(),
  evidence: jsonb("evidence").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  acceptedByAgentId: uuid("accepted_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
  acceptedByUserId: text("accepted_by_user_id"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  deliveryUnique: uniqueIndex("product_outcomes_delivery_unique").on(table.deliveryId),
  statusCheck: check("product_outcomes_status_check", sql`${table.status} in ('unachieved', 'observing', 'achieved', 'accepted', 'accepted_with_risk', 'partial', 'rejected', 'rolled_back', 'unknown')`),
}));
