import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  activityLog,
  agents,
  agentRuntimeState,
  agentWakeupRequests,
  companies,
  companySkills,
  createDb,
  documentRevisions,
  documents,
  environmentLeases,
  environments,
  executionWorkspaces,
  heartbeatRunEvents,
  heartbeatRuns,
  issueComments,
  issues,
  projects,
  workspaceResourceClaims,
  workspaceOperations,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import {
  normalizeWorkspaceResourceKey,
  parseWorkspaceResourceClaimDeclarations,
  workspaceResourceClaimService,
} from "../services/workspace-resource-claims.js";

const mockAdapterExecute = vi.hoisted(() => vi.fn());

vi.mock("../adapters/index.ts", async () => {
  const actual = await vi.importActual<typeof import("../adapters/index.ts")>("../adapters/index.ts");
  return {
    ...actual,
    getServerAdapter: vi.fn(() => ({
      supportsLocalAgentJwt: false,
      execute: mockAdapterExecute,
    })),
  };
});

import { heartbeatService } from "../services/heartbeat.ts";

describe("workspace resource claim declarations", () => {
  it("normalizes resource identities and retains independent resources", () => {
    expect(normalizeWorkspaceResourceKey(" Roost / CompanyCore Test Postgres : 55432 "))
      .toBe("roost:companycore:test:postgres:55432");
    expect(parseWorkspaceResourceClaimDeclarations({
      resourceClaims: [
        { resourceKey: "roost:postgres:55432", leaseMs: 5_000 },
        { resourceKey: "browser:chrome" },
      ],
    })).toEqual([
      { resourceKey: "roost:postgres:55432", leaseMs: 5_000 },
      { resourceKey: "browser:chrome" },
    ]);
  });

  it("rejects duplicate normalized claims before a command can start", () => {
    expect(() => parseWorkspaceResourceClaimDeclarations({
      resourceClaims: [{ resourceKey: "roost postgres" }, { resourceKey: "roost:postgres" }],
    })).toThrow("Duplicate workspace resource claim");
  });

  it("rejects malformed declarations", () => {
    expect(() => parseWorkspaceResourceClaimDeclarations({ resourceClaims: "postgres" }))
      .toThrow("must be an array");
    expect(() => parseWorkspaceResourceClaimDeclarations({ resourceClaims: [{ resourceKey: "postgres", leaseMs: 1 }] }))
      .toThrow("at least 1000");
  });
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres workspace resource claim tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("workspaceResourceClaimService", () => {
  let db!: ReturnType<typeof createDb>;
  let claims!: ReturnType<typeof workspaceResourceClaimService>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-workspace-resource-claims-");
    db = createDb(tempDb.connectionString);
    claims = workspaceResourceClaimService(db);
  }, 60_000);

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete(workspaceResourceClaims);
    await db.delete(workspaceOperations);
    await db.delete(environmentLeases);
    await db.delete(environments);
    await db.delete(activityLog);
    await db.delete(agentRuntimeState);
    await db.delete(companySkills);
    await db.delete(issueComments);
    await db.delete(documentRevisions);
    await db.delete(documents);
    await db.delete(heartbeatRunEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(issues);
    await db.delete(executionWorkspaces);
    await db.delete(agents);
    await db.delete(projects);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedFixture(label: string) {
    const companyId = randomUUID();
    const projectId = randomUUID();
    const workspaceId = randomUUID();
    const agentId = randomUUID();
    const runIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];

    await db.insert(companies).values({
      id: companyId,
      name: `Claims ${label}`,
      issuePrefix: `C${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: `Claims ${label}`,
      status: "in_progress",
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: `Claims agent ${label}`,
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    await db.insert(executionWorkspaces).values({
      id: workspaceId,
      companyId,
      projectId,
      mode: "shared_workspace",
      strategyType: "project_primary",
      name: `Claims workspace ${label}`,
      status: "active",
      providerType: "local_fs",
    });
    await db.insert(heartbeatRuns).values(runIds.map((id) => ({
      id,
      companyId,
      agentId,
      invocationSource: "manual",
      status: "running",
    })));

    return { companyId, projectId, workspaceId, runIds };
  }

  it("returns the holder evidence for normalized-identical keys before a caller starts its adapter command", async () => {
    const fixture = await seedFixture("conflict");
    const first = await claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId: fixture.runIds[0],
      resourceKey: " Roost / Verification Postgres ",
    });
    const second = await claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId: fixture.runIds[1],
      resourceKey: "roost:verification:postgres",
    });

    expect(first).toMatchObject({ acquired: true });
    expect(second).toEqual(expect.objectContaining({
      acquired: false,
      holder: expect.objectContaining({
        heartbeatRunId: fixture.runIds[0],
        resourceKey: "roost:verification:postgres",
        status: "active",
      }),
    }));
  });

  it("allows different normalized resource keys concurrently in the same workspace", async () => {
    const fixture = await seedFixture("independent");
    const [first, second] = await Promise.all([
      claims.acquire({
        companyId: fixture.companyId,
        executionWorkspaceId: fixture.workspaceId,
        heartbeatRunId: fixture.runIds[0],
        resourceKey: "postgres:55432",
      }),
      claims.acquire({
        companyId: fixture.companyId,
        executionWorkspaceId: fixture.workspaceId,
        heartbeatRunId: fixture.runIds[1],
        resourceKey: "browser chrome",
      }),
    ]);

    expect(first).toEqual(expect.objectContaining({ acquired: true, claim: expect.objectContaining({ resourceKey: "postgres:55432" }) }));
    expect(second).toEqual(expect.objectContaining({ acquired: true, claim: expect.objectContaining({ resourceKey: "browser:chrome" }) }));
  });

  it("releases only the originating run's claims for success, failure, and interruption", async () => {
    const fixture = await seedFixture("release");
    await Promise.all(fixture.runIds.slice(0, 3).map((heartbeatRunId, index) => claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId,
      resourceKey: `resource-${index}`,
    })));

    expect(await claims.releaseForRun(fixture.runIds[0], "run_succeeded")).toHaveLength(1);
    const remainingActive = await db.select({ heartbeatRunId: workspaceResourceClaims.heartbeatRunId })
      .from(workspaceResourceClaims)
      .where(eq(workspaceResourceClaims.status, "active"));
    expect(remainingActive).toEqual(expect.arrayContaining([
      { heartbeatRunId: fixture.runIds[1] },
      { heartbeatRunId: fixture.runIds[2] },
    ]));
    expect(await claims.releaseForRun(fixture.runIds[1], "run_failed")).toHaveLength(1);
    expect(await claims.releaseForRun(fixture.runIds[2], "run_interrupted")).toHaveLength(1);

    const persisted = await db.select({
      heartbeatRunId: workspaceResourceClaims.heartbeatRunId,
      status: workspaceResourceClaims.status,
      releaseReason: workspaceResourceClaims.releaseReason,
    }).from(workspaceResourceClaims);
    expect(persisted).toEqual(expect.arrayContaining([
      { heartbeatRunId: fixture.runIds[0], status: "released", releaseReason: "run_succeeded" },
      { heartbeatRunId: fixture.runIds[1], status: "released", releaseReason: "run_failed" },
      { heartbeatRunId: fixture.runIds[2], status: "released", releaseReason: "run_interrupted" },
    ]));
  });

  it("reclaims an expired claim while retaining an unexpired holder", async () => {
    const fixture = await seedFixture("expiry");
    const now = new Date("2026-07-28T12:00:00.000Z");
    await claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId: fixture.runIds[0],
      resourceKey: "test database",
      leaseMs: 1_000,
      now,
    });
    const beforeExpiry = await claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId: fixture.runIds[1],
      resourceKey: "test:database",
      now: new Date(now.getTime() + 999),
    });
    const afterExpiry = await claims.acquire({
      companyId: fixture.companyId,
      executionWorkspaceId: fixture.workspaceId,
      heartbeatRunId: fixture.runIds[1],
      resourceKey: "test:database",
      now: new Date(now.getTime() + 1_000),
    });

    expect(beforeExpiry).toEqual(expect.objectContaining({
      acquired: false,
      holder: expect.objectContaining({ heartbeatRunId: fixture.runIds[0], status: "active" }),
    }));
    expect(afterExpiry).toEqual(expect.objectContaining({
      acquired: true,
      claim: expect.objectContaining({ heartbeatRunId: fixture.runIds[1], status: "active" }),
    }));
    const [expired] = await db.select().from(workspaceResourceClaims).where(and(
      eq(workspaceResourceClaims.heartbeatRunId, fixture.runIds[0]),
      eq(workspaceResourceClaims.status, "expired"),
    ));
    expect(expired.releaseReason).toBe("lease_expired");
  });

  it("keeps company and workspace in the exclusive-resource identity", async () => {
    const first = await seedFixture("identityone");
    const second = await seedFixture("identitytwo");
    const otherWorkspaceId = randomUUID();
    await db.insert(executionWorkspaces).values({
      id: otherWorkspaceId,
      companyId: first.companyId,
      projectId: first.projectId,
      mode: "shared_workspace",
      strategyType: "project_primary",
      name: "Other claims workspace",
      status: "active",
      providerType: "local_fs",
    });

    const results = [
      await claims.acquire({ companyId: first.companyId, executionWorkspaceId: first.workspaceId, heartbeatRunId: first.runIds[0], resourceKey: "postgres" }),
      await claims.acquire({ companyId: first.companyId, executionWorkspaceId: otherWorkspaceId, heartbeatRunId: first.runIds[1], resourceKey: "postgres" }),
      await claims.acquire({ companyId: second.companyId, executionWorkspaceId: second.workspaceId, heartbeatRunId: second.runIds[0], resourceKey: "postgres" }),
    ];

    expect(results).toEqual(results.map(() => expect.objectContaining({ acquired: true })));
  });

  it("executes only the winning adapter when same-workspace normalized claims conflict", async () => {
    const companyId = randomUUID();
    const projectId = randomUUID();
    const workspaceId = randomUUID();
    const winnerAgentId = randomUUID();
    const loserAgentId = randomUUID();
    const winnerIssueId = randomUUID();
    const loserIssueId = randomUUID();
    const issuePrefix = `C${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    let releaseWinner: (() => void) | null = null;
    const winnerStarted = new Promise<void>((resolve) => {
      mockAdapterExecute.mockImplementation(async () => {
        resolve();
        await new Promise<void>((release) => {
          releaseWinner = release;
        });
        await db.update(issues).set({ status: "done", updatedAt: new Date() })
          .where(eq(issues.id, winnerIssueId));
        throw new Error("winner test complete");
      });
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Heartbeat resource-claim test",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Heartbeat resource-claim project",
      status: "in_progress",
    });
    await db.insert(executionWorkspaces).values({
      id: workspaceId,
      companyId,
      projectId,
      mode: "shared_workspace",
      strategyType: "project_primary",
      name: "Heartbeat resource-claim workspace",
      status: "active",
      cwd: process.cwd(),
      providerType: "local_fs",
    });
    await db.insert(agents).values([
      {
        id: winnerAgentId,
        companyId,
        name: "Winning claimant",
        role: "engineer",
        status: "idle",
        adapterType: "codex_local",
        adapterConfig: {
          workspaceRuntime: {
            resourceClaims: [{ resourceKey: " Roost / CompanyCore Test Postgres : 55432 " }],
          },
        },
        runtimeConfig: { heartbeat: { wakeOnDemand: true, maxConcurrentRuns: 1 } },
        permissions: {},
      },
      {
        id: loserAgentId,
        companyId,
        name: "Losing claimant",
        role: "engineer",
        status: "idle",
        adapterType: "codex_local",
        adapterConfig: {
          workspaceRuntime: {
            resourceClaims: [{ resourceKey: "roost:companycore:test:postgres:55432" }],
          },
        },
        runtimeConfig: { heartbeat: { wakeOnDemand: true, maxConcurrentRuns: 1 } },
        permissions: {},
      },
    ]);
    await db.insert(issues).values([
      {
        id: winnerIssueId,
        companyId,
        projectId,
        title: "Winner",
        status: "in_progress",
        priority: "medium",
        assigneeAgentId: winnerAgentId,
        executionWorkspaceId: workspaceId,
        executionWorkspacePreference: "reuse_existing",
        issueNumber: 1,
        identifier: `${issuePrefix}-1`,
      },
      {
        id: loserIssueId,
        companyId,
        projectId,
        title: "Loser",
        status: "in_progress",
        priority: "medium",
        assigneeAgentId: loserAgentId,
        executionWorkspaceId: workspaceId,
        executionWorkspacePreference: "reuse_existing",
        issueNumber: 2,
        identifier: `${issuePrefix}-2`,
      },
    ]);

    const heartbeat = heartbeatService(db);
    const winner = await heartbeat.invoke(winnerAgentId, "on_demand", { issueId: winnerIssueId });
    expect(winner).not.toBeNull();
    await winnerStarted;

    const loser = await heartbeat.invoke(loserAgentId, "on_demand", { issueId: loserIssueId });
    expect(loser).not.toBeNull();
    const loserRun = await waitForTerminalRun(heartbeat, loser!.id);

    expect(mockAdapterExecute).toHaveBeenCalledTimes(1);
    expect(loserRun).toMatchObject({
      status: "failed",
      error: expect.stringContaining(`held by run ${winner!.id}`),
    });
    expect(loserRun?.error).toContain("wait for its lease to release before starting commands");

    releaseWinner?.();
    const winnerRun = await waitForTerminalRun(heartbeat, winner!.id);
    expect(winnerRun?.status).toBe("failed");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }, 30_000);
});

async function waitForTerminalRun(
  heartbeat: ReturnType<typeof heartbeatService>,
  runId: string,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await heartbeat.getRun(runId);
    if (run && run.status !== "queued" && run.status !== "running") return run;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return heartbeat.getRun(runId);
}
