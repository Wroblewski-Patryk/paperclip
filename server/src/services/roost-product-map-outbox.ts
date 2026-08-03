import { and, asc, desc, eq, lte } from "drizzle-orm";
import { roostProductMapOutbox, type Db } from "@paperclipai/db";
import type { RoostBridgePortfolioProjection } from "@paperclipai/shared";
import {
  createTransportEnvelope,
  deliverRoostProductMapEnvelope,
  loadRoostProductMapEnvelope,
  type RoostProductMapEnvelope,
  type RoostProductMapPublisherBindings,
  type RoostProductMapPublisherOptions,
} from "./roost-product-map-publisher.js";

const MAX_DURABLE_ATTEMPTS = 12;
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const;

export function roostProductMapOutboxService(db: Db) {
  async function enqueueEnvelope(envelope: RoostProductMapEnvelope) {
    const latest = await db.query.roostProductMapOutbox.findFirst({
      where: eq(roostProductMapOutbox.companyId, envelope.companyId),
      orderBy: [desc(roostProductMapOutbox.observedAt), desc(roostProductMapOutbox.createdAt)],
    });
    if (latest && latest.observedAt.getTime() > new Date(envelope.observedAt).getTime()) {
      return { outcome: "stale" as const, row: latest };
    }
    const [inserted] = await db.insert(roostProductMapOutbox).values({
      companyId: envelope.companyId,
      sourceSnapshotId: envelope.sourceSnapshotId,
      packetDigest: envelope.packetDigest,
      idempotencyKey: envelope.idempotencyKey,
      observedAt: new Date(envelope.observedAt),
      envelope,
    }).onConflictDoNothing().returning();
    if (inserted) return { outcome: "enqueued" as const, row: inserted };
    const duplicate = await db.query.roostProductMapOutbox.findFirst({
      where: and(eq(roostProductMapOutbox.companyId, envelope.companyId), eq(roostProductMapOutbox.idempotencyKey, envelope.idempotencyKey)),
    });
    return { outcome: "duplicate" as const, row: duplicate! };
  }

  async function capture(options: RoostProductMapPublisherOptions) {
    return enqueueEnvelope(await loadRoostProductMapEnvelope(options));
  }

  async function drainOne(companyId: string, bindings: RoostProductMapPublisherBindings, request?: RoostProductMapPublisherOptions["request"], now = new Date()) {
    const row = await db.query.roostProductMapOutbox.findFirst({
      where: and(
        eq(roostProductMapOutbox.companyId, companyId),
        eq(roostProductMapOutbox.status, "pending"),
        lte(roostProductMapOutbox.nextAttemptAt, now),
      ),
      orderBy: [asc(roostProductMapOutbox.observedAt), asc(roostProductMapOutbox.createdAt)],
    });
    if (!row) return { outcome: "empty" as const };
    try {
      await deliverRoostProductMapEnvelope(row.envelope as RoostProductMapEnvelope, { bindings, request });
      const [published] = await db.update(roostProductMapOutbox).set({ status: "published", publishedAt: now, lastErrorCode: null, updatedAt: now })
        .where(and(eq(roostProductMapOutbox.id, row.id), eq(roostProductMapOutbox.status, "pending"))).returning();
      return published ? { outcome: "published" as const, row: published } : { outcome: "contended" as const };
    } catch (error) {
      const attempts = row.attemptCount + 1;
      const status = attempts >= MAX_DURABLE_ATTEMPTS ? "dead" : "pending";
      const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)]!;
      const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "publisher_failed";
      await db.update(roostProductMapOutbox).set({
        attemptCount: attempts, status, lastErrorCode: errorCode,
        nextAttemptAt: new Date(now.getTime() + delay), updatedAt: now,
      }).where(eq(roostProductMapOutbox.id, row.id));
      return { outcome: status === "dead" ? "dead" as const : "retry_scheduled" as const, errorCode, attempts };
    }
  }

  async function freshness(companyId: string, now = new Date()) {
    const latest = await db.query.roostProductMapOutbox.findFirst({
      where: eq(roostProductMapOutbox.companyId, companyId),
      orderBy: [desc(roostProductMapOutbox.observedAt), desc(roostProductMapOutbox.createdAt)],
    });
    return latest ? { status: latest.status, lagMs: now.getTime() - latest.observedAt.getTime(), lastErrorCode: latest.lastErrorCode } : { status: "never", lagMs: null, lastErrorCode: null };
  }

  return { enqueueEnvelope, capture, drainOne, freshness };
}

export function envelopeForOutbox(packet: RoostBridgePortfolioProjection, publishedAt: string) {
  return createTransportEnvelope(packet, publishedAt);
}

export interface RoostProductMapOutboxRuntimeOptions {
  db: Db;
  companyId: string;
  bindings: RoostProductMapPublisherBindings;
  intervalMs?: number;
  onEvent?: (event: Record<string, unknown>) => void;
}

export function startRoostProductMapOutboxRuntime(options: RoostProductMapOutboxRuntimeOptions) {
  const service = roostProductMapOutboxService(options.db);
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      try {
        const captured = await service.capture({ bindings: options.bindings, companyId: options.companyId });
        options.onEvent?.({ phase: "capture", outcome: captured.outcome });
      } catch (error) {
        options.onEvent?.({ phase: "capture", outcome: "failed", errorCode: error instanceof Error ? error.message : "publisher_failed" });
      }
      const delivered = await service.drainOne(options.companyId, options.bindings);
      options.onEvent?.({ phase: "delivery", ...delivered, row: undefined });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), options.intervalMs ?? 5 * 60_000);
  timer.unref?.();
  void tick();
  return { stop: () => { stopped = true; clearInterval(timer); }, tick, freshness: () => service.freshness(options.companyId) };
}
