import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Boxes,
  BrainCircuit,
  ArrowRight,
  Clock3,
  Database,
  FileText,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { SoftwarehouseControlPanel } from "../components/SoftwarehouseControlPanel";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { softwarehouseApi, type SoftwarehouseDoc, type SoftwarehouseFileStatus } from "../api/softwarehouse";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Link } from "@/lib/router";

type Tab = "knowledge" | "tools" | "runtime" | "backlog";

export function Softwarehouse() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [tab, setTab] = useState<Tab>("knowledge");

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.softwarehouse.knowledge(selectedCompanyId ?? ""),
    queryFn: () => softwarehouseApi.knowledge(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });
  const statusQuery = useQuery({
    queryKey: queryKeys.softwarehouse.status(selectedCompanyId ?? ""),
    queryFn: () => softwarehouseApi.status(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 30_000,
  });
  const toolsQuery = useQuery({
    queryKey: queryKeys.softwarehouse.tools(selectedCompanyId ?? ""),
    queryFn: () => softwarehouseApi.tools(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });
  const backlogQuery = useQuery({
    queryKey: queryKeys.softwarehouse.backlog(selectedCompanyId ?? ""),
    queryFn: () => softwarehouseApi.backlog(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Softwarehouse" }]);
  }, [setBreadcrumbs]);

  const refreshAll = () => {
    void statusQuery.refetch();
    void knowledgeQuery.refetch();
    void toolsQuery.refetch();
    void backlogQuery.refetch();
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={BrainCircuit} message="Select a company to inspect the local Softwarehouse cockpit." />;
  }

  const knowledge = knowledgeQuery.data;
  const tools = toolsQuery.data;
  const backlog = backlogQuery.data;
  const existingGraphs = knowledge?.graphFiles.filter((file) => file.exists).length ?? 0;
  const commandCount = tools?.commandCatalog.rows.length ?? 0;
  const unknownRuntime = tools?.runtimeLedger.unknownVerifications ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="border-b border-border pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {selectedCompany?.name ?? "Company"} local control plane
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Softwarehouse</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Operations cockpit for control sources, command safety, runtime truth, and governed integration state. Product phase and sale-readiness live in Projects; Roost owns the aggregate product map.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric icon={BookOpen} label="Control docs" value={String(knowledge?.controlDocs.filter((doc) => doc.exists).length ?? 0)} />
        <Metric icon={Database} label="Graph exports" value={`${existingGraphs}/${knowledge?.graphFiles.length ?? 0}`} />
        <Metric icon={Wrench} label="Cataloged commands" value={String(commandCount)} />
        <Metric icon={ShieldCheck} label="Runtime unknowns" value={String(unknownRuntime)} tone={unknownRuntime > 0 ? "warn" : "good"} />
      </section>

      <SoftwarehouseControlPanel status={statusQuery.data} loading={statusQuery.isLoading} />

      <div className="flex flex-col gap-2 border border-[var(--company-accent-border)] bg-[var(--company-accent-subtle)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Looking for Soar or Roost lifecycle, exact build alignment, commercial boundary, or the next gate?
        </p>
        <Link to="/projects" className="inline-flex shrink-0 items-center gap-1 font-medium text-[var(--company-accent-strong)] hover:underline">
          Open project map <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Softwarehouse views">
        <TabButton active={tab === "knowledge"} onClick={() => setTab("knowledge")} icon={BookOpen} label="Control sources" />
        <TabButton active={tab === "tools"} onClick={() => setTab("tools")} icon={Wrench} label="Tools" />
        <TabButton active={tab === "runtime"} onClick={() => setTab("runtime")} icon={Database} label="Runtime" />
        <TabButton active={tab === "backlog"} onClick={() => setTab("backlog")} icon={Boxes} label="App candidates" />
      </nav>

      {tab === "knowledge" ? (
        <KnowledgeView
          loading={knowledgeQuery.isLoading}
          portfolioIndex={knowledge?.portfolioIndex}
          controlDocs={knowledge?.controlDocs ?? []}
          graphFiles={knowledge?.graphFiles ?? []}
          statusDocs={knowledge?.statusDocs ?? []}
        />
      ) : null}
      {tab === "tools" ? (
        <ToolsView loading={toolsQuery.isLoading} tools={tools} />
      ) : null}
      {tab === "runtime" ? (
        <RuntimeView
          loading={toolsQuery.isLoading || statusQuery.isLoading}
          rows={tools?.runtimeLedger.rows ?? []}
          status={statusQuery.data}
        />
      ) : null}
      {tab === "backlog" ? (
        <BacklogView loading={backlogQuery.isLoading} backlog={backlog} />
      ) : null}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "muted",
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  tone?: "muted" | "good" | "warn";
}) {
  return (
    <div className="paperclip-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-[var(--company-accent-strong)]")} />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
        active
          ? "border-[var(--company-accent)] text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function KnowledgeView({
  loading,
  portfolioIndex,
  controlDocs,
  graphFiles,
  statusDocs,
}: {
  loading: boolean;
  portfolioIndex?: SoftwarehouseDoc;
  controlDocs: SoftwarehouseDoc[];
  graphFiles: SoftwarehouseFileStatus[];
  statusDocs: SoftwarehouseDoc[];
}) {
  if (loading && !portfolioIndex) return <LoadingLine label="Loading local knowledge." />;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        {portfolioIndex ? <DocPanel title="Portfolio Truth" docs={[portfolioIndex]} /> : null}
        <DocPanel title="Control Plane Sources" docs={controlDocs} />
        <FilePanel title="Architecture Graph Exports" files={graphFiles} />
      </div>
      <aside className="min-w-0">
        <DocPanel title="Status And Evidence" docs={statusDocs} compact />
      </aside>
    </div>
  );
}

function ToolsView({ loading, tools }: { loading: boolean; tools?: Awaited<ReturnType<typeof softwarehouseApi.tools>> }) {
  const rows = tools?.commandCatalog.rows ?? [];
  const classes = Object.entries(tools?.commandCatalog.safetyClasses ?? {}).sort((a, b) => b[1] - a[1]);
  const owners = Object.entries(tools?.commandCatalog.ownerCounts ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (loading && !tools) return <LoadingLine label="Loading local command catalog." />;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="paperclip-surface min-w-0 overflow-hidden" aria-labelledby="softwarehouse-command-catalog-title">
        <div className="border-b border-border px-3 py-2">
          <h2 id="softwarehouse-command-catalog-title" className="text-sm font-semibold">Command Catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">{tools?.commandCatalog.path}</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/35 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Command</th>
                <th className="px-3 py-2 font-medium">Safety</th>
                <th className="px-3 py-2 font-medium">Approval</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={`${row.Command}-${index}`}>
                  <td className="max-w-[24rem] px-3 py-2 font-mono text-xs">{row.Command}</td>
                  <td className="px-3 py-2"><Badge>{row["Safety class"]}</Badge></td>
                  <td className="px-3 py-2 text-xs">{row["Requires approval"]}</td>
                  <td className="px-3 py-2 text-xs">{row.Owner}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.Evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="min-w-0 space-y-4">
        <CountPanel title="Safety Classes" rows={classes} />
        <CountPanel title="Top Owners" rows={owners} />
        {tools?.toolingContract ? <DocPanel title="Tooling Contract" docs={[tools.toolingContract]} compact /> : null}
      </aside>
    </div>
  );
}

function RuntimeView({
  loading,
  rows,
  status,
}: {
  loading: boolean;
  rows: Array<Record<string, string>>;
  status?: Awaited<ReturnType<typeof softwarehouseApi.status>>;
}) {
  if (loading && rows.length === 0) return <LoadingLine label="Loading runtime ledger." />;
  return (
    <div className="space-y-4">
      {status?.blockedGates.length ? (
        <section className="paperclip-surface overflow-hidden">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Protected delivery gates</h2>
            <p className="mt-1 text-xs text-muted-foreground">These gates block protected production actions, not explicitly allowed local repair lanes.</p>
          </div>
          <div className="divide-y divide-border">
            {status.blockedGates.map((gate, index) => (
              <div key={`${gate.rootBlocker ?? "gate"}-${index}`} className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[10rem_12rem_minmax(0,1fr)]">
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="mt-1 font-medium">{gate.project ?? "Unscoped"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Root blocker</p>
                  <p className="mt-1 font-medium">{gate.rootBlocker ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Required next evidence</p>
                  <p className="mt-1 text-muted-foreground">{gate.evidenceRequired ?? gate.operatorPrompt ?? "Reconfirm the gate."}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="paperclip-surface overflow-hidden">
        <div className="border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold">Runtime Config Ledger</h2>
          <p className="mt-1 text-xs text-muted-foreground">Local config, auth, secrets metadata, workspaces, and VPS/Coolify facts.</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/35 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Environment</th>
              <th className="px-3 py-2 font-medium">Config</th>
              <th className="px-3 py-2 font-medium">Secret</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Verified</th>
              <th className="px-3 py-2 font-medium">Validation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr key={`${row.Service}-${index}`}>
                <td className="px-3 py-2 text-xs font-medium">{row.Service}</td>
                <td className="px-3 py-2 text-xs">{row.Environment}</td>
                <td className="px-3 py-2 text-xs font-mono">{row["Config key"]}</td>
                <td className="px-3 py-2 text-xs">{row.Secret}</td>
                <td className="px-3 py-2 text-xs">{row.Owner}</td>
                <td className="px-3 py-2 text-xs">
                  <Badge tone={row["Last verified"] === "unknown" ? "warn" : "muted"}>{row["Last verified"]}</Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{row.Validation}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BacklogView({ loading, backlog }: { loading: boolean; backlog?: Awaited<ReturnType<typeof softwarehouseApi.backlog>> }) {
  if (loading && !backlog) return <LoadingLine label="Loading app feature backlog." />;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <DocPanel title="Backlog Sources" docs={[backlog?.featureBacklog, backlog?.unificationPlan].filter(Boolean) as SoftwarehouseDoc[]} />
        <section className="paperclip-surface">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Feature Candidates</h2>
          </div>
          <div className="divide-y divide-border">
            {(backlog?.appFeatureCandidates ?? []).map((candidate) => (
              <div key={candidate.title} className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{candidate.title}</span>
                  <Badge tone={candidate.status === "deferred" ? "warn" : "muted"}>{candidate.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{candidate.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="paperclip-surface min-w-0 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <BrainCircuit className="h-4 w-4" />
          <span className="font-semibold">Current choice</span>
        </div>
        <p className="mt-3 leading-6">
          Paperclip remains the execution and evidence control plane. Roost is the durable owner-facing product and company map. Only bounded, least-privilege projections should cross between them; source repositories remain authoritative for code, contracts, and deployment truth.
        </p>
      </aside>
    </div>
  );
}

function DocPanel({
  title,
  docs,
  compact = false,
}: {
  title: string;
  docs: SoftwarehouseDoc[];
  compact?: boolean;
}) {
  return (
    <section className="paperclip-surface min-w-0 max-w-full overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {docs.map((doc) => (
          <div key={doc.key} className={cn("min-w-0 px-3", compact ? "py-2" : "py-3")}>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-sm font-medium">{doc.title}</span>
              </div>
              <Badge tone={doc.exists ? "muted" : "warn"}>{doc.exists ? "present" : "missing"}</Badge>
            </div>
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{doc.path}</div>
            {!compact && doc.excerpt ? <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{doc.excerpt}</p> : null}
            {doc.updatedAt ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {formatDate(doc.updatedAt)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function FilePanel({ title, files }: { title: string; files: SoftwarehouseFileStatus[] }) {
  return (
    <section className="paperclip-surface min-w-0 max-w-full overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {files.map((file) => (
          <div key={file.path} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-mono text-xs">{file.path}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {file.updatedAt ? formatDate(file.updatedAt) : "No local file"}
                {file.size != null ? ` - ${formatBytes(file.size)}` : ""}
              </div>
            </div>
            <Badge tone={file.exists ? "muted" : "warn"}>{file.exists ? "present" : "missing"}</Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountPanel({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <section className="paperclip-surface overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="truncate">{label}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
      tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border bg-muted/40 text-muted-foreground",
    )}>
      {children}
    </span>
  );
}

function LoadingLine({ label }: { label: string }) {
  return <div className="paperclip-surface p-4 text-sm text-muted-foreground">{label}</div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
