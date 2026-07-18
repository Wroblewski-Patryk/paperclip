import { describe, expect, it } from "vitest";
import type { Issue } from "@paperclipai/shared";
import { summarizeProjectDelivery } from "./ProjectDeliveryOverview";

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: crypto.randomUUID(),
    companyId: "company-1",
    projectId: "project-1",
    projectWorkspaceId: null,
    goalId: null,
    parentId: null,
    title: "Delivery issue",
    description: null,
    status: "todo",
    workMode: "standard",
    priority: "medium",
    assigneeAgentId: null,
    assigneeUserId: null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    issueNumber: 1,
    identifier: "LUC-1",
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    executionWorkspaceId: null,
    executionWorkspacePreference: null,
    executionWorkspaceSettings: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    createdAt: new Date("2026-07-18T10:00:00.000Z"),
    updatedAt: new Date("2026-07-18T10:00:00.000Z"),
    ...overrides,
  };
}

describe("summarizeProjectDelivery", () => {
  it("separates open, blocked, review, and evidence-backed completion", () => {
    const completionEvidence = {
      summary: "Verified",
      riskLevel: "standard" as const,
      testEvidence: { summary: "Tests pass", refs: [] },
      reviewEvidence: { summary: "Reviewed", refs: [] },
      documentationEvidence: { summary: "Documented", refs: [] },
    };
    const summary = summarizeProjectDelivery([
      issue({ status: "blocked", priority: "critical", identifier: "LUC-2" }),
      issue({ status: "in_review", priority: "high", identifier: "LUC-3" }),
      issue({ status: "done", identifier: "LUC-4", completionEvidence }),
      issue({ status: "done", identifier: "LUC-5" }),
      issue({ status: "cancelled", identifier: "LUC-6" }),
    ]);

    expect(summary.open).toBe(2);
    expect(summary.blocked).toBe(1);
    expect(summary.inReview).toBe(1);
    expect(summary.done).toBe(2);
    expect(summary.doneWithEvidence).toBe(1);
    expect(summary.evidenceCoverage).toBe(50);
    expect(summary.releaseCritical.map((item) => item.identifier)).toEqual(["LUC-2", "LUC-3"]);
  });

  it("reports no percentage when no work is complete", () => {
    expect(summarizeProjectDelivery([issue({ status: "todo" })]).evidenceCoverage).toBeNull();
  });
});
