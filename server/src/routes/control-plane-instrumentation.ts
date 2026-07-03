import type { Request } from "express";
import { logger } from "../middleware/logger.js";
import { getActorInfo } from "./authz.js";

const CONTROL_PLANE_SLOW_ROUTE_MS = Number(process.env.PAPERCLIP_CONTROL_PLANE_SLOW_ROUTE_MS ?? 1500);
const CONTROL_PLANE_SLOW_SEGMENT_MS = Number(process.env.PAPERCLIP_CONTROL_PLANE_SLOW_SEGMENT_MS ?? 750);

function controlPlaneActorContext(req: Request) {
  const actor = getActorInfo(req);
  return {
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorAgentId: actor.agentId,
    actorRunId: actor.runId,
  };
}

export function logSlowControlPlaneRoute(input: {
  req: Request;
  routePath: string;
  companyId: string | null;
  startedAtMs: number;
  context?: Record<string, unknown>;
}) {
  const durationMs = Date.now() - input.startedAtMs;
  if (durationMs < CONTROL_PLANE_SLOW_ROUTE_MS) return;
  logger.warn({
    routePath: input.routePath,
    companyId: input.companyId,
    durationMs,
    thresholdMs: CONTROL_PLANE_SLOW_ROUTE_MS,
    ...controlPlaneActorContext(input.req),
    ...(input.context ?? {}),
  }, "slow control-plane route");
}

export async function measureControlPlaneSegment<T>(input: {
  req: Request;
  routePath: string;
  segment: string;
  companyId: string | null;
  context?: Record<string, unknown>;
  fn: () => Promise<T>;
}): Promise<T> {
  const startedAtMs = Date.now();
  try {
    return await input.fn();
  } finally {
    const durationMs = Date.now() - startedAtMs;
    if (durationMs >= CONTROL_PLANE_SLOW_SEGMENT_MS) {
      logger.warn({
        routePath: input.routePath,
        segment: input.segment,
        companyId: input.companyId,
        durationMs,
        thresholdMs: CONTROL_PLANE_SLOW_SEGMENT_MS,
        ...controlPlaneActorContext(input.req),
        ...(input.context ?? {}),
      }, "slow control-plane route segment");
    }
  }
}
