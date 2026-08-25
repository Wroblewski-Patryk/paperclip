import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agents,
  agentRuntimeState,
  agentWakeupRequests,
  approvals,
  companySkills,
  companies,
  createDb,
  documentRevisions,
  documents,
  environmentLeases,
  environments,
  executionWorkspaces,
  heartbeatRunEvents,
  heartbeatRuns,
  issueComments,
  issueDocuments,
  issueApprovals,
  issueRelations,
  issueTreeHolds,
  issues,
  supervisionFindings,
  workProposals,
  workspaceOperations,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.ts";
import { runningProcesses } from "../adapters/index.ts";

const mockAdapterExecute = vi.hoisted(() =>
  vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    summary: "Dependency-aware heartbeat test run.",
    provider: "test",
    model: "test-model",
  })),
);

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

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres heartbeat dependency scheduling tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

async function ensureIssueRelationsTable(db: ReturnType<typeof createDb>) {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "issue_relations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL,
      "issue_id" uuid NOT NULL,
      "related_issue_id" uuid NOT NULL,
      "type" text NOT NULL,
      "created_by_agent_id" uuid,
      "created_by_user_id" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );
  `));
}

async function waitForCondition(fn: () => Promise<boolean>, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return fn();
}

describeEmbeddedPostgres("heartbeat dependency-aware queued run selection", () => {
  let db!: ReturnType<typeof createDb>;
  let heartbeat!: ReturnType<typeof heartbeatService>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-dependency-scheduling-");
    db = createDb(tempDb.connectionString);
    heartbeat = heartbeatService(db);
    await ensureIssueRelationsTable(db);
  }, 60_000);

  afterEach(async () => {
    mockAdapterExecute.mockReset();
    mockAdapterExecute.mockImplementation(async () => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      errorMessage: null,
      summary: "Dependency-aware heartbeat test run.",
      provider: "test",
      model: "test-model",
    }));
    runningProcesses.clear();
    let idlePolls = 0;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const runs = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns);
      const hasActiveRun = runs.some((run) => run.status === "queued" || run.status === "running");
      if (!hasActiveRun) {
        idlePolls += 1;
        if (idlePolls >= 3) break;
      } else {
        idlePolls = 0;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    await db.delete(environmentLeases);
    await db.delete(activityLog);
    await db.delete(companySkills);
    await db.delete(issueApprovals);
    await db.delete(approvals);
    await db.delete(issueComments);
    await db.delete(issueDocuments);
    await db.delete(documentRevisions);
    await db.delete(documents);
    await db.delete(supervisionFindings);
    await db.delete(workProposals);
    await db.delete(issueRelations);
    await db.delete(issueTreeHolds);
    await db.delete(issues);
    await db.delete(heartbeatRunEvents);
    await db.delete(activityLog);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agentRuntimeState);
    await db.delete(agents);
    await db.delete(companySkills);
    await db.delete(environments);
    await db.delete(workspaceOperations);
    await db.delete(executionWorkspaces);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("routes in-review timer work to the current participant instead of the stale assignee", async () => {
    const companyId = randomUUID();
    const assigneeAgentId = randomUUID();
    const reviewerAgentId = randomUUID();
    const reviewIssueId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    const heartbeatPolicy = {
      heartbeat: {
        enabled: true,
        intervalSec: 30,
        wakeOnDemand: true,
        workAware: true,
        reviewFirst: true,
        maxConcurrentRuns: 1,
      },
    };
    await db.insert(agents).values([
      {
        id: assigneeAgentId,
        companyId,
        name: "Original implementer",
        role: "engineer",
        status: "active",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: heartbeatPolicy,
        permissions: {},
        lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
      },
      {
        id: reviewerAgentId,
        companyId,
        name: "Current reviewer",
        role: "manager",
        status: "active",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: heartbeatPolicy,
        permissions: {},
        lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
      },
    ]);
    await db.insert(issues).values({
      id: reviewIssueId,
      companyId,
      title: "Review transferred to a reviewer",
      status: "in_review",
      priority: "high",
      assigneeAgentId,
      executionState: {
        status: "changes_requested",
        currentStageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        currentStageIndex: 0,
        currentStageType: "review",
        currentParticipant: { type: "agent", agentId: reviewerAgentId },
        returnAssignee: { type: "agent", agentId: assigneeAgentId },
        completedStageIds: [],
        lastDecisionId: null,
        lastDecisionOutcome: null,
      },
    });

    const result = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));

    expect(result.enqueued).toBe(1);
    const timerRuns = await db
      .select({ id: heartbeatRuns.id, agentId: heartbeatRuns.agentId, contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns);
    expect(timerRuns).toHaveLength(1);
    expect(timerRuns[0]).toMatchObject({
      agentId: reviewerAgentId,
      contextSnapshot: {
        issueId: reviewIssueId,
        reason: "assigned_review_available",
        workType: "review",
      },
    });
    const completedForReviewer = await waitForCondition(async () => {
      const current = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, timerRuns[0]!.id))
        .then((rows) => rows[0] ?? null);
      return current?.status === "succeeded";
    }, 10_000);
    expect(completedForReviewer).toBe(true);
  });

  it("does not spend timer runs polling an in-review issue whose linked approval is pending", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const pendingReviewId = randomUUID();
    const readyIssueId = randomUUID();
    let finishReadyRun!: () => void;
    const readyRunCanFinish = new Promise<void>((resolve) => {
      finishReadyRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await readyRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Independent safe work completed.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Approval-aware timer",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Security reviewer",
      role: "security",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          enabled: true,
          intervalSec: 30,
          wakeOnDemand: true,
          workAware: true,
          reviewFirst: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
      lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
    });
    await db.insert(issues).values([
      {
        id: pendingReviewId,
        companyId,
        title: "Protected review awaiting owner approval",
        status: "in_review",
        priority: "critical",
        assigneeAgentId: agentId,
      },
      {
        id: readyIssueId,
        companyId,
        title: "Independent safe work",
        status: "todo",
        priority: "high",
        assigneeAgentId: agentId,
      },
    ]);
    const [approval] = await db.insert(approvals).values({
      companyId,
      type: "request_board_approval",
      requestedByAgentId: agentId,
      status: "pending",
      payload: { title: "Approve one protected review action" },
    }).returning();
    await db.insert(issueApprovals).values({
      companyId,
      issueId: pendingReviewId,
      approvalId: approval!.id,
      linkedByAgentId: agentId,
    });

    const result = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));

    expect(result.enqueued).toBe(1);
    const timerRun = await db
      .select({ id: heartbeatRuns.id, contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.agentId, agentId))
      .then((rows) => rows[0] ?? null);
    expect(timerRun?.contextSnapshot).toMatchObject({
      issueId: readyIssueId,
      reason: "assigned_work_available",
    });

    const pendingApprovalTimerAttempts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentWakeupRequests)
      .where(and(
        eq(agentWakeupRequests.source, "timer"),
        sql`${agentWakeupRequests.payload} ->> 'issueId' = ${pendingReviewId}`,
      ))
      .then((rows) => rows[0]?.count ?? 0);
    expect(pendingApprovalTimerAttempts).toBe(0);

    await db.update(issues).set({ status: "done", updatedAt: new Date() }).where(eq(issues.id, readyIssueId));
    finishReadyRun();

    const completed = await waitForCondition(async () => {
      if (!timerRun) return false;
      const current = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, timerRun.id))
        .then((rows) => rows[0] ?? null);
      return current?.status === "succeeded";
    }, 10_000);
    expect(completed).toBe(true);
  });

  it("keeps blocked descendants idle until their blockers resolve", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const blockerId = randomUUID();
    const blockedIssueId = randomUUID();
    const readyIssueId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "CodexCoder",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
    });
    await db.insert(issues).values([
      {
        id: blockerId,
        companyId,
        title: "Mission 0",
        status: "todo",
        priority: "high",
      },
      {
        id: blockedIssueId,
        companyId,
        title: "Mission 2",
        status: "todo",
        priority: "medium",
        assigneeAgentId: agentId,
      },
      {
        id: readyIssueId,
        companyId,
        title: "Mission 1",
        status: "todo",
        priority: "critical",
        assigneeAgentId: agentId,
      },
    ]);
    await db.insert(issueRelations).values({
      companyId,
      issueId: blockerId,
      relatedIssueId: blockedIssueId,
      type: "blocks",
    });

    const blockedWake = await heartbeat.wakeup(agentId, {
      source: "assignment",
      triggerDetail: "system",
      reason: "issue_assigned",
      payload: { issueId: blockedIssueId },
      contextSnapshot: { issueId: blockedIssueId, wakeReason: "issue_assigned" },
    });
    expect(blockedWake).toBeNull();

    const blockedWakeRequest = await waitForCondition(async () => {
      const wakeup = await db
        .select({
          status: agentWakeupRequests.status,
          reason: agentWakeupRequests.reason,
        })
        .from(agentWakeupRequests)
        .where(
          and(
            eq(agentWakeupRequests.agentId, agentId),
            sql`${agentWakeupRequests.payload} ->> 'issueId' = ${blockedIssueId}`,
          ),
        )
        .orderBy(agentWakeupRequests.requestedAt)
        .then((rows) => rows[0] ?? null);
      return Boolean(
        wakeup &&
        wakeup.status === "skipped" &&
        wakeup.reason === "issue_dependencies_blocked",
      );
    });
    expect(blockedWakeRequest).toBe(true);

    const blockedRunsBeforeResolution = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(heartbeatRuns)
      .where(sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${blockedIssueId}`)
      .then((rows) => rows[0]?.count ?? 0);
    expect(blockedRunsBeforeResolution).toBe(0);

    const interactionWake = await heartbeat.wakeup(agentId, {
      source: "automation",
      triggerDetail: "system",
      reason: "issue_commented",
      payload: { issueId: blockedIssueId, commentId: randomUUID() },
      contextSnapshot: {
        issueId: blockedIssueId,
        wakeReason: "issue_commented",
      },
    });
    expect(interactionWake).not.toBeNull();

    await waitForCondition(async () => {
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, interactionWake!.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });

    const interactionRun = await db
      .select({
        status: heartbeatRuns.status,
        contextSnapshot: heartbeatRuns.contextSnapshot,
      })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, interactionWake!.id))
      .then((rows) => rows[0] ?? null);

    expect(interactionRun?.status).toBe("succeeded");
    expect(interactionRun?.contextSnapshot).toMatchObject({
      dependencyBlockedInteraction: true,
      unresolvedBlockerIssueIds: [blockerId],
    });

    let finishReadyRun!: () => void;
    const readyRunCanFinish = new Promise<void>((resolve) => {
      finishReadyRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await readyRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Ready dependency scheduling run complete.",
        provider: "test",
        model: "test-model",
      };
    });

    const readyWake = await heartbeat.wakeup(agentId, {
      source: "assignment",
      triggerDetail: "system",
      reason: "issue_assigned",
      payload: { issueId: readyIssueId },
      contextSnapshot: { issueId: readyIssueId, wakeReason: "issue_assigned" },
    });
    expect(readyWake).not.toBeNull();
    await db.insert(issueComments).values({
      companyId,
      issueId: readyIssueId,
      authorAgentId: agentId,
      authorType: "agent",
      createdByRunId: readyWake!.id,
      body: "Ready dependency scheduling run complete.",
    });
    finishReadyRun();

    await waitForCondition(async () => {
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, readyWake!.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });

    const readyRun = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, readyWake!.id))
      .then((rows) => rows[0] ?? null);

    expect(readyRun?.status).toBe("succeeded");

    await db
      .update(issues)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(issues.id, blockerId));

    const promotedWake = await heartbeat.wakeup(agentId, {
      source: "automation",
      triggerDetail: "system",
      reason: "issue_blockers_resolved",
      payload: { issueId: blockedIssueId, resolvedBlockerIssueId: blockerId },
      contextSnapshot: {
        issueId: blockedIssueId,
        wakeReason: "issue_blockers_resolved",
        resolvedBlockerIssueId: blockerId,
      },
    });
    expect(promotedWake).not.toBeNull();

    await waitForCondition(async () => {
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, promotedWake!.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });

    const promotedBlockedRun = await db
      .select({
        id: heartbeatRuns.id,
        status: heartbeatRuns.status,
      })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, promotedWake!.id))
      .then((rows) => rows[0] ?? null);
    const blockedWakeRequestCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentWakeupRequests)
      .where(
        and(
          eq(agentWakeupRequests.agentId, agentId),
          sql`${agentWakeupRequests.payload} ->> 'issueId' = ${blockedIssueId}`,
        ),
      )
      .then((rows) => rows[0]?.count ?? 0);

    expect(promotedBlockedRun?.status).toBe("succeeded");
    expect(blockedWakeRequestCount).toBeGreaterThanOrEqual(2);

    const noActiveRuns = await waitForCondition(async () => {
      const rows = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns);
      return rows.every((run) => run.status !== "queued" && run.status !== "running");
    }, 10_000);
    expect(noActiveRuns).toBe(true);
  });

  it("does not let a cancelled blocker starve the next work-aware timer candidate", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const cancelledBlockerId = randomUUID();
    const blockedReviewId = randomUUID();
    const readyReviewId = randomUUID();
    let finishTimerRun!: () => void;
    const timerRunCanFinish = new Promise<void>((resolve) => {
      finishTimerRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await timerRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Independent ready review completed.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "TimerReviewer",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          enabled: true,
          intervalSec: 30,
          wakeOnDemand: true,
          workAware: true,
          reviewFirst: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
      lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
    });
    await db.insert(issues).values([
      {
        id: cancelledBlockerId,
        companyId,
        title: "Cancelled recovery attempt",
        status: "cancelled",
        priority: "critical",
      },
      {
        id: blockedReviewId,
        companyId,
        title: "Review still blocked by cancelled recovery",
        status: "in_review",
        priority: "critical",
        assigneeAgentId: agentId,
      },
      {
        id: readyReviewId,
        companyId,
        title: "Independent ready review",
        status: "in_review",
        priority: "high",
        assigneeAgentId: agentId,
      },
    ]);
    await db.insert(issueRelations).values({
      companyId,
      issueId: cancelledBlockerId,
      relatedIssueId: blockedReviewId,
      type: "blocks",
    });

    const result = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));

    expect(result.enqueued).toBe(1);
    const timerRun = await db
      .select({ id: heartbeatRuns.id, contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.agentId, agentId))
      .orderBy(heartbeatRuns.createdAt)
      .then((rows) => rows[0] ?? null);
    expect(timerRun?.contextSnapshot).toMatchObject({
      issueId: readyReviewId,
      reason: "assigned_review_available",
      workType: "review",
    });

    const blockedTimerAttempts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentWakeupRequests)
      .where(
        and(
          eq(agentWakeupRequests.source, "timer"),
          sql`${agentWakeupRequests.payload} ->> 'issueId' = ${blockedReviewId}`,
        ),
      )
      .then((rows) => rows[0]?.count ?? 0);
    expect(blockedTimerAttempts).toBe(0);

    await db.update(issues).set({ status: "done" }).where(eq(issues.id, readyReviewId));
    finishTimerRun();
    const timerRunFinished = await waitForCondition(async () => {
      if (!timerRun) return false;
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, timerRun.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });
    expect(timerRunFinished).toBe(true);
  });

  it("does not let a review with a cancelled blocker suppress independent implementation work", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const cancelledBlockerId = randomUUID();
    const blockedReviewId = randomUUID();
    const readyImplementationId = randomUUID();
    let finishTimerRun!: () => void;
    const timerRunCanFinish = new Promise<void>((resolve) => {
      finishTimerRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await timerRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Independent implementation completed.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "TimerImplementer",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          enabled: true,
          intervalSec: 30,
          wakeOnDemand: true,
          workAware: true,
          reviewFirst: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
      lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
    });
    await db.insert(issues).values([
      {
        id: cancelledBlockerId,
        companyId,
        title: "Cancelled review recovery",
        status: "cancelled",
        priority: "critical",
      },
      {
        id: blockedReviewId,
        companyId,
        title: "Review awaiting blocker replacement",
        status: "in_review",
        priority: "critical",
      },
      {
        id: readyImplementationId,
        companyId,
        title: "Independent implementation",
        status: "todo",
        priority: "high",
        assigneeAgentId: agentId,
      },
    ]);
    await db.insert(issueRelations).values({
      companyId,
      issueId: cancelledBlockerId,
      relatedIssueId: blockedReviewId,
      type: "blocks",
    });

    const result = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));

    expect(result.enqueued).toBe(1);
    const timerRun = await db
      .select({ id: heartbeatRuns.id, contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.agentId, agentId))
      .orderBy(heartbeatRuns.createdAt)
      .then((rows) => rows[0] ?? null);
    expect(timerRun?.contextSnapshot).toMatchObject({
      issueId: readyImplementationId,
      reason: "assigned_work_available",
      workType: "implementation",
    });

    await db.update(issues).set({ status: "done" }).where(eq(issues.id, readyImplementationId));
    finishTimerRun();
    const timerRunFinished = await waitForCondition(async () => {
      if (!timerRun) return false;
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, timerRun.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });
    expect(timerRunFinished).toBe(true);
  });

  it("skips an issue-scoped execution quota hold without suppressing independent work", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const heldReviewId = randomUUID();
    const readyImplementationId = randomUUID();
    let finishTimerRun!: () => void;
    const timerRunCanFinish = new Promise<void>((resolve) => {
      finishTimerRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await timerRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Independent implementation completed while quota-held review stayed idle.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "QuotaAwareTimer",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          enabled: true,
          intervalSec: 30,
          wakeOnDemand: true,
          workAware: true,
          reviewFirst: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
      lastHeartbeatAt: new Date("2026-06-03T23:00:00Z"),
    });
    await db.insert(issues).values([
      {
        id: heldReviewId,
        companyId,
        title: "Review held by its execution quota",
        status: "in_review",
        priority: "critical",
        assigneeAgentId: agentId,
      },
      {
        id: readyImplementationId,
        companyId,
        title: "Independent implementation",
        status: "todo",
        priority: "high",
        assigneeAgentId: agentId,
      },
    ]);
    await db.insert(supervisionFindings).values({
      companyId,
      fingerprint: `quota_bottleneck:issue:${heldReviewId}`,
      problemClass: "execution_quota_exceeded",
      severity: "critical",
      status: "needs_decision",
      classification: "quota_bottleneck",
      sourceKind: "native_watchdog",
      title: `Execution quota held issue ${heldReviewId}`,
      summary: "Issue exceeded its dedicated execution limit.",
      issueId: heldReviewId,
      affectedAgentId: agentId,
      recoveryState: "blocked",
      bottleneckType: "quota_bottleneck",
    });

    const result = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));

    expect(result.enqueued).toBe(1);
    const timerRun = await db
      .select({ id: heartbeatRuns.id, contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.agentId, agentId))
      .orderBy(heartbeatRuns.createdAt)
      .then((rows) => rows[0] ?? null);
    expect(timerRun?.contextSnapshot).toMatchObject({
      issueId: readyImplementationId,
      reason: "assigned_work_available",
      workType: "implementation",
    });

    const heldTimerAttempts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentWakeupRequests)
      .where(
        and(
          eq(agentWakeupRequests.source, "timer"),
          sql`${agentWakeupRequests.payload} ->> 'issueId' = ${heldReviewId}`,
        ),
      )
      .then((rows) => rows[0]?.count ?? 0);
    expect(heldTimerAttempts).toBe(0);

    await db.update(issues).set({ status: "done" }).where(eq(issues.id, readyImplementationId));
    finishTimerRun();
    const timerRunFinished = await waitForCondition(async () => {
      if (!timerRun) return false;
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, timerRun.id))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });
    expect(timerRunFinished).toBe(true);
  });

  it("restores an agent after a session budget stop when the source issue is already terminal", async () => {
    const companyId = randomUUID();
    const recoveredAgentId = randomUUID();
    const heldAgentId = randomUUID();
    const doneIssueId = randomUUID();
    const openIssueId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Terminal budget recovery",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values([
      {
        id: recoveredAgentId,
        companyId,
        name: "Recovered tester",
        role: "engineer",
        status: "error",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
      {
        id: heldAgentId,
        companyId,
        name: "Held tester",
        role: "engineer",
        status: "error",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
    ]);
    await db.insert(issues).values([
      { id: doneIssueId, companyId, title: "Completed proof", status: "done", assigneeAgentId: recoveredAgentId },
      { id: openIssueId, companyId, title: "Incomplete proof", status: "todo", assigneeAgentId: heldAgentId },
    ]);
    await db.insert(heartbeatRuns).values([
      {
        companyId,
        agentId: recoveredAgentId,
        invocationSource: "assignment",
        status: "failed",
        errorCode: "SESSION_BUDGET_EXHAUSTED",
        error: "Stopped by session runtime budget",
        contextSnapshot: { issueId: doneIssueId },
        finishedAt: new Date("2026-08-13T00:00:00Z"),
      },
      {
        companyId,
        agentId: heldAgentId,
        invocationSource: "assignment",
        status: "failed",
        errorCode: "SESSION_BUDGET_EXHAUSTED",
        error: "Stopped by session runtime budget",
        contextSnapshot: { issueId: openIssueId },
        finishedAt: new Date("2026-08-13T00:00:00Z"),
      },
    ]);

    const result = await heartbeat.tickTimers(new Date("2026-08-13T01:00:00Z"));
    const [recovered, held] = await Promise.all([
      db.select({ status: agents.status }).from(agents).where(eq(agents.id, recoveredAgentId)).then((rows) => rows[0]),
      db.select({ status: agents.status }).from(agents).where(eq(agents.id, heldAgentId)).then((rows) => rows[0]),
    ]);

    expect(result.reconciledSessionBudgetAgentErrors).toBe(1);
    expect(result.reconciledSessionBudgetAgentIds).toEqual([recoveredAgentId]);
    expect(recovered?.status).toBe("idle");
    expect(held?.status).toBe("error");
  });

  it("creates and wakes one idempotent review task for a submitted work proposal", async () => {
    const companyId = randomUUID();
    const proposerId = randomUUID();
    const targetParentId = randomUUID();
    const sourceIssueId = randomUUID();
    const proposalId = randomUUID();
    let finishReviewRun!: () => void;
    const reviewRunCanFinish = new Promise<void>((resolve) => {
      finishReviewRun = resolve;
    });
    mockAdapterExecute.mockImplementationOnce(async () => {
      await reviewRunCanFinish;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "Work proposal review completed.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values([
      {
        id: targetParentId,
        companyId,
        name: "TargetParent",
        role: "manager",
        status: "active",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: { heartbeat: { enabled: false, maxConcurrentRuns: 1 } },
        permissions: {},
      },
      {
        id: proposerId,
        companyId,
        name: "Proposer",
        role: "engineer",
        status: "active",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: { heartbeat: { enabled: false, maxConcurrentRuns: 1 } },
        permissions: {},
        reportsTo: targetParentId,
      },
    ]);
    await db.insert(issues).values({
      id: sourceIssueId,
      companyId,
      title: "[Project Alpha][Backend] Source implementation",
      status: "in_review",
      priority: "high",
      assigneeAgentId: proposerId,
    });
    await db.insert(workProposals).values({
      id: proposalId,
      companyId,
      sourceIssueId,
      proposedByAgentId: proposerId,
      targetParentAgentId: targetParentId,
      title: "Route source implementation",
      problemStatement: "The source needs a governed specialist lane.",
      expectedOutcome: "The parent routes or rejects the proposal.",
      idempotencyKey: "proposal-review-dispatch-1",
    });

    const firstTick = await heartbeat.tickTimers(new Date("2026-06-04T00:10:00Z"));
    expect(firstTick.enqueued).toBe(1);
    const reviewIssue = await db.select().from(issues).where(and(
      eq(issues.originKind, "work_proposal_review"),
      eq(issues.originId, proposalId),
    )).then((rows) => rows[0] ?? null);
    expect(reviewIssue).toMatchObject({
      title: "[Project Alpha][Backend][Work Proposal] Route source implementation",
      parentId: sourceIssueId,
      assigneeAgentId: targetParentId,
    });

    const reviewRun = await db.select().from(heartbeatRuns).where(eq(
      heartbeatRuns.agentId,
      targetParentId,
    )).then((rows) => rows[0] ?? null);
    expect(reviewRun?.contextSnapshot).toMatchObject({
      issueId: reviewIssue?.id,
      sourceIssueId,
      workProposalId: proposalId,
      wakeReason: "work_proposal_submitted",
    });

    const secondTick = await heartbeat.tickTimers(new Date("2026-06-04T00:11:00Z"));
    expect(secondTick.enqueued).toBe(0);
    expect(await db.select().from(issues).where(and(
      eq(issues.originKind, "work_proposal_review"),
      eq(issues.originId, proposalId),
    ))).toHaveLength(1);

    finishReviewRun();
    expect(await waitForCondition(async () => {
      if (!reviewRun) return false;
      return db.select({ status: heartbeatRuns.status }).from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, reviewRun.id))
        .then((rows) => rows[0]?.status === "succeeded");
    })).toBe(true);
  });

  it("honors maxConcurrentRuns 1 by leaving a second assignment wake queued", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const firstIssueId = randomUUID();
    const secondIssueId = randomUUID();
    let finishFirstRun!: () => void;
    const firstRunFinished = new Promise<void>((resolve) => {
      finishFirstRun = resolve;
    });

    mockAdapterExecute.mockImplementationOnce(async () => {
      await firstRunFinished;
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        summary: "First assignment run completed.",
        provider: "test",
        model: "test-model",
      };
    });

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "CodexCoder",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
    });
    await db.insert(issues).values([
      {
        id: firstIssueId,
        companyId,
        title: "First assignment",
        status: "todo",
        priority: "high",
        assigneeAgentId: agentId,
      },
      {
        id: secondIssueId,
        companyId,
        title: "Second assignment",
        status: "todo",
        priority: "high",
        assigneeAgentId: agentId,
      },
    ]);

    try {
      const firstWake = await heartbeat.wakeup(agentId, {
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_assigned",
        payload: { issueId: firstIssueId },
        contextSnapshot: { issueId: firstIssueId, wakeReason: "issue_assigned" },
      });
      expect(firstWake).not.toBeNull();
      await db.insert(issueComments).values({
        companyId,
        issueId: firstIssueId,
        authorAgentId: agentId,
        authorType: "agent",
        createdByRunId: firstWake!.id,
        body: "First assignment run completed.",
      });

      const firstRunStarted = await waitForCondition(async () => {
        const run = await db
          .select({ status: heartbeatRuns.status })
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, firstWake!.id))
          .then((rows) => rows[0] ?? null);
        return run?.status === "running";
      });
      expect(firstRunStarted).toBe(true);
      const firstAdapterStarted = await waitForCondition(async () => mockAdapterExecute.mock.calls.length === 1, 30_000);
      expect(firstAdapterStarted).toBe(true);

      const secondWake = await heartbeat.wakeup(agentId, {
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_assigned",
        payload: { issueId: secondIssueId },
        contextSnapshot: { issueId: secondIssueId, wakeReason: "issue_assigned" },
      });
      expect(secondWake).not.toBeNull();
      await db.insert(issueComments).values({
        companyId,
        issueId: secondIssueId,
        authorAgentId: agentId,
        authorType: "agent",
        createdByRunId: secondWake!.id,
        body: "Second assignment run completed.",
      });

      const secondRunWhileFirstRunning = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, secondWake!.id))
        .then((rows) => rows[0] ?? null);
      expect(secondRunWhileFirstRunning?.status).toBe("queued");
      expect(mockAdapterExecute).toHaveBeenCalledTimes(1);

      finishFirstRun();

      const firstRunSucceeded = await waitForCondition(async () => {
        const run = await db
          .select({ status: heartbeatRuns.status })
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, firstWake!.id))
          .then((rows) => rows[0] ?? null);
        return run?.status === "succeeded";
      });
      expect(firstRunSucceeded).toBe(true);

      const secondRunSucceeded = await waitForCondition(async () => {
        const run = await db
          .select({ status: heartbeatRuns.status })
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, secondWake!.id))
          .then((rows) => rows[0] ?? null);
        return run?.status === "succeeded";
      }, 10_000);
      expect(secondRunSucceeded).toBe(true);
      expect(mockAdapterExecute.mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      finishFirstRun();
    }
  }, 40_000);

  it("cancels stale queued runs when issue blockers are still unresolved", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const blockerId = randomUUID();
    const blockedIssueId = randomUUID();
    const readyIssueId = randomUUID();
    const blockedWakeupRequestId = randomUUID();
    const readyWakeupRequestId = randomUUID();
    const blockedRunId = randomUUID();
    const readyRunId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "QAChecker",
      role: "qa",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 2,
        },
      },
      permissions: {},
    });
    await db.insert(issues).values([
      {
        id: blockerId,
        companyId,
        title: "Security review",
        status: "blocked",
        priority: "high",
      },
      {
        id: blockedIssueId,
        companyId,
        title: "QA validation",
        status: "blocked",
        priority: "medium",
        assigneeAgentId: agentId,
      },
      {
        id: readyIssueId,
        companyId,
        title: "Ready QA task",
        status: "todo",
        priority: "low",
        assigneeAgentId: agentId,
      },
    ]);
    await db.insert(issueRelations).values({
      companyId,
      issueId: blockerId,
      relatedIssueId: blockedIssueId,
      type: "blocks",
    });
    await db.insert(agentWakeupRequests).values([
      {
        id: blockedWakeupRequestId,
        companyId,
        agentId,
        source: "automation",
        triggerDetail: "system",
        reason: "transient_failure_retry",
        payload: { issueId: blockedIssueId },
        status: "queued",
      },
      {
        id: readyWakeupRequestId,
        companyId,
        agentId,
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_assigned",
        payload: { issueId: readyIssueId },
        status: "queued",
      },
    ]);
    await db.insert(heartbeatRuns).values([
      {
        id: blockedRunId,
        companyId,
        agentId,
        invocationSource: "automation",
        triggerDetail: "system",
        status: "queued",
        wakeupRequestId: blockedWakeupRequestId,
        contextSnapshot: {
          issueId: blockedIssueId,
          wakeReason: "transient_failure_retry",
        },
      },
      {
        id: readyRunId,
        companyId,
        agentId,
        invocationSource: "assignment",
        triggerDetail: "system",
        status: "queued",
        wakeupRequestId: readyWakeupRequestId,
        contextSnapshot: {
          issueId: readyIssueId,
          wakeReason: "issue_assigned",
        },
      },
    ]);
    await db
      .update(agentWakeupRequests)
      .set({ runId: blockedRunId })
      .where(eq(agentWakeupRequests.id, blockedWakeupRequestId));
    await db
      .update(agentWakeupRequests)
      .set({ runId: readyRunId })
      .where(eq(agentWakeupRequests.id, readyWakeupRequestId));
    await db.insert(issueComments).values({
      companyId,
      issueId: readyIssueId,
      authorAgentId: agentId,
      authorType: "agent",
      createdByRunId: readyRunId,
      body: "Ready queued run completed.",
    });
    await db
      .update(issues)
      .set({
        executionRunId: blockedRunId,
        executionAgentNameKey: "qa-checker",
        executionLockedAt: new Date(),
      })
      .where(eq(issues.id, blockedIssueId));

    await heartbeat.resumeQueuedRuns();

    await waitForCondition(async () => {
      const run = await db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, readyRunId))
        .then((rows) => rows[0] ?? null);
      return run?.status === "succeeded";
    });

    const [blockedRun, blockedWakeup, blockedIssue, readyRun] = await Promise.all([
      db
        .select({
          status: heartbeatRuns.status,
          errorCode: heartbeatRuns.errorCode,
          finishedAt: heartbeatRuns.finishedAt,
          resultJson: heartbeatRuns.resultJson,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, blockedRunId))
        .then((rows) => rows[0] ?? null),
      db
        .select({
          status: agentWakeupRequests.status,
          error: agentWakeupRequests.error,
        })
        .from(agentWakeupRequests)
        .where(eq(agentWakeupRequests.id, blockedWakeupRequestId))
        .then((rows) => rows[0] ?? null),
      db
        .select({
          executionRunId: issues.executionRunId,
          executionAgentNameKey: issues.executionAgentNameKey,
          executionLockedAt: issues.executionLockedAt,
        })
        .from(issues)
        .where(eq(issues.id, blockedIssueId))
        .then((rows) => rows[0] ?? null),
      db
        .select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, readyRunId))
        .then((rows) => rows[0] ?? null),
    ]);

    expect(blockedRun?.status).toBe("cancelled");
    expect(blockedRun?.errorCode).toBe("issue_dependencies_blocked");
    expect(blockedRun?.finishedAt).toBeTruthy();
    expect(blockedRun?.resultJson).toMatchObject({ stopReason: "issue_dependencies_blocked" });
    expect(blockedWakeup?.status).toBe("skipped");
    expect(blockedWakeup?.error).toContain("dependencies are still blocked");
    expect(blockedIssue).toMatchObject({
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
    });
    expect(readyRun?.status).toBe("succeeded");
    expect(mockAdapterExecute.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("suppresses normal wakeups while allowing comment interaction wakes under a pause hold", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const rootIssueId = randomUUID();
    const issueChain = Array.from({ length: 17 }, () => randomUUID());
    const deepDescendantIssueId = issueChain.at(-1)!;

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "SecurityEngineer",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
    });
    await db.insert(issues).values([
      {
        id: rootIssueId,
        companyId,
        title: "Paused root",
        status: "todo",
        priority: "medium",
        assigneeAgentId: agentId,
      },
      ...issueChain.map((issueId, index) => ({
        id: issueId,
        companyId,
        parentId: index === 0 ? rootIssueId : issueChain[index - 1],
        title: `Paused desc ${index + 1}`,
        status: "todo",
        priority: "medium",
        assigneeAgentId: agentId,
      })),
    ]);
    const [hold] = await db
      .insert(issueTreeHolds)
      .values({
        companyId,
        rootIssueId,
        mode: "pause",
        status: "active",
        reason: "security test hold",
        releasePolicy: { strategy: "manual" },
      })
      .returning();

    const blockedWake = await heartbeat.wakeup(agentId, {
      source: "automation",
      triggerDetail: "system",
      reason: "issue_blockers_resolved",
      payload: { issueId: deepDescendantIssueId },
      contextSnapshot: { issueId: deepDescendantIssueId, wakeReason: "issue_blockers_resolved" },
    });

    expect(blockedWake).toBeNull();
    const skippedWake = await db
      .select({
        status: agentWakeupRequests.status,
        reason: agentWakeupRequests.reason,
      })
      .from(agentWakeupRequests)
      .where(sql`${agentWakeupRequests.payload} ->> 'issueId' = ${deepDescendantIssueId}`)
      .then((rows) => rows[0] ?? null);
    expect(skippedWake).toMatchObject({ status: "skipped", reason: "issue_tree_hold_active" });

    const childCommentId = randomUUID();
    await db.insert(issueComments).values({
      id: childCommentId,
      companyId,
      issueId: deepDescendantIssueId,
      authorUserId: "board-user",
      body: "Please respond while this hold is active.",
    });

    const forgedChildCommentWake = await heartbeat.wakeup(agentId, {
      source: "on_demand",
      triggerDetail: "manual",
      reason: "issue_commented",
      payload: { issueId: deepDescendantIssueId, commentId: childCommentId },
      requestedByActorType: "agent",
      requestedByActorId: agentId,
    });
    expect(forgedChildCommentWake).toBeNull();

    const childCommentWake = await heartbeat.wakeup(agentId, {
      source: "automation",
      triggerDetail: "system",
      reason: "issue_commented",
      payload: { issueId: deepDescendantIssueId, commentId: childCommentId },
      requestedByActorType: "user",
      requestedByActorId: "board-user",
      contextSnapshot: {
        issueId: deepDescendantIssueId,
        commentId: childCommentId,
        wakeCommentId: childCommentId,
        wakeReason: "issue_commented",
        source: "issue.comment",
      },
    });

    expect(childCommentWake).not.toBeNull();
    const childRun = await db
      .select({ contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, childCommentWake!.id))
      .then((rows) => rows[0] ?? null);
    expect(childRun?.contextSnapshot).toMatchObject({
      treeHoldInteraction: true,
      activeTreeHold: {
        holdId: hold.id,
        rootIssueId,
        mode: "pause",
        interaction: true,
      },
    });
  });

  it("allows comment interaction wakes when a legacy hold has a full_pause note", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const rootIssueId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "SecurityEngineer",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {
        heartbeat: {
          wakeOnDemand: true,
          maxConcurrentRuns: 1,
        },
      },
      permissions: {},
    });
    await db.insert(issues).values({
      id: rootIssueId,
      companyId,
      title: "Paused root",
      status: "todo",
      priority: "medium",
      assigneeAgentId: agentId,
    });
    await db.insert(issueTreeHolds).values({
      companyId,
      rootIssueId,
      mode: "pause",
      status: "active",
      reason: "full pause",
      releasePolicy: { strategy: "manual", note: "full_pause" },
    });

    const rootCommentId = randomUUID();
    await db.insert(issueComments).values({
      id: rootCommentId,
      companyId,
      issueId: rootIssueId,
      authorUserId: "board-user",
      body: "Please respond while this hold is active.",
    });

    const rootCommentWake = await heartbeat.wakeup(agentId, {
      source: "automation",
      triggerDetail: "system",
      reason: "issue_commented",
      payload: { issueId: rootIssueId, commentId: rootCommentId },
      requestedByActorType: "user",
      requestedByActorId: "board-user",
      contextSnapshot: {
        issueId: rootIssueId,
        commentId: rootCommentId,
        wakeCommentId: rootCommentId,
        wakeReason: "issue_commented",
        source: "issue.comment",
      },
    });

    expect(rootCommentWake).not.toBeNull();
    const rootRun = await db
      .select({ contextSnapshot: heartbeatRuns.contextSnapshot })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, rootCommentWake!.id))
      .then((rows) => rows[0] ?? null);
    expect(rootRun?.contextSnapshot).toMatchObject({
      treeHoldInteraction: true,
      activeTreeHold: {
        rootIssueId,
        mode: "pause",
        interaction: true,
      },
    });
  });
});
