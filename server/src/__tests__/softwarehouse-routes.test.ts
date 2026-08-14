import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  softwarehouseControlStatusResponseSchema,
  softwarehouseIssueTemplateCatalogResponseSchema,
} from "@paperclipai/shared";
import { errorHandler } from "../middleware/index.js";
import { loadSoftwarehouseControlStatus, softwarehouseRoutes } from "../routes/softwarehouse.js";

function createApp(
  actor: Express.Request["actor"],
  options?: Parameters<typeof softwarehouseRoutes>[1],
) {
  return createAppWithExactOptions(actor, {
    sourceOwnerCompanyId: "company-1",
    ...options,
  });
}

function createAppWithExactOptions(
  actor: Express.Request["actor"],
  options: Parameters<typeof softwarehouseRoutes>[1] = {},
) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use("/api", softwarehouseRoutes(undefined, options));
  app.use(errorHandler);
  return app;
}

describe("governed project-truth probe route", () => {
  const response = {
    outcome: "response" as const,
    url: "https://example.com/",
    httpStatus: 200,
    contentType: "text/html",
    body: null,
    error: null,
  };

  it("allows an authenticated same-company agent and records bounded audit evidence", async () => {
    const projectTruthProbe = vi.fn(async () => response);
    const recordProjectTruthProbeActivity = vi.fn(async () => {});
    const app = createApp({
      type: "agent",
      source: "agent_jwt",
      agentId: "agent-1",
      companyId: "company-1",
      runId: "run-1",
    }, {
      projectTruthProbe,
      recordProjectTruthProbeActivity,
    });

    const result = await request(app)
      .post("/api/companies/company-1/softwarehouse/project-truth-probe")
      .send({ url: "https://example.com/" });

    expect(result.status).toBe(200);
    expect(result.body).toEqual(response);
    expect(projectTruthProbe).toHaveBeenCalledWith("https://example.com/");
    expect(recordProjectTruthProbeActivity).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1",
      actor: expect.objectContaining({ actorType: "agent", actorId: "agent-1", runId: "run-1" }),
      result: response,
    }));
  });

  it("fails closed before probing for a company that does not own the Softwarehouse source", async () => {
    const projectTruthProbe = vi.fn(async () => response);
    const app = createAppWithExactOptions(companyTwoActor, {
      sourceOwnerCompanyId: "company-1",
      projectTruthProbe,
      recordProjectTruthProbeActivity: vi.fn(async () => {}),
    });

    const result = await request(app)
      .post("/api/companies/company-2/softwarehouse/project-truth-probe")
      .send({ url: "https://example.com/" });

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "Softwarehouse source is unavailable" });
    expect(projectTruthProbe).not.toHaveBeenCalled();
  });

  it("rejects cross-company agents and invalid request contracts before probing", async () => {
    const projectTruthProbe = vi.fn(async () => response);
    const crossCompanyApp = createApp({
      type: "agent",
      source: "agent_jwt",
      agentId: "agent-2",
      companyId: "company-2",
    }, {
      projectTruthProbe,
      recordProjectTruthProbeActivity: vi.fn(async () => {}),
    });
    const sameCompanyApp = createApp(companyOneActor, {
      projectTruthProbe,
      recordProjectTruthProbeActivity: vi.fn(async () => {}),
    });

    const crossCompany = await request(crossCompanyApp)
      .post("/api/companies/company-1/softwarehouse/project-truth-probe")
      .send({ url: "https://example.com/" });
    const invalid = await request(sameCompanyApp)
      .post("/api/companies/company-1/softwarehouse/project-truth-probe")
      .send({ url: "not-a-url" });

    expect(crossCompany.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(projectTruthProbe).not.toHaveBeenCalled();
  });
});

const companyOneActor: Express.Request["actor"] = {
  type: "board",
  source: "session",
  userId: "user-1",
  companyIds: ["company-1"],
  memberships: [{ companyId: "company-1", membershipRole: "operator", status: "active" }],
};

const companyTwoActor: Express.Request["actor"] = {
  type: "board",
  source: "session",
  userId: "user-2",
  companyIds: ["company-2"],
  memberships: [{ companyId: "company-2", membershipRole: "operator", status: "active" }],
};

function createRouteSourceLoaders() {
  return {
    portfolioProjection: vi.fn(async () => ({ route: "portfolio-projection" })),
    status: vi.fn(async () => ({ route: "status" })),
    knowledge: vi.fn(async () => ({ route: "knowledge" })),
    tools: vi.fn(async () => ({ route: "tools" })),
    backlog: vi.fn(async () => ({ route: "backlog" })),
    issueTemplates: vi.fn(async () => []),
  };
}

const fileBackedRouteCases = [
  ["portfolio projection", "/api/companies/company-1/softwarehouse/portfolio-projection/v1", "portfolioProjection"],
  ["status", "/api/companies/company-1/softwarehouse/status", "status"],
  ["knowledge", "/api/companies/company-1/softwarehouse/knowledge", "knowledge"],
  ["tools", "/api/companies/company-1/softwarehouse/tools", "tools"],
  ["backlog", "/api/companies/company-1/softwarehouse/backlog", "backlog"],
  ["issue templates", "/api/companies/company-1/softwarehouse/issue-templates", "issueTemplates"],
] as const;

function asSourceLoaders(loaders: ReturnType<typeof createRouteSourceLoaders>) {
  return loaders as unknown as NonNullable<Parameters<typeof softwarehouseRoutes>[1]>["sourceLoaders"];
}

function expectNoSourceLoaders(loaders: ReturnType<typeof createRouteSourceLoaders>) {
  for (const loader of Object.values(loaders)) {
    expect(loader).not.toHaveBeenCalled();
  }
}

function expectNoWorkspaceFacts(body: unknown) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/(?:sourcePath|projectTruth|APPLICATIONS_INDEX|docs[\\/]|[A-Z]:\\)/);
}

function expectSourceUnavailable(response: request.Response, path: string) {
  if (path.includes("portfolio-projection")) {
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      companyId: "company-1",
      sourceState: "unavailable",
      conflictState: "source_unavailable",
      items: [],
    });
  } else {
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Softwarehouse source is unavailable" });
  }
  expectNoWorkspaceFacts(response.body);
}

async function expectAllFileBackedRoutesFailClosed(
  app: ReturnType<typeof createAppWithExactOptions>,
  sourceLoaders: ReturnType<typeof createRouteSourceLoaders>,
) {
  for (const [, path] of fileBackedRouteCases) {
    const response = await request(app).get(path);
    expectSourceUnavailable(response, path);
  }
  expectNoSourceLoaders(sourceLoaders);
}

async function withSoftwarehouseCompanyId<T>(
  value: string | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const previous = process.env.SOFTWAREHOUSE_COMPANY_ID;
  if (value === undefined) {
    delete process.env.SOFTWAREHOUSE_COMPANY_ID;
  } else {
    process.env.SOFTWAREHOUSE_COMPANY_ID = value;
  }
  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env.SOFTWAREHOUSE_COMPANY_ID;
    } else {
      process.env.SOFTWAREHOUSE_COMPANY_ID = previous;
    }
  }
}

const malformedOptionOwnerCases = [
  ["padded", " company-1 "],
  ["whitespace-only", " \t\r\n"],
  ["empty", ""],
  ["case-altered", "Company-1"],
  ["explicit null", null],
  ["explicit undefined", undefined],
  ["non-string", 123],
] as const;

const ownerBindingOptionCases = [
  ["current", "sourceOwnerCompanyId", { portfolioSourceOwnerCompanyId: "company-1" }],
  ["deprecated", "portfolioSourceOwnerCompanyId", {}],
] as const;

const malformedEnvironmentOwnerCases = [
  ["padded", " company-1 "],
  ["whitespace-only", " \t\r\n"],
  ["empty", ""],
  ["case-altered", "Company-1"],
] as const;

describe("softwarehouse file-source owner guard", () => {
  it.each(fileBackedRouteCases)("allows owning-company %s reads", async (_name, path, loaderKey) => {
    const sourceLoaders = createRouteSourceLoaders();
    const response = await request(createApp(companyOneActor, {
      sourceOwnerCompanyId: "company-1",
      sourceLoaders: asSourceLoaders(sourceLoaders),
    })).get(path);

    expect(response.status).toBe(200);
    expect(sourceLoaders[loaderKey]).toHaveBeenCalledTimes(1);
  });

  it.each(fileBackedRouteCases)("fails closed for authorized non-owner %s reads", async (_name, ownerPath) => {
    const sourceLoaders = createRouteSourceLoaders();
    const path = ownerPath.replace("/company-1/", "/company-2/");
    const response = await request(createApp(companyTwoActor, {
      sourceOwnerCompanyId: "company-1",
      sourceLoaders: asSourceLoaders(sourceLoaders),
    })).get(path);

    if (path.includes("portfolio-projection")) {
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        companyId: "company-2",
        sourceState: "unavailable",
        conflictState: "source_unavailable",
        items: [],
      });
    } else {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Softwarehouse source is unavailable" });
    }
    expectNoWorkspaceFacts(response.body);
    expectNoSourceLoaders(sourceLoaders);
  });

  it.each(fileBackedRouteCases)("fails closed for missing-binding %s reads", async (_name, path) => {
    const sourceLoaders = createRouteSourceLoaders();
    const response = await request(createApp(companyOneActor, {
      sourceOwnerCompanyId: null,
      sourceLoaders: asSourceLoaders(sourceLoaders),
    })).get(path);

    if (path.includes("portfolio-projection")) {
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        companyId: "company-1",
        sourceState: "unavailable",
        conflictState: "source_unavailable",
        items: [],
      });
    } else {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Softwarehouse source is unavailable" });
    }
    expectNoWorkspaceFacts(response.body);
    expectNoSourceLoaders(sourceLoaders);
  });

  describe.each(ownerBindingOptionCases)(
    "%s owner option",
    (_optionName, optionKey, companionOptions) => {
      it.each(malformedOptionOwnerCases)(
        "fails closed across all routes for a %s value despite canonical lower-precedence fallbacks",
        async (_name, optionValue) => {
          await withSoftwarehouseCompanyId("company-1", async () => {
            const sourceLoaders = createRouteSourceLoaders();
            const options = {
              ...companionOptions,
              [optionKey]: optionValue,
              sourceLoaders: asSourceLoaders(sourceLoaders),
            } as unknown as NonNullable<Parameters<typeof softwarehouseRoutes>[1]>;

            expect(Object.prototype.hasOwnProperty.call(options, optionKey)).toBe(true);
            if (optionKey === "portfolioSourceOwnerCompanyId") {
              expect(Object.prototype.hasOwnProperty.call(options, "sourceOwnerCompanyId")).toBe(false);
            }

            const app = createAppWithExactOptions(companyOneActor, options);
            await expectAllFileBackedRoutesFailClosed(app, sourceLoaders);
          });
        },
      );
    },
  );

  it.each(malformedEnvironmentOwnerCases)(
    "fails closed across all routes for a %s environment owner when the option is absent",
    async (_name, sourceOwnerCompanyId) => {
      await withSoftwarehouseCompanyId(sourceOwnerCompanyId, async () => {
        const sourceLoaders = createRouteSourceLoaders();
        const app = createAppWithExactOptions(companyOneActor, {
          sourceLoaders: asSourceLoaders(sourceLoaders),
        });

        await expectAllFileBackedRoutesFailClosed(app, sourceLoaders);
      });
    },
  );

  it("uses a canonical environment owner only when the route option is absent", async () => {
    await withSoftwarehouseCompanyId("company-1", async () => {
      const sourceLoaders = createRouteSourceLoaders();
      const app = createAppWithExactOptions(companyOneActor, {
        sourceLoaders: asSourceLoaders(sourceLoaders),
      });

      for (const [, path, loaderKey] of fileBackedRouteCases) {
        const response = await request(app).get(path);
        expect(response.status).toBe(200);
        expect(sourceLoaders[loaderKey]).toHaveBeenCalledTimes(1);
      }
    });
  });

  it("uses a canonical deprecated owner when the current option is absent", async () => {
    await withSoftwarehouseCompanyId("company-2", async () => {
      const sourceLoaders = createRouteSourceLoaders();
      const options = {
        portfolioSourceOwnerCompanyId: "company-1",
        sourceLoaders: asSourceLoaders(sourceLoaders),
      };

      expect(Object.prototype.hasOwnProperty.call(options, "sourceOwnerCompanyId")).toBe(false);
      const app = createAppWithExactOptions(companyOneActor, options);

      for (const [, path, loaderKey] of fileBackedRouteCases) {
        const response = await request(app).get(path);
        expect(response.status).toBe(200);
        expect(sourceLoaders[loaderKey]).toHaveBeenCalledTimes(1);
      }
    });
  });

  it.each([
    ["malformed deprecated owner", " company-1 "],
    ["canonical conflicting deprecated owner", "company-2"],
  ])("keeps a canonical current owner authoritative over a %s", async (_name, deprecatedOwner) => {
    await withSoftwarehouseCompanyId("company-2", async () => {
      const sourceLoaders = createRouteSourceLoaders();
      const app = createAppWithExactOptions(companyOneActor, {
        sourceOwnerCompanyId: "company-1",
        portfolioSourceOwnerCompanyId: deprecatedOwner,
        sourceLoaders: asSourceLoaders(sourceLoaders),
      });

      for (const [, path, loaderKey] of fileBackedRouteCases) {
        const response = await request(app).get(path);
        expect(response.status).toBe(200);
        expect(sourceLoaders[loaderKey]).toHaveBeenCalledTimes(1);
      }
    });
  });

  it.each(fileBackedRouteCases)("preserves direct cross-company 403 for %s", async (_name, path) => {
    const sourceLoaders = createRouteSourceLoaders();
    const response = await request(createApp(companyTwoActor, {
      sourceOwnerCompanyId: "company-1",
      sourceLoaders: asSourceLoaders(sourceLoaders),
    })).get(path);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "User does not have access to this company" });
    expectNoWorkspaceFacts(response.body);
    expectNoSourceLoaders(sourceLoaders);
  });
});

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

describe("Roost bridge portfolio projection route", () => {
  it("returns no file-backed facts for an authorized non-owning company", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-2"],
      memberships: [{ companyId: "company-2", membershipRole: "operator", status: "active" }],
    }, { portfolioSourceOwnerCompanyId: "company-1" }))
      .get("/api/companies/company-2/softwarehouse/portfolio-projection/v1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      companyId: "company-2",
      sourceState: "unavailable",
      conflictState: "source_unavailable",
      items: [],
    });
  });

  it("denies cross-company reads before resolving projection inputs", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-2"],
      memberships: [{ companyId: "company-2", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/portfolio-projection/v1");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("User does not have access to this company");
  });

  it("rejects incompatible route versions explicitly", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-1"],
      memberships: [{ companyId: "company-1", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/portfolio-projection/v2");

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Unsupported Roost bridge portfolio projection version");
    expect(response.body.details).toEqual({
      requestedVersion: "v2",
      supportedRouteVersions: ["v1"],
    });
  });
});

describe("softwarehouse control status", () => {
  it("normalizes the readiness snapshot into a safe owner-facing contract", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-softwarehouse-status-"));
    const reportDir = path.join(root, "report");
    const portfolioDir = path.join(root, "softwarehouse", "portfolio");
    const soarDocsDir = path.join(root, "apps", "Soar", "docs");
    const gitRefDir = path.join(root, ".git", "refs", "heads");
    await Promise.all([
      fs.mkdir(reportDir, { recursive: true }),
      fs.mkdir(portfolioDir, { recursive: true }),
      fs.mkdir(soarDocsDir, { recursive: true }),
      fs.mkdir(gitRefDir, { recursive: true }),
    ]);
    const sourceSha = "1111111111111111111111111111111111111111";
    const deployedSha = "2222222222222222222222222222222222222222";
    await Promise.all([
      fs.writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8"),
      fs.writeFile(path.join(gitRefDir, "main"), `${sourceSha}\n`, "utf8"),
    ]);
    await fs.writeFile(
      path.join(portfolioDir, "innovation-portfolio.csv"),
      [
        "name,paperclipProjectName,lifecycleStage,offeringType,workspacePath,readinessContractPath,productUrl,buildInfoUrl",
        "Soar,11 Innovation: Soar,innovation,application,.,apps/Soar/docs/sale-readiness.md,https://soar.luckysparrow.ch,https://soar.luckysparrow.ch/api/build-info",
        "Outside,11 Innovation: Outside,innovation,application,../../outside,contract.md,http://127.0.0.1:54329,http://127.0.0.1:54329/private",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(soarDocsDir, "sale-readiness.md"),
      [
        "# Soar sale readiness",
        "",
        "Version: `v1.0-test`",
        "Status: `NO-GO`",
        "Owner: `11 SPM`",
        "Last reviewed: 2026-07-18",
        "",
        "## Current Decision",
        "",
        "`NO-GO / OWNER_ACCEPTANCE_PENDING`",
        "",
        "## Minimal Next Legal Lanes",
        "",
        "1. Owner acceptance lane.",
      ].join("\n"),
      "utf8",
    );
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
        }, {
          name: "Outside",
          ok: false,
          publicProbeStatus: "unknown",
          projectTruthStatus: "untrusted_source",
          totalGaps: 0,
        }],
      },
    }), "utf8");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      gitSha: deployedSha,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

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
      expect(status.projectTruth.projects[0]?.portfolio).toMatchObject({
        paperclipProjectName: "11 Innovation: Soar",
        lifecycleStage: "innovation",
        sourceControl: {
          branch: "main",
          headSha: sourceSha,
        },
        deployment: {
          status: "reachable",
          deployedSha,
          productUrl: "https://soar.luckysparrow.ch/",
          buildInfoUrl: "https://soar.luckysparrow.ch/api/build-info",
        },
        versionAlignment: "different",
        commercialReadiness: {
          status: "NO-GO",
          version: "v1.0-test",
          owner: "11 SPM",
          decision: "NO-GO / OWNER_ACCEPTANCE_PENDING",
          nextGate: "Owner acceptance lane.",
        },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://soar.luckysparrow.ch/api/build-info",
        expect.objectContaining({ headers: { accept: "application/json" } }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(status.projectTruth.projects[1]?.portfolio).toMatchObject({
        sourceControl: {
          branch: null,
          headSha: null,
        },
        deployment: {
          status: "not_configured",
          deployedSha: null,
          productUrl: null,
          buildInfoUrl: null,
        },
        versionAlignment: "unknown",
        commercialReadiness: null,
      });
    } finally {
      fetchMock.mockRestore();
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

  it("fails lane admission closed when the latest control tick failed", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-softwarehouse-status-failed-"));
    const reportDir = path.join(root, "report");
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(path.join(reportDir, "softwarehouse-readiness-snapshot.latest.json"), JSON.stringify({
      generatedAt: "2026-07-18T11:59:00.000Z",
      auditOverall: "failed",
      controlDecision: "control_tick_failed",
      effectiveOperatingPosture: "control_tick_failed",
      twoProjectFullDeliveryReady: true,
      controlBrief: {
        headline: "Incorrectly optimistic snapshot",
        deliveryPermission: {
          protectedDeliveryAllowed: true,
          projectRepoMutationAllowed: true,
          canStartNewLane: true,
          allowedLaneTypes: ["local_validation"],
          reason: "Old optimistic projection",
        },
      },
      projectTruthAudit: { projects: [] },
    }), "utf8");

    try {
      const status = await loadSoftwarehouseControlStatus(root, new Date("2026-07-18T12:00:00.000Z"));
      expect(status.stale).toBe(false);
      expect(status.fullDeliveryReady).toBe(false);
      expect(status.deliveryPermission).toMatchObject({
        protectedDeliveryAllowed: false,
        projectRepoMutationAllowed: false,
        canStartNewLane: false,
        allowedLaneTypes: [],
      });
      expect(status.deliveryPermission.reason).toContain("control tick failed");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
