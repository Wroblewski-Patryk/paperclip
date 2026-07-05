export interface DashboardRunActivityDay {
  date: string;
  succeeded: number;
  failed: number;
  other: number;
  total: number;
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
