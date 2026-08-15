import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import type { DecisionCenterResponse } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { redactEventPayload } from "../redaction.js";
import { decisionCenterService } from "../services/decision-center.js";
import { logActivity } from "../services/activity-log.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

const sourceTypeSchema = z.enum(["interaction", "approval"]);
const deferDecisionSchema = z.object({
  deferredUntil: z.string().datetime({ offset: true }),
  note: z.string().trim().max(2000).nullable().optional(),
});

function redactDecisionResponse(response: DecisionCenterResponse): DecisionCenterResponse {
  return {
    ...response,
    items: response.items.map((item) => item.approval
      ? {
          ...item,
          approval: {
            ...item.approval,
            payload: redactEventPayload(item.approval.payload) ?? {},
          },
        }
      : item),
  };
}

export function decisionCenterRoutes(db: Db) {
  const router = Router();
  const service = decisionCenterService(db);

  router.get("/companies/:companyId/decisions", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const response = await service.list(companyId);
    res.json(redactDecisionResponse(response));
  });

  router.put(
    "/companies/:companyId/decisions/:sourceType/:sourceId/defer",
    validate(deferDecisionSchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const sourceType = sourceTypeSchema.parse(req.params.sourceType);
      const sourceId = z.string().uuid().parse(req.params.sourceId);
      const preference = await service.defer({
        companyId,
        sourceType,
        sourceId,
        deferredUntil: new Date(req.body.deferredUntil),
        note: req.body.note ?? null,
        userId: req.actor.userId ?? null,
      });
      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "decision.deferred",
        entityType: sourceType,
        entityId: sourceId,
        details: { deferredUntil: preference.deferredUntil, note: preference.note },
      });
      res.json(preference);
    },
  );

  router.delete(
    "/companies/:companyId/decisions/:sourceType/:sourceId/defer",
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const sourceType = sourceTypeSchema.parse(req.params.sourceType);
      const sourceId = z.string().uuid().parse(req.params.sourceId);
      const result = await service.clearDefer(companyId, sourceType, sourceId);
      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "decision.defer_cleared",
        entityType: sourceType,
        entityId: sourceId,
        details: {},
      });
      res.json(result);
    },
  );

  return router;
}
