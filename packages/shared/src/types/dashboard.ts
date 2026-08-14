export interface DashboardRunActivityDay {
  date: string;
  succeeded: number;
  failed: number;
  other: number;
  total: number;
}

export type AgentAvailabilityState = "on" | "draining" | "off" | "reopening";

export interface AgentAvailability {
  companyId: string;
  state: AgentAvailabilityState;
  controlState: "open" | "draining" | "maintenance" | "reopening";
  enabled: boolean;
  acceptsNewRuns: boolean;
  activeRunCount: number;
  deferredWorkCount: number;
  changedAt: string;
  changedBy: {
    actorType: string | null;
    actorId: string | null;
  };
  drainStartedAt: string | null;
  offSince: string | null;
  openedAt: string | null;
  replaySnapshot: Record<string, number> | null;
}

export interface DashboardSummary {
  companyId: string;
  agents: {
    active: number;
    running: number;
    paused: number;
    error: number;
  };
  tasks: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  costs: {
    reportedMonthSpendCents?: number;
    reportedMonthBudgetCents?: number;
    monthSpendCents: number;
    monthBudgetCents: number;
    monthUtilizationPercent: number;
    subscriptionMonthSpendCents?: number;
    subscriptionMonthBudgetCents?: number;
    subscriptionMonthlyBudgetCents?: number;
    subscriptionUtilizationPercent?: number;
    subscriptionWindowLabel?: string | null;
    subscriptionResetsAt?: string | null;
    subscriptionSource?: string | null;
    subscriptionPlanLabel?: string | null;
  };
  pendingApprovals: number;
  budgets: {
    activeIncidents: number;
    pendingApprovals: number;
    pausedAgents: number;
    pausedProjects: number;
  };
  runActivity: DashboardRunActivityDay[];
}
