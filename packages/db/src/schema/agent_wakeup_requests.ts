import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
import { agents } from "./agents.js";
import { projects } from "./projects.js";
import { admissionControls } from "./admission_controls.js";

export const agentWakeupRequests = pgTable(
  "agent_wakeup_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    triggerDetail: text("trigger_detail"),
    reason: text("reason"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    status: text("status").notNull().default("queued"),
    coalescedCount: integer("coalesced_count").notNull().default(0),
    requestedByActorType: text("requested_by_actor_type"),
    requestedByActorId: text("requested_by_actor_id"),
    idempotencyKey: text("idempotency_key"),
    admissionControlId: uuid("admission_control_id").references(
      (): AnyPgColumn => admissionControls.id,
      { onDelete: "set null" },
    ),
    admissionVersion: integer("admission_version"),
    dedupeKey: text("dedupe_key"),
    deferredAt: timestamp("deferred_at", { withTimezone: true }),
    replayedAt: timestamp("replayed_at", { withTimezone: true }),
    replayResult: text("replay_result"),
    runId: uuid("run_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyAgentStatusIdx: index("agent_wakeup_requests_company_agent_status_idx").on(
      table.companyId,
      table.agentId,
      table.status,
    ),
    companyRequestedIdx: index("agent_wakeup_requests_company_requested_idx").on(
      table.companyId,
      table.requestedAt,
    ),
    agentRequestedIdx: index("agent_wakeup_requests_agent_requested_idx").on(table.agentId, table.requestedAt),
    companyProjectStatusIdx: index("agent_wakeup_requests_company_project_status_idx").on(
      table.companyId,
      table.projectId,
      table.status,
    ),
    controlStatusIdx: index("agent_wakeup_requests_control_status_idx").on(
      table.admissionControlId,
      table.status,
    ),
    deferredDedupeUnique: uniqueIndex("agent_wakeup_requests_deferred_dedupe_unique")
      .on(table.companyId, table.dedupeKey)
      .where(sql`status = 'deferred_by_maintenance'`),
  }),
);
