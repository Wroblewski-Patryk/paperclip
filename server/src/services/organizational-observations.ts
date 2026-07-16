import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, goals, heartbeatRuns, issues, organizationalObservations, projects } from "@paperclipai/db";
import type {
  CreateOrganizationalObservation,
  ListOrganizationalObservationsQuery,
  OrganizationalObservationKind,
  OrganizationalObservationStatus,
  UpdateOrganizationalObservation,
} from "@paperclipai/shared";
import { badRequest, conflict } from "../errors.js";

const STATUS_BY_KIND: Record<OrganizationalObservationKind, ReadonlySet<string>> = {
  outcome: new Set(["active", "verified", "disputed", "superseded", "archived"]),
  causal: new Set(["proposed", "accepted", "disputed", "superseded", "archived"]),
  external_signal: new Set(["current", "stale", "contradicted", "superseded", "archived"]),
  learning: new Set(["proposed", "validated", "promoted", "rejected", "superseded"]),
};
const TRANSITIONS: Record<OrganizationalObservationKind, Record<string, ReadonlySet<string>>> = {
  outcome: {
    active: new Set(["verified", "disputed", "superseded", "archived"]),
    verified: new Set(["disputed", "superseded", "archived"]), disputed: new Set(["active", "superseded", "archived"]),
    superseded: new Set(), archived: new Set(),
  },
  causal: {
    proposed: new Set(["accepted", "disputed", "superseded", "archived"]),
    accepted: new Set(["disputed", "superseded", "archived"]), disputed: new Set(["proposed", "superseded", "archived"]),
    superseded: new Set(), archived: new Set(),
  },
  external_signal: {
    current: new Set(["stale", "contradicted", "superseded", "archived"]),
    stale: new Set(["current", "contradicted", "superseded", "archived"]),
    contradicted: new Set(["current", "superseded", "archived"]), superseded: new Set(), archived: new Set(),
  },
  learning: {
    proposed: new Set(["validated", "rejected", "superseded"]),
    validated: new Set(["promoted", "rejected", "superseded"]),
    promoted: new Set(["superseded"]), rejected: new Set(["proposed", "superseded"]), superseded: new Set(),
  },
};

function asDate(value: string | null | undefined) {
  return value === undefined ? undefined : value === null ? null : new Date(value);
}

async function assertReferenceCompany(db: Db, companyId: string, refs: {
  goalId?: string | null; projectId?: string | null; issueId?: string | null; agentId?: string | null; runId?: string | null;
}) {
  const checks = [
    refs.goalId ? db.select({ companyId: goals.companyId }).from(goals).where(eq(goals.id, refs.goalId)).then((rows) => ["goalId", rows[0]?.companyId] as const) : null,
    refs.projectId ? db.select({ companyId: projects.companyId }).from(projects).where(eq(projects.id, refs.projectId)).then((rows) => ["projectId", rows[0]?.companyId] as const) : null,
    refs.issueId ? db.select({ companyId: issues.companyId }).from(issues).where(eq(issues.id, refs.issueId)).then((rows) => ["issueId", rows[0]?.companyId] as const) : null,
    refs.agentId ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, refs.agentId)).then((rows) => ["agentId", rows[0]?.companyId] as const) : null,
    refs.runId ? db.select({ companyId: heartbeatRuns.companyId }).from(heartbeatRuns).where(eq(heartbeatRuns.id, refs.runId)).then((rows) => ["runId", rows[0]?.companyId] as const) : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null);
  for (const [field, referencedCompanyId] of await Promise.all(checks)) {
    if (!referencedCompanyId) throw badRequest(`${field} does not reference an existing record`);
    if (referencedCompanyId !== companyId) throw badRequest(`${field} belongs to another company`);
  }
}

function assertTransition(kind: OrganizationalObservationKind, from: string, to: string) {
  if (!STATUS_BY_KIND[kind].has(to)) throw badRequest(`Status '${to}' is not valid for ${kind}`);
  if (from !== to && !TRANSITIONS[kind][from]?.has(to)) throw conflict(`Cannot transition ${kind} from '${from}' to '${to}'`);
}

export function observationFreshUntil(row: { observedAt: Date; validUntil: Date | null; freshnessWindowHours: number | null }) {
  const byWindow = row.freshnessWindowHours
    ? new Date(row.observedAt.getTime() + row.freshnessWindowHours * 3_600_000)
    : null;
  if (row.validUntil && byWindow) return row.validUntil < byWindow ? row.validUntil : byWindow;
  return row.validUntil ?? byWindow;
}

export function organizationalObservationService(db: Db) {
  const getById = (id: string) => db.select().from(organizationalObservations)
    .where(eq(organizationalObservations.id, id)).then((rows) => rows[0] ?? null);

  return {
    getById,
    list(companyId: string, filters: ListOrganizationalObservationsQuery) {
      const conditions = [eq(organizationalObservations.companyId, companyId)];
      if (filters.kind) conditions.push(eq(organizationalObservations.kind, filters.kind));
      if (filters.status) conditions.push(eq(organizationalObservations.status, filters.status));
      if (filters.projectId) conditions.push(eq(organizationalObservations.projectId, filters.projectId));
      if (filters.issueId) conditions.push(eq(organizationalObservations.issueId, filters.issueId));
      if (filters.attention === "true") conditions.push(or(
        inArray(organizationalObservations.status, ["disputed", "contradicted", "stale"]),
        and(eq(organizationalObservations.kind, "learning"), eq(organizationalObservations.status, "validated")),
      )!);
      return db.select().from(organizationalObservations).where(and(...conditions))
        .orderBy(desc(organizationalObservations.observedAt)).limit(filters.limit);
    },

    async create(companyId: string, data: CreateOrganizationalObservation, actor: { agentId?: string | null; userId?: string | null }) {
      await assertReferenceCompany(db, companyId, data);
      const parent = data.parentObservationId ? await getById(data.parentObservationId) : null;
      if (data.parentObservationId && (!parent || parent.companyId !== companyId)) throw badRequest("parentObservationId belongs to another company or does not exist");
      const predecessor = data.supersedesId ? await getById(data.supersedesId) : null;
      if (data.supersedesId && (!predecessor || predecessor.companyId !== companyId || predecessor.kind !== data.kind)) {
        throw badRequest("supersedesId must reference an observation of the same company and kind");
      }
      const { observedAt, validUntil, ...observationData } = data;
      return db.transaction(async (tx) => {
        const created = await tx.insert(organizationalObservations).values({
          ...observationData,
          companyId,
          observedAt: new Date(observedAt),
          validUntil: asDate(validUntil),
          promotedAt: null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        }).returning().then((rows) => rows[0]);
        if (predecessor) await tx.update(organizationalObservations)
          .set({ status: "superseded", updatedAt: new Date() }).where(eq(organizationalObservations.id, predecessor.id));
        return created;
      });
    },

    async update(id: string, data: UpdateOrganizationalObservation) {
      const existing = await getById(id);
      if (!existing) return null;
      if (data.status) assertTransition(existing.kind, existing.status, data.status);
      await assertReferenceCompany(db, existing.companyId, data);
      const nextStatus = data.status ?? existing.status;
      const nextPromotionTarget = data.promotionTarget === undefined ? existing.promotionTarget : data.promotionTarget;
      if (existing.kind === "learning" && nextStatus === "promoted" && !nextPromotionTarget) {
        throw badRequest("Promoted learning requires a procedure, skill, template, eval, routine, policy, or issue target");
      }
      if (existing.kind !== "learning" && data.promotionTarget) throw badRequest("Only learning observations have promotion targets");
      if (existing.kind !== "outcome" && (data.outcomeLayer || data.outcomeResult)) throw badRequest("Only outcome observations have outcome fields");
      if (existing.kind !== "causal" && data.causalRole) throw badRequest("Only causal observations have causalRole");
      if (existing.kind !== "external_signal" && data.externalCategory) throw badRequest("Only external signals have externalCategory");
      const nextValidUntil = data.validUntil === undefined ? existing.validUntil : asDate(data.validUntil);
      const nextFreshnessWindowHours = data.freshnessWindowHours === undefined ? existing.freshnessWindowHours : data.freshnessWindowHours;
      if (existing.kind === "external_signal" && !nextValidUntil && !nextFreshnessWindowHours) {
        throw badRequest("External signals require validUntil or freshnessWindowHours");
      }
      const predecessor = data.supersedesId ? await getById(data.supersedesId) : null;
      if (data.supersedesId && (
        !predecessor || predecessor.id === existing.id || predecessor.companyId !== existing.companyId || predecessor.kind !== existing.kind
      )) throw badRequest("supersedesId must reference another observation of the same company and kind");
      const { observedAt, validUntil, ...observationData } = data;
      return db.transaction(async (tx) => {
        const updated = await tx.update(organizationalObservations).set({
          ...observationData,
          observedAt: observedAt === undefined ? undefined : new Date(observedAt),
          validUntil: asDate(validUntil),
          promotedAt: nextStatus === "promoted" ? existing.promotedAt ?? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(organizationalObservations.id, id)).returning().then((rows) => rows[0] ?? null);
        if (predecessor) await tx.update(organizationalObservations)
          .set({ status: "superseded", updatedAt: new Date() })
          .where(eq(organizationalObservations.id, predecessor.id));
        return updated;
      });
    },
  };
}
