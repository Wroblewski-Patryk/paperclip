import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { productDeliveries } from "./product_deliveries.js";

export const deliveryTransitions = pgTable("delivery_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  deliveryId: uuid("delivery_id").notNull().references(() => productDeliveries.id, { onDelete: "cascade" }),
  fromStage: text("from_stage").notNull(),
  toStage: text("to_stage").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  evidence: jsonb("evidence").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  deliveryKeyUnique: uniqueIndex("delivery_transitions_delivery_key_unique").on(table.deliveryId, table.idempotencyKey),
  companyCreatedIdx: index("delivery_transitions_company_created_idx").on(table.companyId, table.createdAt),
  stagesCheck: check("delivery_transitions_stages_check", sql`${table.fromStage} <> ${table.toStage}`),
}));
