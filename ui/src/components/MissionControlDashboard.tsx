import { useMemo, useState } from "react";
import type {
  ActivityEvent,
  Agent,
  AgentAvailability,
  CompanySituation,
  CompanySituationSignal,
  DashboardRunActivityDay,
  DashboardSummary,
  Issue,
  Project,
  SoftwarehouseControlStatusResponse,
} from "@paperclipai/shared";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  Inbox,
  Network,
  Play,
  Search,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import { Link } from "@/lib/router";
import { AgentAvailabilityControl } from "./AgentAvailabilityControl";
import { Identity } from "./Identity";
import { StatusBadge } from "./StatusBadge";
import { cn, formatCents, relativeTime } from "../lib/utils";
import { formatActivityVerb } from "../lib/activity-format";

type AgentFilter = "noteworthy" | "running" | "paused" | "idle";

interface MissionControlDashboardProps {
  dashboard: DashboardSummary;
  liveRunCount: number;
  situation?: CompanySituation | null;
  status?: SoftwarehouseControlStatusResponse | null;
  agents: Agent[];
  issues: Issue[];
  projects: Project[];
  activity: ActivityEvent[];
  quota: { value: string; description: string };
  availability?: AgentAvailability;
  availabilityLoading?: boolean;
  availabilityPending?: boolean;
  availabilityError?: string | null;
  onAvailabilityChange: (enabled: boolean) => void;
}

interface ConstraintItem {
  id: string;
  title: string;
  type: string;
  impact: "High" | "Medium" | "Low";
  age: string;
  affected: string;
  owner: string;
  href: string;
}

const OWNER_DECISION_KINDS = new Set([
  "pending_approval",
  "assumption_contradicted",
  "commitment_breached",
  "commitment_overdue",
  "outcome_state_conflict",
  "external_signal_contradicted",
  "outcome_failure",
]);

const ACTIVE_ISSUE_STATUSES = new Set<Issue["status"]>(["todo", "in_progress", "in_review", "blocked"]);

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatObservedAt(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "Observation unavailable";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timeOnly(value: string | Date) {
  const date = toDate(value);
  if (!date) return "--:--";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function issueHref(issue: Issue | undefined) {
  return issue ? `/issues/${issue.identifier ?? issue.id}` : "/issues";
}

function signalHref(signal: CompanySituationSignal) {
  const issueSource = signal.sources.find((source) => source.entityType === "issue");
  const projectSource = signal.sources.find((source) => source.entityType === "project");
  const agentSource = signal.sources.find((source) => source.entityType === "agent");
  if (issueSource) return `/issues/${issueSource.entityId}`;
  if (projectSource) return `/projects/${projectSource.entityId}`;
  if (agentSource) return `/agents/${agentSource.entityId}`;
  if (signal.kind === "pending_approval") return "/approvals";
  if (signal.kind === "budget_incident") return "/costs";
  if (signal.kind === "blocked_work") return "/issues?status=blocked";
  if (signal.kind === "unassigned_runnable_work") return "/issues";
  return "/inbox";
}

function activityHref(
  event: ActivityEvent,
  issueMap: Map<string, Issue>,
  projectMap: Map<string, Project>,
) {
  if (event.entityType === "issue") return issueHref(issueMap.get(event.entityId));
  if (event.entityType === "agent") return `/agents/${event.entityId}`;
  if (event.entityType === "project") {
    const project = projectMap.get(event.entityId);
    return project ? `/projects/${project.urlKey}` : "/projects";
  }
  if (event.entityType === "approval") return `/approvals/${event.entityId}`;
  if (event.entityType === "heartbeat_run" && event.agentId) return `/agents/${event.agentId}/runs/${event.entityId}`;
  return null;
}

function signalAffected(signal: CompanySituationSignal, situation: CompanySituation | null | undefined) {
  switch (signal.kind) {
    case "blocked_work": return `${situation?.work.blocked ?? 0} issues`;
    case "unassigned_runnable_work": return `${situation?.work.unassignedRunnable ?? 0} issues`;
    case "pending_approval": return `${situation?.governance.pendingApprovals ?? 0} approvals`;
    case "budget_incident": return `${situation?.governance.activeBudgetIncidents ?? 0} incidents`;
    case "capacity_bottleneck":
    case "parallel_wip": return `${situation?.capacity.agentsWithParallelWip ?? 0} agents`;
    case "project_overdue":
    case "project_due_soon":
    case "project_target_missing": return `${signal.sources.filter((source) => source.entityType === "project").length || 1} projects`;
    default: return `${signal.sources.length || 1} signals`;
  }
}

function signalOwner(signal: CompanySituationSignal, agents: Map<string, Agent>) {
  const agentSource = signal.sources.find((source) => source.entityType === "agent");
  if (agentSource) return agents.get(agentSource.entityId)?.name ?? "Agent owner";
  if (OWNER_DECISION_KINDS.has(signal.kind)) return "Board";
  return "Control plane";
}

function oldestSignalAge(signal: CompanySituationSignal) {
  const observed = signal.sources
    .map((source) => toDate(source.observedAt))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime())[0];
  return observed ? relativeTime(observed) : "Unknown";
}

function activityCategory(event: ActivityEvent) {
  const action = event.action.toLowerCase();
  if (action.includes("fail") || action.includes("error") || action.includes("reject")) {
    return { label: "Incident", tone: "bad" as const };
  }
  if (event.entityType === "approval" || action.includes("decision")) {
    return { label: "Decision", tone: "warn" as const };
  }
  if (event.entityType === "heartbeat_run" || event.runId) {
    return { label: "Run", tone: "active" as const };
  }
  if (event.entityType.includes("observation") || event.entityType.includes("evidence")) {
    return { label: "Evidence", tone: "active" as const };
  }
  return { label: event.entityType === "issue" ? "Issue" : "Event", tone: "neutral" as const };
}

function primaryActionLabel(signal: CompanySituationSignal | null, blockedCount: number, fallback?: string | null) {
  if (!signal) return blockedCount > 0 ? "Review blocked work" : fallback ?? "Open control cockpit";
  switch (signal.kind) {
    case "blocked_work": return "Repair blocker contract";
    case "unassigned_runnable_work": return "Assign runnable work";
    case "pending_approval": return "Review pending approvals";
    case "budget_incident": return "Resolve budget incident";
    case "no_available_agents": return "Restore agent capacity";
    case "external_signal_stale": return "Refresh external evidence";
    case "external_signal_contradicted": return "Review contradicted evidence";
    case "outcome_state_conflict": return "Reconcile outcome state";
    case "commitment_breached":
    case "commitment_overdue": return "Review commitment";
    default: return signal.suggestedAction.length <= 64 ? signal.suggestedAction : `Review ${signal.kind.replaceAll("_", " ")}`;
  }
}

function forecastDays(situation: CompanySituation | null | undefined) {
  const likely = toDate(situation?.forecast.projectedCompletion?.likelyAt);
  if (!likely) return null;
  return Math.max(0, Math.ceil((likely.getTime() - Date.now()) / 86_400_000));
}

function formatOldestHours(hours: number | null | undefined) {
  if (hours == null) return null;
  if (hours < 1) return "oldest <1h";
  if (hours < 24) return `oldest ${Math.round(hours)}h`;
  return `oldest ${Math.round(hours / 24)}d`;
}

function oldestFlowAge(
  situation: CompanySituation | null | undefined,
  stages: CompanySituation["capacity"]["flow"][number]["stage"][],
) {
  const ages = (situation?.capacity.flow ?? [])
    .filter((item) => stages.includes(item.stage) && item.count > 0 && item.oldestHours != null)
    .map((item) => item.oldestHours as number);
  return formatOldestHours(ages.length ? Math.max(...ages) : null);
}

function evidenceFreshness(status: SoftwarehouseControlStatusResponse | null | undefined) {
  if (!status?.available) return "Evidence unavailable";
  const age = status.ageSeconds == null
    ? (status.observedAt ? relativeTime(status.observedAt) : "age unknown")
    : status.ageSeconds < 60
      ? "under 1m old"
      : status.ageSeconds < 3_600
        ? `${Math.round(status.ageSeconds / 60)}m old`
        : `${Math.round(status.ageSeconds / 3_600)}h old`;
  return status.stale ? `Evidence stale · ${age}` : `Evidence fresh · ${age}`;
}

export function MissionControlDashboard({
  dashboard,
  liveRunCount,
  situation,
  status,
  agents,
  issues,
  projects,
  activity,
  quota,
  availability,
  availabilityLoading = false,
  availabilityPending = false,
  availabilityError = null,
  onAvailabilityChange,
}: MissionControlDashboardProps) {
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("noteworthy");

  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const issueMap = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const sortedIssues = useMemo(
    () => [...issues].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [issues],
  );

  const quotaPercent = Number.parseFloat(quota.value.replace("%", ""));
  const normalizedQuotaPercent = Number.isFinite(quotaPercent) ? Math.max(0, Math.min(100, quotaPercent)) : null;
  const evidenceHealthy = Boolean(status?.available && !status.stale && status.projectTruth.projects.length > 0);
  const schedulerHealthy = availability?.state === "on" || availability?.state === "reopening";
  const runtimeHealthy = dashboard.agents.error === 0;
  const budgetHealthy = dashboard.budgets.activeIncidents === 0;
  const quotaHealthy = normalizedQuotaPercent == null || normalizedQuotaPercent < 85;
  const healthChecks = [true, schedulerHealthy, runtimeHealthy, budgetHealthy, evidenceHealthy, quotaHealthy];
  const healthyCount = healthChecks.filter(Boolean).length;

  const blockedCount = situation?.work.blocked ?? dashboard.tasks.blocked;
  const dispatchConstrained = (situation?.capacity.dispatchState ?? "healthy") !== "healthy";
  const overallTone = !status?.available || dashboard.agents.error > 0
    ? "bad"
    : blockedCount > 0 || dispatchConstrained || status.stale
      ? "warn"
      : "good";
  const overallSummary = !status?.available
    ? "Paperclip is online; control evidence is unavailable."
    : dashboard.agents.error > 0
      ? `Paperclip is online; ${dashboard.agents.error} agent${dashboard.agents.error === 1 ? " needs" : "s need"} recovery.`
      : blockedCount > 0
        ? `Paperclip is online; delivery is constrained by ${blockedCount} blocked issue${blockedCount === 1 ? "" : "s"}.`
        : dispatchConstrained
          ? "Paperclip is online; autonomous dispatch is operating with constraints."
          : "Paperclip is online and autonomous delivery is healthy.";

  const observedAt = status?.observedAt ?? situation?.generatedAt ?? new Date().toISOString();
  const reviewCount = situation?.work.inReview ?? issues.filter((issue) => issue.status === "in_review").length;
  const readyCount = situation?.work.unassignedRunnable ?? 0;
  const recentDeliveryCount = issues.filter((issue) => {
    const updated = toDate(issue.updatedAt);
    return issue.status === "done" && updated && Date.now() - updated.getTime() <= 86_400_000;
  }).length;
  const latestDeliveryAt = sortedIssues.find((issue) => issue.status === "done")?.updatedAt ?? null;

  const inProgressCount = situation?.work.inProgress ?? dashboard.tasks.inProgress;
  const availableAgentCount = situation?.capacity.availableAgents
    ?? agents.filter((agent) => agent.status !== "paused" && agent.status !== "error").length;
  const unassignedRunnableCount = situation?.work.unassignedRunnable ?? 0;
  const dispatchableCount = situation?.capacity.dispatchableRunnableIssues ?? readyCount;
  const executionSignal = liveRunCount > 0
    ? {
        summary: `${liveRunCount} agent run${liveRunCount === 1 ? " is" : "s are"} live now.`,
        mobileSummary: `${liveRunCount} live`,
        short: inProgressCount > 0
          ? `${inProgressCount} issue${inProgressCount === 1 ? "" : "s"} in progress`
          : "agent run active",
        action: "View live work",
        mobileAction: "Live",
        href: "/dashboard/live",
        attention: false,
      }
    : availability && !availability.acceptsNewRuns
      ? {
          summary: `Execution is idle because agent admission is ${availability.state}.`,
          mobileSummary: `Agent starts ${availability.state}`,
          short: `admission ${availability.state}`,
          action: "Review agents",
          mobileAction: "Agents",
          href: "/agents",
          attention: true,
        }
      : inProgressCount > 0
        ? {
            summary: `${inProgressCount} issue${inProgressCount === 1 ? " remains" : "s remain"} in progress without a live agent run.`,
            mobileSummary: "No live run",
            short: "no live run",
            action: "Review in-progress work",
            mobileAction: "Review",
            href: "/issues?status=in_progress",
            attention: true,
          }
      : readyCount > 0 && unassignedRunnableCount >= readyCount
        ? {
            summary: `Execution is idle because all ${readyCount} runnable issue${readyCount === 1 ? " is" : "s are"} unassigned.`,
            mobileSummary: `${readyCount} runnable unassigned`,
            short: "unassigned",
            action: "Assign work",
            mobileAction: "Assign",
            href: "/issues",
            attention: true,
          }
        : readyCount > 0 && dispatchableCount === 0
          ? {
              summary: "Execution is idle because no runnable issue currently passes dispatch controls.",
              mobileSummary: "No issue passes controls",
              short: "dispatch held",
              action: "Review controls",
              mobileAction: "Controls",
              href: "/softwarehouse",
              attention: true,
            }
          : readyCount > 0 && availableAgentCount === 0
            ? {
                summary: `Execution is idle because ${readyCount} runnable issue${readyCount === 1 ? " has" : "s have"} no available agent.`,
                mobileSummary: "No available agent",
                short: "no available agent",
                action: "Review agents",
                mobileAction: "Agents",
                href: "/agents",
                attention: true,
              }
            : readyCount > 0 && dispatchConstrained
              ? {
                  summary: `Execution is idle while dispatch is ${situation?.capacity.dispatchState ?? "constrained"}.`,
                  mobileSummary: "Dispatch constrained",
                  short: "dispatch constrained",
                  action: "Open control cockpit",
                  mobileAction: "Control",
                  href: "/softwarehouse",
                  attention: true,
                }
              : {
                  summary: "Execution is idle; the scheduler is waiting for the next eligible issue.",
                  mobileSummary: "Waiting for eligible work",
                  short: "waiting for work",
                  action: "View issues",
                  mobileAction: "Issues",
                  href: "/issues",
                  attention: false,
                };

  const flow = [
    { label: "Intake", value: readyCount, detail: "ready", context: oldestFlowAge(situation, ["assigned_queue"]), icon: Inbox, href: "/issues", tone: "intake", mobileSecondary: true },
    { label: "Execution", value: liveRunCount, detail: "live", context: executionSignal.short, icon: Play, href: "/dashboard/live", tone: "execution" },
    { label: "Review", value: reviewCount, detail: "in review", context: oldestFlowAge(situation, ["review", "human_gate"]), icon: Search, href: "/issues?status=in_review", tone: "review" },
    { label: "Delivery", value: recentDeliveryCount, detail: "last 24h", context: latestDeliveryAt ? `latest ${relativeTime(latestDeliveryAt)}` : "no recent delivery", icon: Upload, href: "/issues?status=done", tone: "delivery", mobileSecondary: true },
    { label: "Blocked", value: blockedCount, detail: "needs attention", context: oldestFlowAge(situation, ["blocked_dependency", "blocked_conflict", "blocked_unknown"]), icon: Ban, href: "/issues?status=blocked", tone: "blocked", attention: blockedCount > 0 },
  ];

  const ownerDecisionCount = (situation?.attention ?? []).filter((signal) => OWNER_DECISION_KINDS.has(signal.kind)).length
    + dashboard.pendingApprovals
    + dashboard.budgets.pendingApprovals;
  const primaryAttention = situation?.attention[0] ?? null;
  const primaryActionHref = primaryAttention ? signalHref(primaryAttention) : blockedCount > 0 ? "/issues?status=blocked" : "/softwarehouse";
  const primaryAction = primaryActionLabel(primaryAttention, blockedCount, status?.primaryNextAction);
  const meaningfulActivity = useMemo(() => {
    const seen = new Set<string>();
    return activity.filter((event) => {
      if (/(read_marked|viewed|opened|read$)/i.test(event.action)) return false;
      const key = `${event.actorId}:${event.action}:${event.entityType}:${event.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activity]);

  const constraints = useMemo<ConstraintItem[]>(() => {
    const result = (situation?.attention ?? []).map((signal) => ({
      id: signal.id,
      title: signal.title,
      type: signal.kind.replaceAll("_", " "),
      impact: signal.severity === "critical" ? "High" as const : signal.severity === "warning" ? "Medium" as const : "Low" as const,
      age: oldestSignalAge(signal),
      affected: signalAffected(signal, situation),
      owner: signalOwner(signal, agentMap),
      href: signalHref(signal),
    }));

    if ((!status?.available || status.stale) && !result.some((item) => item.type.includes("external signal"))) {
      result.unshift({
        id: "control-evidence",
        title: status?.stale ? "Control evidence is stale" : "Project truth snapshot unavailable",
        type: "evidence",
        impact: "High",
        age: status?.observedAt ? relativeTime(status.observedAt) : "Unknown",
        affected: `${status?.projectTruth.projectCount ?? projects.length} projects`,
        owner: "Control plane",
        href: "/softwarehouse",
      });
    }

    if (blockedCount > 0 && !result.some((item) => item.type === "blocked work")) {
      result.unshift({
        id: "blocked-work",
        title: `${blockedCount} issues are blocked`,
        type: "dependency",
        impact: "High",
        age: situation?.capacity.bottleneck?.oldestHours != null ? `${Math.round(situation.capacity.bottleneck.oldestHours)}h` : "Unknown",
        affected: `${blockedCount} issues`,
        owner: "Issue owners",
        href: "/issues?status=blocked",
      });
    }

    return result.slice(0, 5);
  }, [agentMap, blockedCount, projects.length, situation, status]);

  const agentCounts = {
    running: agents.filter((agent) => agent.status === "running").length,
    paused: agents.filter((agent) => agent.status === "paused").length,
    idle: agents.filter((agent) => agent.status !== "running" && agent.status !== "paused" && agent.status !== "error").length,
  };
  const activeIssueByAgent = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of sortedIssues) {
      if (!issue.assigneeAgentId || !ACTIVE_ISSUE_STATUSES.has(issue.status) || map.has(issue.assigneeAgentId)) continue;
      map.set(issue.assigneeAgentId, issue);
    }
    return map;
  }, [sortedIssues]);
  const noteworthyAgents = useMemo(() => {
    const score = (agent: Agent) => {
      if (agent.status === "error") return 8;
      if (agent.status === "running") return 7;
      if (activeIssueByAgent.has(agent.id)) return 5;
      if (agent.status === "paused") return 3;
      return agent.lastHeartbeatAt ? 2 : 0;
    };
    const sorted = [...agents].sort((left, right) => {
      const scoreDelta = score(right) - score(left);
      if (scoreDelta !== 0) return scoreDelta;
      return (toDate(right.lastHeartbeatAt)?.getTime() ?? 0) - (toDate(left.lastHeartbeatAt)?.getTime() ?? 0);
    });
    if (agentFilter === "running") return sorted.filter((agent) => agent.status === "running").slice(0, 5);
    if (agentFilter === "paused") return sorted.filter((agent) => agent.status === "paused").slice(0, 5);
    if (agentFilter === "idle") return sorted.filter((agent) => agent.status !== "running" && agent.status !== "paused" && agent.status !== "error").slice(0, 5);
    return sorted.slice(0, 5);
  }, [activeIssueByAgent, agentFilter, agents]);

  const likelyDays = forecastDays(situation);
  const DispatchSignalIcon = executionSignal.attention ? AlertTriangle : CheckCircle2;

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              overallTone === "good" && "bg-emerald-500",
              overallTone === "warn" && "bg-amber-500",
              overallTone === "bad" && "bg-destructive",
            )} />
            <span>{overallSummary}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatObservedAt(observedAt)}</span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Auto-refresh</span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <AgentAvailabilityControl
            variant="compact"
            availability={availability}
            loading={availabilityLoading}
            pending={availabilityPending}
            error={availabilityError}
            onChange={onAvailabilityChange}
          />
        </div>
      </header>

      <nav className="paperclip-surface overflow-x-auto" aria-label="Company work flow">
        <div className="grid grid-cols-3 items-stretch divide-x divide-border sm:flex sm:min-w-[700px]">
          {flow.map((stage, index) => {
            const Icon = stage.icon;
            const active = stage.value > 0;
            const liveExecution = stage.tone === "execution" && active;
            return (
              <div key={stage.label} className={cn("min-w-0 flex-1 items-center", stage.mobileSecondary ? "hidden sm:flex" : "flex")}>
                <Link
                  to={stage.href}
                  data-workflow-stage={stage.tone}
                  data-active={active ? "true" : "false"}
                  data-live={liveExecution ? "true" : undefined}
                  className={cn(
                    "group/workflow relative isolate flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2 py-3 text-inherit no-underline outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-accent/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-3 sm:px-4",
                    active && stage.tone === "intake" && "bg-sky-500/[0.035] hover:bg-sky-500/[0.075]",
                    active && stage.tone === "review" && "bg-violet-500/[0.035] hover:bg-violet-500/[0.075]",
                    active && stage.tone === "delivery" && "bg-emerald-500/[0.035] hover:bg-emerald-500/[0.075]",
                    active && stage.tone === "blocked" && "bg-amber-500/[0.05] hover:bg-amber-500/[0.09]",
                    liveExecution && "workflow-stage-live",
                    "motion-safe:hover:-translate-y-px",
                  )}
                >
                  <span className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-[background-color,color,transform] duration-200 group-hover/workflow:scale-105 sm:h-9 sm:w-9",
                    active && stage.tone === "intake" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                    active && stage.tone === "execution" && "workflow-stage-live-icon bg-cyan-500/10 text-[var(--status-live-foreground)]",
                    active && stage.tone === "review" && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    active && stage.tone === "delivery" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    active && stage.tone === "blocked" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}>
                    <Icon className="h-4 w-4" />
                    {liveExecution ? <span className="sr-only">Live execution</span> : null}
                  </span>
                  <span className="relative z-10 min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
                      {stage.label}
                      {liveExecution ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--status-live)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--status-live)_18%,transparent)]" /> : null}
                    </span>
                    <span className={cn(
                      "block text-base font-semibold tabular-nums",
                      active && stage.tone === "execution" && "text-[var(--status-live-foreground)]",
                      active && stage.tone === "review" && "text-violet-600 dark:text-violet-400",
                      active && stage.tone === "delivery" && "text-emerald-600 dark:text-emerald-400",
                      active && stage.tone === "blocked" && "text-amber-600 dark:text-amber-400",
                    )}>
                      {stage.value} <span className="text-xs font-normal text-muted-foreground">{stage.detail}</span>
                    </span>
                    {stage.context ? <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">{stage.context}</span> : null}
                  </span>
                </Link>
                {index < flow.length - 1 ? <ChevronRight className="-mr-2 hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" /> : null}
              </div>
            );
          })}
        </div>
        <Link
          to={executionSignal.href}
          className={cn(
            "flex min-h-9 items-center gap-2 border-t border-border px-4 py-2 text-xs text-inherit no-underline transition-colors hover:bg-accent/40",
            executionSignal.attention ? "bg-amber-500/[0.04]" : "bg-muted/10",
          )}
        >
          <DispatchSignalIcon className={cn("h-3.5 w-3.5 shrink-0", executionSignal.attention ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
          <span className="hidden font-medium sm:inline">Dispatch signal</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground" title={executionSignal.summary}>
            <span className="sm:hidden">{executionSignal.mobileSummary}</span>
            <span className="hidden sm:inline">{executionSignal.summary}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
            <span className="sm:hidden">{executionSignal.mobileAction}</span>
            <span className="hidden sm:inline">{executionSignal.action}</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </nav>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.95fr)]">
        <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="operating-picture-title">
          <header className="paperclip-surface-header flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
            <h2 id="operating-picture-title" className="text-sm font-semibold">Operating picture</h2>
            <span className="text-xs text-muted-foreground">Latest control-plane events</span>
          </header>
          {meaningfulActivity.length === 0 ? (
            <div className="paperclip-empty-state m-4 px-4 py-8 text-center text-sm text-muted-foreground">No material control-plane changes.</div>
          ) : (
            <ol className="divide-y divide-border">
              {meaningfulActivity.slice(0, 5).map((event, index) => {
                const category = activityCategory(event);
                const actor = event.actorType === "agent" ? agentMap.get(event.actorId)?.name ?? "Agent" : event.actorType === "system" ? "System" : "Board";
                const issue = event.entityType === "issue" ? issueMap.get(event.entityId) : undefined;
                const project = event.entityType === "project" ? projectMap.get(event.entityId) : undefined;
                const entity = issue?.identifier ?? project?.name ?? (event.entityType === "heartbeat_run" ? event.entityId.slice(0, 8) : null);
                const verb = formatActivityVerb(event.action, event.details, { agentMap });
                const href = activityHref(event, issueMap, projectMap);
                const eventAge = Date.now() - new Date(event.createdAt).getTime();
                const isFreshLiveEvent = category.tone === "active" && eventAge >= 0 && eventAge < 5 * 60_000;
                const row = (
                  <div className="group/activity grid grid-cols-[3.25rem_1rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-xs transition-colors">
                    <time className="font-mono text-muted-foreground" dateTime={new Date(event.createdAt).toISOString()}>{timeOnly(event.createdAt)}</time>
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      {isFreshLiveEvent ? <span className="activity-live-ping absolute inset-0 rounded-full bg-[var(--company-accent)]" /> : null}
                      <span className={cn(
                        "relative h-2 w-2 rounded-full ring-4 ring-background transition-transform duration-200 group-hover/activity:scale-125",
                        category.tone === "bad" && "bg-destructive",
                        category.tone === "warn" && "bg-amber-500",
                        category.tone === "active" && "bg-[var(--company-accent)]",
                        category.tone === "neutral" && "bg-muted-foreground/60",
                      )} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground"><span className="font-medium">{actor}</span> <span className="text-muted-foreground">{verb}</span>{entity ? ` ${entity}` : ""}</span>
                      {issue?.title ? <span className="block truncate text-xs text-muted-foreground">{issue.title}</span> : null}
                    </span>
                    <span className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                      category.tone === "bad" && "border-destructive/30 bg-destructive/10 text-destructive",
                      category.tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      category.tone === "active" && "border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] text-[var(--company-accent-strong)]",
                      category.tone === "neutral" && "border-border bg-muted/30 text-muted-foreground",
                    )}>{category.label}</span>
                  </div>
                );
                return (
                  <li key={event.id} data-activity-entry={event.id} className="activity-row-enter" style={{ animationDelay: `${index * 45}ms` }}>
                    {href ? <Link to={href} className="block text-inherit no-underline outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{row}</Link> : row}
                  </li>
                );
              })}
            </ol>
          )}
          <div className="border-t border-border px-4 py-2 text-center">
            <Link to="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View full timeline <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </section>

        <section className="paperclip-surface overflow-hidden" aria-labelledby="now-title">
          <header className="paperclip-surface-header border-b border-border px-4 py-3">
            <h2 id="now-title" className="text-sm font-semibold">Now</h2>
          </header>
          <div className="divide-y divide-border">
            <NowRow icon={Network} label="System health" value={`${healthyCount} / ${healthChecks.length} healthy`} detail={evidenceFreshness(status)} href="/softwarehouse" tone={healthyCount === healthChecks.length ? "good" : "warn"} />
            <NowRow icon={CalendarClock} label="Next legal action" value={primaryAction} detail={primaryAttention?.summary ?? status?.recommendedAction ?? "No blocking action recorded"} href={primaryActionHref} tone={primaryAttention?.severity === "critical" ? "bad" : "active"} />
            <NowRow icon={ShieldCheck} label="Owner decision required" value={String(ownerDecisionCount)} detail={ownerDecisionCount > 0 ? "Open the decision queue" : "No critical decision"} href="/inbox" tone={ownerDecisionCount > 0 ? "warn" : "good"} />
            <NowRow icon={Gauge} label="Provider quota" value={quota.value} detail={quota.description} href="/costs" tone={quotaHealthy ? "active" : "warn"} />
          </div>
          <div className="border-t border-border p-3">
            <Link to={primaryActionHref} className="group/action flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground no-underline transition-[background-color,box-shadow,transform] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-px">
              Resolve top constraint <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/action:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.4fr)]">
        <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="agents-panel-title">
          <header className="paperclip-surface-header flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <h2 id="agents-panel-title" className="text-sm font-semibold">Agents</h2>
              <span className="text-xs text-muted-foreground">Top 5 by status</span>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Filter agents by status">
              {([
                ["noteworthy", "All", agents.length],
                ["running", "Running", agentCounts.running],
                ["paused", "Paused", agentCounts.paused],
                ["idle", "Idle", agentCounts.idle],
              ] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={agentFilter === value}
                  onClick={() => setAgentFilter(value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    agentFilter === value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >{label} <span className="tabular-nums">{count}</span></button>
              ))}
            </div>
          </header>
          <div className="grid grid-cols-[minmax(0,1.15fr)_5rem_minmax(6rem,0.8fr)] border-b border-border bg-muted/15 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Agent</span><span>Last signal</span><span>Assigned issue</span>
          </div>
          {noteworthyAgents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No agents in this state.</div>
          ) : (
            <div className="divide-y divide-border">
              {noteworthyAgents.map((agent) => {
                const assigned = activeIssueByAgent.get(agent.id);
                const lastSignalAt = agent.lastHeartbeatAt ?? assigned?.lastActivityAt ?? assigned?.updatedAt ?? null;
                return (
                  <Link key={agent.id} to={`/agents/${agent.urlKey}`} className="grid grid-cols-[minmax(0,1.15fr)_5rem_minmax(6rem,0.8fr)] items-center gap-2 px-4 py-2 text-inherit no-underline outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        agent.status === "running" && "bg-cyan-500 animate-pulse",
                        agent.status === "paused" && "bg-amber-500",
                        agent.status === "error" && "bg-destructive",
                        agent.status !== "running" && agent.status !== "paused" && agent.status !== "error" && "bg-emerald-500",
                      )} title={agent.status} aria-hidden="true" />
                      <span className="sr-only">Status: {agent.status}</span>
                      <Identity name={agent.name} agentIcon={agent.icon} size="sm" className="min-w-0 [&>span:last-child]:truncate" />
                    </span>
                    <span className="text-xs text-muted-foreground">{lastSignalAt ? relativeTime(lastSignalAt) : "Never"}</span>
                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={assigned?.title}>{assigned?.identifier ?? "—"}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="border-t border-border px-4 py-2 text-center"><Link to="/agents" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all agents <ArrowRight className="h-3 w-3" /></Link></div>
        </section>

        <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="constraints-title">
          <header className="paperclip-surface-header flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h2 id="constraints-title" className="text-sm font-semibold">Constraints</h2>
            <span className="text-xs text-muted-foreground">Ranked by impact</span>
          </header>
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.5rem_minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_4rem_4.5rem_5.5rem_minmax(6rem,0.8fr)] border-b border-border bg-muted/15 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>#</span><span>Constraint</span><span>Type</span><span>Impact</span><span>Age</span><span>Affected</span><span>Owner</span>
              </div>
              {constraints.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No material constraints detected.</div>
              ) : (
                <div className="divide-y divide-border">
                  {constraints.map((constraint, index) => (
                    <Link key={constraint.id} to={constraint.href} className="group/constraint grid grid-cols-[1.5rem_minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_4rem_4.5rem_5.5rem_minmax(6rem,0.8fr)] items-center px-4 py-2 text-xs text-inherit no-underline outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <span className="font-mono text-muted-foreground">{index + 1}</span>
                      <span className="truncate font-medium transition-transform group-hover/constraint:translate-x-0.5" title={constraint.title}>{constraint.title}</span>
                      <span className="truncate capitalize text-muted-foreground">{constraint.type}</span>
                      <span className={cn("font-medium", constraint.impact === "High" ? "text-destructive" : constraint.impact === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{constraint.impact}</span>
                      <span className="text-muted-foreground">{constraint.age}</span>
                      <span className="text-muted-foreground">{constraint.affected}</span>
                      <span className="truncate text-muted-foreground" title={constraint.owner}>{constraint.owner}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border px-4 py-2 text-center"><Link to="/inbox" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all constraints <ArrowRight className="h-3 w-3" /></Link></div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
        <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="performance-title">
          <header className="paperclip-surface-header flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2"><h2 id="performance-title" className="text-sm font-semibold">Performance trend</h2><span className="text-xs text-muted-foreground">14 days</span></div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 bg-[var(--company-accent)]" />Success rate</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-muted-foreground/35" />Throughput</span>
              <span>Target ≥80%</span>
            </div>
          </header>
          <div className="px-3 pb-2 pt-3"><PerformanceTrendChart activity={dashboard.runActivity} /></div>
          <div className="border-t border-border px-4 py-2 text-right"><Link to="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View analytics <ArrowRight className="h-3 w-3" /></Link></div>
        </section>

        <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="capacity-title">
          <header className="paperclip-surface-header border-b border-border px-4 py-2.5"><h2 id="capacity-title" className="text-sm font-semibold">Cost &amp; capacity</h2></header>
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0 xl:grid-cols-2 xl:divide-y 2xl:grid-cols-4 2xl:divide-y-0">
            <CapacityCell label="Paperclip-tracked budget" value={`${formatCents(dashboard.costs.monthSpendCents)} / ${formatCents(dashboard.costs.monthBudgetCents)}`} detail={`Recorded spend · ${dashboard.costs.monthUtilizationPercent}% used`} percent={dashboard.costs.monthUtilizationPercent} />
            <CapacityCell label="Provider-reported quota" value={quota.value} detail={quota.description} percent={normalizedQuotaPercent} />
            <CapacityCell label="Runnable issues" value={String(situation?.work.runnable ?? 0)} detail={`${situation?.work.unassignedRunnable ?? 0} unassigned`} href="/issues" />
            <CapacityCell label="Forecast" value={likelyDays == null ? "—" : `${likelyDays}d`} detail={situation?.forecast.projectedCompletion ? `${situation.forecast.projectedCompletion.confidence} confidence` : "Not enough evidence"} />
          </div>
        </section>
      </div>

      <details className="paperclip-surface group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--company-accent-subtle)] text-[var(--company-accent-strong)]"><GitBranch className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">Innovation portfolio</span><span className={cn("text-xs", evidenceHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{evidenceHealthy ? `${status?.projectTruth.projectCount ?? 0} projects observed` : "Snapshot unavailable or stale"}</span></span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{status?.headline ?? "The latest project-truth snapshot cannot support a readiness claim."}</span>
          </span>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><span className="text-[var(--company-accent-strong)]">Innovation</span><ArrowRight className="h-3 w-3" />Product<ArrowRight className="h-3 w-3" />Service</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
          {status?.projectTruth.projects.length ? status.projectTruth.projects.map((truth) => (
            <div key={truth.name} className="grid gap-2 border-b border-border px-4 py-3 text-xs last:border-b-0 sm:grid-cols-[minmax(10rem,1fr)_auto_auto] sm:items-center">
              <span className="font-medium">{truth.name}</span>
              <span className="text-muted-foreground">{truth.totalGaps} indexed gap{truth.totalGaps === 1 ? "" : "s"}</span>
              <StatusBadge status={truth.publicProbeStatus === "pass" ? "active" : "blocked"} />
            </div>
          )) : <div className="paperclip-empty-state m-4 p-4 text-sm text-muted-foreground">Project truth is unavailable. Open the control cockpit to refresh the evidence.</div>}
          <div className="border-t border-border px-4 py-2 text-right"><Link to="/softwarehouse" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open control cockpit <ArrowRight className="h-3 w-3" /></Link></div>
        </div>
      </details>
    </div>
  );
}

function NowRow({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: "good" | "warn" | "bad" | "active";
}) {
  return (
    <Link to={href} className="group/now grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-inherit no-underline outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 group-hover/now:scale-105",
        tone === "good" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "active" && "bg-[var(--company-accent-subtle)] text-[var(--company-accent-strong)]",
      )}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0"><span className="block text-xs text-muted-foreground">{label}</span><span className="block truncate text-sm font-semibold" title={value}>{value}</span></span>
      <span className="flex max-w-36 items-center gap-1 text-right text-[11px] text-muted-foreground"><span className="line-clamp-2">{detail}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/now:translate-x-0.5" /></span>
    </Link>
  );
}

function CapacityCell({ label, value, detail, percent, href }: { label: string; value: string; detail: string; percent?: number | null; href?: string }) {
  const inner = (
    <>
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <span className="mt-2 block text-lg font-semibold tabular-nums">{value}</span>
      <span className="mt-1.5 block truncate text-[11px] text-muted-foreground" title={detail}>{detail}</span>
      {percent != null ? (
        <span
          className="mt-3 block h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${label}: ${Math.round(percent)}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <span className={cn("block h-full rounded-full", percent >= 85 ? "bg-destructive" : percent >= 60 ? "bg-amber-500" : "bg-[var(--company-accent)]")} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
        </span>
      ) : null}
    </>
  );
  return href
    ? <Link to={href} className="min-w-0 p-4 text-inherit no-underline outline-none transition-[background-color,transform] hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-safe:hover:-translate-y-px">{inner}</Link>
    : <div className="min-w-0 p-4">{inner}</div>;
}

export function PerformanceTrendChart({ activity }: { activity: DashboardRunActivityDay[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!activity.some((day) => day.total > 0)) {
    return <div className="paperclip-empty-state py-10 text-center text-sm text-muted-foreground">No runs in the selected period.</div>;
  }

  const chartWidth = 620;
  const chartHeight = 126;
  const left = 28;
  const top = 8;
  const plotWidth = 574;
  const plotHeight = 92;
  const maxTotal = Math.max(1, ...activity.map((day) => day.total));
  const step = plotWidth / Math.max(1, activity.length - 1);
  const barWidth = Math.max(5, Math.min(18, plotWidth / activity.length * 0.46));
  const points = activity.map((day, index) => {
    const rate = day.total > 0 ? day.succeeded / day.total : null;
    return {
      x: left + index * step,
      y: rate == null ? null : top + (1 - rate) * plotHeight,
      rate,
      day,
    };
  });
  const segments: Array<string> = [];
  let current: Array<string> = [];
  points.forEach((point) => {
    if (point.y == null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${point.x},${point.y}`);
    }
  });
  if (current.length > 1) segments.push(current.join(" "));
  const totalRuns = activity.reduce((sum, day) => sum + day.total, 0);
  const totalSucceeded = activity.reduce((sum, day) => sum + day.succeeded, 0);
  const averageRate = totalRuns > 0 ? Math.round(totalSucceeded / totalRuns * 100) : null;
  const observedPoints = points.filter((point) => point.day.total > 0);
  const selectedPoint = points.find((point) => point.day.date === selectedDate) ?? observedPoints.at(-1) ?? points.at(-1)!;
  const selectedRate = selectedPoint.day.total > 0 ? Math.round(selectedPoint.day.succeeded / selectedPoint.day.total * 100) : null;
  const targetGap = selectedRate == null ? null : selectedRate - 80;
  const selectedLabel = selectedPoint.day.date.slice(5);
  const selectDay = (date: string) => setSelectedDate(date);

  return (
    <div className="space-y-2">
      <div className="paperclip-inset flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2" aria-live="polite">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Selected day · {selectedLabel}</span>
        <span className="text-sm font-semibold tabular-nums">
          {selectedPoint.day.total.toLocaleString()} runs · {selectedRate == null ? "no rate" : `${selectedRate}% success`}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {selectedPoint.day.succeeded.toLocaleString()} succeeded · {selectedPoint.day.failed.toLocaleString()} failed
          {selectedPoint.day.other > 0 ? ` · ${selectedPoint.day.other.toLocaleString()} other` : ""}
        </span>
        <span className={cn(
          "ml-auto text-[11px] font-medium",
          targetGap != null && targetGap < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
        )}>
          {targetGap == null ? "Target comparison unavailable" : targetGap >= 0 ? `${targetGap}pp above target` : `${Math.abs(targetGap)}pp below target`}
        </span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-36 w-full" role="img" aria-labelledby="performance-chart-title performance-chart-desc">
        <title id="performance-chart-title">Run throughput and success rate over 14 days</title>
        <desc id="performance-chart-desc">Interactive daily run trend. Focus or select a day to inspect its outcomes. The 14-day average success rate is {averageRate == null ? "not available" : `${averageRate}%`}. Days without runs are shown as gaps.</desc>
        {[0, 0.5, 0.8, 1].map((rate) => {
          const y = top + (1 - rate) * plotHeight;
          return <g key={rate}><line x1={left} x2={left + plotWidth} y1={y} y2={y} stroke="var(--border)" strokeDasharray={rate === 0.8 ? "5 4" : undefined} opacity={rate === 0.8 ? 0.9 : 0.45} /><text x="0" y={y + 3} fontSize="9" fill="var(--muted-foreground)">{Math.round(rate * 100)}%</text></g>;
        })}
        <line x1={selectedPoint.x} x2={selectedPoint.x} y1={top} y2={top + plotHeight} stroke="var(--company-accent)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
        {points.map((point) => {
          const height = point.day.total / maxTotal * plotHeight;
          const active = point.day.date === selectedPoint.day.date;
          const ratePercent = point.rate == null ? null : Math.round(point.rate * 100);
          const accessibleLabel = `${point.day.date}: ${point.day.total} runs${ratePercent == null ? ", no success-rate observation" : `, ${ratePercent}% success, ${point.day.failed} failed`}`;
          return (
            <g
              key={point.day.date}
              role="button"
              tabIndex={0}
              aria-label={accessibleLabel}
              aria-pressed={active}
              className="cursor-pointer outline-none"
              onMouseEnter={() => selectDay(point.day.date)}
              onFocus={() => selectDay(point.day.date)}
              onClick={() => selectDay(point.day.date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectDay(point.day.date);
                }
              }}
            >
              <rect x={point.x - step / 2} y={top} width={step} height={plotHeight} fill="transparent" />
              <rect
                x={point.x - barWidth / 2}
                y={top + plotHeight - height}
                width={barWidth}
                height={height}
                rx="2"
                fill={active ? "var(--company-accent)" : "var(--muted-foreground)"}
                opacity={active ? 0.24 : 0.14}
                className="transition-[opacity,fill] duration-150"
              />
              {active ? <rect x={point.x - step / 2 + 1} y={top + 1} width={Math.max(1, step - 2)} height={Math.max(1, plotHeight - 2)} rx="3" fill="none" stroke="var(--ring)" strokeWidth="1.5" opacity="0.65" /> : null}
              <title>{accessibleLabel}</title>
            </g>
          );
        })}
        {segments.map((segment, index) => <polyline key={index} points={segment} fill="none" stroke="var(--company-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {points.filter((point) => point.y != null).map((point) => {
          const active = point.day.date === selectedPoint.day.date;
          return <circle key={`${point.day.date}-rate`} cx={point.x} cy={point.y ?? 0} r={active ? 4 : 2.5} fill="var(--company-accent)" stroke={active ? "var(--background)" : "none"} strokeWidth={active ? 2 : 0} className="pointer-events-none transition-[r] duration-150"><title>{point.day.date}: {Math.round((point.rate ?? 0) * 100)}% success ({point.day.succeeded}/{point.day.total})</title></circle>;
        })}
        <text x={left} y={chartHeight - 4} fontSize="9" fill="var(--muted-foreground)">{activity[0]?.date.slice(5)}</text>
        <text x={left + plotWidth / 2} y={chartHeight - 4} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">{activity[Math.floor(activity.length / 2)]?.date.slice(5)}</text>
        <text x={left + plotWidth} y={chartHeight - 4} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">{activity.at(-1)?.date.slice(5)}</text>
      </svg>
      <p className="sr-only">{activity.map((day) => `${day.date}: ${day.total} runs, ${day.total > 0 ? `${Math.round(day.succeeded / day.total * 100)}% success` : "no success-rate observation"}`).join("; ")}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[11px] text-muted-foreground">
        <span>{averageRate == null ? "14-day average unavailable" : `14-day average · ${averageRate}% success`}</span>
        <span>{totalRuns.toLocaleString()} runs observed</span>
        <span className="ml-auto">Hover, click, or focus a day to inspect it</span>
      </div>
    </div>
  );
}
