import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, LayoutDashboard } from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { costsApi } from "../api/costs";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { softwarehouseApi } from "../api/softwarehouse";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { MissionControlDashboard } from "../components/MissionControlDashboard";
import { PageSkeleton } from "../components/PageSkeleton";
import type { ProviderQuotaResult, QuotaWindow } from "@paperclipai/shared";
import { PluginSlotOutlet } from "@/plugins/slots";

const DASHBOARD_ACTIVITY_LIMIT = 60;

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
  if (isLoading) return { value: "...", description: "Checking provider quota" };

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
    const highest = candidates.reduce((best, current) => current.usedPercent > best.usedPercent ? current : best);
    const source = highest.source ? ` via ${highest.source}` : "";
    return {
      value: `${Math.round(highest.usedPercent)}%`,
      description: `${highest.provider}${source} · ${highest.window.label} · ${formatQuotaReset(highest.window.resetsAt)}`,
    };
  }

  const unavailable = (results ?? []).find((result) => !result.ok);
  if (unavailable) {
    return { value: "--", description: `${providerQuotaName(unavailable.provider)} quota unavailable` };
  }

  return { value: "--", description: "No provider quota data" };
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialogActions();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(selectedCompanyId!),
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
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
    return <EmptyState icon={LayoutDashboard} message="Create or select a company to view the dashboard." />;
  }

  if (isLoading) return <PageSkeleton variant="dashboard" />;

  const hasNoAgents = agents !== undefined && agents.length === 0;
  const quotaMetric = providerQuotaMetric(quotaWindows, isQuotaLoading);

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {companySituationError ? <p className="text-sm text-destructive">{companySituationError.message}</p> : null}
      {isSoftwarehouseStatusLoading ? <p className="sr-only" aria-live="polite">Refreshing control evidence</p> : null}

      {hasNoAgents ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-100">You have no agents.</p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId })}
            className="shrink-0 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            Create one here
          </button>
        </div>
      ) : null}

      {data ? (
        <MissionControlDashboard
          dashboard={data}
          liveRunCount={liveRuns?.length ?? 0}
          situation={companySituation}
          status={softwarehouseStatus}
          agents={agents ?? []}
          issues={issues ?? []}
          projects={projects ?? []}
          activity={activity ?? []}
          quota={quotaMetric}
          availability={agentAvailability}
          availabilityLoading={isAgentAvailabilityLoading}
          availabilityPending={agentAvailabilityMutation.isPending}
          availabilityError={agentAvailabilityMutation.error?.message ?? agentAvailabilityError?.message ?? null}
          onAvailabilityChange={(enabled) => agentAvailabilityMutation.mutate(enabled)}
        />
      ) : null}

      <PluginSlotOutlet
        slotTypes={["dashboardWidget"]}
        context={{ companyId: selectedCompanyId }}
        className="grid gap-3 md:grid-cols-2"
        itemClassName="paperclip-surface p-4"
      />
    </div>
  );
}
