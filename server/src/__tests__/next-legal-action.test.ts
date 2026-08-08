import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, issueRelations, issues } from "@paperclipai/db";
import type { NextLegalAction } from "@paperclipai/shared";
import { evaluateNextLegalAction, findDependencyCycleMembers, nextLegalActionService, selectShadowDispatch } from "../services/next-legal-action.js";
import { evaluateHomeostasisDimension } from "../services/native-supervision-engine.js";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";

const now = new Date("2026-08-08T18:00:00.000Z");

function issue(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    identifier: "LUC-1",
    title: "Candidate",
    status: "todo",
    priority: "high",
    goalId: "goal-1",
    assigneeAgentId: "agent-1",
    ownerStatus: "idle",
    monitorNextCheckAt: null,
    createdAt: new Date("2026-08-07T18:00:00.000Z"),
    updatedAt: now,
    ...overrides,
  };
}

function fact(overrides: Record<string, unknown> = {}) {
  return {
    issue_id: "issue-1",
    active_hold_id: null,
    pending_interaction_id: null,
    pending_approval_id: null,
    accepted_outcome_id: null,
    accepted_outcome_evidence_count: 0,
    live_run_id: null,
    unblocks_count: 0,
    dependency_outcome_gap_ids: [],
    stale_dependency_ids: [],
    ...overrides,
  };
}

function evaluate(input: {
  row?: ReturnType<typeof issue>;
  fact?: ReturnType<typeof fact>;
  blockerIds?: string[];
  unresolvedBlockerIds?: string[];
} = {}) {
  return evaluateNextLegalAction({
    row: input.row ?? issue(),
    fact: input.fact ?? fact(),
    blockerIds: input.blockerIds ?? [],
    unresolvedBlockerIds: input.unresolvedBlockerIds ?? [],
    now,
  });
}

describe("next legal action contract", () => {
  it("does not dispatch locally runnable work with a missing dependency", () => {
    expect(evaluate({ blockerIds: ["blocker-1"], unresolvedBlockerIds: ["blocker-1"] })).toMatchObject({
      actionClass: "WAITING_FOR_DEPENDENCY",
      eligibility: "ineligible",
      requiredNextAction: "WAIT",
      dependencyRefs: ["blocker-1"],
    });
  });

  it("proposes eligible, owned and safe work only in shadow mode", () => {
    const action = evaluate();
    expect(action).toMatchObject({
      actionClass: "READY_FOR_EXECUTION",
      eligibility: "eligible",
      requiredNextAction: "ACT",
      epistemicState: "known",
    });
    expect(selectShadowDispatch([action], now)).toMatchObject({
      mode: "shadow",
      outcome: "candidate_proposed",
      candidateIssueId: "issue-1",
    });
  });

  it("requests intent confirmation for old work instead of treating readiness as organizational intent", () => {
    expect(evaluate({ row: issue({ updatedAt: new Date("2026-08-01T00:00:00.000Z") }) })).toMatchObject({
      actionClass: "INTENT_CONFIRMATION_REQUIRED",
      requiredNextAction: "REQUEST_INTENT_CONFIRMATION",
      eligibility: "unknown",
      intent: { status: "UNKNOWN" },
    });
  });

  it("honors explicit fresh intent even after a parent goal is achieved", () => {
    expect(evaluate({ row: issue({ goalStatus: "achieved", intentStatus: "ACTIVE", intentConfirmedAt: now, intentValidUntil: new Date("2026-08-09T18:00:00.000Z"), intentSource: "board", intentReason: "Post-goal hardening obligation" }) })).toMatchObject({
      actionClass: "READY_FOR_EXECUTION",
      intent: { status: "ACTIVE", source: "board" },
    });
  });

  it("routes stale dependency edges to typed revalidation", () => {
    expect(evaluate({ fact: fact({ stale_dependency_ids: ["relation-1"] }), blockerIds: ["blocker-1"], unresolvedBlockerIds: ["blocker-1"] })).toMatchObject({
      actionClass: "WAITING_FOR_DEPENDENCY",
      requiredNextAction: "RECONFIRM_DEPENDENCY",
      blockingEntity: { type: "issue_relation", id: "relation-1" },
    });
  });

  it("requires reconciliation instead of auto-closing a non-terminal task with accepted outcome evidence", () => {
    expect(evaluate({ fact: fact({ accepted_outcome_id: "outcome-1", accepted_outcome_evidence_count: 2 }) })).toMatchObject({
      actionClass: "RECONCILIATION_REQUIRED",
      requiredNextAction: "RECONCILE",
      blockingEntity: { type: "product_outcome", id: "outcome-1" },
    });
  });

  it("keeps accepted outcome without evidence epistemically unknown", () => {
    expect(evaluate({ fact: fact({ accepted_outcome_id: "outcome-1" }) })).toMatchObject({
      actionClass: "BLOCKED_BY_CONFLICT",
      epistemicState: "insufficient_evidence",
      eligibility: "ineligible",
      confidence: "low",
    });
  });

  it("treats idle with no eligible work as a healthy typed no-op", () => {
    const waiting = evaluate({ row: issue({ assigneeAgentId: null, ownerStatus: null }) });
    expect(selectShadowDispatch([waiting], now)).toMatchObject({
      outcome: "healthy_no_op",
      reasonCode: "NO_ELIGIBLE_WORK",
      candidateIssueId: null,
    });
  });

  it("preserves explainable priority dimensions without a magic score", () => {
    const action = evaluate({ fact: fact({ unblocks_count: 8 }) });
    expect(action.priority).toMatchObject({ declaredPriority: "high", unblockValue: 8, goalImportance: "linked" });
    expect(action.priority).not.toHaveProperty("score");
  });

  it("reports missing health sensors as UNKNOWN, never healthy", () => {
    expect(evaluateHomeostasisDimension(
      [{ key: "runtime_health", status: "passed", count: 0 }],
      ["runtime_health", "orphan_execution_locks"],
    )).toEqual({
      state: "unknown",
      failedCount: 0,
      warningCount: 0,
      missingSensorIds: ["orphan_execution_locks"],
    });
  });

  it("ranks declared priority, then unblock value, then age and records rejected alternatives", () => {
    const first = evaluate({ fact: fact({ unblocks_count: 8 }) });
    const second: NextLegalAction = {
      ...evaluate({ row: issue({ id: "issue-2", identifier: "LUC-2" }), fact: fact({ issue_id: "issue-2", unblocks_count: 1 }) }),
      issueId: "issue-2",
    };
    const decision = selectShadowDispatch([second, first], now);
    expect(decision.candidateIssueId).toBe("issue-1");
    expect(decision.rejectedAlternatives).toContainEqual(expect.objectContaining({ issueId: "issue-2" }));
  });

  it("detects and explains an organizational dependency cycle without resolving it", () => {
    const cycles = findDependencyCycleMembers(new Map([
      ["A", ["B"]],
      ["B", ["C"]],
      ["C", ["A"]],
      ["D", []],
    ]));
    expect([...cycles.keys()].sort()).toEqual(["A", "B", "C"]);
    expect(cycles.get("A")?.join(" -> ")).toContain("A");
    expect(cycles.has("D")).toBe(false);
  });
});

const embeddedSupport = await getEmbeddedPostgresTestSupport();
const describeEmbedded = embeddedSupport.supported ? describe : describe.skip;

describeEmbedded("next legal action projection", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-next-action-");
    db = createDb(tempDb.connectionString);
  }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  it("projects dependency-aware actions, blocked reason decomposition, liveness and shadow selection from one company truth", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Readiness", issuePrefix: "RDY", requireBoardApprovalForNewAgents: false });
    await db.insert(agents).values({ id: agentId, companyId, name: "Owner", role: "engineer", status: "idle", permissions: {} });
    const [blocker, dependent, secondDependent, candidate, unknownBlocked] = await db.insert(issues).values([
      { companyId, title: "Unfinished prerequisite", status: "todo", assigneeAgentId: agentId, priority: "medium" },
      { companyId, title: "Locally runnable but blocked", status: "todo", assigneeAgentId: agentId, priority: "urgent" },
      { companyId, title: "Second locally runnable but blocked", status: "todo", assigneeAgentId: agentId, priority: "high" },
      { companyId, title: "Safe shadow candidate", status: "todo", assigneeAgentId: agentId, priority: "high" },
      { companyId, title: "Opaque blocked work", status: "blocked", assigneeAgentId: agentId, priority: "low" },
    ]).returning();
    await db.insert(issueRelations).values([
      { companyId, issueId: blocker.id, relatedIssueId: dependent.id, type: "blocks" },
      { companyId, issueId: blocker.id, relatedIssueId: secondDependent.id, type: "blocks" },
    ]);

    const projection = await nextLegalActionService(db).project(companyId, { now });

    expect(projection.actions.find((action) => action.issueId === dependent.id)).toMatchObject({ actionClass: "WAITING_FOR_DEPENDENCY", eligibility: "ineligible" });
    expect(projection.actions.find((action) => action.issueId === unknownBlocked.id)).toMatchObject({ actionClass: "INVALID_STATE", reasonCode: "blocked_reason_unknown", epistemicState: "insufficient_evidence" });
    expect(projection.blockedReasons).toContainEqual({ reason: "unknown", count: 1 });
    expect(projection.currentConstraint).toMatchObject({ kind: "dependency", count: 2 });
    expect(projection.shadowDispatch).toMatchObject({ mode: "shadow", outcome: "candidate_proposed", candidateIssueId: blocker.id });
    expect(projection.actions.find((action) => action.issueId === blocker.id)?.priority.reasons).toContain("helps_current_constraint:dependency");
    expect(projection.actions.find((action) => action.issueId === blocker.id)?.priority.reasons).not.toContain("does_not_reduce_current_review_constraint");
    expect(projection.actions.find((action) => action.issueId === candidate.id)?.priority.valueState).toBe("not_prioritized");
    expect(projection.liveness).toMatchObject({ unexplainedIdle: 1, noOpReason: "SHADOW_CANDIDATE_EXISTS" });
  });
});
