import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, assignmentProposals, companies, createDb, issues, projects } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { assignmentProposalService } from "../services/assignment-proposals.js";
import { issueService, MAX_AUTONOMOUS_DELEGATION_DEPTH } from "../services/issues.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describeEmbedded("governed assignment proposals and delegation limits", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-assignment-proposals-");
    db = createDb(tempDb.connectionString);
  }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed(companyStatus: "active" | "paused" = "active") {
    const companyId = randomUUID();
    const projectId = randomUUID();
    const proposerId = randomUUID();
    const workerId = randomUUID();
    const issueId = randomUUID();
    await db.insert(companies).values({
      id: companyId, name: "Assignment company", issuePrefix: `A${companyId.slice(0, 6)}`,
      status: companyStatus, requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values([
      { id: proposerId, companyId, name: "Proposer", role: "engineer", permissions: {} },
      { id: workerId, companyId, name: "Worker", role: "engineer", permissions: {} },
    ]);
    await db.insert(projects).values({ id: projectId, companyId, name: "Scoped app", status: "in_progress" });
    await db.insert(issues).values({
      id: issueId, companyId, projectId, title: "Unassigned task", status: "backlog",
      identifier: `A-${issueId.slice(0, 6)}`, createdByAgentId: proposerId,
    });
    return { companyId, projectId, proposerId, workerId, issueId };
  }

  it("lets an owner propose while only the admitted system applies assignment", async () => {
    const refs = await seed("active");
    const result = await assignmentProposalService(db).proposeAndApply(refs.issueId, {
      proposedAssigneeAgentId: refs.workerId,
      idempotencyKey: "assignment-1",
      reason: "Worker owns the bounded implementation skill.",
    }, { type: "agent", agentId: refs.proposerId });

    expect(result.proposal).toMatchObject({ status: "applied", proposedByAgentId: refs.proposerId });
    expect(result.issue).toMatchObject({ assigneeAgentId: refs.workerId, status: "todo" });
    expect((await db.select().from(assignmentProposals))[0].admissionDecisionId).toBeTruthy();
  });

  it("persists but does not apply proposals during maintenance", async () => {
    const refs = await seed("paused");
    const result = await assignmentProposalService(db).proposeAndApply(refs.issueId, {
      proposedAssigneeAgentId: refs.workerId,
      idempotencyKey: "assignment-maintenance",
      reason: "Queue safely until reopen.",
    }, { type: "agent", agentId: refs.proposerId });

    expect(result.proposal.status).toBe("deferred_by_maintenance");
    expect(result.issue.assigneeAgentId).toBeNull();
  });

  it("blocks cross-project children, excessive depth, and parent loops", async () => {
    const refs = await seed("active");
    const otherProjectId = randomUUID();
    await db.insert(projects).values({ id: otherProjectId, companyId: refs.companyId, name: "Other app" });
    const svc = issueService(db);
    await expect(svc.createChild(refs.issueId, {
      title: "Wrong app child", status: "backlog", projectId: otherProjectId,
    })).rejects.toMatchObject({ status: 422 });

    await db.update(issues).set({ requestDepth: MAX_AUTONOMOUS_DELEGATION_DEPTH }).where(sql`${issues.id} = ${refs.issueId}`);
    await expect(svc.createChild(refs.issueId, { title: "Too deep", status: "backlog" }))
      .rejects.toMatchObject({ status: 422 });

    await db.update(issues).set({ requestDepth: 0 }).where(sql`${issues.id} = ${refs.issueId}`);
    const child = await svc.createChild(refs.issueId, { title: "Valid child", status: "backlog" });
    await expect(svc.update(refs.issueId, { parentId: child.issue.id }))
      .rejects.toMatchObject({ status: 422 });
  });
});
