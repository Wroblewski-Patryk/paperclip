import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  admissionControls,
  admissionControlTransitions,
  admissionDecisions,
  companies,
} from "@paperclipai/db";
import type { AgentAvailability } from "@paperclipai/shared";
import { conflict, notFound, unprocessable } from "../errors.js";
import {
  readPersistedDevServerStatus,
  shouldDrainForDevServerRestart,
} from "../dev-server-status.js";
import { instanceSettingsService } from "./instance-settings.js";

export const ADMISSION_CONTROL_STATES = ["open", "draining", "maintenance", "reopening"] as const;
export type AdmissionControlState = (typeof ADMISSION_CONTROL_STATES)[number];

const allowedTransitions: Record<AdmissionControlState, readonly AdmissionControlState[]> = {
  open: ["draining"],
  draining: ["maintenance"],
  maintenance: ["reopening"],
  reopening: ["open", "maintenance"],
};

type AdmissionEvidence = Array<Record<string, unknown>>;

export type AdmissionDecision = {
  admitted: boolean;
  disposition: "admitted" | "deferred_by_maintenance";
  controlId: string;
  controlVersion: number;
  state: AdmissionControlState;
  scopeType: "company" | "project";
  scopeId: string;
  reason: string | null;
};

export const ADMISSION_DISPOSITIONS = [
  "admitted",
  "deferred_by_maintenance",
  "needs_decision",
  "waiting_for_signal",
  "paused_by_budget",
  "rejected_as_duplicate",
  "accepted_risk",
  "not_worth_doing",
] as const;
export type AdmissionDisposition = (typeof ADMISSION_DISPOSITIONS)[number];

export type AdmissionPolicy = {
  maxRetries: number;
  maxIssueWip: number;
  maxProjectWip: number;
  maxOrganizationWip: number;
  cooldownSeconds: number;
  observationWindowSeconds: number;
  requireNewEvidenceAfterStop: boolean;
};

export const DEFAULT_ADMISSION_POLICY: AdmissionPolicy = Object.freeze({
  maxRetries: 2,
  maxIssueWip: 1,
  maxProjectWip: 1,
  maxOrganizationWip: 3,
  cooldownSeconds: 30 * 60,
  observationWindowSeconds: 60 * 60,
  requireNewEvidenceAfterStop: true,
});

type WorkAdmissionInput = {
  companyId: string;
  projectId?: string | null;
  issueId?: string | null;
  agentId?: string | null;
  source: string;
  fingerprint: string;
  evidenceHash?: string | null;
  retryCount?: number;
  expectedValue?: number | null;
  acceptedRisk?: boolean;
  budgetBlocked?: boolean;
  budgetReason?: string | null;
  allowIssueWipContinuation?: boolean;
  now?: Date;
};

export type WorkAdmissionDecision = Omit<AdmissionDecision, "disposition"> & {
  decisionId: string;
  disposition: AdmissionDisposition;
  reasonCode: string;
  retryCount: number;
  observed: Record<string, number>;
  limits: AdmissionPolicy;
  cooldownUntil: Date | null;
  observationUntil: Date | null;
};

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function resolvePolicy(raw: unknown): AdmissionPolicy {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    maxRetries: boundedInteger(value.maxRetries, DEFAULT_ADMISSION_POLICY.maxRetries, 0, 20),
    maxIssueWip: boundedInteger(value.maxIssueWip, DEFAULT_ADMISSION_POLICY.maxIssueWip, 1, 10),
    maxProjectWip: boundedInteger(value.maxProjectWip, DEFAULT_ADMISSION_POLICY.maxProjectWip, 1, 50),
    maxOrganizationWip: boundedInteger(value.maxOrganizationWip, DEFAULT_ADMISSION_POLICY.maxOrganizationWip, 1, 200),
    cooldownSeconds: boundedInteger(value.cooldownSeconds, DEFAULT_ADMISSION_POLICY.cooldownSeconds, 0, 7 * 24 * 60 * 60),
    observationWindowSeconds: boundedInteger(value.observationWindowSeconds, DEFAULT_ADMISSION_POLICY.observationWindowSeconds, 0, 30 * 24 * 60 * 60),
    requireNewEvidenceAfterStop: value.requireNewEvidenceAfterStop !== false,
  };
}

export function admissionControlService(db: Db) {
  async function ensureCompanyControl(companyId: string) {
    const company = await db
      .select({ id: companies.id, status: companies.status })
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0] ?? null);
    if (!company) throw notFound("Company not found");

    const existing = await db
      .select()
      .from(admissionControls)
      .where(
        and(
          eq(admissionControls.companyId, companyId),
          eq(admissionControls.scopeType, "company"),
          eq(admissionControls.scopeId, companyId),
        ),
      )
      .then((rows) => rows[0] ?? null);
    if (existing) return existing;

    const maintenance = company.status === "paused";
    return db
      .insert(admissionControls)
      .values({
        companyId,
        scopeType: "company",
        scopeId: companyId,
        state: maintenance ? "maintenance" : "open",
        reason: maintenance ? "legacy_company_pause" : "company_control_initialized",
        priorState: company.status,
        maintenanceStartedAt: maintenance ? new Date() : null,
        openedAt: maintenance ? null : new Date(),
      })
      .onConflictDoNothing()
      .returning()
      .then(async (rows) => rows[0] ?? db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            eq(admissionControls.scopeType, "company"),
            eq(admissionControls.scopeId, companyId),
          ),
        )
        .then((current) => current[0]!));
  }

  async function list(companyId: string) {
    await ensureCompanyControl(companyId);
    return db
      .select()
      .from(admissionControls)
      .where(eq(admissionControls.companyId, companyId));
  }

  async function getAvailability(companyId: string): Promise<AgentAvailability> {
    const control = await ensureCompanyControl(companyId);
    const [counts] = await db.execute<{
      active_run_count: number | string;
      deferred_work_count: number | string;
    }>(sql`
      select
        (select count(*) from heartbeat_runs
          where company_id = ${companyId} and status = 'running') as active_run_count,
        (select count(*) from agent_wakeup_requests
          where company_id = ${companyId} and status = 'deferred_by_maintenance') as deferred_work_count
    `);
    const state = control.state as AdmissionControlState;
    const publicState = state === "open"
      ? "on"
      : state === "maintenance"
        ? "off"
        : state;
    return {
      companyId,
      state: publicState,
      controlState: state,
      enabled: state === "open",
      acceptsNewRuns: state === "open",
      activeRunCount: Number(counts?.active_run_count ?? 0),
      deferredWorkCount: Number(counts?.deferred_work_count ?? 0),
      changedAt: control.updatedAt.toISOString(),
      changedBy: {
        actorType: control.initiatorActorType ?? null,
        actorId: control.initiatorActorId ?? null,
      },
      drainStartedAt: control.drainStartedAt?.toISOString() ?? null,
      offSince: control.maintenanceStartedAt?.toISOString() ?? null,
      openedAt: control.openedAt?.toISOString() ?? null,
      replaySnapshot: control.replaySnapshot ?? null,
    };
  }

  async function settleDraining(companyId: string) {
    const availability = await getAvailability(companyId);
    if (availability.controlState !== "draining" || availability.activeRunCount > 0) {
      return { completed: false, availability };
    }

    const control = await ensureCompanyControl(companyId);
    try {
      await transition({
        companyId,
        toState: "maintenance",
        idempotencyKey: `agent-availability-drain-complete:${control.id}:${control.version}`,
        actorType: "system",
        reason: "agent_availability_drain_complete",
        evidence: [{
          kind: "drain_snapshot",
          result: "pass",
          activeRunCount: 0,
          deferredWorkCount: availability.deferredWorkCount,
        }],
      });
      await db.update(admissionControls).set({
        drainSnapshot: {
          activeRunCount: 0,
          deferredWorkCount: availability.deferredWorkCount,
        },
        updatedAt: new Date(),
      }).where(and(
        eq(admissionControls.id, control.id),
        eq(admissionControls.state, "maintenance"),
      ));
      return { completed: true, availability: await getAvailability(companyId) };
    } catch (error) {
      const current = await getAvailability(companyId);
      if (current.controlState === "maintenance") {
        return { completed: true, availability: current };
      }
      throw error;
    }
  }

  async function settleAllDraining() {
    const rows = await db
      .select({ companyId: admissionControls.companyId })
      .from(admissionControls)
      .where(and(
        eq(admissionControls.scopeType, "company"),
        eq(admissionControls.state, "draining"),
      ));
    const results = [];
    for (const row of rows) results.push(await settleDraining(row.companyId));
    return results;
  }

  async function evaluate(companyId: string, projectId?: string | null): Promise<AdmissionDecision> {
    const companyControl = await ensureCompanyControl(companyId);
    const controls = projectId
      ? await db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            inArray(admissionControls.id, [companyControl.id]),
          ),
        )
      : [companyControl];
    let selected = controls[0] ?? companyControl;
    if (projectId) {
      const projectControl = await db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            eq(admissionControls.scopeType, "project"),
            eq(admissionControls.scopeId, projectId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (companyControl.state === "open" && projectControl) selected = projectControl;
    }
    const state = selected.state as AdmissionControlState;
    const admitted = state === "open";
    return {
      admitted,
      disposition: admitted ? "admitted" : "deferred_by_maintenance",
      controlId: selected.id,
      controlVersion: selected.version,
      state,
      scopeType: selected.scopeType as "company" | "project",
      scopeId: selected.scopeId,
      reason: selected.reason,
    };
  }

  async function evaluateWork(input: WorkAdmissionInput): Promise<WorkAdmissionDecision> {
    const stateDecision = await evaluate(input.companyId, input.projectId);
    const persistedDevServerStatus = readPersistedDevServerStatus();
    const autoRestartEnabled = persistedDevServerStatus
      ? (await instanceSettingsService(db).getExperimental()).autoRestartDevServerWhenIdle
      : false;
    const restartDrainRequired = shouldDrainForDevServerRestart(
      persistedDevServerStatus,
      autoRestartEnabled,
    );
    const control = await db
      .select({ policy: admissionControls.policy })
      .from(admissionControls)
      .where(eq(admissionControls.id, stateDecision.controlId))
      .then((rows) => rows[0] ?? null);
    const limits = resolvePolicy(control?.policy);
    const now = input.now ?? new Date();
    const retryCount = Math.max(0, Math.trunc(input.retryCount ?? 0));

    const [running] = await db.execute<{
      organization_wip: number | string;
      project_wip: number | string;
      issue_wip: number | string;
    }>(sql`
      select
        count(*) filter (where hr.status = 'running') as organization_wip,
        count(*) filter (
          where hr.status = 'running'
            and ${input.projectId ?? null}::uuid is not null
            and coalesce(hr.context_snapshot ->> 'projectId', i.project_id::text) = ${input.projectId ?? null}
        ) as project_wip,
        count(*) filter (
          where hr.status = 'running'
            and ${input.issueId ?? null}::uuid is not null
            and hr.context_snapshot ->> 'issueId' = ${input.issueId ?? null}
        ) as issue_wip
      from heartbeat_runs hr
      left join issues i
        on i.company_id = hr.company_id
       and i.id::text = hr.context_snapshot ->> 'issueId'
      where hr.company_id = ${input.companyId}
    `);
    const observed = {
      organizationWip: Number(running?.organization_wip ?? 0),
      projectWip: Number(running?.project_wip ?? 0),
      issueWip: Number(running?.issue_wip ?? 0),
    };
    const continuationWipOffset = input.allowIssueWipContinuation && observed.issueWip > 0 ? 1 : 0;
    const effectiveProjectWip = Math.max(0, observed.projectWip - continuationWipOffset);
    const effectiveOrganizationWip = Math.max(0, observed.organizationWip - continuationWipOffset);

    const previousStop = await db
      .select()
      .from(admissionDecisions)
      .where(and(
        eq(admissionDecisions.companyId, input.companyId),
        eq(admissionDecisions.fingerprint, input.fingerprint),
        inArray(admissionDecisions.disposition, [
          "needs_decision",
          "waiting_for_signal",
          "paused_by_budget",
          "rejected_as_duplicate",
          "not_worth_doing",
        ]),
        // evidence.unchanged is a derived restatement of an earlier stop, not
        // the root decision. Selecting it hides whether the root was transient
        // WIP and can keep a queue poisoned forever after capacity is free.
        ne(admissionDecisions.reasonCode, "evidence.unchanged"),
      ))
      .orderBy(desc(admissionDecisions.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    let disposition: AdmissionDisposition = "admitted";
    let reasonCode = "policy.admitted";
    let reason = "Work is within deterministic admission limits";
    let admitted = true;
    let cooldownUntil: Date | null = null;
    let observationUntil: Date | null = null;

    if (!stateDecision.admitted) {
      disposition = "deferred_by_maintenance";
      reasonCode = `control.${stateDecision.state}`;
      reason = stateDecision.reason ?? `Admission control is ${stateDecision.state}`;
      admitted = false;
    } else if (restartDrainRequired) {
      disposition = "waiting_for_signal";
      reasonCode = "runtime.restart_drain";
      reason = "A pending automatic dev-server restart is draining active work before restart";
      admitted = false;
    } else if (input.budgetBlocked) {
      disposition = "paused_by_budget";
      reasonCode = "budget.exhausted";
      reason = input.budgetReason ?? "Invocation budget is exhausted";
      admitted = false;
    } else if (retryCount > limits.maxRetries) {
      disposition = "needs_decision";
      reasonCode = "retry_budget.exhausted";
      reason = `Retry count ${retryCount} exceeds limit ${limits.maxRetries}`;
      admitted = false;
    } else if (
      limits.requireNewEvidenceAfterStop &&
      previousStop &&
      // WIP is a transient capacity observation, not a deterministic decision
      // about the value or validity of the work. Requiring a new evidence hash
      // after a WIP stop permanently poisons a queued run: once another agent
      // frees the slot, the unchanged wake signal can never be reconsidered.
      !previousStop.reasonCode.startsWith("wip.") &&
      previousStop.reasonCode !== "runtime.restart_drain" &&
      previousStop.evidenceHash === (input.evidenceHash ?? null)
    ) {
      disposition = "waiting_for_signal";
      reasonCode = "evidence.unchanged";
      reason = "A previous stop decision remains active and no new evidence was supplied";
      admitted = false;
      observationUntil = previousStop.observationUntil ?? null;
      cooldownUntil = previousStop.cooldownUntil ?? null;
    } else if (
      input.issueId &&
      !input.allowIssueWipContinuation &&
      observed.issueWip >= limits.maxIssueWip
    ) {
      disposition = "rejected_as_duplicate";
      reasonCode = "wip.issue_limit";
      reason = `Issue WIP ${observed.issueWip} reached limit ${limits.maxIssueWip}`;
      admitted = false;
    } else if (input.projectId && effectiveProjectWip >= limits.maxProjectWip) {
      disposition = "waiting_for_signal";
      reasonCode = "wip.project_limit";
      reason = `Project WIP ${effectiveProjectWip} reached limit ${limits.maxProjectWip}`;
      admitted = false;
      cooldownUntil = new Date(now.getTime() + limits.cooldownSeconds * 1000);
    } else if (effectiveOrganizationWip >= limits.maxOrganizationWip) {
      disposition = "waiting_for_signal";
      reasonCode = "wip.organization_limit";
      reason = `Organization WIP ${effectiveOrganizationWip} reached limit ${limits.maxOrganizationWip}`;
      admitted = false;
      cooldownUntil = new Date(now.getTime() + limits.cooldownSeconds * 1000);
    } else if (input.expectedValue !== undefined && input.expectedValue !== null && input.expectedValue < 0) {
      disposition = "not_worth_doing";
      reasonCode = "expected_value.negative";
      reason = `Expected value ${input.expectedValue} is below zero`;
      admitted = false;
      observationUntil = new Date(now.getTime() + limits.observationWindowSeconds * 1000);
    } else if (input.acceptedRisk) {
      disposition = "accepted_risk";
      reasonCode = "risk.explicitly_accepted";
      reason = "Risk was explicitly accepted by the governed caller";
    }

    const decisionBase = {
      ...stateDecision,
      admitted,
      disposition,
      reasonCode,
      reason,
      retryCount,
      observed,
      limits,
      cooldownUntil,
      observationUntil,
    };
    const persisted = await db.insert(admissionDecisions).values({
      companyId: input.companyId,
      projectId: input.projectId ?? null,
      issueId: input.issueId ?? null,
      agentId: input.agentId ?? null,
      admissionControlId: stateDecision.controlId,
      controlVersion: stateDecision.controlVersion,
      fingerprint: input.fingerprint,
      source: input.source,
      disposition,
      admitted,
      reasonCode,
      reason,
      evidenceHash: input.evidenceHash ?? null,
      retryCount,
      expectedValue: input.expectedValue ?? null,
      observed,
      limits,
      cooldownUntil,
      observationUntil,
    }).returning({ id: admissionDecisions.id }).then((rows) => rows[0]);
    return { ...decisionBase, decisionId: persisted.id };
  }

  async function transition(input: {
    companyId: string;
    scopeType?: "company" | "project";
    scopeId?: string;
    toState: AdmissionControlState;
    idempotencyKey: string;
    actorType: string;
    actorId?: string | null;
    reason?: string | null;
    evidence?: AdmissionEvidence;
  }) {
    const scopeType = input.scopeType ?? "company";
    const scopeId = input.scopeId ?? input.companyId;
    if (scopeType === "company" && scopeId !== input.companyId) {
      throw unprocessable("Company admission scope must use the company id as scopeId");
    }
    await ensureCompanyControl(input.companyId);

    return db.transaction(async (tx) => {
      await tx.execute(sql`
        select id from admission_controls
        where company_id = ${input.companyId}
          and scope_type = ${scopeType}
          and scope_id = ${scopeId}
        for update
      `);
      const control = await tx
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, input.companyId),
            eq(admissionControls.scopeType, scopeType),
            eq(admissionControls.scopeId, scopeId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!control) throw notFound("Admission control not found");

      const existing = await tx
        .select()
        .from(admissionControlTransitions)
        .where(
          and(
            eq(admissionControlTransitions.admissionControlId, control.id),
            eq(admissionControlTransitions.idempotencyKey, input.idempotencyKey),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (existing) return { control, transition: existing, idempotent: true };

      const fromState = control.state as AdmissionControlState;
      if (!allowedTransitions[fromState]?.includes(input.toState)) {
        throw conflict(`Illegal admission transition: ${fromState} -> ${input.toState}`);
      }
      if ((input.toState === "reopening" || input.toState === "open") && !(input.evidence?.length)) {
        throw unprocessable("Reopening transitions require inspectable safety evidence");
      }
      const now = new Date();
      const version = control.version + 1;
      const updated = await tx
        .update(admissionControls)
        .set({
          state: input.toState,
          version,
          reason: input.reason ?? control.reason,
          priorState: fromState,
          initiatorActorType: input.actorType,
          initiatorActorId: input.actorId ?? null,
          requiredEvidence: input.evidence ?? control.requiredEvidence,
          drainStartedAt: input.toState === "draining" ? now : control.drainStartedAt,
          maintenanceStartedAt: input.toState === "maintenance" ? now : control.maintenanceStartedAt,
          reopenStartedAt: input.toState === "reopening" ? now : control.reopenStartedAt,
          openedAt: input.toState === "open" ? now : control.openedAt,
          updatedAt: now,
        })
        .where(and(eq(admissionControls.id, control.id), eq(admissionControls.version, control.version)))
        .returning()
        .then((rows) => rows[0] ?? null);
      if (!updated) throw conflict("Admission control changed concurrently");

      if (scopeType === "company") {
        if (input.toState === "maintenance") {
          await tx.update(companies).set({ status: "paused", pauseReason: input.reason, pausedAt: now, updatedAt: now })
            .where(eq(companies.id, input.companyId));
        } else if (input.toState === "open") {
          await tx.update(companies).set({ status: "active", pauseReason: null, pausedAt: null, updatedAt: now })
            .where(eq(companies.id, input.companyId));
        }
      }

      const transition = await tx
        .insert(admissionControlTransitions)
        .values({
          companyId: input.companyId,
          admissionControlId: control.id,
          fromState,
          toState: input.toState,
          controlVersion: version,
          idempotencyKey: input.idempotencyKey,
          actorType: input.actorType,
          actorId: input.actorId ?? null,
          evidence: input.evidence ?? [],
          status: "committed",
          result: { state: input.toState, version },
          updatedAt: now,
        })
        .returning()
        .then((rows) => rows[0]);
      return { control: updated, transition, idempotent: false };
    });
  }

  async function recordReopenReplay(input: {
    companyId: string;
    controlId: string;
    controlVersion: number;
    reopenAttemptId: string;
    replay: Record<string, number>;
  }) {
    const now = new Date();
    const reopenResult = Number(input.replay.failed ?? 0) === 0
      ? "completed"
      : "completed_with_failures";
    const updated = await db
      .update(admissionControls)
      .set({
        replaySnapshot: input.replay,
        reopenAttemptId: input.reopenAttemptId,
        reopenResult,
        lastErrorCode: Number(input.replay.failed ?? 0) === 0 ? null : "replay_failed",
        lastErrorMessage: Number(input.replay.failed ?? 0) === 0
          ? null
          : `${input.replay.failed} deferred wakeup(s) failed during reopen replay`,
        updatedAt: now,
      })
      .where(and(
        eq(admissionControls.id, input.controlId),
        eq(admissionControls.companyId, input.companyId),
        eq(admissionControls.version, input.controlVersion),
        eq(admissionControls.state, "open"),
      ))
      .returning()
      .then((rows) => rows[0] ?? null);
    if (!updated) throw conflict("Admission control changed before replay evidence could be recorded");
    return updated;
  }

  return {
    ensureCompanyControl,
    list,
    getAvailability,
    settleDraining,
    settleAllDraining,
    evaluate,
    evaluateWork,
    transition,
    recordReopenReplay,
  };
}
