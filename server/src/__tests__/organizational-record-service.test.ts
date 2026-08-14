import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, organizationalRecords } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { organizationalRecordService } from "../services/organizational-records.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

describeEmbeddedPostgres("organizational record service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-organizational-records-");
    db = createDb(tempDb.connectionString);
  }, 120_000);

  afterEach(async () => {
    await db.delete(organizationalRecords);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => tempDb?.cleanup());

  it("enforces company-scoped references and lifecycle transitions", async () => {
    const companyId = randomUUID();
    const otherCompanyId = randomUUID();
    const ownerAgentId = randomUUID();
    const otherAgentId = randomUUID();
    await db.insert(companies).values([
      { id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false },
      { id: otherCompanyId, name: "Other", issuePrefix: "OTH", requireBoardApprovalForNewAgents: false },
    ]);
    await db.insert(agents).values([
      { id: ownerAgentId, companyId, name: "Owner", role: "operator", status: "idle", adapterType: "codex_local", adapterConfig: {}, runtimeConfig: {}, permissions: {} },
      { id: otherAgentId, companyId: otherCompanyId, name: "Other", role: "operator", status: "idle", adapterType: "codex_local", adapterConfig: {}, runtimeConfig: {}, permissions: {} },
    ]);
    const svc = organizationalRecordService(db);

    await expect(svc.create(companyId, {
      kind: "commitment",
      status: "proposed",
      title: "Ownerless promise",
      statement: "This must fail instead of creating an unaccountable promise.",
    }, { userId: "board" })).rejects.toMatchObject({ status: 400 });

    const created = await svc.create(companyId, {
      kind: "commitment",
      status: "proposed",
      title: "Produce review evidence",
      statement: "Attach review evidence before handoff.",
      ownerAgentId,
      evidence: [],
    }, { agentId: ownerAgentId });
    expect(created).toMatchObject({ companyId, kind: "commitment", status: "proposed", ownerAgentId });
    expect(created.reviewAt).toBeInstanceOf(Date);
    await expect(svc.update(created.id, { ownerAgentId: null })).rejects.toMatchObject({ status: 400 });

    const active = await svc.update(created.id, { status: "active" });
    expect(active?.status).toBe("active");
    const fulfilled = await svc.update(created.id, { status: "fulfilled", resolution: "Review evidence attached." });
    expect(fulfilled?.status).toBe("fulfilled");
    expect(fulfilled?.resolvedAt).toBeInstanceOf(Date);
    await expect(svc.update(created.id, { status: "active" })).rejects.toMatchObject({ status: 409 });

    await expect(svc.create(companyId, {
      kind: "assumption",
      status: "active",
      title: "Cross-company owner",
      statement: "This must fail.",
      ownerAgentId: otherAgentId,
    }, { agentId: ownerAgentId })).rejects.toMatchObject({ status: 400 });

    const assumption = await svc.create(companyId, {
      kind: "assumption",
      status: "active",
      title: "Time-bounded premise",
      statement: "This premise must be revisited rather than becoming permanent truth.",
      ownerAgentId,
    }, { agentId: ownerAgentId });
    expect(assumption.reviewAt).toBeInstanceOf(Date);
    expect(assumption.expiresAt).toBeInstanceOf(Date);
    expect(assumption.expiresAt!.getTime()).toBeGreaterThan(assumption.reviewAt!.getTime());
  });

  it("supersedes a predecessor of the same kind atomically", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "LuckySparrow", issuePrefix: "LSP", requireBoardApprovalForNewAgents: false });
    const svc = organizationalRecordService(db);
    const original = await svc.create(companyId, {
      kind: "decision",
      status: "accepted",
      title: "Original direction",
      statement: "Use the original direction.",
    }, { userId: "board" });
    const replacement = await svc.create(companyId, {
      kind: "decision",
      status: "accepted",
      title: "Revised direction",
      statement: "Use the revised direction.",
      supersedesId: original.id,
    }, { userId: "board" });
    expect(replacement.supersedesId).toBe(original.id);
    expect((await svc.getById(original.id))?.status).toBe("superseded");
  });
});
