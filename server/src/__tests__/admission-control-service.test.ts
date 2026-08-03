import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  admissionControls,
  admissionControlTransitions,
  agentWakeupRequests,
  agents,
  companies,
  createDb,
  heartbeatRunEvents,
  heartbeatRuns,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { admissionControlService } from "../services/admission-control.js";
import { heartbeatService } from "../services/heartbeat.js";

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
    await db.delete(heartbeatRunEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(admissionControlTransitions);
    await db.delete(admissionControls);
    await db.delete(agents);
    await db.delete(companies);
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
});
