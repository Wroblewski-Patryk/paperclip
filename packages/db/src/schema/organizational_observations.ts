import { type AnyPgColumn, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  CausalRole,
  ExternalSignalCategory,
  LearningPromotionTarget,
  OrganizationalEvidenceRef,
  OrganizationalMeasurement,
  OrganizationalObservationKind,
  OrganizationalObservationStatus,
  OutcomeLayer,
  OutcomeResult,
} from "@paperclipai/shared";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { goals } from "./goals.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";

export const organizationalObservations = pgTable("organizational_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  kind: text("kind").$type<OrganizationalObservationKind>().notNull(),
  status: text("status").$type<OrganizationalObservationStatus>().notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceClass: text("source_class").notNull(),
  provenance: jsonb("provenance").$type<OrganizationalEvidenceRef[]>().notNull(),
  confidence: integer("confidence"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  freshnessWindowHours: integer("freshness_window_hours"),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
  runId: uuid("run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
  parentObservationId: uuid("parent_observation_id").references((): AnyPgColumn => organizationalObservations.id, { onDelete: "set null" }),
  supersedesId: uuid("supersedes_id").references((): AnyPgColumn => organizationalObservations.id, { onDelete: "set null" }),
  outcomeLayer: text("outcome_layer").$type<OutcomeLayer>(),
  outcomeResult: text("outcome_result").$type<OutcomeResult>(),
  causalRole: text("causal_role").$type<CausalRole>(),
  externalCategory: text("external_category").$type<ExternalSignalCategory>(),
  measurement: jsonb("measurement").$type<OrganizationalMeasurement>(),
  promotionTarget: jsonb("promotion_target").$type<LearningPromotionTarget>(),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyKindStatusIdx: index("organizational_observations_company_kind_status_idx").on(table.companyId, table.kind, table.status),
  companyFreshnessIdx: index("organizational_observations_company_freshness_idx").on(table.companyId, table.validUntil, table.observedAt),
  projectIdx: index("organizational_observations_project_idx").on(table.projectId),
  issueIdx: index("organizational_observations_issue_idx").on(table.issueId),
  parentIdx: index("organizational_observations_parent_idx").on(table.parentObservationId),
}));
