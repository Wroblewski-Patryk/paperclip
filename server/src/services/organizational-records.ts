import { and, desc, eq, inArray, isNotNull, lte, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, goals, issues, organizationalRecords, projects } from "@paperclipai/db";
import type {
  CreateOrganizationalRecord,
  ListOrganizationalRecordsQuery,
  OrganizationalRecordKind,
  OrganizationalRecordStatus,
  UpdateOrganizationalRecord,
} from "@paperclipai/shared";
import { badRequest, conflict } from "../errors.js";

const STATUS_BY_KIND: Record<OrganizationalRecordKind, ReadonlySet<string>> = {
  assumption: new Set(["proposed", "active", "validated", "contradicted", "expired", "superseded"]),
  commitment: new Set(["proposed", "active", "fulfilled", "breached", "renegotiated", "cancelled", "superseded"]),
  decision: new Set(["proposed", "accepted", "rejected", "reversed", "superseded"]),
};

const TRANSITIONS: Record<OrganizationalRecordKind, Record<string, ReadonlySet<string>>> = {
  assumption: {
    proposed: new Set(["active", "validated", "contradicted", "expired", "superseded"]),
    active: new Set(["validated", "contradicted", "expired", "superseded"]),
    validated: new Set(["superseded"]),
    contradicted: new Set(["active", "superseded"]),
    expired: new Set(["active", "superseded"]),
    superseded: new Set(),
  },
  commitment: {
    proposed: new Set(["active", "cancelled", "superseded"]),
    active: new Set(["fulfilled", "breached", "renegotiated", "cancelled", "superseded"]),
    fulfilled: new Set(["superseded"]),
    breached: new Set(["renegotiated", "superseded"]),
    renegotiated: new Set(["superseded"]),
    cancelled: new Set(["superseded"]),
    superseded: new Set(),
  },
  decision: {
    proposed: new Set(["accepted", "rejected", "superseded"]),
    accepted: new Set(["reversed", "superseded"]),
    rejected: new Set(["superseded"]),
    reversed: new Set(["superseded"]),
    superseded: new Set(),
  },
};

const RESOLVED_STATUSES = new Set([
  "validated", "contradicted", "expired", "fulfilled", "breached", "renegotiated",
  "cancelled", "accepted", "rejected", "reversed", "superseded",
]);

function asDate(value: string | null | undefined) {
  return value === undefined ? undefined : value === null ? null : new Date(value);
}

function assertStatusForKind(kind: OrganizationalRecordKind, status: string) {
  if (!STATUS_BY_KIND[kind].has(status)) {
    throw badRequest(`Status '${status}' is not valid for ${kind}`);
  }
}

function assertTransition(kind: OrganizationalRecordKind, from: string, to: string) {
  assertStatusForKind(kind, to);
  if (from === to) return;
  if (!TRANSITIONS[kind][from]?.has(to)) {
    throw conflict(`Cannot transition ${kind} from '${from}' to '${to}'`);
  }
}

async function assertReferenceCompany(
  db: Db,
  companyId: string,
  refs: { ownerAgentId?: string | null; goalId?: string | null; projectId?: string | null; issueId?: string | null },
) {
  const checks = [
    refs.ownerAgentId
      ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, refs.ownerAgentId)).then((rows) => ["ownerAgentId", rows[0]?.companyId] as const)
      : null,
    refs.goalId
      ? db.select({ companyId: goals.companyId }).from(goals).where(eq(goals.id, refs.goalId)).then((rows) => ["goalId", rows[0]?.companyId] as const)
      : null,
    refs.projectId
      ? db.select({ companyId: projects.companyId }).from(projects).where(eq(projects.id, refs.projectId)).then((rows) => ["projectId", rows[0]?.companyId] as const)
      : null,
    refs.issueId
      ? db.select({ companyId: issues.companyId }).from(issues).where(eq(issues.id, refs.issueId)).then((rows) => ["issueId", rows[0]?.companyId] as const)
      : null,
  ].filter((check): check is NonNullable<typeof check> => check !== null);

  for (const [field, referencedCompanyId] of await Promise.all(checks)) {
    if (!referencedCompanyId) throw badRequest(`${field} does not reference an existing record`);
    if (referencedCompanyId !== companyId) throw badRequest(`${field} belongs to another company`);
  }
}

export function organizationalRecordService(db: Db) {
  return {
    list(companyId: string, filters: ListOrganizationalRecordsQuery) {
      const now = new Date();
      const conditions = [eq(organizationalRecords.companyId, companyId)];
      if (filters.kind) conditions.push(eq(organizationalRecords.kind, filters.kind));
      if (filters.status) conditions.push(eq(organizationalRecords.status, filters.status as OrganizationalRecordStatus));
      if (filters.ownerAgentId) conditions.push(eq(organizationalRecords.ownerAgentId, filters.ownerAgentId));
      if (filters.goalId) conditions.push(eq(organizationalRecords.goalId, filters.goalId));
      if (filters.projectId) conditions.push(eq(organizationalRecords.projectId, filters.projectId));
      if (filters.issueId) conditions.push(eq(organizationalRecords.issueId, filters.issueId));
      if (filters.attention === "true") {
        conditions.push(or(
          inArray(organizationalRecords.status, ["contradicted", "breached"]),
          and(isNotNull(organizationalRecords.reviewAt), lte(organizationalRecords.reviewAt, now)),
          and(isNotNull(organizationalRecords.dueAt), lte(organizationalRecords.dueAt, now)),
          and(isNotNull(organizationalRecords.expiresAt), lte(organizationalRecords.expiresAt, now)),
        )!);
      }
      return db.select().from(organizationalRecords)
        .where(and(...conditions))
        .orderBy(desc(organizationalRecords.updatedAt))
        .limit(filters.limit);
    },

    getById(id: string) {
      return db.select().from(organizationalRecords).where(eq(organizationalRecords.id, id))
        .then((rows) => rows[0] ?? null);
    },

    async create(
      companyId: string,
      data: CreateOrganizationalRecord,
      actor: { agentId?: string | null; userId?: string | null },
    ) {
      await assertReferenceCompany(db, companyId, data);
      const predecessor = data.supersedesId
        ? await db.select().from(organizationalRecords).where(eq(organizationalRecords.id, data.supersedesId)).then((rows) => rows[0] ?? null)
        : null;
      if (data.supersedesId && (!predecessor || predecessor.companyId !== companyId || predecessor.kind !== data.kind)) {
        throw badRequest("supersedesId must reference a record of the same company and kind");
      }

      return db.transaction(async (tx) => {
        const { dueAt, reviewAt, expiresAt, ...recordData } = data;
        const createdAt = new Date();
        const defaultReviewAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const defaultAssumptionExpiry = new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000);
        const created = await tx.insert(organizationalRecords).values({
          ...recordData,
          dueAt: asDate(dueAt),
          reviewAt: reviewAt == null && !RESOLVED_STATUSES.has(data.status)
            ? defaultReviewAt
            : asDate(reviewAt),
          expiresAt: expiresAt == null && data.kind === "assumption"
            ? defaultAssumptionExpiry
            : asDate(expiresAt),
          companyId,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
          resolvedAt: RESOLVED_STATUSES.has(data.status) ? createdAt : null,
        }).returning().then((rows) => rows[0]);
        if (predecessor) {
          await tx.update(organizationalRecords).set({ status: "superseded", resolvedAt: new Date(), updatedAt: new Date() })
            .where(eq(organizationalRecords.id, predecessor.id));
        }
        return created;
      });
    },

    async update(id: string, data: UpdateOrganizationalRecord) {
      const existing = await this.getById(id);
      if (!existing) return null;
      if (data.status) assertTransition(existing.kind, existing.status, data.status);
      await assertReferenceCompany(db, existing.companyId, data);
      let predecessor: typeof existing | null = null;
      if (data.supersedesId) {
        if (data.supersedesId === existing.id) throw badRequest("A record cannot supersede itself");
        predecessor = await this.getById(data.supersedesId);
        if (!predecessor || predecessor.companyId !== existing.companyId || predecessor.kind !== existing.kind) {
          throw badRequest("supersedesId must reference a record of the same company and kind");
        }
      }
      const nextStatus = data.status ?? existing.status;
      const { dueAt, reviewAt, expiresAt, ...recordData } = data;
      return db.transaction(async (tx) => {
        const updated = await tx.update(organizationalRecords).set({
          ...recordData,
          dueAt: asDate(dueAt),
          reviewAt: asDate(reviewAt),
          expiresAt: asDate(expiresAt),
          resolvedAt: RESOLVED_STATUSES.has(nextStatus) ? existing.resolvedAt ?? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(organizationalRecords.id, id)).returning().then((rows) => rows[0] ?? null);
        if (predecessor && predecessor.status !== "superseded") {
          await tx.update(organizationalRecords).set({ status: "superseded", resolvedAt: new Date(), updatedAt: new Date() })
            .where(eq(organizationalRecords.id, predecessor.id));
        }
        return updated;
      });
    },
  };
}
