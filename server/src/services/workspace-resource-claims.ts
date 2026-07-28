import { and, eq, lte } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { workspaceResourceClaims } from "@paperclipai/db";

const DEFAULT_LEASE_MS = 30 * 60 * 1000;

export type WorkspaceResourceClaimDeclaration = { resourceKey: string; leaseMs?: number };

/** Claims live under adapter `workspaceRuntime.resourceClaims` and never reach the adapter. */
export function parseWorkspaceResourceClaimDeclarations(value: unknown): WorkspaceResourceClaimDeclaration[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = (value as Record<string, unknown>).resourceClaims;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error("workspaceRuntime.resourceClaims must be an array.");
  const seen = new Set<string>();
  return raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`workspaceRuntime.resourceClaims[${index}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    if (typeof record.resourceKey !== "string") {
      throw new Error(`workspaceRuntime.resourceClaims[${index}].resourceKey must be a string.`);
    }
    const resourceKey = normalizeWorkspaceResourceKey(record.resourceKey);
    if (seen.has(resourceKey)) throw new Error(`Duplicate workspace resource claim: ${resourceKey}.`);
    seen.add(resourceKey);
    if (record.leaseMs !== undefined && (!Number.isSafeInteger(record.leaseMs) || record.leaseMs < 1_000)) {
      throw new Error(`workspaceRuntime.resourceClaims[${index}].leaseMs must be an integer of at least 1000.`);
    }
    return { resourceKey, ...(record.leaseMs === undefined ? {} : { leaseMs: record.leaseMs as number }) };
  });
}

export function normalizeWorkspaceResourceKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ":").replace(/^:|:$/g, "");
  if (!normalized) throw new Error("Workspace resource key must contain letters or digits.");
  return normalized;
}

export type WorkspaceResourceClaimResult =
  | { acquired: true; claim: typeof workspaceResourceClaims.$inferSelect }
  | { acquired: false; holder: typeof workspaceResourceClaims.$inferSelect };

/**
 * Durable mutexes for resources that cannot safely be shared by verification
 * runs. The partial unique index makes acquisition atomic across processes.
 */
export function workspaceResourceClaimService(db: Db) {
  async function expireStale(now: Date) {
    await db.update(workspaceResourceClaims).set({
      status: "expired",
      releasedAt: now,
      releaseReason: "lease_expired",
      updatedAt: now,
    }).where(and(eq(workspaceResourceClaims.status, "active"), lte(workspaceResourceClaims.expiresAt, now)));
  }

  return {
    async acquire(input: {
      companyId: string;
      executionWorkspaceId: string;
      heartbeatRunId: string;
      issueId?: string | null;
      resourceKey: string;
      leaseMs?: number;
      now?: Date;
    }): Promise<WorkspaceResourceClaimResult> {
      const now = input.now ?? new Date();
      const resourceKey = normalizeWorkspaceResourceKey(input.resourceKey);
      const leaseMs = input.leaseMs ?? DEFAULT_LEASE_MS;
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000) throw new Error("Claim lease must be at least one second.");
      await expireStale(now);
      const [claim] = await db.insert(workspaceResourceClaims).values({
        companyId: input.companyId,
        executionWorkspaceId: input.executionWorkspaceId,
        heartbeatRunId: input.heartbeatRunId,
        issueId: input.issueId ?? null,
        resourceKey,
        status: "active",
        acquiredAt: now,
        expiresAt: new Date(now.getTime() + leaseMs),
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing().returning();
      if (claim) return { acquired: true, claim };

      const [holder] = await db.select().from(workspaceResourceClaims).where(and(
        eq(workspaceResourceClaims.companyId, input.companyId),
        eq(workspaceResourceClaims.executionWorkspaceId, input.executionWorkspaceId),
        eq(workspaceResourceClaims.resourceKey, resourceKey),
        eq(workspaceResourceClaims.status, "active"),
      ));
      if (!holder) throw new Error("Resource claim acquisition conflicted without an active holder; retry safely.");
      return { acquired: false, holder };
    },

    async releaseForRun(heartbeatRunId: string, reason = "run_finished") {
      const now = new Date();
      return await db.update(workspaceResourceClaims).set({
        status: "released", releasedAt: now, releaseReason: reason, updatedAt: now,
      }).where(and(eq(workspaceResourceClaims.heartbeatRunId, heartbeatRunId), eq(workspaceResourceClaims.status, "active"))).returning();
    },

    expireStale,
  };
}
