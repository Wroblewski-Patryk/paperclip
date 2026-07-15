import { type AnyPgColumn, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { OrganizationalEvidenceRef, OrganizationalRecordKind, OrganizationalRecordStatus } from "@paperclipai/shared";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { goals } from "./goals.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";

export const organizationalRecords = pgTable(
  "organizational_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    kind: text("kind").$type<OrganizationalRecordKind>().notNull(),
    status: text("status").$type<OrganizationalRecordStatus>().notNull(),
    title: text("title").notNull(),
    statement: text("statement").notNull(),
    rationale: text("rationale"),
    consequences: text("consequences"),
    resolution: text("resolution"),
    confidence: integer("confidence"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id, { onDelete: "set null" }),
    ownerUserId: text("owner_user_id"),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    supersedesId: uuid("supersedes_id").references((): AnyPgColumn => organizationalRecords.id, { onDelete: "set null" }),
    evidence: jsonb("evidence").$type<OrganizationalEvidenceRef[]>().notNull().default([]),
    dueAt: timestamp("due_at", { withTimezone: true }),
    reviewAt: timestamp("review_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyKindStatusIdx: index("organizational_records_company_kind_status_idx").on(
      table.companyId,
      table.kind,
      table.status,
    ),
    companyOwnerIdx: index("organizational_records_company_owner_idx").on(table.companyId, table.ownerAgentId),
    companyReviewIdx: index("organizational_records_company_review_idx").on(table.companyId, table.reviewAt),
    companyDueIdx: index("organizational_records_company_due_idx").on(table.companyId, table.dueAt),
    goalIdx: index("organizational_records_goal_idx").on(table.goalId),
    projectIdx: index("organizational_records_project_idx").on(table.projectId),
    issueIdx: index("organizational_records_issue_idx").on(table.issueId),
  }),
);
