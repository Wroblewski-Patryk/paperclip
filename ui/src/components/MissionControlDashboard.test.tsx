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
  governance: { pendingApprovals: 0, activeBudgetIncidents: 0 },
  forecast: { projectedCompletion: null },
  attention: [],
} as unknown as CompanySituation;

describe("MissionControlDashboard", () => {
  it("renders the mission-control hierarchy from live dashboard facts", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
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
    expect(container.textContent).toContain("2 failed (20%)");
    expect(container.textContent).toContain("Lowest 08-14 · 80%");
  });

  it("explains idle execution and exposes queue age, evidence age, and cost semantics", () => {
    render(
      <MissionControlDashboard
        dashboard={dashboard}
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
