import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, type OrgNode } from "../api/agents";
import { heartbeatsApi, type LiveRunForIssue } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { agentRouteRef, agentUrl, cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { AgentIcon } from "../components/AgentIconPicker";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FolderOpen,
  Maximize2,
  Minus,
  Network,
  Pause,
  Plus,
  Radio,
  Upload,
} from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";

// Layout constants
const CARD_W = 320;
const CARD_H = 82;
const CARD_EXPANDED_H = 166;
const GAP_X = 48;
const GAP_Y = 72;
const PADDING = 60;
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
  height: number;
  children: LayoutNode[];
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

function nodeHeight(nodeId: string, expandedAgentIds: ReadonlySet<string>): number {
  return expandedAgentIds.has(nodeId) ? CARD_EXPANDED_H : CARD_H;
}

/** Recursively assign x,y positions. */
function layoutTree(node: OrgNode, x: number, y: number, expandedAgentIds: ReadonlySet<string>): LayoutNode {
  const totalW = subtreeWidth(node);
  const layoutChildren: LayoutNode[] = [];
  const height = nodeHeight(node.id, expandedAgentIds);

  if (node.reports.length > 0) {
    const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
    const gaps = (node.reports.length - 1) * GAP_X;
    let cx = x + (totalW - childrenW - gaps) / 2;

    for (const child of node.reports) {
      const cw = subtreeWidth(child);
      layoutChildren.push(layoutTree(child, cx, y + height + GAP_Y, expandedAgentIds));
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
    height,
    children: layoutChildren,
  };
}

/** Layout all root nodes side by side. */
function layoutForest(roots: OrgNode[], expandedAgentIds: ReadonlySet<string>): LayoutNode[] {
  if (roots.length === 0) return [];

  let x = PADDING;
  const y = PADDING;

  const result: LayoutNode[] = [];
  for (const root of roots) {
    const w = subtreeWidth(root);
    result.push(layoutTree(root, x, y, expandedAgentIds));
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
  pending: "#a78bfa",
  pending_approval: "#a78bfa",
  blocked: "#f59e0b",
  idle: "#64748b",
  error: "#f87171",
  terminated: "#a3a3a3",
};
const defaultDotColor = "#a3a3a3";

type OrgNodeTone = "live" | "error" | "blocked" | "paused" | "pending" | "active" | "idle" | "terminated";

const orgNodeTone = {
  live: {
    label: "Live",
    accent: "#22d3ee",
    card: "border-cyan-400/45 bg-cyan-500/[0.045] shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_14px_34px_rgba(34,211,238,0.12)]",
    icon: "bg-cyan-500/15 text-cyan-200",
    chip: "bg-cyan-500/12 text-cyan-300",
    rail: "bg-cyan-400",
    Icon: Radio,
  },
  error: {
    label: "Error",
    accent: "#f87171",
    card: "border-red-400/45 bg-red-500/[0.045] shadow-[0_14px_34px_rgba(248,113,113,0.08)]",
    icon: "bg-red-500/15 text-red-200",
    chip: "bg-red-500/12 text-red-300",
    rail: "bg-red-400",
    Icon: AlertTriangle,
  },
  blocked: {
    label: "Blocked",
    accent: "#f59e0b",
    card: "border-amber-400/35 bg-amber-500/[0.04]",
    icon: "bg-amber-500/15 text-amber-200",
    chip: "bg-amber-500/12 text-amber-300",
    rail: "bg-amber-400",
    Icon: AlertTriangle,
  },
  paused: {
    label: "Paused",
    accent: "#94a3b8",
    card: "border-slate-500/30 bg-slate-500/[0.035]",
    icon: "bg-slate-500/12 text-slate-200",
    chip: "bg-slate-500/12 text-slate-300",
    rail: "bg-slate-500",
    Icon: Pause,
  },
  pending: {
    label: "Pending",
    accent: "#a78bfa",
    card: "border-violet-400/35 bg-violet-500/[0.04]",
    icon: "bg-violet-500/15 text-violet-200",
    chip: "bg-violet-500/12 text-violet-300",
    rail: "bg-violet-400",
    Icon: Clock3,
  },
  active: {
    label: "Ready",
    accent: "#4ade80",
    card: "border-emerald-400/22",
    icon: "bg-emerald-500/10 text-emerald-200",
    chip: "bg-emerald-500/10 text-emerald-300",
    rail: "bg-emerald-400",
    Icon: CheckCircle2,
  },
  idle: {
    label: "Idle",
    accent: "#64748b",
    card: "border-slate-600/26 bg-slate-500/[0.025]",
    icon: "bg-slate-500/10 text-slate-300",
    chip: "bg-slate-500/12 text-slate-300",
    rail: "bg-slate-500/80",
    Icon: Clock3,
  },
  terminated: {
    label: "Off",
    accent: "#737373",
    card: "border-neutral-500/25 opacity-75",
    icon: "bg-neutral-500/10 text-neutral-300",
    chip: "bg-neutral-500/12 text-neutral-300",
    rail: "bg-neutral-500",
    Icon: Pause,
  },
} satisfies Record<OrgNodeTone, {
  label: string;
  accent: string;
  card: string;
  icon: string;
  chip: string;
  rail: string;
  Icon: typeof Radio;
}>;

// ── Main component ──────────────────────────────────────────────────────

function isLiveRun(run: LiveRunForIssue): boolean {
  return run.status === "queued" || run.status === "running";
}

function normalizeRunTime(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function buildLiveRunByAgent(runs: readonly LiveRunForIssue[] | undefined) {
  const map = new Map<string, {
    runId: string;
    runStatus: string;
    liveCount: number;
    issueId: string | null;
    startedAt: string | null;
    livenessState: string | null;
    outputSilenceState: string | null;
  }>();
  for (const run of runs ?? []) {
    if (!isLiveRun(run)) continue;
    const existing = map.get(run.agentId);
    if (existing) {
      existing.liveCount += 1;
      existing.startedAt ??= normalizeRunTime(run.startedAt ?? run.createdAt);
      continue;
    }
    map.set(run.agentId, {
      runId: run.id,
      runStatus: run.status,
      liveCount: 1,
      issueId: run.issueId ?? null,
      startedAt: normalizeRunTime(run.startedAt ?? run.createdAt),
      livenessState: typeof run.livenessState === "string" ? run.livenessState : null,
      outputSilenceState: typeof run.outputSilence?.level === "string" ? run.outputSilence.level : null,
    });
  }
  return map;
}

function toneForNode(status: string, liveRun: ReturnType<typeof buildLiveRunByAgent> extends Map<string, infer T> ? T | undefined : never): OrgNodeTone {
  if (liveRun) return "live";
  if (status === "error") return "error";
  if (status === "blocked") return "blocked";
  if (status === "paused") return "paused";
  if (status === "pending_approval" || status === "pending") return "pending";
  if (status === "idle") return "idle";
  if (status === "terminated" || status === "archived") return "terminated";
  return "active";
}

function statusLabel(status: string, liveRun: ReturnType<typeof buildLiveRunByAgent> extends Map<string, infer T> ? T | undefined : never): string {
  if (!liveRun) return orgNodeTone[toneForNode(status, undefined)].label;
  if (liveRun.runStatus === "queued") return "Queued";
  if (liveRun.livenessState && liveRun.livenessState !== "healthy") return liveRun.livenessState.replace(/_/g, " ");
  if (
    liveRun.outputSilenceState &&
    liveRun.outputSilenceState !== "fresh" &&
    liveRun.outputSilenceState !== "ok"
  ) return liveRun.outputSilenceState.replace(/_/g, " ");
  return "Live";
}

function collectActiveOrgBranchIds(nodes: OrgNode[], liveRunByAgent: Map<string, unknown>) {
  const activeIds = new Set<string>();

  function walk(node: OrgNode): boolean {
    const selfActive = liveRunByAgent.has(node.id);
    let childActive = false;
    for (const child of node.reports) {
      childActive = walk(child) || childActive;
    }
    if (selfActive || childActive) activeIds.add(node.id);
    return selfActive || childActive;
  }

  nodes.forEach(walk);
  return activeIds;
}

function compareOrgNodesByName(left: OrgNode, right: OrgNode): number {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
}

export function sortOrgTreeByName(nodes: OrgNode[]): OrgNode[] {
  return [...nodes]
    .sort(compareOrgNodesByName)
    .map((node) => ({
      ...node,
      reports: sortOrgTreeByName(node.reports),
    }));
}

export function OrgChart() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

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

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Org Chart" }]);
  }, [setBreadcrumbs]);

  const sortedOrgTree = useMemo(() => sortOrgTreeByName(orgTree ?? []), [orgTree]);
  const liveRunByAgent = useMemo(() => buildLiveRunByAgent(liveRuns), [liveRuns]);
  const activeBranchIds = useMemo(() => collectActiveOrgBranchIds(sortedOrgTree, liveRunByAgent), [sortedOrgTree, liveRunByAgent]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [expandedAgentIds, setExpandedAgentIds] = useState<Set<string>>(() => new Set());
  const layout = useMemo(() => layoutForest(sortedOrgTree, expandedAgentIds), [sortedOrgTree, expandedAgentIds]);
  const allNodes = useMemo(() => flattenLayout(layout), [layout]);
  const edges = useMemo(() => collectEdges(layout), [layout]);
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

  const toggleExpandedAgent = useCallback((agentId: string) => {
    setExpandedAgentIds((current) => {
      const next = new Set(current);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }, []);

  // Compute SVG bounds
  const bounds = useMemo(() => {
    if (allNodes.length === 0) return { width: 800, height: 600 };
    let maxX = 0, maxY = 0;
    for (const n of allNodes) {
      maxX = Math.max(maxX, n.x + CARD_W);
      maxY = Math.max(maxY, n.y + n.height);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [allNodes]);

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
        <Link to="/projects">
          <Button variant="outline" size="sm">
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Projects
          </Button>
        </Link>
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
          <defs>
            <linearGradient id="org-live-flow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.05" />
              <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="org-state-flow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.18" />
              <stop offset="52%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.28" />
            </linearGradient>
            <filter id="org-live-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {edges.map(({ parent, child }) => {
              const x1 = parent.x + CARD_W / 2;
              const y1 = parent.y + parent.height;
              const x2 = child.x + CARD_W / 2;
              const y2 = child.y;
              const midY = (y1 + y2) / 2;
              const path = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
              const liveEdge = activeBranchIds.has(parent.id) && activeBranchIds.has(child.id);
              const childToneKey = toneForNode(child.status, liveRunByAgent.get(child.id));
              const childTone = orgNodeTone[childToneKey];
              const stateEdge =
                childToneKey === "error" ||
                childToneKey === "blocked" ||
                childToneKey === "pending";

              return (
                <g key={`${parent.id}-${child.id}`}>
                  <path
                    data-testid="org-chart-edge"
                    d={path}
                    fill="none"
                    stroke={liveEdge ? "url(#org-state-flow)" : stateEdge ? childTone.accent : "var(--border)"}
                    strokeDasharray={stateEdge && !liveEdge ? "4 6" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={liveEdge ? 0.72 : stateEdge ? 0.68 : 1}
                    strokeWidth={liveEdge || stateEdge ? 1.75 : 1.5}
                  />
                  {liveEdge && (
                    <>
                      <path
                        d={path}
                        fill="none"
                        stroke="url(#org-live-flow)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={0.18}
                        strokeWidth={8}
                        filter="url(#org-live-glow)"
                      />
                      <path
                        data-testid="org-chart-live-edge"
                        d={path}
                        fill="none"
                        stroke="url(#org-live-flow)"
                        strokeDasharray="14 34"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={4.5}
                        filter="url(#org-live-glow)"
                      >
                        <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.65s" repeatCount="indefinite" />
                      </path>
                      <circle r="3.4" fill={childTone.accent} opacity="0.92" filter="url(#org-live-glow)">
                        <animateMotion dur="2.8s" repeatCount="indefinite" path={path} />
                      </circle>
                    </>
                  )}
                </g>
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
            const liveRun = liveRunByAgent.get(node.id);
            const isLive = Boolean(liveRun);
            const activeBranch = activeBranchIds.has(node.id);
            const isExpanded = expandedAgentIds.has(node.id);
            const toneKey = toneForNode(node.status, liveRun);
            const tone = orgNodeTone[toneKey];
            const ToneIcon = tone.Icon;

            return (
              <div
                key={node.id}
                data-org-card
                data-live={isLive ? "true" : "false"}
                className={cn(
                  "org-card-glass absolute overflow-visible rounded-lg border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-150 cursor-pointer select-none hover:shadow-md hover:border-foreground/20",
                  tone.card,
                  !isLive && activeBranch && "border-cyan-500/20",
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: CARD_W,
                  height: node.height,
                }}
                onClickCapture={(e) => {
                  if (!suppressNextCardClick.current) return;
                  suppressNextCardClick.current = false;
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {isLive && (
                  <span className="org-card-plasma pointer-events-none absolute -inset-3 rounded-xl" />
                )}
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <span className="org-card-glass-surface pointer-events-none absolute inset-0" />
                  {isLive && (
                    <span className="pointer-events-none absolute inset-0 rounded-lg border border-cyan-200/20">
                      <span className="absolute -inset-px rounded-lg border border-cyan-300/15 animate-pulse" />
                    </span>
                  )}
                  {activeBranch && !isLive && (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                  )}
                  <span className={cn("pointer-events-none absolute inset-y-0 left-0 w-1", tone.rail)} />
                </div>
                <div className="relative z-[1] flex h-full flex-col">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-4 text-left transition-colors hover:bg-accent/20",
                      isExpanded ? "py-3" : "h-full py-2",
                    )}
                    aria-expanded={isExpanded}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandedAgent(node.id);
                    }}
                  >
                    {/* Agent icon + status dot */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full bg-muted",
                        tone.icon,
                      )}>
                        <AgentIcon icon={agent?.icon} className="h-4.5 w-4.5 text-foreground/70" />
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
                        style={{ backgroundColor: dotColor }}
                      />
                      {isLive && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
                        </span>
                      )}
                    </div>
                    {/* Name + role */}
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <div className="flex w-full min-w-0 items-start gap-1.5">
                        <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-tight text-foreground">
                          {node.name}
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none",
                            tone.chip,
                          )}
                          title={liveRun?.liveCount && liveRun.liveCount > 1 ? `${liveRun.liveCount} live runs` : statusLabel(node.status, liveRun)}
                        >
                          <ToneIcon className="h-2.5 w-2.5" />
                          {liveRun?.liveCount && liveRun.liveCount > 1 ? liveRun.liveCount : statusLabel(node.status, liveRun)}
                        </span>
                        {liveRun && (
                          <Link
                            to={`/agents/${agent ? agentRouteRef(agent) : node.id}/runs/${liveRun.runId}`}
                            className="inline-flex shrink-0 rounded-full bg-background/50 px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none text-cyan-300 no-underline hover:bg-cyan-500/20"
                            onClick={(e) => e.stopPropagation()}
                            title={liveRun.liveCount > 1 ? `${liveRun.liveCount} live runs` : "Live run"}
                          >
                            Open
                          </Link>
                        )}
                      </div>
                      <span className="mt-1 line-clamp-1 max-w-full text-[11px] leading-tight text-muted-foreground">
                        {agent?.title ?? roleLabel(node.role)}
                      </span>
                    </div>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border/50 px-4 pb-3 pt-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {agent && (
                          <span className="min-w-0 truncate text-[10px] text-muted-foreground/60 font-mono leading-tight">
                            {getAdapterLabel(agent.adapterType)}
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center justify-center rounded border border-border/70 bg-background/60 p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label={`Open ${node.name}`}
                          title={`Open ${node.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(agent ? agentUrl(agent) : `/agents/${node.id}`);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      {agent?.capabilities ? (
                        <p className="m-0 line-clamp-3 text-[10px] leading-snug text-muted-foreground/80">
                          {agent.capabilities}
                        </p>
                      ) : (
                        <p className="m-0 text-[10px] leading-snug text-muted-foreground/65">
                          {roleLabel(node.role)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
