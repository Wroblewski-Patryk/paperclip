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
  | "project_target_missing";

export interface CompanySituationSourceRef {
  entityType: "company" | "goal" | "project" | "issue" | "agent" | "approval" | "budget_incident";
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
  attention: CompanySituationSignal[];
  limitations: string[];
}
