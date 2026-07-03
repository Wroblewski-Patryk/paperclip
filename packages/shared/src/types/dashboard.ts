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
    /** Backward-compatible alias for exact billed spend in cents. */
    monthSpendCents: number;
    /** Exact billed spend in cents from cost_events.cost_cents. */
    monthBilledSpendCents: number;
    monthBudgetCents: number;
    monthUtilizationPercent: number;
    meteringState: "none" | "metered" | "subscription_included" | "unknown" | "mixed" | "zero_billed";
    eventCount: number;
    meteredApiRunCount: number;
    subscriptionIncludedRunCount: number;
    subscriptionIncludedInputTokens: number;
    subscriptionIncludedCachedInputTokens: number;
    subscriptionIncludedOutputTokens: number;
    unknownCostRunCount: number;
    unknownCostInputTokens: number;
    unknownCostCachedInputTokens: number;
    unknownCostOutputTokens: number;
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
