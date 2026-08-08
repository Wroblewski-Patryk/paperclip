import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, goals, issueIntents, issues } from "@paperclipai/db";
import type {
  BlockedReasonDistributionRow,
  NextLegalAction,
  NextLegalActionClass,
  NextLegalActionEvidence,
  NextLegalActionProjection,
  ShadowDispatchDecision,
} from "@paperclipai/shared";
import { issueService } from "./issues.js";

type IssueRow = {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  goalId: string | null;
  goalStatus?: string | null;
  intentStatus?: string | null;
  intentConfirmedAt?: Date | null;
  intentValidUntil?: Date | null;
  intentOwnerAgentId?: string | null;
  intentSource?: string | null;
  intentReason?: string | null;
  intentHierarchy?: Record<string, unknown> | null;
  assigneeAgentId: string | null;
  ownerStatus: string | null;
  monitorNextCheckAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type FactRow = {
  issue_id: string;
  active_hold_id: string | null;
  pending_interaction_id: string | null;
  pending_approval_id: string | null;
  accepted_outcome_id: string | null;
  accepted_outcome_evidence_count: number | string;
  live_run_id: string | null;
  unblocks_count: number | string;
  dependency_outcome_gap_ids: string[] | null;
  stale_dependency_ids?: string[] | null;
};

const PRIORITY_RANK: Record<string, number> = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
const TERMINAL = new Set(["done", "cancelled"]);

function iso(value: Date): string {
  return value.toISOString();
}

function evidence(
  row: IssueRow,
  code: string,
  state: NextLegalActionEvidence["state"],
  summary: string,
  entityType = "issue",
  entityId = row.id,
  observedAt = new Date(),
): NextLegalActionEvidence {
  return {
    code,
    state,
    summary,
    entityType,
    entityId,
    observedAt: iso(observedAt),
    sourceUpdatedAt: iso(row.updatedAt),
    freshUntil: new Date(observedAt.getTime() + 5 * 60_000).toISOString(),
  };
}

export function evaluateNextLegalAction(input: {
  row: IssueRow;
  fact: FactRow;
  blockerIds: string[];
  unresolvedBlockerIds: string[];
  now: Date;
}): NextLegalAction {
  const { row, fact, now } = input;
  const dependencyOutcomeGapIds = fact.dependency_outcome_gap_ids ?? [];
  const staleDependencyIds = fact.stale_dependency_ids ?? [];
  const dependencies = [...new Set([...input.blockerIds, ...dependencyOutcomeGapIds])];
  const observedEvidence: NextLegalActionEvidence[] = [];
  const acceptedOutcomeEvidenceCount = Number(fact.accepted_outcome_evidence_count ?? 0);
  const hasOwner = Boolean(row.assigneeAgentId);
  const ownerAvailable = row.ownerStatus === "idle" || row.ownerStatus === "active" || row.ownerStatus === "running";
  const ageHours = Number(Math.max(0, (now.getTime() - row.createdAt.getTime()) / 3_600_000).toFixed(1));
  const unblockValue = Number(fact.unblocks_count ?? 0);
  const sourceAgeHours = Math.max(0, (now.getTime() - row.updatedAt.getTime()) / 3_600_000);
  const recordedIntentExpired = Boolean(row.intentValidUntil && row.intentValidUntil <= now);
  const recordedIntent = ["ACTIVE", "RECONFIRM_REQUIRED", "SUPERSEDED", "OBSOLETE", "SATISFIED_ELSEWHERE", "UNKNOWN"].includes(row.intentStatus ?? "")
    ? row.intentStatus as NextLegalAction["intent"]["status"]
    : null;
  const effectiveIntentStatus: NextLegalAction["intent"]["status"] = recordedIntentExpired
    ? "RECONFIRM_REQUIRED"
    : recordedIntent ?? (row.goalStatus === "achieved" ? "RECONFIRM_REQUIRED" : sourceAgeHours <= 24 ? "ACTIVE" : "UNKNOWN");

  let actionClass: NextLegalActionClass;
  let reasonCode: string;
  let eligibility: NextLegalAction["eligibility"] = "ineligible";
  let epistemicState: NextLegalAction["epistemicState"] = "known";
  let requiredNextAction: NextLegalAction["requiredNextAction"] = "WAIT";
  let confidence: NextLegalAction["confidence"] = "high";
  let blockingEntity: NextLegalAction["blockingEntity"] = null;
  const policyRefs: string[] = [];

  if (TERMINAL.has(row.status)) {
    actionClass = "TERMINAL";
    reasonCode = "issue_terminal";
    requiredNextAction = "NONE";
    observedEvidence.push(evidence(row, "terminal_state", "passed", `Issue state is ${row.status}.`));
  } else if (fact.accepted_outcome_id) {
    actionClass = acceptedOutcomeEvidenceCount > 0 ? "RECONCILIATION_REQUIRED" : "BLOCKED_BY_CONFLICT";
    reasonCode = acceptedOutcomeEvidenceCount > 0 ? "task_nonterminal_outcome_accepted" : "accepted_outcome_missing_evidence";
    requiredNextAction = acceptedOutcomeEvidenceCount > 0 ? "RECONCILE" : "ESCALATE";
    epistemicState = acceptedOutcomeEvidenceCount > 0 ? "known" : "insufficient_evidence";
    confidence = acceptedOutcomeEvidenceCount > 0 ? "high" : "low";
    blockingEntity = { type: "product_outcome", id: fact.accepted_outcome_id };
    observedEvidence.push(evidence(row, "accepted_outcome_evidence", acceptedOutcomeEvidenceCount > 0 ? "passed" : "unknown", acceptedOutcomeEvidenceCount > 0 ? "Accepted outcome has evidence; task state needs governed reconciliation." : "Accepted outcome is linked but has no inspectable evidence.", "product_outcome", fact.accepted_outcome_id));
  } else if (fact.active_hold_id) {
    actionClass = "HELD_BY_POLICY";
    reasonCode = "active_issue_tree_hold";
    blockingEntity = { type: "issue_tree_hold", id: fact.active_hold_id };
    policyRefs.push(`issue_tree_hold:${fact.active_hold_id}`);
    observedEvidence.push(evidence(row, "no_active_hold", "failed", "An active issue-tree hold prevents execution.", "issue_tree_hold", fact.active_hold_id));
  } else if (staleDependencyIds.length > 0) {
    actionClass = "WAITING_FOR_DEPENDENCY";
    reasonCode = "dependency_revalidation_required";
    requiredNextAction = "RECONFIRM_DEPENDENCY";
    epistemicState = "insufficient_evidence";
    confidence = "high";
    blockingEntity = { type: "issue_relation", id: staleDependencyIds[0]! };
    observedEvidence.push(evidence(row, "dependency_fresh", "unknown", `${staleDependencyIds.length} dependency edge(s) require owner revalidation.`, "issue_relation", staleDependencyIds[0]!));
  } else if (input.unresolvedBlockerIds.length > 0 || dependencyOutcomeGapIds.length > 0) {
    actionClass = "WAITING_FOR_DEPENDENCY";
    reasonCode = dependencyOutcomeGapIds.length > 0 ? "dependency_outcome_not_accepted" : "dependency_not_complete";
    blockingEntity = { type: "issue", id: input.unresolvedBlockerIds[0] ?? dependencyOutcomeGapIds[0]! };
    epistemicState = dependencyOutcomeGapIds.length > 0 ? "insufficient_evidence" : "known";
    confidence = dependencyOutcomeGapIds.length > 0 ? "medium" : "high";
    observedEvidence.push(evidence(row, "dependencies_verified", "failed", `${dependencies.length} dependency reference(s) are not outcome-ready.`));
  } else if (fact.pending_approval_id || fact.pending_interaction_id) {
    actionClass = "WAITING_FOR_DECISION";
    reasonCode = fact.pending_approval_id ? "pending_approval" : "pending_review_interaction";
    blockingEntity = fact.pending_approval_id
      ? { type: "approval", id: fact.pending_approval_id }
      : { type: "issue_thread_interaction", id: fact.pending_interaction_id! };
    policyRefs.push(fact.pending_approval_id ? `approval:${fact.pending_approval_id}` : "structured_review_interaction");
    observedEvidence.push(evidence(row, "decision_complete", "failed", "A structured decision remains pending.", blockingEntity.type, blockingEntity.id));
  } else if (!hasOwner || !ownerAvailable) {
    actionClass = "WAITING_FOR_OWNER";
    reasonCode = hasOwner ? "owner_unavailable" : "owner_missing";
    blockingEntity = hasOwner ? { type: "agent", id: row.assigneeAgentId! } : null;
    observedEvidence.push(evidence(row, "owner_available", "failed", hasOwner ? `Assigned owner is ${row.ownerStatus ?? "unknown"}.` : "No agent owner is assigned.", hasOwner ? "agent" : "issue", hasOwner ? row.assigneeAgentId! : row.id));
  } else if (row.status === "in_review") {
    actionClass = "READY_FOR_REVIEW";
    reasonCode = "review_ready_without_pending_decision";
    eligibility = "eligible";
    requiredNextAction = "VERIFY";
    observedEvidence.push(evidence(row, "review_gate", "passed", "Issue is in review and has an available owner without a pending interaction."));
  } else if (row.status === "in_progress" || fact.live_run_id) {
    actionClass = "WAITING_FOR_EVIDENCE";
    reasonCode = fact.live_run_id ? "execution_in_progress" : "execution_state_without_live_run";
    epistemicState = fact.live_run_id ? "known" : "insufficient_evidence";
    confidence = fact.live_run_id ? "high" : "low";
    blockingEntity = fact.live_run_id ? { type: "heartbeat_run", id: fact.live_run_id } : null;
    requiredNextAction = fact.live_run_id ? "WAIT" : "ESCALATE";
    observedEvidence.push(evidence(row, "execution_postcondition", fact.live_run_id ? "passed" : "unknown", fact.live_run_id ? "A live execution run exists; await its typed postcondition." : "Issue is in progress without a live run; execution truth is insufficient."));
  } else if ((row.status === "backlog" || row.status === "todo") && effectiveIntentStatus !== "ACTIVE") {
    actionClass = "INTENT_CONFIRMATION_REQUIRED";
    reasonCode = effectiveIntentStatus === "UNKNOWN" ? "intent_unknown" : `intent_${effectiveIntentStatus.toLowerCase()}`;
    eligibility = "unknown";
    epistemicState = "insufficient_evidence";
    requiredNextAction = effectiveIntentStatus === "SUPERSEDED" || effectiveIntentStatus === "OBSOLETE" || effectiveIntentStatus === "SATISFIED_ELSEWHERE"
      ? "RECONCILE"
      : "REQUEST_INTENT_CONFIRMATION";
    confidence = "high";
    observedEvidence.push(evidence(row, "intent_fresh", "unknown", `Execution is gated because typed intent is ${effectiveIntentStatus}.`));
  } else if (row.status === "backlog" || row.status === "todo") {
    actionClass = "READY_FOR_EXECUTION";
    reasonCode = "eligible_owner_dependencies_policy_verified";
    eligibility = "eligible";
    requiredNextAction = "ACT";
    observedEvidence.push(
      evidence(row, "dependencies_verified", "passed", "All recorded blocker tasks and typed dependency outcomes are ready."),
      evidence(row, "owner_available", "passed", "Assigned owner is available.", "agent", row.assigneeAgentId!),
      evidence(row, "policy_hold_absent", "passed", "No active issue-tree hold or pending approval was observed."),
      evidence(row, "outcome_conflict_absent", "passed", "No accepted-outcome conflict was observed."),
      evidence(row, "goal_state_observed", row.goalId && !row.goalStatus ? "unknown" : "passed", row.goalId ? `Linked goal state is ${row.goalStatus ?? "unknown"}.` : "Issue has no linked goal."),
    );
  } else if (row.status === "blocked" && row.monitorNextCheckAt) {
    actionClass = "WAITING_FOR_EVIDENCE";
    reasonCode = "external_or_temporal_wait";
    blockingEntity = { type: "monitor_schedule", id: row.id };
    observedEvidence.push(evidence(row, "monitor_due", "failed", `Blocked work has a recorded next check at ${iso(row.monitorNextCheckAt)}.`));
  } else {
    actionClass = "INVALID_STATE";
    reasonCode = row.status === "blocked" ? "blocked_reason_unknown" : "unsupported_issue_state";
    eligibility = "unknown";
    epistemicState = "insufficient_evidence";
    requiredNextAction = "ESCALATE";
    confidence = "low";
    observedEvidence.push(evidence(row, "state_explained", "unknown", `State ${row.status} has no typed blocking reason.`));
  }

  const declaredPriority = row.priority || "medium";
  const valueState = eligibility === "eligible" ? "valuable_now" : epistemicState === "insufficient_evidence" ? "unknown" : "not_prioritized";
  return {
    issueId: row.id,
    identifier: row.identifier,
    title: row.title,
    currentState: row.status,
    actionClass,
    reasonCode,
    eligibility,
    epistemicState,
    requiredNextAction,
    ownerAgentId: row.assigneeAgentId,
    blockingEntity,
    dependencyRefs: dependencies,
    policyRefs,
    intent: {
      status: effectiveIntentStatus,
      confirmedAt: row.intentConfirmedAt?.toISOString() ?? null,
      validUntil: row.intentValidUntil?.toISOString() ?? null,
      ownerAgentId: row.intentOwnerAgentId ?? null,
      source: row.intentSource ?? (effectiveIntentStatus === "ACTIVE" ? "fresh_issue_activity_projection" : "runtime_inference"),
      reason: row.intentReason ?? (row.goalStatus === "achieved" ? "Parent goal achieved; child obligation requires explicit reconfirmation." : effectiveIntentStatus === "ACTIVE" ? "Issue activity is fresh enough for a bounded operational intent projection." : "No durable issue intent record exists."),
      hierarchy: row.intentHierarchy ?? { goalStatus: row.goalStatus ?? null, goalId: row.goalId },
    },
    evidence: observedEvidence,
    priority: {
      valueState,
      declaredPriority,
      goalImportance: row.goalId ? "linked" : "unlinked",
      unblockValue,
      ageHours,
      constraintEffect: "neutral",
      reasons: [
        `declared_priority:${declaredPriority}`,
        `unblock_value:${unblockValue}`,
        row.goalId ? "goal_linked" : "goal_unlinked",
      ],
    },
    confidence,
    observedAt: now.toISOString(),
  };
}

export function selectShadowDispatch(actions: NextLegalAction[], now: Date): ShadowDispatchDecision {
  const candidates = actions
    .filter((action) => action.actionClass === "READY_FOR_EXECUTION" && action.eligibility === "eligible" && action.priority.valueState === "valuable_now")
    .sort((left, right) => {
      const priority = (PRIORITY_RANK[left.priority.declaredPriority] ?? 2) - (PRIORITY_RANK[right.priority.declaredPriority] ?? 2);
      if (priority !== 0) return priority;
      if (left.priority.unblockValue !== right.priority.unblockValue) return right.priority.unblockValue - left.priority.unblockValue;
      if (left.priority.ageHours !== right.priority.ageHours) return right.priority.ageHours - left.priority.ageHours;
      return left.issueId.localeCompare(right.issueId);
    });
  const candidate = candidates[0] ?? null;
  const unknown = actions.filter((action) => action.eligibility === "unknown").length;
  if (!candidate) {
    return {
      mode: "shadow",
      outcome: unknown > 0 ? "insufficient_evidence" : "healthy_no_op",
      reasonCode: unknown > 0 ? "INSUFFICIENT_EVIDENCE" : "NO_ELIGIBLE_WORK",
      candidateIssueId: null,
      consideredIssueIds: [],
      rejectedAlternatives: [],
      confidence: unknown > 0 ? "low" : "high",
      expectedOutcome: "No dispatch; preserve safety until a typed eligible action exists.",
      observedAt: now.toISOString(),
    };
  }
  return {
    mode: "shadow",
    outcome: "candidate_proposed",
    reasonCode: "ELIGIBLE_OWNER_DEPENDENCIES_POLICY_VERIFIED",
    candidateIssueId: candidate.issueId,
    consideredIssueIds: candidates.map((action) => action.issueId),
    rejectedAlternatives: candidates.slice(1, 6).map((action) => ({ issueId: action.issueId, reason: `Selected candidate ranked first by declared priority, unblock value, age, then stable id; alternative priority=${action.priority.declaredPriority}, unblock=${action.priority.unblockValue}.` })),
    confidence: candidate.confidence,
    expectedOutcome: "A bounded owner run would start and create an inspectable dispatch postcondition; this projection does not execute it.",
    observedAt: now.toISOString(),
  };
}

function blockedReason(action: NextLegalAction): BlockedReasonDistributionRow["reason"] | null {
  if (action.currentState !== "blocked") return null;
  if (action.actionClass === "WAITING_FOR_DEPENDENCY") return "dependency";
  if (action.actionClass === "WAITING_FOR_OWNER") return "missing_owner";
  if (action.actionClass === "WAITING_FOR_EVIDENCE" && action.reasonCode === "external_or_temporal_wait") return "external_system";
  if (action.actionClass === "WAITING_FOR_EVIDENCE") return "missing_evidence";
  if (action.actionClass === "WAITING_FOR_DECISION") return "review";
  if (action.actionClass === "HELD_BY_POLICY") return "manual_hold";
  if (action.actionClass === "BLOCKED_BY_CONFLICT" || action.actionClass === "RECONCILIATION_REQUIRED") return "conflicting_state";
  if (action.actionClass === "INVALID_STATE" && action.reasonCode !== "blocked_reason_unknown") return "invalid_state";
  return "unknown";
}

export function findDependencyCycleMembers(graph: Map<string, string[]>): Map<string, string[]> {
  const cycles = new Map<string, string[]>();
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const visit = (node: string) => {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      const cycle = [...stack.slice(start), node];
      for (const member of cycle.slice(0, -1)) cycles.set(member, cycle);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    active.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) {
      if (graph.has(dependency)) visit(dependency);
    }
    stack.pop();
    active.delete(node);
  };
  for (const node of graph.keys()) visit(node);
  return cycles;
}

function alignPriorityToConstraint(actions: NextLegalAction[]): {
  actions: NextLegalAction[];
  currentConstraint: NextLegalActionProjection["currentConstraint"];
} {
  const dimensions = [
    { kind: "dependency" as const, count: actions.filter((action) => action.actionClass === "WAITING_FOR_DEPENDENCY").length },
    { kind: "review" as const, count: actions.filter((action) => action.actionClass === "WAITING_FOR_DECISION" || action.actionClass === "READY_FOR_REVIEW").length },
    { kind: "ownership" as const, count: actions.filter((action) => action.actionClass === "WAITING_FOR_OWNER").length },
    { kind: "policy" as const, count: actions.filter((action) => action.actionClass === "HELD_BY_POLICY").length },
    { kind: "reconciliation" as const, count: actions.filter((action) => action.actionClass === "RECONCILIATION_REQUIRED" || action.actionClass === "BLOCKED_BY_CONFLICT").length },
    { kind: "liveness" as const, count: actions.filter((action) => action.actionClass === "READY_FOR_EXECUTION").length },
  ].sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind));
  const leading = dimensions[0];
  const currentConstraint: NextLegalActionProjection["currentConstraint"] = leading && leading.count > 0
    ? { kind: leading.kind, count: leading.count, rationale: `${leading.count} open issue(s) are concentrated in the ${leading.kind} readiness lane.` }
    : { kind: "none", count: 0, rationale: "No material readiness queue is currently observed." };
  return {
    currentConstraint,
    actions: actions.map((action): NextLegalAction => {
      if (action.eligibility !== "eligible") return action;
      const helps = currentConstraint.kind === "dependency"
        ? action.priority.unblockValue > 0
        : currentConstraint.kind === "review"
          ? action.actionClass === "READY_FOR_REVIEW"
          : currentConstraint.kind === "reconciliation"
            ? action.actionClass === "READY_FOR_REVIEW"
            : currentConstraint.kind === "ownership"
              ? action.priority.unblockValue > 0
              : currentConstraint.kind === "liveness" || currentConstraint.kind === "none";
      return {
        ...action,
        priority: {
          ...action.priority,
          valueState: helps ? "valuable_now" : "not_prioritized",
          constraintEffect: helps ? "helps_current_constraint" : "neutral",
          reasons: [
            ...action.priority.reasons.filter((reason) => !reason.includes("current_constraint") && !reason.includes("review_or_reconciliation_constraint") && !reason.includes("current_review_constraint")),
            helps ? `helps_current_constraint:${currentConstraint.kind}` : `does_not_help_current_constraint:${currentConstraint.kind}`,
          ],
        },
      };
    }),
  };
}

export function nextLegalActionService(db: Db) {
  const issueSvc = issueService(db);
  return {
    project: async (companyId: string, options: { now?: Date } = {}): Promise<NextLegalActionProjection> => {
      const now = options.now ?? new Date();
      const rows: IssueRow[] = await db
        .select({
          id: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
          goalId: issues.goalId,
          goalStatus: goals.status,
          intentStatus: issueIntents.status,
          intentConfirmedAt: issueIntents.confirmedAt,
          intentValidUntil: issueIntents.validUntil,
          intentOwnerAgentId: issueIntents.ownerAgentId,
          intentSource: issueIntents.source,
          intentReason: issueIntents.reason,
          intentHierarchy: issueIntents.hierarchy,
          assigneeAgentId: issues.assigneeAgentId,
          ownerStatus: agents.status,
          monitorNextCheckAt: issues.monitorNextCheckAt,
          createdAt: issues.createdAt,
          updatedAt: issues.updatedAt,
        })
        .from(issues)
        .leftJoin(agents, and(eq(agents.id, issues.assigneeAgentId), eq(agents.companyId, issues.companyId)))
        .leftJoin(goals, and(eq(goals.id, issues.goalId), eq(goals.companyId, issues.companyId)))
        .leftJoin(issueIntents, and(eq(issueIntents.issueId, issues.id), eq(issueIntents.companyId, issues.companyId)))
        .where(and(
          eq(issues.companyId, companyId),
          isNull(issues.hiddenAt),
          ne(issues.originKind, "routine_execution"),
          sql`${issues.status} not in ('done','cancelled')`,
        ));
      const issueIds = rows.map((row) => row.id);
      const readiness = await issueSvc.listDependencyReadiness(companyId, issueIds);
      const facts = issueIds.length === 0 ? [] : await db.execute<FactRow>(sql`
        select i.id as issue_id,
          (select h.id from issue_tree_hold_members hm join issue_tree_holds h on h.id=hm.hold_id and h.company_id=hm.company_id where hm.company_id=i.company_id and hm.issue_id=i.id and h.status='active' order by h.created_at desc limit 1) as active_hold_id,
          (select x.id from issue_thread_interactions x where x.company_id=i.company_id and x.issue_id=i.id and x.status='pending' order by x.created_at desc limit 1) as pending_interaction_id,
          (select a.id from issue_approvals ia join approvals a on a.id=ia.approval_id and a.company_id=ia.company_id where ia.company_id=i.company_id and ia.issue_id=i.id and a.status='pending' order by a.created_at desc limit 1) as pending_approval_id,
          (select o.id from delivery_tasks dt join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id where dt.company_id=i.company_id and dt.issue_id=i.id and d.stage='outcome_accepted' and o.status in ('accepted','accepted_with_risk') order by o.updated_at desc limit 1) as accepted_outcome_id,
          coalesce((select jsonb_array_length(o.evidence) from delivery_tasks dt join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id where dt.company_id=i.company_id and dt.issue_id=i.id and d.stage='outcome_accepted' and o.status in ('accepted','accepted_with_risk') order by o.updated_at desc limit 1),0)::int as accepted_outcome_evidence_count,
          (select r.id from heartbeat_runs r where r.company_id=i.company_id and r.agent_id=i.assignee_agent_id and r.status in ('queued','running','scheduled_retry') and (r.context_snapshot->>'issueId'=i.id::text or r.context_snapshot->>'taskId'=i.id::text) order by r.created_at desc limit 1) as live_run_id,
          (select count(*)::int from issue_relations rel where rel.company_id=i.company_id and rel.issue_id=i.id and rel.type='blocks') as unblocks_count,
          coalesce((select array_agg(distinct blocker.id::text) from issue_relations rel join issues blocker on blocker.id=rel.issue_id and blocker.company_id=rel.company_id join delivery_tasks dt on dt.issue_id=blocker.id and dt.company_id=blocker.company_id join product_deliveries d on d.id=dt.delivery_id and d.company_id=dt.company_id join product_outcomes o on o.delivery_id=d.id and o.company_id=d.company_id where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks' and blocker.status='done' and o.status not in ('accepted','accepted_with_risk')), array[]::text[]) as dependency_outcome_gap_ids
          ,coalesce((select array_agg(rel.id::text) from issue_relations rel where rel.company_id=i.company_id and rel.related_issue_id=i.id and rel.type='blocks' and rel.status='active' and (rel.last_verified_at is null or rel.stale_after is null or rel.stale_after <= now())), array[]::text[]) as stale_dependency_ids
        from issues i
        where i.company_id=${companyId}
          and i.hidden_at is null
          and i.origin_kind <> 'routine_execution'
          and i.status not in ('done','cancelled')
      `);
      const factByIssue = new Map(facts.map((row) => [row.issue_id, row]));
      const dependencyCycles = findDependencyCycleMembers(new Map(issueIds.map((issueId) => [issueId, readiness.get(issueId)?.blockerIssueIds ?? []])));
      const classifiedActions = rows.map((row) => evaluateNextLegalAction({
        row,
        fact: factByIssue.get(row.id) ?? { issue_id: row.id, active_hold_id: null, pending_interaction_id: null, pending_approval_id: null, accepted_outcome_id: null, accepted_outcome_evidence_count: 0, live_run_id: null, unblocks_count: 0, dependency_outcome_gap_ids: [], stale_dependency_ids: [] },
        blockerIds: readiness.get(row.id)?.blockerIssueIds ?? [],
        unresolvedBlockerIds: readiness.get(row.id)?.unresolvedBlockerIssueIds ?? [],
        now,
      })).map((action): NextLegalAction => {
        const cycle = dependencyCycles.get(action.issueId);
        if (!cycle) return action;
        return {
          ...action,
          actionClass: "BLOCKED_BY_CONFLICT",
          reasonCode: "organizational_dependency_cycle",
          eligibility: "ineligible",
          epistemicState: "known",
          requiredNextAction: "ESCALATE",
          blockingEntity: { type: "issue", id: cycle[1] ?? action.issueId },
          dependencyRefs: [...new Set([...action.dependencyRefs, ...cycle])],
          confidence: "high",
          evidence: [...action.evidence, evidence(rows.find((row) => row.id === action.issueId)!, "dependency_graph_acyclic", "failed", `Organizational dependency cycle detected: ${cycle.join(" -> ")}.`)],
        };
      });
      const { actions, currentConstraint } = alignPriorityToConstraint(classifiedActions);
      const distributionMap = new Map<NextLegalActionClass, { count: number; reasons: Map<string, number> }>();
      for (const action of actions) {
        const current = distributionMap.get(action.actionClass) ?? { count: 0, reasons: new Map<string, number>() };
        current.count += 1;
        current.reasons.set(action.reasonCode, (current.reasons.get(action.reasonCode) ?? 0) + 1);
        distributionMap.set(action.actionClass, current);
      }
      const blockedMap = new Map<BlockedReasonDistributionRow["reason"], number>();
      for (const action of actions) {
        const reason = blockedReason(action);
        if (reason) blockedMap.set(reason, (blockedMap.get(reason) ?? 0) + 1);
      }
      const shadowDispatch = selectShadowDispatch(actions, now);
      const eligibleValuableWork = actions.filter((action) => action.eligibility === "eligible" && action.priority.valueState === "valuable_now").length;
      const held = actions.filter((action) => action.actionClass === "HELD_BY_POLICY").length;
      const unexplainedIdle = shadowDispatch.outcome === "candidate_proposed" ? eligibleValuableWork : 0;
      const noOpReason: NextLegalActionProjection["liveness"]["noOpReason"] = shadowDispatch.outcome === "candidate_proposed"
        ? "SHADOW_CANDIDATE_EXISTS"
        : shadowDispatch.outcome === "insufficient_evidence"
          ? "INSUFFICIENT_EVIDENCE"
          : actions.some((action) => action.actionClass === "WAITING_FOR_OWNER") ? "NO_OWNER"
            : actions.some((action) => action.actionClass === "WAITING_FOR_DEPENDENCY") ? "DEPENDENCY"
              : held > 0 ? "POLICY_BLOCK" : "NO_ELIGIBLE_WORK";
      return {
        companyId,
        generatedAt: now.toISOString(),
        contractVersion: 2,
        actions,
        distribution: [...distributionMap.entries()].map(([actionClass, value]) => ({ actionClass, count: value.count, mainReasons: [...value.reasons.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([reason]) => reason) })).sort((a, b) => b.count - a.count || a.actionClass.localeCompare(b.actionClass)),
        blockedReasons: [...blockedMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
        currentConstraint,
        liveness: { eligibleValuableWork, held, unexplainedIdle, noOpReason },
        shadowDispatch,
      };
    },
  };
}
