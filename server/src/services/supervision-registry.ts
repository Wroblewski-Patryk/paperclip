import { and, desc, eq, inArray, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import {
  admissionDecisions,
  agents,
  deliveryTasks,
  heartbeatRuns,
  issues,
  nativeSafeguards,
  productDeliveries,
  projects,
  supervisionCycles,
  supervisionEvidenceRefs,
  supervisionFindings,
  supervisionInterventions,
  supervisionObservationWindows,
  supervisionRecurrences,
  supervisionRootCauses,
  supervisionShadowComparisons,
  type Db,
} from "@paperclipai/db";
import type {
  CloseSupervisionRootCause,
  CompleteObservationWindow,
  CreateSupervisionShadowComparison,
  CreateNativeSafeguard,
  CreateObservationWindow,
  CreateSupervisionCycle,
  CreateSupervisionIntervention,
  CreateSupervisionRootCause,
  FinishSupervisionCycle,
  ListSupervisionFindingsQuery,
  UpdateNativeSafeguard,
  UpsertSupervisionFinding,
} from "@paperclipai/shared";
import { badRequest, conflict } from "../errors.js";

const TERMINAL_FINDING_STATUSES = [
  "resolved", "closed", "no_action", "duplicate", "accepted_risk", "not_worth_doing", "archived",
] as const;

function canonicalExternalFingerprint(companyId: string, fingerprint: string) {
  if (fingerprint === "external:orphan_execution_locks") return `orphan_execution_lock:${companyId}`;
  if (fingerprint === "external:cost_telemetry_zero_with_accepted_outcomes") return `cost_telemetry_gap:${companyId}`;
  if (fingerprint === "external:accepted_outcome_without_task") return `accepted_outcome_without_task:${companyId}`;
  if (fingerprint === "external:false_green_healthy_no_op_with_eligible_work") return `runnable_dispatch_gap:${companyId}`;
  if (["external:observation_completion_integrity_gap", "external:intervention_observation_timeout_unreconciled"].includes(fingerprint)) {
    return `observation_completion_gap:${companyId}`;
  }
  if (fingerprint === "external:failed_intervention_reauthorization_loop") return `intervention_lifecycle_gap:${companyId}`;
  return fingerprint;
}

function externalProblemClass(fingerprint: string) {
  return fingerprint
    .replace(/^external:/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 200) || "external_assurance_gap";
}

function asDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

const VOLATILE_RECURRENCE_KEYS = new Set([
  "cycleId", "checkedAt", "observedAt", "generatedAt", "timestamp", "lastSeenAt",
]);

function stableRecurrenceEvidence(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (!input || typeof input !== "object") return input;
    return Object.fromEntries(Object.entries(input as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_RECURRENCE_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalize(nested)]));
  };
  return JSON.stringify(normalize(value));
}

async function assertReferenceCompanies(db: Db, companyId: string, data: UpsertSupervisionFinding) {
  const checks = [
    data.projectId
      ? db.select({ companyId: projects.companyId }).from(projects).where(eq(projects.id, data.projectId)).then((rows) => ["projectId", rows[0]?.companyId] as const)
      : null,
    data.issueId
      ? db.select({ companyId: issues.companyId }).from(issues).where(eq(issues.id, data.issueId)).then((rows) => ["issueId", rows[0]?.companyId] as const)
      : null,
    data.deliveryId
      ? db.select({ companyId: productDeliveries.companyId }).from(productDeliveries).where(eq(productDeliveries.id, data.deliveryId)).then((rows) => ["deliveryId", rows[0]?.companyId] as const)
      : null,
    data.deliveryTaskId
      ? db.select({ companyId: deliveryTasks.companyId }).from(deliveryTasks).where(eq(deliveryTasks.id, data.deliveryTaskId)).then((rows) => ["deliveryTaskId", rows[0]?.companyId] as const)
      : null,
    data.affectedAgentId
      ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.affectedAgentId)).then((rows) => ["affectedAgentId", rows[0]?.companyId] as const)
      : null,
    data.ownerAgentId
      ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.ownerAgentId)).then((rows) => ["ownerAgentId", rows[0]?.companyId] as const)
      : null,
    data.admissionDecisionId
      ? db.select({ companyId: admissionDecisions.companyId }).from(admissionDecisions).where(eq(admissionDecisions.id, data.admissionDecisionId)).then((rows) => ["admissionDecisionId", rows[0]?.companyId] as const)
      : null,
    data.rootCauseId
      ? db.select({ companyId: supervisionRootCauses.companyId }).from(supervisionRootCauses).where(eq(supervisionRootCauses.id, data.rootCauseId)).then((rows) => ["rootCauseId", rows[0]?.companyId] as const)
      : null,
    data.nativeSafeguardId
      ? db.select({ companyId: nativeSafeguards.companyId }).from(nativeSafeguards).where(eq(nativeSafeguards.id, data.nativeSafeguardId)).then((rows) => ["nativeSafeguardId", rows[0]?.companyId] as const)
      : null,
    data.runId
      ? db.select({ companyId: heartbeatRuns.companyId }).from(heartbeatRuns).where(eq(heartbeatRuns.id, data.runId)).then((rows) => ["runId", rows[0]?.companyId] as const)
      : null,
    data.cycleId
      ? db.select({ companyId: supervisionCycles.companyId }).from(supervisionCycles).where(eq(supervisionCycles.id, data.cycleId)).then((rows) => ["cycleId", rows[0]?.companyId] as const)
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  for (const [field, referencedCompanyId] of await Promise.all(checks)) {
    if (!referencedCompanyId) throw badRequest(`${field} does not reference an existing record`);
    if (referencedCompanyId !== companyId) throw badRequest(`${field} belongs to another company`);
  }
}

async function assertCompanyReferences(
  companyId: string,
  references: Array<[string, Promise<{ companyId: string } | null> | null]>,
) {
  for (const [field, promise] of references) {
    if (!promise) continue;
    const record = await promise;
    if (!record) throw badRequest(`${field} does not reference an existing record`);
    if (record.companyId !== companyId) throw badRequest(`${field} belongs to another company`);
  }
}

export function supervisionRegistryService(db: Db) {
  const getFinding = (id: string) => db.select().from(supervisionFindings)
    .where(eq(supervisionFindings.id, id)).then((rows) => rows[0] ?? null);
  const getRootCause = (id: string) => db.select().from(supervisionRootCauses)
    .where(eq(supervisionRootCauses.id, id)).then((rows) => rows[0] ?? null);
  const getSafeguard = (id: string) => db.select().from(nativeSafeguards)
    .where(eq(nativeSafeguards.id, id)).then((rows) => rows[0] ?? null);
  const getCycle = (id: string) => db.select().from(supervisionCycles)
    .where(eq(supervisionCycles.id, id)).then((rows) => rows[0] ?? null);
  const getObservationWindow = (id: string) => db.select().from(supervisionObservationWindows)
    .where(eq(supervisionObservationWindows.id, id)).then((rows) => rows[0] ?? null);
  const getIntervention = (id: string) => db.select().from(supervisionInterventions)
    .where(eq(supervisionInterventions.id, id)).then((rows) => rows[0] ?? null);

  return {
    getFinding,
    getRootCause,
    getSafeguard,
    getCycle,
    getObservationWindow,
    getIntervention,

    markFindingAssigned(findingId: string, input: { ownerAgentId: string; admissionDecisionId: string }) {
      return db.update(supervisionFindings).set({
        status: "assigned",
        ownerAgentId: input.ownerAgentId,
        admissionDecisionId: input.admissionDecisionId,
        recoveryState: "dispatching",
        updatedAt: new Date(),
      }).where(eq(supervisionFindings.id, findingId)).returning().then((rows) => rows[0] ?? null);
    },

    resolveBottleneck(findingId: string) {
      const now = new Date();
      return db.update(supervisionFindings).set({
        status: "resolved",
        recoveryState: "healthy",
        bottleneckResolvedAt: now,
        closedAt: now,
        updatedAt: now,
      }).where(eq(supervisionFindings.id, findingId)).returning().then((rows) => rows[0] ?? null);
    },

    async resolveFindingByFingerprint(companyId: string, fingerprint: string, input: {
      sourceKind: string;
      sourceRef: string;
      label: string;
      metadata?: Record<string, unknown>;
      checkedAt: Date;
    }) {
      const existing = await db.select().from(supervisionFindings).where(and(
        eq(supervisionFindings.companyId, companyId),
        eq(supervisionFindings.fingerprint, fingerprint),
        isNull(supervisionFindings.archivedAt),
        notInArray(supervisionFindings.status, [...TERMINAL_FINDING_STATUSES]),
      )).then((rows) => rows[0] ?? null);
      if (!existing) return null;

      return db.transaction(async (tx) => {
        const resolved = await tx.update(supervisionFindings).set({
          status: "resolved",
          recoveryState: "healthy",
          closedAt: input.checkedAt,
          bottleneckResolvedAt: existing.bottleneckType ? input.checkedAt : existing.bottleneckResolvedAt,
          updatedAt: input.checkedAt,
        }).where(and(
          eq(supervisionFindings.id, existing.id),
          notInArray(supervisionFindings.status, [...TERMINAL_FINDING_STATUSES]),
        )).returning().then((rows) => rows[0] ?? null);
        if (!resolved) return null;
        await tx.insert(supervisionEvidenceRefs).values({
          companyId,
          findingId: resolved.id,
          rootCauseId: resolved.rootCauseId,
          nativeSafeguardId: resolved.nativeSafeguardId,
          sourceKind: input.sourceKind,
          sourceRef: input.sourceRef,
          label: input.label,
          metadata: input.metadata ?? {},
        });
        return resolved;
      });
    },

    listFindings(companyId: string, filters: ListSupervisionFindingsQuery) {
      const conditions = [eq(supervisionFindings.companyId, companyId)];
      if (filters.status) conditions.push(eq(supervisionFindings.status, filters.status));
      if (filters.severity) conditions.push(eq(supervisionFindings.severity, filters.severity));
      if (filters.problemClass) conditions.push(eq(supervisionFindings.problemClass, filters.problemClass));
      if (filters.ownerAgentId) conditions.push(eq(supervisionFindings.ownerAgentId, filters.ownerAgentId));
      if (filters.projectId) conditions.push(eq(supervisionFindings.projectId, filters.projectId));
      if (filters.deliveryId) conditions.push(eq(supervisionFindings.deliveryId, filters.deliveryId));
      if (filters.includeArchived !== "true") conditions.push(isNull(supervisionFindings.archivedAt));
      return db.select().from(supervisionFindings).where(and(...conditions))
        .orderBy(desc(supervisionFindings.lastSeenAt)).limit(filters.limit);
    },

    async upsertFinding(companyId: string, data: UpsertSupervisionFinding) {
      await assertReferenceCompanies(db, companyId, data);
      return db.transaction(async (tx) => {
        const timestamp = new Date();
        const inserted = await tx.insert(supervisionFindings).values({
          companyId,
          fingerprint: data.fingerprint,
          problemClass: data.problemClass,
          severity: data.severity,
          status: data.status,
          classification: data.classification,
          sourceKind: data.sourceKind,
          sourceRef: data.sourceRef,
          title: data.title,
          summary: data.summary,
          affectedComponent: data.affectedComponent,
          projectId: data.projectId,
          issueId: data.issueId,
          deliveryId: data.deliveryId,
          deliveryTaskId: data.deliveryTaskId,
          affectedAgentId: data.affectedAgentId,
          ownerAgentId: data.ownerAgentId,
          ownerUserId: data.ownerUserId,
          admissionDecisionId: data.admissionDecisionId,
          rootCauseId: data.rootCauseId,
          nativeSafeguardId: data.nativeSafeguardId,
          retryCount: data.retryCount,
          economics: data.economics,
          decision: data.decision,
          recoveryState: data.recoveryState,
          bottleneckType: data.bottleneckType,
          bottleneckStartedAt: asDate(data.bottleneckStartedAt),
          bottleneckStage: data.bottleneckStage,
          dependency: data.dependency,
          slaDueAt: asDate(data.slaDueAt),
          nextAllowedAction: data.nextAllowedAction,
          escalationCondition: data.escalationCondition,
          cooldownUntil: asDate(data.cooldownUntil),
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
        }).onConflictDoNothing({
          target: [supervisionFindings.companyId, supervisionFindings.fingerprint],
        }).returning();

        const created = inserted.length > 0;
        const existing = created ? null : await tx.select().from(supervisionFindings).where(and(
          eq(supervisionFindings.companyId, companyId),
          eq(supervisionFindings.fingerprint, data.fingerprint),
        )).then((rows) => rows[0] ?? null);
        if (!created && !existing) throw conflict("Finding deduplication conflict");
        const latestRecurrence = existing ? await tx.select().from(supervisionRecurrences).where(and(
          eq(supervisionRecurrences.companyId, companyId),
          eq(supervisionRecurrences.findingId, existing.id),
        )).orderBy(desc(supervisionRecurrences.occurredAt)).limit(1).then((rows) => rows[0] ?? null) : null;
        const materiallyChanged = created
          || (existing ? TERMINAL_FINDING_STATUSES.includes(existing.status as typeof TERMINAL_FINDING_STATUSES[number]) : false)
          || stableRecurrenceEvidence(latestRecurrence?.evidence) !== stableRecurrenceEvidence(data.recurrenceEvidence);
        if (!materiallyChanged && existing) {
          const refreshed = await tx.update(supervisionFindings).set({
            sourceKind: data.sourceKind,
            sourceRef: data.sourceRef,
            summary: data.summary,
            severity: data.severity,
            lastSeenAt: timestamp,
            updatedAt: timestamp,
          }).where(eq(supervisionFindings.id, existing.id)).returning().then((rows) => rows[0]);
          return { finding: refreshed, recurrence: null, created: false, materiallyChanged: false };
        }
        const finding = created ? inserted[0] : await tx.update(supervisionFindings).set({
          problemClass: data.problemClass,
          severity: data.severity,
          status: data.status,
          classification: data.classification,
          sourceKind: data.sourceKind,
          sourceRef: data.sourceRef,
          title: data.title,
          summary: data.summary,
          affectedComponent: data.affectedComponent,
          projectId: data.projectId ?? sql`${supervisionFindings.projectId}`,
          issueId: data.issueId ?? sql`${supervisionFindings.issueId}`,
          deliveryId: data.deliveryId ?? sql`${supervisionFindings.deliveryId}`,
          deliveryTaskId: data.deliveryTaskId ?? sql`${supervisionFindings.deliveryTaskId}`,
          affectedAgentId: data.affectedAgentId ?? sql`${supervisionFindings.affectedAgentId}`,
          ownerAgentId: data.ownerAgentId ?? sql`${supervisionFindings.ownerAgentId}`,
          ownerUserId: data.ownerUserId ?? sql`${supervisionFindings.ownerUserId}`,
          admissionDecisionId: data.admissionDecisionId ?? sql`${supervisionFindings.admissionDecisionId}`,
          rootCauseId: data.rootCauseId ?? sql`${supervisionFindings.rootCauseId}`,
          nativeSafeguardId: data.nativeSafeguardId ?? sql`${supervisionFindings.nativeSafeguardId}`,
          retryCount: data.retryCount,
          economics: data.economics,
          decision: data.decision,
          recoveryState: data.recoveryState,
          bottleneckType: data.bottleneckType,
          bottleneckStartedAt: asDate(data.bottleneckStartedAt),
          bottleneckStage: data.bottleneckStage,
          dependency: data.dependency,
          slaDueAt: asDate(data.slaDueAt),
          nextAllowedAction: data.nextAllowedAction,
          escalationCondition: data.escalationCondition,
          bottleneckResolvedAt: null,
          cooldownUntil: asDate(data.cooldownUntil),
          occurrenceCount: sql`${supervisionFindings.occurrenceCount} + 1`,
          recurrenceCount: sql`${supervisionFindings.recurrenceCount} + 1`,
          lastSeenAt: timestamp,
          closedAt: null,
          archivedAt: null,
          updatedAt: timestamp,
        }).where(and(
          eq(supervisionFindings.companyId, companyId),
          eq(supervisionFindings.fingerprint, data.fingerprint),
        )).returning().then((rows) => rows[0]);

        if (!finding) throw conflict("Finding deduplication conflict");
        const recurrence = await tx.insert(supervisionRecurrences).values({
          companyId,
          findingId: finding.id,
          rootCauseId: finding.rootCauseId,
          runId: data.runId,
          cycleId: data.cycleId,
          issueId: data.issueId,
          fingerprint: data.fingerprint,
          evidence: data.recurrenceEvidence,
          occurredAt: timestamp,
        }).returning().then((rows) => rows[0]);

        if (data.evidence.length > 0) {
          await tx.insert(supervisionEvidenceRefs).values(data.evidence.map((evidence) => ({
            companyId,
            findingId: finding.id,
            rootCauseId: finding.rootCauseId,
            cycleId: data.cycleId,
            sourceKind: evidence.sourceKind,
            sourceRef: evidence.sourceRef,
            label: evidence.label,
            metadata: evidence.metadata,
          })));
        }
        return { finding, recurrence, created, materiallyChanged: true };
      });
    },

    async createRootCause(companyId: string, data: CreateSupervisionRootCause) {
      await assertCompanyReferences(companyId, [
        ["ownerAgentId", data.ownerAgentId ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.ownerAgentId)).then((rows) => rows[0] ?? null) : null],
        ["projectId", data.projectId ? db.select({ companyId: projects.companyId }).from(projects).where(eq(projects.id, data.projectId)).then((rows) => rows[0] ?? null) : null],
        ["issueId", data.issueId ? db.select({ companyId: issues.companyId }).from(issues).where(eq(issues.id, data.issueId)).then((rows) => rows[0] ?? null) : null],
      ]);
      const inserted = await db.insert(supervisionRootCauses).values({
        ...data,
        companyId,
        confirmedAt: data.status === "confirmed" ? new Date() : null,
      }).onConflictDoNothing({
        target: [supervisionRootCauses.companyId, supervisionRootCauses.fingerprint],
      }).returning();
      if (inserted[0]) return { rootCause: inserted[0], created: true };
      const existing = await db.select().from(supervisionRootCauses).where(and(
        eq(supervisionRootCauses.companyId, companyId),
        eq(supervisionRootCauses.fingerprint, data.fingerprint),
      )).then((rows) => rows[0]);
      return { rootCause: existing, created: false };
    },

    async linkFindingRootCause(findingId: string, rootCauseId: string) {
      const [finding, rootCause] = await Promise.all([getFinding(findingId), getRootCause(rootCauseId)]);
      if (!finding || !rootCause) return null;
      if (finding.companyId !== rootCause.companyId) throw badRequest("Finding and root cause must belong to the same company");
      return db.update(supervisionFindings).set({ rootCauseId, updatedAt: new Date() })
        .where(eq(supervisionFindings.id, findingId)).returning().then((rows) => rows[0] ?? null);
    },

    async createSafeguard(companyId: string, data: CreateNativeSafeguard) {
      await assertCompanyReferences(companyId, [
        ["ownerAgentId", data.ownerAgentId ? db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.ownerAgentId)).then((rows) => rows[0] ?? null) : null],
        ["rootCauseId", data.rootCauseId ? db.select({ companyId: supervisionRootCauses.companyId }).from(supervisionRootCauses).where(eq(supervisionRootCauses.id, data.rootCauseId)).then((rows) => rows[0] ?? null) : null],
      ]);
      const inserted = await db.insert(nativeSafeguards).values({ ...data, companyId })
        .onConflictDoNothing({ target: [nativeSafeguards.companyId, nativeSafeguards.key] }).returning();
      if (inserted[0]) return { safeguard: inserted[0], created: true };
      const existing = await db.select().from(nativeSafeguards).where(and(
        eq(nativeSafeguards.companyId, companyId), eq(nativeSafeguards.key, data.key),
      )).then((rows) => rows[0]);
      return { safeguard: existing, created: false };
    },

    async updateSafeguard(id: string, data: UpdateNativeSafeguard) {
      const existing = await db.select().from(nativeSafeguards).where(eq(nativeSafeguards.id, id)).then((rows) => rows[0] ?? null);
      if (!existing) return null;
      if (data.status === "verified" && (!data.enabled && !existing.enabled)) {
        throw conflict("A verified safeguard must be enabled");
      }
      return db.update(nativeSafeguards).set({
        ...data,
        verifiedAt: data.status === "verified" ? existing.verifiedAt ?? new Date() : existing.verifiedAt,
        retiredAt: data.status === "retired" ? existing.retiredAt ?? new Date() : existing.retiredAt,
        version: sql`${nativeSafeguards.version} + 1`,
        updatedAt: new Date(),
      }).where(eq(nativeSafeguards.id, id)).returning().then((rows) => rows[0] ?? null);
    },

    async createCycle(companyId: string, data: CreateSupervisionCycle) {
      const inserted = await db.insert(supervisionCycles).values({
        ...data,
        companyId,
        expiresAt: asDate(data.expiresAt),
      }).onConflictDoNothing({
        target: [supervisionCycles.companyId, supervisionCycles.sourceKind, supervisionCycles.externalCycleId],
      }).returning();
      if (inserted[0]) return { cycle: inserted[0], created: true };
      const existing = await db.select().from(supervisionCycles).where(and(
        eq(supervisionCycles.companyId, companyId),
        eq(supervisionCycles.sourceKind, data.sourceKind),
        eq(supervisionCycles.externalCycleId, data.externalCycleId),
      )).then((rows) => rows[0]);
      return { cycle: existing, created: false };
    },

    async finishCycle(id: string, data: FinishSupervisionCycle) {
      return db.update(supervisionCycles).set({
        status: data.status,
        metrics: data.metrics,
        summary: data.summary,
        finishedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(
        eq(supervisionCycles.id, id),
        sql`(${supervisionCycles.status} = 'running' or (${supervisionCycles.status} = ${data.status} and ${supervisionCycles.finishedAt} is null))`,
      ))
        .returning().then((rows) => rows[0] ?? null);
    },

    async recoverExpiredCycles(companyId: string) {
      const now = new Date();
      return db.update(supervisionCycles).set({ status: "expired", finishedAt: now, updatedAt: now })
        .where(and(
          eq(supervisionCycles.companyId, companyId),
          eq(supervisionCycles.status, "running"),
          lte(supervisionCycles.expiresAt, now),
        )).returning();
    },

    async createIntervention(companyId: string, data: CreateSupervisionIntervention) {
      const finding = await getFinding(data.findingId);
      if (!finding || finding.companyId !== companyId) throw badRequest("findingId must belong to the intervention company");
      await assertCompanyReferences(companyId, [
        ["admissionDecisionId", db.select({ companyId: admissionDecisions.companyId }).from(admissionDecisions).where(eq(admissionDecisions.id, data.admissionDecisionId)).then((rows) => rows[0] ?? null)],
        ["rootCauseId", data.rootCauseId ? db.select({ companyId: supervisionRootCauses.companyId }).from(supervisionRootCauses).where(eq(supervisionRootCauses.id, data.rootCauseId)).then((rows) => rows[0] ?? null) : null],
        ["cycleId", data.cycleId ? db.select({ companyId: supervisionCycles.companyId }).from(supervisionCycles).where(eq(supervisionCycles.id, data.cycleId)).then((rows) => rows[0] ?? null) : null],
        ["issueId", data.issueId ? db.select({ companyId: issues.companyId }).from(issues).where(eq(issues.id, data.issueId)).then((rows) => rows[0] ?? null) : null],
        ["deliveryId", data.deliveryId ? db.select({ companyId: productDeliveries.companyId }).from(productDeliveries).where(eq(productDeliveries.id, data.deliveryId)).then((rows) => rows[0] ?? null) : null],
        ["ownerAgentId", db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.ownerAgentId)).then((rows) => rows[0] ?? null)],
      ]);
      const idempotencyKey = typeof data.budget.idempotencyKey === "string"
        ? data.budget.idempotencyKey.trim()
        : "";
      return db.transaction(async (tx) => {
        if (idempotencyKey) {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${companyId}:${idempotencyKey}`}))`);
          const existing = await tx.select().from(supervisionInterventions).where(and(
            eq(supervisionInterventions.companyId, companyId),
            sql`${supervisionInterventions.budget}->>'idempotencyKey' = ${idempotencyKey}`,
          )).limit(1).then((rows) => rows[0] ?? null);
          if (existing) return existing;
        }
        return tx.insert(supervisionInterventions).values({ ...data, companyId })
          .returning().then((rows) => rows[0]);
      });
    },

    async updateIntervention(id: string, input: {
      status: "authorized" | "in_progress" | "verified" | "failed" | "escalated";
      result?: Record<string, unknown>;
      evidence?: Array<{ sourceKind: string; sourceRef: string; label?: string | null; metadata?: Record<string, unknown> }>;
    }) {
      const existing = await getIntervention(id);
      if (!existing) return null;
      const now = new Date();
      const terminal = ["verified", "failed", "escalated"].includes(input.status);
      return db.transaction(async (tx) => {
        const intervention = await tx.update(supervisionInterventions).set({
          status: input.status,
          result: { ...(existing.result as Record<string, unknown>), ...(input.result ?? {}) },
          startedAt: input.status === "in_progress" ? existing.startedAt ?? now : existing.startedAt,
          completedAt: terminal ? now : existing.completedAt,
          updatedAt: now,
        }).where(eq(supervisionInterventions.id, id)).returning().then((rows) => rows[0] ?? null);
        if (intervention && input.evidence?.length) {
          await tx.insert(supervisionEvidenceRefs).values(input.evidence.map((evidence) => ({
            companyId: existing.companyId,
            findingId: existing.findingId,
            rootCauseId: existing.rootCauseId,
            interventionId: existing.id,
            cycleId: existing.cycleId,
            sourceKind: evidence.sourceKind,
            sourceRef: evidence.sourceRef,
            label: evidence.label,
            metadata: evidence.metadata ?? {},
          })));
        }
        return intervention;
      });
    },

    async createObservationWindow(companyId: string, data: CreateObservationWindow) {
      const finding = await getFinding(data.findingId);
      if (!finding || finding.companyId !== companyId) throw badRequest("findingId must belong to the observation company");
      await assertCompanyReferences(companyId, [
        ["interventionId", data.interventionId ? db.select({ companyId: supervisionInterventions.companyId }).from(supervisionInterventions).where(eq(supervisionInterventions.id, data.interventionId)).then((rows) => rows[0] ?? null) : null],
        ["nativeSafeguardId", data.nativeSafeguardId ? db.select({ companyId: nativeSafeguards.companyId }).from(nativeSafeguards).where(eq(nativeSafeguards.id, data.nativeSafeguardId)).then((rows) => rows[0] ?? null) : null],
      ]);
      return db.transaction(async (tx) => {
        const window = await tx.insert(supervisionObservationWindows).values({
          ...data,
          companyId,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
        }).returning().then((rows) => rows[0]);
        await tx.update(supervisionFindings).set({ status: "observing", updatedAt: new Date() })
          .where(eq(supervisionFindings.id, data.findingId));
        return window;
      });
    },

    async completeObservationWindow(id: string, data: CompleteObservationWindow) {
      const existing = await db.select().from(supervisionObservationWindows)
        .where(eq(supervisionObservationWindows.id, id)).then((rows) => rows[0] ?? null);
      if (!existing) return null;
      return db.transaction(async (tx) => {
        const window = await tx.update(supervisionObservationWindows).set({
          ...data,
          observedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(supervisionObservationWindows.id, id)).returning().then((rows) => rows[0]);
        await tx.update(supervisionFindings).set({
          status: data.status === "passed" ? "verified" : "needs_decision",
          updatedAt: new Date(),
        }).where(eq(supervisionFindings.id, existing.findingId));
        return window;
      });
    },

    async closeRootCause(rootCauseId: string, data: CloseSupervisionRootCause) {
      const [rootCause, safeguard] = await Promise.all([
        getRootCause(rootCauseId),
        db.select().from(nativeSafeguards).where(eq(nativeSafeguards.id, data.nativeSafeguardId)).then((rows) => rows[0] ?? null),
      ]);
      if (!rootCause) return null;
      if (!safeguard || safeguard.companyId !== rootCause.companyId || safeguard.status !== "verified" || !safeguard.enabled) {
        throw conflict("Root cause closure requires an enabled, verified native safeguard in the same company");
      }
      const passedObservation = await db.select({ id: supervisionObservationWindows.id })
        .from(supervisionObservationWindows).innerJoin(
          supervisionFindings,
          eq(supervisionObservationWindows.findingId, supervisionFindings.id),
        ).where(and(
          eq(supervisionFindings.rootCauseId, rootCauseId),
          eq(supervisionObservationWindows.nativeSafeguardId, safeguard.id),
          eq(supervisionObservationWindows.status, "passed"),
        )).limit(1).then((rows) => rows[0] ?? null);
      if (!passedObservation) throw conflict("Root cause closure requires a passed observation window for the verified safeguard");

      const now = new Date();
      const retainedUntil = new Date(now.getTime() + data.retentionDays * 86_400_000);
      return db.transaction(async (tx) => {
        const root = await tx.update(supervisionRootCauses).set({
          status: "resolved", resolution: data.resolution, resolvedAt: now, retainedUntil, updatedAt: now,
        }).where(eq(supervisionRootCauses.id, rootCauseId)).returning().then((rows) => rows[0]);
        const findings = await tx.update(supervisionFindings).set({
          status: "closed", nativeSafeguardId: safeguard.id, closedAt: now, retainedUntil, updatedAt: now,
        }).where(and(
          eq(supervisionFindings.rootCauseId, rootCauseId),
          ne(supervisionFindings.status, "archived"),
        )).returning();
        if (findings.length > 0) {
          await tx.insert(supervisionEvidenceRefs).values(findings.flatMap((finding) => data.evidence.map((evidence) => ({
            companyId: rootCause.companyId,
            findingId: finding.id,
            rootCauseId,
            nativeSafeguardId: safeguard.id,
            sourceKind: evidence.sourceKind,
            sourceRef: evidence.sourceRef,
            label: evidence.label,
            metadata: evidence.metadata,
          }))));
        }
        return { rootCause: root, closedFindings: findings };
      });
    },

    async archiveExpired(companyId: string) {
      const now = new Date();
      return db.update(supervisionFindings).set({ status: "archived", archivedAt: now, updatedAt: now })
        .where(and(
          eq(supervisionFindings.companyId, companyId),
          inArray(supervisionFindings.status, [...TERMINAL_FINDING_STATUSES]),
          lte(supervisionFindings.retainedUntil, now),
          isNull(supervisionFindings.archivedAt),
        )).returning();
    },

    listShadowComparisons(companyId: string) {
      return db.select().from(supervisionShadowComparisons)
        .where(eq(supervisionShadowComparisons.companyId, companyId))
        .orderBy(desc(supervisionShadowComparisons.comparedAt)).limit(200);
    },

    async compareExternalAssurance(companyId: string, data: CreateSupervisionShadowComparison) {
      if (data.nativeCycleId) {
        const cycle = await getCycle(data.nativeCycleId);
        if (!cycle || cycle.companyId !== companyId) throw badRequest("nativeCycleId must belong to the comparison company");
      }
      const existing = await db.select().from(supervisionShadowComparisons).where(and(
        eq(supervisionShadowComparisons.companyId, companyId),
        eq(supervisionShadowComparisons.externalSource, data.externalSource),
        eq(supervisionShadowComparisons.externalCycleId, data.externalCycleId),
      )).then((rows) => rows[0] ?? null);
      if (existing) return { comparison: existing, created: false };
      const native = await db.select({ fingerprint: supervisionFindings.fingerprint, severity: supervisionFindings.severity })
        .from(supervisionFindings).where(and(
          eq(supervisionFindings.companyId, companyId),
          isNull(supervisionFindings.archivedAt),
          notInArray(supervisionFindings.status, ["closed", "resolved", "no_action", "duplicate", "accepted_risk", "not_worth_doing"]),
        ));
      const nativeMap = new Map(native.map((finding) => [finding.fingerprint, finding.severity]));
      const externalDetails = new Map(data.externalFindings.map((finding) => [
        canonicalExternalFingerprint(companyId, finding.fingerprint),
        finding,
      ] as const));
      const externalMap = new Map([...externalDetails].map(([fingerprint, finding]) => [fingerprint, finding.severity] as const));
      const matchedFingerprints = [...nativeMap.keys()].filter((fingerprint) => externalMap.has(fingerprint)).sort();
      const onlyNative = [...nativeMap.keys()].filter((fingerprint) => !externalMap.has(fingerprint)).sort();
      const onlyExternal = [...externalMap.keys()].filter((fingerprint) => !nativeMap.has(fingerprint)).sort();
      const severityMismatches = matchedFingerprints
        .filter((fingerprint) => nativeMap.get(fingerprint) !== externalMap.get(fingerprint))
        .map((fingerprint) => ({ fingerprint, nativeSeverity: nativeMap.get(fingerprint), externalSeverity: externalMap.get(fingerprint) }));
      const comparison = await db.insert(supervisionShadowComparisons).values({
        companyId, externalSource: data.externalSource, externalCycleId: data.externalCycleId,
        nativeCycleId: data.nativeCycleId,
        status: onlyExternal.length === 0 && severityMismatches.length === 0 ? "aligned" : "attention_required",
        matchedFingerprints, onlyNative, onlyExternal, severityMismatches,
        metrics: { nativeCount: native.length, externalCount: externalMap.size, matchedCount: matchedFingerprints.length, onlyNativeCount: onlyNative.length, onlyExternalCount: onlyExternal.length, severityMismatchCount: severityMismatches.length },
      }).returning().then((rows) => rows[0]);
      const absorbedFindings: string[] = [];
      for (const fingerprint of onlyExternal) {
        const external = externalDetails.get(fingerprint);
        if (!external) continue;
        const absorbed = await supervisionRegistryService(db).upsertFinding(companyId, {
          fingerprint,
          problemClass: externalProblemClass(fingerprint),
          severity: external.severity,
          status: "admission_pending",
          classification: "external_assurance",
          sourceKind: "external_assurance",
          sourceRef: `supervision_shadow_comparison:${comparison.id}`,
          title: external.title ?? `External assurance gap: ${externalProblemClass(fingerprint)}`,
          summary: `External assurance detected a condition that had no native finding. The native control plane absorbed it for bounded diagnosis and must add or verify a deterministic detector before closure. Source: ${data.externalSource}.`,
          affectedComponent: "supervision_integrity",
          projectId: null,
          issueId: null,
          deliveryId: null,
          deliveryTaskId: null,
          affectedAgentId: null,
          ownerAgentId: null,
          ownerUserId: null,
          admissionDecisionId: null,
          rootCauseId: null,
          nativeSafeguardId: null,
          retryCount: 0,
          economics: { risk: external.severity, retryBudget: 1, stopBoundary: "Require a native detector or an explicit governed disposition; do not create a parallel external backlog." },
          decision: {
            externalInterventionRequired: true,
            externalSource: data.externalSource,
            externalCycleId: data.externalCycleId,
            shadowComparisonId: comparison.id,
            requiredClosureEvidence: ["native_detector", "root_cause_or_disposition", "regression_test"],
          },
          recoveryState: "detected",
          evidence: [{
            sourceKind: "supervision_shadow_comparison",
            sourceRef: `supervision_shadow_comparison:${comparison.id}`,
            label: external.title ?? fingerprint,
            metadata: { externalSource: data.externalSource, externalCycleId: data.externalCycleId, originalFingerprint: external.fingerprint },
          }],
          recurrenceEvidence: { detector: "external-assurance-absorption", shadowComparisonId: comparison.id },
          runId: null,
          cycleId: data.nativeCycleId,
        });
        absorbedFindings.push(absorbed.finding.id);
      }
      return { comparison, created: true, absorbedFindings };
    },

    async snapshot(companyId: string) {
      const [findings, rootCauses, interventions, cycles, safeguards, recurrences, observationWindows, evidenceRefs, shadowComparisons] = await Promise.all([
        db.select().from(supervisionFindings).where(eq(supervisionFindings.companyId, companyId)).orderBy(desc(supervisionFindings.updatedAt)).limit(1000),
        db.select().from(supervisionRootCauses).where(eq(supervisionRootCauses.companyId, companyId)).orderBy(desc(supervisionRootCauses.updatedAt)).limit(1000),
        db.select().from(supervisionInterventions).where(eq(supervisionInterventions.companyId, companyId)).orderBy(desc(supervisionInterventions.updatedAt)).limit(1000),
        db.select().from(supervisionCycles).where(eq(supervisionCycles.companyId, companyId)).orderBy(desc(supervisionCycles.startedAt)).limit(500),
        db.select().from(nativeSafeguards).where(eq(nativeSafeguards.companyId, companyId)).orderBy(desc(nativeSafeguards.updatedAt)).limit(1000),
        db.select().from(supervisionRecurrences).where(eq(supervisionRecurrences.companyId, companyId)).orderBy(desc(supervisionRecurrences.occurredAt)).limit(2000),
        db.select().from(supervisionObservationWindows).where(eq(supervisionObservationWindows.companyId, companyId)).orderBy(desc(supervisionObservationWindows.endsAt)).limit(1000),
        db.select().from(supervisionEvidenceRefs).where(eq(supervisionEvidenceRefs.companyId, companyId)).orderBy(desc(supervisionEvidenceRefs.createdAt)).limit(5000),
        db.select().from(supervisionShadowComparisons).where(eq(supervisionShadowComparisons.companyId, companyId)).orderBy(desc(supervisionShadowComparisons.comparedAt)).limit(200),
      ]);
      return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        companyId,
        sourceOfTruth: "postgresql",
        findings,
        rootCauses,
        interventions,
        cycles,
        nativeSafeguards: safeguards,
        recurrences,
        observationWindows,
        evidenceReferences: evidenceRefs,
        shadowComparisons,
      };
    },
  };
}
