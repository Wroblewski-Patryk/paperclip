import type { CompanySituation, CompanySituationSignal } from "@paperclipai/shared";
import { AlertCircle, Clock3, Compass, Info, ShieldAlert } from "lucide-react";
import { Link } from "@/lib/router";
import { cn } from "../lib/utils";
import { timeAgo } from "../lib/timeAgo";

function signalHref(signal: CompanySituationSignal): string {
  if (["assumption_contradicted", "assumption_expired", "commitment_breached", "commitment_overdue", "organizational_review_due"].includes(signal.kind)) return "/memory";
  if (["external_signal_stale", "external_signal_contradicted", "outcome_failure", "learning_ready_for_promotion"].includes(signal.kind)) return "/learning";
  if (signal.kind === "agent_error" || signal.kind === "no_available_agents") return "/agents";
  if (signal.kind === "budget_incident") return "/costs";
  if (signal.kind === "pending_approval") return "/approvals";
  if (signal.kind === "project_overdue" || signal.kind === "project_due_soon" || signal.kind === "project_target_missing") {
    const project = signal.sources.find((source) => source.entityType === "project");
    return project ? `/projects/${project.entityId}` : "/projects";
  }
  if (signal.kind === "missing_active_goal") return "/goals";
  return "/issues";
}

function SignalIcon({ signal }: { signal: CompanySituationSignal }) {
  if (signal.severity === "critical") return <ShieldAlert className="h-4 w-4 text-red-400" />;
  if (signal.severity === "warning") return <AlertCircle className="h-4 w-4 text-amber-400" />;
  return <Info className="h-4 w-4 text-sky-400" />;
}

export function CompanySituationPanel({ situation }: { situation: CompanySituation }) {
  const primaryGoal = situation.mission.activeGoals[0] ?? null;
  const visibleSignals = situation.attention
    .filter((signal) => !["budget_incident", "pending_approval", "blocked_work"].includes(signal.kind))
    .slice(0, 6);
  const projectedCompletion = situation.forecast.projectedCompletion;

  return (
    <section className="paperclip-surface overflow-hidden">
      <div className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--company-accent-soft)] text-[var(--company-accent-strong)]">
              <Compass className="h-4 w-4" />
            </span>
            Company orientation
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {primaryGoal ? primaryGoal.title : "No active goal recorded"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Observed {timeAgo(situation.generatedAt)} · UTC
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        {[
          ["Active goals", situation.mission.activeGoals.length],
          ["Active projects", situation.temporal.activeProjects],
          ["Targets set", situation.temporal.projectsWithTargets],
          ["Reviews due", situation.deliberation.dueReviews],
        ].map(([label, value]) => (
          <div key={label} className="bg-background/80 px-4 py-3">
            <div className="text-lg font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 py-4">
        {projectedCompletion ? (
          <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Historical-throughput range: <span className="font-medium text-foreground">{new Date(projectedCompletion.earliestAt).toLocaleDateString()} – {new Date(projectedCompletion.latestAt).toLocaleDateString()}</span>
            {" "}({projectedCompletion.confidence} confidence, {situation.forecast.completedSampleSize} completed samples). This is not a deadline.
          </div>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="paperclip-section-title">
            Additional signals
          </h3>
          <span className="text-xs text-muted-foreground">
            Deterministic facts · {visibleSignals.length} signal{visibleSignals.length === 1 ? "" : "s"}
          </span>
        </div>

        {visibleSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional orientation signals beyond the owner queue.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {visibleSignals.map((signal) => (
              <Link
                key={signal.id}
                to={signalHref(signal)}
                className={cn(
                  "group flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3 no-underline transition-colors",
                  signal.severity === "critical" && "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
                  signal.severity === "warning" && "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
                  signal.severity === "info" && "border-border bg-muted/20 hover:bg-muted/40",
                )}
              >
                <span className="mt-0.5 shrink-0"><SignalIcon signal={signal} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{signal.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {signal.suggestedAction}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
