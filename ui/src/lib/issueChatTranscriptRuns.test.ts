import { describe, expect, it } from "vitest";
import { resolveIssueChatTranscriptRuns } from "./issueChatTranscriptRuns";

describe("resolveIssueChatTranscriptRuns", () => {
  it("uses adapterType from linked runs without requiring agent metadata", () => {
    const runs = resolveIssueChatTranscriptRuns({
      linkedRuns: [
        {
          runId: "run-1",
          status: "succeeded",
          agentId: "agent-1",
          adapterType: "codex_local",
          createdAt: "2026-04-09T12:00:00.000Z",
          startedAt: "2026-04-09T12:00:00.000Z",
          finishedAt: "2026-04-09T12:01:00.000Z",
          hasStoredOutput: true,
        },
      ],
    });

    expect(runs).toEqual([
      {
        id: "run-1",
        status: "succeeded",
        adapterType: "codex_local",
        hasStoredOutput: true,
      },
    ]);
  });

  it("merges linked terminal status and stored-output metadata into live runs", () => {
    const runs = resolveIssueChatTranscriptRuns({
      liveRuns: [
        {
          id: "run-1",
          status: "running",
          invocationSource: "manual",
          triggerDetail: null,
          startedAt: "2026-04-09T12:00:00.000Z",
          finishedAt: null,
          createdAt: "2026-04-09T12:00:00.000Z",
          agentId: "agent-1",
          agentName: "Agent 1",
          adapterType: "codex_local",
          logBytes: null,
          lastOutputBytes: null,
          issueId: "issue-1",
        },
      ],
      linkedRuns: [
        {
          runId: "run-1",
          status: "cancelled",
          agentId: "agent-1",
          adapterType: "codex_local",
          createdAt: "2026-04-09T12:00:00.000Z",
          startedAt: "2026-04-09T12:00:00.000Z",
          finishedAt: "2026-04-09T12:01:00.000Z",
          hasStoredOutput: true,
          logBytes: 4096,
        },
      ],
    });

    expect(runs).toEqual([
      {
        id: "run-1",
        status: "cancelled",
        adapterType: "codex_local",
        hasStoredOutput: true,
        logBytes: 4096,
        lastOutputBytes: null,
      },
    ]);
  });
});
