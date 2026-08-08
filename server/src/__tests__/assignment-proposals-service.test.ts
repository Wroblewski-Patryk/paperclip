import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, assignmentProposals, companies, createDb, delegationReports, issues, projects, workProposals } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { assignmentProposalService } from "../services/assignment-proposals.js";
import { issueService, MAX_AUTONOMOUS_DELEGATION_DEPTH } from "../services/issues.js";
import { delegationFlowService } from "../services/delegation-flow.js";

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
    const reviewerId = randomUUID();
    const issueId = randomUUID();
    await db.insert(companies).values({
      id: companyId, name: "Assignment company", issuePrefix: `A${companyId.slice(0, 6)}`,
      status: companyStatus, requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values([
      { id: proposerId, companyId, name: "Proposer", role: "engineer", permissions: {} },
      { id: workerId, companyId, name: "Worker", role: "engineer", reportsTo: proposerId, permissions: {} },
      { id: reviewerId, companyId, name: "Reviewer", role: "engineer", reportsTo: proposerId, permissions: {} },
    ]);
    await db.insert(projects).values({ id: projectId, companyId, name: "Scoped app", status: "in_progress" });
    await db.insert(issues).values({
      id: issueId, companyId, projectId, title: "Unassigned task", status: "backlog",
      identifier: `A-${issueId.slice(0, 6)}`, createdByAgentId: proposerId,
    });
    return { companyId, projectId, proposerId, workerId, reviewerId, issueId };
  }

  function contract(refs: Awaited<ReturnType<typeof seed>>) {
    return {
      routingMode: "direct_child" as const,
      scopeContract: { projectId: refs.projectId, responsibility: "bounded implementation" },
      budgetContract: { maxCents: 500 },
      acceptanceCriteria: [{ kind: "test", required: true }],
      reviewerAgentId: refs.reviewerId,
    };
  }

  it("lets an owner propose while only the admitted system applies assignment", async () => {
    const refs = await seed("active");
    const result = await assignmentProposalService(db).proposeAndApply(refs.issueId, {
      proposedAssigneeAgentId: refs.workerId,
      idempotencyKey: "assignment-1",
      reason: "Worker owns the bounded implementation skill.",
      ...contract(refs),
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
      ...contract(refs),
    }, { type: "agent", agentId: refs.proposerId });

    expect(result.proposal.status).toBe("deferred_by_maintenance");
    expect(result.issue.assigneeAgentId).toBeNull();
  });

  it("rejects lateral and descendant-skipping delegation", async () => {
    const refs = await seed("active");
    const siblingId = randomUUID();
    const grandchildId = randomUUID();
    await db.insert(agents).values([
      { id: siblingId, companyId: refs.companyId, name: "Sibling", role: "engineer", permissions: {} },
      { id: grandchildId, companyId: refs.companyId, name: "Grandchild", role: "engineer", reportsTo: refs.workerId, permissions: {} },
    ]);

    for (const proposedAssigneeAgentId of [siblingId, grandchildId]) {
      await expect(assignmentProposalService(db).proposeAndApply(refs.issueId, {
        proposedAssigneeAgentId,
        idempotencyKey: `illegal-${proposedAssigneeAgentId}`,
        reason: "Attempt to skip the direct reporting edge.",
        ...contract(refs),
      }, { type: "agent", agentId: refs.proposerId })).rejects.toMatchObject({ status: 403 });
    }
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

  it("moves proposals and transformed reports only to the direct parent", async () => {
    const refs = await seed("active");
    await db.update(issues).set({ assigneeAgentId: refs.workerId }).where(sql`${issues.id} = ${refs.issueId}`);
    const svc = delegationFlowService(db);
    await svc.createWorkProposal(refs.issueId, refs.workerId, {
      targetParentAgentId: refs.proposerId,
      title: "Need a bounded follow-up",
      problemStatement: "Observed evidence requires a separately admitted follow-up.",
      expectedOutcome: "Parent decides whether to admit or reject the follow-up.",
      scopeContract: { projectId: refs.projectId },
      evidence: [{ kind: "observation", ref: "test://evidence" }],
      idempotencyKey: "upward-work-1",
    });
    await svc.createReport(refs.issueId, refs.workerId, {
      toParentAgentId: refs.proposerId,
      kind: "result",
      summary: "Bounded work completed; evidence is attached.",
      payload: { evidenceRefs: ["test://evidence"], budgetUsedCents: 10 },
      idempotencyKey: "upward-report-1",
    });

    expect(await db.select().from(workProposals)).toHaveLength(1);
    expect(await db.select().from(delegationReports)).toHaveLength(1);
    await expect(svc.createReport(refs.issueId, refs.workerId, {
      toParentAgentId: refs.reviewerId,
      kind: "status",
      summary: "Attempted lateral report.",
      payload: {},
      idempotencyKey: "illegal-report",
    })).rejects.toMatchObject({ status: 403 });
  });
});
