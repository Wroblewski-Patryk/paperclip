import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { accessApi } from "../api/access";
import { costsApi } from "../api/costs";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { softwarehouseApi } from "../api/softwarehouse";
import { buildCompanyUserProfileMap } from "../lib/company-members";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { StatusIcon } from "../components/StatusIcon";

import { ActivityRow } from "../components/ActivityRow";
import { Identity } from "../components/Identity";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import { Bot, LayoutDashboard } from "lucide-react";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { AgentAvailabilityControl } from "../components/AgentAvailabilityControl";
import { CompanySituationPanel } from "../components/CompanySituationPanel";
import { InnovationCommandCenter } from "../components/InnovationCommandCenter";
import { ChartCard, RunActivityChart, PriorityChart, IssueStatusChart, SuccessRateChart } from "../components/ActivityCharts";
import { PageSkeleton } from "../components/PageSkeleton";
import type { Agent, Issue, ProviderQuotaResult, QuotaWindow } from "@paperclipai/shared";
import { PluginSlotOutlet } from "@/plugins/slots";

const DASHBOARD_ACTIVITY_LIMIT = 10;

function getRecentIssues(issues: Issue[]): Issue[] {
  return [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function providerQuotaName(provider: string): string {
  const normalized = provider.toLowerCase();
  if (normalized === "openai") return "OpenAI Codex";
  if (normalized === "anthropic") return "Claude";
  return provider;
}

function formatQuotaReset(resetsAt: string | null): string {
  if (!resetsAt) return "reset not reported";
  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return "reset not reported";
  return `resets ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function isConsumableQuotaWindow(window: QuotaWindow): boolean {
  return typeof window.usedPercent === "number" && Number.isFinite(window.usedPercent);
}

function providerQuotaMetric(
  results: ProviderQuotaResult[] | undefined,
  isLoading: boolean,
): { value: string; description: string } {
  if (isLoading) {
    return { value: "...", description: "Checking provider quota" };
  }

  const candidates = (results ?? []).flatMap((result) =>
    result.windows
      .filter(isConsumableQuotaWindow)
      .map((window) => ({
        provider: providerQuotaName(result.provider),
        source: result.source,
        window,
        usedPercent: window.usedPercent ?? 0,
      })),
  );

  if (candidates.length > 0) {
    const highest = candidates.reduce((best, current) =>
      current.usedPercent > best.usedPercent ? current : best,
    );
    const source = highest.source ? ` via ${highest.source}` : "";
    return {
      value: `${Math.round(highest.usedPercent)}%`,
      description: `${highest.provider}${source} - ${highest.window.label} - ${formatQuotaReset(highest.window.resetsAt)}`,
    };
  }

  const unavailable = (results ?? []).find((result) => !result.ok);
  if (unavailable) {
    return {
      value: "--",
      description: `${providerQuotaName(unavailable.provider)} quota unavailable`,
    };
  }

  return { value: "--", description: "No provider quota data" };
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialogActions();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [animatedActivityIds, setAnimatedActivityIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const hydratedActivityRef = useRef(false);
  const activityAnimationTimersRef = useRef<number[]>([]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(selectedCompanyId!),
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const {
    data: agentAvailability,
    isLoading: isAgentAvailabilityLoading,
    error: agentAvailabilityError,
  } = useQuery({
    queryKey: queryKeys.agentAvailability(selectedCompanyId!),
    queryFn: () => dashboardApi.agentAvailability(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: (query) => query.state.data?.state === "draining" ? 5_000 : 30_000,
  });

  const agentAvailabilityMutation = useMutation({
    mutationFn: (enabled: boolean) => dashboardApi.setAgentAvailability(
      selectedCompanyId!,
      enabled,
      crypto.randomUUID(),
    ),
    onSuccess: (availability) => {
      queryClient.setQueryData(queryKeys.agentAvailability(selectedCompanyId!), availability);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(selectedCompanyId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(selectedCompanyId!) });
    },
  });

  const { data: companySituation, error: companySituationError } = useQuery({
    queryKey: queryKeys.companySituation(selectedCompanyId!),
    queryFn: () => dashboardApi.situation(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: softwarehouseStatus, isLoading: isSoftwarehouseStatusLoading } = useQuery({
    queryKey: queryKeys.softwarehouse.status(selectedCompanyId!),
    queryFn: () => softwarehouseApi.status(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: activity } = useQuery({
    queryKey: [...queryKeys.activity(selectedCompanyId!), { limit: DASHBOARD_ACTIVITY_LIMIT }],
    queryFn: () => activityApi.list(selectedCompanyId!, { limit: DASHBOARD_ACTIVITY_LIMIT }),
    enabled: !!selectedCompanyId,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: quotaWindows, isLoading: isQuotaLoading } = useQuery({
    queryKey: queryKeys.usageQuotaWindows(selectedCompanyId!),
    queryFn: () => costsApi.quotaWindows(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  const { data: companyMembers } = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId!),
    queryFn: () => accessApi.listUserDirectory(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const userProfileMap = useMemo(
    () => buildCompanyUserProfileMap(companyMembers?.users),
    [companyMembers?.users],
  );

  const recentIssues = issues ? getRecentIssues(issues) : [];
  const recentActivity = useMemo(() => (activity ?? []).slice(0, 10), [activity]);

  useEffect(() => {
    for (const timer of activityAnimationTimersRef.current) {
      window.clearTimeout(timer);
    }
    activityAnimationTimersRef.current = [];
    seenActivityIdsRef.current = new Set();
    hydratedActivityRef.current = false;
    setAnimatedActivityIds(new Set());
  }, [selectedCompanyId]);

  useEffect(() => {
    if (recentActivity.length === 0) return;

    const seen = seenActivityIdsRef.current;
    const currentIds = recentActivity.map((event) => event.id);

    if (!hydratedActivityRef.current) {
      for (const id of currentIds) seen.add(id);
      hydratedActivityRef.current = true;
      return;
    }

    const newIds = currentIds.filter((id) => !seen.has(id));
    if (newIds.length === 0) {
      for (const id of currentIds) seen.add(id);
      return;
    }

    setAnimatedActivityIds((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });

    for (const id of newIds) seen.add(id);

    const timer = window.setTimeout(() => {
      setAnimatedActivityIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.delete(id);
        return next;
      });
      activityAnimationTimersRef.current = activityAnimationTimersRef.current.filter((t) => t !== timer);
    }, 980);
    activityAnimationTimersRef.current.push(timer);
  }, [recentActivity]);

  useEffect(() => {
    return () => {
      for (const timer of activityAnimationTimersRef.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.identifier ?? i.id.slice(0, 8));
    for (const a of agents ?? []) map.set(`agent:${a.id}`, a.name);
    for (const p of projects ?? []) map.set(`project:${p.id}`, p.name);
    return map;
  }, [issues, agents, projects]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.title);
    return map;
  }, [issues]);

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  if (!selectedCompanyId) {
    if (companies.length === 0) {
      return (
        <EmptyState
          icon={LayoutDashboard}
          message="Welcome to Paperclip. Set up your first company and agent to get started."
          action="Get Started"
          onAction={openOnboarding}
        />
      );
    }
    return (
      <EmptyState icon={LayoutDashboard} message="Create or select a company to view the dashboard." />
    );
  }

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  const hasNoAgents = agents !== undefined && agents.length === 0;
  const quotaMetric = providerQuotaMetric(quotaWindows, isQuotaLoading);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {companySituationError && <p className="text-sm text-destructive">{companySituationError.message}</p>}

      {hasNoAgents && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You have no agents.
            </p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId! })}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline underline-offset-2 shrink-0"
          >
            Create one here
          </button>
        </div>
      )}

      <AgentAvailabilityControl
        availability={agentAvailability}
        loading={isAgentAvailabilityLoading}
        pending={agentAvailabilityMutation.isPending}
        error={agentAvailabilityMutation.error?.message ?? agentAvailabilityError?.message ?? null}
        onChange={(enabled) => agentAvailabilityMutation.mutate(enabled)}
      />

      {data ? (
        <InnovationCommandCenter
          status={softwarehouseStatus}
          loading={isSoftwarehouseStatusLoading}
          projects={projects ?? []}
          issues={issues ?? []}
          dashboard={data}
          situation={companySituation}
          quota={quotaMetric}
        />
      ) : null}

      {data && (
        <>
          <ActiveAgentsPanel
            companyId={selectedCompanyId!}
            title="Recent autonomous work"
            cardClassName="h-[240px]"
          />

          {companySituation && <CompanySituationPanel situation={companySituation} />}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ChartCard title="Run Activity" subtitle="Last 14 days">
              <RunActivityChart activity={data.runActivity} />
            </ChartCard>
            <ChartCard title="Issues by Priority" subtitle="Last 14 days">
              <PriorityChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="Issues by Status" subtitle="Last 14 days">
              <IssueStatusChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="Success Rate" subtitle="Last 14 days">
              <SuccessRateChart activity={data.runActivity} />
            </ChartCard>
          </div>

          <PluginSlotOutlet
            slotTypes={["dashboardWidget"]}
            context={{ companyId: selectedCompanyId }}
            className="grid gap-4 md:grid-cols-2"
            itemClassName="rounded-lg border bg-card p-4 shadow-sm"
          />

          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <section className="paperclip-surface min-w-0 overflow-hidden">
                <h3 className="paperclip-surface-header paperclip-section-title border-b border-border px-4 py-3">
                  Recent Activity
                </h3>
                <div className="divide-y divide-border overflow-hidden">
                  {recentActivity.map((event) => (
                    <ActivityRow
                      key={event.id}
                      event={event}
                      agentMap={agentMap}
                      userProfileMap={userProfileMap}
                      entityNameMap={entityNameMap}
                      entityTitleMap={entityTitleMap}
                      className={animatedActivityIds.has(event.id) ? "activity-row-enter" : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Tasks */}
            <section className="paperclip-surface min-w-0 overflow-hidden">
              <h3 className="paperclip-surface-header paperclip-section-title border-b border-border px-4 py-3">
                Recent Tasks
              </h3>
              {recentIssues.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden">
                  {recentIssues.slice(0, 10).map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.identifier ?? issue.id}`}
                      className="px-4 py-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors no-underline text-inherit block"
                    >
                      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                        {/* Status icon - left column on mobile */}
                        <span className="shrink-0 sm:hidden">
                          <StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} />
                        </span>

                        {/* Right column on mobile: title + metadata stacked */}
                        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
                          <span className="line-clamp-2 text-sm sm:order-2 sm:flex-1 sm:min-w-0 sm:line-clamp-none sm:truncate">
                            {issue.title}
                          </span>
                          <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                            <span className="hidden sm:inline-flex"><StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} /></span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {issue.identifier ?? issue.id.slice(0, 8)}
                            </span>
                            {issue.assigneeAgentId && (() => {
                              const name = agentName(issue.assigneeAgentId);
                              return name
                                ? (
                                    <span className="hidden sm:inline-flex">
                                      <Identity
                                        name={name}
                                        agentIcon={agentMap.get(issue.assigneeAgentId)?.icon ?? null}
                                        size="sm"
                                      />
                                    </span>
                                  )
                                : null;
                            })()}
                            <span className="text-xs text-muted-foreground sm:hidden">&middot;</span>
                            <span className="text-xs text-muted-foreground shrink-0 sm:order-last">
                              {timeAgo(issue.updatedAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

        </>
      )}
    </div>
  );
}
