import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  approvals,
  companies,
  createDb,
  deliveryTasks,
  goals,
  issueThreadInteractions,
  issueRelations,
  issues,
  organizationalObservations,
  organizationalRecords,
  productDeliveries,
  productOutcomes,
  projects,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import {
  calendarDaysRemaining,
  buildHistoricalThroughputForecast,
  companySituationService,
} from "../services/company-situation.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

describe("calendarDaysRemaining", () => {
  it("compares date-only targets against the UTC calendar day", () => {
    const now = new Date("2026-07-15T23:45:00.000Z");
    expect(calendarDaysRemaining("2026-07-14", now)).toBe(-1);
    expect(calendarDaysRemaining("2026-07-15", now)).toBe(0);
    expect(calendarDaysRemaining("2026-07-22", now)).toBe(7);
  });
});

describe("buildHistoricalThroughputForecast", () => {
  it("returns an uncertainty range without turning it into a deadline", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const forecast = buildHistoricalThroughputForecast({
      now,
      windowDays: 30,
      openScope: 6,
      completed: Array.from({ length: 12 }, (_, index) => ({
        createdAt: new Date(now.getTime() - (index + 3) * 86_400_000),
        startedAt: new Date(now.getTime() - (index + 2) * 86_400_000),
        completedAt: new Date(now.getTime() - index * 86_400_000),
      })),
    });

    expect(forecast).toMatchObject({
      method: "historical_throughput_v1",
      completedSampleSize: 12,
      dailyThroughput: 0.4,
      cycleTimeP50Hours: 48,
      cycleTimeP80Hours: 48,
      projectedCompletion: { confidence: "medium" },
    });
    expect(forecast.projectedCompletion?.earliestAt).not.toBe(forecast.projectedCompletion?.latestAt);
    expect(forecast.limitations.join(" ")).toContain("not a deadline");
  });
});

describeEmbeddedPostgres("company situation service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-company-situation-");
    db = createDb(tempDb.connectionString);
  }, 60_000);

  afterEach(async () => {
    await db.delete(organizationalObservations);
    await db.delete(organizationalRecords);
    await db.delete(approvals);
    await db.delete(issueThreadInteractions);
    await db.delete(issueRelations);
    await db.delete(deliveryTasks);
    await db.delete(productOutcomes);
    await db.delete(productDeliveries);
    await db.delete(issues);
    await db.delete(projects);
    await db.delete(goals);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("builds a bounded company-scoped orientation without counting routine executions", async () => {
    const companyId = randomUUID();
    const otherCompanyId = randomUUID();
    const idleAgentId = randomUUID();
    const errorAgentId = randomUUID();
    const otherAgentId = randomUUID();
    const goalId = randomUUID();
    const overdueProjectId = randomUUID();
    const dueSoonProjectId = randomUUID();
    const now = new Date("2026-07-15T12:00:00.000Z");

    await db.insert(companies).values([
      {
        id: companyId,
        name: "LuckySparrow",
        issuePrefix: "LSP",
        requireBoardApprovalForNewAgents: false,
      },
      {
        id: otherCompanyId,
        name: "Other",
        issuePrefix: "OTH",
        requireBoardApprovalForNewAgents: false,
      },
    ]);
    await db.insert(agents).values([
      {
        id: idleAgentId,
        companyId,
        name: "Builder",
        role: "engineer",
        status: "idle",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
      {
        id: errorAgentId,
        companyId,
        name: "Reviewer",
        role: "reviewer",
        status: "error",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
      {
        id: otherAgentId,
        companyId: otherCompanyId,
        name: "Other Agent",
        role: "engineer",
        status: "error",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      },
    ]);
    await db.insert(goals).values({
      id: goalId,
      companyId,
      title: "Deliver useful products coherently",
      level: "company",
      status: "active",
    });
    await db.insert(projects).values([
      {
        id: overdueProjectId,
        companyId,
        goalId,
        name: "Soar",
        status: "in_progress",
        targetDate: "2026-07-13",
      },
      {
        id: dueSoonProjectId,
        companyId,
        goalId,
        name: "Roost",
        status: "planned",
        targetDate: "2026-07-18",
      },
      {
        id: randomUUID(),
        companyId: otherCompanyId,
        name: "Other Project",
        status: "in_progress",
        targetDate: "2020-01-01",
      },
    ]);
    await db.insert(issues).values([
      {
        id: randomUUID(),
        companyId,
        projectId: overdueProjectId,
        title: "Blocked product work",
        status: "blocked",
        originKind: "manual",
      },
      {
        id: randomUUID(),
        companyId,
        projectId: dueSoonProjectId,
        title: "Unassigned product work",
        status: "todo",
        originKind: "manual",
      },
      {
        id: randomUUID(),
        companyId,
        title: "Routine controller cadence",
        status: "blocked",
        originKind: "routine_execution",
      },
      {
        id: randomUUID(),
        companyId: otherCompanyId,
        title: "Other blocked work",
        status: "blocked",
        originKind: "manual",
      },
    ]);
    await db.insert(approvals).values([
      {
        id: randomUUID(),
        companyId,
        type: "request_board_approval",
        status: "pending",
        payload: {},
      },
      {
        id: randomUUID(),
        companyId: otherCompanyId,
        type: "request_board_approval",
        status: "pending",
        payload: {},
      },
    ]);
    await db.insert(organizationalRecords).values([
      {
        id: randomUUID(),
        companyId,
        kind: "assumption",
        status: "contradicted",
        title: "Provider remains stable",
        statement: "The production provider will remain healthy.",
        ownerAgentId: idleAgentId,
        reviewAt: new Date("2026-07-14T12:00:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        kind: "commitment",
        status: "active",
        title: "Review product proof",
        statement: "Review the product proof before handoff.",
        ownerAgentId: idleAgentId,
        dueAt: new Date("2026-07-14T12:00:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId: otherCompanyId,
        kind: "commitment",
        status: "breached",
        title: "Other company commitment",
        statement: "Must not leak into this situation.",
      },
    ]);
    await db.insert(organizationalObservations).values([
      {
        companyId,
        kind: "external_signal",
        status: "current",
        title: "Production health sample",
        summary: "The last production observation needs refreshing.",
        sourceClass: "production_monitor",
        provenance: [{ kind: "external", ref: "monitor:production" }],
        observedAt: new Date("2026-07-13T12:00:00.000Z"),
        freshnessWindowHours: 24,
        externalCategory: "production",
      },
      {
        companyId,
        kind: "learning",
        status: "validated",
        title: "Preserve a regression eval",
        summary: "A validated pattern should become an eval.",
        sourceClass: "retrospective",
        provenance: [{ kind: "other", ref: "retro:1" }],
        observedAt: now,
      },
    ]);

    const situation = await companySituationService(db).get(companyId, { now });

    expect(situation).toMatchObject({
      companyId,
      generatedAt: now.toISOString(),
      timezone: "UTC",
      basis: "deterministic_projection",
      mission: {
        activeGoals: [{ id: goalId, title: "Deliver useful products coherently" }],
      },
      work: {
        open: 2,
        runnable: 1,
        blocked: 1,
        unassignedRunnable: 1,
      },
      capacity: {
        totalAgents: 2,
        availableAgents: 1,
        errorAgents: 1,
        schedulerActiveAgents: 0,
        dispatchableRunnableIssues: 0,
        structuredReviewIssues: 0,
        outcomeReconciliationIssues: 0,
        heldRunnableIssues: 0,
        dispatchState: "degraded",
        runnableIssuesPerAvailableAgent: 1,
        agentsWithParallelWip: 0,
        maxParallelWip: 0,
      },
      temporal: {
        activeProjects: 2,
        projectsWithTargets: 2,
        projectsWithoutTargets: 0,
      },
      governance: {
        pendingApprovals: 1,
        activeBudgetIncidents: 0,
      },
      deliberation: {
        dueReviews: 1,
        overdueCommitments: 1,
      },
      learning: { candidates: [expect.objectContaining({ status: "validated" })], promoted: 0 },
      externalGrounding: { currentSignals: [], staleSignals: [expect.objectContaining({ effectivelyStale: true })] },
    });
    expect(situation.temporal.overdueProjects).toEqual([
      expect.objectContaining({ id: overdueProjectId, daysRemaining: -2 }),
    ]);
    expect(situation.temporal.dueSoonProjects).toEqual([
      expect.objectContaining({ id: dueSoonProjectId, daysRemaining: 3 }),
    ]);
    expect(situation.attention.map((signal) => signal.kind)).toEqual([
      "agent_error",
      "assumption_contradicted",
      "blocked_work",
      "commitment_overdue",
      "external_signal_stale",
      "pending_approval",
      "project_overdue",
      "learning_ready_for_promotion",
      "organizational_review_due",
      "project_due_soon",
      "unassigned_runnable_work",
    ]);
    expect(situation.attention.flatMap((signal) => signal.sources)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: otherAgentId })]),
    );
  });

  it("separates structured review and accepted-outcome conflicts from dispatch eligibility", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const projectId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Queue truth",
      issuePrefix: "QTR",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Owner",
      role: "engineer",
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Canary",
      status: "in_progress",
    });
    const [acceptedTask, review] = await db.insert(issues).values([
      { companyId, projectId, title: "Accepted canary task", status: "todo", assigneeAgentId: agentId },
      { companyId, projectId, title: "Waiting for explicit review decision", status: "in_review", assigneeAgentId: agentId },
    ]).returning();
    const [delivery] = await db.insert(productDeliveries).values({
      companyId,
      projectId,
      title: "Accepted canary",
      problemStatement: "Exercise queue truth.",
      decisionContract: {},
      stage: "outcome_accepted",
      ownerAgentId: agentId,
    }).returning();
    await db.insert(deliveryTasks).values({ companyId, deliveryId: delivery.id, issueId: acceptedTask.id, role: "implementation" });
    await db.insert(productOutcomes).values({ companyId, deliveryId: delivery.id, status: "accepted", statement: "Canary accepted." });
    await db.insert(issueThreadInteractions).values({
      companyId,
      issueId: review.id,
      kind: "request_confirmation",
      status: "pending",
      continuationPolicy: "none",
      payload: { version: 1, prompt: "Accept or request changes?" },
    });

    const situation = await companySituationService(db).get(companyId, { now: new Date("2026-08-08T17:00:00Z") });

    expect(situation.capacity).toMatchObject({
      dispatchableRunnableIssues: 0,
      structuredReviewIssues: 1,
      outcomeReconciliationIssues: 1,
      dispatchState: "degraded",
    });
    expect(situation.attention.map((signal) => signal.kind)).toContain("outcome_state_conflict");
    expect(situation.attention.map((signal) => signal.kind)).not.toContain("dispatch_capacity_disabled");
  });

  it("does not report missing target dates when the company intentionally uses forecast-only planning", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Forecast-only company",
      issuePrefix: "FTC",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values([
      { companyId, name: "Soar", status: "in_progress" },
      { companyId, name: "Roost", status: "planned" },
    ]);

    const situation = await companySituationService(db).get(companyId, {
      now: new Date("2026-08-13T12:00:00Z"),
    });

    expect(situation.temporal).toMatchObject({
      activeProjects: 2,
      projectsWithTargets: 0,
      projectsWithoutTargets: 2,
    });
    expect(situation.attention.map((signal) => signal.kind)).not.toContain("project_target_missing");
  });

  it("keeps ordinary owned dependency waits in flow metrics without reporting them as broken work", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const blockerId = randomUUID();
    const dependentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Dependency-aware company",
      issuePrefix: "DPC",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Dependency owner",
      role: "engineer",
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    await db.insert(issues).values([
      { id: blockerId, companyId, title: "Root work", status: "todo", assigneeAgentId: agentId },
      { id: dependentId, companyId, title: "Dependent work", status: "blocked", assigneeAgentId: agentId },
    ]);
    await db.insert(issueRelations).values({
      companyId,
      issueId: blockerId,
      relatedIssueId: dependentId,
      type: "blocks",
    });

    const situation = await companySituationService(db).get(companyId, {
      now: new Date("2026-08-13T12:00:00Z"),
    });

    expect(situation.capacity.flow).toContainEqual(expect.objectContaining({
      stage: "blocked_dependency",
      count: 1,
    }));
    expect(situation.attention.map((signal) => signal.kind)).not.toContain("blocked_work");
    expect(situation.attention.map((signal) => signal.kind)).not.toContain("capacity_bottleneck");
  });

  it("does not report fresh active execution as a capacity bottleneck", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Actively executing company",
      issuePrefix: "AEC",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Active engineer",
      role: "engineer",
      status: "running",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    await db.insert(issues).values([
      { companyId, title: "Active work one", status: "in_progress", assigneeAgentId: agentId },
      { companyId, title: "Active work two", status: "in_progress", assigneeAgentId: agentId },
    ]);

    const situation = await companySituationService(db).get(companyId, {
      now: new Date(),
    });

    expect(situation.capacity.flow).toContainEqual(expect.objectContaining({
      stage: "execution",
      count: 2,
    }));
    expect(situation.attention.map((signal) => signal.kind)).not.toContain("capacity_bottleneck");
  });
});
