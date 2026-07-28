import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { executionWorkspaces } from "./execution_workspaces.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { issues } from "./issues.js";

/** Short-lived exclusive claim for a singleton workspace verification resource. */
export const workspaceResourceClaims = pgTable(
  "workspace_resource_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    executionWorkspaceId: uuid("execution_workspace_id").notNull().references(() => executionWorkspaces.id, { onDelete: "cascade" }),
    resourceKey: text("resource_key").notNull(),
    heartbeatRunId: uuid("heartbeat_run_id").notNull().references(() => heartbeatRuns.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releaseReason: text("release_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeResourceClaimUq: uniqueIndex("workspace_resource_claims_active_resource_uq")
      .on(table.companyId, table.executionWorkspaceId, table.resourceKey)
      .where(sql`${table.status} = 'active'`),
    heartbeatRunIdx: index("workspace_resource_claims_heartbeat_run_idx").on(table.heartbeatRunId),
  }),
);
