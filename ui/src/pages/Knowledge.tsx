import { useEffect } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  Database,
  FileSearch,
  GitBranch,
  Layers3,
  ListChecks,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyCoreApi } from "../api/companycore";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

const knowledgeTabs = [
  {
    name: "Overview",
    description: "Connection health, CompanyCore workspace, audit status, and open data gaps.",
    icon: Database,
  },
  {
    name: "Tables",
    description: "Agent-readable operating areas, folders, and tables exposed by CompanyCore.",
    icon: Layers3,
  },
  {
    name: "Drive",
    description: "Drive files, snapshots, and summaries as imported and classified by CompanyCore.",
    icon: FileSearch,
  },
  {
    name: "Plans",
    description: "Business plan reviews, proposed patches, semantic document links, and missing evidence.",
    icon: BookOpen,
  },
  {
    name: "Pipelines",
    description: "Pipeline proposals inferred from business plan, Drive evidence, and CompanyCore records.",
    icon: GitBranch,
  },
  {
    name: "Readiness",
    description: "Findings that can become Paperclip issues for humans or agents.",
    icon: ListChecks,
  },
];

const rolloutSlices = [
  "Connect one Paperclip company to one CompanyCore workspace with a scoped service key.",
  "Read CompanyCore operating model, Drive inventory, and MCP manifest through Paperclip server routes.",
  "Run a read-only readiness audit and persist findings with provenance.",
  "Review the canonical business plan and create proposed updates before writing anywhere external.",
  "Convert approved gaps into Paperclip issues and approved pipelines into CompanyCore records.",
];

export function Knowledge() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const overviewQuery = useQuery({
    queryKey: queryKeys.companyCore.overview(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.overview(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const overview = overviewQuery.data;
  const connection = overview?.connection;

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge" }]);
  }, [setBreadcrumbs]);

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to inspect its knowledge layer." />;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedCompany?.name ?? "Company"} knowledge
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Knowledge</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A governed workspace for business plans, CompanyCore tables, Drive-derived evidence,
              audit findings, and pipeline proposals. Paperclip should read Drive and ClickUp only
              through CompanyCore, then turn missing context into issues, approvals, and agent work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/tools">Inspect Tools</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/issues">Open Issues</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatusPanel
          icon={ShieldCheck}
          label="CompanyCore"
          value={connection?.status ?? (overviewQuery.isLoading ? "checking" : "not connected")}
          description={
            connection?.error?.message ??
            (connection?.workspace.name
              ? `Connected to ${connection.workspace.name}.`
              : "External company data should enter Paperclip through CompanyCore APIs and MCP tools.")
          }
        />
        <StatusPanel
          icon={RefreshCw}
          label="Operating model"
          value={`${connection?.operatingModel.tableCount ?? 0} tables`}
          description={`${connection?.operatingModel.areaCount ?? 0} areas discovered through CompanyCore.`}
        />
        <StatusPanel
          icon={ClipboardList}
          label="Tool surface"
          value={`${overview?.toolCount ?? 0} tools`}
          description={`${overview?.approvalToolCount ?? 0} tools currently advertise approval requirements.`}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Planned workspace</h2>
            <p className="text-sm text-muted-foreground">
              These surfaces are the implementation target for the CompanyCore-backed knowledge layer.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeTabs.map((tab) => (
            <div key={tab.name} className="border border-border p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted/40">
                  <tab.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{tab.name}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{tab.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Implementation path</h2>
          </div>
          <div className="divide-y divide-border">
            {rolloutSlices.map((slice, index) => (
              <div key={slice} className="flex gap-3 px-4 py-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-border text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="leading-5">{slice}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="border border-border p-4">
          <h2 className="text-sm font-semibold">Next backend slice</h2>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Add company-scoped routes under <span className="font-mono text-xs">/api/companies/:companyId/knowledge</span>
            that proxy CompanyCore connection, operating model, Drive inventory, audit runs, and findings.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/activity">Review Activity</Link>
          </Button>
        </aside>
      </section>
    </div>
  );
}

function StatusPanel({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold">{value}</div>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
