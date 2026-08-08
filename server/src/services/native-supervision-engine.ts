import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  companies,
  deliveryTasks,
  heartbeatRuns,
  issueThreadInteractions,
  issues,
  organizationalObservations,
  productDeliveries,
  supervisionFindings,
  supervisionInterventions,
} from "@paperclipai/db";
import { admissionControlService } from "./admission-control.js";
import { supervisionRegistryService } from "./supervision-registry.js";
import { logActivity } from "./activity-log.js";
import { buildNativeControlMatrix } from "./native-control-contract.js";
import { organizationalObservationService } from "./organizational-observations.js";
import { nextLegalActionService } from "./next-legal-action.js";
import { autonomyDecisionService } from "./autonomy-decision.js";

type CheckResult = {
  key: string;
  title: string;
  problemClass: string;
  status: "passed" | "warning" | "failed";
  count: number;
  severity: "info" | "warning" | "high" | "critical";
  classification: string;
  summary: string;
  requiresDiagnosis?: boolean;
};

export type NativeHomeostasisState = "healthy" | "degraded" | "critical" | "unknown";

export function evaluateHomeostasisDimension(
  checks: Array<Pick<CheckResult, "key" | "status" | "count">>,
  expectedSensorIds: readonly string[],
): { state: NativeHomeostasisState; failedCount: number; warningCount: number; missingSensorIds: string[] } {
  const byId = new Map(checks.map((check) => [check.key, check]));
  const missingSensorIds = expectedSensorIds.filter((id) => !byId.has(id));
  const relevant = expectedSensorIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
  const failedCount = relevant.filter((check) => check.status === "failed").reduce((sum, check) => sum + check.count, 0);
  const warningCount = relevant.filter((check) => check.status === "warning").reduce((sum, check) => sum + check.count, 0);
  return {
    state: failedCount > 0 ? "critical" : warningCount > 0 ? "degraded" : missingSensorIds.length > 0 ? "unknown" : "healthy",
    failedCount,
    warningCount,
    missingSensorIds,
  };
}

type DoctorWake = (agentId: string, options: {
  source: "automation";
  triggerDetail: "system";
  reason: string;
  payload: Record<string, unknown>;
  requestedByActorType: "system";
  contextSnapshot: Record<string, unknown>;
  idempotencyKey: string;
}) => Promise<unknown>;

type StalledReadyCandidate = {
  id: string;
  projectId: string;
  ownerAgentId: string;
  stage: string;
  updatedAt: Date;
  dispatchSlaMinutes: number;
  issueId: string | null;
};

type ReviewDispatchCandidate = {
  issueId: string;
  projectId: string | null;
  ownerAgentId: string;
  identifier: string | null;
  title: string;
  updatedAt: Date;
};

export type NativeRemediationRoute = "auto_remediate" | "review_then_remediate" | "escalate";

export function classifyNativeRemediation(input: Pick<CheckResult, "problemClass" | "severity">): {
  route: NativeRemediationRoute;
  riskLevel: "low" | "medium" | "high";
  rationale: string;
} {
  if (input.problemClass === "orphan_execution_lock") {
    return { route: "auto_remediate", riskLevel: "low", rationale: "The mutation clears only a stale lock tied to a terminal run and is guarded by an exact precondition." };
  }
  if (input.problemClass === "dispatch_capacity_gap") {
    return { route: "auto_remediate", riskLevel: "low", rationale: "The bounded action wakes one existing review owner and cannot create work or change product state directly." };
  }
  if (["stalled_ready_work", "review_bottleneck", "stale_roost", "cost_telemetry_gap"].includes(input.problemClass)) {
    return { route: "review_then_remediate", riskLevel: "medium", rationale: "A bounded diagnosis is required before changing operational state." };
  }
  return { route: "escalate", riskLevel: input.severity === "critical" ? "high" : "medium", rationale: "The finding lacks a deterministic, reversible native action with a bounded blast radius." };
}

function cycleKey(kind: "native_watchdog" | "daily_integrity" | "weekly_meta", now: Date) {
  if (kind === "native_watchdog") return now.toISOString().slice(0, 16).replace(/.$/, "0");
  if (kind === "daily_integrity") return now.toISOString().slice(0, 10);
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function nativeSupervisionEngine(db: Db, deps?: { enqueueWakeup?: DoctorWake }) {
  const registry = supervisionRegistryService(db);
  const admission = admissionControlService(db);
  const observations = organizationalObservationService(db);
  const nextActions = nextLegalActionService(db);
  const autonomy = autonomyDecisionService(db, { enqueueWakeup: deps?.enqueueWakeup });

  async function scalar(companyId: string, statement: ReturnType<typeof sql>) {
    const [row] = await db.execute<{ count: number | string }>(statement);
    return Number(row?.count ?? 0);
  }

  async function collectChecks(companyId: string, now: Date, expanded: boolean): Promise<CheckResult[]> {
    const old24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const old2h = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const [runningWithoutAdmission, runawayRetries, stalledReady, orphanTasks, orphanDeliveries, reviewBottlenecks, deploymentBottlenecks, staleRoost, duplicateRoutines, excessiveWip, activeSevereFindings, orphanExecutionLocks, evidenceFreeDone, untypedAcceptedOutcomes, taskOutcomeStateGap, costTelemetryGap, externalShadowGap, dispatchCapacityGap, runnableDispatchGap] = await Promise.all([
      scalar(companyId, sql`select count(*)::int from heartbeat_runs where company_id=${companyId} and status='running' and admission_decision_id is null`),
      scalar(companyId, sql`select count(*)::int from heartbeat_runs where company_id=${companyId} and status in ('queued','running','scheduled_retry') and greatest(process_loss_retry_count, scheduled_retry_attempt, continuation_attempt) > 2`),
      scalar(companyId, sql`select count(*)::int from product_deliveries d where d.company_id=${companyId} and d.stage in ('admitted','implementing') and d.updated_at < ${old2h.toISOString()}::timestamptz and not exists (select 1 from heartbeat_runs r where r.company_id=d.company_id and r.status in ('queued','running') and r.context_snapshot->>'projectId'=d.project_id::text)`),
      scalar(companyId, sql`select count(*)::int from issues where company_id=${companyId} and status in ('todo','in_progress') and assignee_agent_id is null and hidden_at is null`),
      scalar(companyId, sql`select count(*)::int from product_deliveries d where d.company_id=${companyId} and d.stage not in ('outcome_accepted','rolled_back') and not exists (select 1 from delivery_tasks t where t.delivery_id=d.id)`),
      scalar(companyId, sql`
        select count(*)::int
        from issues i
        where i.company_id=${companyId}
          and i.status='in_review'
          and i.updated_at < ${old24h.toISOString()}::timestamptz
          and i.hidden_at is null
          and i.origin_kind <> 'routine_execution'
          and not exists (
            select 1
            from issue_thread_interactions interaction
            where interaction.company_id=i.company_id
              and interaction.issue_id=i.id
              and interaction.status='pending'
          )
      `),
      scalar(companyId, sql`select count(*)::int from product_deliveries where company_id=${companyId} and stage in ('integrated','push_ready','deployed') and updated_at < ${old24h.toISOString()}::timestamptz`),
      scalar(companyId, sql`select count(*)::int from roost_product_map_outbox where company_id=${companyId} and status in ('pending','dead') and observed_at < ${old24h.toISOString()}::timestamptz`),
      scalar(companyId, sql`select count(*)::int from (select lower(title), count(*) from routines where company_id=${companyId} and status='active' group by lower(title) having count(*) > 1) x`),
      scalar(companyId, sql`select greatest(count(*)::int - 3, 0) as count from heartbeat_runs where company_id=${companyId} and status='running'`),
      scalar(companyId, sql`select count(*)::int from supervision_findings where company_id=${companyId} and archived_at is null and severity in ('critical','high') and status not in ('closed','resolved','no_action','duplicate','accepted_risk','not_worth_doing','archived')`),
      scalar(companyId, sql`
        select count(*)::int
        from issues i
        left join heartbeat_runs r on r.id=i.checkout_run_id
        where i.company_id=${companyId}
          and i.checkout_run_id is not null
          and i.execution_locked_at < ${old2h.toISOString()}::timestamptz
          and (r.id is null or r.status in ('succeeded','failed','cancelled','timed_out'))
      `),
      scalar(companyId, sql`select count(*)::int from issues where company_id=${companyId} and status='done' and completion_evidence is null and hidden_at is null`),
      scalar(companyId, sql`
        select count(*)::int
        from product_outcomes
        where company_id=${companyId}
          and status in ('accepted','accepted_with_risk')
          and (jsonb_array_length(acceptance_predicates)=0 or acceptance_decision is null)
      `),
      scalar(companyId, sql`
        select count(distinct i.id)::int
        from issues i
        join delivery_tasks dt on dt.issue_id=i.id and dt.company_id=i.company_id
        join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id
        join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id
        where i.company_id=${companyId}
          and i.hidden_at is null
          and i.origin_kind <> 'routine_execution'
          and i.status not in ('done','cancelled')
          and d.stage='outcome_accepted'
          and o.status in ('accepted','accepted_with_risk')
      `),
      scalar(companyId, sql`
        select case
          when count(*) > 0 and coalesce((select sum(c.cost_cents) from cost_events c where c.company_id=${companyId}),0) = 0
            then count(*)::int
          else 0
        end as count
        from product_outcomes o
        where o.company_id=${companyId}
          and o.status in ('accepted','accepted_with_risk')
      `),
      scalar(companyId, sql`
        select coalesce(jsonb_array_length(only_external),0)::int as count
        from supervision_shadow_comparisons
        where company_id=${companyId}
        order by compared_at desc
        limit 1
      `),
      scalar(companyId, sql`
        select count(*)::int
        from issues i
        join agents a on a.id=i.assignee_agent_id and a.company_id=i.company_id
        where i.company_id=${companyId}
          and i.status='in_review'
          and i.hidden_at is null
          and i.origin_kind <> 'routine_execution'
          and i.updated_at < ${old24h.toISOString()}::timestamptz
          and a.status in ('active','idle','running')
          and lower(coalesce(a.runtime_config#>>'{heartbeat,enabled}','false')) not in ('true','1','yes','on')
          and not exists (
            select 1 from heartbeat_runs r
            where r.company_id=i.company_id and r.agent_id=a.id and r.status in ('queued','running','scheduled_retry')
          )
          and not exists (
            select 1 from issue_thread_interactions interaction
            where interaction.company_id=i.company_id
              and interaction.issue_id=i.id
              and interaction.status='pending'
          )
      `),
      scalar(companyId, sql`
        select count(distinct i.id)::int
        from issues i
        join agents a on a.id=i.assignee_agent_id and a.company_id=i.company_id
        where i.company_id=${companyId}
          and i.hidden_at is null
          and i.origin_kind <> 'routine_execution'
          and i.status in ('backlog','todo')
          and a.status in ('active','idle','running')
          and lower(coalesce(a.runtime_config#>>'{heartbeat,enabled}','false')) not in ('true','1','yes','on')
          and not exists (
            select 1 from heartbeat_runs r
            where r.company_id=i.company_id and r.agent_id=a.id
              and r.status in ('queued','running','scheduled_retry')
          )
          and not exists (
            select 1 from issue_tree_hold_members hm
            join issue_tree_holds h on h.id=hm.hold_id and h.company_id=hm.company_id
            where hm.company_id=i.company_id and hm.issue_id=i.id and h.status='active'
          )
          and not exists (
            select 1 from delivery_tasks dt
            join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id
            join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id
            where dt.company_id=i.company_id and dt.issue_id=i.id
              and d.stage='outcome_accepted'
              and o.status in ('accepted','accepted_with_risk')
          )
          and not exists (
            select 1 from issue_relations rel
            join issues blocker on blocker.id=rel.issue_id and blocker.company_id=rel.company_id
            where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks'
              and blocker.status <> 'done'
          )
          and not exists (
            select 1 from issue_relations rel
            join issues blocker on blocker.id=rel.issue_id and blocker.company_id=rel.company_id
            join delivery_tasks dt on dt.issue_id=blocker.id and dt.company_id=blocker.company_id
            join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id
            join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id
            where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks'
              and blocker.status='done' and o.status not in ('accepted','accepted_with_risk')
          )
      `),
    ]);
    const specs: Array<[string, string, string, number, CheckResult["severity"], string, string, boolean?]> = [
      ["admission_coverage", "Running work without admission", "admission_gap", runningWithoutAdmission, "critical", "governance", "Every running heartbeat must reference its admitted decision.", true],
      ["runaway_retry", "Retry budget exceeded", "runaway_loop", runawayRetries, "critical", "runtime_health", "Active work exceeded the deterministic retry ceiling.", true],
      ["stalled_ready_work", "Admitted delivery has no active run", "stalled_ready_work", stalledReady, "high", "delivery_flow", "Admitted ready work has not been started by its owner.", true],
      ["orphan_tasks", "Executable issues have no owner", "orphan_task", orphanTasks, "high", "ownership", "Todo or in-progress issues must have an owner."],
      ["orphan_deliveries", "Active deliveries have no delivery tasks", "orphan_delivery", orphanDeliveries, "high", "delivery_flow", "Active delivery lacks a bounded execution task."],
      ["review_bottleneck", "Review queue has no decision path", "review_bottleneck", reviewBottlenecks, "high", "review_flow", "Review work exceeded 24 hours without a pending confirmation, question, or other structured decision path.", true],
      ["deployment_bottleneck", "Deployment progression is stale", "deployment_bottleneck", deploymentBottlenecks, "high", "deployment_flow", "Integrated or deployed work has not progressed within 24 hours.", true],
      ["stale_roost", "Roost publication is stale", "stale_roost", staleRoost, "warning", "integration_health", "Roost outbox contains stale unpublished product state."],
      ["routine_overlap", "Active routines overlap by title", "routine_overlap", duplicateRoutines, "warning", "control_complexity", "Multiple active routines declare the same normalized purpose."],
      ["organization_wip", "Organization WIP exceeds default bound", "wip_exceeded", excessiveWip, "high", "economics", "Running work exceeds the default organization WIP of three."],
      ["active_findings_guard", "Active severe findings prevent a green cycle", "false_green_supervision", activeSevereFindings, "critical", "supervision_integrity", "A supervision cycle cannot report green while unresolved critical or high findings remain."],
      ["orphan_execution_locks", "Issues retain orphan execution locks", "orphan_execution_lock", orphanExecutionLocks, "critical", "runtime_health", "A stale checkout references no live execution and requires deterministic recovery.", true],
      ["completion_evidence", "Done issues lack typed completion evidence", "evidence_completeness", evidenceFreeDone, "high", "evidence_integrity", "Terminal issue work must carry inspectable test, review, and documentation evidence.", true],
      ["outcome_predicates", "Accepted outcomes bypassed typed predicates", "outcome_acceptance_gap", untypedAcceptedOutcomes, "critical", "outcome_integrity", "Accepted outcomes must carry delivery-specific predicate evaluation and an acceptance decision.", true],
      ["task_outcome_reconciliation", "Task state conflicts with an accepted outcome", "task_outcome_state_gap", taskOutcomeStateGap, "high", "outcome_integrity", "A non-terminal task is linked to an accepted delivery outcome and must be reconciled from typed evidence before it can be dispatched or closed.", true],
      ["cost_telemetry", "Accepted outcomes have no cost telemetry", "cost_telemetry_gap", costTelemetryGap, "high", "economics", "Accepted outcomes without a cost event make efficiency and waste reporting untrustworthy.", true],
      ["external_shadow_gap", "External assurance found native coverage gaps", "external_assurance_gap", externalShadowGap, "high", "supervision_integrity", "The newest shadow comparison contains external-only findings that native supervision must absorb.", true],
      ["dispatch_capacity", "Stale review has no active dispatch path", "dispatch_capacity_gap", dispatchCapacityGap, "critical", "dispatch_flow", "Review work older than 24 hours has no structured decision path, active owner run, or scheduler heartbeat."],
      ["runnable_dispatch", "Dispatch-eligible assigned work has no active owner lane", "runnable_dispatch_gap", runnableDispatchGap, "high", "dispatch_flow", "Assigned backlog or todo work passes local scheduler exclusions, but its owner has no scheduler heartbeat or live run; priority and dependency readiness still require diagnosis."],
    ];
    return specs
      .filter(([key]) => expanded || ["admission_coverage", "runaway_retry", "stalled_ready_work", "active_findings_guard", "orphan_execution_locks", "completion_evidence", "outcome_predicates", "task_outcome_reconciliation", "cost_telemetry", "external_shadow_gap", "dispatch_capacity", "runnable_dispatch"].includes(key))
      .map(([key, title, problemClass, count, severity, classification, summary]) => ({ key, title, problemClass, count, severity, classification, summary, status: count === 0 ? "passed" : severity === "warning" ? "warning" : "failed", requiresDiagnosis: ["admission_gap", "runaway_loop", "stalled_ready_work", "review_bottleneck", "deployment_bottleneck", "orphan_execution_lock", "evidence_completeness", "outcome_acceptance_gap", "task_outcome_state_gap", "cost_telemetry_gap", "external_assurance_gap"].includes(problemClass) }));
  }

  async function collectReviewDispatchCandidate(companyId: string, now: Date): Promise<ReviewDispatchCandidate | null> {
    const old24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [row] = await db.execute<{
      issue_id: string; project_id: string | null; owner_agent_id: string;
      identifier: string | null; title: string; updated_at: Date;
    }>(sql`
      select i.id as issue_id, i.project_id, i.assignee_agent_id as owner_agent_id,
        i.identifier, i.title, i.updated_at
      from issues i
      join agents a on a.id=i.assignee_agent_id and a.company_id=i.company_id
      where i.company_id=${companyId}
        and i.status='in_review'
        and i.hidden_at is null
        and i.origin_kind <> 'routine_execution'
        and i.updated_at < ${old24h.toISOString()}::timestamptz
        and a.status in ('idle','running')
        and not exists (
          select 1 from heartbeat_runs r
          where r.company_id=i.company_id and r.agent_id=a.id and r.status in ('queued','running','scheduled_retry')
        )
        and not exists (
          select 1 from issue_thread_interactions interaction
          where interaction.company_id=i.company_id and interaction.issue_id=i.id and interaction.status='pending'
        )
      order by
        exists (
          select 1 from heartbeat_runs recent
          where recent.company_id=i.company_id and recent.agent_id=a.id
            and recent.status='succeeded' and recent.created_at >= ${new Date(now.getTime() - 7 * 86_400_000).toISOString()}::timestamptz
        ) desc,
        i.updated_at asc
      limit 1
    `);
    return row ? {
      issueId: row.issue_id,
      projectId: row.project_id,
      ownerAgentId: row.owner_agent_id,
      identifier: row.identifier,
      title: row.title,
      updatedAt: new Date(row.updated_at),
    } : null;
  }

  async function promoteVerifiedInterventionLearning(input: {
    companyId: string; findingId: string; interventionId: string; observationWindowId: string;
    safeguardId: string; issueId: string; now: Date;
  }) {
    const existing = await db.select({ id: organizationalObservations.id }).from(organizationalObservations).where(and(
      eq(organizationalObservations.companyId, input.companyId),
      eq(organizationalObservations.kind, "learning"),
      eq(organizationalObservations.sourceClass, "native_supervision_verified_intervention"),
      sql`${organizationalObservations.provenance} @> ${JSON.stringify([{ kind: "other", ref: `supervision_intervention:${input.interventionId}` }])}::jsonb`,
    )).limit(1).then((rows) => rows[0] ?? null);
    if (existing) return observations.evaluateLearningPromotion(existing.id, { now: input.now });
    const observation = await observations.create(input.companyId, {
      kind: "learning",
      status: "proposed",
      title: "Bounded review dispatch restored a structured decision path",
      summary: "A stale review with no active dispatch path was routed to its existing owner. Independent postcondition evidence confirmed that the issue left an unstructured review wait or created a structured decision path. Reuse this safeguard only for one assigned review at a time.",
      sourceClass: "native_supervision_verified_intervention",
      provenance: [
        { kind: "other", ref: `supervision_intervention:${input.interventionId}`, label: "Authorized bounded intervention", observedAt: input.now.toISOString() },
        { kind: "metric", ref: `supervision_observation_window:${input.observationWindowId}`, label: "Verified postcondition", observedAt: input.now.toISOString() },
      ],
      confidence: 95,
      observedAt: input.now.toISOString(),
      issueId: input.issueId,
      measurement: { name: "verified_postconditions", value: 1, unit: "intervention", baseline: 0, target: 1 },
      promotionTarget: { kind: "policy", ref: `native_safeguard:${input.safeguardId}`, label: "Bounded stale-review dispatch" },
    }, { agentId: null, userId: "native-supervision" });
    const promoted = await observations.evaluateLearningPromotion(observation.id, { now: input.now });
    await logActivity(db, {
      companyId: input.companyId, actorType: "system", actorId: "native-supervision",
      action: "supervision.learning.promotion_evaluated", entityType: "organizational_observation", entityId: observation.id,
      details: { findingId: input.findingId, interventionId: input.interventionId, disposition: promoted?.disposition, transitions: promoted?.transitions },
    });
    return promoted;
  }

  async function reconcileReviewDispatchInterventions(companyId: string, now: Date) {
    const active = await db.select().from(supervisionInterventions).where(and(
      eq(supervisionInterventions.companyId, companyId),
      eq(supervisionInterventions.kind, "dispatch_stale_review"),
      inArray(supervisionInterventions.status, ["authorized", "in_progress"]),
    ));
    const results: Array<Record<string, unknown>> = [];
    for (const intervention of active) {
      if (!intervention.issueId) continue;
      const issue = await db.select({ status: issues.status, updatedAt: issues.updatedAt }).from(issues)
        .where(and(eq(issues.id, intervention.issueId), eq(issues.companyId, companyId)))
        .then((rows) => rows[0] ?? null);
      const pendingDecision = await db.select({ id: issueThreadInteractions.id }).from(issueThreadInteractions).where(and(
        eq(issueThreadInteractions.companyId, companyId),
        eq(issueThreadInteractions.issueId, intervention.issueId),
        eq(issueThreadInteractions.status, "pending"),
      )).limit(1).then((rows) => rows[0] ?? null);
      const passed = Boolean(issue && (!["in_review", "in_progress"].includes(issue.status) || pendingDecision));
      if (!passed) {
        const result = intervention.result as {
          wakeResult?: { id?: string };
          contextRetryRunId?: string;
          contextRetryCount?: number;
        };
        const priorRunId = result.contextRetryRunId ?? result.wakeResult?.id;
        const priorRun = priorRunId
          ? await db.select({ id: heartbeatRuns.id, status: heartbeatRuns.status, error: heartbeatRuns.error })
            .from(heartbeatRuns)
            .where(and(eq(heartbeatRuns.id, priorRunId), eq(heartbeatRuns.companyId, companyId)))
            .then((rows) => rows[0] ?? null)
          : null;
        const budget = intervention.budget as { idempotencyKey?: string };
        const contextAdmissionFailed = priorRun?.status === "failed" && /context.*admission|admission.*context/i.test(priorRun.error ?? "");
        if (contextAdmissionFailed && (result.contextRetryCount ?? 0) < 1 && deps?.enqueueWakeup && intervention.ownerAgentId) {
          const retryIdempotencyKey = `${budget.idempotencyKey ?? `dispatch-stale-review:${intervention.issueId}`}:context-retry:1`;
          const retry = await deps.enqueueWakeup(intervention.ownerAgentId, {
            source: "automation", triggerDetail: "system", reason: "supervision_review_bottleneck_dispatch",
            payload: { findingId: intervention.findingId, interventionId: intervention.id, issueId: intervention.issueId, nativeAction: "review_decision_only", retryReason: "context_admission_failed" },
            requestedByActorType: "system", idempotencyKey: retryIdempotencyKey,
            contextSnapshot: {
              source: "native_supervision", findingId: intervention.findingId, interventionId: intervention.id, issueId: intervention.issueId,
              workType: "review", contextBudget: { tokenLimit: 8_000, fileLimit: 8 },
              contextOverride: {
                authority: "native_supervision", approvedBy: "system", overrideId: retryIdempotencyKey,
                reason: "The measured mandatory repository and agent instructions exceeded the review baseline; permit only the observed instruction delta.",
                expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(), tokenLimit: 14_000, fileLimit: 8,
              },
              allowedActions: ["inspect_existing_evidence", "accept", "request_changes", "create_structured_decision_interaction"],
              prohibitedActions: ["create_new_issue", "implement_product_changes", "push", "deploy", "restart", "touch_secrets"],
              outcomePredicate: "review_decision_state_or_pending_decision_exists",
            },
          });
          await registry.updateIntervention(intervention.id, {
            status: "in_progress",
            result: { contextRetryCount: 1, contextRetryRunId: (retry as { id?: string }).id ?? null, contextRetryReason: "final_context_hard_admission", contextRetryAt: now.toISOString() },
          });
          results.push({ interventionId: intervention.id, status: "context_retry_dispatched", priorRunId, retryRunId: (retry as { id?: string }).id ?? null });
          continue;
        }
        if (intervention.startedAt && now.getTime() - intervention.startedAt.getTime() > 2 * 60 * 60 * 1000) {
          await registry.updateIntervention(intervention.id, { status: "escalated", result: { verifiedAt: now.toISOString(), reason: "postcondition_timeout" } });
          await db.update(supervisionFindings).set({ status: "needs_decision", recoveryState: "blocked", updatedAt: now })
            .where(eq(supervisionFindings.id, intervention.findingId));
          results.push({ interventionId: intervention.id, status: "escalated" });
        }
        continue;
      }
      const finding = await registry.getFinding(intervention.findingId);
      const rootCauseId = finding?.rootCauseId ?? intervention.rootCauseId;
      if (!finding || !rootCauseId) continue;
      if (!finding.rootCauseId) await registry.linkFindingRootCause(finding.id, rootCauseId);
      const safeguard = await db.execute<{ id: string }>(sql`
        select id from native_safeguards
        where company_id=${companyId} and root_cause_id=${rootCauseId}
        order by created_at desc limit 1
      `).then((rows) => rows[0] ?? null);
      if (!safeguard) continue;
      await registry.updateIntervention(intervention.id, {
        status: "verified",
        result: { verifiedAt: now.toISOString(), issueStatus: issue?.status, pendingDecisionInteractionId: pendingDecision?.id ?? null, postconditionPassed: true },
        evidence: [{ sourceKind: "database_check", sourceRef: `issue:${intervention.issueId}:review-postcondition`, label: "Review obtained a structured decision path", metadata: { issueStatus: issue?.status, pendingDecisionInteractionId: pendingDecision?.id ?? null, checkedAt: now.toISOString() } }],
      });
      await registry.updateSafeguard(safeguard.id, { status: "verified", enabled: true });
      const window = await registry.createObservationWindow(companyId, {
        findingId: intervention.findingId,
        interventionId: intervention.id,
        nativeSafeguardId: safeguard.id,
        expectedEffect: "The selected review reaches a decision state or gains a structured decision path; automatic in-progress checkout alone does not pass.",
        successCriteria: [{ predicate: "review_decision_state_or_pending_decision_exists", expected: true }],
        startsAt: new Date(now.getTime() - 60_000).toISOString(),
        endsAt: new Date(now.getTime() + 60_000).toISOString(),
      });
      await registry.completeObservationWindow(window.id, {
        status: "passed",
        measurements: [{ predicate: "review_decision_state_or_pending_decision_exists", value: true, issueStatus: issue?.status, pendingDecisionInteractionId: pendingDecision?.id ?? null }],
        conclusion: "A direct database readback independently confirmed the bounded review-dispatch postcondition.",
      });
      await registry.closeRootCause(rootCauseId, {
        resolution: "A bounded, idempotent review-owner dispatch restored a structured decision path without creating new work.",
        nativeSafeguardId: safeguard.id,
        evidence: [{ sourceKind: "observation_window", sourceRef: `supervision_observation_window:${window.id}`, label: "Passed postcondition observation", metadata: { interventionId: intervention.id } }],
        retentionDays: 365,
      });
      const learning = await promoteVerifiedInterventionLearning({ companyId, findingId: finding.id, interventionId: intervention.id, observationWindowId: window.id, safeguardId: safeguard.id, issueId: intervention.issueId, now });
      results.push({ interventionId: intervention.id, status: "verified", observationWindowId: window.id, learningDisposition: learning?.disposition });
    }
    return results;
  }

  async function dispatchOneStaleReview(companyId: string, findingId: string, cycleId: string | null, now: Date) {
    if (!deps?.enqueueWakeup) return { status: "not_configured" as const };
    const recentOrActive = await db.select({ id: supervisionInterventions.id }).from(supervisionInterventions).where(and(
      eq(supervisionInterventions.companyId, companyId),
      eq(supervisionInterventions.kind, "dispatch_stale_review"),
      sql`(${supervisionInterventions.status} in ('authorized','in_progress') or ${supervisionInterventions.createdAt} >= ${new Date(now.getTime() - 60 * 60 * 1000).toISOString()}::timestamptz)`,
    )).limit(1).then((rows) => rows[0] ?? null);
    if (recentOrActive) return { status: "cooldown" as const };
    const candidate = await collectReviewDispatchCandidate(companyId, now);
    if (!candidate) return { status: "no_candidate" as const };
    const finding = await registry.getFinding(findingId);
    if (!finding) return { status: "missing_finding" as const };
    const decision = await admission.evaluateWork({
      companyId, projectId: candidate.projectId, issueId: candidate.issueId, agentId: candidate.ownerAgentId,
      source: "supervision.dispatch_capacity", fingerprint: `dispatch-review:${candidate.issueId}`,
      evidenceHash: createHash("sha256").update(`${candidate.issueId}:${candidate.updatedAt.toISOString()}`).digest("hex"), retryCount: 0,
    });
    if (!decision.admitted) return { status: decision.disposition, admissionDecisionId: decision.decisionId };
    const root = (await registry.createRootCause(companyId, {
      fingerprint: `root:dispatch-capacity-review:${companyId}`,
      problemClass: "dispatch_capacity_gap", status: "confirmed",
      title: "Assigned review work has no active dispatch path",
      summary: "Available owners have assigned review work, but scheduler heartbeats are disabled and no live run exists.",
      hypothesis: "Operational execution was paused at the dispatch layer while review inventory remained open.",
      ownerAgentId: candidate.ownerAgentId, ownerUserId: null, projectId: candidate.projectId, issueId: candidate.issueId,
    })).rootCause;
    await registry.linkFindingRootCause(finding.id, root.id);
    const safeguard = (await registry.createSafeguard(companyId, {
      key: "bounded-stale-review-dispatch-v1", kind: "dispatch_policy", status: "implemented",
      title: "Dispatch at most one stale review to its existing owner",
      target: "issues.status=in_review with no active run or pending decision",
      implementationRef: "server/src/services/native-supervision-engine.ts#dispatchOneStaleReview",
      regressionTestRef: "server/src/__tests__/native-supervision-engine.test.ts",
      removalCondition: "All assigned review owners have healthy native scheduling or a replacement dispatcher is verified.",
      ownerAgentId: candidate.ownerAgentId, rootCauseId: root.id, enabled: true,
    })).safeguard;
    const idempotencyKey = `dispatch-stale-review:${candidate.issueId}:${candidate.updatedAt.toISOString()}`;
    const intervention = await registry.createIntervention(companyId, {
      findingId: finding.id, rootCauseId: root.id, cycleId, admissionDecisionId: decision.decisionId,
      issueId: candidate.issueId, deliveryId: null, ownerAgentId: candidate.ownerAgentId,
      kind: "dispatch_stale_review", status: "authorized",
      changeSummary: `Wake the existing owner of ${candidate.identifier ?? candidate.issueId} for a review-only decision.` ,
      expectedEffect: "The issue reaches a review decision state or gains a structured pending decision interaction; automatic in-progress checkout is not sufficient.",
      rollbackPlan: "Cancel the bounded wake if still active; do not alter the issue status automatically; escalate after two hours without the postcondition.",
      budget: {
        idempotencyKey, remediationRoute: "auto_remediate", riskLevel: "low", blastRadius: { maxIssues: 1, maxAgents: 1 },
        preconditions: ["issue_is_stale_in_review", "existing_owner_is_available", "no_live_run_for_owner", "no_pending_decision_interaction", "admission_is_open"],
        postconditions: ["review_decision_state_or_pending_decision_exists"], retryBudget: 1, retryCondition: "final_context_hard_admission_only", timeoutMinutes: 120,
      },
    });
    await registry.updateIntervention(intervention.id, { status: "in_progress", result: { authorizedAt: now.toISOString(), issueId: candidate.issueId, safeguardId: safeguard.id } });
    const wake = await deps.enqueueWakeup(candidate.ownerAgentId, {
      source: "automation", triggerDetail: "system", reason: "supervision_review_bottleneck_dispatch",
      payload: { findingId: finding.id, interventionId: intervention.id, issueId: candidate.issueId, nativeAction: "review_decision_only" },
      requestedByActorType: "system", idempotencyKey,
      contextSnapshot: {
        source: "native_supervision", findingId: finding.id, interventionId: intervention.id, issueId: candidate.issueId,
        workType: "review", contextBudget: { tokenLimit: 8_000, fileLimit: 8 },
        contextOverride: {
          authority: "native_supervision", approvedBy: "system", overrideId: idempotencyKey,
          reason: "Mandatory repository and agent instructions can exceed the review baseline; permit only the bounded instruction delta.",
          expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(), tokenLimit: 14_000, fileLimit: 8,
        },
        allowedActions: ["inspect_existing_evidence", "accept", "request_changes", "create_structured_decision_interaction"],
        prohibitedActions: ["create_new_issue", "implement_product_changes", "push", "deploy", "restart", "touch_secrets"],
        outcomePredicate: "review_decision_state_or_pending_decision_exists",
      },
    });
    await registry.markFindingAssigned(finding.id, { ownerAgentId: candidate.ownerAgentId, admissionDecisionId: decision.decisionId });
    await registry.updateIntervention(intervention.id, { status: "in_progress", result: { wakeAccepted: true, wakeResult: wake as Record<string, unknown> } });
    await logActivity(db, {
      companyId, actorType: "system", actorId: "native-supervision", action: "supervision.review_dispatch.executed",
      entityType: "supervision_intervention", entityId: intervention.id,
      details: { findingId: finding.id, issueId: candidate.issueId, ownerAgentId: candidate.ownerAgentId, idempotencyKey, postcondition: "review_decision_state_or_pending_decision_exists" },
    });
    return { status: "dispatched" as const, findingId: finding.id, interventionId: intervention.id, issueId: candidate.issueId, ownerAgentId: candidate.ownerAgentId };
  }

  async function recoverOrphanExecutionLocks(companyId: string, now: Date) {
    const old2h = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const rows = await db.execute<{ id: string }>(sql`
      update issues i
      set checkout_run_id=null, execution_locked_at=null, updated_at=${now.toISOString()}::timestamptz
      where i.company_id=${companyId}
        and i.checkout_run_id is not null
        and i.execution_locked_at < ${old2h.toISOString()}::timestamptz
        and exists (select 1 from heartbeat_runs r where r.id=i.checkout_run_id and r.status in ('succeeded','failed','cancelled','timed_out'))
      returning i.id
    `);
    for (const row of rows) {
      await logActivity(db, {
        companyId, actorType: "system", actorId: "native-supervision",
        action: "supervision.orphan_execution_lock.recovered", entityType: "issue", entityId: row.id,
        details: { recoveredAt: now.toISOString(), safeguard: "terminal_run_lock_release" },
      });
    }
    return rows.map((row) => ({ issueId: row.id, status: "recovered" }));
  }

  async function routeOrphanTasks(companyId: string, now: Date) {
    if (!deps?.enqueueWakeup) return [] as Array<Record<string, unknown>>;
    const rows = await db.execute<{ id: string; project_id: string | null; owner_agent_id: string | null }>(sql`
      select i.id, i.project_id, coalesce(lead.id, fallback.id) as owner_agent_id
      from issues i
      left join projects p on p.id=i.project_id and p.company_id=i.company_id
      left join agents lead on lead.id=p.lead_agent_id and lead.company_id=i.company_id and lead.status in ('idle','running')
      left join lateral (
        select a.id from agents a
        where a.company_id=i.company_id and a.reports_to is null and a.status in ('idle','running')
        order by a.created_at asc limit 1
      ) fallback on true
      where i.company_id=${companyId}
        and i.status in ('todo','in_progress')
        and i.assignee_agent_id is null
        and i.hidden_at is null
      order by i.updated_at asc
      limit 50
    `);
    const routed: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      if (!row.owner_agent_id) {
        routed.push({ issueId: row.id, status: "needs_decision", reason: "no_active_hierarchy_owner" });
        continue;
      }
      const decision = await admission.evaluateWork({
        companyId, projectId: row.project_id, issueId: row.id, agentId: row.owner_agent_id,
        source: "supervision.orphan_task_routing", fingerprint: `orphan_task:${row.id}`,
        evidenceHash: createHash("sha256").update(`${row.id}:${row.owner_agent_id}`).digest("hex"), retryCount: 0,
      });
      if (!decision.admitted) {
        routed.push({ issueId: row.id, status: decision.disposition, admissionDecisionId: decision.decisionId });
        continue;
      }
      const [assigned] = await db.update(issues).set({ assigneeAgentId: row.owner_agent_id, updatedAt: now }).where(and(
        eq(issues.id, row.id), eq(issues.companyId, companyId), isNull(issues.assigneeAgentId), inArray(issues.status, ["todo", "in_progress"]),
      )).returning();
      if (!assigned) continue;
      await logActivity(db, {
        companyId, actorType: "system", actorId: "native-supervision",
        action: "supervision.orphan_task.routed_to_hierarchy", entityType: "issue", entityId: row.id,
        details: { ownerAgentId: row.owner_agent_id, admissionDecisionId: decision.decisionId },
      });
      await deps.enqueueWakeup(row.owner_agent_id, {
        source: "automation", triggerDetail: "system", reason: "supervision_orphan_task_owner_routing",
        payload: { issueId: row.id, nativeAction: "route_via_hierarchy" }, requestedByActorType: "system",
        idempotencyKey: `orphan-task:${row.id}:${row.owner_agent_id}`,
        contextSnapshot: { source: "native_supervision", issueId: row.id, workType: "owner", contextBudget: { tokenLimit: 10_000, fileLimit: 8 }, prohibitedAction: "owner_performs_product_work_instead_of_delegating" },
      });
      routed.push({ issueId: row.id, status: "routed", ownerAgentId: row.owner_agent_id, admissionDecisionId: decision.decisionId });
    }
    return routed;
  }

  async function collectStalledReadyCandidates(companyId: string, now: Date): Promise<StalledReadyCandidate[]> {
    const rows = await db.select({
      id: productDeliveries.id,
      projectId: productDeliveries.projectId,
      ownerAgentId: productDeliveries.ownerAgentId,
      stage: productDeliveries.stage,
      updatedAt: productDeliveries.updatedAt,
      decisionContract: productDeliveries.decisionContract,
    }).from(productDeliveries).where(and(
      eq(productDeliveries.companyId, companyId),
      inArray(productDeliveries.stage, ["admitted", "implementing"]),
      isNotNull(productDeliveries.ownerAgentId),
      sql`${productDeliveries.updatedAt} +
        (greatest(coalesce((${productDeliveries.decisionContract}->>'dispatchSlaMinutes')::int, 120), 0) * interval '1 minute')
        <= ${now.toISOString()}::timestamptz`,
      sql`not exists (
        select 1 from heartbeat_runs r
        where r.company_id=${companyId}
          and r.agent_id=${productDeliveries.ownerAgentId}
          and r.status in ('queued','running','scheduled_retry')
      )`,
      sql`not exists (
        select 1
        from delivery_tasks delegated_parent
        join issues delegated_child on delegated_child.parent_id=delegated_parent.issue_id
        where delegated_parent.delivery_id=${productDeliveries.id}
          and delegated_child.assignee_agent_id is not null
          and delegated_child.assignee_agent_id<>${productDeliveries.ownerAgentId}
          and delegated_child.status in ('todo','in_progress','in_review','done')
      )`,
    ));
    return Promise.all(rows.filter((row) => Boolean(row.ownerAgentId)).map(async (row) => {
      const task = await db.select({ issueId: deliveryTasks.issueId }).from(deliveryTasks)
        .where(eq(deliveryTasks.deliveryId, row.id)).orderBy(asc(deliveryTasks.createdAt)).limit(1)
        .then((items) => items[0] ?? null);
      return {
        id: row.id,
        projectId: row.projectId,
        ownerAgentId: row.ownerAgentId!,
        stage: row.stage,
        updatedAt: row.updatedAt,
        dispatchSlaMinutes: Math.max(0, Number((row.decisionContract as Record<string, unknown>)?.dispatchSlaMinutes ?? 120)),
        issueId: task?.issueId ?? null,
      };
    }));
  }

  async function collectDailyRuntimeMetrics(companyId: string, now: Date) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const [totals] = await db.execute<Record<string, number | string>>(sql`
      select
        count(*)::int as runs,
        count(*) filter (where status='succeeded')::int as succeeded,
        count(*) filter (where status in ('failed','timed_out','cancelled'))::int as unsuccessful,
        coalesce(sum(case when coalesce(usage_json->>'inputTokens','') ~ '^[0-9]+$' then (usage_json->>'inputTokens')::bigint else 0 end),0)::bigint as raw_input_tokens,
        coalesce(sum(case when coalesce(usage_json->>'uncachedInputTokens','') ~ '^[0-9]+$' then (usage_json->>'uncachedInputTokens')::bigint else 0 end),0)::bigint as uncached_input_tokens,
        coalesce(sum(case when coalesce(usage_json->>'cachedInputTokens','') ~ '^[0-9]+$' then (usage_json->>'cachedInputTokens')::bigint else 0 end),0)::bigint as cached_input_tokens,
        coalesce(sum(case when coalesce(usage_json->>'outputTokens','') ~ '^[0-9]+$' then (usage_json->>'outputTokens')::bigint else 0 end),0)::bigint as output_tokens,
        coalesce(sum(case when coalesce(usage_json#>>'{contextTelemetry,onDemandReads}','') ~ '^[0-9]+$' then (usage_json#>>'{contextTelemetry,onDemandReads}')::int else 0 end),0)::int as tool_reads,
        coalesce(sum(process_loss_retry_count + scheduled_retry_attempt + continuation_attempt),0)::int as retries,
        coalesce(sum(case when status in ('failed','timed_out','cancelled') and coalesce(usage_json->>'inputTokens','') ~ '^[0-9]+$' then (usage_json->>'inputTokens')::bigint else 0 end),0)::bigint as wasted_input_tokens
        ,(select count(*) from product_outcomes o where o.company_id=${companyId} and o.status in ('accepted','accepted_with_risk'))::int as accepted_outcomes
        ,(select case
            when count(*) > 0 and coalesce((select sum(c.cost_cents) from cost_events c where c.company_id=${companyId}),0) = 0
              then count(*)::int
            else 0
          end
          from product_outcomes o
          where o.company_id=${companyId} and o.status in ('accepted','accepted_with_risk'))::int as accepted_outcomes_missing_cost
        ,(select count(*) from cost_events c where c.company_id=${companyId} and c.occurred_at >= ${since}::timestamptz)::int as cost_events
        ,(select coalesce(sum(c.cost_cents),0) from cost_events c where c.company_id=${companyId} and c.occurred_at >= ${since}::timestamptz)::bigint as reported_cost_cents
      from heartbeat_runs
      where company_id=${companyId} and created_at >= ${since}::timestamptz
    `);
    const topAgents = await db.execute<Record<string, number | string | null>>(sql`
      select r.agent_id, a.name, count(*)::int as runs,
        coalesce(sum(case when coalesce(r.usage_json->>'inputTokens','') ~ '^[0-9]+$' then (r.usage_json->>'inputTokens')::bigint else 0 end),0)::bigint as input_tokens,
        count(*) filter (where r.status in ('failed','timed_out','cancelled'))::int as unsuccessful
      from heartbeat_runs r join agents a on a.id=r.agent_id
      where r.company_id=${companyId} and r.created_at >= ${since}::timestamptz
      group by r.agent_id, a.name order by input_tokens desc limit 5
    `);
    const topSessions = await db.execute<Record<string, number | string | null>>(sql`
      select coalesce(usage_json->>'persistedSessionId', session_id_after, session_id_before, 'fresh') as session_id,
        count(*)::int as runs,
        coalesce(sum(case when coalesce(usage_json->>'inputTokens','') ~ '^[0-9]+$' then (usage_json->>'inputTokens')::bigint else 0 end),0)::bigint as input_tokens
      from heartbeat_runs
      where company_id=${companyId} and created_at >= ${since}::timestamptz
      group by 1 order by input_tokens desc limit 5
    `);
    const topSources = await db.execute<Record<string, number | string | null>>(sql`
      select source->>'source' as source, count(*)::int as inclusions,
        coalesce(sum(case when coalesce(source->>'estimatedTokens','') ~ '^[0-9]+$' then (source->>'estimatedTokens')::bigint else 0 end),0)::bigint as estimated_tokens
      from heartbeat_runs r
      cross join lateral jsonb_array_elements(coalesce(r.context_snapshot#>'{contextAdmission,sources}','[]'::jsonb)) source
      where r.company_id=${companyId} and r.created_at >= ${since}::timestamptz
      group by 1 order by estimated_tokens desc limit 10
    `);
    const normalized = Object.fromEntries(Object.entries(totals ?? {}).map(([key, value]) => [key, Number(value ?? 0)]));
    const inputTokens = normalized.raw_input_tokens ?? 0;
    return {
      windowHours: 24,
      ...normalized,
      costTelemetry: {
        state: (normalized.accepted_outcomes_missing_cost ?? 0) > 0 ? "unknown" : "known",
        reportedCostCents: normalized.reported_cost_cents ?? 0,
        reason: (normalized.accepted_outcomes_missing_cost ?? 0) > 0
          ? "Accepted outcomes exist without any cost event; missing telemetry is not interpreted as zero cost."
          : "Reported cost is derived from observed cost events; a numeric zero is valid only when telemetry exists.",
      },
      wasteRatio: inputTokens > 0 ? (normalized.wasted_input_tokens ?? 0) / inputTokens : 0,
      topAgents: topAgents.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]))),
      topSessions: topSessions.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]))),
      topSources: topSources.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]))),
    };
  }

  async function reconcileResolvedOwnerBottlenecks(companyId: string, now: Date) {
    const findings = await db.select().from(supervisionFindings).where(and(
      eq(supervisionFindings.companyId, companyId),
      eq(supervisionFindings.bottleneckType, "owner_bottleneck"),
      inArray(supervisionFindings.status, ["assigned", "admission_pending"]),
      isNotNull(supervisionFindings.deliveryId),
      isNotNull(supervisionFindings.ownerAgentId),
    ));
    const resolvedFindingIds: string[] = [];
    for (const finding of findings) {
      const parentIssueIds = await db.select({ issueId: deliveryTasks.issueId }).from(deliveryTasks)
        .where(eq(deliveryTasks.deliveryId, finding.deliveryId!)).then((rows) => rows.map((row) => row.issueId));
      if (parentIssueIds.length === 0) continue;
      const delegatedChild = await db.select({ id: issues.id, assigneeAgentId: issues.assigneeAgentId }).from(issues)
        .where(and(
          eq(issues.companyId, companyId),
          inArray(issues.parentId, parentIssueIds),
          isNotNull(issues.assigneeAgentId),
          ne(issues.assigneeAgentId, finding.ownerAgentId!),
          inArray(issues.status, ["todo", "in_progress", "in_review", "done"]),
        )).limit(1).then((rows) => rows[0] ?? null);
      if (!delegatedChild) continue;
      await registry.resolveBottleneck(finding.id);
      await logActivity(db, {
        companyId,
        actorType: "system",
        actorId: "native-supervision",
        action: "supervision.bottleneck.resolved_by_delegation",
        entityType: "supervision_finding",
        entityId: finding.id,
        details: { deliveryId: finding.deliveryId, delegatedIssueId: delegatedChild.id, executorAgentId: delegatedChild.assigneeAgentId, resolvedAt: now.toISOString() },
      });
      resolvedFindingIds.push(finding.id);
    }
    return resolvedFindingIds;
  }

  async function persistAndDispatchStalledReady(companyId: string, now: Date, cycleId: string | null) {
    const resolvedFindingIds = await reconcileResolvedOwnerBottlenecks(companyId, now);
    const candidates = await collectStalledReadyCandidates(companyId, now);
    const results: Array<Record<string, unknown>> = resolvedFindingIds.map((findingId) => ({ findingId, status: "resolved" }));
    for (const candidate of candidates) {
      const fingerprint = `owner_bottleneck:stalled_ready_work:${candidate.id}`;
      const slaDueAt = new Date(candidate.updatedAt.getTime() + candidate.dispatchSlaMinutes * 60 * 1000);
      const result = await registry.upsertFinding(companyId, {
        fingerprint,
        problemClass: "stalled_ready_work",
        severity: "high",
        status: "admission_pending",
        classification: "delivery_flow",
        sourceKind: "native_watchdog",
        sourceRef: `delivery:${candidate.id}`,
        title: "Admitted delivery requires owner routing",
        summary: `Delivery ${candidate.id} remains at ${candidate.stage} without an active owner run.`,
        affectedComponent: "delivery_flow",
        projectId: candidate.projectId,
        issueId: null,
        deliveryId: candidate.id,
        deliveryTaskId: null,
        affectedAgentId: candidate.ownerAgentId,
        ownerAgentId: candidate.ownerAgentId,
        ownerUserId: null,
        admissionDecisionId: null,
        rootCauseId: null,
        nativeSafeguardId: null,
        retryCount: 0,
        economics: { risk: "high", priority: "high", retryBudget: 1, stopBoundary: "Escalate to the owner's parent after SLA without a routed run." },
        decision: { deterministicCheck: "stalled_ready_work", nativeAction: "dispatch_delivery_owner", stage: candidate.stage },
        recoveryState: "detected",
        bottleneckType: "owner_bottleneck",
        bottleneckStartedAt: candidate.updatedAt.toISOString(),
        bottleneckStage: candidate.stage,
        dependency: "Delivery owner must route an admitted task through the declared hierarchy.",
        slaDueAt: slaDueAt.toISOString(),
        nextAllowedAction: "Wake the delivery owner with a bounded routing-only packet.",
        escalationCondition: "No admitted child assignment or active run within two hours after owner dispatch.",
        cooldownUntil: null,
        evidence: [{ sourceKind: "database_check", sourceRef: `delivery:${candidate.id}`, label: "Stalled admitted ProductDelivery", metadata: { stage: candidate.stage, updatedAt: candidate.updatedAt.toISOString(), checkedAt: now.toISOString() } }],
        recurrenceEvidence: { deliveryId: candidate.id, stage: candidate.stage, cycleId },
        runId: null,
        cycleId,
      });
      if (!deps?.enqueueWakeup) {
        results.push({ findingId: result.finding.id, status: "not_configured" });
        continue;
      }
      const evidenceHash = createHash("sha256").update(`${fingerprint}:${candidate.updatedAt.toISOString()}`).digest("hex");
      const decision = await admission.evaluateWork({
        companyId,
        projectId: candidate.projectId,
        issueId: null,
        agentId: candidate.ownerAgentId,
        source: "supervision.stalled_ready_dispatch",
        fingerprint,
        evidenceHash,
        retryCount: 0,
      });
      if (!decision.admitted) {
        results.push({ findingId: result.finding.id, status: decision.disposition, admissionDecisionId: decision.decisionId });
        continue;
      }
      if (!candidate.issueId) {
        results.push({ findingId: result.finding.id, status: "needs_decision", reason: "delivery_has_no_owner_routing_task" });
        continue;
      }
      const [assignedIssue] = await db.update(issues).set({
        assigneeAgentId: candidate.ownerAgentId,
        status: "todo",
        updatedAt: now,
      }).where(and(
        eq(issues.id, candidate.issueId),
        eq(issues.companyId, companyId),
        isNull(issues.assigneeAgentId),
        eq(issues.status, "backlog"),
      )).returning();
      if (assignedIssue) {
        await logActivity(db, {
          companyId,
          actorType: "system",
          actorId: "native-supervision",
          action: "supervision.stalled_ready.owner_task_assigned",
          entityType: "issue",
          entityId: assignedIssue.id,
          details: { findingId: result.finding.id, deliveryId: candidate.id, ownerAgentId: candidate.ownerAgentId, admissionDecisionId: decision.decisionId },
        });
      }
      await deps.enqueueWakeup(candidate.ownerAgentId, {
        source: "automation",
        triggerDetail: "system",
        reason: "supervision_stalled_ready_owner_dispatch",
        payload: { findingId: result.finding.id, deliveryId: candidate.id, issueId: candidate.issueId, nativeAction: "route_via_hierarchy" },
        requestedByActorType: "system",
        idempotencyKey: `stalled-ready:${candidate.id}:${candidate.updatedAt.toISOString()}`,
        contextSnapshot: {
          source: "native_supervision",
          findingId: result.finding.id,
          deliveryId: candidate.id,
          issueId: candidate.issueId,
          workType: "owner",
          contextBudget: { tokenLimit: 10_000, fileLimit: 8 },
          contextOverride: {
            authority: "native_supervision",
            approvedBy: "system",
            overrideId: `stalled-ready:${result.finding.id}`,
            reason: "The target repository's mandatory AGENTS.md exceeds the owner-routing baseline; allow only the measured repository-instruction delta.",
            expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
            tokenLimit: 14_000,
            fileLimit: 8,
          },
          nativeAction: "route_via_hierarchy",
          prohibitedAction: "watchdog_or_owner_performs_product_work_directly",
        },
      });
      await registry.markFindingAssigned(result.finding.id, { ownerAgentId: candidate.ownerAgentId, admissionDecisionId: decision.decisionId });
      results.push({ findingId: result.finding.id, status: "dispatched", ownerAgentId: candidate.ownerAgentId, admissionDecisionId: decision.decisionId });
    }
    return results;
  }

  async function runCycle(companyId: string, kind: "native_watchdog" | "daily_integrity", now = new Date()) {
    const key = cycleKey(kind, now);
    await autonomy.refreshGovernanceExpirations(companyId);
    const reconciledAutonomyExecutions = await autonomy.reconcileExecutions(companyId);
    const verifiedReviewInterventions = await reconcileReviewDispatchInterventions(companyId, now);
    const started = await registry.createCycle(companyId, { sourceKind: kind, externalCycleId: key, triggerKind: kind === "native_watchdog" ? "scheduler" : "daily_schedule", budget: { llmCalls: 0, maxFindings: 100 }, expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString() });
    if (!started.created) return { cycle: started.cycle, deduplicated: true, checks: [] as CheckResult[], findings: [] as string[], doctorDispatches: [] as unknown[], verifiedReviewInterventions };
    const checks = await collectChecks(companyId, now, kind === "daily_integrity");
    const findings: string[] = [];
    const reconciledFindings: string[] = [];
    const findingByProblemClass = new Map<string, string>();
    const doctorDispatches: unknown[] = [];
    for (const check of checks.filter((item) => item.status === "passed" && item.key !== "active_findings_guard")) {
      const resolved = await registry.resolveFindingByFingerprint(companyId, `${check.problemClass}:${companyId}`, {
        sourceKind: "database_check",
        sourceRef: `${kind}:${check.key}:${key}:passed`,
        label: `${check.title}: deterministic check passed`,
        metadata: { count: 0, checkedAt: now.toISOString(), cycleId: started.cycle.id },
        checkedAt: now,
      });
      if (resolved) reconciledFindings.push(resolved.id);
    }
    for (const check of checks.filter((item) => item.status !== "passed" && !["stalled_ready_work", "active_findings_guard"].includes(item.key))) {
      const remediation = classifyNativeRemediation(check);
      const result = await registry.upsertFinding(companyId, {
        fingerprint: `${check.problemClass}:${companyId}`,
        problemClass: check.problemClass,
        severity: check.severity,
        status: check.requiresDiagnosis ? "admission_pending" : "needs_decision",
        classification: check.classification,
        sourceKind: kind,
        sourceRef: `supervision_cycle:${started.cycle.id}`,
        title: check.title,
        summary: `${check.summary} Count: ${check.count}.`,
        affectedComponent: check.classification,
        projectId: null, issueId: null, deliveryId: null, deliveryTaskId: null, affectedAgentId: null,
        ownerAgentId: null, ownerUserId: null, admissionDecisionId: null, rootCauseId: null, nativeSafeguardId: null,
        retryCount: 0,
        economics: { risk: check.severity, priority: check.severity, retryBudget: 1, stopBoundary: "Escalate after one bounded intervention without improvement." },
        decision: {
          deterministicCheck: check.key,
          count: check.count,
          remediation,
          ...(check.problemClass === "external_assurance_gap" ? {
            externalInterventionRequired: true,
            reason: "External assurance detected findings absent from native supervision.",
            missingCapability: "native_detector_or_severity_mapping",
            safeguardTarget: "native supervision detector and regression fixture",
            regressionTestRequired: true,
          } : {}),
        }, recoveryState: "detected", cooldownUntil: null,
        evidence: [{ sourceKind: "database_check", sourceRef: `${kind}:${check.key}:${key}`, label: check.title, metadata: { count: check.count, checkedAt: now.toISOString() } }],
        recurrenceEvidence: { check: check.key, count: check.count, cycleId: started.cycle.id }, runId: null, cycleId: started.cycle.id,
      });
      findings.push(result.finding.id);
      findingByProblemClass.set(check.problemClass, result.finding.id);
      if (check.requiresDiagnosis) doctorDispatches.push(await dispatchDoctor(result.finding.id, now));
    }
    const stalledReadyDispatches = await persistAndDispatchStalledReady(companyId, now, started.cycle.id);
    const orphanLockRecoveries = await recoverOrphanExecutionLocks(companyId, now);
    const orphanTaskRoutes = await routeOrphanTasks(companyId, now);
    const reviewDispatch = findingByProblemClass.has("dispatch_capacity_gap")
      ? await dispatchOneStaleReview(companyId, findingByProblemClass.get("dispatch_capacity_gap")!, started.cycle.id, now)
      : { status: "not_required" as const };
    findings.push(...stalledReadyDispatches.map((item) => String(item.findingId)));
    const failed = checks.filter((check) => check.status === "failed").length;
    const warnings = checks.filter((check) => check.status === "warning").length;
    const dailyRuntime = kind === "daily_integrity" ? await collectDailyRuntimeMetrics(companyId, now) : null;
    const nextActionProjection = await nextActions.project(companyId, { now });
    const autonomyDecision = await autonomy.recordDecision(companyId, nextActionProjection, started.cycle.id);
    const activeCanaryAuthorization = autonomyDecision.decision.disposition === "RECOMMEND"
      ? await autonomy.getActiveCanaryAuthorization(autonomyDecision.decision.id)
      : null;
    const autonomyDispatch = autonomyDecision.decision.disposition === "AUTHORIZE"
      ? await autonomy.dispatchAuthorized(autonomyDecision.decision.id)
      : activeCanaryAuthorization
        ? await autonomy.dispatchAuthorized(autonomyDecision.decision.id, activeCanaryAuthorization.id)
        : { status: "NOT_AUTHORIZED" as const, reason: autonomyDecision.decision.reasonCode };
    const nativeActionCount = orphanLockRecoveries.length + orphanTaskRoutes.length + (reviewDispatch.status === "dispatched" ? 1 : 0) + verifiedReviewInterventions.length;
    const homeostasis = {
      runtimeHealth: evaluateHomeostasisDimension(checks, ["admission_coverage", "runaway_retry", "orphan_execution_locks"]),
      dispatchHealth: evaluateHomeostasisDimension(checks, ["dispatch_capacity", "runnable_dispatch", "stalled_ready_work", "review_bottleneck"]),
      evidenceHealth: evaluateHomeostasisDimension(checks, ["completion_evidence", "outcome_predicates", "task_outcome_reconciliation"]),
      supervisionHealth: evaluateHomeostasisDimension(checks, ["active_findings_guard", "external_shadow_gap"]),
    };
    const currentConstraint = {
      kind: nextActionProjection.currentConstraint.kind === "liveness" ? "runnable_dispatch" : nextActionProjection.currentConstraint.kind,
      count: nextActionProjection.currentConstraint.count,
      action: nextActionProjection.currentConstraint.kind === "dependency"
        ? "Prefer the smallest safe action with measured unblock value; do not inflate upstream WIP."
        : nextActionProjection.currentConstraint.kind === "review"
          ? "Resolve structured review decisions before admitting more implementation work."
          : nextActionProjection.currentConstraint.rationale,
    };
    const controlLoops = {
      observation: "active",
      findingReconciliation: "active",
      safeInterventionDispatcher: deps?.enqueueWakeup ? "active" : "not_configured",
      interventionVerifier: "active",
      learningPromotionEvaluator: "active",
    };
    const internalControlLane = {
      owner: "native_supervision",
      trigger: kind === "native_watchdog" ? "scheduler" : "daily_schedule",
      idempotencyKey: `${kind}:${key}`,
      timeoutMinutes: 15,
      retryPolicy: "next_bounded_cycle",
      concurrencyProtection: "unique_source_kind_external_cycle_id",
      auditRef: `supervision_cycle:${started.cycle.id}`,
      stages: {
        observe: { status: "completed", checks: checks.length },
        reconcile: { status: "completed", resolvedFindings: reconciledFindings.length, crossStateConflicts: nextActionProjection.actions.filter((action) => action.requiredNextAction === "RECONCILE").length },
        decide: { status: "completed", decisionId: autonomyDecision.decision.id, mode: autonomyDecision.decision.mode, disposition: autonomyDecision.decision.disposition, confidence: autonomyDecision.decision.confidence },
        act: { status: autonomyDispatch.status === "ACCEPTED" ? "accepted" : "no_mutation", dispatchPostcondition: autonomyDispatch },
        verify: { status: "completed", verifiedInterventions: verifiedReviewInterventions.length, sensorCoverage: homeostasis },
      },
      outcome: failed > 0 ? "attention_required" : Object.values(homeostasis).some((dimension) => dimension.state === "unknown") ? "insufficient_sensor_coverage" : "observed_healthy",
    };
    const cycle = await registry.finishCycle(started.cycle.id, { status: "completed", metrics: { checks: checks.length, failed, warnings, passed: checks.length - failed - warnings, findings: findings.length, reconciledFindings, orphanLockRecoveries: orphanLockRecoveries.length, orphanTaskRoutes: orphanTaskRoutes.length, reviewDispatch, verifiedReviewInterventions, reconciledAutonomyExecutions: reconciledAutonomyExecutions.length, homeostasis, currentConstraint, controlLoops, internalControlLane, autonomyDecision: { id: autonomyDecision.decision.id, mode: autonomyDecision.decision.mode, disposition: autonomyDecision.decision.disposition, reasonCode: autonomyDecision.decision.reasonCode, envelopeId: autonomyDecision.envelope.id, constraintId: autonomyDecision.constraint.id, created: autonomyDecision.created, dispatch: autonomyDispatch }, nextLegalActions: { contractVersion: nextActionProjection.contractVersion, distribution: nextActionProjection.distribution, blockedReasons: nextActionProjection.blockedReasons, currentConstraint: nextActionProjection.currentConstraint }, liveness: nextActionProjection.liveness, shadowDispatch: nextActionProjection.shadowDispatch, ...(dailyRuntime ? { sessionEconomics: dailyRuntime } : {}), llmCalls: 0 }, summary: `${kind}: ${failed} failed, ${warnings} warnings, ${findings.length} linked findings, ${reconciledFindings.length} reconciled findings, ${nativeActionCount} native actions; decision=${autonomyDecision.decision.mode}/${autonomyDecision.decision.disposition}.` });
    const controlObservationAliases: Record<string, string> = {
      runaway_retry: "retry",
      orphan_tasks: "orphan_task",
      orphan_deliveries: "orphan_delivery",
      review_bottleneck: "stale_review",
      deployment_bottleneck: "deployment_backlog",
      organization_wip: "wip",
    };
    const controlMatrix = buildNativeControlMatrix({
      companyId,
      now,
      observations: Object.fromEntries(checks.map((check) => [controlObservationAliases[check.key] ?? check.key, {
        status: check.status,
        measuredValue: check.count,
        evidenceRefs: [`supervision_cycle:${started.cycle.id}`],
      }])),
    });
    return { cycle, deduplicated: false, checks, controlMatrix, findings, doctorDispatches, stalledReadyDispatches, orphanLockRecoveries, orphanTaskRoutes, reviewDispatch, verifiedReviewInterventions };
  }

  async function dispatchDoctor(findingId: string, now = new Date()) {
    const finding = await registry.getFinding(findingId);
    if (!finding || !deps?.enqueueWakeup) return { status: "not_configured" as const };
    if (finding.cooldownUntil && finding.cooldownUntil > now) return { status: "cooldown" as const };
    const doctor = await db.select().from(agents).where(and(
      eq(agents.companyId, finding.companyId),
      inArray(agents.status, ["idle", "running"]),
      sql`(lower(${agents.role}) in ('operational_doctor','doctor') or lower(coalesce(${agents.title},'')) like '%operational doctor%')`,
    )).orderBy(asc(agents.createdAt)).limit(1).then((rows) => rows[0] ?? null);
    if (!doctor) return { status: "no_doctor" as const };
    const evidenceHash = createHash("sha256").update(`${finding.id}:${finding.occurrenceCount}:${finding.lastSeenAt.toISOString()}`).digest("hex");
    const decision = await admission.evaluateWork({ companyId: finding.companyId, projectId: finding.projectId, issueId: finding.issueId, agentId: doctor.id, source: "supervision.doctor", fingerprint: `doctor:${finding.fingerprint}`, evidenceHash, retryCount: finding.retryCount });
    if (!decision.admitted) return { status: decision.disposition, admissionDecisionId: decision.decisionId };
    const intervention = await registry.createIntervention(finding.companyId, { findingId: finding.id, rootCauseId: finding.rootCauseId, cycleId: null, admissionDecisionId: decision.decisionId, issueId: finding.issueId, deliveryId: finding.deliveryId, ownerAgentId: doctor.id, kind: "bounded_diagnosis", status: "proposed", changeSummary: "Diagnose the finding and propose at most one small reversible change.", expectedEffect: "Remove or narrow the root-cause class and create measurable observation criteria.", rollbackPlan: "Revert the bounded change and retain the finding if observation fails.", budget: { maxChanges: 1, retryBudget: 1, requiresRegressionTest: true } });
    await deps.enqueueWakeup(doctor.id, { source: "automation", triggerDetail: "system", reason: "supervision_finding_requires_diagnosis", payload: { findingId: finding.id, interventionId: intervention.id }, requestedByActorType: "system", idempotencyKey: `doctor:${finding.id}:${finding.occurrenceCount}`, contextSnapshot: { source: "native_supervision", findingId: finding.id, interventionId: intervention.id, contextBudget: { tokenLimit: 6000, fileLimit: 8 }, allowedChanges: ["one_reversible_change", "one_regression_test"], rollbackRequired: true } });
    await registry.markFindingAssigned(finding.id, { ownerAgentId: doctor.id, admissionDecisionId: decision.decisionId });
    return { status: "dispatched" as const, doctorAgentId: doctor.id, admissionDecisionId: decision.decisionId, interventionId: intervention.id };
  }

  async function runWeekly(companyId: string, now = new Date()) {
    const key = cycleKey("weekly_meta", now);
    const started = await registry.createCycle(companyId, { sourceKind: "weekly_meta", externalCycleId: key, triggerKind: "weekly_schedule", budget: { maxPriorities: 3, aggregateOnly: true }, expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString() });
    if (!started.created) return { cycle: started.cycle, deduplicated: true };
    const [metrics] = await db.execute<Record<string, number | string>>(sql`
      select
        (select count(*) from agents where company_id=${companyId} and status <> 'terminated')::int as agents,
        (select count(*) from routines where company_id=${companyId} and status='active')::int as active_routines,
        (select count(*) from supervision_findings where company_id=${companyId} and archived_at is null and status not in ('closed','resolved','no_action','duplicate','accepted_risk','not_worth_doing'))::int as open_findings,
        (select count(*) from supervision_root_causes where company_id=${companyId} and status='resolved')::int as resolved_root_causes,
        (select coalesce(sum(occurrence_count-1),0) from supervision_findings where company_id=${companyId})::int as recurrences,
        (select count(*) from product_deliveries where company_id=${companyId} and stage='outcome_accepted')::int as accepted_outcomes,
        (select coalesce(sum(cost_cents),0) from cost_events where company_id=${companyId})::int as cost_cents,
        (select coalesce(avg(jsonb_array_length(delegation_path)),0) from assignment_proposals where company_id=${companyId} and status='applied')::numeric as avg_delegation_path,
        (select count(*) from delegation_reports where company_id=${companyId})::int as upward_reports,
        (select count(*) from supervision_findings where company_id=${companyId} and source_kind <> 'external_assurance' and first_seen_at >= ${new Date(now.getTime() - 7 * 86_400_000).toISOString()}::timestamptz)::int as native_detected_7d,
        (select coalesce(jsonb_array_length(only_external),0) from supervision_shadow_comparisons where company_id=${companyId} order by compared_at desc limit 1)::int as external_only_latest,
        (select count(*) from supervision_interventions where company_id=${companyId} and status='verified')::int as verified_native_corrections,
        (select count(*) from supervision_findings f where f.company_id=${companyId} and f.status not in ('closed','resolved','no_action','duplicate','accepted_risk','not_worth_doing') and not exists (select 1 from supervision_interventions i where i.finding_id=f.id and i.status='verified'))::int as reported_without_verified_correction
    `);
    const normalized = Object.fromEntries(Object.entries(metrics ?? {}).map(([name, value]) => [name, Number(value ?? 0)]));
    const acceptedOutcomes = normalized.accepted_outcomes ?? 0;
    const externalOnly = normalized.external_only_latest ?? 0;
    const nativeDetected = normalized.native_detected_7d ?? 0;
    const aggregate = {
      ...normalized,
      costPerAcceptedOutcomeCents: acceptedOutcomes > 0 ? Math.round((normalized.cost_cents ?? 0) / acceptedOutcomes) : null,
      externalDependencyRate: (nativeDetected + externalOnly) > 0 ? externalOnly / (nativeDetected + externalOnly) : 0,
      externalDependencyDefinition: "latest external-only findings / (native findings detected in 7d + latest external-only findings)",
      migrationState: { findings: "native", watchdog: "native", doctor: "event_driven", daily: "deterministic", weekly: "aggregate" },
    };
    const priorities = [
      normalized.open_findings > 0 ? "Resolve the highest-severity recurring root-cause class." : null,
      normalized.recurrences > normalized.resolved_root_causes ? "Convert recurring symptoms into verified native safeguards." : null,
      acceptedOutcomes === 0 ? "Restore outcome throughput before expanding the organization." : null,
    ].filter((value): value is string => Boolean(value)).slice(0, 3);
    const cycle = await registry.finishCycle(started.cycle.id, { status: "completed", metrics: { ...aggregate, priorities, llmRecommended: priorities.length > 0 }, summary: priorities.length > 0 ? priorities.join(" ") : "Weekly aggregate is green; no model review requested." });
    return { cycle, deduplicated: false, aggregate, priorities, llmRecommended: priorities.length > 0 };
  }

  return {
    runWatchdog: (companyId: string, now?: Date) => runCycle(companyId, "native_watchdog", now),
    runDailyAudit: (companyId: string, now?: Date) => runCycle(companyId, "daily_integrity", now),
    runWeeklyReview: runWeekly,
    dispatchDoctor,
    dispatchStalledReady: async (companyId: string, now = new Date()) => persistAndDispatchStalledReady(companyId, now, null),
    async runDue(now = new Date()) {
      const activeCompanies = await db.select({ id: companies.id }).from(companies).where(eq(companies.status, "active"));
      const results = [];
      for (const company of activeCompanies) {
        await registry.recoverExpiredCycles(company.id);
        results.push({ companyId: company.id, watchdog: await runCycle(company.id, "native_watchdog", now), daily: await runCycle(company.id, "daily_integrity", now), weekly: await runWeekly(company.id, now) });
      }
      return results;
    },
  };
}
