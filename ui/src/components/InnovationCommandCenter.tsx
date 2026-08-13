import type {
  CompanySituation,
  DashboardSummary,
  Issue,
  Project,
  SoftwarehouseControlStatusResponse,
} from "@paperclipai/shared";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  DollarSign,
  Gauge,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "@/lib/router";
import { cn, formatCents, relativeTime } from "@/lib/utils";

const OPEN_STATUSES = new Set<Issue["status"]>(["backlog", "todo", "in_progress", "in_review", "blocked"]);
const COMMAND_SURFACE_CLASS = "paperclip-surface overflow-hidden";
const OWNER_DECISION_SIGNAL_KINDS = new Set<CompanySituation["attention"][number]["kind"]>([
  "assumption_contradicted",
  "commitment_breached",
  "commitment_overdue",
  "outcome_state_conflict",
  "external_signal_contradicted",
  "outcome_failure",
]);

export function hasOwnerDecisionSignal(situation: CompanySituation | null | undefined) {
  return situation?.attention.some((signal) => OWNER_DECISION_SIGNAL_KINDS.has(signal.kind)) ?? false;
}

function normalizeProjectName(value: string) {
  return value
    .toLowerCase()
    .replace(/^\d+\s+innovation:\s*/, "")
    .trim();
}

function humanize(value: string | null | undefined, fallback = "Unknown") {
  return value ? value.replaceAll("_", " ") : fallback;
}

function commercialTone(status: string | null | undefined) {
  const value = status?.toLowerCase() ?? "";
  if (value.includes("conditional") || value.includes("guided")) return "text-amber-600 dark:text-amber-400";
  if (value === "go" || value === "sale_ready") return "text-emerald-600 dark:text-emerald-400";
  if (value.includes("no-go") || value.includes("no_go")) return "text-destructive";
  return "text-amber-600 dark:text-amber-400";
}

function commercialLabel(status: string | null | undefined) {
  if (!status) return "No contract status";
  if (status.toLowerCase() === "conditional_guided_sale_ready") return "Guided pilot only";
  return humanize(status).toUpperCase();
}

function commercialDecisionSummary(status: string | null | undefined, decision: string | null | undefined) {
  const normalized = decision?.toLowerCase() ?? "";
  if (status?.toLowerCase() === "no-go" && normalized.includes("owner_acceptance_pending")) {
    return "Owner acceptance is still required for the exact release candidate.";
  }
  return decision ?? "No readable sale-readiness decision in the configured contract.";
}

function nextGateSummary(value: string | null | undefined) {
  if (!value) return "No next gate recorded.";
  if (value.toLowerCase().startsWith("owner-acceptance lane")) {
    return "Complete owner acceptance for the exact release candidate.";
  }
  if (value.toLowerCase().includes("gap-register")) {
    return "Review the canonical gap register before widening the guided pilot boundary.";
  }
  return value;
}

function formatReviewDate(value: string | null | undefined) {
  if (!value) return "review date not stated";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return `reviewed ${new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp))}`;
}

export function InnovationCommandCenter({
  status,
  loading,
  projects,
  issues,
  dashboard,
  situation,
  quota,
}: {
  status?: SoftwarehouseControlStatusResponse | null;
  loading?: boolean;
  projects: Project[];
  issues: Issue[];
  dashboard: DashboardSummary;
  situation?: CompanySituation | null;
  quota: { value: string; description: string };
}) {
  const approvals = dashboard.pendingApprovals + dashboard.budgets.pendingApprovals;
  const budgetIncidents = dashboard.budgets.activeIncidents;
  const blocked = dashboard.tasks.blocked;
  const observedLabel = status?.observedAt ? relativeTime(status.observedAt) : "unknown";
  const hasUnresolvedOwnerDecision = hasOwnerDecisionSignal(situation);

  return (
    <div className="space-y-3">
      <div className="grid items-start gap-3 min-[1400px]:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-3">
          <section className={cn(COMMAND_SURFACE_CLASS, "min-w-0")} aria-labelledby="innovation-command-title">
          <header className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--company-accent-border)] bg-[var(--company-accent-soft)] text-[var(--company-accent-strong)]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="innovation-command-title" className="text-sm font-semibold">Innovation portfolio</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Technical truth shows what works. The sale-readiness contract decides what may be offered.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground" aria-label="Offering lifecycle">
              <span className="rounded-full border border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] px-2 py-0.5 font-medium text-[var(--company-accent-strong)]">Innovation</span>
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span>Product</span>
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span>Service</span>
            </div>
          </header>

          {loading ? (
            <div className="h-64 animate-pulse bg-muted/20" aria-label="Loading innovation portfolio" />
          ) : !status?.available || status.projectTruth.projects.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">
              The latest project-truth snapshot is unavailable. No readiness claim can be made.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {status.projectTruth.projects.map((truth) => {
                const project = projects.find((candidate) => normalizeProjectName(candidate.name) === normalizeProjectName(truth.name));
                const projectIssues = project ? issues.filter((issue) => issue.projectId === project.id) : [];
                const open = projectIssues.filter((issue) => OPEN_STATUSES.has(issue.status)).length;
                const inReview = projectIssues.filter((issue) => issue.status === "in_review").length;
                const commercial = truth.portfolio?.commercialReadiness;
                const projectHref = project ? `/projects/${project.urlKey}` : "/projects";
                const runtimePass = truth.publicProbeStatus === "pass";

                return (
                  <article key={truth.name} className="grid min-w-0 lg:grid-cols-2 xl:grid-cols-[minmax(9rem,0.75fr)_minmax(11rem,0.9fr)_minmax(13rem,1.05fr)_minmax(13rem,1fr)]">
                    <div className="min-w-0 border-b border-border px-4 py-4 lg:border-r xl:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={projectHref} className="group inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline">
                            {truth.name}
                            <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                          </Link>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {humanize(truth.portfolio?.lifecycleStage, "Innovation")} · {humanize(truth.portfolio?.offeringType, "application")}
                          </p>
                        </div>
                        <span className="rounded-full border border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--company-accent-strong)]">
                          Innovation
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {open} open · {inReview} in review
                      </p>
                    </div>

                    <div className="min-w-0 border-b border-border px-4 py-4 xl:border-b-0 xl:border-r">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Technical truth</p>
                      <div className={cn("mt-2 flex items-center gap-1.5 text-sm font-semibold", runtimePass ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                        {runtimePass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {runtimePass ? "Public runtime responds" : "Public runtime not confirmed"}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {truth.projectTruthStatus === "known_and_routable"
                          ? `Project map known · ${truth.totalGaps} indexed gap${truth.totalGaps === 1 ? "" : "s"}`
                          : `${humanize(truth.projectTruthStatus)} · ${truth.totalGaps} indexed gap${truth.totalGaps === 1 ? "" : "s"}`}
                      </p>
                    </div>

                    <div className="min-w-0 border-b border-border px-4 py-4 lg:border-r xl:border-b-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Commercial boundary</p>
                      <p className={cn("mt-2 text-sm font-semibold", commercialTone(commercial?.status))}>
                        {commercialLabel(commercial?.status)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground" title={commercial?.decision ?? undefined}>
                        {commercialDecisionSummary(commercial?.status, commercial?.decision)}
                      </p>
                      {commercial ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Contract {commercial.version ?? "version not stated"} · {formatReviewDate(commercial.lastReviewed)}
                        </p>
                      ) : null}
                    </div>

                    <div className="min-w-0 px-4 py-4">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next governed gate</p>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-foreground" title={commercial?.nextGate ?? status.primaryNextAction ?? undefined}>
                        {nextGateSummary(commercial?.nextGate ?? truth.firstGap?.nextAction ?? status.primaryNextAction)}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Owner: {commercial?.owner ?? truth.firstGap?.nextOwner ?? (project?.leadAgentId ? "Project lead / Board" : "Board")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          </section>

          <section className={COMMAND_SURFACE_CLASS} aria-labelledby="operational-pulse-title">
            <h2 id="operational-pulse-title" className="sr-only">Operational pulse</h2>
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
              <PulseMetric
                icon={Bot}
                label="Enabled agents"
                value={String(dashboard.agents.active + dashboard.agents.running + dashboard.agents.paused + dashboard.agents.error)}
                detail={`${dashboard.agents.running} running · ${dashboard.agents.paused} paused · ${dashboard.agents.error} errors`}
                to="/agents"
              />
              <PulseMetric
                icon={CircleDot}
                label="Work in progress"
                value={String(dashboard.tasks.inProgress)}
                detail={`${dashboard.tasks.open} open across the company`}
                to="/issues"
              />
              <PulseMetric
                icon={DollarSign}
                label="API spend this month"
                value={formatCents(dashboard.costs.monthSpendCents)}
                detail={dashboard.costs.monthBudgetCents > 0
                  ? `${dashboard.costs.monthUtilizationPercent}% of ${formatCents(dashboard.costs.monthBudgetCents)} budget`
                  : "No API budget limit configured"}
                to="/costs"
              />
              <PulseMetric
                icon={GitBranch}
                label="Live runs"
                value={String(status?.liveRunCount ?? 0)}
                detail="Agent executions observed now"
                to="/dashboard/live"
              />
            </div>
          </section>
        </div>

        <aside className={COMMAND_SURFACE_CLASS} aria-labelledby="owner-queue-title">
          <header className="paperclip-surface-header border-b border-border px-4 py-4">
            <h2 id="owner-queue-title" className="text-sm font-semibold">Owner queue</h2>
            <p className="mt-1 text-xs text-muted-foreground">What may need your decision now.</p>
          </header>
          <div className="divide-y divide-border">
            <QueueRow label="Pending approvals" value={String(approvals)} to="/approvals" tone={approvals > 0 ? "warn" : "good"} />
            <QueueRow label="Budget incidents" value={String(budgetIncidents)} to="/costs" tone={budgetIncidents > 0 ? "bad" : "good"} />
            <QueueRow label="Blocked issues" value={String(blocked)} to="/issues?status=blocked" tone={blocked > 0 ? "warn" : "good"} />
            <QueueRow label="Provider quota used" value={quota.value} detail={quota.description} to="/costs" tone="neutral" icon={Gauge} />
            <QueueRow
              label="Owner decision"
              value={hasUnresolvedOwnerDecision ? "Review required" : "No critical decision"}
              to="/inbox"
              tone={hasUnresolvedOwnerDecision ? "bad" : "good"}
              icon={ShieldCheck}
            />
          </div>
          <div className="border-t border-border bg-muted/15 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Control freshness</p>
              <span className={cn("text-xs font-medium", status?.stale ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                {status?.stale ? "Stale" : "Fresh"}
              </span>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <ControlFact label="Observed" value={observedLabel} icon={Clock3} />
              <ControlFact
                label="Local project work"
                value={status?.deliveryPermission.projectRepoMutationAllowed ? "Allowed" : "Held"}
                icon={ShieldCheck}
              />
              <ControlFact
                label="Protected push / deploy"
                value={status?.deliveryPermission.protectedDeliveryAllowed ? "Allowed" : "Restricted"}
                icon={ShieldCheck}
              />
            </dl>
            <Link to="/softwarehouse" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Open control cockpit <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QueueRow({
  label,
  value,
  detail,
  to,
  tone,
  icon: Icon = AlertCircle,
}: {
  label: string;
  value: string;
  detail?: string;
  to: string;
  tone: "good" | "warn" | "bad" | "neutral";
  icon?: typeof AlertCircle;
}) {
  return (
    <Link to={to} className="group flex items-start gap-3 px-4 py-3 text-inherit no-underline transition-colors hover:bg-accent/40">
      <Icon className={cn(
        "mt-0.5 h-3.5 w-3.5 shrink-0",
        tone === "good" && "text-emerald-500",
        tone === "warn" && "text-amber-500",
        tone === "bad" && "text-destructive",
        tone === "neutral" && "text-muted-foreground",
      )} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        </span>
        {detail ? <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">{detail}</span> : null}
      </span>
    </Link>
  );
}

function PulseMetric({
  icon: Icon,
  label,
  value,
  detail,
  to,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  detail: string;
  to: string;
}) {
  return (
    <Link to={to} className="group min-w-0 px-4 py-3 text-inherit no-underline transition-colors hover:bg-accent/40">
      <span className="flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--company-accent-strong)]" aria-hidden />
      </span>
      <span className="mt-1 block text-lg font-semibold tabular-nums">{value}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground" title={detail}>{detail}</span>
    </Link>
  );
}

function ControlFact({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" aria-hidden />{label}</dt>
      <dd className="shrink-0 font-medium text-foreground" title={value}>{value}</dd>
    </div>
  );
}
