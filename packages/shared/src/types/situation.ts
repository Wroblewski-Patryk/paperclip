export type CompanySituationSeverity = "critical" | "warning" | "info";

export type CompanySituationSignalKind =
  | "agent_error"
  | "budget_incident"
  | "pending_approval"
  | "blocked_work"
  | "unassigned_runnable_work"
  | "no_available_agents"
  | "missing_active_goal"
  | "project_overdue"
  | "project_due_soon"
  | "project_target_missing"
  | "assumption_contradicted"
  | "assumption_expired"
  | "commitment_breached"
  | "commitment_overdue"
  | "organizational_review_due";

export interface CompanySituationSourceRef {
  entityType: "company" | "goal" | "project" | "issue" | "agent" | "approval" | "budget_incident" | "organizational_record";
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
    runnableIssuesPerAvailableAgent: number | null;
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
    activeBudgetIncidents: number;
  };
  deliberation: {
    assumptions: CompanySituationOrganizationalRecord[];
    commitments: CompanySituationOrganizationalRecord[];
    decisions: CompanySituationOrganizationalRecord[];
    dueReviews: number;
    overdueCommitments: number;
  };
  forecast: CompanySituationForecast;
  attention: CompanySituationSignal[];
  limitations: string[];
}
