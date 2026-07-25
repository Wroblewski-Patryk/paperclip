import type { SoftwarehouseControlStatusResponse } from "@paperclipai/shared";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Factory,
  ShieldAlert,
} from "lucide-react";
import { Link } from "@/lib/router";
import { cn, relativeTime } from "@/lib/utils";

function humanize(value: string | null | undefined, fallback = "Unknown") {
  return value ? value.replaceAll("_", " ") : fallback;
}

function stateTone(value: boolean | null) {
  if (value === true) return "text-emerald-600 dark:text-emerald-400";
  if (value === false) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function projectProbeTone(value: string | null) {
  if (value === "pass") return "text-emerald-600 dark:text-emerald-400";
  if (value === "failed") return "text-destructive";
  return "text-muted-foreground";
}

export function SoftwarehouseControlPanel({
  status,
  loading = false,
  compact = false,
}: {
  status?: SoftwarehouseControlStatusResponse | null;
  loading?: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/20" aria-label="Loading Softwarehouse control status" />;
  }

  if (!status?.available) {
    return (
      <section className="paperclip-surface p-4" aria-labelledby="softwarehouse-control-title">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="softwarehouse-control-title" className="text-sm font-semibold">Softwarehouse control snapshot unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The owner cockpit cannot confirm whether autonomous work is runnable. Existing safety gates remain authoritative.
            </p>
          </div>
          <Link to="/softwarehouse" className="shrink-0 text-xs font-medium text-primary hover:underline">Inspect</Link>
        </div>
      </section>
    );
  }

  const nextAction = status.primaryNextAction ?? status.recommendedAction ?? "Review the current control snapshot.";
  const observedLabel = status.observedAt ? relativeTime(status.observedAt) : "unknown";
  const blockedGateCount = status.blockedGates.length;

  return (
    <section className="paperclip-surface overflow-hidden" aria-labelledby="softwarehouse-control-title">
      <div className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--company-accent-border)] bg-[var(--company-accent-soft)]">
            <Factory className="h-4 w-4 text-[var(--company-accent-strong)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="softwarehouse-control-title" className="text-sm font-semibold">Softwarehouse control</h2>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                status.stale
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
              )}>
                {status.stale ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {status.stale ? "Stale snapshot" : "Fresh snapshot"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{status.headline ?? humanize(status.controlDecision)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>Updated {observedLabel}</span>
          <Link to="/softwarehouse" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Open cockpit <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        <ControlMetric label="Decision" value={humanize(status.controlDecision)} icon={Activity} multiline />
        <ControlMetric
          label="Active / live runs"
          value={`${status.activeRunCount ?? 0} / ${status.liveRunCount ?? 0}`}
          icon={Activity}
        />
        <ControlMetric
          label="New lane"
          value={status.deliveryPermission.canStartNewLane ? "Allowed" : "Held"}
          icon={status.deliveryPermission.canStartNewLane ? CheckCircle2 : ShieldAlert}
          valueClassName={stateTone(status.deliveryPermission.canStartNewLane)}
        />
        <ControlMetric
          label="Local delivery posture"
          value={status.fullDeliveryReady ? "Runnable" : "Gated"}
          icon={status.fullDeliveryReady ? CheckCircle2 : ShieldAlert}
          valueClassName={stateTone(status.fullDeliveryReady)}
        />
      </div>

      <div className={cn("grid", compact ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,1fr)]")}>
        <div className="border-b border-border px-4 py-4 lg:border-b-0 lg:border-r">
          <p className="text-xs font-medium uppercase text-muted-foreground">Next executable action</p>
          <p className="mt-2 text-sm leading-6 text-foreground">{nextAction}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link to="/issues" className="font-medium text-primary hover:underline">Open issues</Link>
            <span>{blockedGateCount} protected gate{blockedGateCount === 1 ? "" : "s"}</span>
            <span>{status.projectTruth.totalGaps} indexed project gap{status.projectTruth.totalGaps === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {status.projectTruth.projects.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No project-truth summary in the latest snapshot.</p>
          ) : status.projectTruth.projects.map((project) => (
            <div key={project.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{project.name}</span>
                <span className={cn("text-xs font-medium", projectProbeTone(project.publicProbeStatus))}>
                  Public runtime {humanize(project.publicProbeStatus, "unknown")}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                Technical map: {project.totalGaps} known indexed gap{project.totalGaps === 1 ? "" : "s"}
                {project.firstGap?.summary ? ` · ${project.firstGap.summary}` : ""}. This is not a sale-readiness verdict.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ControlMetric({
  label,
  value,
  icon: Icon,
  valueClassName,
  multiline = false,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  valueClassName?: string;
  multiline?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-3 last:border-r-0 sm:px-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-sm font-semibold capitalize",
          multiline ? "line-clamp-2 sm:truncate" : "truncate",
          valueClassName,
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
