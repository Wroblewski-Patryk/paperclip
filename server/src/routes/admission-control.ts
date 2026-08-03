import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { badRequest } from "../errors.js";
import {
  ADMISSION_CONTROL_STATES,
  admissionControlService,
  heartbeatService,
  logActivity,
  type AdmissionControlState,
} from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

function isState(value: unknown): value is AdmissionControlState {
  return typeof value === "string" && ADMISSION_CONTROL_STATES.includes(value as AdmissionControlState);
}

export function admissionControlRoutes(db: Db, deps?: Parameters<typeof heartbeatService>[1]) {
  const router = Router();
  const svc = admissionControlService(db);
  const heartbeat = heartbeatService(db, deps);

  router.get("/companies/:companyId/admission-controls", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    res.json(await svc.list(companyId));
  });

  router.post("/companies/:companyId/admission-controls/transition", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const body = req.body as Record<string, unknown>;
    if (!isState(body.toState)) throw badRequest("Invalid admission control state");
    if (typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
      throw badRequest("idempotencyKey is required");
    }
    const scopeType = body.scopeType === undefined ? "company" : body.scopeType;
    if (scopeType !== "company" && scopeType !== "project") throw badRequest("Invalid scopeType");
    if (scopeType === "project" && (typeof body.scopeId !== "string" || !body.scopeId)) {
      throw badRequest("scopeId is required for a project admission control");
    }
    if (body.evidence !== undefined && !Array.isArray(body.evidence)) {
      throw badRequest("evidence must be an array");
    }
    const actor = getActorInfo(req);
    const result = await svc.transition({
      companyId,
      scopeType,
      scopeId: typeof body.scopeId === "string" ? body.scopeId : undefined,
      toState: body.toState,
      idempotencyKey: body.idempotencyKey,
      actorType: actor.actorType,
      actorId: actor.actorId,
      reason: typeof body.reason === "string" ? body.reason : null,
      evidence: body.evidence as Array<Record<string, unknown>> | undefined,
    });
    const replay = body.toState === "open" && !result.idempotent
      ? await heartbeat.replayDeferredAdmissionWakeups(companyId)
      : null;
    const recordedControl = replay
      ? await svc.recordReopenReplay({
          companyId,
          controlId: result.control.id,
          controlVersion: result.control.version,
          reopenAttemptId: result.transition.id,
          replay,
        })
      : result.control;
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "admission_control.transitioned",
      entityType: "admission_control",
      entityId: result.control.id,
      details: {
        state: result.control.state,
        version: result.control.version,
        idempotent: result.idempotent,
        scopeType,
        scopeId: result.control.scopeId,
        replay,
      },
    });
    res.json({ ...result, control: recordedControl, replay });
  });

  return router;
}
