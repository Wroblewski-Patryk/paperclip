import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  deliveryTasks,
  issues,
  productDeliveries,
  productOutcomes,
  projects,
} from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { deliveryService, validateAutonomousDeliveryIntentContract } from "../services/deliveries.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describe("autonomous delivery intent admission contract", () => {
  it("rejects autonomous delivery without traceability and accepts a complete trace", () => {
    expect(validateAutonomousDeliveryIntentContract({ source: "paperclip_autonomous_cycle" }))
      .toMatch(/intentContract/);
    expect(validateAutonomousDeliveryIntentContract({
      source: "paperclip_autonomous_cycle",
      intentContract: {
        schemaVersion: 1,
        marker: "softwarehouse-product-intent-trace:v1",
        manifestPath: "docs/documentation-contract.json",
        productAuthority: ["docs/product/"],
        architectureAuthority: ["docs/architecture/", "docs/adr/"],
        productSources: ["docs/product/product.md"],
        architectureSources: ["docs/architecture/architecture-source-of-truth.md"],
        observedStateSource: "docs/status/project-truth-index.json",
        issue: { id: randomUUID() },
        trace: {
          ownerIntent: "docs/product/product.md",
          productContract: "docs/product/product.md#account-settings",
          architectureContract: "docs/architecture/architecture-source-of-truth.md",
          observedGap: "The authenticated dashboard has no route to account settings.",
          assumptionDisposition: "owner_approved - account settings belong to the client area",
          expectedOutcome: "An authenticated user reaches settings and can update account details.",
          acceptanceEvidence: "Contract tests, browser proof, independent review, deployment, and observation.",
        },
      },
    })).toBeNull();
  });

  it("keeps unresolved assumptions outside implementation admission", () => {
    expect(validateAutonomousDeliveryIntentContract({
      source: "paperclip_autonomous_cycle",
      intentContract: {
        schemaVersion: 1,
        marker: "softwarehouse-product-intent-trace:v1",
        manifestPath: "docs/documentation-contract.json",
        productAuthority: ["docs/product/"],
        architectureAuthority: ["docs/architecture/", "docs/adr/"],
        productSources: ["docs/product/product.md"],
        architectureSources: ["docs/architecture/architecture-source-of-truth.md"],
        observedStateSource: "docs/status/project-truth-index.json",
        issue: { id: randomUUID() },
        trace: {
          ownerIntent: "docs/product/product.md",
          productContract: "docs/product/product.md",
          architectureContract: "docs/architecture/architecture-source-of-truth.md",
          observedGap: "Product sources disagree about whether registration is public.",
          assumptionDisposition: "needs_decision - public versus invite-only registration",
          expectedOutcome: "One approved rule controls product, architecture, and implementation.",
          acceptanceEvidence: "Owner decision, updated sources, tests, and independent review.",
        },
      },
    })).toMatch(/unresolved assumptions/);
  });
});

describeEmbedded("task, delivery, and outcome separation", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-deliveries-");
    db = createDb(tempDb.connectionString);
  }, 60_000);

  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed() {
    const companyId = randomUUID();
    const projectId = randomUUID();
    const issueId = randomUUID();
    const ownerAgentId = randomUUID();
    const reviewerAgentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Delivery test",
      issuePrefix: `D${companyId.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      status: "active",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values({ id: projectId, companyId, name: "Canary", status: "in_progress" });
    await db.insert(agents).values([
      { id: ownerAgentId, companyId, name: "Delivery owner", role: "engineer", status: "idle", adapterType: "codex_local", adapterConfig: {}, runtimeConfig: {}, permissions: {} },
      { id: reviewerAgentId, companyId, name: "Independent reviewer", role: "reviewer", status: "idle", adapterType: "codex_local", adapterConfig: {}, runtimeConfig: {}, permissions: {} },
    ]);
    await db.insert(issues).values({
      id: issueId,
      companyId,
      projectId,
      identifier: `D-${issueId.slice(0, 6)}`,
      title: "Reviewed implementation task",
      status: "done",
      priority: "medium",
      completedAt: new Date(),
    });
    return { companyId, projectId, issueId, ownerAgentId, reviewerAgentId };
  }

  it("does not infer delivered or achieved from a done task", async () => {
    const refs = await seed();
    const svc = deliveryService(db);
    const created = await svc.create(refs.companyId, {
      projectId: refs.projectId,
      title: "Canary delivery",
      problemStatement: "The production behavior is not yet available to the owner.",
      decisionContract: { expected: "public endpoint returns 200", rollback: "redeploy previous SHA" },
      outcomeStatement: "The owner can use the endpoint in production.",
      acceptanceCriteria: [{ kind: "public_smoke", expectedStatus: 200 }],
      taskIssueIds: [refs.issueId],
    });

    expect(created.stage).toBe("proposed");
    expect(created.outcome.status).toBe("unachieved");
    expect(await db.select().from(deliveryTasks)).toHaveLength(1);
    expect((await db.select().from(productDeliveries))[0].stage).toBe("proposed");
    expect((await db.select().from(productOutcomes))[0].status).toBe("unachieved");
  });

  it("does not admit an autonomous delivery that bypasses product-intent traceability", async () => {
    const refs = await seed();
    const svc = deliveryService(db);
    const created = await svc.create(refs.companyId, {
      projectId: refs.projectId,
      title: "Untraceable autonomous delivery",
      problemStatement: "An implementation task exists without a product-intent contract.",
      decisionContract: { source: "paperclip_autonomous_cycle", boundedToIssueId: refs.issueId },
      outcomeStatement: "The owner can use the intended behavior.",
      acceptanceCriteria: [{ kind: "owner_outcome" }],
      taskIssueIds: [refs.issueId],
    });

    await expect(svc.transition(created.id, {
      toStage: "admitted",
      idempotencyKey: "missing-intent-contract",
      evidence: [],
    }, { actorType: "user", actorId: "board" })).rejects.toMatchObject({ status: 422 });
  });

  it("enforces review rejection independently from task completion and outcome", async () => {
    const refs = await seed();
    const svc = deliveryService(db);
    const created = await svc.create(refs.companyId, {
      projectId: refs.projectId,
      title: "Rejected canary",
      problemStatement: "A reviewed task may still fail the delivery contract.",
      decisionContract: { expected: "typed evidence", rollback: "no deploy" },
      outcomeStatement: "The user-visible defect is resolved.",
      acceptanceCriteria: [{ kind: "acceptance_test", result: "pass" }],
      taskIssueIds: [refs.issueId],
    });
    const actor = { actorType: "user", actorId: "owner" };
    await svc.transition(created.id, { toStage: "admitted", idempotencyKey: "1", evidence: [] }, actor);
    await svc.transition(created.id, { toStage: "implementing", idempotencyKey: "2", evidence: [] }, actor);
    await svc.transition(created.id, { toStage: "evidence_complete", idempotencyKey: "3", evidence: [{ kind: "test", result: "pass" }] }, actor);
    await svc.transition(created.id, { toStage: "review_rejected", idempotencyKey: "4", evidence: [{ kind: "review", result: "reject" }] }, actor);

    const detail = await svc.getDetail(created.id);
    expect(detail?.stage).toBe("review_rejected");
    expect(detail?.outcome?.status).toBe("unachieved");
    expect((await db.select().from(issues))[0].status).toBe("done");
    await expect(svc.transition(created.id, {
      toStage: "deployed",
      idempotencyKey: "illegal-skip",
      evidence: [{ kind: "claim" }],
      deployedSha: "1234567",
      deploymentUrl: "https://example.test",
    }, actor)).rejects.toMatchObject({ status: 409 });
  });

  it("requires observed health before independent outcome acceptance", async () => {
    const refs = await seed();
    const svc = deliveryService(db);
    const created = await svc.create(refs.companyId, {
      projectId: refs.projectId,
      title: "Healthy canary",
      problemStatement: "Prove the complete last mile.",
      decisionContract: { expected: "healthy production", rollback: "previous image" },
      outcomeStatement: "The production capability is usable.",
      acceptanceCriteria: [{ kind: "smoke", result: "pass" }],
      taskIssueIds: [refs.issueId],
    });
    await expect(svc.updateOutcome(created.id, { status: "achieved", evidence: [{ kind: "local_test" }] }, {})).resolves.toMatchObject({ status: "achieved" });
    await expect(svc.updateOutcome(created.id, { status: "accepted", evidence: [{ kind: "owner" }] }, {}))
      .rejects.toMatchObject({ status: 422 });
  });

  it("rejects self-review and self-acceptance by the delivery owner", async () => {
    const refs = await seed();
    const svc = deliveryService(db);
    const created = await svc.create(refs.companyId, {
      projectId: refs.projectId,
      ownerAgentId: refs.ownerAgentId,
      title: "Independent delivery",
      problemStatement: "A delivery owner must not certify their own result.",
      decisionContract: { expected: "independent review and acceptance" },
      outcomeStatement: "A distinct actor accepts the observed result.",
      acceptanceCriteria: [{ kind: "independent_acceptance" }],
      taskIssueIds: [refs.issueId],
    });
    const board = { actorType: "user", actorId: "board" };
    await svc.transition(created.id, { toStage: "admitted", idempotencyKey: "i-1", evidence: [] }, board);
    await svc.transition(created.id, { toStage: "implementing", idempotencyKey: "i-2", evidence: [] }, board);
    await svc.transition(created.id, { toStage: "evidence_complete", idempotencyKey: "i-3", evidence: [{ kind: "test" }] }, board);
    await expect(svc.transition(created.id, {
      toStage: "review_accepted",
      idempotencyKey: "i-self-review",
      evidence: [{ kind: "review" }],
    }, { actorType: "agent", actorId: refs.ownerAgentId })).rejects.toMatchObject({ status: 422 });

    await svc.transition(created.id, {
      toStage: "review_accepted",
      idempotencyKey: "i-review",
      evidence: [{ kind: "review", reviewer: refs.reviewerAgentId }],
    }, { actorType: "agent", actorId: refs.reviewerAgentId });
    await svc.transition(created.id, { toStage: "integrated", idempotencyKey: "i-4", evidence: [], integrationSha: "1234567" }, board);
    await svc.transition(created.id, { toStage: "push_ready", idempotencyKey: "i-5", evidence: [], originSha: "1234567" }, board);
    await svc.transition(created.id, { toStage: "deployed", idempotencyKey: "i-6", evidence: [{ kind: "deploy" }], deployedSha: "1234567", deploymentUrl: "https://example.test" }, board);
    await svc.transition(created.id, { toStage: "observed_healthy", idempotencyKey: "i-7", evidence: [{ kind: "smoke" }] }, board);
    await svc.updateOutcome(created.id, { status: "achieved", evidence: [{ kind: "monitoring" }] }, { agentId: refs.ownerAgentId });
    await expect(svc.updateOutcome(created.id, {
      status: "accepted",
      evidence: [{ kind: "owner_claim" }],
    }, { agentId: refs.ownerAgentId })).rejects.toMatchObject({ status: 422 });
    await expect(svc.updateOutcome(created.id, {
      status: "accepted",
      evidence: [{ kind: "independent_acceptance" }],
    }, { agentId: refs.reviewerAgentId })).resolves.toMatchObject({ status: "accepted" });
  });
});
