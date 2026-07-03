import type { ActiveRunForIssue, LiveRunForIssue } from "../api/heartbeats";
import type { RunTranscriptSource } from "../components/transcript/useLiveRunTranscripts";
import type { IssueChatLinkedRun } from "./issue-chat-messages";

export function resolveIssueChatTranscriptRuns(args: {
  linkedRuns?: readonly IssueChatLinkedRun[];
  liveRuns?: readonly LiveRunForIssue[];
  activeRun?: ActiveRunForIssue | null;
}): RunTranscriptSource[] {
  const { linkedRuns = [], liveRuns = [], activeRun = null } = args;
  const combined = new Map<string, RunTranscriptSource>();

  for (const run of liveRuns) {
    combined.set(run.id, {
      id: run.id,
      status: run.status,
      adapterType: run.adapterType,
      logBytes: run.logBytes,
      lastOutputBytes: run.lastOutputBytes,
    });
  }

  if (activeRun) {
    combined.set(activeRun.id, {
      id: activeRun.id,
      status: activeRun.status,
      adapterType: activeRun.adapterType,
      logBytes: activeRun.logBytes,
      lastOutputBytes: activeRun.lastOutputBytes,
    });
  }

  for (const run of linkedRuns) {
    const adapterType = run.adapterType;
    if (!adapterType) continue;
    const existing = combined.get(run.runId);
    if (!existing) {
      combined.set(run.runId, {
        id: run.runId,
        status: run.status,
        adapterType,
        hasStoredOutput: run.hasStoredOutput,
        logBytes: run.logBytes,
      });
      continue;
    }
    combined.set(run.runId, {
      ...existing,
      // Prefer terminal status from linked history so cancelled/succeeded tails
      // can hydrate even if live endpoints lag.
      status: run.status,
      adapterType: existing.adapterType || adapterType,
      hasStoredOutput: existing.hasStoredOutput || run.hasStoredOutput,
      logBytes: existing.logBytes ?? run.logBytes ?? undefined,
    });
  }

  return [...combined.values()];
}
