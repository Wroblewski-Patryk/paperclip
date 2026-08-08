import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, issues, projects, projectWorkspaces } from "@paperclipai/db";
import { runContextBuilderService } from "../services/run-context-builder.js";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describeEmbedded("native run context builder", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-run-context-");
    db = createDb(tempDb.connectionString);
  }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed() {
    const companyId = randomUUID(); const parentId = randomUUID(); const agentId = randomUUID(); const childId = randomUUID();
    const projectId = randomUUID(); const issueId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Context company", issuePrefix: `C${companyId.slice(0, 6)}`, status: "active", requireBoardApprovalForNewAgents: false });
    await db.insert(agents).values([
      { id: parentId, companyId, name: "Parent", role: "manager", permissions: { executionPermissionClass: "observe" } },
      { id: agentId, companyId, name: "Executor", role: "engineer", reportsTo: parentId, permissions: { executionPermissionClass: "workspace_write" }, capabilities: "backend delivery" },
      { id: childId, companyId, name: "Child", role: "engineer", reportsTo: agentId, permissions: { executionPermissionClass: "workspace_write" } },
    ]);
    await db.insert(projects).values({ id: projectId, companyId, name: "Scoped project", status: "in_progress", leadAgentId: parentId });
    await db.insert(projectWorkspaces).values({ companyId, projectId, name: "primary", cwd: "C:\\bounded\\project", isPrimary: true });
    await db.insert(issues).values({ id: issueId, companyId, projectId, title: "Bounded task", description: "Produce verified output", status: "todo", assigneeAgentId: agentId, identifier: `C-${issueId.slice(0, 6)}` });
    return { companyId, agentId, projectId, issueId };
  }

  it("builds attributed role, project, and task context without history", async () => {
    const refs = await seed();
    const packet = await runContextBuilderService(db).build(refs);
    expect(packet.historyIncluded).toBe(false);
    expect(packet.role).toMatchObject({ agentId: refs.agentId, parent: { name: "Parent" } });
    expect(packet.project).toMatchObject({ id: refs.projectId, workspaceRefs: ["C:\\bounded\\project"] });
    expect(packet.task).toMatchObject({ id: refs.issueId, problem: "Bounded task" });
    expect(packet.sourceAttribution.task).toBe(`issues:${refs.issueId}`);
    expect(packet.budget.estimatedTokens).toBeLessThan(packet.budget.tokenLimit);
    expect(packet.contextManifest.workType).toBe("execution");
    expect(packet.contextManifest.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: `agents:${refs.agentId}`, requirement: "required", included: true }),
      expect.objectContaining({ sourceType: "workspace_reference", onDemand: true, included: false }),
    ]));
  });

  it("rebuilds and marks stale caller context instead of propagating it", async () => {
    const refs = await seed();
    const packet = await runContextBuilderService(db).build({ ...refs, now: new Date("2026-08-04T12:00:00Z"), inputContext: { nativeContext: { generatedAt: "2026-08-01T12:00:00Z", poisoned: true } } });
    expect(packet.staleInputDiscarded).toBe(true);
    expect(packet).not.toHaveProperty("poisoned");
  });

  it("fails closed when the hard token budget is exceeded", async () => {
    const refs = await seed();
    await expect(runContextBuilderService(db).build({ ...refs, inputContext: { contextBudget: { tokenLimit: 1 } } }))
      .rejects.toMatchObject({ status: 422 });
  });

  it("does not allow a caller to raise the native role/work budget", async () => {
    const refs = await seed();
    const packet = await runContextBuilderService(db).build({
      ...refs,
      inputContext: { contextBudget: { tokenLimit: 999_999, fileLimit: 999 } },
    });
    expect(packet.budget.tokenLimit).toBe(16_000);
    expect(packet.budget.fileLimit).toBe(16);
    expect(packet.budget.hardTokenLimit).toBe(16_000);
  });

  it("records a bounded native-supervision override and its expiry", async () => {
    const refs = await seed();
    const packet = await runContextBuilderService(db).build({
      ...refs,
      now: new Date("2026-08-04T12:00:00.000Z"),
      inputContext: {
        contextWorkType: "owner",
        contextOverride: {
          authority: "native_supervision",
          approvedBy: "system",
          overrideId: "finding-1",
          reason: "Measured mandatory repository instruction delta",
          expiresAt: "2026-08-04T12:30:00.000Z",
          tokenLimit: 14_000,
          fileLimit: 8,
        },
      },
    });
    expect(packet.budget).toMatchObject({
      tokenLimit: 14_000,
      hardTokenLimit: 14_000,
      contextOverride: { overrideId: "finding-1", expiresAt: "2026-08-04T12:30:00.000Z" },
    });
  });
});
