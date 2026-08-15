import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  admissionControls,
  admissionControlTransitions,
  admissionDecisions,
  agentWakeupRequests,
  agents,
  companies,
  createDb,
  heartbeatRunEvents,
  heartbeatRuns,
  issues,
  projects,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { admissionControlService } from "../services/admission-control.js";
import { heartbeatService } from "../services/heartbeat.js";

const mockAdapterExecute = vi.hoisted(() => vi.fn(async () => ({
  exitCode: 0,
  signal: null,
  timedOut: false,
  errorMessage: null,
  summary: "Admission replay test run.",
  provider: "test",
  model: "test-model",
})));

vi.mock("../adapters/index.ts", async () => {
  const actual = await vi.importActual<typeof import("../adapters/index.ts")>("../adapters/index.ts");
  return {
    ...actual,
    getServerAdapter: vi.fn(() => ({ supportsLocalAgentJwt: false, execute: mockAdapterExecute })),
  };
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

describeEmbeddedPostgres("native admission control", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-admission-control-");
    db = createDb(tempDb.connectionString);
  }, 60_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`));
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seed(status: "active" | "paused" = "active") {
    const companyId = randomUUID();
    const agentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: `Admission ${companyId}`,
      status,
      issuePrefix: `A${companyId.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Admission worker",
      role: "engineer",
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: { heartbeat: { enabled: true, intervalSec: 60, wakeOnDemand: true } },
      permissions: {},
    });
    return { companyId, agentId };
  }

  it("durably defers and deduplicates maintenance wakeups without creating runs", async () => {
    const { companyId, agentId } = await seed("paused");
    const heartbeat = heartbeatService(db);

    await heartbeat.wakeup(agentId, {
      source: "automation",
      reason: "recovery",
      idempotencyKey: "same-recovery",
      requestedByActorType: "system",
    });
    await heartbeat.wakeup(agentId, {
      source: "automation",
      reason: "recovery",
      idempotencyKey: "same-recovery",
      requestedByActorType: "system",
    });

    const requests = await db.select().from(agentWakeupRequests);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      companyId,
      agentId,
      status: "deferred_by_maintenance",
      dedupeKey: "same-recovery",
      admissionVersion: 1,
    });
    expect(requests[0].admissionControlId).toBeTruthy();
    expect(await db.select().from(heartbeatRuns)).toHaveLength(0);
  });

  it("enforces the staged transition graph and evidence gate", async () => {
    const { companyId } = await seed("active");
    const admission = admissionControlService(db);
    await admission.ensureCompanyControl(companyId);

    await expect(admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "illegal-open",
      actorType: "user",
    })).rejects.toMatchObject({ status: 409 });

    const draining = await admission.transition({
      companyId,
      toState: "draining",
      idempotencyKey: "drain-1",
      actorType: "user",
      reason: "safety test",
    });
    expect(draining.control.state).toBe("draining");
    expect((await admission.evaluate(companyId)).admitted).toBe(false);

    const maintenance = await admission.transition({
      companyId,
      toState: "maintenance",
      idempotencyKey: "maintenance-1",
      actorType: "user",
      reason: "drain complete",
    });
    expect(maintenance.control.state).toBe("maintenance");
    expect((await db.select().from(companies))[0].status).toBe("paused");

    await expect(admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "reopen-no-evidence",
      actorType: "user",
    })).rejects.toMatchObject({ status: 422 });

    await admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "reopening-1",
      actorType: "user",
      evidence: [{ kind: "test", result: "pass" }],
    });
    const opened = await admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "open-1",
      actorType: "user",
      evidence: [{ kind: "safety_suite", result: "pass" }],
    });
    expect(opened.control.state).toBe("open");
    expect((await db.select().from(companies))[0].status).toBe("active");
  });

  it("finishes active work before automatically settling draining to durable maintenance", async () => {
    const { companyId, agentId } = await seed("active");
    const admission = admissionControlService(db);
    await admission.ensureCompanyControl(companyId);
    const runId = randomUUID();
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      status: "running",
      startedAt: new Date(),
    });
    await admission.transition({
      companyId,
      toState: "draining",
      idempotencyKey: "availability-off",
      actorType: "user",
      actorId: "owner",
      reason: "owner_requested_agent_off",
    });

    const active = await admission.settleDraining(companyId);
    expect(active.completed).toBe(false);
    expect(active.availability).toMatchObject({
      state: "draining",
      activeRunCount: 1,
      acceptsNewRuns: false,
    });
    expect((await db.select().from(companies))[0].status).toBe("active");

    await db.update(heartbeatRuns).set({
      status: "succeeded",
      finishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(heartbeatRuns.id, runId));
    const settled = await admission.settleDraining(companyId);

    expect(settled.completed).toBe(true);
    expect(settled.availability).toMatchObject({
      state: "off",
      activeRunCount: 0,
      acceptsNewRuns: false,
    });
    expect((await db.select().from(companies))[0].status).toBe("paused");
    expect((await admission.list(companyId))[0]?.drainSnapshot).toMatchObject({ activeRunCount: 0 });
  });

  it("persists reopen replay evidence on the exact open control version", async () => {
    const { companyId } = await seed("paused");
    const admission = admissionControlService(db);
    const reopening = await admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "record-replay-reopening",
      actorType: "system",
      evidence: [{ kind: "safety_suite", result: "pass" }],
    });
    const opened = await admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "record-replay-open",
      actorType: "system",
      evidence: [{ kind: "reopen_gate", result: "pass" }],
    });
    const replay = { inspected: 4, coalesced: 3, queued: 1, notAdmitted: 0, failed: 0 };
    const recorded = await admission.recordReopenReplay({
      companyId,
      controlId: opened.control.id,
      controlVersion: opened.control.version,
      reopenAttemptId: opened.transition.id,
      replay,
    });

    expect(reopening.control.state).toBe("reopening");
    expect(recorded).toMatchObject({
      state: "open",
      version: opened.control.version,
      replaySnapshot: replay,
      reopenAttemptId: opened.transition.id,
      reopenResult: "completed",
      lastErrorCode: null,
      lastErrorMessage: null,
    });
  });

  it("stops runaway retry work with a durable needs_decision and no run", async () => {
    const { agentId } = await seed("active");
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.wakeup(agentId, {
      source: "automation",
      reason: "blocked_issue_watcher",
      contextSnapshot: {
        taskKey: "runaway-blocked-issue",
        scheduledRetryAttempt: 3,
      },
      requestedByActorType: "system",
    });

    expect(result).toBeNull();
    expect(await db.select().from(heartbeatRuns)).toHaveLength(0);
    expect(await db.select().from(agentWakeupRequests)).toMatchObject([{
      status: "needs_decision",
      replayResult: "retry_budget.exhausted",
    }]);
    expect(await db.select().from(admissionDecisions)).toMatchObject([{
      admitted: false,
      disposition: "needs_decision",
      reasonCode: "retry_budget.exhausted",
      retryCount: 3,
    }]);
  });

  it("replays only persisted maintenance wakeups after evidence-gated reopen", async () => {
    const { companyId, agentId } = await seed("paused");
    const heartbeat = heartbeatService(db);
    const admission = admissionControlService(db);
    await heartbeat.wakeup(agentId, {
      source: "automation",
      reason: "canary-replay",
      idempotencyKey: "canary-replay",
      requestedByActorType: "system",
    });
    await admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "replay-reopening",
      actorType: "system",
      evidence: [{ kind: "safety_suite", result: "pass" }],
    });
    await admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "replay-open",
      actorType: "system",
      evidence: [{ kind: "reopen_gate", result: "pass" }],
    });

    const replay = await heartbeat.replayDeferredAdmissionWakeups(companyId);
    expect(replay).toMatchObject({ inspected: 1, queued: 1, notAdmitted: 0, failed: 0 });
    const requests = await db.select().from(agentWakeupRequests);
    expect(requests.find((row) => row.idempotencyKey === "canary-replay")).toMatchObject({
      status: "replayed",
      replayResult: "queued",
    });
    expect(await db.select().from(heartbeatRuns)).toHaveLength(1);
    const runId = (await db.select({ id: heartbeatRuns.id }).from(heartbeatRuns))[0]!.id;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const status = await db.select({ status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, runId))
        .then((rows) => rows[0]?.status);
      if (status && !["queued", "running"].includes(status)) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });

  it("does not replay a maintenance wake after its issue becomes blocked", async () => {
    const { companyId, agentId } = await seed("paused");
    const issueId = randomUUID();
    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Blocked while maintenance was active",
      identifier: `A-${issueId.slice(0, 6)}`,
      status: "todo",
      assigneeAgentId: agentId,
      createdByAgentId: agentId,
    });
    const heartbeat = heartbeatService(db);
    const admission = admissionControlService(db);
    await heartbeat.wakeup(agentId, {
      source: "automation",
      reason: "issue-assigned-during-maintenance",
      payload: { issueId, taskId: issueId },
      idempotencyKey: `blocked-replay:${issueId}`,
      requestedByActorType: "system",
    });
    await db.update(issues).set({ status: "blocked" }).where(eq(issues.id, issueId));
    await admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "blocked-replay-reopening",
      actorType: "system",
      evidence: [{ kind: "safety_suite", result: "pass" }],
    });
    await admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "blocked-replay-open",
      actorType: "system",
      evidence: [{ kind: "reopen_gate", result: "pass" }],
    });

    const replay = await heartbeat.replayDeferredAdmissionWakeups(companyId);

    expect(replay).toMatchObject({ inspected: 1, queued: 0, notAdmitted: 1, failed: 0 });
    expect(await db.select().from(agentWakeupRequests)).toMatchObject([{
      status: "replayed",
      replayResult: "issue_blocked",
    }]);
    expect(await db.select().from(heartbeatRuns)).toHaveLength(0);
  });

  it("coalesces legacy recovery rearm wakeups before reopening replay", async () => {
    const { companyId, agentId } = await seed("paused");
    const heartbeat = heartbeatService(db);
    const admission = admissionControlService(db);
    const recoveryActionId = randomUUID();

    for (const attempt of [1, 2, 3]) {
      await heartbeat.wakeup(agentId, {
        source: "assignment",
        reason: "source_scoped_recovery_action",
        idempotencyKey: `source_scoped_recovery_action:${recoveryActionId}:${attempt}`,
        payload: { recoveryActionId },
        requestedByActorType: "system",
      });
    }

    await admission.transition({
      companyId,
      toState: "reopening",
      idempotencyKey: "legacy-replay-reopening",
      actorType: "system",
      evidence: [{ kind: "safety_suite", result: "pass" }],
    });
    await admission.transition({
      companyId,
      toState: "open",
      idempotencyKey: "legacy-replay-open",
      actorType: "system",
      evidence: [{ kind: "reopen_gate", result: "pass" }],
    });

    const replay = await heartbeat.replayDeferredAdmissionWakeups(companyId);
    expect(replay).toMatchObject({
      inspected: 3,
      coalesced: 2,
      queued: 1,
      notAdmitted: 0,
      failed: 0,
    });
    const requests = await db.select().from(agentWakeupRequests);
    expect(requests.filter((row) => row.replayResult === "coalesced_on_reopen")).toHaveLength(2);
    expect(await db.select().from(heartbeatRuns)).toHaveLength(1);
  });

  it("requires a new signal after a deterministic stop decision", async () => {
    const { companyId, agentId } = await seed("active");
    const admission = admissionControlService(db);
    const base = {
      companyId,
      agentId,
      source: "test",
      fingerprint: "same-problem",
      evidenceHash: "evidence-v1",
    };

    const stopped = await admission.evaluateWork({ ...base, expectedValue: -1 });
    expect(stopped.disposition).toBe("not_worth_doing");
    const unchanged = await admission.evaluateWork({ ...base, expectedValue: 10 });
    expect(unchanged.disposition).toBe("waiting_for_signal");
    const changed = await admission.evaluateWork({ ...base, evidenceHash: "evidence-v2", expectedValue: 10 });
    expect(changed.disposition).toBe("admitted");
  });

  it("reconsiders a queued signal after transient project WIP is released", async () => {
    const { companyId, agentId } = await seed("active");
    const admission = admissionControlService(db);
    const projectId = randomUUID();
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Transient WIP project",
      status: "active",
    });
    const [wakeup] = await db.insert(agentWakeupRequests).values({
      companyId,
      agentId,
      projectId,
      source: "assignment",
      status: "claimed",
    }).returning();
    const [occupyingRun] = await db.insert(heartbeatRuns).values({
      companyId,
      agentId,
      invocationSource: "assignment",
      status: "running",
      wakeupRequestId: wakeup!.id,
      contextSnapshot: { projectId },
    }).returning();
    const signal = {
      companyId,
      projectId,
      agentId,
      source: "test",
      fingerprint: "queued-after-project-wip",
      evidenceHash: "same-wake-signal",
    };

    const blocked = await admission.evaluateWork(signal);
    expect(blocked).toMatchObject({ admitted: false, reasonCode: "wip.project_limit" });

    // Reproduce the legacy poisoned chain: older builds persisted a derived
    // evidence.unchanged row after the WIP decision, which then shadowed the
    // transient root decision on every later scheduler tick.
    await db.insert(admissionDecisions).values({
      companyId,
      projectId,
      agentId,
      admissionControlId: blocked.controlId,
      controlVersion: blocked.controlVersion,
      fingerprint: signal.fingerprint,
      source: signal.source,
      disposition: "waiting_for_signal",
      admitted: false,
      reasonCode: "evidence.unchanged",
      reason: "legacy derived stop",
      evidenceHash: signal.evidenceHash,
      retryCount: 0,
      observed: blocked.observed,
      limits: blocked.limits,
      cooldownUntil: blocked.cooldownUntil,
      createdAt: new Date(Date.now() + 1_000),
    });

    await db.update(heartbeatRuns)
      .set({ status: "succeeded", finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(heartbeatRuns.id, occupyingRun!.id));

    const reconsidered = await admission.evaluateWork(signal);
    expect(reconsidered).toMatchObject({ admitted: true, reasonCode: "policy.admitted" });
  });

  it("admits continuation input for an issue that already owns the issue WIP slot", async () => {
    const { companyId, agentId } = await seed("active");
    const admission = admissionControlService(db);
    const issueId = randomUUID();
    const issuePrefix = `A${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Running issue",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
      issueNumber: 1,
      identifier: `${issuePrefix}-1`,
    });
    await db.insert(heartbeatRuns).values({
      companyId,
      agentId,
      invocationSource: "assignment",
      status: "running",
      contextSnapshot: { issueId },
    });

    const base = {
      companyId,
      issueId,
      agentId,
      source: "test",
      fingerprint: "running-issue-followup",
    };
    const duplicate = await admission.evaluateWork(base);
    expect(duplicate).toMatchObject({ admitted: false, reasonCode: "wip.issue_limit" });

    const continuation = await admission.evaluateWork({
      ...base,
      fingerprint: "running-issue-continuation",
      allowIssueWipContinuation: true,
    });
    expect(continuation).toMatchObject({ admitted: true, reasonCode: "policy.admitted" });
  });

  it("records budget holds and explicit governed risk acceptance", async () => {
    const { companyId, agentId } = await seed("active");
    const admission = admissionControlService(db);
    const held = await admission.evaluateWork({
      companyId,
      agentId,
      source: "test",
      fingerprint: "budgeted-work",
      budgetBlocked: true,
      budgetReason: "weekly provider budget exhausted",
    });
    expect(held.disposition).toBe("paused_by_budget");

    const accepted = await admission.evaluateWork({
      companyId,
      agentId,
      source: "test",
      fingerprint: "accepted-risk-work",
      acceptedRisk: true,
    });
    expect(accepted).toMatchObject({ admitted: true, disposition: "accepted_risk" });
  });
});
