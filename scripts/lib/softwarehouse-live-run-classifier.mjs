const routineExecutionOrigin = "routine_execution";

function isSelfRun(run, currentRunId, currentIssueId) {
  return Boolean(
    (currentRunId && run.id === currentRunId)
      || (currentIssueId && run.issueId === currentIssueId)
      || (currentIssueId && run.issueIdentifier === currentIssueId),
  );
}

async function readRunIssue(apiBase, run, fetchImpl, issueLookupTimeoutMs) {
  const issueRef = run.issueId ?? run.issueIdentifier ?? null;
  if (!issueRef) return null;

  const response = await fetchImpl(`${apiBase}/api/issues/${encodeURIComponent(issueRef)}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(issueLookupTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`issue_lookup_failed:${response.status}`);
  }
  return response.json();
}

export async function classifyLiveRuns({
  apiBase,
  liveRuns,
  issues = null,
  currentRunId = null,
  currentIssueId = null,
  fetchImpl = fetch,
  issueLookupTimeoutMs = Number(process.env.SOFTWAREHOUSE_LIVE_RUN_ISSUE_TIMEOUT_MS ?? 30_000),
}) {
  const issueById = Array.isArray(issues)
    ? new Map(issues.map((issue) => [issue.id, issue]))
    : null;
  const normalizedLiveRuns = Array.isArray(liveRuns)
    ? liveRuns.map((run) => ({
        id: run.id,
        status: run.status ?? null,
        issueId: run.issueId ?? null,
        issueIdentifier: run.issueIdentifier ?? null,
        agentId: run.agentId ?? null,
        agentName: run.agentName ?? null,
        lastOutputAt: run.lastOutputAt ?? null,
        effectiveQuotaLane: run.effectiveQuotaLane ?? null,
        effectiveModel: run.effectiveModel ?? run.effectiveDefaultModel ?? null,
      }))
    : [];
  const selfRuns = normalizedLiveRuns.filter((run) => isSelfRun(run, currentRunId, currentIssueId));
  const selfRunIds = new Set(selfRuns.map((run) => run.id));
  const externalRuns = normalizedLiveRuns.filter((run) => !selfRunIds.has(run.id));

  const classified = await Promise.all(externalRuns.map(async (run) => {
    try {
      const issueRef = run.issueId ?? run.issueIdentifier ?? null;
      const catalogIssue = issueById?.get(issueRef) ?? null;
      const issue = catalogIssue
        ?? await readRunIssue(apiBase, run, fetchImpl, issueLookupTimeoutMs);
      return {
        run: {
          ...run,
          issueProjectId: issue?.projectId ?? null,
          issueTitle: issue?.title ?? null,
        },
        issueOriginKind: issue?.originKind ?? null,
        isControllerRun: issue?.originKind === routineExecutionOrigin,
        classificationError: null,
      };
    } catch (error) {
      return {
        run,
        issueOriginKind: null,
        isControllerRun: false,
        classificationError: String(error?.message ?? error),
      };
    }
  }));

  const controllerRuns = classified.filter((entry) => entry.isControllerRun).map((entry) => entry.run);
  const productiveRuns = classified.filter((entry) => !entry.isControllerRun).map((entry) => entry.run);
  const classificationErrors = classified
    .filter((entry) => entry.classificationError)
    .map((entry) => ({ runId: entry.run.id, issueId: entry.run.issueId, error: entry.classificationError }));

  return {
    observedLiveRunCount: normalizedLiveRuns.length,
    ignoredSelfRunCount: selfRuns.length,
    ignoredControllerRunCount: controllerRuns.length,
    liveRunCount: productiveRuns.length,
    controllerRunCount: controllerRuns.length,
    liveRuns: productiveRuns,
    controllerRuns,
    ignoredSelfRuns: selfRuns,
    classificationErrors,
  };
}
