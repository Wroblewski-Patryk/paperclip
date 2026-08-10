import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, organizationalObservations } from "@paperclipai/db";
import { createOrganizationalObservationSchema } from "@paperclipai/shared";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { observationFreshUntil, organizationalObservationService } from "../services/organizational-observations.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;
const evidence = [{ kind: "other" as const, ref: "test:evidence" }];

describeEmbeddedPostgres("organizational observation service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  beforeAll(async () => { tempDb = await startEmbeddedPostgresTestDatabase("paperclip-organizational-observations-"); db = createDb(tempDb.connectionString); }, 60_000);
  afterEach(async () => { await db.delete(organizationalObservations); await db.delete(agents); await db.delete(companies); });
  afterAll(async () => tempDb?.cleanup());

  it("requires source freshness and preserves the learning validation gate", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    expect(createOrganizationalObservationSchema.safeParse({ kind: "external_signal", title: "Production signal", summary: "Observed production state", sourceClass: "monitor", provenance: evidence, observedAt: new Date().toISOString(), externalCategory: "production" }).success).toBe(false);
    expect(createOrganizationalObservationSchema.safeParse({ kind: "learning", status: "promoted", title: "Skip validation", summary: "Must fail", sourceClass: "test", provenance: evidence, observedAt: new Date().toISOString() }).success).toBe(false);

    const svc = organizationalObservationService(db);
    const learning = await svc.create(companyId, { kind: "learning", status: "proposed", title: "Add a regression eval", summary: "The failure should become a reusable eval.", sourceClass: "retrospective", provenance: evidence, observedAt: new Date().toISOString() }, { userId: "board" });
    await expect(svc.update(learning.id, { status: "promoted", promotionTarget: { kind: "eval", ref: "evals/regression" } })).rejects.toMatchObject({ status: 409 });
    expect((await svc.update(learning.id, { status: "validated" }))?.status).toBe("validated");
    const promoted = await svc.update(learning.id, { status: "promoted", promotionTarget: { kind: "eval", ref: "evals/regression" } });
    expect(promoted?.promotedAt).toBeInstanceOf(Date);
  });

  it("calculates bounded freshness and atomically supersedes same-kind evidence", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    const svc = organizationalObservationService(db);
    const observedAt = new Date("2026-07-16T10:00:00.000Z");
    const original = await svc.create(companyId, { kind: "external_signal", status: "current", title: "Customer signal", summary: "Original signal", sourceClass: "customer_interview", provenance: evidence, observedAt: observedAt.toISOString(), freshnessWindowHours: 48, validUntil: "2026-07-17T10:00:00.000Z", externalCategory: "customer" }, { userId: "board" });
    expect(observationFreshUntil(original)?.toISOString()).toBe("2026-07-17T10:00:00.000Z");
    const replacement = await svc.create(companyId, { kind: "external_signal", status: "current", title: "Updated customer signal", summary: "Fresh evidence", sourceClass: "customer_interview", provenance: evidence, observedAt: new Date().toISOString(), freshnessWindowHours: 24, externalCategory: "customer", supersedesId: original.id }, { userId: "board" });
    expect(replacement.supersedesId).toBe(original.id);
    expect((await svc.getById(original.id))?.status).toBe("superseded");
  });

  it("promotes a high-confidence learning only after independent evidence satisfies the evaluator", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    const svc = organizationalObservationService(db);
    const learning = await svc.create(companyId, {
      kind: "learning",
      status: "proposed",
      title: "Bounded dispatch restores a review decision path",
      summary: "Reuse the bounded safeguard after its postcondition has been independently observed.",
      sourceClass: "native_supervision_verified_intervention",
      provenance: [
        { kind: "other", ref: "supervision_intervention:test" },
        { kind: "metric", ref: "supervision_observation_window:test" },
      ],
      confidence: 95,
      observedAt: new Date().toISOString(),
      promotionTarget: { kind: "policy", ref: "native_safeguard:test" },
    }, { userId: "native-supervision" });

    const result = await svc.evaluateLearningPromotion(learning.id);

    expect(result).toMatchObject({ disposition: "promoted", transitions: ["validated", "promoted"] });
    expect((await svc.getById(learning.id))?.status).toBe("promoted");
  });

  it("holds a learning when its evidence is not independent", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    const svc = organizationalObservationService(db);
    const learning = await svc.create(companyId, {
      kind: "learning", status: "proposed", title: "Unverified learning", summary: "One source is not enough.",
      sourceClass: "test", provenance: evidence, confidence: 99, observedAt: new Date().toISOString(),
      promotionTarget: { kind: "eval", ref: "evals/unverified" },
    }, { userId: "board" });

    const result = await svc.evaluateLearningPromotion(learning.id);

    expect(result).toMatchObject({ disposition: "held" });
    expect(result?.reasons).toContain("insufficient_independent_evidence");
    expect((await svc.getById(learning.id))?.status).toBe("proposed");
  });

  it("holds non-supervision learning until durable issue evidence is complete", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    const svc = organizationalObservationService(db);
    const learning = await svc.create(companyId, {
      kind: "learning",
      status: "proposed",
      title: "Do not confuse repetition with verified policy",
      summary: "Two observations still require an evidence-backed completed issue before promotion.",
      sourceClass: "retrospective",
      provenance: [
        { kind: "metric", ref: "metric:first" },
        { kind: "other", ref: "review:second" },
      ],
      confidence: 95,
      observedAt: new Date().toISOString(),
      promotionTarget: { kind: "policy", ref: "policy/durable-only" },
    }, { userId: "board" });

    const result = await svc.evaluateLearningPromotion(learning.id);

    expect(result).toMatchObject({ disposition: "held" });
    expect(result?.reasons).toContain("no_evidence_backed_completed_source_issue");
    expect((await svc.getById(learning.id))?.status).toBe("proposed");
  });
});
