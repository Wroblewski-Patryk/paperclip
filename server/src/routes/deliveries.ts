import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createDeliverySchema,
  listDeliveriesQuerySchema,
  transitionDeliverySchema,
  updateDeliveryStatusSchema,
  updateProductOutcomeSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { deliveryService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function deliveryRoutes(db: Db) {
  const router = Router();
  const svc = deliveryService(db);

  router.get("/companies/:companyId/deliveries", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.list(companyId, listDeliveriesQuerySchema.parse(req.query)));
  });

  router.get("/deliveries/:id", async (req, res) => {
    const delivery = await svc.getDetail(req.params.id as string);
    if (!delivery) { res.status(404).json({ error: "Delivery not found" }); return; }
    assertCompanyAccess(req, delivery.companyId);
    res.json(delivery);
  });

  router.post("/companies/:companyId/deliveries", validate(createDeliverySchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    const delivery = await svc.create(companyId, req.body);
    await logActivity(db, {
      companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: "delivery.created", entityType: "delivery", entityId: delivery.id,
      details: { projectId: delivery.projectId, stage: delivery.stage, taskCount: delivery.tasks.length },
    });
    res.status(201).json(delivery);
  });

  router.post("/deliveries/:id/transition", validate(transitionDeliverySchema), async (req, res) => {
    const existing = await svc.getById(req.params.id as string);
    if (!existing) { res.status(404).json({ error: "Delivery not found" }); return; }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const result = await svc.transition(existing.id, req.body, { actorType: actor.actorType, actorId: actor.actorId });
    await logActivity(db, {
      companyId: existing.companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: "delivery.transitioned", entityType: "delivery", entityId: existing.id,
      details: { fromStage: existing.stage, toStage: result.delivery.stage, idempotent: result.idempotent },
    });
    res.json(result);
  });

  router.patch("/deliveries/:id/status", validate(updateDeliveryStatusSchema), async (req, res) => {
    const existing = await svc.getById(req.params.id as string);
    if (!existing) { res.status(404).json({ error: "Delivery not found" }); return; }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const delivery = await svc.updateStatus(existing.id, req.body);
    await logActivity(db, {
      companyId: existing.companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: "delivery.status_updated", entityType: "delivery", entityId: existing.id,
      details: { blocker: delivery.blocker, needsDecision: delivery.needsDecision, localSha: delivery.localSha },
    });
    res.json(delivery);
  });

  router.post("/deliveries/:id/outcome", validate(updateProductOutcomeSchema), async (req, res) => {
    const existing = await svc.getById(req.params.id as string);
    if (!existing) { res.status(404).json({ error: "Delivery not found" }); return; }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const outcome = await svc.updateOutcome(existing.id, req.body, {
      agentId: actor.agentId,
      userId: actor.actorType === "user" ? actor.actorId : null,
    });
    await logActivity(db, {
      companyId: existing.companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: "delivery.outcome_updated", entityType: "delivery", entityId: existing.id,
      details: { outcomeId: outcome.id, status: outcome.status },
    });
    res.json(outcome);
  });

  return router;
}
