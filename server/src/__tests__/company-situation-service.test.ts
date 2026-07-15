import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  approvals,
  companies,
  createDb,
  goals,
  issues,
  projects,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import {
  calendarDaysRemaining,
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

describeEmbeddedPostgres("company situation service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-company-situation-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(approvals);
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
        runnableIssuesPerAvailableAgent: 1,
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
    });
    expect(situation.temporal.overdueProjects).toEqual([
      expect.objectContaining({ id: overdueProjectId, daysRemaining: -2 }),
    ]);
    expect(situation.temporal.dueSoonProjects).toEqual([
      expect.objectContaining({ id: dueSoonProjectId, daysRemaining: 3 }),
    ]);
    expect(situation.attention.map((signal) => signal.kind)).toEqual([
      "agent_error",
      "blocked_work",
      "pending_approval",
      "project_overdue",
      "project_due_soon",
      "unassigned_runnable_work",
    ]);
    expect(situation.attention.flatMap((signal) => signal.sources)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: otherAgentId })]),
    );
  });
});
