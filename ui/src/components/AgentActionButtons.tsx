import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Agent } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";

export function RunButton({
  onClick,
  disabled,
  label = "Run now",
  size = "sm",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
}) {
  return (
    <Button variant="outline" size={size} onClick={onClick} disabled={disabled}>
      <Play className="h-3.5 w-3.5 sm:mr-1" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

export function PauseResumeButton({
  isPaused,
  onPause,
  onResume,
  disabled,
  size = "sm",
}: {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  if (isPaused) {
    return (
      <Button variant="outline" size={size} onClick={onResume} disabled={disabled}>
        <Play className="h-3.5 w-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Resume</span>
      </Button>
    );
  }

  return (
    <Button variant="outline" size={size} onClick={onPause} disabled={disabled}>
      <Pause className="h-3.5 w-3.5 sm:mr-1" />
      <span className="hidden sm:inline">Pause</span>
    </Button>
  );
}

export function AgentActionButtons({
  agent,
  companyId,
  runLabel = "Run now",
}: {
  agent: Agent;
  companyId: string;
  runLabel?: string;
}) {
  const queryClient = useQueryClient();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refreshAgentQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) }),
      agent.urlKey
        ? queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.urlKey) })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.runtimeState(agent.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.taskSessions(agent.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.heartbeats(companyId, agent.id) }),
    ]);
  }

  async function clearError() {
    setBusy(true);
    try {
      await agentsApi.clearError(agent.id, companyId);
      await refreshAgentQueries();
    } finally {
      setBusy(false);
    }
  }

  async function pause() {
    setBusy(true);
    try {
      await agentsApi.pause(agent.id, companyId);
      await refreshAgentQueries();
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    try {
      await agentsApi.resume(agent.id, companyId);
      await refreshAgentQueries();
    } finally {
      setBusy(false);
    }
  }

  async function invoke() {
    setBusy(true);
    try {
      await agentsApi.invoke(agent.id, companyId);
      await refreshAgentQueries();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <RunButton onClick={invoke} disabled={busy} label={runLabel} />
      {agent.status === "error" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={clearError}
          disabled={busy}
          aria-label="Clear error and return agent to idle"
        >
          Clear error
        </Button>
      ) : (
        <PauseResumeButton
          isPaused={agent.status === "paused"}
          onPause={pause}
          onResume={resume}
          disabled={busy}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Open actions for ${agent.name}`}
        onClick={() => setActionsOpen((open) => !open)}
      >
        Actions
      </Button>
      {actionsOpen && (
        <div role="menu" className="absolute mt-10 rounded-md border bg-popover p-1 text-sm shadow">
          <button role="menuitem" className="block px-2 py-1" type="button">
            Reset Sessions
          </button>
        </div>
      )}
    </div>
  );
}
