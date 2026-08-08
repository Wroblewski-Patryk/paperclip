import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { agents, companies, costEvents, createDb, deliveryTasks, heartbeatRuns, issueThreadInteractions, issues, nativeSafeguards, organizationalObservations, productDeliveries, productOutcomes, projects, supervisionFindings, supervisionInterventions, supervisionObservationWindows, supervisionRootCauses } from "@paperclipai/db";
import { classifyNativeRemediation, nativeSupervisionEngine } from "../services/native-supervision-engine.js";
import { supervisionRegistryService } from "../services/supervision-registry.js";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describeEmbedded("native supervision engine", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  beforeAll(async () => { tempDb = await startEmbeddedPostgresTestDatabase("paperclip-native-supervision-"); db = createDb(tempDb.connectionString); }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed(withDoctor = false) {
    const companyId = randomUUID(); const ownerId = randomUUID(); const projectId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Native supervision", issuePrefix: `N${companyId.slice(0, 6)}`, status: "active", requireBoardApprovalForNewAgents: false });
    await db.insert(agents).values({ id: ownerId, companyId, name: withDoctor ? "Operational Doctor" : "Owner", role: withDoctor ? "operational_doctor" : "manager", permissions: {} });
    await db.insert(projects).values({ id: projectId, companyId, name: "Observed project", status: "in_progress", leadAgentId: ownerId });
    return { companyId, ownerId, projectId };
  }

  it("routes only deterministic bounded corrections to native auto-remediation", () => {
    expect(classifyNativeRemediation({ problemClass: "dispatch_capacity_gap", severity: "critical" })).toMatchObject({ route: "auto_remediate", riskLevel: "low" });
    expect(classifyNativeRemediation({ problemClass: "review_bottleneck", severity: "high" })).toMatchObject({ route: "review_then_remediate", riskLevel: "medium" });
    expect(classifyNativeRemediation({ problemClass: "unknown_mutation", severity: "critical" })).toMatchObject({ route: "escalate", riskLevel: "high" });
  });

  it("runs a green deterministic audit without an LLM or findings", async () => {
    const refs = await seed();
    const result = await nativeSupervisionEngine(db).runDailyAudit(refs.companyId, new Date("2026-08-04T03:00:00Z"));
    expect(result.checks.every((check) => check.status === "passed")).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.cycle?.metrics).toMatchObject({ llmCalls: 0, failed: 0 });
  });

  it("refuses a false-green watchdog result while a severe finding remains active", async () => {
    const refs = await seed();
    await supervisionRegistryService(db).upsertFinding(refs.companyId, {
      fingerprint: "existing:critical", problemClass: "known_runtime_defect", severity: "critical",
      status: "needs_decision", classification: "runtime_health", sourceKind: "manual", sourceRef: "test",
      title: "Known critical defect", summary: "The defect remains unresolved and must keep supervision non-green.",
      affectedComponent: "runtime", ownerAgentId: refs.ownerId, retryCount: 0, economics: {}, decision: {},
      recoveryState: "blocked", evidence: [], recurrenceEvidence: {},
    });

    const result = await nativeSupervisionEngine(db).runWatchdog(refs.companyId, new Date("2026-08-04T03:00:00Z"));

    expect(result.checks.find((check) => check.key === "active_findings_guard")).toMatchObject({ status: "failed", count: 1 });
    expect(result.cycle?.metrics).toMatchObject({ failed: 1 });
    expect(await db.select().from(supervisionFindings)).toHaveLength(1);
  });

  it("turns external-only assurance findings into a native core finding", async () => {
    const refs = await seed();
    await supervisionRegistryService(db).compareExternalAssurance(refs.companyId, {
      externalSource: "codex_watchdog",
      externalCycleId: "external-1",
      nativeCycleId: null,
      externalFindings: [{ fingerprint: "external:orphan-lock", severity: "critical" }],
    });

    const result = await nativeSupervisionEngine(db).runWatchdog(refs.companyId, new Date("2026-08-04T03:00:00Z"));

    expect(result.checks.find((check) => check.key === "external_shadow_gap")).toMatchObject({ status: "failed", count: 1 });
    expect((await db.select().from(supervisionFindings)).some((finding) => finding.problemClass === "external_assurance_gap")).toBe(true);
  });

  it("detects stalled admitted work and deduplicates its finding across cycles", async () => {
    const refs = await seed();
    await db.insert(productDeliveries).values({ companyId: refs.companyId, projectId: refs.projectId, title: "Stalled delivery", problemStatement: "No run starts", decisionContract: {}, stage: "admitted", ownerAgentId: refs.ownerId, updatedAt: new Date("2026-08-01T00:00:00Z") });
    const engine = nativeSupervisionEngine(db);
    const first = await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:01:00Z"));
    const second = await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:11:00Z"));
    expect(first.checks.find((check) => check.key === "stalled_ready_work")?.status).toBe("failed");
    expect(second.findings).toHaveLength(1);
    const rows = await db.select().from(supervisionFindings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      problemClass: "stalled_ready_work",
      bottleneckType: "owner_bottleneck",
      ownerAgentId: refs.ownerId,
      bottleneckStage: "admitted",
      occurrenceCount: 2,
      recurrenceCount: 1,
    });
    expect(rows[0]?.slaDueAt).toBeInstanceOf(Date);
    expect(rows[0]?.nextAllowedAction).toContain("Wake the delivery owner");
  });

  it("dispatches stalled ready work to its owner through admission with a routing-only packet", async () => {
    const refs = await seed();
    const [delivery] = await db.insert(productDeliveries).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Stalled delivery",
      problemStatement: "Owner routing never started",
      decisionContract: {},
      stage: "admitted",
      ownerAgentId: refs.ownerId,
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    }).returning();
    const [ownerTask] = await db.insert(issues).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Route delivery",
      status: "backlog",
    }).returning();
    await db.insert(deliveryTasks).values({
      companyId: refs.companyId,
      deliveryId: delivery.id,
      issueId: ownerTask.id,
      taskType: "implementation",
    });
    const enqueueWakeup = vi.fn(async () => ({}));

    const result = await nativeSupervisionEngine(db, { enqueueWakeup })
      .runWatchdog(refs.companyId, new Date("2026-08-04T03:01:00Z"));

    expect(result.stalledReadyDispatches).toEqual([
      expect.objectContaining({ status: "dispatched", ownerAgentId: refs.ownerId }),
    ]);
    expect(enqueueWakeup).toHaveBeenCalledWith(refs.ownerId, expect.objectContaining({
      reason: "supervision_stalled_ready_owner_dispatch",
      payload: expect.objectContaining({ deliveryId: delivery.id, nativeAction: "route_via_hierarchy" }),
      contextSnapshot: expect.objectContaining({
        workType: "owner",
        contextBudget: { tokenLimit: 10_000, fileLimit: 8 },
        prohibitedAction: "watchdog_or_owner_performs_product_work_directly",
      }),
    }));
    const [finding] = await db.select().from(supervisionFindings);
    expect(finding).toMatchObject({ status: "assigned", recoveryState: "dispatching", ownerAgentId: refs.ownerId });
  });

  it("resolves an owner bottleneck after the owner delegates an executable child", async () => {
    const refs = await seed();
    const executorId = randomUUID();
    await db.insert(agents).values({ id: executorId, companyId: refs.companyId, name: "Executor", role: "engineer", reportsTo: refs.ownerId, permissions: {} });
    const [delivery] = await db.insert(productDeliveries).values({
      companyId: refs.companyId, projectId: refs.projectId, title: "Delegated delivery",
      problemStatement: "Owner routing was stalled", decisionContract: { dispatchSlaMinutes: 0 },
      stage: "admitted", ownerAgentId: refs.ownerId, updatedAt: new Date("2026-08-01T00:00:00Z"),
    }).returning();
    const [parent] = await db.insert(issues).values({ companyId: refs.companyId, projectId: refs.projectId, title: "Route", status: "todo", assigneeAgentId: refs.ownerId }).returning();
    await db.insert(deliveryTasks).values({ companyId: refs.companyId, deliveryId: delivery.id, issueId: parent.id, taskType: "implementation" });
    const registry = supervisionRegistryService(db);
    const finding = (await registry.upsertFinding(refs.companyId, {
      fingerprint: `owner_bottleneck:stalled_ready_work:${delivery.id}`, problemClass: "stalled_ready_work", severity: "high",
      status: "assigned", classification: "delivery_flow", sourceKind: "native_watchdog", sourceRef: `delivery:${delivery.id}`,
      title: "Owner routing", summary: "Waiting for delegation", affectedComponent: "delivery_flow", projectId: refs.projectId,
      issueId: null, deliveryId: delivery.id, deliveryTaskId: null, affectedAgentId: refs.ownerId, ownerAgentId: refs.ownerId,
      ownerUserId: null, admissionDecisionId: null, rootCauseId: null, nativeSafeguardId: null, retryCount: 0,
      economics: {}, decision: {}, recoveryState: "dispatching", bottleneckType: "owner_bottleneck",
      bottleneckStartedAt: "2026-08-01T00:00:00.000Z", bottleneckStage: "admitted", dependency: "owner delegation",
      slaDueAt: "2026-08-01T02:00:00.000Z", nextAllowedAction: "delegate", escalationCondition: "no child", cooldownUntil: null,
      evidence: [], recurrenceEvidence: {}, runId: null, cycleId: null,
    })).finding;
    await db.insert(issues).values({ companyId: refs.companyId, projectId: refs.projectId, parentId: parent.id, title: "Implement", status: "todo", assigneeAgentId: executorId });

    const result = await nativeSupervisionEngine(db).dispatchStalledReady(refs.companyId, new Date("2026-08-04T03:00:00Z"));

    expect(result).toContainEqual({ findingId: finding.id, status: "resolved" });
    expect(await registry.getFinding(finding.id)).toMatchObject({ status: "resolved", recoveryState: "healthy" });
  });

  it("does not classify review work with a pending owner decision path as a bottleneck", async () => {
    const refs = await seed();
    const staleAt = new Date("2026-08-01T00:00:00Z");
    const [waitingForOwner, missingDecisionPath] = await db.insert(issues).values([
      { companyId: refs.companyId, projectId: refs.projectId, title: "Waiting for owner confirmation", status: "in_review", assigneeAgentId: refs.ownerId, updatedAt: staleAt },
      { companyId: refs.companyId, projectId: refs.projectId, title: "Missing review decision path", status: "in_review", assigneeAgentId: refs.ownerId, updatedAt: staleAt },
      { companyId: refs.companyId, projectId: refs.projectId, title: "Routine review execution", status: "in_review", originKind: "routine_execution", assigneeAgentId: refs.ownerId, updatedAt: staleAt },
    ]).returning();
    await db.insert(issueThreadInteractions).values({
      companyId: refs.companyId,
      issueId: waitingForOwner.id,
      kind: "request_confirmation",
      status: "pending",
      continuationPolicy: "none",
      payload: { version: 1, prompt: "Approve or request changes?" },
    });

    const result = await nativeSupervisionEngine(db).runDailyAudit(refs.companyId, new Date("2026-08-04T03:00:00Z"));
    expect(result.checks.find((check) => check.key === "review_bottleneck")).toMatchObject({
      count: 1,
      status: "failed",
    });
    expect(result.checks.find((check) => check.key === "dispatch_capacity")).toMatchObject({
      count: 1,
      status: "failed",
    });
    const [finding] = await db.select().from(supervisionFindings);
    expect(finding).toMatchObject({ problemClass: "review_bottleneck" });
    expect(finding.summary).toContain("without a pending confirmation");
    expect(missingDecisionPath.id).not.toBe(waitingForOwner.id);
  });

  it("separates accepted-outcome task conflicts from dispatch capacity", async () => {
    const refs = await seed();
    const [task] = await db.insert(issues).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Canary task intentionally left open",
      status: "todo",
      originKind: "manual",
      assigneeAgentId: refs.ownerId,
    }).returning();
    const [delivery] = await db.insert(productDeliveries).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Accepted canary delivery",
      problemStatement: "The product state and task state diverged.",
      decisionContract: {},
      stage: "outcome_accepted",
      ownerAgentId: refs.ownerId,
    }).returning();
    await db.insert(deliveryTasks).values({
      companyId: refs.companyId,
      deliveryId: delivery.id,
      issueId: task.id,
      role: "implementation",
    });
    await db.insert(productOutcomes).values({
      companyId: refs.companyId,
      deliveryId: delivery.id,
      status: "accepted",
      statement: "Canary behavior was accepted without typed predicates.",
    });
    await db.insert(costEvents).values({
      companyId: refs.companyId,
      agentId: refs.ownerId,
      projectId: refs.projectId,
      provider: "test",
      model: "test-model",
      costCents: 0,
      occurredAt: new Date("2026-08-04T02:00:00Z"),
    });

    const result = await nativeSupervisionEngine(db).runWatchdog(
      refs.companyId,
      new Date("2026-08-04T03:00:00Z"),
    );

    expect(result.checks.find((check) => check.key === "task_outcome_reconciliation")).toMatchObject({
      count: 1,
      status: "failed",
    });
    expect(result.checks.find((check) => check.key === "dispatch_capacity")).toMatchObject({
      count: 0,
      status: "passed",
    });
    expect(result.checks.find((check) => check.key === "runnable_dispatch")).toMatchObject({
      count: 0,
      status: "passed",
    });
    expect(result.checks.find((check) => check.key === "cost_telemetry")).toMatchObject({
      count: 1,
      status: "failed",
    });
    expect(await db.select().from(supervisionFindings)).toContainEqual(expect.objectContaining({
      problemClass: "task_outcome_state_gap",
      status: "admission_pending",
    }));
  });

  it("reports assigned runnable work as a diagnosis constraint without auto-dispatching it", async () => {
    const refs = await seed();
    await db.insert(issues).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Priority and dependency readiness require diagnosis",
      status: "todo",
      originKind: "manual",
      assigneeAgentId: refs.ownerId,
    });

    const result = await nativeSupervisionEngine(db).runWatchdog(
      refs.companyId,
      new Date("2026-08-04T03:00:00Z"),
    );

    expect(result.checks.find((check) => check.key === "runnable_dispatch")).toMatchObject({
      count: 1,
      status: "failed",
      requiresDiagnosis: false,
    });
    expect(result.reviewDispatch).toMatchObject({ status: "not_required" });
    expect(result.cycle?.metrics).toMatchObject({
      currentConstraint: { kind: "runnable_dispatch", count: 1 },
      homeostasis: {
        dispatchHealth: { state: "critical", failedCount: 1 },
      },
    });
    expect(await db.select().from(supervisionFindings)).toContainEqual(expect.objectContaining({
      problemClass: "runnable_dispatch_gap",
      status: "needs_decision",
    }));
  });

  it("reconciles an active finding when its deterministic check passes", async () => {
    const refs = await seed();
    const registry = supervisionRegistryService(db);
    const existing = (await registry.upsertFinding(refs.companyId, {
      fingerprint: `dispatch_capacity_gap:${refs.companyId}`,
      problemClass: "dispatch_capacity_gap",
      severity: "critical",
      status: "needs_decision",
      classification: "dispatch_flow",
      sourceKind: "native_watchdog",
      sourceRef: "prior-cycle",
      title: "Stale review has no active dispatch path",
      summary: "The prior cycle observed one candidate.",
      affectedComponent: "dispatch_flow",
      retryCount: 0,
      economics: {},
      decision: {},
      recoveryState: "detected",
      evidence: [],
      recurrenceEvidence: {},
    })).finding;

    const result = await nativeSupervisionEngine(db).runWatchdog(
      refs.companyId,
      new Date("2026-08-04T03:00:00Z"),
    );

    expect(result.checks.find((check) => check.key === "dispatch_capacity")).toMatchObject({
      count: 0,
      status: "passed",
    });
    expect(await registry.getFinding(existing.id)).toMatchObject({
      status: "resolved",
      recoveryState: "healthy",
      closedAt: new Date("2026-08-04T03:00:00Z"),
    });
    expect(result.cycle?.metrics).toMatchObject({ reconciledFindings: [existing.id] });
  });

  it("closes the native corrective loop from dispatch starvation through verified learning promotion", async () => {
    const refs = await seed();
    const staleAt = new Date("2026-08-01T00:00:00Z");
    const [review] = await db.insert(issues).values({
      companyId: refs.companyId,
      projectId: refs.projectId,
      title: "Stale review without a decision path",
      status: "in_review",
      assigneeAgentId: refs.ownerId,
      updatedAt: staleAt,
    }).returning();
    const enqueueWakeup = vi.fn(async () => ({ accepted: true }));
    const engine = nativeSupervisionEngine(db, { enqueueWakeup });

    const detected = await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:01:00Z"));

    expect(detected.checks.find((check) => check.key === "dispatch_capacity")).toMatchObject({ status: "failed", count: 1 });
    expect(detected.reviewDispatch).toMatchObject({ status: "dispatched", issueId: review.id, ownerAgentId: refs.ownerId });
    expect(enqueueWakeup).toHaveBeenCalledWith(refs.ownerId, expect.objectContaining({
      reason: "supervision_review_bottleneck_dispatch",
      contextSnapshot: expect.objectContaining({
        workType: "review",
        outcomePredicate: "review_decision_state_or_pending_decision_exists",
        contextOverride: expect.objectContaining({ tokenLimit: 14_000, authority: "native_supervision" }),
        prohibitedActions: expect.arrayContaining(["implement_product_changes", "deploy", "touch_secrets"]),
      }),
    }));
    expect(await db.select().from(supervisionInterventions)).toContainEqual(expect.objectContaining({ status: "in_progress", issueId: review.id }));

    await db.insert(issueThreadInteractions).values({
      companyId: refs.companyId,
      issueId: review.id,
      kind: "request_confirmation",
      status: "pending",
      continuationPolicy: "none",
      payload: { version: 1, prompt: "Accept or request changes?" },
    });
    const verified = await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:11:00Z"));

    expect(verified.verifiedReviewInterventions).toContainEqual(expect.objectContaining({ status: "verified", learningDisposition: "promoted" }));
    expect(await db.select().from(supervisionInterventions)).toContainEqual(expect.objectContaining({ status: "verified" }));
    expect(await db.select().from(supervisionObservationWindows)).toContainEqual(expect.objectContaining({ status: "passed" }));
    expect(await db.select().from(nativeSafeguards)).toContainEqual(expect.objectContaining({ status: "verified", enabled: true }));
    expect(await db.select().from(supervisionRootCauses)).toContainEqual(expect.objectContaining({ status: "resolved" }));
    expect(await db.select().from(organizationalObservations)).toContainEqual(expect.objectContaining({ kind: "learning", status: "promoted" }));
  });

  it("retries a review dispatch once when final-context admission is the measured failure", async () => {
    const refs = await seed();
    await db.insert(issues).values({
      companyId: refs.companyId, projectId: refs.projectId, title: "Review with oversized mandatory context",
      status: "in_review", assigneeAgentId: refs.ownerId, updatedAt: new Date("2026-08-01T00:00:00Z"),
    });
    const failedRunId = randomUUID();
    const retryRunId = randomUUID();
    const enqueueWakeup = vi.fn()
      .mockResolvedValueOnce({ id: failedRunId, status: "queued" })
      .mockResolvedValueOnce({ id: retryRunId, status: "queued" });
    const engine = nativeSupervisionEngine(db, { enqueueWakeup });
    await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:01:00Z"));
    await db.insert(heartbeatRuns).values({
      id: failedRunId, companyId: refs.companyId, agentId: refs.ownerId, status: "failed",
      error: "Final run context failed hard admission", errorCode: "adapter_failed",
      startedAt: new Date("2026-08-04T03:02:00Z"), finishedAt: new Date("2026-08-04T03:03:00Z"),
    });

    const reconciled = await engine.runWatchdog(refs.companyId, new Date("2026-08-04T03:11:00Z"));

    expect(reconciled.verifiedReviewInterventions).toContainEqual(expect.objectContaining({
      status: "context_retry_dispatched", priorRunId: failedRunId, retryRunId,
    }));
    expect(enqueueWakeup).toHaveBeenCalledTimes(2);
    expect(enqueueWakeup).toHaveBeenLastCalledWith(refs.ownerId, expect.objectContaining({
      idempotencyKey: expect.stringContaining(":context-retry:1"),
      contextSnapshot: expect.objectContaining({ contextOverride: expect.objectContaining({ tokenLimit: 14_000 }) }),
    }));
    expect(await db.select().from(supervisionInterventions)).toContainEqual(expect.objectContaining({
      status: "in_progress", result: expect.objectContaining({ contextRetryCount: 1, contextRetryRunId: retryRunId }),
    }));
    expect(await db.select().from(supervisionFindings)).toContainEqual(expect.objectContaining({
      problemClass: "dispatch_capacity_gap", rootCauseId: expect.any(String),
    }));
  });

  it("admits and dispatches Doctor from a finding with a bounded context packet", async () => {
    const refs = await seed(true);
    const finding = (await supervisionRegistryService(db).upsertFinding(refs.companyId, {
      fingerprint: "doctor:test", problemClass: "workflow_defect", severity: "high", status: "admission_pending", classification: "requires_diagnosis", sourceKind: "daily_integrity", sourceRef: "test", title: "Diagnosis required", summary: "A deterministic detector found a workflow defect.", affectedComponent: "workflow", projectId: refs.projectId, issueId: null, deliveryId: null, deliveryTaskId: null, affectedAgentId: null, ownerAgentId: null, ownerUserId: null, admissionDecisionId: null, rootCauseId: null, nativeSafeguardId: null, retryCount: 0, economics: { retryBudget: 1 }, decision: {}, recoveryState: "detected", cooldownUntil: null, evidence: [], recurrenceEvidence: {}, runId: null, cycleId: null,
    })).finding;
    const enqueueWakeup = vi.fn(async () => ({}));
    const result = await nativeSupervisionEngine(db, { enqueueWakeup }).dispatchDoctor(finding.id, new Date("2026-08-04T04:00:00Z"));
    expect(result.status).toBe("dispatched");
    expect(enqueueWakeup).toHaveBeenCalledWith(refs.ownerId, expect.objectContaining({ reason: "supervision_finding_requires_diagnosis", contextSnapshot: expect.objectContaining({ rollbackRequired: true, contextBudget: { tokenLimit: 6000, fileLimit: 8 } }) }));
    expect(await db.select().from(supervisionInterventions)).toHaveLength(1);
  });
});
