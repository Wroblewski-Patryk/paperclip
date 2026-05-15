import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  companyCoreApi,
  type CompanyCoreKnowledgeMap,
  type CompanyCoreKnowledgeMapNode,
  type CompanyCoreKnowledgeNodeType,
} from "../api/companycore";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

type KnowledgeView = "library" | "map";

type KnowledgeExplorerFocus =
  | { kind: "department"; departmentKey: string }
  | { kind: "group"; departmentKey: string; groupKey: string };

interface KnowledgeDepartment {
  key: string;
  label: string;
  nodes: CompanyCoreKnowledgeMapNode[];
}

interface KnowledgeGroup {
  key: string;
  label: string;
  kind: "files" | "tasks" | "tables" | "notes";
  nodes: CompanyCoreKnowledgeMapNode[];
}

const typeStyles: Record<CompanyCoreKnowledgeNodeType, { label: string; className: string; dot: string }> = {
  workspace: {
    label: "Workspace",
    className: "border-emerald-500/50 bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  domain: {
    label: "Domain",
    className: "border-sky-500/45 bg-sky-500/10",
    dot: "bg-sky-500",
  },
  area: {
    label: "Area",
    className: "border-violet-500/40 bg-violet-500/10",
    dot: "bg-violet-500",
  },
  table: {
    label: "Table",
    className: "border-amber-500/45 bg-amber-500/10",
    dot: "bg-amber-500",
  },
  record: {
    label: "Record",
    className: "border-border bg-card",
    dot: "bg-muted-foreground",
  },
  capability: {
    label: "Access",
    className: "border-rose-500/35 bg-rose-500/10",
    dot: "bg-rose-500",
  },
};

export function Knowledge() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [view, setView] = useState<KnowledgeView>("map");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const mapQuery = useQuery({
    queryKey: queryKeys.companyCore.map(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.map(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });

  const map = mapQuery.data;
  const filteredNodes = useMemo(
    () => filterNodes(map?.nodes ?? [], query),
    [map?.nodes, query],
  );
  const selectedNode = useMemo(() => {
    if (!map) return null;
    return map.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [map, selectedNodeId]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge" }]);
  }, [setBreadcrumbs]);

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to inspect its CompanyCore knowledge layer." />;
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[680px] flex-col gap-3">
      <header className="shrink-0 border-b border-border pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedCompany?.name ?? "Company"} knowledge
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Knowledge</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A searchable preview of CompanyCore knowledge available to agents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void mapQuery.refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/company/settings">CompanyCore Settings</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid shrink-0 gap-3 md:grid-cols-3">
        <Metric label="Objects" value={formatCount(totalKnowledgeObjects(map))} icon={Sparkles} />
        <Metric label="Files" value={formatCount(map?.summary.fileCount ?? 0)} icon={FolderOpen} />
        <Metric label="Tasks" value={formatCount(map?.summary.taskCount ?? 0)} icon={ClipboardList} />
      </section>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="min-h-0 overflow-hidden border border-border bg-background">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files, tasks, folders..."
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-2 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {(["map", "library"] as KnowledgeView[]).map((item) => (
                <button
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    view === item ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setView(item)}
                >
                  {item === "map" ? "Explore" : "All items"}
                </button>
              ))}
            </div>
            <div className="basis-full text-xs text-muted-foreground sm:basis-auto">
              {map?.summary.generatedAt ? `Synced preview ${formatDateTime(map.summary.generatedAt)}` : "Live CompanyCore preview"}
            </div>
          </div>

          {view === "library" && (
            <KnowledgeLibrary
              map={map}
              nodes={filteredNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={setSelectedNodeId}
              isLoading={mapQuery.isLoading}
            />
          )}
          {view === "map" && (
            <KnowledgeExplorer
              map={map}
              nodes={filteredNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={setSelectedNodeId}
              isLoading={mapQuery.isLoading}
            />
          )}
        </main>

        <Inspector node={selectedNode} map={map} />
      </div>
    </div>
  );
}

function KnowledgeExplorer({
  map,
  nodes,
  selectedNodeId,
  onSelect,
  isLoading,
}: {
  map?: CompanyCoreKnowledgeMap;
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  isLoading: boolean;
}) {
  const departments = useMemo(() => buildKnowledgeDepartments(nodes), [nodes]);
  const [focus, setFocus] = useState<KnowledgeExplorerFocus>({ kind: "department", departmentKey: "00" });
  const selectedDepartment = departments.find((department) => department.key === focus.departmentKey) ?? departments[0] ?? null;
  const groups = useMemo(
    () => selectedDepartment ? buildDepartmentGroups(selectedDepartment.nodes) : [],
    [selectedDepartment],
  );
  const selectedGroup = focus.kind === "group"
    ? groups.find((group) => group.key === focus.groupKey) ?? null
    : null;

  useEffect(() => {
    if (departments.length === 0) return;
    if (departments.some((department) => department.key === focus.departmentKey)) return;
    setFocus({ kind: "department", departmentKey: departments[0].key });
  }, [departments, focus.departmentKey]);

  useEffect(() => {
    if (focus.kind !== "group") return;
    if (groups.some((group) => group.key === focus.groupKey)) return;
    setFocus({ kind: "department", departmentKey: focus.departmentKey });
  }, [focus, groups]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading CompanyCore knowledge.</div>;
  }

  if (!map || departments.length === 0 || !selectedDepartment) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No CompanyCore knowledge departments available.</div>;
  }

  return (
    <div className="grid h-full min-h-0 bg-muted/15 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-auto border-r border-border bg-background p-3">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Departments</div>
        <div className="space-y-1">
          {departments.map((department) => (
            <button
              key={department.key}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition ${
                selectedDepartment.key === department.key ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
              onClick={() => setFocus({ kind: "department", departmentKey: department.key })}
            >
              <span className="min-w-0 truncate text-sm font-medium">{department.label}</span>
              <span className="text-xs opacity-70">{formatCount(department.nodes.length)}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-0 overflow-auto p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {focus.kind === "group" ? selectedDepartment.label : "Selected department"}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{selectedGroup?.label ?? selectedDepartment.label}</h2>
          </div>
          {focus.kind === "group" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocus({ kind: "department", departmentKey: selectedDepartment.key })}
            >
              Back to {selectedDepartment.key}
            </Button>
          )}
        </div>

        {focus.kind === "department" ? (
          <DepartmentOrbit
            department={selectedDepartment}
            groups={groups}
            onOpenGroup={(groupKey) => setFocus({ kind: "group", departmentKey: selectedDepartment.key, groupKey })}
          />
        ) : selectedGroup ? (
          <GroupChildren
            group={selectedGroup}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
          />
        ) : null}
      </section>
    </div>
  );
}

function DepartmentOrbit({
  department,
  groups,
  onOpenGroup,
}: {
  department: KnowledgeDepartment;
  groups: KnowledgeGroup[];
  onOpenGroup: (groupKey: string) => void;
}) {
  const totalFiles = groups.filter((group) => group.kind === "files").reduce((sum, group) => sum + group.nodes.length, 0);
  const totalTasks = groups.filter((group) => group.kind === "tasks").reduce((sum, group) => sum + group.nodes.length, 0);
  const totalTables = groups.filter((group) => group.kind === "tables").reduce((sum, group) => sum + group.nodes.length, 0);
  return (
    <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <section className="border border-border bg-background p-4">
        <div className="flex size-40 items-center justify-center rounded-full border border-border bg-muted/40 text-center">
          <div>
            <div className="text-3xl font-semibold">{department.key}</div>
            <div className="mt-1 px-3 text-sm text-muted-foreground">{department.label.replace(/^\d{2}\.?\s*/, "")}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Files" value={totalFiles} />
          <MiniStat label="Tasks" value={totalTasks} />
          <MiniStat label="Tables" value={totalTables} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {groups.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">
            No matching children in this department.
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.key}
              className="border border-border bg-background p-3 text-left transition hover:bg-muted/60"
              onClick={() => onOpenGroup(group.key)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <GroupIcon kind={group.kind} />
                  <span className="min-w-0 truncate text-sm font-semibold">{group.label}</span>
                </div>
                <Badge tone="muted">{formatCount(group.nodes.length)}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {group.kind === "tasks" ? "Task list" : group.kind === "files" ? "Folder" : group.kind === "tables" ? "Table group" : "Records"}
              </div>
              <div className="mt-3 space-y-1 border-t border-border pt-2">
                {group.nodes.slice(0, 3).map((node) => (
                  <div key={node.id} className="truncate text-xs text-muted-foreground">
                    {node.label}
                  </div>
                ))}
                {group.nodes.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{formatCount(group.nodes.length - 3)} more</div>
                )}
              </div>
            </button>
          ))
        )}
      </section>
    </div>
  );
}

function GroupChildren({
  group,
  selectedNodeId,
  onSelect,
}: {
  group: KnowledgeGroup;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <section className="border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <GroupIcon kind={group.kind} />
          <span className="min-w-0 truncate text-sm font-semibold">{group.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatCount(group.nodes.length)}</span>
      </div>
      <div className="max-h-[42rem] overflow-auto divide-y divide-border">
        {group.nodes.map((node) => (
          <KnowledgeRecordRow
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function GroupIcon({ kind }: { kind: KnowledgeGroup["kind"] }) {
  const Icon = kind === "tasks" ? ClipboardList : kind === "tables" ? Database : kind === "notes" ? FileText : FolderOpen;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-background p-2">
      <div className="text-sm font-semibold">{formatCount(value)}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function KnowledgeLibrary({
  map,
  nodes,
  selectedNodeId,
  onSelect,
  isLoading,
}: {
  map?: CompanyCoreKnowledgeMap;
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  isLoading: boolean;
}) {
  const records = nodes.filter((node) => node.type === "record");
  const areas = nodes.filter((node) => node.type === "area").sort(sortByLabel);
  const tables = nodes.filter((node) => node.type === "table").sort(sortByLabel);
  const files = records.filter((node) => metadataString(node, "kind") === "file").sort(sortByLabel);
  const tasks = records.filter((node) => metadataString(node, "kind") === "task").sort(sortByLabel);
  const notes = records.filter((node) => metadataString(node, "kind") === "note").sort(sortByLabel);
  const decisions = records.filter((node) => metadataString(node, "kind") === "decision").sort(sortByLabel);
  const projects = records.filter((node) => metadataString(node, "kind") === "project").sort(sortByLabel);

  if (isLoading && !map) {
    return <div className="p-4 text-sm text-muted-foreground">Loading CompanyCore knowledge preview.</div>;
  }

  return (
    <div className="h-full min-h-0 overflow-auto p-4">
      <section>
        {map?.errors.length ? (
          <div className="mb-4 border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="font-semibold">Partial CompanyCore preview</div>
            <div className="mt-1 text-muted-foreground">
              Some CompanyCore surfaces did not answer, so this catalog may be incomplete.
            </div>
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Metric label="Files" value={formatCount(files.length)} icon={FolderOpen} />
          <Metric label="Tasks" value={formatCount(tasks.length)} icon={ClipboardList} />
          <Metric label="Tables" value={formatCount(tables.length)} icon={Database} />
          <Metric label="Notes" value={formatCount(notes.length + decisions.length + projects.length)} icon={FileText} />
        </div>

        {areas.length > 0 && (
          <section className="mb-4 border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers3 className="h-4 w-4 text-muted-foreground" />
                Areas
              </div>
              <span className="text-xs text-muted-foreground">{formatCount(areas.length)}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3">
              {areas.map((area) => (
                <button
                  key={area.id}
                  className={`shrink-0 rounded-md border px-3 py-2 text-left transition ${
                    selectedNodeId === area.id ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"
                  }`}
                  onClick={() => onSelect(area.id)}
                >
                  <div className="max-w-48 truncate text-sm font-medium">{area.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {area.count !== null ? `${formatCount(area.count)} tables` : "CompanyCore area"}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-3">
          <KnowledgeSection
            title="Files"
            subtitle="Documents indexed by CompanyCore."
            icon={FolderOpen}
            nodes={files}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => fileGroup(node)}
          />
          <KnowledgeSection
            title="Tasks"
            subtitle="Grouped by CompanyCore task list."
            icon={ClipboardList}
            nodes={tasks}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => taskGroup(node)}
          />
          <KnowledgeSection
            title="Tables"
            subtitle="Structured CompanyCore data available to agents."
            icon={Database}
            nodes={tables}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => collectionGroup(node, "Operating tables")}
          />
          <KnowledgeSection
            title="Notes and projects"
            subtitle="Internal CompanyCore context records."
            icon={FileText}
            nodes={[...projects, ...notes, ...decisions]}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => metadataString(node, "kind") ?? "Records"}
          />
        </div>
      </section>
    </div>
  );
}

function KnowledgeSection({
  title,
  subtitle,
  icon: Icon,
  nodes,
  selectedNodeId,
  onSelect,
  groupBy,
}: {
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  groupBy: (node: CompanyCoreKnowledgeMapNode) => string;
}) {
  const grouped = useMemo(() => groupByCollection(nodes, groupBy), [nodes, groupBy]);
  return (
    <section className="border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
            <span className="text-xs font-normal text-muted-foreground">({formatCount(nodes.length)})</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {grouped.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">No matching CompanyCore records in this surface.</div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between gap-3 bg-muted/35 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="min-w-0 truncate">{group.label}</span>
                <span>{formatCount(group.nodes.length)}</span>
              </div>
              <div className="divide-y divide-border">
                {group.nodes.map((node) => (
                  <KnowledgeRecordRow
                    key={node.id}
                    node={node}
                    selected={selectedNodeId === node.id}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function KnowledgeRecordRow({
  node,
  selected,
  onSelect,
}: {
  node: CompanyCoreKnowledgeMapNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const path = metadataString(node, "path") ?? metadataString(node, "folderPath") ?? metadataString(node, "folderName") ?? node.subtitle;
  const listName = metadataString(node, "listName");
  const webUrl = metadataString(node, "webUrl");
  return (
    <button
      className={`block w-full px-3 py-2.5 text-left transition hover:bg-muted/60 ${
        selected ? "bg-muted" : ""
      }`}
      onClick={() => onSelect(node.id)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${typeStyles[node.type].dot}`} />
            <span className="min-w-0 truncate text-sm font-medium">{node.label}</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Source: CompanyCore</span>
            {node.syncedWith.length > 0 && <span>Synced with: {node.syncedWith.join(", ")}</span>}
            {path && <span className="max-w-full truncate">{path}</span>}
            {listName && <span>List: {listName}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {node.status && <Badge tone="muted">{node.status}</Badge>}
          {webUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
    </button>
  );
}

function Inspector({ node, map }: { node: CompanyCoreKnowledgeMapNode | null; map?: CompanyCoreKnowledgeMap }) {
  if (!node) {
    return (
      <aside className="border border-border bg-background p-4 text-sm text-muted-foreground">
        <div className="text-xs font-medium uppercase tracking-wide">Details</div>
        <div className="mt-2 text-foreground">Select a file, task, table, or note to preview its access details.</div>
        {map && (
          <div className="mt-4 border-t border-border pt-4 text-xs">
            {formatCount(map.nodes.length)} knowledge nodes refreshed from CompanyCore.
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="min-h-0 overflow-auto border border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {typeStyles[node.type].label}
        </div>
        <h2 className="mt-1 text-lg font-semibold leading-tight">{node.label}</h2>
        {node.subtitle && <p className="mt-1 text-sm text-muted-foreground">{node.subtitle}</p>}
      </div>
      <div className="space-y-4 p-4">
        <InfoBlock label="Source" value="CompanyCore" />
        <InfoBlock label="Synced with" value={node.syncedWith.join(", ") || "Internal CompanyCore data"} />
        {metadataString(node, "path") && <InfoBlock label="Path" value={metadataString(node, "path")!} />}
        {metadataString(node, "listName") && <InfoBlock label="List" value={metadataString(node, "listName")!} />}
        <InfoBlock label="Status" value={node.status ?? "available"} />
        <InfoBlock label="Updated" value={node.updatedAt ? formatDateTime(node.updatedAt) : "Not reported"} />
        {metadataString(node, "webUrl") && (
          <a
            href={metadataString(node, "webUrl")!}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open synced item
          </a>
        )}

        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent access</div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={node.agentAccess.read ? "good" : "muted"}>read</Badge>
            <Badge tone={node.agentAccess.write ? "warn" : "muted"}>write</Badge>
            {node.agentAccess.approvalRequired && <Badge tone="danger">approval required</Badge>}
          </div>
          <div className="mt-2 max-h-28 overflow-auto text-xs text-muted-foreground">
            {node.agentAccess.capabilities.length > 0
              ? node.agentAccess.capabilities.slice(0, 12).map((capability) => <div key={capability}>{capability}</div>)
              : "No explicit capability surfaced."}
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {Object.entries(node.metadata).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 16).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <span>{key}</span>
                <span className="max-w-[12rem] truncate text-foreground/80">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>

        {map && (
          <section className="border-t border-border pt-4">
            <div className="text-xs text-muted-foreground">
              Preview includes {formatCount(map.nodes.length)} nodes and {formatCount(map.edges.length)} relationships, refreshed automatically from CompanyCore.
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
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

function buildKnowledgeDepartments(nodes: CompanyCoreKnowledgeMapNode[]): KnowledgeDepartment[] {
  const labels = new Map<string, string>();
  const grouped = new Map<string, CompanyCoreKnowledgeMapNode[]>();
  for (const node of nodes) {
    const key = departmentKeyForNode(node);
    if (!key) continue;
    const label = departmentLabelForNode(node, key);
    if (!labels.has(key) || label.includes(".")) labels.set(key, label);
    grouped.set(key, [...(grouped.get(key) ?? []), node]);
  }
  return Array.from(grouped.entries())
    .map(([key, departmentNodes]) => ({
      key,
      label: canonicalDepartmentLabel(key) ?? labels.get(key) ?? `${key}. Department`,
      nodes: departmentNodes.sort(sortByLabel),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
}

function buildDepartmentGroups(nodes: CompanyCoreKnowledgeMapNode[]): KnowledgeGroup[] {
  const records = nodes.filter((node) => node.type === "record");
  const files = records.filter((node) => metadataString(node, "kind") === "file");
  const tasks = records.filter((node) => metadataString(node, "kind") === "task");
  const notes = records.filter((node) => ["note", "decision", "project"].includes(metadataString(node, "kind") ?? ""));
  const tables = nodes.filter((node) => node.type === "table");
  return [
    ...groupNodes(files, "files", fileGroup),
    ...groupNodes(tasks, "tasks", taskGroup),
    ...groupNodes(tables, "tables", (node) => node.label),
    ...groupNodes(notes, "notes", (node) => metadataString(node, "kind") ?? "Records"),
  ].sort((a, b) => {
    const order = { files: 0, tasks: 1, tables: 2, notes: 3 };
    return order[a.kind] - order[b.kind] || a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

function groupNodes(
  nodes: CompanyCoreKnowledgeMapNode[],
  kind: KnowledgeGroup["kind"],
  groupBy: (node: CompanyCoreKnowledgeMapNode) => string,
): KnowledgeGroup[] {
  return groupByCollection(nodes, groupBy).map((group) => ({
    key: `${kind}:${group.label}`,
    label: group.label,
    kind,
    nodes: group.nodes,
  }));
}

function departmentKeyForNode(node: CompanyCoreKnowledgeMapNode) {
  for (const value of departmentSearchValues(node)) {
    const match = value.match(/\b(0[0-9]|1[0-2])\s*[.\-]\s*[^/|]+/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function departmentLabelForNode(node: CompanyCoreKnowledgeMapNode, key: string) {
  const canonical = canonicalDepartmentLabel(key);
  if (canonical) return canonical;
  for (const value of departmentSearchValues(node)) {
    const match = value.match(new RegExp(`\\b(${key})\\s*[.\\-]\\s*([^/|]+)`));
    if (match?.[2]) return `${key}. ${match[2].trim().split(/\s+-\s+/)[0]}`;
  }
  return `${key}. Department`;
}

function canonicalDepartmentLabel(key: string) {
  return {
    "00": "00. Główny",
    "01": "01. Strategia",
    "02": "02. Produkt",
    "03": "03. Sprzedaż",
    "04": "04. Operacje",
    "05": "05. Relacje",
    "06": "06. Kadry",
    "07": "07. Finanse",
    "08": "08. Zasoby",
    "09": "09. Technologia",
    "10": "10. Prawo",
    "11": "11. Innowacje",
    "12": "12. Zarządzanie",
  }[key];
}

function departmentSearchValues(node: CompanyCoreKnowledgeMapNode) {
  const structuredValues = [
    metadataString(node, "path") ?? "",
    metadataString(node, "folderPath") ?? "",
    metadataString(node, "folderName") ?? "",
    metadataString(node, "listName") ?? "",
    metadataString(node, "areaName") ?? "",
    metadataString(node, "tableName") ?? "",
  ];
  if (node.type !== "record") return [node.label, node.subtitle ?? "", ...structuredValues];
  return [...structuredValues, node.subtitle ?? ""];
}

function filterNodes(nodes: CompanyCoreKnowledgeMapNode[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return nodes;
  return nodes.filter((node) =>
    [
      node.label,
      node.subtitle ?? "",
      node.status ?? "",
      node.syncedWith.join(" "),
      node.agentAccess.capabilities.join(" "),
      Object.values(node.metadata).map((value) => String(value ?? "")).join(" "),
    ].some((value) => value.toLowerCase().includes(normalized)),
  );
}

function metadataString(node: CompanyCoreKnowledgeMapNode, key: string) {
  const value = node.metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function collectionGroup(node: CompanyCoreKnowledgeMapNode, fallback: string) {
  const area = metadataString(node, "areaName");
  if (area) return area;
  const folderPath = metadataString(node, "folderPath") ?? metadataString(node, "path") ?? metadataString(node, "folderName");
  if (folderPath) return firstPathSegment(folderPath);
  const folder = metadataString(node, "folderName");
  if (folder) return folder;
  return fallback;
}

function fileGroup(node: CompanyCoreKnowledgeMapNode) {
  const folder = metadataString(node, "folderName");
  if (folder) return folder;
  const area = metadataString(node, "areaName");
  if (area) return area;
  return collectionGroup(node, "Files");
}

function taskGroup(node: CompanyCoreKnowledgeMapNode) {
  return (
    metadataString(node, "listName") ??
    metadataString(node, "spaceName") ??
    metadataString(node, "areaName") ??
    collectionGroup(node, "Tasks")
  );
}

function firstPathSegment(value: string) {
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] ?? value;
}

function sortByLabel(a: CompanyCoreKnowledgeMapNode, b: CompanyCoreKnowledgeMapNode) {
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
}

function groupByCollection(
  nodes: CompanyCoreKnowledgeMapNode[],
  groupBy: (node: CompanyCoreKnowledgeMapNode) => string,
) {
  const groups = new Map<string, CompanyCoreKnowledgeMapNode[]>();
  for (const node of nodes) {
    const label = groupBy(node) || "Other";
    groups.set(label, [...(groups.get(label) ?? []), node]);
  }
  return Array.from(groups.entries())
    .map(([label, groupNodes]) => ({ label, nodes: groupNodes.sort(sortByLabel) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function totalKnowledgeObjects(map?: CompanyCoreKnowledgeMap) {
  if (!map) return 0;
  return (
    map.summary.taskCount +
    map.summary.fileCount +
    map.summary.noteCount +
    map.summary.decisionCount +
    map.summary.projectCount +
    map.summary.tableCount
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
