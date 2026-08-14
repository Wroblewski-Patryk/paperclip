import { createHash } from "node:crypto";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  autonomyDecisionEvaluations,
  autonomyDecisions,
  autonomyEnvelopes,
  autonomyExecutions,
  autonomyCanaryAuthorizations,
  autonomyInterrupts,
  goals,
  issueIntents,
  issues,
  learnedPolicies,
  operationalConstraints,
  policyExceptions,
} from "@paperclipai/db";
import type {
  AutonomyDecisionMode,
  AutonomyDecisionVector,
  ExpectedOutcomeContract,
  NextLegalAction,
  NextLegalActionProjection,
} from "@paperclipai/shared";
import { nextLegalActionService } from "./next-legal-action.js";
import { logActivity } from "./activity-log.js";

const DEFAULT_ACTION_CLASS = "dispatch_existing_issue";
const DECISION_MODEL_VERSION = "work-selection-v2.1";
const CALIBRATION_COHORT = "work-selection-v2.1";
const TERMINAL_ISSUE_STATES = ["done", "cancelled"];

export function autonomySqlTimestamp(value: Date | string) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`Invalid autonomy SQL timestamp: ${String(value)}`);
  }
  return timestamp.toISOString();
}

export function determineAutonomyDisposition(input: {
  hasCandidate: boolean;
  goalStatus: string | null;
  staleHours: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  costCoverage: "KNOWN_ZERO" | "NONZERO" | "PARTIAL" | "UNKNOWN";
  mode: AutonomyDecisionMode;
  intentStatus?: string | null;
  boundedCostAuthority?: boolean;
}) {
  if (!input.hasCandidate) return "NO_ACTION" as const;
  if (
    (input.goalStatus === "achieved" && input.intentStatus !== "ACTIVE") ||
    (input.staleHours > 24 && input.intentStatus !== "ACTIVE") ||
    input.confidence < 0.75 ||
    input.riskLevel !== "low" ||
    (input.costCoverage === "UNKNOWN" && (input.mode === "LIMITED_AUTO" || input.mode === "AUTO") && !input.boundedCostAuthority)
  ) return "GATHER_EVIDENCE" as const;
  return input.mode === "LIMITED_AUTO" || input.mode === "AUTO" ? "AUTHORIZE" as const : "RECOMMEND" as const;
}

export function determineAutonomyStage(input: {
  current: AutonomyDecisionMode;
  distinctSamples: number;
  oracleAgreementRate: number | null;
  meanConfidence: number;
  verifiedOutcomes: number;
  outcomeSuccessRate: number | null;
  unsafeCount: number;
}) {
  if (input.unsafeCount > 0 || (input.verifiedOutcomes > 0 && input.outcomeSuccessRate !== null && input.outcomeSuccessRate < 0.8)) {
    return { stage: "SHADOW" as const, downgradeReason: input.unsafeCount > 0 ? "unsafe_evaluator_verdict" : "outcome_success_below_threshold" };
  }
  if (input.current === "SHADOW" && input.distinctSamples >= 5 && (input.oracleAgreementRate ?? 0) >= 0.8 && input.meanConfidence >= 0.8) return { stage: "RECOMMEND" as const, downgradeReason: null };
  if (input.current === "RECOMMEND" && input.verifiedOutcomes >= 3 && (input.outcomeSuccessRate ?? 0) >= 0.8) return { stage: "LIMITED_AUTO" as const, downgradeReason: null };
  if (input.current === "LIMITED_AUTO" && input.verifiedOutcomes >= 10 && (input.outcomeSuccessRate ?? 0) >= 0.9) return { stage: "AUTO" as const, downgradeReason: null };
  return { stage: input.current, downgradeReason: null };
}

type WakeResult = { id?: string; run?: { id?: string }; status?: string } | null | undefined;
type WakeExistingOwner = (agentId: string, options: {
  source: "automation";
  triggerDetail: "system";
  reason: string;
  payload: Record<string, unknown>;
  requestedByActorType: "system";
  contextSnapshot: Record<string, unknown>;
  idempotencyKey: string;
}) => Promise<WakeResult | unknown>;

function stableDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function confidenceValue(action: NextLegalAction, input: { goalStatus: string | null; staleHours: number; costKnown: boolean }) {
  let value = action.confidence === "high" ? 0.92 : action.confidence === "medium" ? 0.76 : 0.55;
  if (input.goalStatus === "achieved") value -= 0.22;
  if (input.staleHours > 24) value -= 0.16;
  if (!input.costKnown) value -= 0.08;
  return Number(Math.max(0.05, Math.min(0.99, value)).toFixed(2));
}

function riskFor(action: NextLegalAction, description: string | null) {
  const text = `${action.title} ${description ?? ""}`.toLowerCase();
  const isExplicitlyExcluded = (term: string) => text
    .split(/[.!;\n]/)
    .some((clause) => clause.includes(term) && /\b(no|without|do not|must not|never)\b/.test(clause));
  const high = ["production", "deploy", "secret", "credential", "destructive", "delete", "payment"]
    .filter((term) => text.includes(term) && !isExplicitlyExcluded(term));
  if (high.length > 0) return { level: "high" as const, factors: high.map((term) => `sensitive_scope:${term}`) };
  const medium = ["coordinate", "delegate", "accessibility", "desktop", "tablet", "mobile", "cross-project", "broad"].filter((term) => text.includes(term));
  return medium.length > 0
    ? { level: "medium" as const, factors: medium.map((term) => `multi_step_scope:${term}`) }
    : { level: "low" as const, factors: ["bounded_existing_issue_dispatch"] };
}

function expectedOutcome(action: NextLegalAction): ExpectedOutcomeContract {
  return {
    statement: `The existing owner accepts one bounded execution lease for ${action.identifier ?? action.issueId}, produces inspectable evidence, and changes the linked outcome or records a typed blocker without duplicate dispatch.`,
    indicators: [
      { key: "dispatch_postcondition", expected: "ACCEPTED", evidenceRequired: ["heartbeat_run_or_queue_record", "idempotency_key"] },
      { key: "execution_liveness", expected: "terminal_run_or_typed_blocker", evidenceRequired: ["heartbeat_run_status", "issue_state"] },
      { key: "outcome_quality", expected: "accepted_outcome_or_explicit_nonachievement", evidenceRequired: ["product_outcome", "independent_verification"] },
      { key: "cost_coverage", expected: "KNOWN_ZERO|NONZERO|PARTIAL|UNKNOWN", evidenceRequired: ["cost_event_coverage"] },
    ],
    verificationOwner: "native_supervision",
    verificationIndependence: "INDEPENDENT_INTERNAL",
    verificationWindowMinutes: 120,
    rollbackTrigger: "Duplicate dispatch, stale precondition, unsafe evaluator verdict, or outcome regression.",
  };
}

export function autonomyDecisionService(db: Db, deps: { enqueueWakeup?: WakeExistingOwner } = {}) {
  const nextActions = nextLegalActionService(db);

  async function ensureEnvelope(companyId: string) {
    const existing = await db.select().from(autonomyEnvelopes).where(and(
      eq(autonomyEnvelopes.companyId, companyId),
      eq(autonomyEnvelopes.key, DEFAULT_ACTION_CLASS),
    )).then((rows) => rows[0] ?? null);
    if (existing) return existing;
    return db.insert(autonomyEnvelopes).values({
      companyId,
      key: DEFAULT_ACTION_CLASS,
      actionClass: DEFAULT_ACTION_CLASS,
      stage: "SHADOW",
      scope: { taskTypes: ["existing_issue"], riskLevels: ["low"], environments: ["local"], ownerAgentIds: [] },
      budget: { maxCostCents: 100, maxRuns: 1 },
      concurrency: { maxActive: 1 },
      allowedActions: ["wake_existing_owner"],
      rollback: { required: true, method: "cancel_queued_run_and_invalidate_decision" },
      graduationPolicy: {
        shadowToRecommend: { minDistinctSamples: 5, minAgreementRate: 0.8, maxUnsafe: 0, minMeanConfidence: 0.8 },
        recommendToLimitedAuto: { minVerifiedOutcomes: 3, minOutcomeSuccessRate: 0.8, maxUnsafe: 0 },
        limitedAutoToAuto: { minVerifiedOutcomes: 10, minOutcomeSuccessRate: 0.9, maxUnsafe: 0 },
      },
      graduationMetrics: { distinctSamples: 0, oracleAgreementRate: null, verifiedOutcomes: 0, outcomeSuccessRate: null, unsafeCount: 0 },
    }).onConflictDoNothing({ target: [autonomyEnvelopes.companyId, autonomyEnvelopes.key] })
      .returning().then(async (rows) => rows[0] ?? db.select().from(autonomyEnvelopes).where(and(eq(autonomyEnvelopes.companyId, companyId), eq(autonomyEnvelopes.key, DEFAULT_ACTION_CLASS))).then((items) => items[0]!));
  }

  async function evaluateGraduation(companyId: string) {
    const envelope = await ensureEnvelope(companyId);
    const [metrics] = await db.execute<Record<string, number | string | null>>(sql`
      select
        (select count(distinct sample_key) from autonomy_decisions where company_id=${companyId} and action_class=${DEFAULT_ACTION_CLASS} and calibration_cohort=${CALIBRATION_COHORT})::int as distinct_samples,
        (select count(*) from autonomy_decision_evaluations e join autonomy_decisions d on d.id=e.decision_id where e.company_id=${companyId} and e.signal_type='ORACLE_VERDICT' and d.calibration_cohort=${CALIBRATION_COHORT})::int as evaluations,
        (select count(*) from autonomy_decision_evaluations e join autonomy_decisions d on d.id=e.decision_id where e.company_id=${companyId} and e.signal_type='ORACLE_VERDICT' and e.verdict='agree' and d.calibration_cohort=${CALIBRATION_COHORT})::int as agreements,
        (select count(*) from autonomy_decision_evaluations e join autonomy_decisions d on d.id=e.decision_id where e.company_id=${companyId} and e.signal_type='ORACLE_VERDICT' and e.verdict='unsafe' and d.calibration_cohort=${CALIBRATION_COHORT})::int as unsafe_count,
        (select coalesce(avg(confidence),0) from autonomy_decisions where company_id=${companyId} and action_class=${DEFAULT_ACTION_CLASS} and calibration_cohort=${CALIBRATION_COHORT})::numeric as mean_confidence,
        (select count(*) from autonomy_executions where company_id=${companyId} and status in ('OUTCOME_VERIFIED','OUTCOME_FAILED'))::int as verified_outcomes,
        (select count(*) from autonomy_executions where company_id=${companyId} and status='OUTCOME_VERIFIED')::int as successful_outcomes
    `);
    const distinctSamples = Number(metrics?.distinct_samples ?? 0);
    const evaluations = Number(metrics?.evaluations ?? 0);
    const agreements = Number(metrics?.agreements ?? 0);
    const unsafeCount = Number(metrics?.unsafe_count ?? 0);
    const meanConfidence = Number(metrics?.mean_confidence ?? 0);
    const verifiedOutcomes = Number(metrics?.verified_outcomes ?? 0);
    const successfulOutcomes = Number(metrics?.successful_outcomes ?? 0);
    const oracleAgreementRate = evaluations > 0 ? agreements / evaluations : null;
    const outcomeSuccessRate = verifiedOutcomes > 0 ? successfulOutcomes / verifiedOutcomes : null;
    const transition = determineAutonomyStage({ current: envelope.stage as AutonomyDecisionMode, distinctSamples, oracleAgreementRate, meanConfidence, verifiedOutcomes, outcomeSuccessRate, unsafeCount });
    const nextStage = transition.stage;
    const downgradeReason = transition.downgradeReason;
    const now = new Date();
    return db.update(autonomyEnvelopes).set({
      stage: nextStage,
      graduationMetrics: { distinctSamples, evaluations, oracleAgreementRate, meanConfidence, verifiedOutcomes, outcomeSuccessRate, unsafeCount },
      downgradeReason,
      ...(nextStage !== envelope.stage && nextStage === "SHADOW" ? { downgradedAt: now } : {}),
      ...(nextStage !== envelope.stage && nextStage !== "SHADOW" ? { graduatedAt: now } : {}),
      ...(nextStage !== envelope.stage ? { version: envelope.version + 1 } : {}),
      updatedAt: now,
    }).where(eq(autonomyEnvelopes.id, envelope.id)).returning().then((rows) => rows[0]!);
  }

  async function setEnvelopeStage(companyId: string, input: {
    stage: "RECOMMEND" | "LIMITED_AUTO";
    rationale: string;
    actorId: string;
  }) {
    const envelope = await ensureEnvelope(companyId);
    if (envelope.stage === "AUTO" && input.stage !== "LIMITED_AUTO") {
      throw new Error("An AUTO envelope may only be reduced to LIMITED_AUTO through this bounded operator route");
    }
    const now = new Date();
    const [updated] = await db.update(autonomyEnvelopes).set({
      stage: input.stage,
      version: envelope.version + 1,
      downgradeReason: input.stage === "RECOMMEND" ? `operator:${input.rationale}` : null,
      ...(input.stage === "LIMITED_AUTO" ? { graduatedAt: now } : { downgradedAt: now }),
      updatedAt: now,
    }).where(and(eq(autonomyEnvelopes.id, envelope.id), eq(autonomyEnvelopes.companyId, companyId))).returning();
    if (!updated) return null;
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: input.actorId,
      action: "autonomy.envelope.stage_set",
      entityType: "autonomy_envelope",
      entityId: updated.id,
      details: { previousStage: envelope.stage, nextStage: input.stage, rationale: input.rationale, bounded: true },
    });
    return updated;
  }

  async function setEnvelopeCapacity(companyId: string, input: {
    maxActive: number;
    maxRuns: number;
    maxCostCents: number;
    rationale: string;
    actorId: string;
  }) {
    const envelope = await ensureEnvelope(companyId);
    const previousBudget = envelope.budget as Record<string, unknown>;
    const previousConcurrency = envelope.concurrency as Record<string, unknown>;
    const [updated] = await db.update(autonomyEnvelopes).set({
      budget: { ...previousBudget, maxRuns: input.maxRuns, maxCostCents: input.maxCostCents },
      concurrency: { ...previousConcurrency, maxActive: input.maxActive },
      version: envelope.version + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(autonomyEnvelopes.id, envelope.id),
      eq(autonomyEnvelopes.companyId, companyId),
    )).returning();
    if (!updated) return null;
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: input.actorId,
      action: "autonomy.envelope.capacity_set",
      entityType: "autonomy_envelope",
      entityId: updated.id,
      details: {
        previous: { budget: envelope.budget, concurrency: envelope.concurrency },
        next: { budget: updated.budget, concurrency: updated.concurrency },
        rationale: input.rationale,
        projectSerialized: true,
      },
    });
    return updated;
  }

  async function persistConstraint(companyId: string, projection: NextLegalActionProjection) {
    const constraint = projection.currentConstraint;
    const key = `readiness:${constraint.kind}`;
    const affectedIssueIds = projection.actions
      .filter((action) => action.priority.constraintEffect === "helps_current_constraint" || action.actionClass.toLowerCase().includes(constraint.kind))
      .map((action) => action.issueId);
    const now = new Date(projection.generatedAt);
    const constraintOwner = await db.select({ id: agents.id }).from(agents).where(and(
      eq(agents.companyId, companyId),
      inArray(agents.status, ["idle", "active", "running"]),
    )).orderBy(sql`case
      when lower(coalesce(${agents.title},'')) like '%operations director%' then 0
      when lower(coalesce(${agents.name},'')) like '%coo%' then 1
      when lower(coalesce(${agents.title},'')) like '%operating assistant%' then 2
      else 3 end`, agents.createdAt).limit(1).then((rows) => rows[0] ?? null);
    await db.update(operationalConstraints).set({ status: "resolved", resolvedAt: now, updatedAt: now })
      .where(and(eq(operationalConstraints.companyId, companyId), eq(operationalConstraints.status, "active"), ne(operationalConstraints.key, key)));
    const values = {
      companyId,
      key,
      kind: constraint.kind,
      status: constraint.kind === "none" ? "resolved" : "active",
      title: `Current organizational constraint: ${constraint.kind}`,
      rationale: constraint.rationale,
      affectedCount: constraint.count,
      ownerAgentId: constraintOwner?.id ?? null,
      evidence: [{ kind: "next_legal_action_projection", observedAt: projection.generatedAt, distribution: projection.distribution }],
      affectedIssueIds,
      proposedResponse: { strategy: "smallest_safe_unblock", doNotIncreaseWip: true },
      flowSlo: { acknowledgeMinutes: 15, evidenceRefreshMinutes: 5, resolutionTargetHours: 24 },
      resolutionCriteria: [{ key: "constraint_count_reduced", expected: `<${constraint.count}` }, { key: "no_dependency_deadlock", expected: true }],
      lastObservedAt: now,
      updatedAt: now,
      ...(constraint.kind === "none" ? { resolvedAt: now } : { resolvedAt: null }),
    };
    return db.insert(operationalConstraints).values(values).onConflictDoUpdate({
      target: [operationalConstraints.companyId, operationalConstraints.key],
      set: values,
    }).returning().then((rows) => rows[0]!);
  }

  async function issueContext(action: NextLegalAction) {
    const row = await db.select({
      id: issues.id,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      projectId: issues.projectId,
      goalId: issues.goalId,
      goalStatus: goals.status,
      intentStatus: issueIntents.status,
      intentConfirmedAt: issueIntents.confirmedAt,
      intentValidUntil: issueIntents.validUntil,
      intentVersion: issueIntents.version,
      assigneeAgentId: issues.assigneeAgentId,
      ownerStatus: agents.status,
      updatedAt: issues.updatedAt,
    }).from(issues)
      .leftJoin(goals, and(eq(goals.id, issues.goalId), eq(goals.companyId, issues.companyId)))
      .leftJoin(issueIntents, and(eq(issueIntents.issueId, issues.id), eq(issueIntents.companyId, issues.companyId)))
      .leftJoin(agents, and(eq(agents.id, issues.assigneeAgentId), eq(agents.companyId, issues.companyId)))
      .where(eq(issues.id, action.issueId)).then((rows) => rows[0] ?? null);
    if (!row) return null;
    const [economics] = await db.execute<Record<string, number | string | null>>(sql`
      select
        (select count(*) from heartbeat_runs where company_id=(select company_id from issues where id=${action.issueId}) and (context_snapshot->>'issueId'=${action.issueId} or context_snapshot->>'taskId'=${action.issueId}))::int as runs,
        (select count(*) from cost_events where issue_id=${action.issueId})::int as cost_events,
        (select coalesce(sum(cost_cents),0) from cost_events where issue_id=${action.issueId})::int as issue_cost_cents,
        (select avg(cost_cents) from cost_events where agent_id=${row.assigneeAgentId})::numeric as owner_avg_cost_cents
    `);
    return { ...row, economics };
  }

  async function recordDecision(companyId: string, projection: NextLegalActionProjection, cycleId: string | null = null) {
    const envelope = await evaluateGraduation(companyId);
    const constraint = await persistConstraint(companyId, projection);
    const selected = projection.shadowDispatch.candidateIssueId
      ? projection.actions.find((action) => action.issueId === projection.shadowDispatch.candidateIssueId) ?? null
      : null;
    const context = selected ? await issueContext(selected) : null;
    const now = new Date(projection.generatedAt);
    const staleHours = context ? Math.max(0, (now.getTime() - context.updatedAt.getTime()) / 3_600_000) : 0;
    const runs = Number(context?.economics?.runs ?? 0);
    const costEvents = Number(context?.economics?.cost_events ?? 0);
    const issueCost = Number(context?.economics?.issue_cost_cents ?? 0);
    const ownerAverage = context?.economics?.owner_avg_cost_cents == null ? null : Number(context.economics.owner_avg_cost_cents);
    const costCoverage = runs === 0 ? "UNKNOWN" : costEvents === 0 ? "UNKNOWN" : costEvents < runs ? "PARTIAL" : issueCost === 0 ? "KNOWN_ZERO" : "NONZERO";
    const costSemantics = {
      linkageCoverage: { linkedRuns: costEvents, totalRuns: runs, ratio: runs > 0 ? costEvents / runs : null },
      sourceCoverage: { required: ["model_tokens", "provider_billed_amount"], observed: costEvents > 0 ? ["model_tokens"] : [], missing: costEvents > 0 ? ["provider_billed_amount"] : ["model_tokens", "provider_billed_amount"] },
      semanticCoverage: costEvents > 0 ? "PARTIAL" : "UNKNOWN",
      monetaryConfidence: issueCost > 0 ? "MEDIUM" : "LOW",
      zeroSemantics: issueCost > 0 ? "NONZERO" : costEvents > 0 ? "ZERO_REPORTED" : "UNKNOWN",
      observedCents: costEvents > 0 ? issueCost : null,
    };
    const risk = selected ? riskFor(selected, context?.description ?? null) : { level: "low" as const, factors: ["no_mutation"] };
    const confidence = selected ? confidenceValue(selected, { goalStatus: context?.goalStatus ?? null, staleHours, costKnown: costCoverage !== "UNKNOWN" }) : 0.95;
    const vector: AutonomyDecisionVector = selected ? {
      eligibility: { state: selected.eligibility, reasons: [selected.reasonCode, ...selected.evidence.filter((item) => item.state !== "passed").map((item) => item.code)] },
      constraintRelevance: { state: selected.priority.constraintEffect === "helps_current_constraint" ? "helps" : selected.priority.constraintEffect === "worsens_current_constraint" ? "worsens" : selected.priority.constraintEffect, rationale: projection.currentConstraint.rationale },
      organizationalValue: context?.intentStatus === "ACTIVE"
        ? { state: selected.priority.unblockValue > 0 ? "high" : "medium", rationale: `Typed owner intent is ACTIVE${context.goalStatus === "achieved" ? " for a post-goal obligation" : ""}.` }
        : context?.goalStatus === "achieved"
        ? { state: "low", rationale: "The linked goal is already achieved; continued value requires typed owner reconfirmation." }
        : context?.goalId ? { state: "medium", rationale: `The issue is linked to a ${context.goalStatus ?? "unknown"} goal and may reduce the current constraint.` }
          : { state: "low", rationale: "No goal linkage proves organizational value." },
      risk,
      cost: { coverage: costCoverage, estimatedCents: ownerAverage == null ? null : Math.round(ownerAverage), rationale: `${ownerAverage == null ? "No reliable owner-level cost history is available." : "Estimate uses observed owner cost-event mean."} Linkage and economic correctness are tracked separately: ${JSON.stringify(costSemantics)}.` },
      opportunityCost: { state: projection.shadowDispatch.consideredIssueIds.length > 1 ? "medium" : "low", rationale: `${Math.max(0, projection.shadowDispatch.consideredIssueIds.length - 1)} other eligible alternative(s) were observed.` },
      confidence: { value: confidence, rationale: `Eligibility confidence=${selected.confidence}; source age=${staleHours.toFixed(1)}h; goal=${context?.goalStatus ?? "none"}; cost=${costCoverage}.` },
    } : {
      eligibility: { state: projection.shadowDispatch.outcome === "insufficient_evidence" ? "unknown" : "ineligible", reasons: [projection.shadowDispatch.reasonCode] },
      constraintRelevance: { state: "unknown", rationale: projection.currentConstraint.rationale },
      organizationalValue: { state: "unknown", rationale: "No candidate was selected." },
      risk,
      cost: { coverage: "KNOWN_ZERO", estimatedCents: 0, rationale: "No dispatch was proposed." },
      opportunityCost: { state: "unknown", rationale: "No eligible comparison set exists." },
      confidence: { value: confidence, rationale: "No-action confidence follows the typed readiness projection." },
    };
    const evidenceFreshUntil = new Date(now.getTime() + 5 * 60_000);
    const mode = envelope.stage as AutonomyDecisionMode;
    const envelopeBudget = envelope.budget as Record<string, unknown>;
    const boundedCostAuthority = Number(envelopeBudget.maxRuns ?? 0) >= 1
      && Number(envelopeBudget.maxRuns ?? 0) <= 3
      && Number(envelopeBudget.maxCostCents ?? 0) > 0
      && Number((envelope.concurrency as Record<string, unknown>).maxActive ?? 0) >= 1
      && Number((envelope.concurrency as Record<string, unknown>).maxActive ?? 0) <= 3;
    const disposition = determineAutonomyDisposition({ hasCandidate: Boolean(selected), goalStatus: context?.goalStatus ?? null, staleHours, confidence, riskLevel: risk.level, costCoverage, mode, intentStatus: context?.intentStatus ?? selected?.intent.status ?? null, boundedCostAuthority });
    const needsEvidence = disposition === "GATHER_EVIDENCE";
    const candidates = projection.shadowDispatch.consideredIssueIds.map((issueId) => {
      const action = projection.actions.find((item) => item.issueId === issueId)!;
      return { issueId, identifier: action.identifier, actionClass: action.actionClass, declaredPriority: action.priority.declaredPriority, unblockValue: action.priority.unblockValue, constraintEffect: action.priority.constraintEffect };
    });
    const sampleIdentity = {
      selectedIssueId: selected?.issueId ?? null,
      constraint: { kind: projection.currentConstraint.kind, count: projection.currentConstraint.count },
      candidates,
      evidence: selected?.evidence.map((item) => [item.code, item.state, item.sourceUpdatedAt]) ?? [],
      intent: selected?.intent ?? null,
      goalStatus: context?.goalStatus ?? null,
      risk: risk.level,
      outcomeContext: selected ? { acceptedOutcomeAbsent: selected.evidence.some((item) => item.code === "outcome_conflict_absent" && item.state === "passed") } : null,
      envelopeSnapshot: { id: envelope.id, version: envelope.version, stage: envelope.stage, scope: envelope.scope, budget: envelope.budget, concurrency: envelope.concurrency, allowedActions: envelope.allowedActions, rollback: envelope.rollback },
      decisionModelVersion: DECISION_MODEL_VERSION,
    };
    const sampleKey = stableDigest(sampleIdentity);
    const digest = stableDigest({ sampleKey, disposition, mode, envelopeVersion: envelope.version, decisionModelVersion: DECISION_MODEL_VERSION });
    await db.update(autonomyDecisions).set({ status: "invalidated", invalidatedReason: "world_state_changed", invalidatedAt: now, updatedAt: now })
      .where(and(eq(autonomyDecisions.companyId, companyId), eq(autonomyDecisions.status, "active"), ne(autonomyDecisions.stateDigest, digest)));
    const record = await db.insert(autonomyDecisions).values({
      companyId,
      cycleId,
      constraintId: constraint.id,
      envelopeId: envelope.id,
      selectedIssueId: selected?.issueId ?? null,
      stateDigest: digest,
      sampleKey,
      sampleIdentity,
      decisionModelVersion: DECISION_MODEL_VERSION,
      calibrationCohort: CALIBRATION_COHORT,
      envelopeVersion: envelope.version,
      actionClass: DEFAULT_ACTION_CLASS,
      mode,
      disposition,
      reasonCode: needsEvidence ? "EVIDENCE_OR_VALUE_REVALIDATION_REQUIRED" : projection.shadowDispatch.reasonCode,
      candidates,
      rejectedAlternatives: projection.shadowDispatch.rejectedAlternatives,
      decisionVector: vector as unknown as Record<string, unknown>,
      evidenceRefs: selected?.evidence.map((item) => ({ code: item.code, entityType: item.entityType, entityId: item.entityId, observedAt: item.observedAt, sourceUpdatedAt: item.sourceUpdatedAt, freshUntil: item.freshUntil })) ?? [],
      riskLevel: risk.level,
      estimatedCost: vector.cost as unknown as Record<string, unknown>,
      expectedOutcome: (selected ? expectedOutcome(selected) : { statement: "No dispatch while no typed candidate is authorized.", indicators: [], verificationOwner: "native_supervision", verificationIndependence: "INDEPENDENT_INTERNAL", verificationWindowMinutes: 5, rollbackTrigger: "not_applicable" }) as unknown as Record<string, unknown>,
      confidence,
      evidenceFreshUntil,
      invalidationConditions: ["issue_state_changed", "owner_changed_or_unavailable", "dependency_changed", "policy_or_approval_changed", "goal_state_changed", "new_higher_priority_interrupt", "evidence_expired", "duplicate_execution_detected"],
      status: disposition === "NO_ACTION" ? "no_action" : "active",
    }).onConflictDoNothing({ target: [autonomyDecisions.companyId, autonomyDecisions.stateDigest, autonomyDecisions.mode] })
      .returning().then((rows) => rows[0] ?? null);
    let persisted = record ?? await db.select().from(autonomyDecisions).where(and(eq(autonomyDecisions.companyId, companyId), eq(autonomyDecisions.stateDigest, digest), eq(autonomyDecisions.mode, mode))).then((rows) => rows[0]!);
    if (!record && persisted.status === "active") {
      persisted = await db.update(autonomyDecisions).set({
        evidenceRefs: selected?.evidence.map((item) => ({ code: item.code, entityType: item.entityType, entityId: item.entityId, observedAt: item.observedAt, sourceUpdatedAt: item.sourceUpdatedAt, freshUntil: item.freshUntil })) ?? [],
        evidenceFreshUntil,
        updatedAt: now,
      }).where(eq(autonomyDecisions.id, persisted.id)).returning().then((rows) => rows[0]!);
    }
    return { decision: persisted, envelope, constraint, vector, created: Boolean(record) };
  }

  async function evaluateDecision(decisionId: string, input: {
    evaluatorSource: string;
    signalType?: "ORACLE_VERDICT" | "OPERATOR_DECISION" | "COUNTERFACTUAL_WEAK_EVIDENCE";
    evaluatorMetadata?: Record<string, unknown>;
    evidenceAvailable?: Array<Record<string, unknown>>;
    verdict: "agree" | "disagree" | "insufficient_evidence" | "alternative" | "unsafe" | "stale_state";
    rationale: string;
    alternativeIssueId?: string | null;
    evidenceRefs?: Array<Record<string, unknown>>;
    actualOutcomeQuality?: string | null;
  }) {
    const decision = await db.select().from(autonomyDecisions).where(eq(autonomyDecisions.id, decisionId)).then((rows) => rows[0] ?? null);
    if (!decision) return null;
    const evaluation = await db.insert(autonomyDecisionEvaluations).values({
      companyId: decision.companyId,
      decisionId,
      evaluatorSource: input.evaluatorSource,
      signalType: input.signalType ?? "ORACLE_VERDICT",
      evaluatorMetadata: input.evaluatorMetadata ?? {},
      evidenceAvailable: input.evidenceAvailable ?? input.evidenceRefs ?? [],
      verdict: input.verdict,
      rationale: input.rationale,
      alternativeIssueId: input.alternativeIssueId ?? null,
      evidenceRefs: input.evidenceRefs ?? [],
      actualOutcomeQuality: input.actualOutcomeQuality ?? null,
    }).onConflictDoUpdate({
      target: [autonomyDecisionEvaluations.decisionId, autonomyDecisionEvaluations.evaluatorSource],
      set: { signalType: input.signalType ?? "ORACLE_VERDICT", evaluatorMetadata: input.evaluatorMetadata ?? {}, evidenceAvailable: input.evidenceAvailable ?? input.evidenceRefs ?? [], verdict: input.verdict, rationale: input.rationale, alternativeIssueId: input.alternativeIssueId ?? null, evidenceRefs: input.evidenceRefs ?? [], actualOutcomeQuality: input.actualOutcomeQuality ?? null, evaluatedAt: new Date() },
    }).returning().then((rows) => rows[0]!);
    await evaluateGraduation(decision.companyId);
    return evaluation;
  }

  async function confirmIssueIntent(companyId: string, issueId: string, input: {
    status: "ACTIVE" | "RECONFIRM_REQUIRED" | "SUPERSEDED" | "OBSOLETE" | "SATISFIED_ELSEWHERE" | "UNKNOWN";
    validUntil?: Date | null;
    ownerAgentId?: string | null;
    ownerUserId?: string | null;
    source: string;
    reason: string;
  }) {
    const issue = await db.select({ id: issues.id, goalId: issues.goalId, projectId: issues.projectId }).from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId))).then((rows) => rows[0] ?? null);
    if (!issue) return null;
    const now = new Date();
    const values = {
      companyId,
      issueId,
      status: input.status,
      confirmedAt: input.status === "ACTIVE" ? now : null,
      validUntil: input.validUntil ?? (input.status === "ACTIVE" ? new Date(now.getTime() + 24 * 60 * 60_000) : null),
      ownerAgentId: input.ownerAgentId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      source: input.source,
      reason: input.reason,
      hierarchy: { mission: "company_mission", goalId: issue.goalId, projectId: issue.projectId, issueId },
      updatedAt: now,
    };
    return db.insert(issueIntents).values(values).onConflictDoUpdate({
      target: [issueIntents.companyId, issueIntents.issueId],
      set: { ...values, version: sql`${issueIntents.version} + 1` },
    }).returning().then((rows) => rows[0]!);
  }

  async function createCanaryAuthorization(companyId: string, decisionId: string, input: {
    maxExecutions?: number;
    maxConcurrency?: number;
    validUntil: Date;
    maxCostCents: number;
    maxCalls: number;
    allowedCostUncertainty?: string[];
    verificationIndependence?: string;
    rationale: string;
    stopConditions?: string[];
    issuerType: "user" | "system";
    issuerId: string;
  }) {
    const decision = await db.select().from(autonomyDecisions).where(and(eq(autonomyDecisions.id, decisionId), eq(autonomyDecisions.companyId, companyId))).then((rows) => rows[0] ?? null);
    if (!decision || !decision.envelopeId || !decision.selectedIssueId) return null;
    if (input.validUntil <= new Date()) throw new Error("Canary authorization validity window must end in the future");
    if (decision.status !== "active" || decision.disposition !== "RECOMMEND") throw new Error("Only an active recommendation can receive board canary authorization");
    const expected = decision.expectedOutcome as Record<string, unknown>;
    const authorization = await db.insert(autonomyCanaryAuthorizations).values({
      companyId,
      envelopeId: decision.envelopeId,
      decisionId: decision.id,
      actionClass: decision.actionClass,
      candidateCriteria: { issueIds: [decision.selectedIssueId], decisionSampleKey: decision.sampleKey, intentRequired: "ACTIVE", workSelectionOnly: true },
      maxExecutions: Math.max(1, Math.min(3, input.maxExecutions ?? 1)),
      maxConcurrency: Math.max(1, Math.min(2, input.maxConcurrency ?? 1)),
      allowedRisk: ["low"],
      environments: ["local"],
      budget: { maxCostCents: input.maxCostCents, maxCalls: input.maxCalls, allowedCostUncertainty: input.allowedCostUncertainty ?? ["PARTIAL", "UNKNOWN_BOUNDED"] },
      validUntil: input.validUntil,
      rollbackRequirement: { required: true, method: "cancel_queued_run_stop_retries_and_escalate", boundedRetries: 0 },
      verificationRequirement: { minimumIndependence: input.verificationIndependence ?? expected.verificationIndependence ?? "INDEPENDENT_INTERNAL", evidence: ["run_postcondition", "expected_outcome_evidence", "cost_semantics_v2", "constraint_edge_attribution"] },
      issuerType: input.issuerType,
      issuerId: input.issuerId,
      rationale: input.rationale,
      stopConditions: input.stopConditions ?? ["atomic_recheck_failed", "intent_not_active", "interrupt_active", "budget_exceeded", "execution_stalled", "verification_failed", "duplicate_detected"],
      experiment: {
        hypothesis: "Paperclip can select and complete one real low-risk task to an independently verified outcome under bounded board authority.",
        scope: "one existing local issue selected from the live queue",
        preconditions: ["fresh_intent", "valid_decision", "valid_authorization", "low_risk", "bounded_cost", "independent_internal_verifier"],
        success: ["dispatch_accepted", "no_duplicate", "outcome_verified", "cost_acceptable", "constraint_impact_measured", "audit_complete"],
        failure: ["dispatch_rejected", "outcome_failed", "safety_violation"],
        abort: ["stale_state", "interrupt", "stall", "budget_exceeded"],
      },
    }).returning().then((rows) => rows[0]!);
    await db.update(autonomyDecisions).set({
      operatorDecision: { signal: "OPERATOR_DECISION", decision: "AUTHORIZED_CANARY", authorizationId: authorization.id, issuerType: input.issuerType, issuerId: input.issuerId, decidedAt: new Date().toISOString(), rationale: input.rationale },
      updatedAt: new Date(),
    }).where(eq(autonomyDecisions.id, decision.id));
    return authorization;
  }

  async function createInterrupt(companyId: string, input: {
    severity: "info" | "warning" | "critical";
    scope: Record<string, unknown>;
    source: string;
    evidence?: Array<Record<string, unknown>>;
    preemptibleWorkClasses?: string[];
    expiresAt: Date;
  }) {
    if (input.expiresAt <= new Date()) throw new Error("Interrupt expiration must be in the future");
    return db.insert(autonomyInterrupts).values({ companyId, ...input, evidence: input.evidence ?? [], preemptibleWorkClasses: input.preemptibleWorkClasses ?? [] }).returning().then((rows) => rows[0]!);
  }

  async function dispatchAuthorized(decisionId: string, canaryAuthorizationId?: string | null) {
    const decision = await db.select().from(autonomyDecisions).where(eq(autonomyDecisions.id, decisionId)).then((rows) => rows[0] ?? null);
    if (!decision || !decision.selectedIssueId || !decision.envelopeId) return { status: "FAILED" as const, reason: "decision_not_dispatchable" };
    const envelope = await db.select().from(autonomyEnvelopes).where(eq(autonomyEnvelopes.id, decision.envelopeId)).then((rows) => rows[0] ?? null);
    const now = new Date();
    const canary = canaryAuthorizationId ? await db.select().from(autonomyCanaryAuthorizations).where(and(
      eq(autonomyCanaryAuthorizations.id, canaryAuthorizationId),
      eq(autonomyCanaryAuthorizations.companyId, decision.companyId),
    )).then((rows) => rows[0] ?? null) : null;
    const envelopeAuthority = Boolean(envelope?.enabled && ["LIMITED_AUTO", "AUTO"].includes(envelope.stage) && decision.disposition === "AUTHORIZE");
    const canaryAuthority = Boolean(canary && envelope?.enabled && canary.envelopeId === envelope.id && canary.decisionId === decision.id && canary.status === "ACTIVE" && canary.validFrom <= now && canary.validUntil > now && canary.usedExecutions < canary.maxExecutions && decision.disposition === "RECOMMEND");
    if (!envelope || (!envelopeAuthority && !canaryAuthority)) {
      return { status: "FAILED" as const, reason: "autonomy_envelope_not_authorized" };
    }
    const authority = canaryAuthority ? "AUTHORIZED_CANARY" : "ENVELOPE";
    const maxActive = Math.max(1, canaryAuthority ? canary!.maxConcurrency : Number((envelope.concurrency as Record<string, unknown>).maxActive ?? 1));
    const authorityBudget = (canaryAuthority ? canary!.budget : envelope.budget) as Record<string, unknown>;
    const maxCostCents = Number(authorityBudget.maxCostCents ?? 0);
    const estimatedCostCents = (decision.estimatedCost as Record<string, unknown>).estimatedCents;
    if (maxCostCents > 0 && typeof estimatedCostCents === "number" && estimatedCostCents > maxCostCents) {
      return { status: "FAILED" as const, reason: "autonomy_budget_exceeded" };
    }
    if (decision.evidenceFreshUntil <= new Date()) {
      await db.update(autonomyDecisions).set({ status: "invalidated", invalidatedReason: "evidence_expired_before_dispatch", invalidatedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyDecisions.id, decision.id));
      return { status: "FAILED" as const, reason: "evidence_expired_before_dispatch" };
    }
    if (canaryAuthority) {
      const criteria = canary!.candidateCriteria as Record<string, unknown>;
      const issueIds = Array.isArray(criteria.issueIds) ? criteria.issueIds.map(String) : [];
      const allowedRisk = canary!.allowedRisk;
      const expected = decision.expectedOutcome as Record<string, unknown>;
      const cost = decision.estimatedCost as Record<string, unknown>;
      const uncertainty = Array.isArray(authorityBudget.allowedCostUncertainty) ? authorityBudget.allowedCostUncertainty.map(String) : [];
      if (!issueIds.includes(decision.selectedIssueId) || !allowedRisk.includes(decision.riskLevel) || expected.verificationIndependence === "SELF_REPORTED") return { status: "FAILED" as const, reason: "canary_scope_mismatch" };
      if (cost.coverage === "UNKNOWN" && !uncertainty.includes("UNKNOWN_BOUNDED")) return { status: "FAILED" as const, reason: "canary_cost_uncertainty_not_allowed" };
      const activeInterrupt = (await db.select({ id: autonomyInterrupts.id, scope: autonomyInterrupts.scope, preemptibleWorkClasses: autonomyInterrupts.preemptibleWorkClasses }).from(autonomyInterrupts).where(and(eq(autonomyInterrupts.companyId, decision.companyId), eq(autonomyInterrupts.status, "ACTIVE"), sql`${autonomyInterrupts.expiresAt} > now()`, sql`${autonomyInterrupts.severity} in ('warning','critical')`)))
        .find((interrupt) => {
          const scope = interrupt.scope as Record<string, unknown>;
          const issueIds = Array.isArray(scope.issueIds) ? scope.issueIds.map(String) : [];
          const actionClasses = Array.isArray(scope.actionClasses) ? scope.actionClasses.map(String) : [];
          const scopeMatches = scope.companyWide === true || issueIds.includes(decision.selectedIssueId!) || actionClasses.includes(decision.actionClass);
          return scopeMatches && (interrupt.preemptibleWorkClasses.length === 0 || interrupt.preemptibleWorkClasses.includes(decision.actionClass));
        }) ?? null;
      if (activeInterrupt) return { status: "FAILED" as const, reason: "active_interrupt", interruptId: activeInterrupt.id };
    }
    const freshProjection = await nextActions.project(decision.companyId);
    const fresh = freshProjection.actions.find((action) => action.issueId === decision.selectedIssueId);
    if (!fresh || fresh.actionClass !== "READY_FOR_EXECUTION" || fresh.eligibility !== "eligible") {
      await db.update(autonomyDecisions).set({ status: "invalidated", invalidatedReason: "atomic_recheck_failed", invalidatedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyDecisions.id, decision.id));
      return { status: "FAILED" as const, reason: "atomic_recheck_failed" };
    }
    const idempotencyKey = `autonomy:${decision.id}:${decision.stateDigest}`;
    const admitted = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`autonomy-dispatch:${decision.companyId}:${decision.selectedIssueId}`}))`);
      const [issue] = await tx.execute<{ id: string; status: string; assignee_agent_id: string }>(sql`
        select i.id, i.status, i.assignee_agent_id
        from issues i
        join agents owner on owner.id=i.assignee_agent_id and owner.company_id=i.company_id
        where i.id=${decision.selectedIssueId}
          and i.company_id=${decision.companyId}
          and i.status in ('backlog','todo')
          and owner.status in ('idle','active','running')
          and (${authority !== "AUTHORIZED_CANARY"} or exists (
            select 1 from issue_intents intent
            where intent.company_id=i.company_id and intent.issue_id=i.id and intent.status='ACTIVE'
              and intent.confirmed_at is not null and (intent.valid_until is null or intent.valid_until > now())
          ))
          and (${authority !== "AUTHORIZED_CANARY"} or exists (
            select 1 from autonomy_canary_authorizations auth
            where auth.id=${canaryAuthorizationId ?? null} and auth.company_id=i.company_id
              and auth.decision_id=${decision.id} and auth.envelope_id=${envelope.id}
              and auth.status='ACTIVE' and auth.valid_from <= now() and auth.valid_until > now()
              and auth.used_executions < auth.max_executions
          ))
          and not exists (
            select 1 from issue_relations rel
            join issues blocker on blocker.id=rel.issue_id and blocker.company_id=rel.company_id
            where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks' and rel.status='active'
              and blocker.status not in ('done','cancelled')
          )
          and not exists (
            select 1 from issue_relations rel
            join issues blocker on blocker.id=rel.issue_id and blocker.company_id=rel.company_id
            join delivery_tasks blocker_task on blocker_task.issue_id=blocker.id and blocker_task.company_id=blocker.company_id
            join product_deliveries blocker_delivery on blocker_delivery.id=blocker_task.delivery_id and blocker_delivery.company_id=blocker_task.company_id
            join product_outcomes blocker_outcome on blocker_outcome.delivery_id=blocker_delivery.id and blocker_outcome.company_id=blocker_delivery.company_id
            where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks' and rel.status='active'
              and blocker.status='done' and blocker_outcome.status not in ('accepted','accepted_with_risk')
          )
          and not exists (
            select 1 from issue_tree_hold_members hm
            join issue_tree_holds h on h.id=hm.hold_id and h.company_id=hm.company_id
            where hm.company_id=i.company_id and hm.issue_id=i.id and h.status='active'
          )
          and not exists (select 1 from issue_thread_interactions x where x.company_id=i.company_id and x.issue_id=i.id and x.status='pending')
          and not exists (
            select 1 from issue_approvals ia join approvals a on a.id=ia.approval_id and a.company_id=ia.company_id
            where ia.company_id=i.company_id and ia.issue_id=i.id and a.status='pending'
          )
          and not exists (
            select 1 from delivery_tasks dt
            join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id
            join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id
            where dt.company_id=i.company_id and dt.issue_id=i.id and d.stage='outcome_accepted' and o.status in ('accepted','accepted_with_risk')
          )
          and (select count(*) from autonomy_executions execution where execution.company_id=i.company_id and execution.status in ('PENDING','ACCEPTED','RUNNING')) < ${maxActive}
          and not exists (
            select 1
            from autonomy_executions active_execution
            join issues active_issue on active_issue.id=active_execution.issue_id and active_issue.company_id=active_execution.company_id
            where active_execution.company_id=i.company_id
              and active_execution.status in ('PENDING','ACCEPTED','RUNNING')
              and active_issue.project_id is not distinct from i.project_id
          )
        for update of i
      `);
      if (!issue?.assignee_agent_id) return { issue: null, execution: null };
      const execution = await tx.insert(autonomyExecutions).values({
        companyId: decision.companyId,
        decisionId: decision.id,
        canaryAuthorizationId: canaryAuthority ? canary!.id : null,
        issueId: issue.id,
        idempotencyKey,
        status: "PENDING",
        livenessStatus: "STARTING",
        livenessPolicy: { taskClass: "existing_issue_local", expectedFirstHeartbeatMinutes: 5, expectedFirstProgressEvidenceMinutes: 15, maxSilentIntervalMinutes: 20, expectedDurationMinutes: 120, escalationThresholdMinutes: 30, boundedRetries: 0 },
        preemptionClass: "SAFE_POINT_ONLY",
        preconditionSnapshot: { issueStatus: issue.status, ownerAgentId: issue.assignee_agent_id, projectionGeneratedAt: freshProjection.generatedAt, evidenceFreshUntil: decision.evidenceFreshUntil.toISOString(), envelopeStage: envelope.stage, envelopeVersion: decision.envelopeVersion, decisionModelVersion: decision.decisionModelVersion, authority, canaryAuthorizationId: canary?.id ?? null, transactionIsolation: "serializable", advisoryLock: true },
        predictedImpact: { unblockValue: fresh.priority.unblockValue, constraintEffect: fresh.priority.constraintEffect, expectedOutcome: decision.expectedOutcome },
        costCoverage: { linkageCoverage: { linkedRuns: 0, totalRuns: 0, ratio: null }, sourceCoverage: { required: ["model_tokens", "provider_billed_amount"], observed: [], missing: ["model_tokens", "provider_billed_amount"] }, semanticCoverage: "UNKNOWN", monetaryConfidence: "UNKNOWN", zeroSemantics: "UNKNOWN", observedCents: null },
      }).onConflictDoNothing({ target: [autonomyExecutions.companyId, autonomyExecutions.idempotencyKey] }).returning().then((rows) => rows[0] ?? null);
      if (execution && canaryAuthority) {
        await tx.update(autonomyCanaryAuthorizations).set({
          usedExecutions: sql`${autonomyCanaryAuthorizations.usedExecutions} + 1`,
          status: sql`case when ${autonomyCanaryAuthorizations.usedExecutions} + 1 >= ${autonomyCanaryAuthorizations.maxExecutions} then 'EXHAUSTED' else ${autonomyCanaryAuthorizations.status} end`,
          updatedAt: new Date(),
        }).where(eq(autonomyCanaryAuthorizations.id, canary!.id));
      }
      return { issue, execution };
    }, { isolationLevel: "serializable" });
    if (!admitted.issue) {
      await db.update(autonomyDecisions).set({ status: "invalidated", invalidatedReason: "atomic_transaction_recheck_failed", invalidatedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyDecisions.id, decision.id));
      return { status: "FAILED" as const, reason: "atomic_transaction_recheck_failed" };
    }
    const issue = { id: admitted.issue.id, assigneeAgentId: admitted.issue.assignee_agent_id };
    const execution = admitted.execution;
    if (!execution) return { status: "ACCEPTED" as const, reason: "idempotent_replay" };
    if (!deps.enqueueWakeup) {
      await db.update(autonomyExecutions).set({ status: "FAILED", dispatchPostcondition: { state: "FAILED", reason: "dispatcher_not_configured" }, finishedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyExecutions.id, execution.id));
      return { status: "FAILED" as const, reason: "dispatcher_not_configured", executionId: execution.id };
    }
    try {
      const wake = await deps.enqueueWakeup(issue.assigneeAgentId, {
        source: "automation",
        triggerDetail: "system",
        reason: authority === "AUTHORIZED_CANARY" ? "board_authorized_autonomy_canary" : "autonomy_envelope_authorized_existing_issue",
        payload: { decisionId: decision.id, issueId: issue.id, authority, canaryAuthorizationId: canary?.id ?? null },
        requestedByActorType: "system",
        idempotencyKey,
        contextSnapshot: { source: "autonomy_decision", authority, canaryAuthorizationId: canary?.id ?? null, decisionId: decision.id, issueId: issue.id, expectedOutcome: decision.expectedOutcome, envelope: { id: envelope.id, stage: envelope.stage, version: envelope.version }, decisionModelVersion: decision.decisionModelVersion },
      });
      const candidate = wake as WakeResult;
      const runId = candidate?.run?.id ?? candidate?.id ?? null;
      await db.update(autonomyExecutions).set({ status: "ACCEPTED", runId, dispatchPostcondition: { state: "ACCEPTED", acceptedAt: new Date().toISOString(), runId, liveness: "not_yet_verified" }, acceptedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyExecutions.id, execution.id));
      await db.update(autonomyDecisions).set({ status: "dispatched", updatedAt: new Date() }).where(eq(autonomyDecisions.id, decision.id));
      return { status: "ACCEPTED" as const, authority, executionId: execution.id, runId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.update(autonomyExecutions).set({ status: "FAILED", dispatchPostcondition: { state: "FAILED", reason: message }, finishedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyExecutions.id, execution.id));
      await db.update(autonomyDecisions).set({ status: "failed", laterResult: { dispatch: "FAILED", reason: message }, completedAt: new Date(), updatedAt: new Date() }).where(eq(autonomyDecisions.id, decision.id));
      return { status: "FAILED" as const, reason: message, executionId: execution.id };
    }
  }

  async function reconcileExecutions(companyId: string) {
    const rows = await db.select().from(autonomyExecutions).where(and(
      eq(autonomyExecutions.companyId, companyId),
      inArray(autonomyExecutions.status, ["ACCEPTED", "RUNNING", "UNCERTAIN", "COMPLETED"]),
    ));
    const reconciled = [];
    for (const execution of rows) {
      // postgres-js receives interpolated values here as text parameters. Passing
      // Drizzle's Date object directly crashes its byte encoder and stalls the
      // whole native supervision cycle before another issue can be dispatched.
      const executionCreatedAt = autonomySqlTimestamp(execution.createdAt);
      const [state] = await db.execute<Record<string, unknown>>(sql`
        select i.status as issue_status,
          r.status as run_status,
          r.created_at as run_created_at,
          r.updated_at as run_updated_at,
          o.id as outcome_id,
          o.status as outcome_status,
          coalesce(jsonb_array_length(o.evidence),0)::int as outcome_evidence_count,
          o.evidence as outcome_evidence,
          (select count(*) from cost_events c where c.company_id=i.company_id and c.issue_id=i.id)::int as cost_event_count,
          (select coalesce(sum(c.cost_cents),0) from cost_events c where c.company_id=i.company_id and c.issue_id=i.id)::int as cost_cents,
          (select count(*) from issue_relations rel where rel.company_id=i.company_id and rel.issue_id=i.id and rel.type='blocks')::int as outgoing_edge_count,
          (select count(*) from issue_relations rel where rel.company_id=i.company_id and rel.issue_id=i.id and rel.type='blocks' and rel.status='resolved' and rel.last_verified_at >= ${executionCreatedAt} and jsonb_array_length(rel.resolution_evidence) > 0)::int as verified_resolved_edge_count
        from issues i
        left join heartbeat_runs r on r.id=${execution.runId}
        left join delivery_tasks dt on dt.issue_id=i.id and dt.company_id=i.company_id
        left join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id
        left join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id
        where i.id=${execution.issueId}
        limit 1
      `);
      if (!state) continue;
      const issueTerminal = TERMINAL_ISSUE_STATES.includes(String(state.issue_status));
      const runTerminal = ["succeeded", "failed", "cancelled", "timed_out"].includes(String(state.run_status));
      const now = new Date();
      if (!issueTerminal && !runTerminal) {
        const policy = execution.livenessPolicy as Record<string, unknown>;
        const reference = state.run_updated_at ? new Date(String(state.run_updated_at)) : execution.acceptedAt ?? execution.createdAt;
        const silentMinutes = Math.max(0, (now.getTime() - reference.getTime()) / 60_000);
        const maxSilent = Number(policy.maxSilentIntervalMinutes ?? 20);
        const escalation = Number(policy.escalationThresholdMinutes ?? 30);
        const livenessStatus = silentMinutes >= escalation ? "STALLED" : silentMinutes >= maxSilent || !execution.runId ? "UNCERTAIN" : String(state.run_status) === "running" ? "RUNNING" : "WAITING_VALID";
        const status = livenessStatus === "UNCERTAIN" || livenessStatus === "STALLED" ? "UNCERTAIN" : livenessStatus === "RUNNING" ? "RUNNING" : "ACCEPTED";
        const updated = await db.update(autonomyExecutions).set({ status, livenessStatus, executionPostcondition: { issueStatus: state.issue_status, runStatus: state.run_status, terminal: false, silentMinutes, legalNextAction: livenessStatus === "STALLED" ? "ESCALATE" : livenessStatus === "UNCERTAIN" ? "GATHER_EVIDENCE" : "WAIT" }, updatedAt: now }).where(eq(autonomyExecutions.id, execution.id)).returning().then((items) => items[0]!);
        reconciled.push(updated);
        continue;
      }
      const evidenceRows = Array.isArray(state.outcome_evidence) ? state.outcome_evidence as Array<Record<string, unknown>> : [];
      const independentEvidence = evidenceRows.some((item) => {
        const token = `${item.kind ?? ""} ${item.type ?? ""} ${item.source ?? ""}`.toLowerCase();
        return /(test|review|verification|sensor|monitor|ci|artifact)/.test(token) && !/(self.report|agent.claim)/.test(token);
      });
      const independenceClass = independentEvidence ? "INDEPENDENT_INTERNAL" : evidenceRows.length > 0 ? "SELF_REPORTED" : null;
      const outcomeVerified = ["accepted", "accepted_with_risk"].includes(String(state.outcome_status)) && Number(state.outcome_evidence_count ?? 0) > 0 && (!execution.canaryAuthorizationId || independentEvidence);
      const status = outcomeVerified ? "OUTCOME_VERIFIED" : issueTerminal || runTerminal ? "OUTCOME_FAILED" : "COMPLETED";
      const costEvents = Number(state.cost_event_count ?? 0);
      const costCents = Number(state.cost_cents ?? 0);
      const outgoingEdges = Number(state.outgoing_edge_count ?? 0);
      const verifiedResolvedEdges = Number(state.verified_resolved_edge_count ?? 0);
      const constraintImpactStatus = outgoingEdges === 0 ? "NOT_MEASURABLE" : verifiedResolvedEdges > 0 && issueTerminal ? "SUPPORTED" : issueTerminal ? "AMBIGUOUS" : "CONTRADICTED";
      const updated = await db.update(autonomyExecutions).set({
        status,
        livenessStatus: "TERMINAL",
        executionPostcondition: { issueStatus: state.issue_status, runStatus: state.run_status, terminal: issueTerminal || runTerminal },
        outcomeVerification: { signal: "ACTUAL_OUTCOME", state: outcomeVerified ? "verified" : "not_verified", outcomeId: state.outcome_id, outcomeStatus: state.outcome_status, evidenceCount: Number(state.outcome_evidence_count ?? 0), independenceClass, independentConfidence: outcomeVerified ? 0.9 : independentEvidence ? 0.55 : 0.2 },
        actualImpact: { outcomeVerified, issueTerminal },
        constraintImpactStatus,
        constraintImpactEvidence: [{ kind: "dependency_edge_attribution", blockerIssueId: execution.issueId, outgoingEdges, verifiedResolvedEdges, observedAt: now.toISOString(), note: "Count delta alone is not treated as causal proof." }],
        costCoverage: { linkageCoverage: { linkedRuns: costEvents > 0 ? 1 : 0, totalRuns: execution.runId ? 1 : 0, ratio: execution.runId ? (costEvents > 0 ? 1 : 0) : null }, sourceCoverage: { required: ["model_tokens", "provider_billed_amount"], observed: costEvents > 0 ? ["model_tokens", ...(costCents > 0 ? ["provider_billed_amount"] : [])] : [], missing: costEvents === 0 ? ["model_tokens", "provider_billed_amount"] : costCents === 0 ? ["provider_billed_amount"] : [] }, semanticCoverage: costEvents > 0 ? costCents > 0 ? "VERIFIED" : "PARTIAL" : "UNKNOWN", monetaryConfidence: costCents > 0 ? "HIGH" : costEvents > 0 ? "LOW" : "UNKNOWN", zeroSemantics: costCents > 0 ? "NONZERO" : costEvents > 0 ? "ZERO_REPORTED" : "UNKNOWN", observedCents: costEvents > 0 ? costCents : null },
        finishedAt: now,
        verifiedAt: now,
        updatedAt: now,
      }).where(eq(autonomyExecutions.id, execution.id)).returning().then((items) => items[0]!);
      await db.update(autonomyDecisions).set({ status: outcomeVerified ? "completed" : "failed", laterResult: { signal: "ACTUAL_OUTCOME", executionId: execution.id, outcomeVerified, independenceClass, constraintImpactStatus, issueStatus: state.issue_status, runStatus: state.run_status }, completedAt: now, updatedAt: now }).where(eq(autonomyDecisions.id, execution.decisionId));
      reconciled.push(updated);
    }
    await evaluateGraduation(companyId);
    return reconciled;
  }

  async function refreshGovernanceExpirations(companyId: string) {
    const now = new Date();
    await db.update(autonomyCanaryAuthorizations).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(autonomyCanaryAuthorizations.companyId, companyId), eq(autonomyCanaryAuthorizations.status, "ACTIVE"), sql`${autonomyCanaryAuthorizations.validUntil} <= now()`));
    await db.update(autonomyInterrupts).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(autonomyInterrupts.companyId, companyId), eq(autonomyInterrupts.status, "ACTIVE"), sql`${autonomyInterrupts.expiresAt} <= now()`));
    await db.update(policyExceptions).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(policyExceptions.companyId, companyId), eq(policyExceptions.status, "ACTIVE"), sql`${policyExceptions.validUntil} <= now()`));
  }

  async function createLearnedPolicy(companyId: string, input: {
    key: string;
    lifecycle: "PROPOSED" | "EXPERIMENTAL" | "ACTIVE" | "SUSPECT" | "ROLLED_BACK" | "SUPERSEDED" | "RETIRED";
    scope: Record<string, unknown>;
    provenance: Record<string, unknown>;
    confidence: number;
    expectedEffect: Record<string, unknown>;
    rollbackCondition: Record<string, unknown>;
    ownerAgentId?: string | null;
    reviewAt?: Date | null;
  }) {
    const current = await db.select().from(learnedPolicies).where(and(eq(learnedPolicies.companyId, companyId), eq(learnedPolicies.key, input.key))).orderBy(desc(learnedPolicies.version)).limit(1).then((rows) => rows[0] ?? null);
    const version = (current?.version ?? 0) + 1;
    if (current && input.lifecycle === "ACTIVE") {
      await db.update(learnedPolicies).set({ lifecycle: "SUPERSEDED", updatedAt: new Date() }).where(eq(learnedPolicies.id, current.id));
    }
    return db.insert(learnedPolicies).values({ companyId, ...input, version, supersedesPolicyId: current?.id ?? null, ownerAgentId: input.ownerAgentId ?? null, reviewAt: input.reviewAt ?? null }).returning().then((rows) => rows[0]!);
  }

  async function autonomyHealth(companyId: string) {
    await refreshGovernanceExpirations(companyId);
    const [row] = await db.execute<Record<string, unknown>>(sql`
      select
        (select count(*) from issues i left join issue_intents intent on intent.company_id=i.company_id and intent.issue_id=i.id left join goals g on g.id=i.goal_id and g.company_id=i.company_id where i.company_id=${companyId} and i.hidden_at is null and i.status not in ('done','cancelled') and (intent.id is null or intent.status='UNKNOWN' or intent.valid_until <= now() or (g.status='achieved' and intent.status <> 'ACTIVE')))::int as intent_debt,
        (select count(*) from issue_relations rel where rel.company_id=${companyId} and rel.status='active' and (rel.last_verified_at is null or rel.stale_after is null or rel.stale_after <= now()))::int as stale_dependency_edges,
        (select count(*) from issue_relations rel where rel.company_id=${companyId} and rel.status='active' and rel.owner_agent_id is null)::int as unowned_dependency_edges,
        (select count(*) from issue_relations rel where rel.company_id=${companyId} and rel.status='active' and (rel.blocking_condition is null or rel.expected_resolving_outcome is null))::int as untyped_dependency_edges,
        (select count(*) from product_outcomes o where o.company_id=${companyId} and o.status in ('accepted','accepted_with_risk') and (jsonb_array_length(o.evidence)=0 or not exists (select 1 from jsonb_array_elements(o.evidence) e where lower(coalesce(e->>'kind','') || ' ' || coalesce(e->>'type','') || ' ' || coalesce(e->>'source','')) ~ '(test|review|verification|sensor|monitor|ci|artifact)')))::int as verification_debt,
        (select count(*) from learned_policies p where p.company_id=${companyId} and p.lifecycle in ('ACTIVE','EXPERIMENTAL'))::int as active_policies,
        (select count(*) from learned_policies p where p.company_id=${companyId} and (p.owner_agent_id is null or p.review_at is null or p.lifecycle in ('SUSPECT','RETIRED')))::int as policy_debt,
        (select count(*) from policy_exceptions e where e.company_id=${companyId} and e.status='ACTIVE')::int as active_exceptions,
        (select count(*) from autonomy_interrupts x where x.company_id=${companyId} and x.status='ACTIVE' and x.expires_at > now())::int as active_interrupts,
        (select count(distinct d.sample_key) from autonomy_decisions d where d.company_id=${companyId} and d.calibration_cohort=${CALIBRATION_COHORT})::int as independent_decision_samples,
        (select count(distinct coalesce(e.evaluator_metadata->>'model', e.evaluator_source)) from autonomy_decision_evaluations e join autonomy_decisions d on d.id=e.decision_id where e.company_id=${companyId} and e.signal_type='ORACLE_VERDICT' and d.calibration_cohort=${CALIBRATION_COHORT})::int as evaluator_classes,
        (select count(*) from autonomy_canary_authorizations a where a.company_id=${companyId} and a.status='ACTIVE' and a.valid_until > now())::int as active_canary_authorizations
    `);
    return {
      generatedAt: new Date().toISOString(),
      decisionModelVersion: DECISION_MODEL_VERSION,
      calibrationCohort: CALIBRATION_COHORT,
      canonicalOwnership: { operationalProjection: "paperclip", durableIntentPolicyStrategyTarget: "roost" },
      debts: {
        intent: Number(row?.intent_debt ?? 0),
        dependency: { stale: Number(row?.stale_dependency_edges ?? 0), unowned: Number(row?.unowned_dependency_edges ?? 0), untyped: Number(row?.untyped_dependency_edges ?? 0) },
        verification: Number(row?.verification_debt ?? 0),
        policy: Number(row?.policy_debt ?? 0),
      },
      decisionSamples: { distinct: Number(row?.independent_decision_samples ?? 0), evaluatorClasses: Number(row?.evaluator_classes ?? 0), timeAloneCreatesSample: false },
      governance: { activePolicies: Number(row?.active_policies ?? 0), activeExceptions: Number(row?.active_exceptions ?? 0), activeInterrupts: Number(row?.active_interrupts ?? 0), activeCanaryAuthorizations: Number(row?.active_canary_authorizations ?? 0) },
    };
  }

  return {
    ensureEnvelope,
    evaluateGraduation,
    setEnvelopeStage,
    setEnvelopeCapacity,
    persistConstraint,
    recordDecision,
    evaluateDecision,
    confirmIssueIntent,
    createCanaryAuthorization,
    createInterrupt,
    createLearnedPolicy,
    refreshGovernanceExpirations,
    autonomyHealth,
    dispatchAuthorized,
    reconcileExecutions,
    getDecision: (id: string) => db.select().from(autonomyDecisions).where(eq(autonomyDecisions.id, id)).then((rows) => rows[0] ?? null),
    listDecisions: (companyId: string) => db.select().from(autonomyDecisions).where(eq(autonomyDecisions.companyId, companyId)).orderBy(desc(autonomyDecisions.decidedAt)).limit(200),
    listEvaluations: (decisionId: string) => db.select().from(autonomyDecisionEvaluations).where(eq(autonomyDecisionEvaluations.decisionId, decisionId)).orderBy(desc(autonomyDecisionEvaluations.evaluatedAt)),
    listEnvelopes: (companyId: string) => db.select().from(autonomyEnvelopes).where(eq(autonomyEnvelopes.companyId, companyId)).orderBy(desc(autonomyEnvelopes.updatedAt)),
    listConstraints: (companyId: string) => db.select().from(operationalConstraints).where(eq(operationalConstraints.companyId, companyId)).orderBy(desc(operationalConstraints.lastObservedAt)).limit(200),
    listExecutions: (companyId: string) => db.select().from(autonomyExecutions).where(eq(autonomyExecutions.companyId, companyId)).orderBy(desc(autonomyExecutions.updatedAt)).limit(200),
    listCanaryAuthorizations: (companyId: string) => db.select().from(autonomyCanaryAuthorizations).where(eq(autonomyCanaryAuthorizations.companyId, companyId)).orderBy(desc(autonomyCanaryAuthorizations.createdAt)).limit(200),
    getActiveCanaryAuthorization: (decisionId: string) => db.select().from(autonomyCanaryAuthorizations).where(and(eq(autonomyCanaryAuthorizations.decisionId, decisionId), eq(autonomyCanaryAuthorizations.status, "ACTIVE"), sql`${autonomyCanaryAuthorizations.validUntil} > now()`)).orderBy(desc(autonomyCanaryAuthorizations.createdAt)).limit(1).then((rows) => rows[0] ?? null),
    listIntents: (companyId: string) => db.select().from(issueIntents).where(eq(issueIntents.companyId, companyId)).orderBy(desc(issueIntents.updatedAt)).limit(500),
    listInterrupts: (companyId: string) => db.select().from(autonomyInterrupts).where(eq(autonomyInterrupts.companyId, companyId)).orderBy(desc(autonomyInterrupts.createdAt)).limit(200),
    listLearnedPolicies: (companyId: string) => db.select().from(learnedPolicies).where(eq(learnedPolicies.companyId, companyId)).orderBy(desc(learnedPolicies.updatedAt)).limit(200),
  };
}
