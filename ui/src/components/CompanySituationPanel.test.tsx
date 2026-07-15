// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompanySituation } from "@paperclipai/shared";
import { CompanySituationPanel } from "./CompanySituationPanel";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock("../lib/timeAgo", () => ({ timeAgo: () => "just now" }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const situation: CompanySituation = {
  companyId: "company-1",
  generatedAt: "2026-07-15T12:00:00.000Z",
  timezone: "UTC",
  basis: "deterministic_projection",
  horizon: { dueSoonDays: 7 },
  mission: {
    activeGoals: [{
      id: "goal-1",
      title: "Deliver useful products coherently",
      level: "company",
      ownerAgentId: null,
      updatedAt: "2026-07-15T10:00:00.000Z",
    }],
  },
  work: { open: 8, runnable: 5, inProgress: 2, inReview: 1, blocked: 2, unassignedRunnable: 1 },
  capacity: {
    totalAgents: 4,
    availableAgents: 2,
    runningAgents: 1,
    pausedAgents: 0,
    errorAgents: 1,
    runnableIssuesPerAvailableAgent: 2.5,
  },
  temporal: {
    activeProjects: 2,
    projectsWithTargets: 1,
    projectsWithoutTargets: 1,
    overdueProjects: [],
    dueSoonProjects: [],
  },
  governance: { pendingApprovals: 0, activeBudgetIncidents: 0 },
  attention: [{
    id: "blocked-work",
    kind: "blocked_work",
    severity: "warning",
    title: "2 blocked issues",
    summary: "Blocked work needs an owner.",
    suggestedAction: "Review root blockers.",
    sources: [{ entityType: "issue", entityId: "issue-1", observedAt: "2026-07-15T11:00:00.000Z" }],
  }],
  limitations: ["Deterministic facts only."],
};

describe("CompanySituationPanel", () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it("renders mission, bounded orientation facts, and an action link", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CompanySituationPanel situation={situation} />);
    });

    expect(container.textContent).toContain("Company orientation");
    expect(container.textContent).toContain("Deliver useful products coherently");
    expect(container.textContent).toContain("5Runnable work");
    expect(container.textContent).toContain("2 blocked issues");
    expect(container.querySelector('a[href="/issues"]')).not.toBeNull();

    await act(async () => root.unmount());
  });
});
