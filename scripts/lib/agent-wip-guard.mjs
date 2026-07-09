export function summarizeAgentWip({ activeRunCount = 0, liveRuns = [] } = {}) {
  const normalizedActiveRunCount = Number.isFinite(Number(activeRunCount))
    ? Math.max(0, Number(activeRunCount))
    : liveRuns.length;
  const busyAgentIds = new Set(liveRuns.map((run) => run.agentId).filter(Boolean));
  return {
    activeRunCount: normalizedActiveRunCount,
    liveRunCount: liveRuns.length,
    unknownActiveRunCount: Math.max(0, normalizedActiveRunCount - liveRuns.length),
    busyAgentIds,
  };
}

export function agentWipBlockerFor(agentId, state) {
  if (!agentId) return null;
  if ((state?.unknownActiveRunCount ?? 0) > 0) {
    return "unknown_active_run";
  }
  if (state?.busyAgentIds?.has(agentId)) {
    return "agent_live_run";
  }
  return null;
}

export async function fetchAgentWipState({ request, companyId }) {
  const [health, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${companyId}/live-runs?limit=50&minCount=0`),
  ]);
  return {
    ...summarizeAgentWip({
      activeRunCount: health.devServer?.activeRunCount ?? liveRuns.length,
      liveRuns,
    }),
    liveRuns,
  };
}
