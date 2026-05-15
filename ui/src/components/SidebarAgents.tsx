import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Users,
} from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useSidebar } from "../context/SidebarContext";
import { useToastActions } from "../context/ToastContext";
import { agentsApi } from "../api/agents";
import { authApi } from "../api/auth";
import { heartbeatsApi } from "../api/heartbeats";
import { SIDEBAR_SCROLL_RESET_STATE } from "../lib/navigation-scroll";
import { queryKeys } from "../lib/queryKeys";
import { cn, agentRouteRef, agentUrl } from "../lib/utils";
import { useAgentOrder } from "../hooks/useAgentOrder";
import {
  AGENT_SORT_MODE_UPDATED_EVENT,
  getAgentSortModeStorageKey,
  readAgentSortMode,
  type AgentSortModeUpdatedDetail,
  type AgentSidebarSortMode,
  writeAgentSortMode,
} from "../lib/agent-order";
import { AgentIcon } from "./AgentIconPicker";
import { BudgetSidebarMarker } from "./BudgetSidebarMarker";
import { SidebarSection, type SidebarSectionRadioChoice } from "./SidebarSection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Agent } from "@paperclipai/shared";

const AGENT_SORT_CHOICES: SidebarSectionRadioChoice[] = [
  { value: "top", label: "Top" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "recent", label: "Recent" },
];

type SidebarAgentTreeNode = {
  agent: Agent;
  children: SidebarAgentTreeNode[];
};

function agentTimestamp(agent: Agent, field: "lastHeartbeatAt" | "updatedAt" | "createdAt"): number {
  const raw = agent[field];
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortAgents(agents: Agent[], sortMode: AgentSidebarSortMode): Agent[] {
  if (sortMode === "top") return agents;
  const sorted = [...agents];
  if (sortMode === "alphabetical") {
    sorted.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    return sorted;
  }
  sorted.sort((left, right) => {
    const heartbeatDiff = agentTimestamp(right, "lastHeartbeatAt") - agentTimestamp(left, "lastHeartbeatAt");
    if (heartbeatDiff !== 0) return heartbeatDiff;

    const updatedDiff = agentTimestamp(right, "updatedAt") - agentTimestamp(left, "updatedAt");
    if (updatedDiff !== 0) return updatedDiff;

    const createdDiff = agentTimestamp(right, "createdAt") - agentTimestamp(left, "createdAt");
    return createdDiff !== 0
      ? createdDiff
      : left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
  return sorted;
}

function buildAgentTree(agents: Agent[]): SidebarAgentTreeNode[] {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const nodes = new Map<string, SidebarAgentTreeNode>(
    agents.map((agent) => [agent.id, { agent, children: [] }]),
  );
  const roots: SidebarAgentTreeNode[] = [];

  for (const agent of agents) {
    const node = nodes.get(agent.id);
    if (!node) continue;
    const parentId = agent.reportsTo && byId.has(agent.reportsTo) && agent.reportsTo !== agent.id
      ? agent.reportsTo
      : null;
    const parent = parentId ? nodes.get(parentId) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function isAiAgent(agent: Agent): boolean {
  const identifiers = [agent.id, agent.name, agent.urlKey].filter(Boolean);
  return identifiers.some((value) => value.toLowerCase() === "ai");
}

function collectDefaultCollapsedAgentIds(agentTree: SidebarAgentTreeNode[]): Set<string> {
  const defaultExpandedRoot = agentTree.find((node) => isAiAgent(node.agent)) ?? agentTree[0] ?? null;
  const collapsed = new Set<string>();

  const visit = (node: SidebarAgentTreeNode) => {
    if (node.children.length > 0 && node.agent.id !== defaultExpandedRoot?.agent.id) {
      collapsed.add(node.agent.id);
    }
    for (const child of node.children) visit(child);
  };

  for (const node of agentTree) visit(node);
  return collapsed;
}

function collectParentIds(agent: Agent | undefined, agentsById: Map<string, Agent>): string[] {
  const parentIds: string[] = [];
  const seen = new Set<string>();
  let cursor = agent?.reportsTo ?? null;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const parent = agentsById.get(cursor);
    if (!parent) break;
    parentIds.push(parent.id);
    cursor = parent.reportsTo;
  }

  return parentIds;
}

function SidebarAgentItem({
  activeAgentId,
  activeTab,
  agent,
  disabled,
  depth,
  expanded,
  hasChildren,
  isMobile,
  onToggleExpanded,
  onPauseResume,
  runCount,
  setSidebarOpen,
}: {
  activeAgentId: string | null;
  activeTab: string | null;
  agent: Agent;
  disabled: boolean;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  isMobile: boolean;
  onToggleExpanded: (agentId: string) => void;
  onPauseResume: (agent: Agent, action: "pause" | "resume") => void;
  runCount: number;
  setSidebarOpen: (open: boolean) => void;
}) {
  const routeRef = agentRouteRef(agent);
  const href = activeTab ? `${agentUrl(agent)}/${activeTab}` : agentUrl(agent);
  const editHref = `${agentUrl(agent)}/configuration`;
  const isActive = activeAgentId === routeRef;
  const isPaused = agent.status === "paused";
  const isBudgetPaused = isPaused && agent.pauseReason === "budget";
  const pauseResumeLabel = isPaused ? "Resume agent" : "Pause agent";
  const pauseResumeDisabled = disabled || agent.status === "pending_approval" || isBudgetPaused;
  const pauseResumeDisabledLabel = disabled
    ? "Updating..."
    : isBudgetPaused
      ? "Budget paused"
      : pauseResumeLabel;
  const indent = depth * 14;

  return (
    <div
      className="group/agent relative flex items-center"
      style={{ paddingLeft: indent }}
    >
      {hasChildren ? (
        <button
          type="button"
          className="ml-1 flex h-6 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/70 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={expanded ? `Collapse ${agent.name} reports` : `Expand ${agent.name} reports`}
          aria-expanded={expanded}
          onClick={() => onToggleExpanded(agent.id)}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className="ml-1 h-6 w-5 shrink-0" aria-hidden="true" />
      )}
      <NavLink
        to={href}
        state={SIDEBAR_SCROLL_RESET_STATE}
        onClick={() => {
          if (isMobile) setSidebarOpen(false);
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 pr-8 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-accent text-foreground"
            : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <AgentIcon icon={agent.icon} className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate">{agent.name}</span>
        {(agent.pauseReason === "budget" || runCount > 0) && (
          <span className="ml-auto flex items-center gap-1.5 shrink-0">
            {agent.pauseReason === "budget" ? (
              <BudgetSidebarMarker title="Agent paused by budget" />
            ) : null}
            {runCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            ) : null}
            {runCount > 0 ? (
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                {runCount} live
              </span>
            ) : null}
          </span>
        )}
      </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              "absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transition-opacity data-[state=open]:pointer-events-auto data-[state=open]:opacity-100",
              isMobile
                ? "opacity-100"
                : "pointer-events-none opacity-0 group-hover/agent:pointer-events-auto group-hover/agent:opacity-100 group-focus-within/agent:pointer-events-auto group-focus-within/agent:opacity-100",
            )}
            aria-label={`Open actions for ${agent.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link
              to={editHref}
              onClick={() => {
                if (isMobile) setSidebarOpen(false);
              }}
            >
              <Pencil className="size-4" />
              <span>Edit agent</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (pauseResumeDisabled) return;
              onPauseResume(agent, isPaused ? "resume" : "pause");
            }}
            disabled={pauseResumeDisabled}
            title={isBudgetPaused ? "Agent was paused by budget limits" : undefined}
          >
            {isPaused ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
            <span>{pauseResumeDisabledLabel}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SidebarAgents() {
  const [open, setOpen] = useState(true);
  const [pendingAgentIds, setPendingAgentIds] = useState<Set<string>>(() => new Set());
  const [collapsedAgentIds, setCollapsedAgentIds] = useState<Set<string>>(() => new Set());
  const collapsedStateKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const { openNewAgent } = useDialogActions();
  const { isMobile, setSidebarOpen } = useSidebar();
  const { pushToast } = useToastActions();
  const location = useLocation();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });

  const liveCountByAgent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const run of liveRuns ?? []) {
      counts.set(run.agentId, (counts.get(run.agentId) ?? 0) + 1);
    }
    return counts;
  }, [liveRuns]);

  const visibleAgents = useMemo(() => {
    const filtered = (agents ?? []).filter(
      (a: Agent) => a.status !== "terminated"
    );
    return filtered;
  }, [agents]);
  const currentUserId = session?.user?.id ?? session?.session?.userId ?? null;
  const sortModeStorageKey = useMemo(() => {
    if (!selectedCompanyId) return null;
    return getAgentSortModeStorageKey(selectedCompanyId, currentUserId);
  }, [currentUserId, selectedCompanyId]);
  const [sortMode, setSortMode] = useState<AgentSidebarSortMode>(() => {
    if (!sortModeStorageKey) return "top";
    return readAgentSortMode(sortModeStorageKey);
  });
  const { orderedAgents } = useAgentOrder({
    agents: visibleAgents,
    companyId: selectedCompanyId,
    userId: currentUserId,
  });
  const sortedAgents = useMemo(
    () => sortAgents(orderedAgents, sortMode),
    [orderedAgents, sortMode],
  );
  const agentTree = useMemo(() => buildAgentTree(sortedAgents), [sortedAgents]);
  const collapsedStateKey = useMemo(
    () => sortedAgents.map((agent) => `${agent.id}:${agent.reportsTo ?? ""}`).join("|"),
    [sortedAgents],
  );
  const sortedAgentsById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of sortedAgents) map.set(agent.id, agent);
    return map;
  }, [sortedAgents]);

  const agentMatch = location.pathname.match(/^\/(?:[^/]+\/)?agents\/([^/]+)(?:\/([^/]+))?/);
  const activeAgentId = agentMatch?.[1] ?? null;
  const activeTab = agentMatch?.[2] ?? null;
  const activeAgent = useMemo(() => {
    if (!activeAgentId) return undefined;
    return sortedAgents.find(
      (agent) => agentRouteRef(agent) === activeAgentId || agent.id === activeAgentId,
    );
  }, [activeAgentId, sortedAgents]);

  useEffect(() => {
    if (!sortModeStorageKey) {
      setSortMode("top");
      return;
    }
    setSortMode(readAgentSortMode(sortModeStorageKey));
  }, [sortModeStorageKey]);

  useEffect(() => {
    if (!sortModeStorageKey) return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== sortModeStorageKey) return;
      setSortMode(readAgentSortMode(sortModeStorageKey));
    };
    const onCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<AgentSortModeUpdatedDetail>).detail;
      if (!detail || detail.storageKey !== sortModeStorageKey) return;
      setSortMode(detail.sortMode);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(AGENT_SORT_MODE_UPDATED_EVENT, onCustomEvent);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AGENT_SORT_MODE_UPDATED_EVENT, onCustomEvent);
    };
  }, [sortModeStorageKey]);

  const persistSortMode = useCallback(
    (value: string) => {
      const nextSortMode: AgentSidebarSortMode =
        value === "alphabetical" || value === "recent" ? value : "top";
      setSortMode(nextSortMode);
      if (sortModeStorageKey) {
        writeAgentSortMode(sortModeStorageKey, nextSortMode);
      }
    },
    [sortModeStorageKey],
  );

  useEffect(() => {
    if (!selectedCompanyId || sortedAgents.length === 0) {
      collapsedStateKeyRef.current = null;
      setCollapsedAgentIds(new Set());
      return;
    }

    const nextKey = `${selectedCompanyId}:${collapsedStateKey}`;
    if (collapsedStateKeyRef.current === nextKey) return;
    collapsedStateKeyRef.current = nextKey;
    setCollapsedAgentIds(collectDefaultCollapsedAgentIds(agentTree));
  }, [agentTree, collapsedStateKey, selectedCompanyId, sortedAgents.length]);

  useEffect(() => {
    const parentIds = collectParentIds(activeAgent, sortedAgentsById);
    if (parentIds.length === 0) return;
    setCollapsedAgentIds((current) => {
      let changed = false;
      const next = new Set(current);
      for (const parentId of parentIds) {
        if (next.delete(parentId)) changed = true;
      }
      return changed ? next : current;
    });
  }, [activeAgent, sortedAgentsById]);

  const toggleAgentExpanded = useCallback((agentId: string) => {
    setCollapsedAgentIds((current) => {
      const next = new Set(current);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const pauseResumeAgent = useMutation({
    mutationFn: ({ agent, action }: { agent: Agent; action: "pause" | "resume" }) =>
      action === "pause"
        ? agentsApi.pause(agent.id, selectedCompanyId ?? undefined)
        : agentsApi.resume(agent.id, selectedCompanyId ?? undefined),
    onMutate: ({ agent }) => {
      setPendingAgentIds((current) => {
        const next = new Set(current);
        next.add(agent.id);
        return next;
      });
    },
    onSuccess: async (_agent, { agent, action }) => {
      if (selectedCompanyId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(selectedCompanyId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(selectedCompanyId) }),
        ]);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentRouteRef(agent)) }),
      ]);
      pushToast({
        title: action === "pause" ? "Agent paused" : "Agent resumed",
        body: agent.name,
        tone: "success",
      });
    },
    onError: (error, { agent, action }) => {
      pushToast({
        title: action === "pause" ? "Could not pause agent" : "Could not resume agent",
        body: error instanceof Error ? error.message : agent.name,
        tone: "error",
      });
    },
    onSettled: (_data, _error, { agent }) => {
      setPendingAgentIds((current) => {
        const next = new Set(current);
        next.delete(agent.id);
        return next;
      });
    },
  });

  const renderAgentNode = useCallback(
    (node: SidebarAgentTreeNode, depth: number): ReactNode => {
      const runCount = liveCountByAgent.get(node.agent.id) ?? 0;
      const hasChildren = node.children.length > 0;
      const expanded = !collapsedAgentIds.has(node.agent.id);
      return (
        <div key={node.agent.id} className="flex flex-col gap-0.5">
          <SidebarAgentItem
            activeAgentId={activeAgentId}
            activeTab={activeTab}
            agent={node.agent}
            depth={depth}
            disabled={pendingAgentIds.has(node.agent.id)}
            expanded={expanded}
            hasChildren={hasChildren}
            isMobile={isMobile}
            onToggleExpanded={toggleAgentExpanded}
            onPauseResume={(targetAgent, action) => pauseResumeAgent.mutate({ agent: targetAgent, action })}
            runCount={runCount}
            setSidebarOpen={setSidebarOpen}
          />
          {hasChildren && expanded ? (
            <div className="flex flex-col gap-0.5">
              {node.children.map((child) => renderAgentNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    },
    [
      activeAgentId,
      activeTab,
      collapsedAgentIds,
      isMobile,
      liveCountByAgent,
      pauseResumeAgent,
      pendingAgentIds,
      setSidebarOpen,
      toggleAgentExpanded,
    ],
  );

  return (
    <SidebarSection
      label="Agents"
      collapsible={{ open, onOpenChange: setOpen }}
      headerAction={{
        ariaLabel: "New agent",
        icon: Plus,
        onClick: openNewAgent,
      }}
      menu={{
        ariaLabel: "Agents section actions",
        actions: [
          { type: "item", label: "Browse agents", icon: Users, href: "/agents/all" },
          { type: "separator" },
        ],
        radioLabel: "Agent sort",
        radioChoices: AGENT_SORT_CHOICES,
        radioValue: sortMode,
        onRadioValueChange: persistSortMode,
      }}
    >
      {agentTree.map((node) => renderAgentNode(node, 0))}
    </SidebarSection>
  );
}
