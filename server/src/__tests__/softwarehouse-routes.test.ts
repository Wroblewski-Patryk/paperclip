import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  softwarehouseControlStatusResponseSchema,
  softwarehouseIssueTemplateCatalogResponseSchema,
} from "@paperclipai/shared";
import { errorHandler } from "../middleware/index.js";
import { loadSoftwarehouseControlStatus, softwarehouseRoutes } from "../routes/softwarehouse.js";

function createApp(actor: Express.Request["actor"]) {
  const app = express();
  app.use((req, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use("/api", softwarehouseRoutes());
  app.use(errorHandler);
  return app;
}

describe("softwarehouse issue template catalog route", () => {
  it("returns the ordered issue-template catalog for an accessible company", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-1"],
      memberships: [{ companyId: "company-1", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(200);
    const body = softwarehouseIssueTemplateCatalogResponseSchema.parse(response.body);
    expect(body.templates.map((template) => template.kind)).toEqual([
      "task",
      "bug",
      "feature",
      "qa",
      "release",
      "work-report",
      "adr",
      "agent-role",
    ]);
    expect(body.templates).toHaveLength(8);
    for (const template of body.templates) {
      expect(template.key).toBeTruthy();
      expect(template.label).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.useCase).toBeTruthy();
      expect(template.path).toMatch(/^docs\/softwarehouse\/templates\/.+\.md$/);
      expect(template.body.trim()).toBeTruthy();
    }
    expect(body.templates.find((template) => template.kind === "agent-role")?.defaultDocumentKey).toBeNull();
    expect(body.templates.find((template) => template.kind === "task")?.defaultDocumentKey).toBe("plan");
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(createApp({ type: "none" }))
      .get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("rejects board users outside the requested company", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-2"],
      memberships: [{ companyId: "company-2", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("User does not have access to this company");
  });
});

describe("softwarehouse control status", () => {
  it("normalizes the readiness snapshot into a safe owner-facing contract", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-softwarehouse-status-"));
    const reportDir = path.join(root, "report");
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(path.join(reportDir, "softwarehouse-readiness-snapshot.latest.json"), JSON.stringify({
      generatedAt: "2026-07-18T12:00:00.000Z",
      auditOverall: "attention",
      controlDecision: "runnable_work_available",
      effectiveOperatingPosture: "runnable_work_allowed",
      supervisionReady: true,
      twoProjectFullDeliveryReady: false,
      activeRunCount: 2,
      liveRunCount: 1,
      operatorActionStatus: "gate_evidence_needed",
      recommendedAction: "Start the highest-priority runnable lane.",
      dirtyProjects: ["Soar"],
      allowedWhileBlocked: ["local_validation"],
      forbiddenWhileBlocked: ["deploy"],
      requiredBeforeFullDelivery: ["accepted smoke evidence"],
      nextControlActions: ["Assign one owner."],
      controlBrief: {
        headline: "Local repair may proceed.",
        primaryNextAction: "Assign one owner.",
        deliveryPermission: {
          protectedDeliveryAllowed: false,
          projectRepoMutationAllowed: true,
          canStartNewLane: true,
          allowedLaneTypes: ["local_validation"],
          reason: "Protected gate remains.",
        },
        blockedGates: [{
          project: "Soar",
          rootBlocker: "LUC-1",
          owner: "DRE",
          ownerAction: "Attach fresh proof.",
          operatorPrompt: "Keep deployment blocked until proof exists.",
          secretValue: "must-not-leak",
        }],
      },
      projectTruthAudit: {
        projectCount: 2,
        projectsWithGaps: 1,
        criticalRuntimeFindings: 1,
        totalGaps: 3,
        projects: [{
          name: "Soar",
          ok: true,
          publicProbeStatus: "failed",
          projectTruthStatus: "gaps_require_routing",
          totalGaps: 3,
          firstGap: {
            kind: "runtime_error",
            severity: "critical",
            summary: "Readiness probe failed.",
            nextOwner: "DRE",
            nextAction: "Diagnose read-only first.",
          },
        }],
      },
    }), "utf8");

    try {
      const status = await loadSoftwarehouseControlStatus(root, new Date("2026-07-18T12:05:00.000Z"));
      expect(softwarehouseControlStatusResponseSchema.parse(status)).toEqual(status);
      expect(status.available).toBe(true);
      expect(status.stale).toBe(false);
      expect(status.ageSeconds).toBe(300);
      expect(status.deliveryPermission.canStartNewLane).toBe(true);
      expect(status.blockedGates[0]?.evidenceRequired).toBe("Attach fresh proof.");
      expect(JSON.stringify(status)).not.toContain("must-not-leak");
      expect(status.projectTruth.projects[0]?.publicProbeStatus).toBe("failed");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("returns an unavailable stale status when the snapshot is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-softwarehouse-status-missing-"));
    try {
      const status = await loadSoftwarehouseControlStatus(root, new Date("2026-07-18T12:00:00.000Z"));
      expect(status.available).toBe(false);
      expect(status.stale).toBe(true);
      expect(status.projectTruth.projects).toEqual([]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
