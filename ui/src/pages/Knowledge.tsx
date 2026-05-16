import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  ExternalLink,
  File,
  FileText,
  FolderOpen,
  RefreshCw,
  Search,
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

type KnowledgeLibraryTab = "files" | "tasks" | "tables" | "notes";
type KnowledgeResourceFilter = "all" | "folders" | "task_lists" | "tables" | "notes";

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

const resourceFilterOptions: Array<{
  key: KnowledgeResourceFilter;
  label: string;
  resultLabel: string;
}> = [
  { key: "all", label: "All", resultLabel: "objects" },
  { key: "folders", label: "Folders", resultLabel: "files" },
  { key: "task_lists", label: "Task lists", resultLabel: "tasks" },
  { key: "tables", label: "Tables", resultLabel: "tables" },
  { key: "notes", label: "Notes", resultLabel: "records" },
];

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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState<KnowledgeResourceFilter>("all");

  const mapQuery = useQuery({
    queryKey: queryKeys.companyCore.map(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.map(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 60_000,
  });

  const map = mapQuery.data;
  const filteredNodes = useMemo(
    () => filterNodesByResource(filterNodes(map?.nodes ?? [], query), resourceFilter),
    [map?.nodes, query, resourceFilter],
  );
  const isSearching = query.trim().length > 0;
  const selectedResourceFilter = resourceFilterOptions.find((option) => option.key === resourceFilter) ?? resourceFilterOptions[0];
  const isResourceFiltering = resourceFilter !== "all";
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

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="flex min-h-0 flex-col overflow-hidden border border-border bg-background">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files, tasks, folders..."
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-20 text-sm outline-none"
              />
              {isSearching && (
                <button
                  className="absolute right-2 top-1.5 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setQuery("")}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
              {resourceFilterOptions.map((item) => (
                <button
                  key={item.key}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    resourceFilter === item.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setResourceFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="basis-full text-xs text-muted-foreground sm:basis-auto">
              {isSearching || isResourceFiltering
                ? `${formatCount(filteredNodes.length)} matching ${selectedResourceFilter.resultLabel}`
                : map?.summary.generatedAt
                  ? `Synced preview ${formatDateTime(map.summary.generatedAt)}`
                  : "Live CompanyCore preview"}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <KnowledgeExplorer
              map={map}
              nodes={filteredNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={setSelectedNodeId}
              isLoading={mapQuery.isLoading}
              searchQuery={query}
              resourceFilterLabel={isResourceFiltering ? selectedResourceFilter.label : null}
            />
          </div>
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
  searchQuery,
  resourceFilterLabel,
}: {
  map?: CompanyCoreKnowledgeMap;
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  isLoading: boolean;
  searchQuery: string;
  resourceFilterLabel: string | null;
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
    <div className="grid h-full min-h-0 max-h-full overflow-hidden bg-muted/15 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-background p-3">
        <div className="mb-3 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Departments</div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-4 pr-1">
          {departments.map((department) => (
            <button
              key={department.key}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left transition ${
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
        {(searchQuery.trim() || resourceFilterLabel) && (
          <div className="mb-3 border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {searchQuery.trim()
              ? `Filtering departments and children by "${searchQuery.trim()}".`
              : "Filtering departments and children."}
            {resourceFilterLabel ? ` Showing ${resourceFilterLabel.toLowerCase()} resources.` : " Clear search to return to the full knowledge map."}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {focus.kind === "group" ? selectedDepartment.label : "Selected department"}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{selectedGroup?.label ?? selectedDepartment.label}</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone="muted">Agent: {agentLabelForDepartment(selectedDepartment.key)}</Badge>
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
        </div>

        {focus.kind === "department" ? (
          <DepartmentOrbit
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
  groups,
  onOpenGroup,
}: {
  groups: KnowledgeGroup[];
  onOpenGroup: (groupKey: string) => void;
}) {
  return (
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="muted">CompanyCore</Badge>
              {syncedWithForNodes(group.nodes).map((provider) => (
                <Badge key={provider} tone="muted">{provider}</Badge>
              ))}
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
  if (group.kind === "files") {
    return (
      <FileHierarchy
        nodes={group.nodes}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
      />
    );
  }

  if (group.kind === "tasks") {
    return (
      <TaskLists
        nodes={group.nodes}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
      />
    );
  }

  if (group.kind === "tables") {
    return (
      <TableCatalog
        nodes={group.nodes}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
      />
    );
  }

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
  const [activeTab, setActiveTab] = useState<KnowledgeLibraryTab>("files");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const records = nodes.filter((node) => node.type === "record");
  const tables = nodes.filter((node) => node.type === "table").sort(sortByLabel);
  const files = records.filter((node) => metadataString(node, "kind") === "file").sort(sortByLabel);
  const tasks = records.filter((node) => metadataString(node, "kind") === "task").sort(sortByLabel);
  const notes = records.filter((node) => metadataString(node, "kind") === "note").sort(sortByLabel);
  const decisions = records.filter((node) => metadataString(node, "kind") === "decision").sort(sortByLabel);
  const projects = records.filter((node) => metadataString(node, "kind") === "project").sort(sortByLabel);
  const noteRecords = [...projects, ...notes, ...decisions].sort(sortByLabel);
  const tabNodes: Record<KnowledgeLibraryTab, CompanyCoreKnowledgeMapNode[]> = {
    files,
    tasks,
    tables,
    notes: noteRecords,
  };
  const activeNodes = tabNodes[activeTab];
  const filteredActiveNodes = departmentFilter === "all"
    ? activeNodes
    : activeNodes.filter((node) => departmentKeyForNode(node) === departmentFilter);
  const departments = useMemo(() => buildKnowledgeDepartments(activeNodes), [activeNodes]);
  const tabs: Array<{ key: KnowledgeLibraryTab; label: string; icon: typeof BookOpen; count: number }> = [
    { key: "files", label: "Files", icon: FolderOpen, count: files.length },
    { key: "tasks", label: "Tasks", icon: ClipboardList, count: tasks.length },
    { key: "tables", label: "Tables", icon: Database, count: tables.length },
    { key: "notes", label: "Notes", icon: FileText, count: noteRecords.length },
  ];

  if (isLoading && !map) {
    return <div className="p-4 text-sm text-muted-foreground">Loading CompanyCore knowledge preview.</div>;
  }

  return (
    <div className="h-full min-h-0 overflow-auto p-4">
      <section className="space-y-4">
        {map?.errors.length ? (
          <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="font-semibold">Partial CompanyCore preview</div>
            <div className="mt-1 text-muted-foreground">
              Some CompanyCore surfaces did not answer, so this catalog may be incomplete.
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`border p-3 text-left transition ${
                  selected ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted/60"
                }`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setDepartmentFilter("all");
                }}
              >
                <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${selected ? "text-background/75" : "text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </div>
                <div className="mt-2 truncate text-lg font-semibold">{formatCount(tab.count)}</div>
              </button>
            );
          })}
        </div>

        <DepartmentFilter
          departments={departments}
          activeNodes={activeNodes}
          selectedKey={departmentFilter}
          onSelect={setDepartmentFilter}
        />

        {activeTab === "files" && (
          <FileHierarchy
            nodes={filteredActiveNodes}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
          />
        )}
        {activeTab === "tasks" && (
          <TaskLists
            nodes={filteredActiveNodes}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
          />
        )}
        {activeTab === "tables" && (
          <TableCatalog
            nodes={filteredActiveNodes}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
          />
        )}
        {activeTab === "notes" && (
          <KnowledgeSection
            title="Notes, projects, and decisions"
            subtitle="Internal CompanyCore context records."
            icon={FileText}
            nodes={filteredActiveNodes}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => metadataString(node, "kind") ?? "Records"}
          />
        )}
      </section>
    </div>
  );
}

function DepartmentFilter({
  departments,
  activeNodes,
  selectedKey,
  onSelect,
}: {
  departments: KnowledgeDepartment[];
  activeNodes: CompanyCoreKnowledgeMapNode[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  if (departments.length === 0) return null;
  return (
    <section className="border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="text-sm font-semibold">Department filter</div>
        <span className="text-xs text-muted-foreground">{formatCount(activeNodes.length)} visible in this tab</span>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3">
        <button
          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm transition ${
            selectedKey === "all" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted/60"
          }`}
          onClick={() => onSelect("all")}
        >
          All
        </button>
        {departments.map((department) => (
          <button
            key={department.key}
            className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
              selectedKey === department.key ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted/60"
            }`}
            onClick={() => onSelect(department.key)}
          >
            <span>{department.label}</span>
            <span className="text-xs opacity-70">{formatCount(department.nodes.length)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

interface FileTreeNode {
  key: string;
  name: string;
  folders: FileTreeNode[];
  files: CompanyCoreKnowledgeMapNode[];
  count: number;
}

function FileHierarchy({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const tree = useMemo(() => buildFileHierarchy(nodes), [nodes]);
  const initialOpen = useMemo(() => new Set(tree.folders.map((folder) => folder.key)), [tree]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(initialOpen);

  useEffect(() => {
    setOpenFolders(initialOpen);
  }, [initialOpen]);

  const toggleFolder = (key: string) => {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="border border-border bg-background">
      <LibraryPanelHeader
        icon={FolderOpen}
        title="Files"
        count={nodes.length}
        subtitle="Google Drive files grouped by CompanyCore folder path."
      />
      <div className="divide-y divide-border">
        {nodes.length === 0 ? (
          <EmptyLibraryMessage message="No matching files in this department." />
        ) : (
          <>
            {tree.folders.map((folder) => (
              <FileFolderBranch
                key={folder.key}
                folder={folder}
                depth={0}
                openFolders={openFolders}
                onToggle={toggleFolder}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
              />
            ))}
            {tree.files.map((node) => (
              <KnowledgeRecordRow
                key={node.id}
                node={node}
                selected={selectedNodeId === node.id}
                onSelect={onSelect}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function FileFolderBranch({
  folder,
  depth,
  openFolders,
  onToggle,
  selectedNodeId,
  onSelect,
}: {
  folder: FileTreeNode;
  depth: number;
  openFolders: Set<string>;
  onToggle: (key: string) => void;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const open = openFolders.has(folder.key);
  return (
    <div>
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-muted/60"
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={() => onToggle(folder.key)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm font-medium">{folder.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatCount(folder.count)}</span>
      </button>
      {open && (
        <div className="border-t border-border/60">
          {folder.folders.map((child) => (
            <FileFolderBranch
              key={child.key}
              folder={child}
              depth={depth + 1}
              openFolders={openFolders}
              onToggle={onToggle}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
          {folder.files.map((node) => (
            <div key={node.id} style={{ paddingLeft: `${18 + (depth + 1) * 18}px` }}>
              <KnowledgeRecordRow
                node={node}
                selected={selectedNodeId === node.id}
                onSelect={onSelect}
                compact
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskLists({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const groups = useMemo(() => groupByCollection(nodes, taskGroup), [nodes]);
  return (
    <KnowledgeAccordion
      title="Tasks"
      subtitle="ClickUp-synced work grouped by CompanyCore task list."
      icon={ClipboardList}
      groups={groups}
      selectedNodeId={selectedNodeId}
      onSelect={onSelect}
      emptyMessage="No matching tasks in this department."
    />
  );
}

function TableCatalog({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const groups = useMemo(() => groupByCollection(nodes, (node) => collectionGroup(node, "Operating tables")), [nodes]);
  const [openTables, setOpenTables] = useState<Set<string>>(() => new Set(nodes.slice(0, 4).map((node) => node.id)));

  useEffect(() => {
    setOpenTables(new Set(nodes.slice(0, 4).map((node) => node.id)));
  }, [nodes]);

  const toggleTable = (nodeId: string) => {
    setOpenTables((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <section className="border border-border bg-background">
      <LibraryPanelHeader
        icon={Database}
        title="Tables"
        count={nodes.length}
        subtitle="CompanyCore system tables exposed through backend API and MCP surfaces."
      />
      <div className="divide-y divide-border">
        {nodes.length === 0 ? (
          <EmptyLibraryMessage message="No matching tables in this department." />
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between gap-3 bg-muted/35 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="min-w-0 truncate">{group.label}</span>
                <span>{formatCount(group.nodes.length)}</span>
              </div>
              {group.nodes.map((node) => {
                const open = openTables.has(node.id);
                return (
                  <div key={node.id} className="border-t border-border/60">
                    <button
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60 ${
                        selectedNodeId === node.id ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        onSelect(node.id);
                        toggleTable(node.id);
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate text-sm font-semibold">{node.label}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {metadataString(node, "apiSlug") && <span>{metadataString(node, "apiSlug")}</span>}
                        <span>{open ? "Hide rows" : "Show rows"}</span>
                      </div>
                    </button>
                    {open && <TablePreview node={node} />}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TablePreview({ node }: { node: CompanyCoreKnowledgeMapNode }) {
  const columns = tableColumns(node);
  const rows = tableRows(node);
  const visibleColumns = columns.slice(0, 8);
  return (
    <div className="border-t border-border bg-muted/15 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="muted">Source: CompanyCore</Badge>
        {node.syncedWith.map((provider) => <Badge key={provider} tone="muted">Synced with: {provider}</Badge>)}
        {metadataString(node, "tableName") && <Badge tone="muted">{metadataString(node, "tableName")}</Badge>}
      </div>
      <div className="overflow-x-auto border border-border bg-background">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-muted/45 text-muted-foreground">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length > 0 ? (
              rows.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {visibleColumns.map((column) => (
                    <td key={column} className="max-w-56 truncate px-3 py-2">{String(row[column] ?? "")}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-5 text-muted-foreground" colSpan={Math.max(visibleColumns.length, 1)}>
                  No records are included in this preview yet. The table is visible to agents through CompanyCore, and rows will render here when the bridge exposes sample records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {columns.length > visibleColumns.length && (
        <div className="mt-2 text-xs text-muted-foreground">+{formatCount(columns.length - visibleColumns.length)} more columns hidden in preview</div>
      )}
    </div>
  );
}

function KnowledgeAccordion({
  title,
  subtitle,
  icon,
  groups,
  selectedNodeId,
  onSelect,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  groups: Array<{ label: string; nodes: CompanyCoreKnowledgeMapNode[] }>;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  emptyMessage: string;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.slice(0, 3).map((group) => group.label)));

  useEffect(() => {
    setOpenGroups(new Set(groups.slice(0, 3).map((group) => group.label)));
  }, [groups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <section className="border border-border bg-background">
      <LibraryPanelHeader icon={icon} title={title} count={groups.reduce((sum, group) => sum + group.nodes.length, 0)} subtitle={subtitle} />
      <div className="divide-y divide-border">
        {groups.length === 0 ? (
          <EmptyLibraryMessage message={emptyMessage} />
        ) : (
          groups.map((group) => {
            const open = openGroups.has(group.label);
            return (
              <div key={group.label}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60"
                  onClick={() => toggleGroup(group.label)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="min-w-0 truncate text-sm font-semibold">{group.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCount(group.nodes.length)}</span>
                </button>
                {open && (
                  <div className="divide-y divide-border border-t border-border/60">
                    {group.nodes.map((node) => (
                      <KnowledgeRecordRow
                        key={node.id}
                        node={node}
                        selected={selectedNodeId === node.id}
                        onSelect={onSelect}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function LibraryPanelHeader({
  icon: Icon,
  title,
  count,
  subtitle,
}: {
  icon: typeof BookOpen;
  title: string;
  count: number;
  subtitle: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="text-xs font-normal text-muted-foreground">({formatCount(count)})</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyLibraryMessage({ message }: { message: string }) {
  return <div className="px-3 py-6 text-sm text-muted-foreground">{message}</div>;
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
  compact = false,
}: {
  node: CompanyCoreKnowledgeMapNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  compact?: boolean;
}) {
  const path = metadataString(node, "path") ?? metadataString(node, "folderPath") ?? metadataString(node, "folderName") ?? node.subtitle;
  const listName = metadataString(node, "listName");
  const webUrl = metadataString(node, "webUrl");
  return (
    <button
      className={`block w-full px-3 text-left transition hover:bg-muted/60 ${compact ? "py-2" : "py-2.5"} ${
        selected ? "bg-muted" : ""
      }`}
      onClick={() => onSelect(node.id)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {metadataString(node, "kind") === "file" ? <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <span className={`h-2 w-2 rounded-full ${typeStyles[node.type].dot}`} />}
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

function buildFileHierarchy(nodes: CompanyCoreKnowledgeMapNode[]): FileTreeNode {
  const root: FileTreeNode = { key: "root", name: "Files", folders: [], files: [], count: 0 };
  const folderMap = new Map<string, FileTreeNode>([["root", root]]);

  const ensureFolder = (parent: FileTreeNode, name: string, key: string) => {
    const existing = folderMap.get(key);
    if (existing) return existing;
    const folder: FileTreeNode = { key, name, folders: [], files: [], count: 0 };
    folderMap.set(key, folder);
    parent.folders.push(folder);
    return folder;
  };

  for (const node of nodes) {
    const segments = fileFolderSegments(node);
    let current = root;
    let key = "root";
    for (const segment of segments) {
      key = `${key}/${segment}`;
      current = ensureFolder(current, segment, key);
    }
    if (metadataBoolean(node, "isFolder")) continue;
    current.files.push(node);
  }

  const finalize = (folder: FileTreeNode): number => {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    folder.files.sort(sortByLabel);
    folder.count = folder.files.length + folder.folders.reduce((sum, child) => sum + finalize(child), 0);
    return folder.count;
  };
  finalize(root);
  return root;
}

function fileFolderSegments(node: CompanyCoreKnowledgeMapNode) {
  const folderPath = metadataString(node, "folderPath");
  const folderName = metadataString(node, "folderName");
  const path = metadataString(node, "path");
  const source = folderPath ?? path ?? folderName ?? "Unsorted files";
  const parts = pathSegments(source);
  if (metadataBoolean(node, "isFolder") && path) return parts;
  if (!folderPath && path && parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last && labelsMatch(last, node.label)) return parts.slice(0, -1);
  }
  return parts.length > 0 ? parts : ["Unsorted files"];
}

function tableColumns(node: CompanyCoreKnowledgeMapNode) {
  const configured = metadataArray(node, "columns")
    ?? metadataArray(node, "schemaColumns")
    ?? metadataArray(node, "fields");
  if (configured && configured.length > 0) {
    return configured
      .map((column) => typeof column === "string" ? column : recordFieldName(column))
      .filter((column): column is string => Boolean(column));
  }
  const fallback = ["tableName", "apiSlug", "status", "folder", "syncedWith"];
  return fallback.filter((column) => column === "status" || column === "syncedWith" || metadataString(node, column));
}

function tableRows(node: CompanyCoreKnowledgeMapNode) {
  const rows = metadataArray(node, "rows")
    ?? metadataArray(node, "records")
    ?? metadataArray(node, "sampleRows");
  return (rows ?? [])
    .map((row) => row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : null)
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

function metadataArray(node: CompanyCoreKnowledgeMapNode, key: string) {
  const value = node.metadata[key];
  return Array.isArray(value) ? value : null;
}

function recordFieldName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["name", "key", "id", "label", "title"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
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

function agentLabelForDepartment(key: string) {
  return {
    "00": "00 AIA",
    "01": "01 CSO",
    "02": "02 CPO",
    "03": "03 CRO",
    "04": "04 COO",
    "05": "05 CCO",
    "06": "06 CHRO",
    "07": "07 CFO",
    "08": "08 CAO",
    "09": "09 CTO",
    "10": "10 CLO",
    "11": "11 CINO",
    "12": "12 CEO",
  }[key] ?? `${key} agent layer`;
}

function syncedWithForNodes(nodes: CompanyCoreKnowledgeMapNode[]) {
  return Array.from(new Set(nodes.flatMap((node) => node.syncedWith))).sort();
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

function filterNodesByResource(nodes: CompanyCoreKnowledgeMapNode[], filter: KnowledgeResourceFilter) {
  if (filter === "all") return nodes;
  return nodes.filter((node) => {
    const kind = metadataString(node, "kind");
    if (filter === "folders") return node.type === "record" && kind === "file";
    if (filter === "task_lists") return node.type === "record" && kind === "task";
    if (filter === "tables") return node.type === "table";
    if (filter === "notes") return node.type === "record" && ["note", "decision", "project"].includes(kind ?? "");
    return true;
  });
}

function metadataString(node: CompanyCoreKnowledgeMapNode, key: string) {
  const value = node.metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataBoolean(node: CompanyCoreKnowledgeMapNode, key: string) {
  return node.metadata[key] === true;
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
  const parts = pathSegments(value);
  return parts[0] ?? value;
}

function pathSegments(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function labelsMatch(pathPart: string, label: string) {
  const normalize = (value: string) => value.trim().toLowerCase();
  return normalize(pathPart) === normalize(label);
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
