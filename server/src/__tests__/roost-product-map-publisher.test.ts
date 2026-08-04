import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createRoostProductMapPublisherSupervisorIdentity,
  createTransportEnvelope,
  isPrivateAddress,
  pinnedRequestHeaders,
  roostProductMapPublisherService,
  runRoostProductMapPublisher,
  semanticPacketDigest,
  validateBindings,
} from "../services/roost-product-map-publisher.js";

const companyId = "11111111-1111-4111-8111-111111111111";
const bindings = {
  PRODUCT_MAP_PAPERCLIP_SOURCE_URL: `http://127.0.0.1:3200/api/companies/${companyId}/softwarehouse/portfolio-projection/v1`,
  PRODUCT_MAP_PAPERCLIP_READ_KEY: "read-key",
  PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/v1/product-map/projection/ingest",
  PRODUCT_MAP_ROOST_INGEST_KEY: "ingest-key",
};
const packet = {
  schemaVersion: "1.0", sourceVersion: "softwarehouse-status-v1",
  compatibility: { routeVersion: "v1", supportedSchemaVersions: ["1.0"], backwardCompatibleWith: [] },
  observedAt: "2026-07-28T09:00:00.000Z", companyId, sourceSnapshotId: `sha256:${"a".repeat(64)}`,
  sourceState: "available", stale: false, conflictState: "none", supersessionState: "current", failure: null, items: [],
} as const;

describe("Roost Product Map publisher", () => {
  it("rejects broad credentials before invoking a client", async () => {
    await expect(runRoostProductMapPublisher({ bindings: { ...bindings, PRODUCT_MAP_PAPERCLIP_READ_KEY: "board_session_x" }, companyId, request: async () => { throw new Error("must not load"); } }))
      .resolves.toMatchObject({ outcome: "failed", errorCode: "BROAD_CREDENTIAL_REJECTED" });
  });

  it("pins source and outbound URLs and rejects private destinations", () => {
    expect(() => validateBindings({ ...bindings, PRODUCT_MAP_ROOST_INGEST_URL: "https://127.0.0.1/v1/product-map/projection/ingest" })).toThrow("INVALID_INGEST_HOST");
    expect(() => validateBindings({ ...bindings, PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/v1/product-map/projection/ingest?x=1" })).toThrow("INVALID_INGEST_URL");
    expect(() => validateBindings({ ...bindings, PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/api/product-map/projections/v1" })).toThrow("INVALID_INGEST_ROUTE");
    expect(isPrivateAddress("10.0.0.1")).toBe(true);
    expect(isPrivateAddress("fe80::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(pinnedRequestHeaders(new URL(bindings.PRODUCT_MAP_ROOST_INGEST_URL), "outbound", { accept: "application/json" }))
      .toEqual({ host: "roost.example.test", accept: "application/json" });
  });

  it("adapts the source v1 projection into the accepted Roost v2 envelope", () => {
    const envelope = createTransportEnvelope(packet, "2026-07-28T09:01:00.000Z");
    const digest = semanticPacketDigest(envelope.packet);
    expect(envelope.observedAt).toBe(packet.observedAt);
    expect(envelope.packetDigest).toBe(digest);
    expect(envelope).toMatchObject({
      transportVersion: "product-map-projection-transport/v1",
      schemaVersion: "2.0",
      companyId,
      observedAt: packet.observedAt,
      publishedAt: "2026-07-28T09:01:00.000Z",
      sourceSnapshotId: "a".repeat(64),
      packetDigest: digest,
      packet: {
        schemaVersion: "2.0",
        observedAt: packet.observedAt,
        sourceState: "available",
        stale: false,
        conflictState: "none",
      },
    });
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toMatch(/^sha256:/);
    expect(envelope.transportVersion).not.toBe("v1");
    expect(envelope.idempotencyKey).toBe(createHash("sha256")
      .update(`${companyId}:2.0:${"a".repeat(64)}:${digest}`, "utf8")
      .digest("hex"));
    expect(envelope.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.idempotencyKey).not.toContain("pmap:v1:");
    const recursivelyReordered = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(recursivelyReordered);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, recursivelyReordered(child)]));
      }
      return value;
    };
    expect(semanticPacketDigest(recursivelyReordered(envelope.packet))).toBe(digest);
    expect(createTransportEnvelope(packet, "2026-07-28T09:02:00.000Z").packetDigest).toBe(digest);
  });

  it("posts the complete accepted envelope to the fixed ingress with X-API-Key only", async () => {
    const requests: Array<{ target: URL; headers: Record<string, string>; body?: Buffer; kind: string }> = [];
    const result = await runRoostProductMapPublisher({
      bindings,
      companyId,
      now: () => new Date("2026-07-28T09:01:00.000Z"),
      request: async (request) => {
        requests.push(request);
        return request.kind === "source" ? { status: 200, body: packet } : { status: 202, body: {} };
      },
    });
    const outbound = requests.find((request) => request.kind === "outbound")!;
    const emitted = JSON.parse(outbound.body!.toString("utf8"));
    expect(outbound.target.pathname).toBe("/v1/product-map/projection/ingest");
    expect(outbound.headers).toEqual({
      "x-api-key": bindings.PRODUCT_MAP_ROOST_INGEST_KEY,
      "content-type": "application/json",
      "content-length": String(outbound.body!.byteLength),
      "idempotency-key": emitted.idempotencyKey,
    });
    expect(outbound.headers).not.toHaveProperty("authorization");
    expect(emitted).toEqual(createTransportEnvelope(packet, "2026-07-28T09:01:00.000Z"));
    expect(result).toMatchObject({ outcome: "published", attemptCount: 1, packetDigest: emitted.packetDigest, idempotencyKey: emitted.idempotencyKey });
  });

  it("creates provenance through the canonical supervisor identity contract without runtime registration", () => {
    const identity = createRoostProductMapPublisherSupervisorIdentity({
      cwd: "C:/paperclip",
      command: "node publisher.mjs",
      envFingerprint: "sha256:definition-only",
      scope: { companyId, activation: "held" },
    });
    expect(identity).toMatchObject({
      profileKind: "roost-product-map-publisher",
      serviceName: "roost-product-map-publisher",
      port: null,
    });
    expect(identity.serviceKey).toMatch(/^roost-product-map-publisher-roost-product-map-publisher-/);
  });

  it("retries bounded failures and never leaks a credential in telemetry", async () => {
    let attempts = 0;
    const result = await runRoostProductMapPublisher({ bindings, companyId, request: async (request) => {
      attempts += 1;
      if (request.kind === "source") return { status: 200, body: packet };
      return { status: 503, body: {} };
    } });
    expect(attempts).toBe(roostProductMapPublisherService.maxAttempts * 2);
    expect(result).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "INGEST_REJECTED_503" });
    expect(JSON.stringify(result)).not.toContain(bindings.PRODUCT_MAP_ROOST_INGEST_KEY);
  });

  it("coalesces a concurrent run and honors cancellation", async () => {
    let release!: () => void;
    let started!: () => void;
    const sourceStarted = new Promise<void>((resolve) => { started = resolve; });
    const pending = runRoostProductMapPublisher({ bindings, companyId, request: async (request) => {
      if (request.kind === "source") {
        started();
        await new Promise<void>((resolve) => { release = resolve; });
      }
      return { status: 200, body: request.kind === "source" ? packet : {} };
    } });
    await sourceStarted;
    expect(await runRoostProductMapPublisher({ bindings, companyId })).toEqual({ outcome: "coalesced", attemptCount: 0 });
    release();
    await pending;
    const controller = new AbortController(); controller.abort();
    await expect(runRoostProductMapPublisher({ bindings, companyId, signal: controller.signal })).resolves.toMatchObject({ outcome: "cancelled" });
  });

  it("aborts an indefinitely pending injected request at the total operation deadline", async () => {
    vi.useFakeTimers();
    try {
      let aborted = false;
      const result = runRoostProductMapPublisher({ bindings, companyId, request: async (request) => new Promise((_, reject) => {
        request.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("PUBLISHER_CANCELLED"));
        }, { once: true });
      }) });
      await vi.advanceTimersByTimeAsync(roostProductMapPublisherService.totalTimeoutMs);
      await expect(result).resolves.toEqual({ outcome: "cancelled", attemptCount: 1 });
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects invalid source schema, oversized envelopes, and redirect responses without leaking bindings", async () => {
    const invalidSchema = await runRoostProductMapPublisher({ bindings, companyId, request: async (request) => (
      request.kind === "source" ? { status: 200, body: { ...packet, schemaVersion: "2.0" } } : { status: 200, body: {} }
    ) });
    expect(invalidSchema).toMatchObject({ outcome: "failed" });

    const item = {
      offeringId: "offering", companyId, paperclipProjectId: null, paperclipProjectName: "x".repeat(400), paperclipProjectLink: null,
      lifecycleStage: "repair", offeringType: "software", mappingState: "mapped", conflictState: "none", supersessionState: "current",
      sourceControl: { branch: null, sourceSha: null, deployedSha: null, versionAlignment: "unknown" },
      readiness: { status: "UNKNOWN", decision: null, evidenceState: "unknown", zeroGapButNoGo: false, totalGaps: 0, nextGate: null },
      aggregates: { issues: { total: 0, byStatus: {}, limit: 1, truncated: false, withCompletionEvidence: 0 }, runs: { total: 0, byStatus: {}, limit: 1, truncated: false }, approvals: { total: 0, byStatus: {}, limit: 1, truncated: false, pending: 0 }, evidence: { total: 0, byStatus: {}, limit: 1, truncated: false, healthy: 0, reviewed: 0 } },
      provenance: { controlStatusPath: "/status", controlStatusObservedAt: null, readinessSourcePath: null, readinessSourceUpdatedAt: null, ownerSurfacePath: null, ownerSurfaceUpdatedAt: null },
    };
    const oversizedPacket = { ...packet, items: Array.from({ length: 700 }, () => item) };
    const oversized = await runRoostProductMapPublisher({ bindings, companyId, request: async (request) => (
      request.kind === "source" ? { status: 200, body: oversizedPacket } : { status: 200, body: {} }
    ) });
    expect(oversized).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "DESTINATION_SCHEMA_REJECTED" });

    const redirect = await runRoostProductMapPublisher({ bindings, companyId, request: async (request) => (
      request.kind === "source" ? { status: 200, body: packet } : { status: 302, body: {} }
    ) });
    expect(redirect).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "INGEST_REJECTED_302" });
    expect(JSON.stringify({ invalidSchema, oversized, redirect })).not.toContain(bindings.PRODUCT_MAP_ROOST_INGEST_KEY);
  });
});
