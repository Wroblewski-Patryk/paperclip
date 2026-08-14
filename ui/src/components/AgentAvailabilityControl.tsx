import { LoaderCircle, Power } from "lucide-react";
import type { AgentAvailability } from "@paperclipai/shared";
import { cn } from "../lib/utils";

interface AgentAvailabilityControlProps {
  availability?: AgentAvailability;
  loading?: boolean;
  pending?: boolean;
  error?: string | null;
  onChange: (enabled: boolean) => void;
}

function formatChangedAt(value: string | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AgentAvailabilityControl({
  availability,
  loading = false,
  pending = false,
  error = null,
  onChange,
}: AgentAvailabilityControlProps) {
  const state = availability?.state ?? "off";
  const isOn = state === "on" || state === "reopening";
  const isTransitioning = state === "draining" || state === "reopening" || pending;
  const stateLabel = state === "on"
    ? "ON"
    : state === "off"
      ? "OFF"
      : state === "draining"
        ? "DRAINING"
        : "REOPENING";
  const description = state === "on"
    ? "New agent runs may start."
    : state === "draining"
      ? `Finishing ${availability?.activeRunCount ?? 0} active run(s); new work is deferred.`
      : state === "reopening"
        ? "Validating and replaying eligible deferred work."
        : "No new agent runs will start, including after a Paperclip or Windows restart.";
  const actor = availability?.changedBy.actorId
    ? `${availability.changedBy.actorType ?? "actor"}: ${availability.changedBy.actorId}`
    : availability?.changedBy.actorType ?? "system";

  return (
    <section className="paperclip-surface px-4 py-4 sm:px-5" aria-labelledby="agent-availability-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            state === "on" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            state === "draining" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            state === "off" && "bg-muted text-muted-foreground",
            state === "reopening" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
          )}>
            {isTransitioning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="agent-availability-title" className="paperclip-section-title">Agent availability</h2>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                state === "on" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                state === "draining" && "border-amber-500/30 text-amber-700 dark:text-amber-300",
                state === "off" && "border-border text-muted-foreground",
                state === "reopening" && "border-sky-500/30 text-sky-700 dark:text-sky-300",
              )}>{loading ? "LOADING" : stateLabel}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {availability && (
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                {availability.deferredWorkCount} deferred · changed {formatChangedAt(availability.changedAt)} by {actor}
              </p>
            )}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Allow agents to start new work"
          disabled={loading || pending || !availability}
          onClick={() => onChange(!isOn)}
          className={cn(
            "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOn
              ? "border-emerald-500/40 bg-emerald-500"
              : "border-border bg-muted",
          )}
        >
          <span className={cn(
            "inline-block h-6 w-6 rounded-full bg-background shadow-sm transition-transform",
            isOn ? "translate-x-7" : "translate-x-1",
          )} />
        </button>
      </div>
    </section>
  );
}
