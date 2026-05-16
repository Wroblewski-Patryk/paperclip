import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { agentsApi, type OrgNode } from "../api/agents";
import { companyCoreApi, type CompanyCoreKnowledgeMapNode } from "../api/companycore";
import { companySkillsApi } from "../api/companySkills";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { agentUrl } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { AgentIcon } from "../components/AgentIconPicker";
import { BookOpen, Download, GraduationCap, Maximize2, Minus, Network, Plus, Upload } from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent, type AgentSkillSnapshot, type CompanySkillListItem } from "@paperclipai/shared";

// Layout constants
const CARD_W = 200;
const CARD_H = 100;
const GAP_X = 32;
const GAP_Y = 80;
const PADDING = 60;
const RESOURCE_W = 220;
const RESOURCE_H = 76;
const RESOURCE_GAP = 14;
const RESOURCE_SECTION_GAP = 44;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const TOUCH_MOVE_THRESHOLD = 6;

// ── Tree layout types ───────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  name: string;
  role: string;
  status: string;
  x: number;
  y: number;
  children: LayoutNode[];
}

type ResourceLayer = "skills" | "knowledge";

interface ResourceNode {
  id: string;
  key: string;
  layer: ResourceLayer;
  label: string;
  subtitle: string | null;
  detail: string | null;
  href: string | null;
  agentIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResourceSectionLayout {
  key: ResourceLayer;
  label: string;
  icon: typeof GraduationCap;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
}

interface ResourceLayout {
  sections: ResourceSectionLayout[];
  nodes: ResourceNode[];
  width: number;
  height: number;
}

interface ResourceConnection {
  id: string;
  agentId: string;
  resourceId: string;
  layer: ResourceLayer;
}

interface Point {
  x: number;
  y: number;
}

interface TouchGesture {
  mode: "pan" | "pinch" | null;
  startPoint: Point;
  startPan: Point;
  startZoom: number;
  startDistance: number;
  startCenter: Point;
  moved: boolean;
}

// ── Layout algorithm ────────────────────────────────────────────────────

/** Compute the width each subtree needs. */
function subtreeWidth(node: OrgNode): number {
  if (node.reports.length === 0) return CARD_W;
  const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
  const gaps = (node.reports.length - 1) * GAP_X;
  return Math.max(CARD_W, childrenW + gaps);
}

/** Recursively assign x,y positions. */
function layoutTree(node: OrgNode, x: number, y: number): LayoutNode {
  const totalW = subtreeWidth(node);
  const layoutChildren: LayoutNode[] = [];

  if (node.reports.length > 0) {
    const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
    const gaps = (node.reports.length - 1) * GAP_X;
    let cx = x + (totalW - childrenW - gaps) / 2;

    for (const child of node.reports) {
      const cw = subtreeWidth(child);
      layoutChildren.push(layoutTree(child, cx, y + CARD_H + GAP_Y));
      cx += cw + GAP_X;
    }
  }

  return {
    id: node.id,
    name: node.name,
    role: node.role,
    status: node.status,
    x: x + (totalW - CARD_W) / 2,
    y,
    children: layoutChildren,
  };
}

/** Layout all root nodes side by side. */
function layoutForest(roots: OrgNode[]): LayoutNode[] {
  if (roots.length === 0) return [];

  const totalW = roots.reduce((sum, r) => sum + subtreeWidth(r), 0);
  const gaps = (roots.length - 1) * GAP_X;
  let x = PADDING;
  const y = PADDING;

  const result: LayoutNode[] = [];
  for (const root of roots) {
    const w = subtreeWidth(root);
    result.push(layoutTree(root, x, y));
    x += w + GAP_X;
  }

  // Compute bounds and return
  return result;
}

/** Flatten layout tree to list of nodes. */
function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];
  function walk(n: LayoutNode) {
    result.push(n);
    n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

/** Collect all parent→child edges. */
function collectEdges(nodes: LayoutNode[]): Array<{ parent: LayoutNode; child: LayoutNode }> {
  const edges: Array<{ parent: LayoutNode; child: LayoutNode }> = [];
  function walk(n: LayoutNode) {
    for (const c of n.children) {
      edges.push({ parent: n, child: c });
      walk(c);
    }
  }
  nodes.forEach(walk);
  return edges;
}

function clampZoom(value: number): number {
  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
}

function touchPoint(touch: React.Touch): Point {
  return { x: touch.clientX, y: touch.clientY };
}

function touchDistance(a: React.Touch, b: React.Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function touchCenter(a: React.Touch, b: React.Touch, container: HTMLDivElement): Point {
  const rect = container.getBoundingClientRect();
  return {
    x: (a.clientX + b.clientX) / 2 - rect.left,
    y: (a.clientY + b.clientY) / 2 - rect.top,
  };
}

// ── Status dot colors (raw hex for SVG) ─────────────────────────────────

import { getAdapterLabel } from "../adapters/adapter-display-registry";

const statusDotColor: Record<string, string> = {
  running: "#22d3ee",
  active: "#4ade80",
  paused: "#facc15",
  idle: "#facc15",
  error: "#f87171",
  terminated: "#a3a3a3",
};
const defaultDotColor = "#a3a3a3";

// ── Main component ──────────────────────────────────────────────────────

export function OrgChart() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [visibleLayers, setVisibleLayers] = useState<Record<ResourceLayer, boolean>>({
    skills: true,
    knowledge: true,
  });
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);

  const { data: orgTree, isLoading } = useQuery({
    queryKey: queryKeys.org(selectedCompanyId!),
    queryFn: () => agentsApi.org(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: companySkills } = useQuery({
    queryKey: queryKeys.companySkills.list(selectedCompanyId ?? ""),
    queryFn: () => companySkillsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: knowledgeMap } = useQuery({
    queryKey: queryKeys.companyCore.map(selectedCompanyId ?? ""),
    queryFn: () => companyCoreApi.map(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000,
  });

  const skillSnapshotResults = useQueries({
    queries: (agents ?? []).map((agent) => ({
      queryKey: queryKeys.agents.skills(agent.id),
      queryFn: () => agentsApi.skills(agent.id, selectedCompanyId ?? undefined),
      enabled: Boolean(selectedCompanyId),
      staleTime: 30_000,
    })),
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  const skillSnapshotByAgentId = useMemo(() => {
    const m = new Map<string, AgentSkillSnapshot>();
    (agents ?? []).forEach((agent, index) => {
      const snapshot = skillSnapshotResults[index]?.data;
      if (snapshot) m.set(agent.id, snapshot);
    });
    return m;
  }, [agents, skillSnapshotResults]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Org Chart" }]);
  }, [setBreadcrumbs]);

  // Layout computation
  const layout = useMemo(() => layoutForest(orgTree ?? []), [orgTree]);
  const allNodes = useMemo(() => flattenLayout(layout), [layout]);
  const edges = useMemo(() => collectEdges(layout), [layout]);

  const resourceData = useMemo(
    () => buildResourceData({
      agents: agents ?? [],
      companySkills: companySkills ?? [],
      skillSnapshotByAgentId,
      knowledgeNodes: knowledgeMap?.nodes ?? [],
    }),
    [agents, companySkills, knowledgeMap?.nodes, skillSnapshotByAgentId],
  );

  // Compute SVG bounds
  const agentBounds = useMemo(() => {
    if (allNodes.length === 0) return { width: 800, height: 600 };
    let maxX = 0, maxY = 0;
    for (const n of allNodes) {
      maxX = Math.max(maxX, n.x + CARD_W);
      maxY = Math.max(maxY, n.y + CARD_H);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [allNodes]);

  const resourceLayout = useMemo(
    () => layoutResources({
      skills: visibleLayers.skills ? resourceData.skills : [],
      knowledge: visibleLayers.knowledge ? resourceData.knowledge : [],
      startY: agentBounds.height + 18,
      minWidth: agentBounds.width,
    }),
    [agentBounds.height, agentBounds.width, resourceData.knowledge, resourceData.skills, visibleLayers.knowledge, visibleLayers.skills],
  );

  const resourceNodesById = useMemo(
    () => new Map(resourceLayout.nodes.map((node) => [node.id, node])),
    [resourceLayout.nodes],
  );

  const resourceConnections = useMemo<ResourceConnection[]>(
    () =>
      resourceLayout.nodes.flatMap((resource) =>
        resource.agentIds.map((agentId) => ({
          id: `${agentId}-${resource.id}`,
          agentId,
          resourceId: resource.id,
          layer: resource.layer,
        })),
      ),
    [resourceLayout.nodes],
  );

  const bounds = useMemo(
    () => ({
      width: Math.max(agentBounds.width, resourceLayout.width),
      height: Math.max(agentBounds.height, resourceLayout.height),
    }),
    [agentBounds.height, agentBounds.width, resourceLayout.height, resourceLayout.width],
  );

  // Pan & zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchGesture = useRef<TouchGesture>({
    mode: null,
    startPoint: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    startZoom: 1,
    startDistance: 0,
    startCenter: { x: 0, y: 0 },
    moved: false,
  });
  const suppressNextCardClick = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);

  // Center the chart on first load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || allNodes.length === 0 || !containerRef.current) return;
    hasInitialized.current = true;

    const container = containerRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    // Fit chart to container
    const scaleX = (containerW - 40) / bounds.width;
    const scaleY = (containerH - 40) / bounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);

    const chartW = bounds.width * fitZoom;
    const chartH = bounds.height * fitZoom;

    setZoom(fitZoom);
    setPan({
      x: (containerW - chartW) / 2,
      y: (containerH - chartH) / 2,
    });
  }, [allNodes, bounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't drag if clicking a card
    const target = e.target as HTMLElement;
    if (target.closest("[data-org-card]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clampZoom(zoom * factor);

    // Zoom toward mouse position
    const scale = newZoom / zoom;
    setPan({
      x: mouseX - scale * (mouseX - pan.x),
      y: mouseY - scale * (mouseY - pan.y),
    });
    setZoom(newZoom);
  }, [zoom, pan]);

  const zoomTowardPoint = useCallback((newZoom: number, point: Point) => {
    const clampedZoom = clampZoom(newZoom);
    const scale = clampedZoom / zoom;
    setPan({
      x: point.x - scale * (point.x - pan.x),
      y: point.y - scale * (point.y - pan.y),
    });
    setZoom(clampedZoom);
  }, [zoom, pan]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const scaleX = (cW - 40) / bounds.width;
    const scaleY = (cH - 40) / bounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    const chartW = bounds.width * fitZoom;
    const chartH = bounds.height * fitZoom;
    setZoom(fitZoom);
    setPan({ x: (cW - chartW) / 2, y: (cH - chartH) / 2 });
  }, [bounds]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2 && containerRef.current) {
      const [first, second] = [e.touches[0]!, e.touches[1]!];
      touchGesture.current = {
        mode: "pinch",
        startPoint: { x: 0, y: 0 },
        startPan: pan,
        startZoom: zoom,
        startDistance: touchDistance(first, second),
        startCenter: touchCenter(first, second, containerRef.current),
        moved: false,
      };
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;
    touchGesture.current = {
      mode: "pan",
      startPoint: touchPoint(touch),
      startPan: pan,
      startZoom: zoom,
      startDistance: 0,
      startCenter: { x: 0, y: 0 },
      moved: false,
    };
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !touchGesture.current.mode) return;

    if (e.touches.length >= 2) {
      const [first, second] = [e.touches[0]!, e.touches[1]!];
      const distance = touchDistance(first, second);
      const center = touchCenter(first, second, container);

      if (touchGesture.current.mode !== "pinch" || touchGesture.current.startDistance === 0) {
        touchGesture.current = {
          mode: "pinch",
          startPoint: { x: 0, y: 0 },
          startPan: pan,
          startZoom: zoom,
          startDistance: distance,
          startCenter: center,
          moved: false,
        };
        return;
      }

      const gesture = touchGesture.current;
      const nextZoom = clampZoom(gesture.startZoom * (distance / gesture.startDistance));
      const scale = nextZoom / gesture.startZoom;
      const dx = center.x - gesture.startCenter.x;
      const dy = center.y - gesture.startCenter.y;
      gesture.moved =
        gesture.moved ||
        Math.abs(distance - gesture.startDistance) > TOUCH_MOVE_THRESHOLD ||
        Math.hypot(dx, dy) > TOUCH_MOVE_THRESHOLD;
      setZoom(nextZoom);
      setPan({
        x: center.x - scale * (gesture.startCenter.x - gesture.startPan.x),
        y: center.y - scale * (gesture.startCenter.y - gesture.startPan.y),
      });
      return;
    }

    const touch = e.touches[0];
    if (!touch || touchGesture.current.mode !== "pan") return;
    const dx = touch.clientX - touchGesture.current.startPoint.x;
    const dy = touch.clientY - touchGesture.current.startPoint.y;
    touchGesture.current.moved = touchGesture.current.moved || Math.hypot(dx, dy) > TOUCH_MOVE_THRESHOLD;
    setPan({
      x: touchGesture.current.startPan.x + dx,
      y: touchGesture.current.startPan.y + dy,
    });
  }, [pan, zoom]);

  const handleTouchEnd = useCallback(() => {
    if (touchGesture.current.moved) {
      suppressNextCardClick.current = true;
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressNextCardClick.current = false;
        suppressClickTimerRef.current = null;
      }, 400);
    }
    touchGesture.current = {
      mode: null,
      startPoint: { x: 0, y: 0 },
      startPan: pan,
      startZoom: zoom,
      startDistance: 0,
      startCenter: { x: 0, y: 0 },
      moved: false,
    };
  }, [pan, zoom]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Network} message="Select a company to view the org chart." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="org-chart" />;
  }

  if (orgTree && orgTree.length === 0) {
    return <EmptyState icon={Network} message="No organizational hierarchy defined." />;
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[420px] flex-col md:h-full md:min-h-0">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-start gap-2">
        <Link to="/company/import">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import company
          </Button>
        </Link>
        <Link to="/company/export">
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export company
          </Button>
        </Link>
        <div className="ml-0 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-1 md:ml-2">
          {[
            { key: "skills" as const, label: `Skills ${resourceData.skills.length}`, icon: GraduationCap },
            { key: "knowledge" as const, label: `Knowledge ${resourceData.knowledge.length}`, icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon;
            const active = visibleLayers[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setVisibleLayers((current) => ({ ...current, [item.key]: !current[item.key] }))}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={containerRef}
        data-testid="org-chart-viewport"
        className="w-full flex-1 min-h-0 overflow-hidden relative bg-muted/20 border border-border rounded-lg"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          overscrollBehavior: "contain",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            className="flex size-9 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-accent sm:size-7"
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                zoomTowardPoint(zoom * 1.2, {
                  x: container.clientWidth / 2,
                  y: container.clientHeight / 2,
                });
              }
            }}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
          <button
            className="flex size-9 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-accent sm:size-7"
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                zoomTowardPoint(zoom * 0.8, {
                  x: container.clientWidth / 2,
                  y: container.clientHeight / 2,
                });
              }
            }}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
          <button
            className="flex size-9 items-center justify-center rounded border border-border bg-background text-[10px] transition-colors hover:bg-accent sm:size-7"
            onClick={fitToScreen}
            title="Fit to screen"
            aria-label="Fit chart to screen"
          >
            <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>

        {/* SVG layer for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {edges.map(({ parent, child }) => {
              const x1 = parent.x + CARD_W / 2;
              const y1 = parent.y + CARD_H;
              const x2 = child.x + CARD_W / 2;
              const y2 = child.y;
              const midY = (y1 + y2) / 2;

              return (
                <path
                  key={`${parent.id}-${child.id}`}
                  d={`M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1.5}
                />
              );
            })}
            {resourceConnections.map((connection) => {
              const agent = allNodes.find((node) => node.id === connection.agentId);
              const resource = resourceNodesById.get(connection.resourceId);
              if (!agent || !resource) return null;
              const x1 = agent.x + CARD_W / 2;
              const y1 = agent.y + CARD_H;
              const x2 = resource.x + resource.width / 2;
              const y2 = resource.y;
              const c1y = y1 + Math.max(48, (y2 - y1) * 0.35);
              const c2y = y2 - Math.max(32, (y2 - y1) * 0.18);
              const active = isRelationshipActive({
                hoveredAgentId,
                hoveredResourceId,
                agentId: connection.agentId,
                resource,
              });
              return (
                <path
                  key={connection.id}
                  d={`M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`}
                  fill="none"
                  stroke={connection.layer === "skills" ? "rgb(14 165 233)" : "rgb(16 185 129)"}
                  strokeOpacity={active ? 0.9 : hoveredAgentId || hoveredResourceId ? 0.08 : 0.28}
                  strokeWidth={active ? 2.4 : 1.5}
                />
              );
            })}
          </g>
        </svg>

        {/* Card layer */}
        <div
          data-testid="org-chart-card-layer"
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {allNodes.map((node) => {
            const agent = agentMap.get(node.id);
            const dotColor = statusDotColor[node.status] ?? defaultDotColor;
            const agentActive = isAgentActive({
              hoveredAgentId,
              hoveredResourceId,
              agentId: node.id,
              resource: hoveredResourceId ? resourceNodesById.get(hoveredResourceId) ?? null : null,
            });

            return (
              <div
                key={node.id}
                data-org-card
                className="absolute bg-card border border-border rounded-lg shadow-sm hover:shadow-md hover:border-foreground/20 transition-[box-shadow,border-color,opacity,transform] duration-150 cursor-pointer select-none"
                style={{
                  left: node.x,
                  top: node.y,
                  width: CARD_W,
                  minHeight: CARD_H,
                  opacity: agentActive ? 1 : 0.24,
                }}
                onMouseEnter={() => setHoveredAgentId(node.id)}
                onMouseLeave={() => setHoveredAgentId(null)}
                onClick={() => navigate(agent ? agentUrl(agent) : `/agents/${node.id}`)}
                onClickCapture={(e) => {
                  if (!suppressNextCardClick.current) return;
                  suppressNextCardClick.current = false;
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="flex items-center px-4 py-3 gap-3">
                  {/* Agent icon + status dot */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <AgentIcon icon={agent?.icon} className="h-4.5 w-4.5 text-foreground/70" />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
                      style={{ backgroundColor: dotColor }}
                    />
                  </div>
                  {/* Name + role + adapter type */}
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground leading-tight">
                      {node.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {agent?.title ?? roleLabel(node.role)}
                    </span>
                    {agent && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono leading-tight mt-1">
                        {getAdapterLabel(agent.adapterType)}
                      </span>
                    )}
                    {agent && agent.capabilities && (
                      <span className="text-[10px] text-muted-foreground/80 leading-tight mt-1 line-clamp-2">
                        {agent.capabilities}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {resourceLayout.sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.key}
                className="absolute flex items-center gap-2 border-b border-border/70 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                style={{
                  left: section.x,
                  top: section.y,
                  width: section.width,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{section.label}</span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                  {section.count}
                </span>
              </div>
            );
          })}

          {resourceLayout.nodes.map((resource) => {
            const active = isResourceActive({ hoveredAgentId, hoveredResourceId, resource });
            const card = (
              <div
                key={resource.id}
                className={`absolute border bg-background px-3 py-2 shadow-sm transition-[opacity,border-color,box-shadow] duration-150 ${
                  resource.layer === "skills"
                    ? "border-sky-300/70 hover:border-sky-500/80 dark:border-sky-700/60"
                    : "border-emerald-300/70 hover:border-emerald-500/80 dark:border-emerald-700/60"
                }`}
                style={{
                  left: resource.x,
                  top: resource.y,
                  width: resource.width,
                  height: resource.height,
                  opacity: active ? 1 : 0.22,
                }}
                onMouseEnter={() => setHoveredResourceId(resource.id)}
                onMouseLeave={() => setHoveredResourceId(null)}
                title={`${resource.label}${resource.detail ? ` - ${resource.detail}` : ""}`}
              >
                <div className="flex items-start gap-2">
                  {resource.layer === "skills" ? (
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
                  ) : (
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-foreground">{resource.label}</div>
                    {resource.subtitle ? (
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{resource.subtitle}</div>
                    ) : null}
                    {resource.detail ? (
                      <div className="mt-1 truncate text-[10px] text-muted-foreground/80">{resource.detail}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            );

            if (!resource.href) return card;
            return (
              <Link key={resource.id} to={resource.href} className="contents">
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const roleLabels: Record<string, string> = AGENT_ROLE_LABELS;

function roleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

function buildResourceData(input: {
  agents: Agent[];
  companySkills: CompanySkillListItem[];
  skillSnapshotByAgentId: Map<string, AgentSkillSnapshot>;
  knowledgeNodes: CompanyCoreKnowledgeMapNode[];
}) {
  const skills = buildSkillResources(input.agents, input.companySkills, input.skillSnapshotByAgentId);
  const knowledge = buildKnowledgeResources(input.agents, input.knowledgeNodes);
  return { skills, knowledge };
}

function buildSkillResources(
  agents: Agent[],
  companySkills: CompanySkillListItem[],
  skillSnapshotByAgentId: Map<string, AgentSkillSnapshot>,
): ResourceNode[] {
  const skillByKey = new Map(companySkills.map((skill) => [skill.key, skill]));
  const agentIdsBySkill = new Map<string, Set<string>>();
  const labelByMissingKey = new Map<string, string>();

  for (const agent of agents) {
    const snapshot = skillSnapshotByAgentId.get(agent.id);
    if (!snapshot) continue;
    const assignedKeys = new Set([
      ...snapshot.desiredSkills,
      ...snapshot.entries
        .filter((entry) => entry.desired || entry.required)
        .map((entry) => entry.key),
    ]);
    for (const key of assignedKeys) {
      if (!key.trim()) continue;
      const set = agentIdsBySkill.get(key) ?? new Set<string>();
      set.add(agent.id);
      agentIdsBySkill.set(key, set);
      const entry = snapshot.entries.find((item) => item.key === key);
      if (entry?.runtimeName) labelByMissingKey.set(key, entry.runtimeName);
    }
  }

  return Array.from(agentIdsBySkill.entries())
    .map(([key, agentIds]) => {
      const skill = skillByKey.get(key);
      return {
        id: `skill:${key}`,
        key,
        layer: "skills" as const,
        label: skill?.name ?? labelByMissingKey.get(key) ?? key,
        subtitle: skill?.sourceLabel ?? (skill ? "Company skill" : "Runtime skill"),
        detail: `${agentIds.size} agent${agentIds.size === 1 ? "" : "s"} attached`,
        href: skill ? `/skills/${skill.id}` : null,
        agentIds: Array.from(agentIds),
        x: 0,
        y: 0,
        width: RESOURCE_W,
        height: RESOURCE_H,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

function buildKnowledgeResources(
  agents: Agent[],
  knowledgeNodes: CompanyCoreKnowledgeMapNode[],
): ResourceNode[] {
  const assignedByDepartment = new Map<string, Set<string>>();
  for (const agent of agents) {
    const key = departmentKeyForAgent(agent);
    if (!key) continue;
    const set = assignedByDepartment.get(key) ?? new Set<string>();
    set.add(agent.id);
    assignedByDepartment.set(key, set);
  }

  const scopedNodes = knowledgeNodes.filter((node) => node.type === "record" || node.type === "table");
  const nodesByDepartment = new Map<string, CompanyCoreKnowledgeMapNode[]>();
  for (const node of scopedNodes) {
    const key = departmentKeyForKnowledgeNode(node);
    if (!key || !assignedByDepartment.has(key)) continue;
    nodesByDepartment.set(key, [...(nodesByDepartment.get(key) ?? []), node]);
  }

  return Array.from(nodesByDepartment.entries())
    .map(([departmentKey, nodes]) => {
      const agentIds = Array.from(assignedByDepartment.get(departmentKey) ?? []);
      const kindCounts = knowledgeKindCounts(nodes);
      return {
        id: `knowledge:${departmentKey}`,
        key: departmentKey,
        layer: "knowledge" as const,
        label: canonicalKnowledgeDepartmentLabel(departmentKey) ?? `${departmentKey}. Knowledge`,
        subtitle: `${nodes.length} resource${nodes.length === 1 ? "" : "s"}`,
        detail: formatKnowledgeSummary(kindCounts),
        href: "/knowledge",
        agentIds,
        x: 0,
        y: 0,
        width: RESOURCE_W,
        height: RESOURCE_H,
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key, undefined, { numeric: true }));
}

function layoutResources(input: {
  skills: ResourceNode[];
  knowledge: ResourceNode[];
  startY: number;
  minWidth: number;
}): ResourceLayout {
  const activeSections = [
    { key: "skills" as const, label: "Skills", icon: GraduationCap, nodes: input.skills },
    { key: "knowledge" as const, label: "Knowledge", icon: BookOpen, nodes: input.knowledge },
  ].filter((section) => section.nodes.length > 0);

  if (activeSections.length === 0) {
    return { sections: [], nodes: [], width: input.minWidth, height: Math.max(0, input.startY - 18) };
  }

  const availableWidth = Math.max(input.minWidth - PADDING * 2, 680);
  const sectionWidth = (availableWidth - RESOURCE_SECTION_GAP * (activeSections.length - 1)) / activeSections.length;
  const sections: ResourceSectionLayout[] = [];
  const nodes: ResourceNode[] = [];
  let maxHeight = 0;

  activeSections.forEach((section, sectionIndex) => {
    const sectionX = PADDING + sectionIndex * (sectionWidth + RESOURCE_SECTION_GAP);
    const sectionY = input.startY;
    const columns = Math.max(1, Math.floor((sectionWidth + RESOURCE_GAP) / (RESOURCE_W + RESOURCE_GAP)));
    const cardWidth = Math.min(
      RESOURCE_W,
      (sectionWidth - RESOURCE_GAP * (columns - 1)) / columns,
    );
    const cardsStartY = sectionY + 34;
    section.nodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      nodes.push({
        ...node,
        x: sectionX + column * (cardWidth + RESOURCE_GAP),
        y: cardsStartY + row * (RESOURCE_H + RESOURCE_GAP),
        width: cardWidth,
        height: RESOURCE_H,
      });
    });
    const rows = Math.max(1, Math.ceil(section.nodes.length / columns));
    const height = 34 + rows * RESOURCE_H + (rows - 1) * RESOURCE_GAP;
    maxHeight = Math.max(maxHeight, height);
    sections.push({
      key: section.key,
      label: section.label,
      icon: section.icon,
      x: sectionX,
      y: sectionY,
      width: sectionWidth,
      height,
      count: section.nodes.length,
    });
  });

  return {
    sections,
    nodes,
    width: Math.max(input.minWidth, PADDING * 2 + availableWidth),
    height: input.startY + maxHeight + PADDING,
  };
}

function isRelationshipActive(input: {
  hoveredAgentId: string | null;
  hoveredResourceId: string | null;
  agentId: string;
  resource: ResourceNode;
}) {
  if (input.hoveredAgentId) return input.hoveredAgentId === input.agentId;
  if (input.hoveredResourceId) return input.hoveredResourceId === input.resource.id;
  return true;
}

function isResourceActive(input: {
  hoveredAgentId: string | null;
  hoveredResourceId: string | null;
  resource: ResourceNode;
}) {
  if (input.hoveredAgentId) return input.resource.agentIds.includes(input.hoveredAgentId);
  if (input.hoveredResourceId) return input.hoveredResourceId === input.resource.id;
  return true;
}

function isAgentActive(input: {
  hoveredAgentId: string | null;
  hoveredResourceId: string | null;
  agentId: string;
  resource: ResourceNode | null;
}) {
  if (input.hoveredAgentId) return input.hoveredAgentId === input.agentId;
  if (input.hoveredResourceId) return Boolean(input.resource?.agentIds.includes(input.agentId));
  return true;
}

function departmentKeyForAgent(agent: Pick<Agent, "name" | "title" | "urlKey" | "role" | "capabilities" | "metadata">) {
  const metadata = asRecord(agent.metadata);
  const candidates = [
    agent.name,
    agent.title ?? "",
    agent.capabilities ?? "",
    metadataString(metadata, "departmentKey") ?? "",
    metadataString(metadata, "department") ?? "",
    metadataString(metadata, "knowledgeDepartment") ?? "",
    roleDepartmentLabel(agent.role),
    agent.urlKey,
    agent.role,
  ];
  for (const value of candidates) {
    const match = value.match(/\b(0[0-9]|1[0-2])(?:\s*[.\-]|\s+)/);
    if (match?.[1]) return match[1];
    const codeMatch = value.match(/\b(AIA|CSO|CPO|CRO|COO|CCO|CHRO|CFO|CAO|CTO|CLO|CINO|CEO)\b/i);
    if (codeMatch?.[1]) return agentCodeDepartmentKeys[codeMatch[1].toUpperCase()] ?? null;
  }
  return roleDepartmentKeys[agent.role] ?? null;
}

function departmentKeyForKnowledgeNode(node: CompanyCoreKnowledgeMapNode) {
  for (const value of knowledgeDepartmentSearchValues(node)) {
    const match = value.match(/\b(0[0-9]|1[0-2])\s*[.\-]\s*[^/|]+/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function knowledgeDepartmentSearchValues(node: CompanyCoreKnowledgeMapNode) {
  return [
    node.label,
    node.subtitle ?? "",
    metadataString(node.metadata, "path") ?? "",
    metadataString(node.metadata, "folderPath") ?? "",
    metadataString(node.metadata, "folderName") ?? "",
    metadataString(node.metadata, "listName") ?? "",
    metadataString(node.metadata, "areaName") ?? "",
    metadataString(node.metadata, "tableName") ?? "",
  ];
}

function metadataString(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function roleDepartmentLabel(role: string) {
  const key = roleDepartmentKeys[role];
  return key ? canonicalKnowledgeDepartmentLabel(key) ?? "" : "";
}

function canonicalKnowledgeDepartmentLabel(key: string) {
  return {
    "00": "00. Main",
    "01": "01. Strategy",
    "02": "02. Product",
    "03": "03. Revenue",
    "04": "04. Operations",
    "05": "05. Customer",
    "06": "06. People",
    "07": "07. Finance",
    "08": "08. Assets",
    "09": "09. Technology",
    "10": "10. Legal",
    "11": "11. Innovation",
    "12": "12. Management",
  }[key];
}

function knowledgeKindCounts(nodes: CompanyCoreKnowledgeMapNode[]) {
  return nodes.reduce(
    (counts, node) => {
      if (node.type === "table") counts.tables += 1;
      else {
        const kind = metadataString(node.metadata, "kind");
        if (kind === "file") counts.files += 1;
        else if (kind === "task") counts.tasks += 1;
        else counts.notes += 1;
      }
      return counts;
    },
    { files: 0, tasks: 0, tables: 0, notes: 0 },
  );
}

function formatKnowledgeSummary(counts: { files: number; tasks: number; tables: number; notes: number }) {
  return [
    counts.files ? `${counts.files} files` : null,
    counts.tasks ? `${counts.tasks} tasks` : null,
    counts.tables ? `${counts.tables} tables` : null,
    counts.notes ? `${counts.notes} notes` : null,
  ].filter(Boolean).join(" / ") || "Department knowledge";
}

const roleDepartmentKeys: Record<string, string> = {
  ceo: "12",
  cto: "09",
  cpo: "02",
  coo: "04",
  cfo: "07",
  cmo: "05",
  pm: "02",
  designer: "02",
  engineer: "09",
  devops: "04",
  security: "10",
  qa: "02",
  researcher: "11",
};

const agentCodeDepartmentKeys: Record<string, string> = {
  AIA: "00",
  CSO: "01",
  CPO: "02",
  CRO: "03",
  COO: "04",
  CCO: "05",
  CHRO: "06",
  CFO: "07",
  CAO: "08",
  CTO: "09",
  CLO: "10",
  CINO: "11",
  CEO: "12",
};
