import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/** Board-local queue state for canonical interaction and approval records. */
export const decisionQueuePreferences = pgTable(
  "decision_queue_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    deferredUntil: timestamp("deferred_until", { withTimezone: true }),
    note: text("note"),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyDeferredIdx: index("decision_queue_preferences_company_deferred_idx").on(
      table.companyId,
      table.deferredUntil,
    ),
    companySourceUq: uniqueIndex("decision_queue_preferences_company_source_uq")
      .on(table.companyId, table.sourceType, table.sourceId)
      .where(sql`${table.sourceId} IS NOT NULL`),
  }),
);
