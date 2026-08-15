export type CompanySituationSeverity = "critical" | "warning" | "info";

export type CompanySituationSignalKind =
  | "agent_error"
  | "budget_incident"
  | "pending_approval"
  | "pending_owner_decision"
  | "blocked_work"
  | "unassigned_runnable_work"
  | "no_available_agents"
  | "dispatch_capacity_disabled"
  | "outcome_state_conflict"
  | "missing_active_goal"
  | "project_overdue"
  | "project_due_soon"
  | "project_target_missing"
  | "assumption_contradicted"
  | "assumption_expired"
  | "commitment_breached"
  | "commitment_overdue"
  | "organizational_review_due"
  | "capacity_bottleneck"
  | "parallel_wip"
  | "external_signal_stale"
  | "external_signal_contradicted"
  | "outcome_failure"
  | "learning_ready_for_promotion";

export interface CompanySituationSourceRef {
  entityType: "company" | "goal" | "project" | "issue" | "agent" | "approval" | "issue_thread_interaction" | "budget_incident" | "organizational_record" | "organizational_observation";
  entityId: string;
  observedAt: string;
}

export interface CompanySituationSignal {
  id: string;
  kind: CompanySituationSignalKind;
  severity: CompanySituationSeverity;
  title: string;
  summary: string;
  suggestedAction: string;
  sources: CompanySituationSourceRef[];
}

export interface CompanySituationGoal {
  id: string;
  title: string;
  level: string;
  ownerAgentId: string | null;
  updatedAt: string;
}

export interface CompanySituationProjectTarget {
  id: string;
  name: string;
  status: string;
  targetDate: string;
  daysRemaining: number;
  leadAgentId: string | null;
  updatedAt: string;
}

export interface CompanySituationOrganizationalRecord {
  id: string;
  kind: "assumption" | "commitment" | "decision";
  status: string;
  title: string;
  statement: string;
  ownerAgentId: string | null;
  confidence: number | null;
  dueAt: string | null;
  reviewAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

export interface CompanySituationForecast {
  method: "historical_throughput_v1";
  windowDays: number;
  completedSampleSize: number;
  dailyThroughput: number;
  cycleTimeP50Hours: number | null;
  cycleTimeP80Hours: number | null;
  openScope: number;
  projectedCompletion: {
    earliestAt: string;
    likelyAt: string;
    latestAt: string;
    confidence: "low" | "medium" | "high";
  } | null;
  limitations: string[];
}

export interface CompanySituationObservation {
  id: string;
  kind: "outcome" | "causal" | "external_signal" | "learning";
  status: string;
  title: string;
  summary: string;
  observedAt: string;
  freshUntil: string | null;
  effectivelyStale: boolean;
  outcomeLayer: string | null;
  outcomeResult: string | null;
  causalRole: string | null;
  externalCategory: string | null;
  projectId: string | null;
  issueId: string | null;
}

export interface CompanySituationFlowStage {
  stage: "assigned_queue" | "execution" | "review" | "human_gate" | "external_wait" | "blocked_dependency" | "blocked_conflict" | "blocked_unknown";
  count: number;
  oldestHours: number | null;
}

export interface CompanySituation {
  companyId: string;
  generatedAt: string;
  timezone: "UTC";
  basis: "deterministic_projection";
  horizon: {
    dueSoonDays: number;
  };
  mission: {
    activeGoals: CompanySituationGoal[];
  };
  work: {
    open: number;
    runnable: number;
    inProgress: number;
    inReview: number;
    blocked: number;
    unassignedRunnable: number;
  };
  capacity: {
    totalAgents: number;
    availableAgents: number;
    runningAgents: number;
    pausedAgents: number;
    errorAgents: number;
    schedulerActiveAgents: number;
    dispatchableRunnableIssues: number;
    structuredReviewIssues: number;
    outcomeReconciliationIssues: number;
    heldRunnableIssues: number;
    dispatchState: "healthy" | "degraded" | "critical";
    runnableIssuesPerAvailableAgent: number | null;
    flow: CompanySituationFlowStage[];
    bottleneck: CompanySituationFlowStage | null;
    agentsWithParallelWip: number;
    maxParallelWip: number;
  };
  temporal: {
    activeProjects: number;
    projectsWithTargets: number;
    projectsWithoutTargets: number;
    overdueProjects: CompanySituationProjectTarget[];
    dueSoonProjects: CompanySituationProjectTarget[];
  };
  governance: {
    pendingApprovals: number;
    pendingOwnerDecisions: number;
    activeBudgetIncidents: number;
  };
  deliberation: {
    assumptions: CompanySituationOrganizationalRecord[];
    commitments: CompanySituationOrganizationalRecord[];
    decisions: CompanySituationOrganizationalRecord[];
    dueReviews: number;
    overdueCommitments: number;
  };
  learning: {
    outcomes: CompanySituationObservation[];
    causalFindings: CompanySituationObservation[];
    candidates: CompanySituationObservation[];
    promoted: number;
  };
  externalGrounding: {
    currentSignals: CompanySituationObservation[];
    staleSignals: CompanySituationObservation[];
    contradictedSignals: CompanySituationObservation[];
    coveredCategories: string[];
  };
  forecast: CompanySituationForecast;
  attention: CompanySituationSignal[];
  limitations: string[];
}
