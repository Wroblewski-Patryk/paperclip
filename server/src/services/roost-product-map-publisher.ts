import { createHash, randomUUID } from "node:crypto";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { roostBridgePortfolioProjectionSchema, type RoostBridgePortfolioProjection } from "@paperclipai/shared";
import { z } from "zod";
import { createLocalServiceKey, type LocalServiceIdentityInput } from "./local-service-supervisor.js";

/**
 * The source-only implementation for the Product Map transport boundary.
 * Nothing in this module starts a process or writes runtime configuration: the
 * protected release gate owns registration and activation of the definition.
 */
export const roostProductMapPublisherService = {
  serviceName: "roost-product-map-publisher",
  profileKind: "roost-product-map-publisher",
  intervalMs: 5 * 60_000,
  connectTimeoutMs: 3_000,
  totalTimeoutMs: 10_000,
  maxAttempts: 3,
  retryDelaysMs: [0, 1_000, 2_000],
  maxPayloadBytes: 256 * 1024,
  sourcePort: 3200,
} as const;

/**
 * Creates the supervisor-compatible provenance identity without registering or
 * starting a service. PMAP-REL supplies the runtime-specific command and
 * fingerprint only after its protected activation gate has passed.
 */
export function createRoostProductMapPublisherSupervisorIdentity(
  input: Omit<LocalServiceIdentityInput, "profileKind" | "serviceName" | "port">,
) {
  const identity: LocalServiceIdentityInput = {
    ...input,
    profileKind: roostProductMapPublisherService.profileKind,
    serviceName: roostProductMapPublisherService.serviceName,
    port: null,
  };
  return { ...identity, serviceKey: createLocalServiceKey(identity) };
}

const bindingNames = [
  "PRODUCT_MAP_PAPERCLIP_SOURCE_URL",
  "PRODUCT_MAP_PAPERCLIP_READ_KEY",
  "PRODUCT_MAP_ROOST_INGEST_URL",
  "PRODUCT_MAP_ROOST_INGEST_KEY",
  "PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY",
] as const;

export type RoostProductMapPublisherBindingName = (typeof bindingNames)[number];

export interface RoostProductMapPublisherBindings {
  PRODUCT_MAP_PAPERCLIP_SOURCE_URL: string;
  PRODUCT_MAP_PAPERCLIP_READ_KEY?: string;
  PRODUCT_MAP_ROOST_INGEST_URL: string;
  PRODUCT_MAP_ROOST_INGEST_KEY: string;
  PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY?: string;
}

export interface PublisherTelemetry {
  outcome: "published" | "coalesced" | "cancelled" | "failed";
  attemptCount: number;
  packetDigest?: string;
  idempotencyKey?: string;
  errorCode?: string;
}

export interface RoostProductMapPublisherOptions {
  bindings: RoostProductMapPublisherBindings;
  companyId: string;
  signal?: AbortSignal;
  now?: () => Date;
  /** Test seam; production uses the separately pinned source/outbound clients. */
  request?: (input: PinnedRequest) => Promise<{ status: number; body: unknown }>;
  onTelemetry?: (event: PublisherTelemetry) => void;
}

export interface PinnedRequest {
  target: URL;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: Buffer;
  signal?: AbortSignal;
  kind: "source" | "outbound";
}

const lifecycleGates = [
  ["direction_portfolio_fit", "Board / 00 AIA / 11 CINO"],
  ["opportunity_problem_validation", "Product / Innovation"],
  ["business_framing", "Product / Finance / Legal"],
  ["product_discovery_requirements", "App PM / Product"],
  ["ux_accessibility_design", "UX / UI / Product"],
  ["architecture_data_threat_design", "CTO / TSA / Security"],
  ["delivery_release_planning", "Delivery / Operations / PM"],
  ["implementation", "Layer specialist"],
  ["automated_verification", "Test Automation / specialist"],
  ["user_flow_qa", "QA / Product / UX"],
  ["independent_review", "Code Review / CTO / Security"],
  ["documentation_operational_readiness", "Docs / DRE / support owner"],
  ["release_decision", "PM / QVE / DRE / Security"],
  ["source_control_closure", "Delivery / author"],
  ["deployment_migration", "DRE / Security"],
  ["production_acceptance", "QVE / DRE / App PM"],
  ["operate_support_observe", "Operations / Product / support owner"],
  ["retrospective_improvement", "COO / accountable stage owner"],
] as const;

const issueStatusCountsSchema = z.object({
  backlog: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
}).strict();

const roostProductMapPacketV2Schema = z.object({
  schemaVersion: z.literal("2.0"),
  observedAt: z.string().datetime(),
  sourceState: z.enum(["available", "unavailable", "timed_out"]),
  stale: z.boolean(),
  conflictState: z.enum(["none", "source_unavailable", "project_mapping_conflict", "owner_surface_unavailable"]),
  lifecycleProcedure: z.object({
    procedureId: z.literal("PROC-SH-APPLICATION-LIFECYCLE"),
    procedureVersion: z.literal("1.0"),
    executionAuthority: z.literal("paperclip"),
    observedAt: z.string().datetime(),
    verifiedAt: z.string().datetime().nullable(),
    freshness: z.enum(["current", "stale", "unavailable"]),
    gateResults: z.array(z.object({
      stageKey: z.string().min(1),
      status: z.enum(["verified", "not_applicable", "blocked", "stale", "failed"]),
      summary: z.string().min(1).max(500),
      ownerRole: z.string().min(1).max(120),
      verifiedAt: z.string().datetime().nullable(),
      evidenceRefs: z.array(z.never()),
    }).strict()).length(lifecycleGates.length),
    evidenceRefs: z.array(z.never()),
    supersession: z.object({
      status: z.literal("active"),
      supersedesVersion: z.string().nullable(),
      supersededByVersion: z.null(),
    }).strict(),
    source: z.object({
      repository: z.literal("Paperclip_Softwarehouse"),
      path: z.literal("docs/softwarehouse/19-autonomous-application-business-lifecycle.md"),
      documentVersion: z.literal("1.0"),
      commitSha: z.string().regex(/^[a-f0-9]{40}$/),
    }).strict(),
  }).strict(),
  items: z.array(z.object({
    offeringId: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    paperclipProjectName: z.string().min(1).max(120),
    lifecycleStage: z.string().min(1).max(120),
    applicationVersion: z.object({
      namespace: z.literal("application_release"),
      currentVersion: z.string().regex(/^v\d+$/),
      currentStatus: z.enum(["in_progress", "accepted"]),
      nextVersion: z.string().regex(/^v\d+$/).nullable(),
      nextVersionStatus: z.enum(["locked", "unlocked"]).nullable(),
      policySourcePath: z.string().min(1).max(240),
    }).strict(),
    conflictState: z.enum(["none", "project_mapping_conflict", "owner_surface_unavailable"]),
    sourceControl: z.object({
      branch: z.string().min(1).max(120).nullable(),
      sourceSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
      deployedSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
      versionAlignment: z.enum(["aligned", "different", "unknown"]),
    }).strict(),
    readiness: z.object({
      status: z.enum(["GO", "NO-GO", "UNKNOWN"]),
      evidenceState: z.enum(["complete", "missing", "unknown"]),
      zeroGapButNoGo: z.boolean(),
      totalGaps: z.number().int().nonnegative(),
      nextGate: z.string().min(1).max(500).nullable(),
    }).strict(),
    aggregates: z.object({
      issues: z.object({ total: z.number().int().nonnegative(), byStatus: issueStatusCountsSchema }).strict(),
    }).strict(),
  }).strict()).max(50),
}).strict();

type RoostProductMapPacketV2 = z.infer<typeof roostProductMapPacketV2Schema>;

const envelopeSchema = z.object({
  transportVersion: z.literal("product-map-projection-transport/v1"),
  schemaVersion: z.literal("2.0"),
  companyId: z.string().uuid(),
  observedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceSnapshotId: z.string().min(1),
  packetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  packet: roostProductMapPacketV2Schema,
});

export type RoostProductMapEnvelope = z.infer<typeof envelopeSchema>;

let inFlight: Promise<PublisherTelemetry> | null = null;

function safeErrorCode(error: unknown) {
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) return error.message;
  return "publisher_failed";
}

function requireNonBlank(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`MISSING_${name}`);
  return value;
}

function isLoopbackHost(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "::1" || hostname.toLowerCase() === "localhost";
}

/** Reject control-plane/session style tokens before any source request is attempted. */
export function validateBindings(bindings: RoostProductMapPublisherBindings) {
  const source = new URL(requireNonBlank(bindings.PRODUCT_MAP_PAPERCLIP_SOURCE_URL, "PRODUCT_MAP_PAPERCLIP_SOURCE_URL"));
  const ingest = new URL(requireNonBlank(bindings.PRODUCT_MAP_ROOST_INGEST_URL, "PRODUCT_MAP_ROOST_INGEST_URL"));
  const readKey = bindings.PRODUCT_MAP_PAPERCLIP_READ_KEY?.trim() || null;
  const ingestKey = requireNonBlank(bindings.PRODUCT_MAP_ROOST_INGEST_KEY, "PRODUCT_MAP_ROOST_INGEST_KEY");
  if (source.protocol !== "http:" || !isLoopbackHost(source.hostname) || source.port !== "3200" || source.username || source.password || source.search || source.hash) {
    throw new Error("INVALID_SOURCE_URL");
  }
  if (!/^\/api\/companies\/[0-9a-f-]{36}\/softwarehouse\/portfolio-projection\/v1$/i.test(source.pathname)) {
    throw new Error("INVALID_SOURCE_ROUTE");
  }
  if (ingest.protocol !== "https:" || ingest.port && ingest.port !== "443" || ingest.username || ingest.password || ingest.search || ingest.hash) {
    throw new Error("INVALID_INGEST_URL");
  }
  if (ingest.pathname !== "/v1/product-map/projection/ingest") throw new Error("INVALID_INGEST_ROUTE");
  if (isLoopbackHost(ingest.hostname) || isPrivateAddress(ingest.hostname)) throw new Error("INVALID_INGEST_HOST");
  for (const token of [readKey, ingestKey].filter((value): value is string => Boolean(value))) {
    if (/^(Bearer\s+)?(?:board|session|agent|run)[_:\-]/i.test(token)) throw new Error("BROAD_CREDENTIAL_REJECTED");
  }
  return { source, ingest };
}

export function isPrivateAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("ff");
  }
  return false;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function semanticPacketDigest(packet: unknown) {
  // The source packet itself is semantic. Delivery timestamps and idempotency
  // live only in the envelope and therefore cannot change this digest.
  return createHash("sha256").update(canonicalJson(packet)).digest("hex");
}

function issueCount(byStatus: Record<string, number>, ...keys: string[]) {
  return keys.reduce((total, key) => total + (byStatus[key] ?? 0), 0);
}

export function toRoostProductMapPacketV2(packet: RoostBridgePortfolioProjection): RoostProductMapPacketV2 {
  const freshness = packet.sourceState === "available" ? (packet.stale ? "stale" : "current") : "unavailable";
  const candidate = {
    schemaVersion: "2.0",
    observedAt: packet.observedAt,
    sourceState: packet.sourceState,
    stale: freshness !== "current",
    conflictState: packet.conflictState,
    lifecycleProcedure: {
      procedureId: "PROC-SH-APPLICATION-LIFECYCLE",
      procedureVersion: "1.0",
      executionAuthority: "paperclip",
      observedAt: packet.observedAt,
      verifiedAt: null,
      freshness,
      gateResults: lifecycleGates.map(([stageKey, ownerRole]) => ({
        stageKey,
        status: "blocked" as const,
        summary: "Paperclip has not projected inspectable verification evidence for this portfolio-level lifecycle gate.",
        ownerRole,
        verifiedAt: null,
        evidenceRefs: [],
      })),
      evidenceRefs: [],
      supersession: { status: "active", supersedesVersion: null, supersededByVersion: null },
      source: {
        repository: "Paperclip_Softwarehouse",
        path: "docs/softwarehouse/19-autonomous-application-business-lifecycle.md",
        documentVersion: "1.0",
        commitSha: "b0e02c28de8bb3ebe0abf6239a5771b389a779f9",
      },
    },
    items: packet.items.map((item) => {
      const counts = item.aggregates.issues.byStatus;
      return {
        offeringId: item.offeringId,
        paperclipProjectName: item.paperclipProjectName,
        lifecycleStage: item.lifecycleStage,
        applicationVersion: item.applicationVersion,
        conflictState: item.conflictState,
        sourceControl: {
          branch: item.sourceControl.branch,
          sourceSha: item.sourceControl.sourceSha,
          deployedSha: item.sourceControl.deployedSha,
          versionAlignment: item.sourceControl.versionAlignment,
        },
        readiness: {
          status: item.readiness.status,
          evidenceState: item.readiness.evidenceState,
          zeroGapButNoGo: item.readiness.zeroGapButNoGo,
          totalGaps: item.readiness.totalGaps,
          nextGate: item.readiness.nextGate?.trim() || null,
        },
        aggregates: {
          issues: {
            total: item.aggregates.issues.total,
            byStatus: {
              backlog: issueCount(counts, "backlog"),
              todo: issueCount(counts, "todo"),
              inProgress: issueCount(counts, "in_progress", "inProgress"),
              inReview: issueCount(counts, "in_review", "inReview"),
              blocked: issueCount(counts, "blocked"),
              done: issueCount(counts, "done"),
              cancelled: issueCount(counts, "cancelled", "canceled"),
            },
          },
        },
      };
    }),
  };
  const parsed = roostProductMapPacketV2Schema.safeParse(candidate);
  if (!parsed.success) throw new Error("DESTINATION_SCHEMA_REJECTED");
  return parsed.data;
}

export function createTransportEnvelope(sourcePacket: RoostBridgePortfolioProjection, publishedAt: string): RoostProductMapEnvelope {
  const packet = toRoostProductMapPacketV2(sourcePacket);
  const packetDigest = semanticPacketDigest(packet);
  return envelopeSchema.parse({
    transportVersion: "product-map-projection-transport/v1",
    schemaVersion: packet.schemaVersion,
    companyId: sourcePacket.companyId,
    observedAt: packet.observedAt,
    publishedAt,
    sourceSnapshotId: sourcePacket.sourceSnapshotId.replace(/^sha256:/, ""),
    packetDigest,
    idempotencyKey: createHash("sha256")
      .update(`${sourcePacket.companyId}:${packet.schemaVersion}:${sourcePacket.sourceSnapshotId.replace(/^sha256:/, "")}:${packetDigest}`, "utf8")
      .digest("hex"),
    packet,
  });
}

function abortError() { return new Error("PUBLISHER_CANCELLED"); }
function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(abortError()); }, { once: true });
  });
}

async function resolvePublicAddress(hostname: string) {
  const answers = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  if (answers.length === 0 || answers.some((answer) => isPrivateAddress(answer.address))) throw new Error("PRIVATE_DNS_REFUSED");
  return answers[0]!;
}

export function pinnedRequestHeaders(target: URL, kind: "source" | "outbound", headers: Record<string, string>) {
  return kind === "outbound" ? { host: target.host, ...headers } : { ...headers };
}

async function pinnedRequest(input: PinnedRequest): Promise<{ status: number; body: unknown }> {
  const target = input.target;
  const source = input.kind === "source";
  if (source && (!isLoopbackHost(target.hostname) || target.port !== "3200")) throw new Error("INVALID_SOURCE_URL");
  const resolved = source ? null : await resolvePublicAddress(target.hostname);
  const transport = source ? http : https;
  return await new Promise((resolve, reject) => {
    const request = transport.request({
      protocol: target.protocol,
      hostname: source ? target.hostname : resolved!.address,
      servername: source ? undefined : target.hostname,
      port: source ? 3200 : 443,
      path: `${target.pathname}`,
      method: input.method,
      headers: pinnedRequestHeaders(target, input.kind, input.headers),
      agent: false,
      rejectUnauthorized: !source,
      lookup: source ? undefined : ((_hostname, _options, callback) => callback(null, resolved!.address, resolved!.family)),
      timeout: roostProductMapPublisherService.connectTimeoutMs,
    }, (response) => {
      const chunks: Buffer[] = [];
      let length = 0;
      response.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > roostProductMapPublisherService.maxPayloadBytes) request.destroy(new Error("PAYLOAD_TOO_LARGE"));
        else chunks.push(chunk);
      });
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try { resolve({ status: response.statusCode ?? 0, body: text ? JSON.parse(text) : null }); } catch { reject(new Error("INVALID_JSON_RESPONSE")); }
      });
    });
    request.once("timeout", () => request.destroy(new Error("CONNECT_TIMEOUT")));
    request.once("error", reject);
    input.signal?.addEventListener("abort", () => request.destroy(abortError()), { once: true });
    if (input.body) request.write(input.body);
    request.end();
  });
}

async function withTotalTimeout<T>(callback: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), roostProductMapPublisherService.totalTimeoutMs);
  const relay = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", relay, { once: true });
  try { return await callback(controller.signal); } finally { clearTimeout(timer); signal?.removeEventListener("abort", relay); }
}

export async function loadRoostProductMapEnvelope(options: RoostProductMapPublisherOptions) {
  if (options.signal?.aborted) throw abortError();
  const { source, ingest } = validateBindings(options.bindings);
  if (source.pathname.split("/")[3] !== options.companyId) throw new Error("SOURCE_COMPANY_MISMATCH");
  const request = options.request ?? pinnedRequest;
  const sourceResponse = await withTotalTimeout(() => request({
    target: source, method: "GET", kind: "source", signal: options.signal,
    headers: {
      ...(options.bindings.PRODUCT_MAP_PAPERCLIP_READ_KEY
        ? { authorization: `Bearer ${options.bindings.PRODUCT_MAP_PAPERCLIP_READ_KEY}` }
        : {}),
      accept: "application/json",
    },
  }), options.signal);
  if (sourceResponse.status !== 200) throw new Error("SOURCE_AUTH_OR_LOAD_REJECTED");
  const packet = roostBridgePortfolioProjectionSchema.parse(sourceResponse.body);
  if (packet.companyId !== options.companyId) throw new Error("SOURCE_COMPANY_MISMATCH");
  return createTransportEnvelope(packet, (options.now ?? (() => new Date()))().toISOString());
}

export async function deliverRoostProductMapEnvelope(
  envelope: RoostProductMapEnvelope,
  options: Pick<RoostProductMapPublisherOptions, "bindings" | "request" | "signal">,
) {
  const { ingest } = validateBindings(options.bindings);
  const request = options.request ?? pinnedRequest;
  const bytes = Buffer.from(canonicalJson(envelope));
  if (bytes.byteLength > roostProductMapPublisherService.maxPayloadBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const headers: Record<string, string> = {
    "x-api-key": options.bindings.PRODUCT_MAP_ROOST_INGEST_KEY,
    "content-type": "application/json",
    "content-length": String(bytes.byteLength),
    "idempotency-key": envelope.idempotencyKey,
  };
  if (options.bindings.PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY) {
    headers["x-product-map-signature"] = `sha256=${createHash("sha256").update(options.bindings.PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY).update(bytes).digest("hex")}`;
  }
  const outbound = await withTotalTimeout(() => request({ target: ingest, method: "POST", kind: "outbound", headers, body: bytes, signal: options.signal }), options.signal);
  if (outbound.status < 200 || outbound.status >= 300) {
    const safeStatus = Number.isInteger(outbound.status) && outbound.status >= 100 && outbound.status <= 599
      ? outbound.status
      : 0;
    throw new Error(`INGEST_REJECTED_${safeStatus}`);
  }
  return { packetDigest: envelope.packetDigest, idempotencyKey: envelope.idempotencyKey };
}

async function publishOnce(options: RoostProductMapPublisherOptions) {
  const envelope = await loadRoostProductMapEnvelope(options);
  return deliverRoostProductMapEnvelope(envelope, options);
}

export async function runRoostProductMapPublisher(options: RoostProductMapPublisherOptions): Promise<PublisherTelemetry> {
  if (inFlight) return { outcome: "coalesced", attemptCount: 0 };
  const run = withTotalTimeout(async (totalSignal): Promise<PublisherTelemetry> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < roostProductMapPublisherService.maxAttempts; attempt += 1) {
      try {
        if (totalSignal.aborted) return { outcome: "cancelled", attemptCount: attempt };
        if (attempt) await sleep(roostProductMapPublisherService.retryDelaysMs[attempt]!, totalSignal);
        const result = await publishOnce({ ...options, signal: totalSignal });
        return { outcome: "published", attemptCount: attempt + 1, ...result };
      } catch (error) {
        lastError = error;
        if (totalSignal.aborted || safeErrorCode(error) === "PUBLISHER_CANCELLED") return { outcome: "cancelled", attemptCount: attempt + 1 };
      }
    }
    return { outcome: "failed", attemptCount: roostProductMapPublisherService.maxAttempts, errorCode: safeErrorCode(lastError) };
  }, options.signal);
  inFlight = run;
  try { const telemetry = await run; options.onTelemetry?.(telemetry); return telemetry; } finally { inFlight = null; }
}

/** Names only: useful for config/upgrade provenance without exposing values. */
export function roostProductMapPublisherBindingInventory() { return [...bindingNames]; }
