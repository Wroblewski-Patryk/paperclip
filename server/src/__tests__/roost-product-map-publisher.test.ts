import { describe, expect, it, vi } from "vitest";
import {
  createRoostProductMapPublisherSupervisorIdentity,
  createTransportEnvelope,
  isPrivateAddress,
  roostProductMapPublisherService,
  runRoostProductMapPublisher,
  semanticPacketDigest,
  validateBindings,
} from "../services/roost-product-map-publisher.js";

const companyId = "11111111-1111-4111-8111-111111111111";
const bindings = {
  PRODUCT_MAP_PAPERCLIP_SOURCE_URL: `http://127.0.0.1:3200/api/companies/${companyId}/softwarehouse/portfolio-projection/v1`,
  PRODUCT_MAP_PAPERCLIP_READ_KEY: "read-key",
  PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/api/product-map/projections/v1",
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
    expect(() => validateBindings({ ...bindings, PRODUCT_MAP_ROOST_INGEST_URL: "https://127.0.0.1/ingest" })).toThrow("INVALID_INGEST_HOST");
    expect(() => validateBindings({ ...bindings, PRODUCT_MAP_ROOST_INGEST_URL: "https://roost.example.test/ingest?x=1" })).toThrow("INVALID_INGEST_URL");
    expect(isPrivateAddress("10.0.0.1")).toBe(true);
    expect(isPrivateAddress("fe80::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("uses source observation and semantic digest for replay/idempotency", () => {
    const digest = semanticPacketDigest(packet);
    const envelope = createTransportEnvelope(packet, "2026-07-28T09:01:00.000Z");
    expect(envelope.observedAt).toBe(packet.observedAt);
    expect(envelope.packetDigest).toBe(digest);
    expect(envelope.idempotencyKey).toContain(digest);
    expect(createTransportEnvelope(packet, "2026-07-28T09:02:00.000Z").packetDigest).toBe(digest);
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
    expect(result).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "INGEST_REJECTED" });
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
    expect(oversized).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "PAYLOAD_TOO_LARGE" });

    const redirect = await runRoostProductMapPublisher({ bindings, companyId, request: async (request) => (
      request.kind === "source" ? { status: 200, body: packet } : { status: 302, body: {} }
    ) });
    expect(redirect).toEqual({ outcome: "failed", attemptCount: 3, errorCode: "INGEST_REJECTED" });
    expect(JSON.stringify({ invalidSchema, oversized, redirect })).not.toContain(bindings.PRODUCT_MAP_ROOST_INGEST_KEY);
  });
});
