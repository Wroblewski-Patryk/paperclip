import type {
  Project,
  SoftwarehouseControlStatusResponse,
  SoftwarehouseProjectTruthStatus,
} from "@paperclipai/shared";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  GitCommitHorizontal,
  Map,
} from "lucide-react";
import { Link } from "@/lib/router";
import { cn, relativeTime } from "@/lib/utils";

function normalizeProjectName(value: string) {
  return value
    .toLowerCase()
    .replace(/^\d+\s+innovation:\s*/, "")
    .trim();
}

function projectForTruth(projects: Project[], truth: SoftwarehouseProjectTruthStatus) {
  const normalizedTruth = normalizeProjectName(truth.name);
  return projects.find((project) => normalizeProjectName(project.name) === normalizedTruth);
}

function readinessLabel(status: string | null | undefined) {
  const normalized = status?.toLowerCase();
  if (normalized === "conditional_guided_sale_ready") return "Guided pilot only";
  if (normalized === "no-go" || normalized === "no_go") return "NO-GO";
  if (normalized === "go" || normalized === "sale_ready") return "Sale ready";
  return status?.replaceAll("_", " ") ?? "No contract";
}

function readinessTone(status: string | null | undefined) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "go" || normalized === "sale_ready") return "good";
  if (normalized.includes("no-go") || normalized.includes("no_go")) return "bad";
  return "warn";
}

function shortSha(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "unknown";
}

export function ProjectPortfolioMap({
  projects,
  status,
  loading = false,
}: {
  projects: Project[];
  status?: SoftwarehouseControlStatusResponse | null;
  loading?: boolean;
}) {
  const truths = status?.projectTruth.projects.filter((truth) => truth.portfolio) ?? [];

  return (
    <section className="paperclip-surface overflow-hidden" aria-labelledby="portfolio-map-title">
      <header className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--company-accent-border)] bg-[var(--company-accent-soft)] text-[var(--company-accent-strong)]">
            <Map className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 id="portfolio-map-title" className="text-sm font-semibold">Innovation product map</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Roost is the owner-facing aggregate. Paperclip shows live execution and evidence without turning a healthy runtime into a sale-readiness claim.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground" aria-label="Product lifecycle">
          <span className="rounded-full border border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] px-2 py-0.5 font-medium text-[var(--company-accent-strong)]">Innovation</span>
          <ArrowRight className="h-3 w-3" aria-hidden />
          <span>Product</span>
          <ArrowRight className="h-3 w-3" aria-hidden />
          <span>Service</span>
        </div>
      </header>

      {loading ? (
        <div className="h-44 animate-pulse bg-muted/20" aria-label="Loading innovation product map" />
      ) : !status?.available || truths.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No current project-truth projection is available. Readiness cannot be inferred.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {truths.map((truth) => {
            const portfolio = truth.portfolio!;
            const project = projectForTruth(projects, truth);
            const commercial = portfolio.commercialReadiness;
            const deployment = portfolio.deployment;
            const source = portfolio.sourceControl;
            const ownerSurface = portfolio.ownerSurface;
            const alignmentTone = portfolio.versionAlignment === "aligned"
              ? "good"
              : portfolio.versionAlignment === "different" ? "warn" : "muted";

            return (
              <article key={truth.name} className="grid min-w-0 xl:grid-cols-[minmax(10rem,0.8fr)_minmax(13rem,1fr)_minmax(13rem,1fr)_minmax(15rem,1.2fr)]">
                <div className="min-w-0 border-b border-border px-4 py-4 xl:border-b-0 xl:border-r">
                  {project ? (
                    <Link to={`/projects/${project.urlKey}/overview`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                      {truth.name}
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold">{truth.name}</p>
                  )}
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {portfolio.lifecycleStage.replaceAll("_", " ")} · {portfolio.offeringType.replaceAll("_", " ")}
                  </p>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Runtime {truth.publicProbeStatus === "pass" ? "responds" : truth.publicProbeStatus ?? "unknown"} · {truth.totalGaps} indexed gaps
                  </p>
                </div>

                <div className="min-w-0 border-b border-border px-4 py-4 xl:border-b-0 xl:border-r">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Use boundary</p>
                  <StatusLine
                    label={readinessLabel(commercial?.status)}
                    tone={readinessTone(commercial?.status)}
                  />
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground" title={commercial?.decision ?? undefined}>
                    {commercial?.decision ?? "No commercial decision recorded."}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {commercial?.version ?? "Version unstated"} · {commercial?.lastReviewed ?? "Review date unstated"}
                  </p>
                </div>

                <div className="min-w-0 border-b border-border px-4 py-4 xl:border-b-0 xl:border-r">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Source vs deployment</p>
                  <StatusLine
                    label={portfolio.versionAlignment === "aligned" ? "Exact build aligned" : portfolio.versionAlignment === "different" ? "Different builds" : "Alignment unknown"}
                    tone={alignmentTone}
                  />
                  <dl className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                    <VersionFact label={`Local ${source.branch ?? "source"}`} sha={source.headSha} />
                    <VersionFact label="Production" sha={deployment.deployedSha} />
                  </dl>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Checked {relativeTime(deployment.observedAt)}
                  </p>
                </div>

                <div className="min-w-0 px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Owner map and next gate</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{ownerSurface?.system ?? "Roost"}</span>
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      ownerSurface?.publicationStatus === "live"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}>
                      {ownerSurface?.publicationStatus === "live" ? "live map" : ownerSurface?.publicationStatus === "source_only" ? "source ready, UI not published" : "map unavailable"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {commercial?.nextGate ?? truth.firstGap?.nextAction ?? status.primaryNextAction ?? "No next gate recorded."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {ownerSurface?.publicUrl ? (
                      <a href={ownerSurface.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        Open Roost <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                    {deployment.productUrl ? (
                      <a href={deployment.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        Open app <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusLine({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "muted" }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "bad" ? AlertTriangle : CircleDot;
  return (
    <p className={cn(
      "mt-2 flex items-center gap-1.5 text-sm font-semibold capitalize",
      tone === "good" && "text-emerald-600 dark:text-emerald-400",
      tone === "warn" && "text-amber-600 dark:text-amber-400",
      tone === "bad" && "text-destructive",
      tone === "muted" && "text-muted-foreground",
    )}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </p>
  );
}

function VersionFact({ label, sha }: { label: string; sha: string | null }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5"><GitCommitHorizontal className="h-3 w-3" aria-hidden />{label}</dt>
      <dd className="truncate font-mono text-foreground" title={sha ?? "unknown"}>{shortSha(sha)}</dd>
    </div>
  );
}
