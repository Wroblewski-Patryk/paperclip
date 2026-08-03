import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { admissionControls } from "./admission_controls.js";

export const admissionControlTransitions = pgTable(
  "admission_control_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    admissionControlId: uuid("admission_control_id")
      .notNull()
      .references(() => admissionControls.id, { onDelete: "cascade" }),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    controlVersion: integer("control_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    evidence: jsonb("evidence").$type<Array<Record<string, unknown>>>(),
    status: text("status").notNull().default("requested"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    controlKeyUnique: uniqueIndex("admission_control_transitions_control_key_unique").on(
      table.admissionControlId,
      table.idempotencyKey,
    ),
    companyCreatedIdx: index("admission_control_transitions_company_created_idx").on(
      table.companyId,
      table.createdAt,
    ),
    statusCheck: check(
      "admission_control_transitions_status_check",
      sql`${table.status} in ('requested', 'committed', 'failed')`,
    ),
    fromStateCheck: check(
      "admission_control_transitions_from_state_check",
      sql`${table.fromState} is null or ${table.fromState} in ('open', 'draining', 'maintenance', 'reopening')`,
    ),
    toStateCheck: check(
      "admission_control_transitions_to_state_check",
      sql`${table.toState} in ('open', 'draining', 'maintenance', 'reopening')`,
    ),
    versionCheck: check(
      "admission_control_transitions_version_check",
      sql`${table.controlVersion} > 0`,
    ),
  }),
);
