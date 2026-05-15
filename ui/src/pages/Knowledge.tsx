import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Boxes,
  BrainCircuit,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Layers3,
  ListChecks,
  Maximize2,
  Minus,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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

type KnowledgeView = "library" | "map" | "tree" | "access" | "sync";

interface LayoutNode extends CompanyCoreKnowledgeMapNode {
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

const NODE_W = 190;
const NODE_H = 76;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;

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

const nodeIcons: Record<CompanyCoreKnowledgeNodeType, typeof BookOpen> = {
  workspace: BrainCircuit,
  domain: Boxes,
  area: Layers3,
  table: Database,
  record: FileText,
  capability: ShieldCheck,
};

export function Knowledge() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [view, setView] = useState<KnowledgeView>("library");
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
    return map.nodes.find((node) => node.id === selectedNodeId) ?? map.nodes[0] ?? null;
  }, [map, selectedNodeId]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!map || selectedNodeId) return;
    setSelectedNodeId(map.nodes[0]?.id ?? null);
  }, [map, selectedNodeId]);

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to inspect its CompanyCore knowledge layer." />;
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[680px] flex-col gap-4">
      <header className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedCompany?.name ?? "Company"} knowledge
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">CompanyCore Knowledge Map</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Agent-facing knowledge is modeled as CompanyCore data. The main view is a browsable catalog
              of areas, files, tasks, and tables; the graph is available when you want to inspect relationships.
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

      <section className="grid shrink-0 gap-3 md:grid-cols-4">
        <Metric label="CompanyCore" value={map?.status ?? (mapQuery.isLoading ? "checking" : "not connected")} icon={ShieldCheck} />
        <Metric label="Knowledge objects" value={formatCount(totalKnowledgeObjects(map))} icon={Sparkles} />
        <Metric label="Collections" value={formatCount(map?.summary.tableCount ?? 0)} icon={Database} />
        <Metric label="Agent tools" value={formatCount(map?.summary.toolCount ?? 0)} icon={Network} />
      </section>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="min-h-0 overflow-hidden border border-border bg-background">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search CompanyCore..."
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-2 text-sm outline-none"
              />
            </div>
          </div>
          <KnowledgeTree
            map={map}
            nodes={filteredNodes}
            selectedNodeId={selectedNode?.id ?? null}
            onSelect={setSelectedNodeId}
          />
        </aside>

        <main className="min-h-0 overflow-hidden border border-border bg-background">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="flex items-center gap-1">
              {(["library", "map", "tree", "access", "sync"] as KnowledgeView[]).map((item) => (
                <button
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    view === item ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setView(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
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
            <KnowledgeGraph
              map={map}
              nodes={filteredNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={setSelectedNodeId}
              isLoading={mapQuery.isLoading}
            />
          )}
          {view === "tree" && (
            <TreeDetail nodes={filteredNodes} selectedNodeId={selectedNode?.id ?? null} onSelect={setSelectedNodeId} />
          )}
          {view === "access" && <AccessDetail map={map} onSelect={setSelectedNodeId} />}
          {view === "sync" && <SyncDetail map={map} />}
        </main>

        <Inspector node={selectedNode} map={map} />
      </div>
    </div>
  );
}

function KnowledgeGraph({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [zoom, setZoom] = useState(0.86);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const layoutNodes = useMemo(() => layoutKnowledgeNodes(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(layoutNodes.map((node) => [node.id, node])), [layoutNodes]);
  const edges = useMemo(
    () => (map?.edges ?? []).filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target)),
    [map?.edges, nodeMap],
  );
  const bounds = useMemo(() => graphBounds(layoutNodes), [layoutNodes]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scaleX = (container.clientWidth - 60) / Math.max(bounds.width, 1);
    const scaleY = (container.clientHeight - 60) / Math.max(bounds.height, 1);
    const nextZoom = clamp(Math.min(scaleX, scaleY, 1), MIN_ZOOM, MAX_ZOOM);
    setZoom(nextZoom);
    setPan({
      x: (container.clientWidth - bounds.width * nextZoom) / 2,
      y: (container.clientHeight - bounds.height * nextZoom) / 2,
    });
  }, [bounds]);

  useEffect(() => {
    if (layoutNodes.length > 0) fitToScreen();
  }, [fitToScreen, layoutNodes.length]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-knowledge-node]")) return;
    setDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + event.clientX - dragStart.current.x,
      y: dragStart.current.panY + event.clientY - dragStart.current.y,
    });
  }, [dragging]);

  const zoomTowardCenter = useCallback((factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const point = { x: container.clientWidth / 2, y: container.clientHeight / 2 };
    const nextZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const scale = nextZoom / zoom;
    setPan({
      x: point.x - scale * (point.x - pan.x),
      y: point.y - scale * (point.y - pan.y),
    });
    setZoom(nextZoom);
  }, [pan, zoom]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading CompanyCore map...</div>;
  }

  if (!map || layoutNodes.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No CompanyCore knowledge nodes available.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden bg-muted/20"
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onWheel={(event) => {
        event.preventDefault();
        zoomTowardCenter(event.deltaY < 0 ? 1.08 : 0.92);
      }}
    >
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <IconButton label="Zoom in" onClick={() => zoomTowardCenter(1.15)} icon={Plus} />
        <IconButton label="Zoom out" onClick={() => zoomTowardCenter(0.85)} icon={Minus} />
        <IconButton label="Fit" onClick={fitToScreen} icon={Maximize2} />
      </div>

      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source)!;
            const target = nodeMap.get(edge.target)!;
            const sourcePoint = rightAnchor(source);
            const targetPoint = leftAnchor(target);
            const midX = (sourcePoint.x + targetPoint.x) / 2;
            return (
              <path
                key={edge.id}
                d={`M ${sourcePoint.x} ${sourcePoint.y} C ${midX} ${sourcePoint.y}, ${midX} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.4}
              />
            );
          })}
        </g>
      </svg>

      <div
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
      >
        {layoutNodes.map((node) => (
          <GraphNode
            key={node.id}
            node={node}
            selected={node.id === selectedNodeId}
            onSelect={onSelect}
          />
        ))}
      </div>
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
    <div className="grid h-full min-h-0 gap-0 overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)]">
      <section className="min-h-0 overflow-auto border-r border-border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Areas</div>
            <div className="text-xs text-muted-foreground">CompanyCore operating model</div>
          </div>
          <Badge tone="muted">{formatCount(areas.length)}</Badge>
        </div>
        <div className="space-y-2">
          {areas.length === 0 ? (
            <div className="border border-dashed border-border p-3 text-sm text-muted-foreground">
              No operating areas reported by CompanyCore.
            </div>
          ) : (
            areas.map((area) => (
              <button
                key={area.id}
                className={`block w-full rounded-md border px-3 py-2 text-left transition ${
                  selectedNodeId === area.id ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"
                }`}
                onClick={() => onSelect(area.id)}
              >
                <div className="flex items-center gap-2">
                  <Layers3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{area.label}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {area.count !== null ? `${formatCount(area.count)} tables` : "CompanyCore area"}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-auto p-4">
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

        <div className="space-y-4">
          <KnowledgeSection
            title="Files and knowledge documents"
            subtitle="Documents indexed by CompanyCore. Drive is shown only as a sync annotation."
            icon={FolderOpen}
            nodes={files}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => collectionGroup(node, "Files")}
          />
          <KnowledgeSection
            title="Tasks and task lists"
            subtitle="CompanyCore tasks grouped by list, space, area, or folder."
            icon={ClipboardList}
            nodes={tasks}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => taskGroup(node)}
          />
          <KnowledgeSection
            title="Operating tables"
            subtitle="Structured CompanyCore tables available to agents."
            icon={Database}
            nodes={tables}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            groupBy={(node) => collectionGroup(node, "Operating tables")}
          />
          <KnowledgeSection
            title="Notes, decisions, and projects"
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
  const path = metadataString(node, "path") ?? metadataString(node, "folderPath") ?? node.subtitle;
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

function GraphNode({
  node,
  selected,
  onSelect,
}: {
  node: LayoutNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const Icon = nodeIcons[node.type];
  const style = typeStyles[node.type];
  return (
    <button
      data-knowledge-node
      className={`absolute flex flex-col items-start border px-3 py-2 text-left shadow-sm transition ${
        style.className
      } ${selected ? "ring-2 ring-foreground/40" : "hover:border-foreground/30"}`}
      style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
      onClick={() => onSelect(node.id)}
    >
      <div className="flex w-full items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{node.label}</span>
      </div>
      <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">{node.subtitle ?? style.label}</span>
      <div className="mt-2 flex w-full items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>Source: CompanyCore</span>
        {node.count !== null && <span>{formatCount(node.count)}</span>}
      </div>
    </button>
  );
}

function KnowledgeTree({
  map,
  nodes,
  selectedNodeId,
  onSelect,
}: {
  map?: CompanyCoreKnowledgeMap;
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const grouped = useMemo(() => groupByType(nodes), [nodes]);
  if (!map) {
    return <div className="p-4 text-sm text-muted-foreground">CompanyCore map is loading.</div>;
  }
  return (
    <div className="h-full overflow-auto p-2">
      {(["workspace", "domain", "area", "table", "record", "capability"] as CompanyCoreKnowledgeNodeType[]).map((type) => {
        const rows = grouped[type] ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={type} className="mb-3">
            <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {typeStyles[type].label} ({rows.length})
            </div>
            <div className="space-y-1">
              {rows.slice(0, type === "table" || type === "record" ? 50 : 20).map((node) => (
                <button
                  key={node.id}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                    selectedNodeId === node.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70"
                  }`}
                  onClick={() => onSelect(node.id)}
                >
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{node.label}</span>
                  {node.count !== null && <span className="text-[10px]">{node.count}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TreeDetail({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: CompanyCoreKnowledgeMapNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const grouped = groupByType(nodes);
  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {(["domain", "area", "table", "record"] as CompanyCoreKnowledgeNodeType[]).map((type) => (
          <section key={type} className="border border-border">
            <div className="border-b border-border px-3 py-2 text-sm font-semibold">{typeStyles[type].label}</div>
            <div className="max-h-80 overflow-auto divide-y divide-border">
              {(grouped[type] ?? []).slice(0, 80).map((node) => (
                <button
                  key={node.id}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60 ${
                    selectedNodeId === node.id ? "bg-muted" : ""
                  }`}
                  onClick={() => onSelect(node.id)}
                >
                  <span className="min-w-0 truncate">{node.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{node.syncedWith.join(", ") || "CompanyCore"}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AccessDetail({
  map,
  onSelect,
}: {
  map?: CompanyCoreKnowledgeMap;
  onSelect: (nodeId: string) => void;
}) {
  const capabilities = (map?.nodes ?? []).filter((node) => node.type === "capability");
  const domains = (map?.nodes ?? []).filter((node) => node.type === "domain");
  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Metric label="Read tools" value={formatCount(map?.summary.readCapabilityCount ?? 0)} icon={BookOpen} />
        <Metric label="Write tools" value={formatCount(map?.summary.writeCapabilityCount ?? 0)} icon={GitBranch} />
        <Metric label="Approval surfaces" value={formatCount(domains.filter((node) => node.agentAccess.approvalRequired).length)} icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-border">
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">Agent-facing domains</div>
          <div className="divide-y divide-border">
            {domains.map((node) => (
              <AccessRow key={node.id} node={node} onSelect={onSelect} />
            ))}
          </div>
        </section>
        <section className="border border-border">
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">CompanyCore capability groups</div>
          <div className="max-h-[32rem] overflow-auto divide-y divide-border">
            {capabilities.map((node) => (
              <AccessRow key={node.id} node={node} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccessRow({ node, onSelect }: { node: CompanyCoreKnowledgeMapNode; onSelect: (nodeId: string) => void }) {
  return (
    <button className="block w-full px-3 py-2 text-left hover:bg-muted/60" onClick={() => onSelect(node.id)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{node.label}</span>
        <span className="text-xs text-muted-foreground">{node.count !== null ? formatCount(node.count) : typeStyles[node.type].label}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Badge tone={node.agentAccess.read ? "good" : "muted"}>read</Badge>
        <Badge tone={node.agentAccess.write ? "warn" : "muted"}>write</Badge>
        {node.agentAccess.approvalRequired && <Badge tone="danger">approval</Badge>}
      </div>
    </button>
  );
}

function SyncDetail({ map }: { map?: CompanyCoreKnowledgeMap }) {
  const syncedNodes = (map?.nodes ?? []).filter((node) => node.syncedWith.length > 0);
  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Metric label="Source" value="CompanyCore" icon={BrainCircuit} />
        <Metric label="Synced records" value={formatCount(syncedNodes.length)} icon={RefreshCw} />
        <Metric label="Backings" value={map?.summary.syncedWith.join(", ") || "internal"} icon={CircleDot} />
      </div>
      {map?.errors.length ? (
        <section className="mb-4 border border-destructive/40 bg-destructive/5 p-3">
          <div className="text-sm font-semibold">Partial CompanyCore preview</div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {map.errors.map((error) => (
              <div key={`${error.surface}-${error.message}`}>{error.surface}: {error.message}</div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="border border-border">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold">Synced with annotations</div>
        <div className="max-h-[34rem] overflow-auto divide-y divide-border">
          {syncedNodes.slice(0, 120).map((node) => (
            <div key={node.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{node.label}</div>
                <div className="text-xs text-muted-foreground">Source: CompanyCore</div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">Synced with: {node.syncedWith.join(", ")}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Inspector({ node, map }: { node: CompanyCoreKnowledgeMapNode | null; map?: CompanyCoreKnowledgeMap }) {
  if (!node) {
    return (
      <aside className="border border-border p-4 text-sm text-muted-foreground">
        Select a CompanyCore node to inspect agent access.
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

function IconButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Plus; onClick: () => void }) {
  return (
    <button
      className="flex size-8 items-center justify-center rounded border border-border bg-background hover:bg-muted"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function layoutKnowledgeNodes(nodes: CompanyCoreKnowledgeMapNode[]): LayoutNode[] {
  const columns: CompanyCoreKnowledgeNodeType[] = ["workspace", "domain", "area", "table", "record", "capability"];
  const xByType: Record<CompanyCoreKnowledgeNodeType, number> = {
    workspace: 40,
    domain: 300,
    area: 560,
    table: 820,
    record: 1080,
    capability: 560,
  };
  const result: LayoutNode[] = [];
  for (const type of columns) {
    const typedNodes = nodes.filter((node) => node.type === type);
    typedNodes.forEach((node, index) => {
      const yOffset = type === "capability" ? 520 : 40;
      result.push({
        ...node,
        x: xByType[type],
        y: yOffset + index * (NODE_H + 22),
      });
    });
  }
  return result;
}

function graphBounds(nodes: LayoutNode[]) {
  if (nodes.length === 0) return { width: 1000, height: 700 };
  return {
    width: Math.max(...nodes.map((node) => node.x + NODE_W)) + 80,
    height: Math.max(...nodes.map((node) => node.y + NODE_H)) + 80,
  };
}

function leftAnchor(node: LayoutNode): Point {
  return { x: node.x, y: node.y + NODE_H / 2 };
}

function rightAnchor(node: LayoutNode): Point {
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function groupByType(nodes: CompanyCoreKnowledgeMapNode[]) {
  return nodes.reduce((groups, node) => {
    groups[node.type] = [...(groups[node.type] ?? []), node];
    return groups;
  }, {} as Partial<Record<CompanyCoreKnowledgeNodeType, CompanyCoreKnowledgeMapNode[]>>);
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
