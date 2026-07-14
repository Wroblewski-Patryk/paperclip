import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BudgetPolicySummary,
  CostByAgentModel,
  CostByBiller,
  CostByModelProfile,
  CostByProviderModel,
  CostWindowSpendRow,
  FinanceEvent,
  ModelProfileCatalogEntry,
  ProviderQuotaResult,
  QuotaWindow,
} from "@paperclipai/shared";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Clock, Coins, DollarSign, Gauge, ReceiptText, Route } from "lucide-react";
import { budgetsApi } from "../api/budgets";
import { costsApi } from "../api/costs";
import { instanceSettingsApi } from "../api/instanceSettings";
import { BillerSpendCard } from "../components/BillerSpendCard";
import { BudgetIncidentCard } from "../components/BudgetIncidentCard";
import { BudgetPolicyCard } from "../components/BudgetPolicyCard";
import { EmptyState } from "../components/EmptyState";
import { FinanceBillerCard } from "../components/FinanceBillerCard";
import { FinanceKindCard } from "../components/FinanceKindCard";
import { FinanceTimelineCard } from "../components/FinanceTimelineCard";
import { Identity } from "../components/Identity";
import { PageSkeleton } from "../components/PageSkeleton";
import { PageTabBar } from "../components/PageTabBar";
import { ProviderQuotaCard } from "../components/ProviderQuotaCard";
import { CodexSubscriptionPanel } from "../components/CodexSubscriptionPanel";
import { StatusBadge } from "../components/StatusBadge";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useDateRange, PRESET_KEYS, PRESET_LABELS } from "../hooks/useDateRange";
import { queryKeys } from "../lib/queryKeys";
import { billingTypeDisplayName, cn, formatCents, formatTokens, providerDisplayName } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NO_COMPANY = "__none__";

function currentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999);
  return { from: mon.toISOString(), to: sun.toISOString() };
}

function ProviderTabLabel({ provider, rows, planShareCents }: { provider: string; rows: CostByProviderModel[]; planShareCents?: number | null }) {
  const totalTokens = rows.reduce((sum, row) => sum + row.inputTokens + row.cachedInputTokens + row.outputTokens, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.costCents, 0);
  return (
    <span className="flex items-center gap-1.5">
      <span>{providerDisplayName(provider)}</span>
      <span className="font-mono text-xs text-muted-foreground">{formatTokens(totalTokens)}</span>
      <span className="text-xs text-muted-foreground">{formatCents(planShareCents ?? totalCost)}</span>
    </span>
  );
}

function BillerTabLabel({ biller, rows, planShareCents }: { biller: string; rows: CostByBiller[]; planShareCents?: number | null }) {
  const totalTokens = rows.reduce((sum, row) => sum + row.inputTokens + row.cachedInputTokens + row.outputTokens, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.costCents, 0);
  return (
    <span className="flex items-center gap-1.5">
      <span>{providerDisplayName(biller)}</span>
      <span className="font-mono text-xs text-muted-foreground">{formatTokens(totalTokens)}</span>
      <span className="text-xs text-muted-foreground">{formatCents(planShareCents ?? totalCost)}</span>
    </span>
  );
}

function modelProfileRecommendation(row: CostByModelProfile) {
  if (row.runCount === 0) return "No completed runs yet";
  if (row.escalateBelowPercent != null && row.successPercent < row.escalateBelowPercent) {
    return "Review routing or escalate";
  }
  if (row.successTargetPercent != null && row.successPercent < row.successTargetPercent) {
    return "Watch outcome quality";
  }
  return "Healthy";
}

function accountedTokens(row: { inputTokens: number; cachedInputTokens: number; outputTokens: number }) {
  return row.inputTokens + row.cachedInputTokens + row.outputTokens;
}

function estimatePlanShareCents(tokenCount: number, totalTokens: number, subscriptionSpendCents?: number | null) {
  if (subscriptionSpendCents == null || totalTokens <= 0 || tokenCount <= 0) return null;
  return Math.round((subscriptionSpendCents * tokenCount) / totalTokens);
}

function formatQuotaReset(resetsAt?: string | null) {
  if (!resetsAt) return "reset not reported";
  const parsed = new Date(resetsAt);
  if (Number.isNaN(parsed.getTime())) return "reset not reported";
  return `resets ${parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function quotaWindowStatus(window: QuotaWindow, shortHoldPercent: number, longHoldPercent: number) {
  if (window.usedPercent == null) return "Unknown";
  const reset = window.resetsAt ? new Date(window.resetsAt) : null;
  const resetInMs = reset && !Number.isNaN(reset.getTime()) ? reset.getTime() - Date.now() : null;
  const threshold = resetInMs != null && resetInMs > 0 && resetInMs <= 24 * 60 * 60 * 1000
    ? shortHoldPercent
    : longHoldPercent;
  if (window.usedPercent >= threshold) return `Hold at ${threshold}%`;
  if (window.usedPercent >= Math.max(1, threshold - 15)) return `Pressure near ${threshold}%`;
  return `Open until ${threshold}%`;
}

function normalizeQuotaMatcherText(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function quotaWindowAppliesToProfile(window: QuotaWindow, profile: ModelProfileCatalogEntry) {
  if (window.scope === "account") return true;
  if (window.quotaLane && window.quotaLane === profile.quotaLane) return true;
  if (window.model && normalizeQuotaMatcherText(window.model) === normalizeQuotaMatcherText(profile.defaultModel)) return true;
  if (window.scope === "lane" || window.scope === "model") return false;

  const label = normalizeQuotaMatcherText(window.label);
  const lane = normalizeQuotaMatcherText(profile.quotaLane);
  const model = normalizeQuotaMatcherText(profile.defaultModel);
  if (lane && label.includes(lane)) return true;
  if (model && label.includes(model)) return true;
  if (label.includes("spark")) return profile.quotaLane === "codex_spark_preview";
  if (label.includes("mini")) return profile.quotaLane === "codex_standard_light";
  if (label.includes("pro")) return profile.quotaLane === "codex_pro";
  return profile.quotaLane === "codex_standard";
}

function quotaWindowThreshold(window: QuotaWindow, shortHoldPercent: number, longHoldPercent: number) {
  const reset = window.resetsAt ? new Date(window.resetsAt) : null;
  const resetInMs = reset && !Number.isNaN(reset.getTime()) ? reset.getTime() - Date.now() : null;
  return resetInMs != null && resetInMs > 0 && resetInMs <= 24 * 60 * 60 * 1000
    ? shortHoldPercent
    : longHoldPercent;
}

function strongestQuotaWindow(profile: ModelProfileCatalogEntry, windows: QuotaWindow[]) {
  const relevant = windows.filter((window) => quotaWindowAppliesToProfile(window, profile));
  const withPercent = relevant.filter((window) => typeof window.usedPercent === "number");
  if (withPercent.length === 0) return { relevant, window: null as QuotaWindow | null };
  return {
    relevant,
    window: withPercent.reduce((best, window) =>
      (window.usedPercent ?? 0) > (best.usedPercent ?? 0) ? window : best,
    ),
  };
}

function quotaTone(usedPercent: number | null, threshold: number | null) {
  if (usedPercent == null || threshold == null) return "bg-muted";
  if (usedPercent >= threshold) return "bg-destructive";
  if (usedPercent >= Math.max(1, threshold - 15)) return "bg-amber-400";
  return "bg-primary";
}

function modelProfileUsageTokens(row?: CostByModelProfile | null) {
  if (!row) return 0;
  return row.subscriptionInputTokens + row.subscriptionCachedInputTokens + row.subscriptionOutputTokens;
}

function ModelLaneLimitCell({
  profile,
  usage,
  windows,
  shortHoldPercent,
  longHoldPercent,
}: {
  profile: ModelProfileCatalogEntry;
  usage?: CostByModelProfile | null;
  windows: QuotaWindow[];
  shortHoldPercent: number;
  longHoldPercent: number;
}) {
  const { relevant, window } = strongestQuotaWindow(profile, windows);
  const usedPercent = typeof window?.usedPercent === "number" ? window.usedPercent : null;
  const threshold = window ? quotaWindowThreshold(window, shortHoldPercent, longHoldPercent) : null;
  const status = window
    ? quotaWindowStatus(window, shortHoldPercent, longHoldPercent)
    : relevant.length > 0
      ? "Live window has no percent"
      : "No live lane window";
  const reset = window ? formatQuotaReset(window.resetsAt) : "provider did not report a reset";
  const tokens = modelProfileUsageTokens(usage);

  return (
    <div className="min-w-[220px]">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{status}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {usedPercent == null ? "--" : `${usedPercent}%`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden bg-muted">
        <div
          className={cn("h-full transition-[width] duration-200", quotaTone(usedPercent, threshold))}
          style={{ width: `${Math.max(0, Math.min(100, usedPercent ?? 0))}%` }}
        />
      </div>
      <div className="mt-2 grid gap-1 text-[11px] leading-4 text-muted-foreground">
        <span>{window ? `${window.label} - ${reset}` : "No provider percent for this lane"}</span>
        <span>
          {formatTokens(tokens)} profile tokens
          {usage ? ` across ${usage.runCount} run${usage.runCount === 1 ? "" : "s"}` : " with no runs yet"}
        </span>
      </div>
    </div>
  );
}

function flattenQuotaWindows(results: ProviderQuotaResult[] | undefined) {
  return (results ?? []).flatMap((result) =>
    result.windows.map((window) => ({
      provider: result.provider,
      source: result.source ?? null,
      ok: result.ok,
      error: result.error ?? null,
      window,
    })),
  );
}

function MetricTile({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function FinanceSummaryCard({
  debitCents,
  creditCents,
  netCents,
  estimatedDebitCents,
  eventCount,
}: {
  debitCents: number;
  creditCents: number;
  netCents: number;
  estimatedDebitCents: number;
  eventCount: number;
}) {
  return (
    <Card>
      <CardHeader className="px-5 pt-5 pb-2">
        <CardTitle className="text-base">Finance ledger</CardTitle>
        <CardDescription>
          Account-level charges that do not map to a single inference request.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 pb-5 pt-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Debits"
          value={formatCents(debitCents)}
          subtitle={`${eventCount} total event${eventCount === 1 ? "" : "s"} in range`}
          icon={ArrowUpRight}
        />
        <MetricTile
          label="Credits"
          value={formatCents(creditCents)}
          subtitle="Refunds, offsets, and credit returns"
          icon={ArrowDownLeft}
        />
        <MetricTile
          label="Net"
          value={formatCents(netCents)}
          subtitle="Debit minus credit for the selected period"
          icon={ReceiptText}
        />
        <MetricTile
          label="Estimated"
          value={formatCents(estimatedDebitCents)}
          subtitle="Estimated debits that are not yet invoice-authoritative"
          icon={Coins}
        />
      </CardContent>
    </Card>
  );
}

export function Costs() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<"overview" | "budgets" | "providers" | "billers" | "models" | "limits" | "finance">("overview");
  const [activeProvider, setActiveProvider] = useState("all");
  const [activeBiller, setActiveBiller] = useState("all");

  const {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    from,
    to,
    customReady,
  } = useDateRange();

  useEffect(() => {
    setBreadcrumbs([{ label: "Costs" }]);
  }, [setBreadcrumbs]);

  const [today, setToday] = useState(() => new Date().toDateString());
  const todayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const schedule = () => {
      const now = new Date();
      const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      todayTimerRef.current = setTimeout(() => {
        setToday(new Date().toDateString());
        schedule();
      }, ms);
    };
    schedule();
    return () => {
      if (todayTimerRef.current != null) clearTimeout(todayTimerRef.current);
    };
  }, []);

  const weekRange = useMemo(() => currentWeekRange(), [today]);
  const companyId = selectedCompanyId ?? NO_COMPANY;

  const { data: budgetData, isLoading: budgetLoading, error: budgetError } = useQuery({
    queryKey: queryKeys.budgets.overview(companyId),
    queryFn: () => budgetsApi.overview(companyId),
    enabled: !!selectedCompanyId && customReady,
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

  const invalidateBudgetViews = () => {
    if (!selectedCompanyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets.overview(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(selectedCompanyId) });
  };

  const policyMutation = useMutation({
    mutationFn: (input: {
      scopeType: BudgetPolicySummary["scopeType"];
      scopeId: string;
      metric: BudgetPolicySummary["metric"];
      amount: number;
      windowKind: BudgetPolicySummary["windowKind"];
    }) =>
      budgetsApi.upsertPolicy(companyId, {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        metric: input.metric,
        amount: input.amount,
        windowKind: input.windowKind,
      }),
    onSuccess: invalidateBudgetViews,
  });

  const incidentMutation = useMutation({
    mutationFn: (input: { incidentId: string; action: "keep_paused" | "raise_budget_and_resume"; amount?: number }) =>
      budgetsApi.resolveIncident(companyId, input.incidentId, input),
    onSuccess: invalidateBudgetViews,
  });

  const { data: spendData, isLoading: spendLoading, error: spendError } = useQuery({
    queryKey: queryKeys.costs(companyId, from || undefined, to || undefined),
    queryFn: async () => {
      const [summary, byAgent, byProject, byAgentModel] = await Promise.all([
        costsApi.summary(companyId, from || undefined, to || undefined),
        costsApi.byAgent(companyId, from || undefined, to || undefined),
        costsApi.byProject(companyId, from || undefined, to || undefined),
        costsApi.byAgentModel(companyId, from || undefined, to || undefined),
      ]);
      return { summary, byAgent, byProject, byAgentModel };
    },
    enabled: !!selectedCompanyId && customReady,
  });

  const { data: financeData, isLoading: financeLoading, error: financeError } = useQuery({
    queryKey: [
      queryKeys.financeSummary(companyId, from || undefined, to || undefined),
      queryKeys.financeByBiller(companyId, from || undefined, to || undefined),
      queryKeys.financeByKind(companyId, from || undefined, to || undefined),
      queryKeys.financeEvents(companyId, from || undefined, to || undefined, 18),
    ],
    queryFn: async () => {
      const [summary, byBiller, byKind, events] = await Promise.all([
        costsApi.financeSummary(companyId, from || undefined, to || undefined),
        costsApi.financeByBiller(companyId, from || undefined, to || undefined),
        costsApi.financeByKind(companyId, from || undefined, to || undefined),
        costsApi.financeEvents(companyId, from || undefined, to || undefined, 18),
      ]);
      return { summary, byBiller, byKind, events };
    },
    enabled: !!selectedCompanyId && customReady,
  });

  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpandedAgents(new Set());
  }, [companyId, from, to]);

  function toggleAgent(agentId: string) {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }

  const agentModelRows = useMemo(() => {
    const map = new Map<string, CostByAgentModel[]>();
    for (const row of spendData?.byAgentModel ?? []) {
      const rows = map.get(row.agentId) ?? [];
      rows.push(row);
      map.set(row.agentId, rows);
    }
    for (const [agentId, rows] of map) {
      map.set(agentId, rows.slice().sort((a, b) => b.costCents - a.costCents));
    }
    return map;
  }, [spendData?.byAgentModel]);

  const { data: providerData } = useQuery({
    queryKey: queryKeys.usageByProvider(companyId, from || undefined, to || undefined),
    queryFn: () => costsApi.byProvider(companyId, from || undefined, to || undefined),
    enabled: !!selectedCompanyId && customReady && (mainTab === "providers" || mainTab === "billers"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: billerData } = useQuery({
    queryKey: queryKeys.usageByBiller(companyId, from || undefined, to || undefined),
    queryFn: () => costsApi.byBiller(companyId, from || undefined, to || undefined),
    enabled: !!selectedCompanyId && customReady && mainTab === "billers",
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: modelProfileData, isLoading: modelProfileLoading, error: modelProfileError } = useQuery({
    queryKey: queryKeys.usageByModelProfile(companyId, from || undefined, to || undefined),
    queryFn: () => costsApi.modelProfiles(companyId, from || undefined, to || undefined),
    enabled: !!selectedCompanyId && customReady && (mainTab === "models" || mainTab === "limits"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
    enabled: !!selectedCompanyId && mainTab === "limits",
    staleTime: 30_000,
  });

  const { data: weekData } = useQuery({
    queryKey: queryKeys.usageByProvider(companyId, weekRange.from, weekRange.to),
    queryFn: () => costsApi.byProvider(companyId, weekRange.from, weekRange.to),
    enabled: !!selectedCompanyId && (mainTab === "providers" || mainTab === "billers"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: weekBillerData } = useQuery({
    queryKey: queryKeys.usageByBiller(companyId, weekRange.from, weekRange.to),
    queryFn: () => costsApi.byBiller(companyId, weekRange.from, weekRange.to),
    enabled: !!selectedCompanyId && mainTab === "billers",
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: windowData } = useQuery({
    queryKey: queryKeys.usageWindowSpend(companyId),
    queryFn: () => costsApi.windowSpend(companyId),
    enabled: !!selectedCompanyId && mainTab === "providers",
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: queryKeys.usageQuotaWindows(companyId),
    queryFn: () => costsApi.quotaWindows(companyId),
    enabled: !!selectedCompanyId && (mainTab === "providers" || mainTab === "limits"),
    refetchInterval: 300_000,
    staleTime: 60_000,
  });

  const byProvider = useMemo(() => {
    const map = new Map<string, CostByProviderModel[]>();
    for (const row of providerData ?? []) {
      const rows = map.get(row.provider) ?? [];
      rows.push(row);
      map.set(row.provider, rows);
    }
    return map;
  }, [providerData]);

  const byBiller = useMemo(() => {
    const map = new Map<string, CostByBiller[]>();
    for (const row of billerData ?? []) {
      const rows = map.get(row.biller) ?? [];
      rows.push(row);
      map.set(row.biller, rows);
    }
    return map;
  }, [billerData]);

  const weekSpendByProvider = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of weekData ?? []) {
      map.set(row.provider, (map.get(row.provider) ?? 0) + row.costCents);
    }
    return map;
  }, [weekData]);

  const weekSpendByBiller = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of weekBillerData ?? []) {
      map.set(row.biller, (map.get(row.biller) ?? 0) + row.costCents);
    }
    return map;
  }, [weekBillerData]);

  const windowSpendByProvider = useMemo(() => {
    const map = new Map<string, CostWindowSpendRow[]>();
    for (const row of windowData ?? []) {
      const rows = map.get(row.provider) ?? [];
      rows.push(row);
      map.set(row.provider, rows);
    }
    return map;
  }, [windowData]);

  const quotaWindowsByProvider = useMemo(() => {
    const map = new Map<string, QuotaWindow[]>();
    for (const result of quotaData ?? []) {
      if (result.ok && result.windows.length > 0) {
        map.set(result.provider, result.windows);
      }
    }
    return map;
  }, [quotaData]);

  const quotaErrorsByProvider = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of quotaData ?? []) {
      if (!result.ok && result.error) map.set(result.provider, result.error);
    }
    return map;
  }, [quotaData]);

  const quotaSourcesByProvider = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of quotaData ?? []) {
      if (typeof result.source === "string" && result.source.length > 0) {
        map.set(result.provider, result.source);
      }
    }
    return map;
  }, [quotaData]);

  const deficitNotchByProvider = useMemo(() => {
    const map = new Map<string, boolean>();
    if (preset !== "mtd") return map;
    const budget = spendData?.summary.budgetCents ?? 0;
    if (budget <= 0) return map;
    const totalSpend = spendData?.summary.spendCents ?? 0;
    const now = new Date();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (const [providerKey, rows] of byProvider) {
      const providerCostCents = rows.reduce((sum, row) => sum + row.costCents, 0);
      const providerShare = totalSpend > 0 ? providerCostCents / totalSpend : 0;
      const providerBudget = budget * providerShare;
      if (providerBudget <= 0) {
        map.set(providerKey, false);
        continue;
      }
      const burnRate = providerCostCents / Math.max(daysElapsed, 1);
      map.set(providerKey, providerCostCents + burnRate * (daysInMonth - daysElapsed) > providerBudget);
    }
    return map;
  }, [preset, spendData, byProvider]);

  const providers = useMemo(() => {
    const keys = new Set(byProvider.keys());
    for (const result of quotaData ?? []) {
      keys.add(result.provider);
    }
    return Array.from(keys);
  }, [byProvider, quotaData]);
  const billers = useMemo(() => Array.from(byBiller.keys()), [byBiller]);

  const effectiveProvider =
    activeProvider === "all" || providers.includes(activeProvider) ? activeProvider : "all";
  useEffect(() => {
    if (effectiveProvider !== activeProvider) setActiveProvider("all");
  }, [effectiveProvider, activeProvider]);

  const effectiveBiller =
    activeBiller === "all" || billers.includes(activeBiller) ? activeBiller : "all";
  useEffect(() => {
    if (effectiveBiller !== activeBiller) setActiveBiller("all");
  }, [effectiveBiller, activeBiller]);

  const inferenceTokenTotal =
    (spendData?.byAgent ?? []).reduce(
      (sum, row) => sum + accountedTokens(row),
      0,
    );
  const effectiveSpendCents = spendData?.summary.spendCents ?? 0;
  const effectiveBudgetCents = spendData?.summary.budgetCents ?? 0;
  const reportedSpendCents = spendData?.summary.reportedSpendCents ?? effectiveSpendCents;
  const hasSubscriptionEstimate = spendData?.summary.subscriptionBudgetCents != null;
  const subscriptionSpendCents = spendData?.summary.subscriptionSpendCents ?? null;
  const subscriptionBudgetCents = spendData?.summary.subscriptionBudgetCents ?? null;
  const subscriptionMonthlyBudgetCents = spendData?.summary.subscriptionMonthlyBudgetCents ?? null;
  const subscriptionUtilizationPercent = spendData?.summary.subscriptionUtilizationPercent ?? null;
  const subscriptionWindowLabel = spendData?.summary.subscriptionWindowLabel ?? "subscription quota";
  const subscriptionPlanLabel = spendData?.summary.subscriptionPlanLabel ?? "subscription plan";
  const subscriptionResetLabel = formatQuotaReset(spendData?.summary.subscriptionResetsAt);
  const totalAccountedTokens = inferenceTokenTotal;
  const totalProjectTokens = (spendData?.byProject ?? []).reduce((sum, row) => sum + accountedTokens(row), 0);
  const totalProviderTokens = (providerData ?? []).reduce((sum, row) => sum + accountedTokens(row), 0);
  const totalBillerTokens = (billerData ?? []).reduce((sum, row) => sum + accountedTokens(row), 0);
  const totalModelProfileTokens = (modelProfileData?.rows ?? []).reduce((sum, row) => sum + accountedTokens(row), 0);
  const quotaWindowRows = useMemo(() => flattenQuotaWindows(quotaData), [quotaData]);
  const codexQuotaResult = (quotaData ?? []).find((result) => result.provider === "openai" && result.source?.startsWith("codex-"));
  const modelProfileRowsByProfile = useMemo(() => {
    const rows = new Map<string, CostByModelProfile>();
    for (const row of modelProfileData?.rows ?? []) {
      rows.set(row.profile, row);
    }
    return rows;
  }, [modelProfileData]);
  const codexShortHoldPercent = experimentalSettings?.codexLocalQuotaShortWindowHoldUsedPercent ?? 75;
  const codexLongHoldPercent = experimentalSettings?.codexLocalQuotaLongWindowHoldUsedPercent ?? 90;
  const quotaHoldEnabled = experimentalSettings?.codexLocalQuotaHoldEnabled !== false;
  const highestQuotaPercent = quotaWindowRows.reduce(
    (max, row) => typeof row.window.usedPercent === "number" ? Math.max(max, row.window.usedPercent) : max,
    0,
  );

  const providerTabItems = useMemo(() => {
    const providerKeys = Array.from(byProvider.keys());
    const allTokens = providerKeys.reduce(
      (sum, provider) => sum + (byProvider.get(provider)?.reduce((acc, row) => acc + row.inputTokens + row.cachedInputTokens + row.outputTokens, 0) ?? 0),
      0,
    );
    const allCents = providerKeys.reduce(
      (sum, provider) => sum + (byProvider.get(provider)?.reduce((acc, row) => acc + row.costCents, 0) ?? 0),
      0,
    );
    return [
      {
        value: "all",
        label: (
          <span className="flex items-center gap-1.5">
            <span>All providers</span>
            {providerKeys.length > 0 ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{formatTokens(allTokens)}</span>
                <span className="text-xs text-muted-foreground">{formatCents(subscriptionSpendCents ?? allCents)}</span>
              </>
            ) : null}
          </span>
        ),
      },
      ...providerKeys.map((provider) => ({
        value: provider,
        label: (
          <ProviderTabLabel
            provider={provider}
            rows={byProvider.get(provider) ?? []}
            planShareCents={estimatePlanShareCents(
              (byProvider.get(provider) ?? []).reduce((sum, row) => sum + accountedTokens(row), 0),
              totalProviderTokens,
              subscriptionSpendCents,
            )}
          />
        ),
      })),
    ];
  }, [byProvider, subscriptionSpendCents, totalProviderTokens]);

  const billerTabItems = useMemo(() => {
    const billerKeys = Array.from(byBiller.keys());
    const allTokens = billerKeys.reduce(
      (sum, biller) => sum + (byBiller.get(biller)?.reduce((acc, row) => acc + row.inputTokens + row.cachedInputTokens + row.outputTokens, 0) ?? 0),
      0,
    );
    const allCents = billerKeys.reduce(
      (sum, biller) => sum + (byBiller.get(biller)?.reduce((acc, row) => acc + row.costCents, 0) ?? 0),
      0,
    );
    return [
      {
        value: "all",
        label: (
          <span className="flex items-center gap-1.5">
            <span>All billers</span>
            {billerKeys.length > 0 ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{formatTokens(allTokens)}</span>
                <span className="text-xs text-muted-foreground">{formatCents(subscriptionSpendCents ?? allCents)}</span>
              </>
            ) : null}
          </span>
        ),
      },
      ...billerKeys.map((biller) => ({
        value: biller,
        label: (
          <BillerTabLabel
            biller={biller}
            rows={byBiller.get(biller) ?? []}
            planShareCents={estimatePlanShareCents(
              (byBiller.get(biller) ?? []).reduce((sum, row) => sum + accountedTokens(row), 0),
              totalBillerTokens,
              subscriptionSpendCents,
            )}
          />
        ),
      })),
    ];
  }, [byBiller, subscriptionSpendCents, totalBillerTokens]);

  const topFinanceEvents = (financeData?.events ?? []) as FinanceEvent[];
  const budgetPolicies = budgetData?.policies ?? [];
  const activeBudgetIncidents = budgetData?.activeIncidents ?? [];
  const budgetPoliciesByScope = useMemo(() => ({
    company: budgetPolicies.filter((policy) => policy.scopeType === "company"),
    agent: budgetPolicies.filter((policy) => policy.scopeType === "agent"),
    project: budgetPolicies.filter((policy) => policy.scopeType === "project"),
  }), [budgetPolicies]);

  if (!selectedCompanyId) {
    return <EmptyState icon={DollarSign} message="Select a company to view costs." />;
  }

  const showCustomPrompt = preset === "custom" && !customReady;
  const showOverviewLoading = (spendLoading || financeLoading) && customReady;
  const overviewError = spendError ?? financeError;

  return (
    <div className="space-y-6">
      <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Costs</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Inference spend, platform fees, credits, and live quota windows.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_KEYS.map((key) => (
                <Button
                  key={key}
                  variant={preset === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreset(key)}
                >
                  {PRESET_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>

          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 border border-border p-3">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-4">
            <MetricTile
              label={hasSubscriptionEstimate ? "Plan quota" : "Inference spend"}
              value={hasSubscriptionEstimate ? `${Math.round(subscriptionUtilizationPercent ?? 0)}%` : formatCents(effectiveSpendCents)}
              subtitle={
                hasSubscriptionEstimate
                  ? `${subscriptionWindowLabel} - ${subscriptionResetLabel} - API ${formatCents(reportedSpendCents)}`
                  : `${formatTokens(inferenceTokenTotal)} tokens across request-scoped events`
              }
              icon={DollarSign}
            />
            <MetricTile
              label="Budget"
              value={activeBudgetIncidents.length > 0 ? String(activeBudgetIncidents.length) : (
                effectiveBudgetCents > 0
                  ? `${spendData?.summary.utilizationPercent ?? 0}%`
                  : "Open"
              )}
              subtitle={
                activeBudgetIncidents.length > 0
                  ? `${budgetData?.pausedAgentCount ?? 0} agents paused · ${budgetData?.pausedProjectCount ?? 0} projects paused`
                  : effectiveBudgetCents > 0
                    ? `${formatCents(effectiveSpendCents)} of ${formatCents(effectiveBudgetCents)}`
                    : hasSubscriptionEstimate
                      ? `${subscriptionPlanLabel} monthly value ${formatCents(subscriptionMonthlyBudgetCents ?? 0)}`
                      : "No monthly cap configured"
              }
              icon={Coins}
            />
            <MetricTile
              label="Finance net"
              value={formatCents(financeData?.summary.netCents ?? 0)}
              subtitle={`${formatCents(financeData?.summary.debitCents ?? 0)} debits · ${formatCents(financeData?.summary.creditCents ?? 0)} credits`}
              icon={ReceiptText}
            />
            <MetricTile
              label="Finance events"
              value={String(financeData?.summary.eventCount ?? 0)}
              subtitle={`${formatCents(financeData?.summary.estimatedDebitCents ?? 0)} estimated in range`}
              icon={ArrowUpRight}
            />
          </div>
      </div>

      <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as typeof mainTab)}>
        <TabsList variant="line" className="justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="billers">Billers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : showOverviewLoading ? (
            <PageSkeleton variant="costs" />
          ) : overviewError ? (
            <p className="text-sm text-destructive">{(overviewError as Error).message}</p>
          ) : (
            <>
              {activeBudgetIncidents.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {activeBudgetIncidents.slice(0, 2).map((incident) => (
                    <BudgetIncidentCard
                      key={incident.id}
                      incident={incident}
                      isMutating={incidentMutation.isPending}
                      onKeepPaused={() => incidentMutation.mutate({ incidentId: incident.id, action: "keep_paused" })}
                      onRaiseAndResume={(amount) =>
                        incidentMutation.mutate({
                          incidentId: incident.id,
                          action: "raise_budget_and_resume",
                          amount,
                        })}
                    />
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
                <Card>
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-base">
                      {hasSubscriptionEstimate ? "Plan quota ledger" : "Inference ledger"}
                    </CardTitle>
                    <CardDescription>
                      {hasSubscriptionEstimate
                        ? "Live Codex quota-window usage, kept separate from metered API spend."
                        : "Request-scoped inference spend for the selected period."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-2">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-3xl font-semibold tabular-nums">
                          {hasSubscriptionEstimate
                            ? `${Math.round(subscriptionUtilizationPercent ?? 0)}%`
                            : formatCents(effectiveSpendCents)}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {hasSubscriptionEstimate && subscriptionBudgetCents != null
                            ? `${subscriptionWindowLabel}: ${formatCents(subscriptionSpendCents ?? 0)} of ${formatCents(subscriptionBudgetCents)} window value - ${subscriptionResetLabel}`
                            : effectiveBudgetCents > 0
                            ? `Budget ${formatCents(effectiveBudgetCents)}`
                            : "Unlimited budget"}
                          {hasSubscriptionEstimate
                            ? ` - API ${formatCents(reportedSpendCents)}`
                            : null}
                        </div>
                      </div>
                      <div className="border border-border px-4 py-3 text-right">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">usage</div>
                        <div className="mt-1 text-lg font-medium tabular-nums">
                          {formatTokens(inferenceTokenTotal)}
                        </div>
                      </div>
                    </div>
                    {hasSubscriptionEstimate || effectiveBudgetCents > 0 ? (
                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden bg-muted">
                          <div
                            className={cn(
                              "h-full transition-[width,background-color] duration-150",
                              (hasSubscriptionEstimate ? subscriptionUtilizationPercent ?? 0 : spendData?.summary.utilizationPercent ?? 0) > 90
                                ? "bg-red-400"
                                : (hasSubscriptionEstimate ? subscriptionUtilizationPercent ?? 0 : spendData?.summary.utilizationPercent ?? 0) > 70
                                  ? "bg-yellow-400"
                                  : "bg-emerald-400",
                            )}
                            style={{
                              width: `${Math.min(
                                100,
                                hasSubscriptionEstimate ? subscriptionUtilizationPercent ?? 0 : spendData?.summary.utilizationPercent ?? 0,
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hasSubscriptionEstimate
                            ? `${subscriptionUtilizationPercent ?? 0}% of ${subscriptionWindowLabel.toLowerCase()} consumed; queued runs resume after reset when quota falls below scheduler thresholds.`
                            : `${spendData?.summary.utilizationPercent ?? 0}% of monthly budget consumed in this range.`}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <FinanceSummaryCard
                  debitCents={financeData?.summary.debitCents ?? 0}
                  creditCents={financeData?.summary.creditCents ?? 0}
                  netCents={financeData?.summary.netCents ?? 0}
                  estimatedDebitCents={financeData?.summary.estimatedDebitCents ?? 0}
                  eventCount={financeData?.summary.eventCount ?? 0}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
                <Card>
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-base">By agent</CardTitle>
                    <CardDescription>What each agent consumed in the selected period.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 px-5 pb-5 pt-2">
                    {(spendData?.byAgent.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground">No cost events yet.</p>
                    ) : (
                      spendData?.byAgent.map((row) => {
                        const modelRows = agentModelRows.get(row.agentId) ?? [];
                        const isExpanded = expandedAgents.has(row.agentId);
                        const hasBreakdown = modelRows.length > 0;
                        const agentPlanShare = estimatePlanShareCents(
                          accountedTokens(row),
                          totalAccountedTokens,
                          subscriptionSpendCents,
                        );
                        return (
                          <div key={row.agentId} className="border border-border px-4 py-3">
                            <div
                              className={cn("flex items-start justify-between gap-3", hasBreakdown ? "cursor-pointer select-none" : "")}
                              onClick={() => hasBreakdown && toggleAgent(row.agentId)}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {hasBreakdown ? (
                                  isExpanded
                                    ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                ) : (
                                  <span className="h-3 w-3 shrink-0" />
                                )}
                                <Identity name={row.agentName ?? row.agentId} size="sm" />
                                {row.agentStatus === "terminated" ? <StatusBadge status="terminated" /> : null}
                              </div>
                              <div className="text-right text-sm tabular-nums">
                                <div className="font-medium">
                                  {agentPlanShare != null ? formatCents(agentPlanShare) : formatCents(row.costCents)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  in {formatTokens(row.inputTokens + row.cachedInputTokens)} · out {formatTokens(row.outputTokens)}
                                </div>
                                {hasSubscriptionEstimate ? (
                                  <div className="text-xs text-muted-foreground">
                                    plan share estimate · API {formatCents(row.costCents)}
                                  </div>
                                ) : null}
                                {(row.apiRunCount > 0 || row.subscriptionRunCount > 0) ? (
                                  <div className="text-xs text-muted-foreground">
                                    {row.apiRunCount > 0 ? `${row.apiRunCount} api` : "0 api"}
                                    {" · "}
                                    {row.subscriptionRunCount > 0
                                      ? `${row.subscriptionRunCount} subscription`
                                      : "0 subscription"}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {isExpanded && modelRows.length > 0 ? (
                              <div className="mt-3 space-y-2 border-l border-border pl-4">
                                {modelRows.map((modelRow) => {
                                  const modelPlanShare = estimatePlanShareCents(
                                    accountedTokens(modelRow),
                                    accountedTokens(row),
                                    agentPlanShare,
                                  );
                                  const sharePct = agentPlanShare != null && agentPlanShare > 0 && modelPlanShare != null
                                    ? Math.round((modelPlanShare / agentPlanShare) * 100)
                                    : row.costCents > 0
                                      ? Math.round((modelRow.costCents / row.costCents) * 100)
                                      : 0;
                                  return (
                                    <div
                                      key={`${modelRow.provider}:${modelRow.model}:${modelRow.billingType}`}
                                      className="flex items-start justify-between gap-3 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate font-medium text-foreground">
                                          {providerDisplayName(modelRow.provider)}
                                          <span className="mx-1 text-border">/</span>
                                          <span className="font-mono">{modelRow.model}</span>
                                        </div>
                                        <div className="truncate text-muted-foreground">
                                          {providerDisplayName(modelRow.biller)} · {billingTypeDisplayName(modelRow.billingType)}
                                        </div>
                                      </div>
                                      <div className="text-right tabular-nums">
                                        <div className="font-medium">
                                          {modelPlanShare != null ? formatCents(modelPlanShare) : formatCents(modelRow.costCents)}
                                          <span className="ml-1 font-normal text-muted-foreground">({sharePct}%)</span>
                                        </div>
                                        <div className="text-muted-foreground">
                                          {formatTokens(modelRow.inputTokens + modelRow.cachedInputTokens + modelRow.outputTokens)} tok
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="px-5 pt-5 pb-2">
                      <CardTitle className="text-base">By project</CardTitle>
                      <CardDescription>Run costs attributed through project-linked issues.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 px-5 pb-5 pt-2">
                      {(spendData?.byProject.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No project-attributed run costs yet.</p>
                      ) : (
                        spendData?.byProject.map((row, index) => {
                          const projectPlanShare = estimatePlanShareCents(
                            accountedTokens(row),
                            totalProjectTokens,
                            subscriptionSpendCents,
                          );
                          return (
                            <div
                              key={row.projectId ?? `unattributed-${index}`}
                              className="flex items-center justify-between gap-3 border border-border px-3 py-2 text-sm"
                            >
                              <span className="truncate">{row.projectName ?? row.projectId ?? "Unattributed"}</span>
                              <div className="text-right">
                                <div className="font-medium tabular-nums">
                                  {projectPlanShare != null ? formatCents(projectPlanShare) : formatCents(row.costCents)}
                                </div>
                                {hasSubscriptionEstimate ? (
                                  <div className="text-xs text-muted-foreground">plan share</div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <FinanceTimelineCard rows={topFinanceEvents.slice(0, 6)} emptyMessage="No finance events yet. Add account-level charges once biller invoices or credits land." />
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="mt-4 space-y-4">
          {budgetLoading ? (
            <PageSkeleton variant="costs" />
          ) : budgetError ? (
            <p className="text-sm text-destructive">{(budgetError as Error).message}</p>
          ) : (
            <>
              <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
                <CardHeader className="px-5 pt-5 pb-3">
                  <CardTitle className="text-base">Budget control plane</CardTitle>
                  <CardDescription>
                    Hard-stop limits for API spend and effective subscription-plan usage. Provider quota windows stay inspectable under Providers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-5 pb-5 pt-0 md:grid-cols-4">
                  <MetricTile
                    label="Active incidents"
                    value={String(activeBudgetIncidents.length)}
                    subtitle="Open soft or hard threshold crossings"
                    icon={ReceiptText}
                  />
                  <MetricTile
                    label="Pending approvals"
                    value={String(budgetData?.pendingApprovalCount ?? 0)}
                    subtitle="Budget override approvals awaiting board action"
                    icon={ArrowUpRight}
                  />
                  <MetricTile
                    label="Paused agents"
                    value={String(budgetData?.pausedAgentCount ?? 0)}
                    subtitle="Agent heartbeats blocked by budget"
                    icon={Coins}
                  />
                  <MetricTile
                    label="Paused projects"
                    value={String(budgetData?.pausedProjectCount ?? 0)}
                    subtitle="Project execution blocked by budget"
                    icon={DollarSign}
                  />
                </CardContent>
              </Card>

              {activeBudgetIncidents.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">Active incidents</h2>
                    <p className="text-sm text-muted-foreground">
                      Resolve hard stops here by raising the budget or explicitly keeping the scope paused.
                    </p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {activeBudgetIncidents.map((incident) => (
                      <BudgetIncidentCard
                        key={incident.id}
                        incident={incident}
                        isMutating={incidentMutation.isPending}
                        onKeepPaused={() => incidentMutation.mutate({ incidentId: incident.id, action: "keep_paused" })}
                        onRaiseAndResume={(amount) =>
                          incidentMutation.mutate({
                            incidentId: incident.id,
                            action: "raise_budget_and_resume",
                            amount,
                          })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-5">
                {(["company", "agent", "project"] as const).map((scopeType) => {
                  const rows = budgetPoliciesByScope[scopeType];
                  if (rows.length === 0) return null;
                  return (
                    <section key={scopeType} className="space-y-3">
                      <div>
                        <h2 className="text-lg font-semibold capitalize">{scopeType} budgets</h2>
                        <p className="text-sm text-muted-foreground">
                          {scopeType === "company"
                            ? "Company-wide monthly policy."
                            : scopeType === "agent"
                              ? "Recurring monthly spend policies for individual agents."
                              : "Lifetime spend policies for execution-bound projects."}
                        </p>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        {rows.map((summary) => (
                          <BudgetPolicyCard
                            key={summary.policyId}
                            summary={summary}
                            isSaving={policyMutation.isPending}
                            onSave={(amount) =>
                              policyMutation.mutate({
                                scopeType: summary.scopeType,
                                scopeId: summary.scopeId,
                                metric: summary.metric,
                                amount,
                                windowKind: summary.windowKind,
                              })}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}

                {budgetPolicies.length === 0 ? (
                  <Card>
                    <CardContent className="px-5 py-8 text-sm text-muted-foreground">
                      No budget policies yet. Set agent and project budgets from their detail pages, or use the existing company monthly budget control.
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="providers" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : (
            <>
              <Tabs value={effectiveProvider} onValueChange={setActiveProvider}>
                <PageTabBar items={providerTabItems} value={effectiveProvider} />

                <TabsContent value="all" className="mt-4">
                  {providers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cost events in this period.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {providers.map((provider) => (
                        <ProviderQuotaCard
                          key={provider}
                          provider={provider}
                          rows={byProvider.get(provider) ?? []}
                          budgetMonthlyCents={effectiveBudgetCents}
                          totalCompanySpendCents={effectiveSpendCents}
                          weekSpendCents={weekSpendByProvider.get(provider) ?? 0}
                          windowRows={windowSpendByProvider.get(provider) ?? []}
                          showDeficitNotch={deficitNotchByProvider.get(provider) ?? false}
                          quotaWindows={quotaWindowsByProvider.get(provider) ?? []}
                          quotaError={quotaErrorsByProvider.get(provider) ?? null}
                          quotaSource={quotaSourcesByProvider.get(provider) ?? null}
                          quotaLoading={quotaLoading}
                          subscriptionBudgetCents={spendData?.summary.subscriptionBudgetCents ?? null}
                          subscriptionSpendCents={estimatePlanShareCents(
                            (byProvider.get(provider) ?? []).reduce((sum, row) => sum + accountedTokens(row), 0),
                            totalProviderTokens,
                            subscriptionSpendCents,
                          )}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {providers.map((provider) => (
                  <TabsContent key={provider} value={provider} className="mt-4">
                    <ProviderQuotaCard
                      provider={provider}
                      rows={byProvider.get(provider) ?? []}
                      budgetMonthlyCents={effectiveBudgetCents}
                      totalCompanySpendCents={effectiveSpendCents}
                      weekSpendCents={weekSpendByProvider.get(provider) ?? 0}
                      windowRows={windowSpendByProvider.get(provider) ?? []}
                      showDeficitNotch={deficitNotchByProvider.get(provider) ?? false}
                      quotaWindows={quotaWindowsByProvider.get(provider) ?? []}
                      quotaError={quotaErrorsByProvider.get(provider) ?? null}
                      quotaSource={quotaSourcesByProvider.get(provider) ?? null}
                      quotaLoading={quotaLoading}
                      subscriptionBudgetCents={spendData?.summary.subscriptionBudgetCents ?? null}
                      subscriptionSpendCents={estimatePlanShareCents(
                        (byProvider.get(provider) ?? []).reduce((sum, row) => sum + accountedTokens(row), 0),
                        totalProviderTokens,
                        subscriptionSpendCents,
                      )}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </TabsContent>

        <TabsContent value="billers" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : (
            <>
              <Tabs value={effectiveBiller} onValueChange={setActiveBiller}>
                <PageTabBar items={billerTabItems} value={effectiveBiller} />

                <TabsContent value="all" className="mt-4">
                  {billers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No billable events in this period.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {billers.map((biller) => {
                        const row = (byBiller.get(biller) ?? [])[0];
                        if (!row) return null;
                        const providerRows = (providerData ?? []).filter((entry) => entry.biller === biller);
                        return (
                          <BillerSpendCard
                            key={biller}
                            row={row}
                            weekSpendCents={weekSpendByBiller.get(biller) ?? 0}
                            budgetMonthlyCents={spendData?.summary.budgetCents ?? 0}
                            totalCompanySpendCents={spendData?.summary.spendCents ?? 0}
                            providerRows={providerRows}
                            subscriptionSpendCents={estimatePlanShareCents(
                              accountedTokens(row),
                              totalBillerTokens,
                              subscriptionSpendCents,
                            )}
                          />
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {billers.map((biller) => {
                  const row = (byBiller.get(biller) ?? [])[0];
                  if (!row) return null;
                  const providerRows = (providerData ?? []).filter((entry) => entry.biller === biller);
                  return (
                    <TabsContent key={biller} value={biller} className="mt-4">
                      <BillerSpendCard
                        row={row}
                        weekSpendCents={weekSpendByBiller.get(biller) ?? 0}
                        budgetMonthlyCents={spendData?.summary.budgetCents ?? 0}
                        totalCompanySpendCents={spendData?.summary.spendCents ?? 0}
                        providerRows={providerRows}
                        subscriptionSpendCents={estimatePlanShareCents(
                          accountedTokens(row),
                          totalBillerTokens,
                          subscriptionSpendCents,
                        )}
                      />
                    </TabsContent>
                  );
                })}
              </Tabs>
            </>
          )}
        </TabsContent>

        <TabsContent value="models" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : modelProfileLoading ? (
            <PageSkeleton variant="costs" />
          ) : modelProfileError ? (
            <p className="text-sm text-destructive">{(modelProfileError as Error).message}</p>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-4">
                <MetricTile
                  label="Profile tokens"
                  value={formatTokens(totalModelProfileTokens)}
                  subtitle={`${modelProfileData?.rows.length ?? 0} active profile lanes in range`}
                  icon={Route}
                />
                <MetricTile
                  label="Profile runs"
                  value={String((modelProfileData?.rows ?? []).reduce((sum, row) => sum + row.runCount, 0))}
                  subtitle={`${(modelProfileData?.rows ?? []).reduce((sum, row) => sum + row.successRunCount, 0)} succeeded runs`}
                  icon={ChevronRight}
                />
                <MetricTile
                  label="Catalog"
                  value={String(modelProfileData?.profiles.length ?? 0)}
                  subtitle="Configured model profiles available to the router"
                  icon={Coins}
                />
                <MetricTile
                  label="Sources"
                  value={String(modelProfileData?.sources.length ?? 0)}
                  subtitle="Provider docs tracked in the model catalog"
                  icon={ReceiptText}
                />
              </div>

              <Card>
                <CardHeader className="px-5 pt-5 pb-2">
                  <CardTitle className="text-base">Model profile economics</CardTitle>
                  <CardDescription>
                    Router profile usage, outcome rate, token pressure, and escalation guidance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-2">
                  {(modelProfileData?.rows.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No routed model-profile cost events in this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            <th className="py-3 pr-4 font-medium">Profile</th>
                            <th className="py-3 pr-4 font-medium">Default model</th>
                            <th className="py-3 pr-4 font-medium">Quota lane</th>
                            <th className="py-3 pr-4 text-right font-medium">Runs</th>
                            <th className="py-3 pr-4 text-right font-medium">Success</th>
                            <th className="py-3 pr-4 text-right font-medium">Tokens</th>
                            <th className="py-3 pr-4 text-right font-medium">Plan share</th>
                            <th className="py-3 font-medium">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(modelProfileData?.rows ?? []).map((row) => {
                            const planShare = estimatePlanShareCents(accountedTokens(row), totalModelProfileTokens, subscriptionSpendCents);
                            return (
                              <tr key={row.profile} className="border-b border-border/70 align-top last:border-0">
                                <td className="py-3 pr-4">
                                  <div className="font-medium">{row.profile}</div>
                                  <div className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">
                                    {row.intent ?? "No catalog description"}
                                  </div>
                                </td>
                                <td className="py-3 pr-4 font-mono text-xs">{row.defaultModel ?? "unknown"}</td>
                                <td className="py-3 pr-4">
                                  <div className="font-mono text-xs">{row.quotaLane ?? "untracked"}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    weight {row.relativeCostWeight ?? 1}
                                  </div>
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  <div>{row.runCount}</div>
                                  <div className="text-xs text-muted-foreground">{row.subscriptionRunCount} sub</div>
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  <div>{row.successPercent}%</div>
                                  <div className="text-xs text-muted-foreground">
                                    target {row.successTargetPercent ?? "-"} / floor {row.escalateBelowPercent ?? "-"}
                                  </div>
                                </td>
                                <td className="py-3 pr-4 text-right font-mono text-xs">{formatTokens(accountedTokens(row))}</td>
                                <td className="py-3 pr-4 text-right tabular-nums">{formatCents(planShare ?? row.costCents)}</td>
                                <td className="py-3">
                                  <StatusBadge
                                    status={
                                      modelProfileRecommendation(row).startsWith("Review")
                                        ? "blocked"
                                        : modelProfileRecommendation(row).startsWith("Watch")
                                          ? "running"
                                          : "done"
                                    }
                                  />
                                  <div className="mt-1 text-xs text-muted-foreground">{modelProfileRecommendation(row)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-5 pt-5 pb-2">
                  <CardTitle className="text-base">Provider model catalog</CardTitle>
                  <CardDescription>Tracked external references for model and quota review.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 px-5 pb-5 pt-2 md:grid-cols-2">
                  {(modelProfileData?.sources ?? []).map((source) => (
                    <a
                      key={source.url}
                      className="border border-border p-3 text-sm text-foreground hover:bg-muted/40"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="font-medium">{source.label}</div>
                      <div className="mt-1 break-all text-xs text-muted-foreground">{source.url}</div>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="limits" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : quotaLoading || modelProfileLoading ? (
            <PageSkeleton variant="costs" />
          ) : modelProfileError ? (
            <p className="text-sm text-destructive">{(modelProfileError as Error).message}</p>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-4">
                <MetricTile
                  label="Quota windows"
                  value={String(quotaWindowRows.length)}
                  subtitle={`${quotaData?.filter((result) => result.ok).length ?? 0} provider quota source${(quotaData?.filter((result) => result.ok).length ?? 0) === 1 ? "" : "s"}`}
                  icon={Gauge}
                />
                <MetricTile
                  label="Highest usage"
                  value={quotaWindowRows.length > 0 ? `${Math.round(highestQuotaPercent)}%` : "--"}
                  subtitle={quotaHoldEnabled ? "Scheduler gates are enabled" : "Scheduler gates are disabled"}
                  icon={ArrowUpRight}
                />
                <MetricTile
                  label="Short hold"
                  value={`${codexShortHoldPercent}%`}
                  subtitle="Short quota windows, such as hourly or daily limits"
                  icon={Clock}
                />
                <MetricTile
                  label="Long hold"
                  value={`${codexLongHoldPercent}%`}
                  subtitle="Long quota windows, such as weekly or monthly limits"
                  icon={Clock}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr,0.9fr]">
                <Card>
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-base">Live subscription limits</CardTitle>
                    <CardDescription>
                      Provider-reported usage windows used by budget estimates and codex_local start holds.
                      Model-level bars appear when the provider exposes a lane/model window; token totals below come from Paperclip run usage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-2">
                    {codexQuotaResult ? (
                      <CodexSubscriptionPanel
                        windows={codexQuotaResult.windows}
                        source={codexQuotaResult.source}
                        error={codexQuotaResult.stale || !codexQuotaResult.ok ? codexQuotaResult.error : null}
                        stale={codexQuotaResult.stale}
                        observedAt={codexQuotaResult.observedAt}
                      />
                    ) : quotaWindowRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No live provider quota windows are available yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {quotaData?.map((result) => (
                          <div key={`${result.provider}-${result.source ?? "unknown"}`} className="border border-border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">{providerDisplayName(result.provider)}</div>
                              <div className="text-xs text-muted-foreground">{result.source ?? "provider quota"}</div>
                            </div>
                            {!result.ok ? (
                              <div className="mt-2 text-sm text-destructive">{result.error ?? "Quota unavailable"}</div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {result.windows.map((window) => (
                                  <div key={window.label} className="flex items-center justify-between gap-3 text-sm">
                                    <span>{window.label}</span>
                                    <span className="tabular-nums text-muted-foreground">
                                      {window.usedPercent == null ? window.valueLabel ?? "not reported" : `${window.usedPercent}% used`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-base">Agent start gates</CardTitle>
                    <CardDescription>
                      Instance-wide thresholds for delaying new codex_local work when quota pressure is high.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="border border-border p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">State</div>
                        <div className="mt-1 text-sm font-medium">{quotaHoldEnabled ? "Enabled" : "Disabled"}</div>
                      </div>
                      <div className="border border-border p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Retry spacing</div>
                        <div className="mt-1 text-sm font-medium">
                          {experimentalSettings?.codexLocalQuotaRetrySpacingMinutes ?? 2} min
                        </div>
                      </div>
                      <div className="border border-border p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Short window hold</div>
                        <div className="mt-1 text-sm font-medium">{codexShortHoldPercent}% used</div>
                      </div>
                      <div className="border border-border p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Long window hold</div>
                        <div className="mt-1 text-sm font-medium">{codexLongHoldPercent}% used</div>
                      </div>
                    </div>
                    <a
                      href="/instance/settings/experimental"
                      className="inline-flex text-sm text-primary underline-offset-2 hover:underline"
                    >
                      Edit quota gates in Instance Settings
                    </a>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="px-5 pt-5 pb-2">
                  <CardTitle className="text-base">Model lanes and quota mapping</CardTitle>
                  <CardDescription>
                    Configured router profiles, default models, live lane pressure, and token usage observed by Paperclip.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-2">
                  {(modelProfileData?.profiles.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No model profile catalog is configured.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1040px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            <th className="py-3 pr-4 font-medium">Profile</th>
                            <th className="py-3 pr-4 font-medium">Default model</th>
                            <th className="py-3 pr-4 font-medium">Quota lane</th>
                            <th className="py-3 pr-4 font-medium">Live limit / usage</th>
                            <th className="py-3 font-medium">Intent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(modelProfileData?.profiles ?? []).map((profile) => {
                            const usage = modelProfileRowsByProfile.get(profile.profile);
                            return (
                              <tr key={profile.profile} className="border-b border-border/70 align-top last:border-0">
                                <td className="py-3 pr-4 font-medium">{profile.profile}</td>
                                <td className="py-3 pr-4 font-mono text-xs">{profile.defaultModel}</td>
                                <td className="py-3 pr-4">
                                  <div className="font-mono text-xs">{profile.quotaLane}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">weight {profile.relativeCostWeight}</div>
                                </td>
                                <td className="py-3 pr-4">
                                  <ModelLaneLimitCell
                                    profile={profile}
                                    usage={usage}
                                    windows={quotaWindowRows.map((row) => row.window)}
                                    shortHoldPercent={codexShortHoldPercent}
                                    longHoldPercent={codexLongHoldPercent}
                                  />
                                </td>
                                <td className="py-3 text-xs leading-5 text-muted-foreground">{profile.intent}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="finance" className="mt-4 space-y-4">
          {showCustomPrompt ? (
            <p className="text-sm text-muted-foreground">Select a start and end date to load data.</p>
          ) : financeLoading ? (
            <PageSkeleton variant="costs" />
          ) : financeError ? (
            <p className="text-sm text-destructive">{(financeError as Error).message}</p>
          ) : (
            <>
              <FinanceSummaryCard
                debitCents={financeData?.summary.debitCents ?? 0}
                creditCents={financeData?.summary.creditCents ?? 0}
                netCents={financeData?.summary.netCents ?? 0}
                estimatedDebitCents={financeData?.summary.estimatedDebitCents ?? 0}
                eventCount={financeData?.summary.eventCount ?? 0}
              />

              <div className="grid gap-4 xl:grid-cols-[1.2fr,0.95fr]">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="px-5 pt-5 pb-2">
                      <CardTitle className="text-base">By biller</CardTitle>
                      <CardDescription>Account-level financial events grouped by who charged or credited them.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 px-5 pb-5 pt-2 md:grid-cols-2">
                      {(financeData?.byBiller.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No finance events yet.</p>
                      ) : (
                        financeData?.byBiller.map((row) => <FinanceBillerCard key={row.biller} row={row} />)
                      )}
                    </CardContent>
                  </Card>
                  <FinanceTimelineCard rows={topFinanceEvents} />
                </div>

                <FinanceKindCard rows={financeData?.byKind ?? []} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
