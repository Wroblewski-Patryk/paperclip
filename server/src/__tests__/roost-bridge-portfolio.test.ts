import { describe, expect, it } from "vitest";
import {
  roostBridgePortfolioProjectionSchema,
  softwarehouseControlStatusResponseSchema,
  type SoftwarehouseControlStatusResponse,
} from "@paperclipai/shared";
import {
  buildRoostBridgePortfolioProjection,
  type RoostBridgePortfolioData,
  type RoostBridgePortfolioRepository,
} from "../services/roost-bridge-portfolio.js";

function status(overrides: Partial<SoftwarehouseControlStatusResponse> = {}) {
  return softwarehouseControlStatusResponseSchema.parse({
    generatedAt: "2026-07-28T02:00:00.000Z",
    observedAt: "2026-07-28T01:59:00.000Z",
    sourcePath: "report/softwarehouse-readiness-snapshot.latest.json",
    available: true,
    stale: false,
    staleAfterSeconds: 900,
    ageSeconds: 60,
    auditOverall: "attention",
    controlDecision: "runnable_work_available",
    effectiveOperatingPosture: "runnable_work_allowed",
    supervisionReady: true,
    fullDeliveryReady: false,
    activeRunCount: 1,
    liveRunCount: 1,
    operatorActionStatus: null,
    headline: "Portfolio projection source",
    recommendedAction: null,
    primaryNextAction: null,
    deliveryPermission: {
      protectedDeliveryAllowed: false,
      projectRepoMutationAllowed: true,
      canStartNewLane: true,
      allowedLaneTypes: ["one_owner_evidence_lane"],
      reason: null,
    },
    blockedGates: [],
    dirtyProjects: [],
    allowedWhileBlocked: [],
    forbiddenWhileBlocked: ["deploy"],
    requiredBeforeFullDelivery: [],
    nextControlActions: [],
    projectTruth: {
      projectCount: 1,
      projectsWithGaps: 0,
      criticalRuntimeFindings: 0,
      totalGaps: 0,
      projects: [{
        name: "Soar",
        ok: true,
        publicProbeStatus: "ok",
        projectTruthStatus: "verified",
        totalGaps: 0,
        firstGap: null,
        portfolio: {
          paperclipProjectName: "11 Innovation: Soar",
          lifecycleStage: "innovation",
          offeringType: "application",
          ownerSurface: {
            system: "Roost",
            role: "owner_facing_aggregate",
            publicationStatus: "source_only",
            sourcePath: "../Roost/docs/maps/product-map.md",
            sourceUpdatedAt: "2026-07-28T01:58:00.000Z",
            publicUrl: null,
          },
          sourceControl: {
            branch: "main",
            headSha: "1111111111111111111111111111111111111111",
            observedAt: "2026-07-28T01:57:00.000Z",
          },
          deployment: {
            status: "reachable",
            deployedSha: "2222222222222222222222222222222222222222",
            observedAt: "2026-07-28T02:00:00.000Z",
            productUrl: "https://soar.luckysparrow.ch/",
            buildInfoUrl: "https://soar.luckysparrow.ch/api/build-info",
          },
          versionAlignment: "different",
          commercialReadiness: {
            status: "NO-GO",
            version: "v1",
            owner: "11 SPM",
            lastReviewed: "2026-07-28",
            decision: "NO-GO / OWNER_ACCEPTANCE_PENDING",
            nextGate: "Owner acceptance lane.",
            sourcePath: "../Soar/docs/sale-readiness.md",
            sourceUpdatedAt: "2026-07-28T01:56:00.000Z",
          },
        },
      }],
    },
    ...overrides,
  });
}

const projectionData: RoostBridgePortfolioData = {
  company: { id: "company-1", issuePrefix: "LUC" },
  projects: [{ id: "project-1", name: "11 Innovation: Soar" }],
  issues: [{
    id: "issue-1",
    projectId: "project-1",
    status: "done",
    checkoutRunId: "run-1",
    executionRunId: "run-1",
    completionEvidence: { summary: "bounded evidence marker" },
  }],
  runs: [{ id: "run-1", status: "succeeded" }],
  approvals: [{ id: "approval-1", projectId: "project-1", status: "pending" }],
  evidence: [{
    id: "evidence-1",
    projectId: "project-1",
    status: "ready",
    reviewState: "approved",
    healthStatus: "healthy",
  }],
  truncated: false,
};

function repository(data: RoostBridgePortfolioData = projectionData): RoostBridgePortfolioRepository {
  return { load: async () => data };
}

describe("Roost bridge portfolio projection", () => {
  it("builds a deterministic, bounded v1 packet and preserves SHA mismatch plus zero-gap NO-GO", async () => {
    const first = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository(),
      loadControlStatus: async () => status(),
      now: new Date("2026-07-28T02:00:00.000Z"),
    });
    const second = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository(),
      loadControlStatus: async () => status(),
      now: new Date("2026-07-28T03:00:00.000Z"),
    });

    expect(roostBridgePortfolioProjectionSchema.parse(first)).toEqual(first);
    expect(first.sourceSnapshotId).toBe(second.sourceSnapshotId);
    expect(first.observedAt).not.toBe(second.observedAt);
    expect(first.items[0]).toMatchObject({
      offeringId: "offering:company-1:project-1",
      companyId: "company-1",
      paperclipProjectId: "project-1",
      paperclipProjectLink: "/LUC/projects/project-1",
      conflictState: "none",
      sourceControl: {
        sourceSha: "1111111111111111111111111111111111111111",
        deployedSha: "2222222222222222222222222222222222222222",
        versionAlignment: "different",
      },
      readiness: {
        status: "NO-GO",
        evidenceState: "complete",
        zeroGapButNoGo: true,
      },
      aggregates: {
        issues: { total: 1, byStatus: { done: 1 }, withCompletionEvidence: 1, truncated: false },
        runs: { total: 1, byStatus: { succeeded: 1 }, truncated: false },
        approvals: { total: 1, byStatus: { pending: 1 }, pending: 1, truncated: false },
        evidence: { total: 1, byStatus: { ready: 1 }, healthy: 1, reviewed: 1, truncated: false },
      },
    });
    expect(JSON.stringify(first)).not.toMatch(/prompt|transcript|tool.?call|secret/i);
  });

  it("marks stale, missing-evidence, mapping, owner-surface, and supersession states explicitly", async () => {
    const missingReadiness = status({
      stale: true,
      projectTruth: {
        ...status().projectTruth,
        projects: [{
          ...status().projectTruth.projects[0]!,
          portfolio: {
            ...status().projectTruth.projects[0]!.portfolio!,
            commercialReadiness: null,
            ownerSurface: {
              ...status().projectTruth.projects[0]!.portfolio!.ownerSurface!,
              publicationStatus: "unavailable",
              sourceUpdatedAt: null,
            },
          },
        }],
      },
    });
    const result = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository(),
      loadControlStatus: async () => missingReadiness,
    });

    expect(result.stale).toBe(true);
    expect(result.conflictState).toBe("owner_surface_unavailable");
    expect(result.supersessionState).toBe("unknown");
    expect(result.items[0]).toMatchObject({
      mappingState: "mapped",
      conflictState: "owner_surface_unavailable",
      supersessionState: "unknown",
      readiness: { status: "UNKNOWN", evidenceState: "missing", zeroGapButNoGo: false },
    });

    const mappingConflict = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository({ ...projectionData, projects: [] }),
      loadControlStatus: async () => missingReadiness,
    });
    expect(mappingConflict.conflictState).toBe("project_mapping_conflict");
    expect(mappingConflict.items).toEqual([]);
  });

  it("fails read-only with explicit unavailable and bounded timeout packets", async () => {
    const unavailable = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository(),
      loadControlStatus: async () => status({ available: false, stale: true }),
    });
    const timedOut = await buildRoostBridgePortfolioProjection({
      companyId: "company-1",
      repository: repository(),
      loadControlStatus: () => new Promise(() => undefined),
      timeoutMs: 1,
    });

    expect(unavailable).toMatchObject({
      sourceState: "unavailable",
      stale: true,
      conflictState: "source_unavailable",
      failure: { code: "source_unavailable", retryable: true },
      items: [],
    });
    expect(timedOut).toMatchObject({
      sourceState: "timed_out",
      stale: true,
      failure: { code: "source_timeout", retryable: true },
      items: [],
    });
  });
});
