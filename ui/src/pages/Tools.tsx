import { useEffect } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Braces,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyCoreApi } from "../api/companycore";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

const commandModes = [
  {
    name: "read_only",
    description: "Agents can inspect CompanyCore state and MCP metadata without external writes.",
  },
  {
    name: "draft_only",
    description: "Agents can prepare proposals and Paperclip issues, but not write to CompanyCore.",
  },
  {
    name: "approval_required",
    description: "CompanyCore writes require a Paperclip approval before execution.",
  },
  {
    name: "supervised_operator",
    description: "High-trust mode for deliberate, human-supervised operating sessions.",
  },
];

const toolGroups = [
  {
    name: "Company OS",
    capability: "company-os:read",
    description: "Operating model, roles, procedures, pipelines, risks, controls, and metrics.",
    icon: Network,
  },
  {
    name: "Knowledge",
    capability: "mcp_knowledge_reader",
    description: "Notes, decisions, Drive files, content snapshots, and evidence summaries.",
    icon: Braces,
  },
  {
    name: "Memory writes",
    capability: "mcp_memory_writer",
    description: "Governed notes, decisions, and agent logs for durable company memory.",
    icon: KeyRound,
  },
  {
    name: "Event worker",
    capability: "mcp_event_worker",
    description: "Consume CompanyCore agent events and report execution evidence.",
    icon: Activity,
  },
];

export function Tools() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const manifestQuery = useQuery({
    queryKey: queryKeys.companyCore.manifest(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.manifest(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.companyCore.health(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.health(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const manifest = manifestQuery.data;
  const health = healthQuery.data;
  const tools = manifest?.tools.length
    ? manifest.tools.map((tool) => ({
      name: tool.name,
      title: tool.title ?? tool.name,
      description: tool.description ?? `${tool.method ?? "TOOL"} ${tool.path ?? ""}`.trim(),
      capability: tool.capability ?? tool.riskLevel ?? "tool",
      icon: Wrench,
    }))
    : toolGroups.map((tool) => ({ ...tool, title: tool.name }));

  useEffect(() => {
    setBreadcrumbs([{ label: "Tools" }]);
  }, [setBreadcrumbs]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Wrench} message="Select a company to manage its tool bridge." />;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedCompany?.name ?? "Company"} tool bridge
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Tools</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A governed CompanyCore MCP surface for Paperclip agents. Google Drive, ClickUp,
              and company data should be reached through CompanyCore tools, with capabilities,
              command modes, approvals, and audit evidence managed here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/knowledge">Open Knowledge</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/agents/all">Review Agents</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryPanel
          icon={ShieldCheck}
          label="Gateway"
          value={health?.status ?? (healthQuery.isLoading ? "checking" : "CompanyCore only")}
          description={health?.error?.message ?? "Paperclip agents should not receive separate Drive or ClickUp credentials."}
        />
        <SummaryPanel
          icon={LockKeyhole}
          label="Manifest"
          value={`${manifest?.tools.length ?? 0} tools`}
          description={manifest?.schemaVersion ? `CompanyCore schema ${manifest.schemaVersion}` : "Write tools stay disabled until the bridge proves provenance and approval behavior."}
        />
        <SummaryPanel
          icon={Bot}
          label="Agent policy"
          value={manifest?.auth.capabilityScoped === false ? "broad key" : "Scoped access"}
          description="Each agent should get only the CompanyCore tools needed for its role."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Tool catalog target</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The backend will hydrate this from CompanyCore <span className="font-mono text-xs">/v1/mcp/manifest</span>.
            </p>
          </div>
          <div className="divide-y divide-border">
            {tools.map((group) => (
              <div key={group.name} className="grid gap-3 px-4 py-4 md:grid-cols-[2rem_minmax(0,1fr)_12rem] md:items-start">
                <span className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40">
                  <group.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{group.title ?? group.name}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{group.description}</p>
                </div>
                <code className="w-fit border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground md:ml-auto">
                  {group.capability}
                </code>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="border border-border p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Command modes</h2>
            </div>
            <div className="mt-3 space-y-3">
              {commandModes.map((mode) => (
                <div key={mode.name}>
                  <code className="text-xs">{mode.name}</code>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{mode.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border p-4">
            <h2 className="text-sm font-semibold">Next backend slice</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Add routes under <span className="font-mono text-xs">/api/companies/:companyId/tools/companycore</span>
              for manifest discovery, health checks, and per-agent tool access policies.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SummaryPanel({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Wrench;
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
