import type {
  Issue,
  Project,
  SoftwarehouseControlStatusResponse,
} from "@paperclipai/shared";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FolderGit2,
  ShieldAlert,
} from "lucide-react";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

const OPEN_STATUSES = new Set<Issue["status"]>(["backlog", "todo", "in_progress", "in_review", "blocked"]);

export function summarizeProjectDelivery(issues: Issue[]) {
  const done = issues.filter((issue) => issue.status === "done");
  const doneWithEvidence = done.filter((issue) => Boolean(issue.completionEvidence));
  return {
    open: issues.filter((issue) => OPEN_STATUSES.has(issue.status)).length,
    blocked: issues.filter((issue) => issue.status === "blocked").length,
    inReview: issues.filter((issue) => issue.status === "in_review").length,
    done: done.length,
    doneWithEvidence: doneWithEvidence.length,
    evidenceCoverage: done.length === 0 ? null : Math.round((doneWithEvidence.length / done.length) * 100),
    releaseCritical: issues
      .filter((issue) => OPEN_STATUSES.has(issue.status) && (issue.priority === "critical" || issue.priority === "high"))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === "critical" ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 5),
  };
}

function normalizeProjectName(value: string) {
  return value.trim().toLowerCase();
}

export function ProjectDeliveryOverview({
  project,
  issues,
  controlStatus,
  loading = false,
}: {
  project: Project;
  issues: Issue[];
  controlStatus?: SoftwarehouseControlStatusResponse | null;
  loading?: boolean;
}) {
  const summary = summarizeProjectDelivery(issues);
  const truth = controlStatus?.projectTruth.projects.find((candidate) => {
    const projectName = normalizeProjectName(project.name);
    const candidateName = normalizeProjectName(candidate.name);
    return projectName === candidateName || projectName.includes(candidateName) || candidateName.includes(projectName);
  });
  const commercial = truth?.portfolio?.commercialReadiness;
  const portfolio = truth?.portfolio;
  const primaryWorkspace = project.primaryWorkspace ?? project.workspaces.find((workspace) => workspace.isPrimary) ?? null;
  const repoRef = project.codebase.repoRef ?? project.codebase.defaultRef ?? primaryWorkspace?.repoRef ?? primaryWorkspace?.defaultRef;
  const repoUrl = project.codebase.repoUrl ?? primaryWorkspace?.repoUrl;
  const localFolder = project.codebase.effectiveLocalFolder ?? project.codebase.localFolder ?? primaryWorkspace?.cwd;

  if (loading) {
    return <div className="h-56 animate-pulse rounded-lg border border-border bg-muted/20" aria-label="Loading project delivery overview" />;
  }

  return (
    <section className="paperclip-surface overflow-hidden" aria-labelledby="project-delivery-title">
      <div className="paperclip-surface-header flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="project-delivery-title" className="text-sm font-semibold">Delivery overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Technical delivery evidence and commercial readiness are separate decisions.</p>
        </div>
        <Link to={`/projects/${project.urlKey}/issues`} className="text-xs font-medium text-primary hover:underline">
          Open project issues
        </Link>
      </div>

      <div className="grid grid-cols-2 border-b border-border md:grid-cols-5">
        <DeliveryMetric label="Public runtime" value={truth?.publicProbeStatus === "pass" ? "Responding" : truth?.publicProbeStatus ?? "unknown"} tone={truth?.publicProbeStatus === "pass" ? "good" : truth?.publicProbeStatus === "failed" ? "bad" : "muted"} />
        <DeliveryMetric
          label="Sale-readiness"
          value={commercial?.status?.toLowerCase() === "conditional_guided_sale_ready" ? "Guided pilot only" : commercial?.status ?? "No contract"}
          tone={commercial?.status?.toLowerCase() === "go"
            ? "good"
            : commercial?.status?.toLowerCase().includes("no-go") || commercial?.status?.toLowerCase().includes("no_go")
              ? "bad"
              : commercial?.status ? "warn" : "muted"}
        />
        <DeliveryMetric label="Open work" value={String(summary.open)} tone={summary.open > 0 ? "warn" : "good"} />
        <DeliveryMetric label="Blocked" value={String(summary.blocked)} tone={summary.blocked > 0 ? "bad" : "good"} />
        <DeliveryMetric label="Evidence coverage" value={summary.evidenceCoverage === null ? "No done work" : `${summary.evidenceCoverage}%`} tone={summary.evidenceCoverage !== null && summary.evidenceCoverage >= 90 ? "good" : "warn"} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="border-b border-border px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="text-xs font-medium uppercase text-muted-foreground">Source and workspace</h3>
          </div>
          <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            <SourceFact label="Primary workspace" value={primaryWorkspace?.name ?? "Not configured"} />
            <SourceFact label="Repository ref" value={repoRef ?? "Not recorded"} mono />
            <SourceFact label="Repository" value={repoUrl ?? project.codebase.repoName ?? "Not recorded"} />
            <SourceFact label="Local folder" value={localFolder ?? "Not recorded"} mono />
            <SourceFact label={`Local ${portfolio?.sourceControl.branch ?? "source"} SHA`} value={portfolio?.sourceControl.headSha ?? "Not observed"} mono />
            <SourceFact label="Deployed SHA" value={portfolio?.deployment.deployedSha ?? "Not observed"} mono />
          </dl>

          {portfolio ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Lifecycle and owner map</p>
              <p className="mt-1 text-sm font-medium capitalize">
                {portfolio.lifecycleStage.replaceAll("_", " ")} → Product → Service
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Source and deployed versions are {portfolio.versionAlignment === "aligned" ? "aligned." : portfolio.versionAlignment === "different" ? "different and must remain visible separately." : "not comparable yet."}
                {" "}Roost map: {portfolio.ownerSurface?.publicationStatus === "live" ? "published" : portfolio.ownerSurface?.publicationStatus === "source_only" ? "source ready, UI not published" : "unavailable"}.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {portfolio.ownerSurface?.publicUrl ? (
                  <a href={portfolio.ownerSurface.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    Open owner surface <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null}
                {portfolio.deployment.productUrl ? (
                  <a href={portfolio.deployment.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    Open deployed app <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {commercial ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Commercial contract</p>
              <p className="mt-1 text-sm font-medium">{commercial.status?.replaceAll("_", " ") ?? "Status not recorded"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {commercial.decision ?? "No decision summary recorded."}
              </p>
              <p className="mt-2 break-all text-[11px] text-muted-foreground">
                {commercial.version ?? "Version not stated"} · {commercial.lastReviewed ?? "Review date not stated"} · {commercial.sourcePath}
              </p>
            </div>
          ) : null}

          {truth?.firstGap ? (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">First routed gap · {truth.totalGaps} total</p>
                  <p className="mt-1 break-words text-sm leading-6">{truth.firstGap.summary ?? "Project truth requires review."}</p>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    Owner: {truth.firstGap.nextOwner ?? "Unassigned"}
                    {truth.firstGap.nextAction ? ` · Next: ${truth.firstGap.nextAction}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">Release-critical open work</h3>
          </div>
          {summary.releaseCritical.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              No critical or high-priority open issues.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.releaseCritical.map((issue) => (
                <Link key={issue.id} to={`/issues/${issue.identifier ?? issue.id}`} className="block px-4 py-3 transition-colors hover:bg-accent/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">{issue.identifier ?? issue.id.slice(0, 8)}</span>
                    <span className={cn("text-[11px] font-medium capitalize", issue.priority === "critical" ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>{issue.priority}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{issue.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DeliveryMetric({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" | "muted" }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "bad" ? ShieldAlert : CircleDot;
  return (
    <div className="min-w-0 border-r border-border px-3 py-3 last:border-r-0 sm:px-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" aria-hidden />{label}</div>
      <p className={cn(
        "mt-1 truncate text-sm font-semibold capitalize",
        tone === "good" && "text-emerald-600 dark:text-emerald-400",
        tone === "warn" && "text-amber-600 dark:text-amber-400",
        tone === "bad" && "text-destructive",
      )} title={value}>{value}</p>
    </div>
  );
}

function SourceFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 truncate", mono && "font-mono text-xs")} title={value}>{value}</dd>
    </div>
  );
}
