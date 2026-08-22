import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  supervisionEvidenceRefs,
  supervisionFindings,
  supervisionRecurrences,
  supervisionCycles,
  supervisionShadowComparisons,
} from "@paperclipai/db";
import { supervisionRegistryService } from "../services/supervision-registry.js";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describeEmbedded("PostgreSQL supervision registry", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-supervision-registry-");
    db = createDb(tempDb.connectionString);
  }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed() {
    const companyId = randomUUID();
    const otherCompanyId = randomUUID();
    const ownerAgentId = randomUUID();
    const foreignAgentId = randomUUID();
    await db.insert(companies).values([
      { id: companyId, name: "Supervision company", issuePrefix: `S${companyId.slice(0, 6)}`, status: "active", requireBoardApprovalForNewAgents: false },
      { id: otherCompanyId, name: "Foreign company", issuePrefix: `F${otherCompanyId.slice(0, 6)}`, status: "active", requireBoardApprovalForNewAgents: false },
    ]);
    await db.insert(agents).values([
      { id: ownerAgentId, companyId, name: "Watchdog", role: "supervisor", permissions: {} },
      { id: foreignAgentId, companyId: otherCompanyId, name: "Foreign", role: "supervisor", permissions: {} },
    ]);
    return { companyId, otherCompanyId, ownerAgentId, foreignAgentId };
  }

  function finding(ownerAgentId?: string) {
    return {
      fingerprint: "runtime:stalled-run:agent-1",
      problemClass: "stalled_run",
      severity: "high" as const,
      sourceKind: "native_watchdog" as const,
      title: "Run exceeded its progress boundary",
      summary: "The same heartbeat run remained active without durable progress.",
      ownerAgentId,
      evidence: [{ sourceKind: "heartbeat_run", sourceRef: "run:test", label: "run snapshot", metadata: { sequence: 1 } }],
      recurrenceEvidence: { detector: "native-watchdog" },
      retryCount: 0,
      economics: { timeBudgetMinutes: 5, retryBudget: 1, stopBoundary: "escalate after one recovery" },
      decision: {},
      recoveryState: "detected",
      status: "detected" as const,
      classification: "runtime_health",
      sourceRef: "run:test",
      affectedComponent: "heartbeat",
      ownerUserId: null,
      projectId: null,
      issueId: null,
      deliveryId: null,
      deliveryTaskId: null,
      affectedAgentId: null,
      admissionDecisionId: null,
      rootCauseId: null,
      nativeSafeguardId: null,
      cooldownUntil: null,
      runId: null,
      cycleId: null,
    };
  }

  it("deduplicates atomically and preserves recurrence plus evidence history", async () => {
    const refs = await seed();
    const svc = supervisionRegistryService(db);
    const first = await svc.upsertFinding(refs.companyId, finding(refs.ownerAgentId));
    const second = await svc.upsertFinding(refs.companyId, { ...finding(refs.ownerAgentId), recurrenceEvidence: { detector: "native-watchdog", sequence: 2 } });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.finding.id).toBe(first.finding.id);
    expect(second.finding.occurrenceCount).toBe(2);
    expect(second.finding.recurrenceCount).toBe(1);
    expect(await db.select().from(supervisionFindings)).toHaveLength(1);
    expect(await db.select().from(supervisionRecurrences)).toHaveLength(2);
    expect(await db.select().from(supervisionEvidenceRefs)).toHaveLength(2);
  });

  it("rejects cross-company ownership in the service boundary", async () => {
    const refs = await seed();
    await expect(supervisionRegistryService(db).upsertFinding(refs.companyId, finding(refs.foreignAgentId)))
      .rejects.toMatchObject({ status: 400 });
  });

  it("closes a root cause only after a verified safeguard passes observation", async () => {
    const refs = await seed();
    const svc = supervisionRegistryService(db);
    const created = await svc.upsertFinding(refs.companyId, finding(refs.ownerAgentId));
    const root = (await svc.createRootCause(refs.companyId, {
      fingerprint: "root:missing-progress-deadline",
      problemClass: "stalled_run",
      status: "confirmed",
      title: "Missing progress deadline enforcement",
      summary: "Run lifecycle admitted indefinite active state.",
      hypothesis: "The watchdog had no database-backed deadline.",
      ownerAgentId: refs.ownerAgentId,
      ownerUserId: null,
      projectId: null,
      issueId: null,
    })).rootCause;
    await svc.linkFindingRootCause(created.finding.id, root.id);
    const safeguard = (await svc.createSafeguard(refs.companyId, {
      key: "heartbeat-progress-deadline-v1",
      kind: "runtime_invariant",
      status: "implemented",
      title: "Heartbeat progress deadline",
      target: "heartbeat_runs",
      implementationRef: "server/src/services/heartbeat-watchdog.ts",
      regressionTestRef: "server/src/__tests__/heartbeat-watchdog.test.ts",
      removalCondition: "replacement invariant is verified",
      ownerAgentId: refs.ownerAgentId,
      rootCauseId: root.id,
      enabled: true,
    })).safeguard;

    await expect(svc.closeRootCause(root.id, {
      resolution: "Deadline enforcement installed.", nativeSafeguardId: safeguard.id,
      evidence: [{ sourceKind: "test", sourceRef: "test:before-observation", metadata: {} }], retentionDays: 365,
    })).rejects.toMatchObject({ status: 409 });

    await svc.updateSafeguard(safeguard.id, { status: "verified", enabled: true });
    const now = Date.now();
    const window = await svc.createObservationWindow(refs.companyId, {
      findingId: created.finding.id,
      interventionId: null,
      nativeSafeguardId: safeguard.id,
      expectedEffect: "No indefinite active run remains.",
      successCriteria: [{ metric: "expired_active_runs", expected: 0 }],
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 60_000).toISOString(),
    });
    await svc.completeObservationWindow(window.id, {
      status: "passed",
      measurements: [{ metric: "expired_active_runs", value: 0 }],
      conclusion: "The invariant held for the observation window.",
    });
    const closed = await svc.closeRootCause(root.id, {
      resolution: "Verified database-backed deadline enforcement.", nativeSafeguardId: safeguard.id,
      evidence: [{ sourceKind: "test", sourceRef: "test:supervision-registry", label: "regression", metadata: {} }], retentionDays: 365,
    });

    expect(closed?.rootCause.status).toBe("resolved");
    expect(closed?.closedFindings).toHaveLength(1);
    expect(closed?.closedFindings[0].status).toBe("closed");
    expect(closed?.closedFindings[0].retainedUntil).toBeInstanceOf(Date);
  });

  it("stores an idempotent shadow comparison and absorbs external-only evidence into native supervision", async () => {
    const refs = await seed();
    const svc = supervisionRegistryService(db);
    await svc.upsertFinding(refs.companyId, finding(refs.ownerAgentId));
    const input = {
      externalSource: "paperclip_watchdog" as const,
      externalCycleId: "shadow-2026-08-04",
      nativeCycleId: null,
      externalFindings: [
        { fingerprint: "runtime:stalled-run:agent-1", severity: "critical" as const, title: "Same incident, higher external severity" },
        { fingerprint: "external:reward-hacking", severity: "high" as const, title: "External-only assurance finding" },
      ],
    };
    const first = await svc.compareExternalAssurance(refs.companyId, input);
    const second = await svc.compareExternalAssurance(refs.companyId, input);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.comparison).toMatchObject({ status: "attention_required", matchedFingerprints: ["runtime:stalled-run:agent-1"], onlyExternal: ["external:reward-hacking"] });
    expect(first.comparison.severityMismatches).toHaveLength(1);
    expect(await db.select().from(supervisionShadowComparisons)).toHaveLength(1);
    expect(await db.select().from(supervisionFindings)).toEqual(expect.arrayContaining([
      expect.objectContaining({ fingerprint: "external:reward-hacking", sourceKind: "external_assurance", status: "admission_pending" }),
    ]));
    expect(await db.select().from(supervisionFindings)).toHaveLength(2);
    expect(first.absorbedFindings).toHaveLength(1);
  });

  it("backfills a missing cycle finish timestamp idempotently", async () => {
    const refs = await seed();
    const svc = supervisionRegistryService(db);
    const started = await svc.createCycle(refs.companyId, {
      sourceKind: "native_watchdog",
      externalCycleId: "finish-backfill",
      triggerKind: "test",
      budget: {},
      expiresAt: null,
    });
    await db.update(supervisionCycles).set({ status: "completed", finishedAt: null }).where(sql`${supervisionCycles.id} = ${started.cycle.id}`);

    const finished = await svc.finishCycle(started.cycle.id, {
      status: "completed",
      metrics: { checks: 1 },
      summary: "Recovered terminal timestamp",
    });

    expect(finished).toMatchObject({ status: "completed", metrics: { checks: 1 }, summary: "Recovered terminal timestamp" });
    expect(finished?.finishedAt).toBeInstanceOf(Date);
  });

  it("maps known external assurance names to their native detector fingerprints", async () => {
    const refs = await seed();
    const svc = supervisionRegistryService(db);
    await svc.upsertFinding(refs.companyId, {
      ...finding(refs.ownerAgentId),
      fingerprint: `cost_telemetry_gap:${refs.companyId}`,
      problemClass: "cost_telemetry_gap",
      title: "Accepted outcomes have no cost telemetry",
    });
    const result = await svc.compareExternalAssurance(refs.companyId, {
      externalSource: "paperclip_watchdog",
      externalCycleId: "external-alias-parity",
      nativeCycleId: null,
      externalFindings: [{
        fingerprint: "external:cost_telemetry_zero_with_accepted_outcomes",
        severity: "high",
        title: "Accepted outcomes with missing cost telemetry",
      }],
    });
    expect(result.comparison).toMatchObject({
      matchedFingerprints: [`cost_telemetry_gap:${refs.companyId}`],
      onlyExternal: [],
    });
  });
});
