import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const roostProductMapOutbox = pgTable("roost_product_map_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  sourceSnapshotId: text("source_snapshot_id").notNull(),
  packetDigest: text("packet_digest").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  envelope: jsonb("envelope").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lastErrorCode: text("last_error_code"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyKeyUnique: uniqueIndex("roost_product_map_outbox_company_key_unique").on(table.companyId, table.idempotencyKey),
  pendingOrderIdx: index("roost_product_map_outbox_pending_order_idx").on(table.companyId, table.status, table.observedAt, table.createdAt),
  statusCheck: check("roost_product_map_outbox_status_check", sql`${table.status} in ('pending', 'published', 'dead')`),
  attemptCheck: check("roost_product_map_outbox_attempt_count_check", sql`${table.attemptCount} >= 0`),
}));
