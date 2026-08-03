import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { companies, createDb } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { envelopeForOutbox, roostProductMapOutboxService } from "../services/roost-product-map-outbox.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;

describeEmbedded("durable Roost Product Map outbox", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let companyId: string;
  let bindings: {
    PRODUCT_MAP_PAPERCLIP_SOURCE_URL: string;
    PRODUCT_MAP_PAPERCLIP_READ_KEY: string;
    PRODUCT_MAP_ROOST_INGEST_URL: string;
    PRODUCT_MAP_ROOST_INGEST_KEY: string;
  };

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-roost-outbox-");
    db = createDb(tempDb.connectionString);
  }, 60_000);
  afterEach(async () => { await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`)); });
  afterAll(async () => { await tempDb?.cleanup(); });

  async function seed() {
    companyId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Outbox company", issuePrefix: `O${companyId.slice(0, 6)}` });
    bindings = {
      PRODUCT_MAP_PAPERCLIP_SOURCE_URL: `http://127.0.0.1:3200/api/companies/${companyId}/softwarehouse/portfolio-projection/v1`,
      PRODUCT_MAP_PAPERCLIP_READ_KEY: "read-key",
      PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/v1/product-map/projection/ingest",
      PRODUCT_MAP_ROOST_INGEST_KEY: "ingest-key",
    };
  }

  function packet(observedAt: string, snapshot = randomUUID()) {
    return {
      schemaVersion: "1.0" as const, sourceVersion: "softwarehouse-status-v1",
      compatibility: { routeVersion: "v1", supportedSchemaVersions: ["1.0"], backwardCompatibleWith: [] },
      observedAt, companyId, sourceSnapshotId: `sha256:${snapshot.replaceAll("-", "").padEnd(64, "0").slice(0, 64)}`,
      sourceState: "available" as const, stale: false, conflictState: "none" as const,
      supersessionState: "current" as const, failure: null, items: [],
    };
  }

  it("deduplicates events, refuses stale events, and preserves source order", async () => {
    await seed();
    const service = roostProductMapOutboxService(db);
    const older = envelopeForOutbox(packet("2026-08-03T10:00:00.000Z"), "2026-08-03T10:00:01.000Z");
    const newer = envelopeForOutbox(packet("2026-08-03T10:05:00.000Z"), "2026-08-03T10:05:01.000Z");
    expect((await service.enqueueEnvelope(older)).outcome).toBe("enqueued");
    expect((await service.enqueueEnvelope(older)).outcome).toBe("duplicate");
    expect((await service.enqueueEnvelope(newer)).outcome).toBe("enqueued");
    expect((await service.enqueueEnvelope(envelopeForOutbox(packet("2026-08-03T09:59:00.000Z"), "2026-08-03T10:06:00.000Z"))).outcome).toBe("stale");

    const delivered: string[] = [];
    const request = async (input: { kind: string; body?: Buffer }) => {
      if (input.kind === "outbound") delivered.push(JSON.parse(input.body!.toString("utf8")).observedAt);
      return { status: 202, body: {} };
    };
    expect((await service.drainOne(companyId, bindings, request as never, new Date("2026-08-04T11:00:00.000Z"))).outcome).toBe("published");
    expect((await service.drainOne(companyId, bindings, request as never, new Date("2026-08-04T11:00:00.000Z"))).outcome).toBe("published");
    expect(delivered).toEqual(["2026-08-03T10:00:00.000Z", "2026-08-03T10:05:00.000Z"]);
  });

  it("survives publisher outage, retries after backoff, recovers, and reports stale-feed lag", async () => {
    await seed();
    const service = roostProductMapOutboxService(db);
    await service.enqueueEnvelope(envelopeForOutbox(packet("2026-08-03T10:00:00.000Z"), "2026-08-03T10:00:01.000Z"));
    const offline = async () => { throw new Error("INGEST_REJECTED"); };
    expect(await service.drainOne(companyId, bindings, offline, new Date("2026-08-04T10:01:00.000Z")))
      .toMatchObject({ outcome: "retry_scheduled", attempts: 1 });
    expect((await service.drainOne(companyId, bindings, offline, new Date("2026-08-04T10:01:30.000Z"))).outcome).toBe("empty");
    const recovered = async () => ({ status: 202, body: {} });
    expect((await service.drainOne(companyId, bindings, recovered, new Date("2026-08-04T10:02:01.000Z"))).outcome).toBe("published");
    expect(await service.freshness(companyId, new Date("2026-08-04T10:20:00.000Z")))
      .toMatchObject({ status: "published", lagMs: (24 * 60 + 20) * 60_000, lastErrorCode: null });
  });
});
