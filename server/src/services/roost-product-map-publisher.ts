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
  PRODUCT_MAP_PAPERCLIP_READ_KEY: string;
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

const envelopeSchema = z.object({
  transportVersion: z.literal("product-map-projection-transport/v1"),
  schemaVersion: z.literal("1.0"),
  companyId: z.string().uuid(),
  observedAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  sourceSnapshotId: z.string().min(1),
  packetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  packet: roostBridgePortfolioProjectionSchema,
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
  const readKey = requireNonBlank(bindings.PRODUCT_MAP_PAPERCLIP_READ_KEY, "PRODUCT_MAP_PAPERCLIP_READ_KEY");
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
  for (const token of [readKey, ingestKey]) {
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

export function semanticPacketDigest(packet: RoostBridgePortfolioProjection) {
  // The source packet itself is semantic. Delivery timestamps and idempotency
  // live only in the envelope and therefore cannot change this digest.
  return createHash("sha256").update(canonicalJson(packet)).digest("hex");
}

export function createTransportEnvelope(packet: RoostBridgePortfolioProjection, publishedAt: string): RoostProductMapEnvelope {
  const packetDigest = semanticPacketDigest(packet);
  return envelopeSchema.parse({
    transportVersion: "product-map-projection-transport/v1",
    schemaVersion: packet.schemaVersion,
    companyId: packet.companyId,
    observedAt: packet.observedAt,
    publishedAt,
    sourceSnapshotId: packet.sourceSnapshotId,
    packetDigest,
    idempotencyKey: createHash("sha256")
      .update(`${packet.companyId}:${packet.schemaVersion}:${packet.sourceSnapshotId}:${packetDigest}`, "utf8")
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
      headers: input.headers,
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

async function publishOnce(options: RoostProductMapPublisherOptions) {
  if (options.signal?.aborted) throw abortError();
  const { source, ingest } = validateBindings(options.bindings);
  if (source.pathname.split("/")[3] !== options.companyId) throw new Error("SOURCE_COMPANY_MISMATCH");
  const request = options.request ?? pinnedRequest;
  const sourceResponse = await withTotalTimeout(() => request({
    target: source, method: "GET", kind: "source", signal: options.signal,
    headers: { authorization: `Bearer ${options.bindings.PRODUCT_MAP_PAPERCLIP_READ_KEY}`, accept: "application/json" },
  }), options.signal);
  if (sourceResponse.status !== 200) throw new Error("SOURCE_AUTH_OR_LOAD_REJECTED");
  const packet = roostBridgePortfolioProjectionSchema.parse(sourceResponse.body);
  if (packet.companyId !== options.companyId) throw new Error("SOURCE_COMPANY_MISMATCH");
  const envelope = createTransportEnvelope(packet, (options.now ?? (() => new Date()))().toISOString());
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
  if (outbound.status < 200 || outbound.status >= 300) throw new Error("INGEST_REJECTED");
  return { packetDigest: envelope.packetDigest, idempotencyKey: envelope.idempotencyKey };
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
