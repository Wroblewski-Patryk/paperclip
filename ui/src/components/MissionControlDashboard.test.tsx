// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CompanySituation, DashboardSummary, SoftwarehouseControlStatusResponse } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentAvailabilityControl } from "./AgentAvailabilityControl";
import { MissionControlDashboard, PerformanceTrendChart } from "./MissionControlDashboard";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: ReactNode) {
  act(() => root.render(ui));
}

const dashboard: DashboardSummary = {
  companyId: "company-1",
  agents: { active: 4, running: 0, paused: 1, error: 0 },
  tasks: { open: 7, inProgress: 0, blocked: 3, done: 10 },
  costs: { monthSpendCents: 0, monthBudgetCents: 500, monthUtilizationPercent: 0 },
  pendingApprovals: 0,
  budgets: { activeIncidents: 0, pendingApprovals: 0, pausedAgents: 1, pausedProjects: 0 },
  runActivity: [
    { date: "2026-08-13", succeeded: 0, failed: 0, other: 0, total: 0 },
    { date: "2026-08-14", succeeded: 8, failed: 2, other: 0, total: 10 },
  ],
};

const status = {
  available: true,
  stale: false,
  ageSeconds: 300,
  observedAt: "2026-08-14T10:00:00.000Z",
  projectTruth: { projectCount: 0, projects: [] },
  primaryNextAction: "Review blocked work",
  recommendedAction: "Open the blocked queue",
  headline: "Delivery is constrained",
} as unknown as SoftwarehouseControlStatusResponse;

const idleSituation = {
  work: { open: 7, runnable: 3, inProgress: 0, inReview: 1, blocked: 3, unassignedRunnable: 3 },
  capacity: {
    availableAgents: 4,
    dispatchableRunnableIssues: 3,
    dispatchState: "healthy",
    agentsWithParallelWip: 0,
    flow: [
      { stage: "assigned_queue", count: 3, oldestHours: 30 },
      { stage: "review", count: 1, oldestHours: 6 },
      { stage: "blocked_dependency", count: 3, oldestHours: 52 },
    ],
    bottleneck: { stage: "blocked_dependency", count: 3, oldestHours: 52 },
  },
  governance: { pendingApprovals: 0, pendingOwnerDecisions: 0, activeBudgetIncidents: 0 },
  forecast: { projectedCompletion: null },
  attention: [],
} as unknown as CompanySituation;

describe("MissionControlDashboard", () => {
  it("renders the mission-control hierarchy from live dashboard facts", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
        liveRunCount={0}
        status={status}
        situation={null}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        availability={{
          companyId: "company-1",
          state: "on",
          controlState: "open",
          enabled: true,
          acceptsNewRuns: true,
          activeRunCount: 0,
          deferredWorkCount: 0,
          changedAt: "2026-08-14T10:00:00.000Z",
          changedBy: { actorType: "user", actorId: "board" },
          drainStartedAt: null,
          offSince: null,
          openedAt: "2026-08-14T10:00:00.000Z",
          replaySnapshot: null,
        }}
        onAvailabilityChange={() => {}}
      />,
    );

    expect(container.textContent).toContain("delivery is constrained by 3 blocked issues");
    expect(container.textContent).toContain("Operating picture");
    expect(container.textContent).toContain("Constraints");
    expect(container.textContent).toContain("Performance trend");
    expect(container.textContent).toContain("Innovation portfolio");
    expect(container.querySelector('a[href="/issues?status=blocked"]')).not.toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="group"][aria-label="Filter agents by status"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(2);
  });

  it("keeps no-run days out of the success-rate observation", () => {
    render(<PerformanceTrendChart activity={dashboard.runActivity} />);
    expect(container.textContent).toContain("2026-08-13: 0 runs, no success-rate observation");
    expect(container.textContent).toContain("2026-08-14: 10 runs, 80% success");
    expect(container.textContent).not.toContain("2026-08-13: 0 runs, 0% success");
    expect(container.textContent).toContain("10 runs · 80% success");
    expect(container.textContent).toContain("8 succeeded · 2 failed");
    expect(container.textContent).toContain("14-day average · 80% success");
    expect(container.querySelectorAll('[role="button"][aria-label*="runs"]')).toHaveLength(2);
  });

  it("marks only active workflow stages and gives live execution its distinct state", () => {
    const liveDashboard = {
      ...dashboard,
      tasks: { ...dashboard.tasks, inProgress: 3, blocked: 0 },
    };
    render(
      <MissionControlDashboard
        dashboard={liveDashboard}
        liveRunCount={2}
        status={status}
        situation={null}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    const execution = container.querySelector('[data-workflow-stage="execution"]');
    const blocked = container.querySelector('[data-workflow-stage="blocked"]');
    expect(execution?.getAttribute("data-active")).toBe("true");
    expect(execution?.getAttribute("data-live")).toBe("true");
    expect(execution?.className).toContain("workflow-stage-live");
    expect(blocked?.getAttribute("data-active")).toBe("false");
    expect(blocked?.getAttribute("data-live")).toBeNull();
    expect(execution?.textContent).toContain("2 live");
  });

  it("does not present an in-progress issue as a live run", () => {
    render(
      <MissionControlDashboard
        dashboard={{ ...dashboard, tasks: { ...dashboard.tasks, inProgress: 3 } }}
        liveRunCount={0}
        status={status}
        situation={null}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    const execution = container.querySelector('[data-workflow-stage="execution"]');
    expect(execution?.getAttribute("data-live")).toBeNull();
    expect(execution?.textContent).toContain("0 live");
    expect(container.textContent).toContain("3 issues remain in progress without a live agent run.");
  });

  it("explains idle execution and exposes queue age, evidence age, and cost semantics", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
        liveRunCount={0}
        status={status}
        situation={idleSituation}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    expect(container.textContent).toContain("Execution is idle because all 3 runnable issues are unassigned.");
    expect(container.textContent).toContain("unassigned");
    expect(container.textContent).toContain("oldest 1d");
    expect(container.textContent).toContain("Evidence fresh · 5m old");
    expect(container.textContent).toContain("Paperclip-tracked budget");
    expect(container.textContent).toContain("Provider-reported quota");
  });

  it("separates covered dependency waits from blocked issues that need attention", () => {
    const issueBase = {
      companyId: "company-1",
      status: "blocked",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-14T10:00:00.000Z",
      lastActivityAt: "2026-08-14T10:00:00.000Z",
    };
    const issues = [
      {
        ...issueBase,
        id: "blocked-covered",
        identifier: "LUC-1",
        title: "Covered dependency",
        blockerAttention: {
          state: "covered",
          reason: "active_child",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 1,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "LUC-2",
          sampleStalledBlockerIdentifier: null,
        },
      },
      {
        ...issueBase,
        id: "blocked-attention",
        identifier: "LUC-3",
        title: "Missing execution path",
        blockerAttention: {
          state: "needs_attention",
          reason: "attention_required",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 1,
          sampleBlockerIdentifier: "LUC-4",
          sampleStalledBlockerIdentifier: null,
        },
      },
    ] as unknown as Parameters<typeof MissionControlDashboard>[0]["issues"];

    render(
      <MissionControlDashboard
        dashboard={{ ...dashboard, tasks: { ...dashboard.tasks, blocked: 2 } }}
        liveRunCount={0}
        status={status}
        situation={{ ...idleSituation, work: { ...idleSituation.work, blocked: 2 } }}
        agents={[]}
        issues={issues}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    expect(container.textContent).toContain("1 blocked issue needs attention");
    expect(container.textContent).toContain("2 blocked");
    expect(container.textContent).not.toContain("2 issues are blocked");
  });

  it("keeps held learning reevaluations out of the meaningful activity feed", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
        liveRunCount={0}
        status={status}
        situation={idleSituation}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[{
          id: "activity-1",
          companyId: "company-1",
          actorType: "user",
          actorId: "local-board",
          action: "organizational_observation.learning.promotion_evaluated",
          entityType: "organizational_observation",
          entityId: "observation-1",
          agentId: null,
          runId: null,
          details: { disposition: "held", reasons: ["insufficient_independent_evidence"], transitions: [] },
          createdAt: "2026-08-15T16:00:00.000Z",
        }] as unknown as Parameters<typeof MissionControlDashboard>[0]["activity"]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    expect(container.textContent).toContain("No material control-plane changes.");
    expect(container.querySelector("[data-activity-entry]")).toBeNull();
  });

  it("routes pending structured owner decisions to the blocked inbox", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
        liveRunCount={0}
        status={status}
        situation={{
          ...idleSituation,
          governance: { ...idleSituation.governance, pendingOwnerDecisions: 46 },
          attention: [{
            id: "pending-owner-decisions",
            kind: "pending_owner_decision",
            severity: "warning",
            title: "46 owner decisions awaiting response",
            summary: "Structured review requests await the board.",
            suggestedAction: "Open the blocked inbox.",
            sources: [],
          }],
        }}
        agents={[]}
        issues={[]}
        projects={[]}
        activity={[]}
        quota={{ value: "26%", description: "OpenAI weekly limit" }}
        onAvailabilityChange={() => {}}
      />,
    );

    const ownerDecisionRow = [...container.querySelectorAll("a")]
      .find((link) => link.textContent?.includes("Owner decision required"));
    expect(ownerDecisionRow?.textContent).toContain("46");
    expect(ownerDecisionRow?.getAttribute("href")).toBe("/decisions");
  });

  it("supports the compact agent admission control", () => {
    const onChange = vi.fn();
    render(
      <AgentAvailabilityControl
        variant="compact"
        availability={{
          companyId: "company-1",
          state: "on",
          controlState: "open",
          enabled: true,
          acceptsNewRuns: true,
          activeRunCount: 0,
          deferredWorkCount: 0,
          changedAt: "2026-08-14T10:00:00.000Z",
          changedBy: { actorType: "user", actorId: "board" },
          drainStartedAt: null,
          offSince: null,
          openedAt: "2026-08-14T10:00:00.000Z",
          replaySnapshot: null,
        }}
        onChange={onChange}
      />,
    );

    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]');
    expect(toggle?.getAttribute("aria-checked")).toBe("true");
    act(() => toggle?.click());
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
