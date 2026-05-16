import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Loader2,
  Network,
  Search,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyCoreApi, type CompanyCoreToolEntry } from "../api/companycore";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

type ToolFilter = "all" | "read" | "write" | "approval";

const futureToolIdeas = [
  "CompanyCore table row CRUD with schema-aware validation.",
  "Drive folder writer through CompanyCore, including folder moves and file metadata updates.",
  "ClickUp list/task updater through CompanyCore with comment and status sync.",
  "Approval request creator with evidence bundles for risky writes.",
  "Procedure and pipeline runner with stage-level audit events.",
  "Cross-agent handoff context tool for asking another department for knowledge.",
];

const fallbackTools: CompanyCoreToolEntry[] = [
  {
    name: "company_os_read",
    title: "Company OS",
    capability: "company-os:read",
    riskLevel: "read",
    description: "Operating model, roles, procedures, pipelines, risks, controls, and metrics.",
  },
  {
    name: "knowledge_read",
    title: "Knowledge",
    capability: "mcp_knowledge_reader",
    riskLevel: "read",
    description: "Notes, decisions, Drive files, content snapshots, and evidence summaries.",
  },
  {
    name: "memory_write",
    title: "Memory writes",
    capability: "mcp_memory_writer",
    riskLevel: "write",
    description: "Governed notes, decisions, and agent logs for durable company memory.",
  },
  {
    name: "event_worker",
    title: "Event worker",
    capability: "mcp_event_worker",
    riskLevel: "write",
    description: "Consume CompanyCore agent events and report execution evidence.",
  },
];

export function Tools() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ToolFilter>("all");

  const manifestQuery = useQuery({
    queryKey: queryKeys.companyCore.manifest(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.manifest(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.companyCore.health(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.health(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });
  const assignmentsQuery = useQuery({
    queryKey: queryKeys.companyCore.toolAssignments(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.toolAssignments(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });
  const applyRecommendations = useMutation({
    mutationFn: () => companyCoreApi.applyToolRecommendations(selectedCompanyId!),
    onSuccess: async (summary) => {
      queryClient.setQueryData(queryKeys.companyCore.toolAssignments(selectedCompanyId!), summary);
      await queryClient.invalidateQueries({ queryKey: queryKeys.companyCore.toolAssignments(selectedCompanyId!) });
    },
  });
  const manifest = manifestQuery.data;
  const health = healthQuery.data;
  const assignments = assignmentsQuery.data;
  const tools = manifest?.tools.length ? manifest.tools : fallbackTools;
  const assignmentByTool = useMemo(
    () => new Map((assignments?.assignments ?? []).map((assignment) => [assignment.toolName, assignment])),
    [assignments?.assignments],
  );
  const visibleTools = useMemo(
    () => filterTools(tools, query, filter),
    [filter, query, tools],
  );
  const groups = useMemo(() => groupTools(visibleTools), [visibleTools]);
  const counts = useMemo(() => ({
    read: tools.filter((tool) => toolRisk(tool) === "read").length,
    write: tools.filter((tool) => toolRisk(tool) === "write" || toolRisk(tool) === "destructive").length,
    approval: tools.filter((tool) => tool.requiresApproval).length,
  }), [tools]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Tools" }]);
  }, [setBreadcrumbs]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Wrench} message="Select a company to manage its tool bridge." />;
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[680px] flex-col gap-3">
      <header className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedCompany?.name ?? "Company"} tool bridge
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tools</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              CompanyCore MCP tools available to Paperclip agents. Drive, ClickUp, and company data stay hidden behind CompanyCore.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <StatusPill label="Gateway" value={health?.status ?? (healthQuery.isLoading ? "checking" : "CompanyCore")} />
              <StatusPill label="Catalog" value={`${formatCount(tools.length)} tools`} />
              <StatusPill label="Writes" value={`${formatCount(counts.write)} write / ${formatCount(counts.approval)} approval`} />
              <StatusPill label="Assignments" value={`${formatCount(assignments?.assignedToolCount ?? 0)} tools / ${formatCount(assignments?.agentCount ?? 0)} agents`} />
            </div>
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

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="flex min-h-0 flex-col overflow-hidden border border-border bg-background">
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools, capabilities, routes..."
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-20 text-sm outline-none"
              />
              {query.trim() && (
                <button
                  className="absolute right-2 top-1.5 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setQuery("")}
                >
                  Clear
                </button>
              )}
            </div>
            <ToolFilterBar
              filter={filter}
              counts={counts}
              total={tools.length}
              onFilterChange={setFilter}
            />
            <div className="basis-full text-xs text-muted-foreground sm:basis-auto">
              {formatCount(visibleTools.length)} visible
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {manifestQuery.isLoading && !manifest ? (
              <div className="p-4 text-sm text-muted-foreground">Loading CompanyCore tools.</div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No CompanyCore tools match this filter.</div>
            ) : (
              <ToolCatalog groups={groups} assignmentByTool={assignmentByTool} />
            )}
          </div>
        </main>

        <aside className="min-h-0 space-y-4 overflow-auto">
          <div className="border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Agent coverage</h2>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyRecommendations.mutate()}
                disabled={applyRecommendations.isPending || !assignments}
              >
                {applyRecommendations.isPending ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Applying
                  </span>
                ) : "Apply recommended"}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {(assignments?.agents ?? []).slice(0, 32).map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agents/${agent.id}/tools`}
                  className="block rounded-md border border-border px-2.5 py-2 no-underline transition hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">{agent.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatCount(agent.desiredTools.length)}/{formatCount(agent.recommendedTools.length)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {agent.departmentLabel ?? agent.role}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Guardrails</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(manifest?.guardrails.length ? manifest.guardrails : [
                "Use CompanyCore HTTP routes instead of direct provider access.",
                "Do not expose provider tokens or raw secret material.",
              ]).slice(0, 5).map((guardrail) => (
                <div key={guardrail} className="leading-5">{guardrail}</div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Next tools to create</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {futureToolIdeas.map((idea) => (
                <div key={idea} className="leading-5">{idea}</div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ToolFilterBar({
  filter,
  counts,
  total,
  onFilterChange,
}: {
  filter: ToolFilter;
  counts: { read: number; write: number; approval: number };
  total: number;
  onFilterChange: (filter: ToolFilter) => void;
}) {
  const items: Array<{ key: ToolFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: total },
    { key: "read", label: "Read", count: counts.read },
    { key: "write", label: "Write", count: counts.write },
    { key: "approval", label: "Approval", count: counts.approval },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
      {items.map((item) => (
        <button
          key={item.key}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            filter === item.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => onFilterChange(item.key)}
        >
          {item.label} <span className="opacity-70">{formatCount(item.count)}</span>
        </button>
      ))}
    </div>
  );
}

function ToolCatalog({
  groups,
  assignmentByTool,
}: {
  groups: Array<{ key: string; label: string; tools: CompanyCoreToolEntry[] }>;
  assignmentByTool: Map<string, { agentIds: string[]; agentNames: string[] }>;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.slice(0, 6).map((group) => group.key)));

  useEffect(() => {
    setOpenGroups(new Set(groups.slice(0, 6).map((group) => group.key)));
  }, [groups]);

  const toggleGroup = (key: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="divide-y divide-border">
      {groups.map((group) => {
        const open = openGroups.has(group.key);
        const writeCount = group.tools.filter((tool) => toolRisk(tool) !== "read").length;
        const approvalCount = group.tools.filter((tool) => tool.requiresApproval).length;
        return (
          <section key={group.key}>
            <button
              className="flex w-full items-center justify-between gap-3 bg-muted/25 px-3 py-2.5 text-left transition hover:bg-muted/60"
              onClick={() => toggleGroup(group.key)}
            >
              <div className="flex min-w-0 items-center gap-2">
                {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-sm font-semibold">{group.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span>{formatCount(group.tools.length)}</span>
                {writeCount > 0 && <Badge tone="warn">{formatCount(writeCount)} write</Badge>}
                {approvalCount > 0 && <Badge tone="danger">{formatCount(approvalCount)} approval</Badge>}
              </div>
            </button>
            {open && (
              <div className="divide-y divide-border">
                {group.tools.map((tool) => (
                  <ToolRow key={tool.name} tool={tool} assignedAgentNames={assignmentByTool.get(tool.name)?.agentNames ?? []} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ToolRow({ tool, assignedAgentNames }: { tool: CompanyCoreToolEntry; assignedAgentNames: string[] }) {
  const risk = toolRisk(tool);
  return (
    <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_8rem_12rem] md:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium">{tool.title ?? tool.name}</span>
          <Badge tone={risk === "read" ? "good" : risk === "destructive" ? "danger" : "warn"}>{risk}</Badge>
          {tool.requiresApproval && <Badge tone="danger">approval</Badge>}
          {assignedAgentNames.slice(0, 4).map((name) => (
            <Badge key={name} tone="muted">{name}</Badge>
          ))}
          {assignedAgentNames.length > 4 && <Badge tone="muted">+{assignedAgentNames.length - 4}</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {tool.description ?? `${tool.method ?? "TOOL"} ${tool.path ?? ""}`.trim()}
        </p>
      </div>
      <code className="w-fit rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        {tool.method ?? "TOOL"}
      </code>
      <div className="min-w-0 text-xs text-muted-foreground md:text-right">
        <div className="truncate">{tool.capability ?? "uncategorized"}</div>
        {tool.path && <div className="mt-1 truncate font-mono">{tool.path}</div>}
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </span>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "good" | "warn" | "danger" | "muted" }) {
  const className = {
    good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    muted: "border-border bg-muted/40 text-muted-foreground",
  }[tone];
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${className}`}>{children}</span>;
}

function filterTools(tools: CompanyCoreToolEntry[], query: string, filter: ToolFilter) {
  const normalized = query.trim().toLowerCase();
  return tools
    .filter((tool) => {
      if (filter === "read" && toolRisk(tool) !== "read") return false;
      if (filter === "write" && toolRisk(tool) === "read") return false;
      if (filter === "approval" && !tool.requiresApproval) return false;
      return true;
    })
    .filter((tool) => {
      if (!normalized) return true;
      return [
        tool.name,
        tool.title ?? "",
        tool.description ?? "",
        tool.method ?? "",
        tool.path ?? "",
        tool.capability ?? "",
        tool.riskLevel ?? "",
      ].some((value) => value.toLowerCase().includes(normalized));
    })
    .sort(sortTools);
}

function groupTools(tools: CompanyCoreToolEntry[]) {
  const groups = new Map<string, CompanyCoreToolEntry[]>();
  for (const tool of tools) {
    const key = toolGroupKey(tool);
    groups.set(key, [...(groups.get(key) ?? []), tool]);
  }
  return Array.from(groups.entries())
    .map(([key, groupTools]) => ({
      key,
      label: titleFromKey(key),
      tools: groupTools.sort(sortTools),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function toolGroupKey(tool: CompanyCoreToolEntry) {
  const capability = tool.capability ?? "";
  if (capability.includes(":")) return capability.split(":")[0] || "other";
  const path = tool.path ?? "";
  const [, first, second] = path.split("/");
  return second && first === "v1" ? second : first || "other";
}

function titleFromKey(key: string) {
  return key
    .replace(/^mcp_/, "mcp-")
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function toolRisk(tool: CompanyCoreToolEntry) {
  return tool.riskLevel === "destructive" ? "destructive" : tool.riskLevel === "write" ? "write" : "read";
}

function sortTools(a: CompanyCoreToolEntry, b: CompanyCoreToolEntry) {
  return toolRisk(a).localeCompare(toolRisk(b))
    || (a.capability ?? "").localeCompare(b.capability ?? "", undefined, { numeric: true, sensitivity: "base" })
    || (a.title ?? a.name).localeCompare(b.title ?? b.name, undefined, { numeric: true, sensitivity: "base" });
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}
