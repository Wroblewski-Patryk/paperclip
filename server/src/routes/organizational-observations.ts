import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createOrganizationalObservationSchema,
  listOrganizationalObservationsQuerySchema,
  updateOrganizationalObservationSchema,
} from "@paperclipai/shared";
import { forbidden } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { logActivity, organizationalObservationService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function organizationalObservationRoutes(db: Db) {
  const router = Router();
  const svc = organizationalObservationService(db);

  router.get("/companies/:companyId/organizational-observations", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.list(companyId, listOrganizationalObservationsQuerySchema.parse(req.query)));
  });

  router.get("/organizational-observations/:id", async (req, res) => {
    const observation = await svc.getById(req.params.id as string);
    if (!observation) { res.status(404).json({ error: "Organizational observation not found" }); return; }
    assertCompanyAccess(req, observation.companyId);
    res.json(observation);
  });

  router.post("/companies/:companyId/organizational-observations", validate(createOrganizationalObservationSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && req.body.agentId && req.body.agentId !== actor.agentId) {
      throw forbidden("Agents may only attribute an organizational observation to themselves");
    }
    const observation = await svc.create(companyId, req.body, {
      agentId: actor.agentId,
      userId: actor.actorType === "user" ? actor.actorId : null,
    });
    await logActivity(db, {
      companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: `organizational_observation.${observation.kind}.created`, entityType: "organizational_observation", entityId: observation.id,
      details: { kind: observation.kind, status: observation.status, sourceClass: observation.sourceClass, title: observation.title },
    });
    res.status(201).json(observation);
  });

  router.patch("/organizational-observations/:id", validate(updateOrganizationalObservationSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) { res.status(404).json({ error: "Organizational observation not found" }); return; }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent") {
      const ownsObservation = existing.createdByAgentId === actor.agentId || existing.agentId === actor.agentId;
      if (!ownsObservation) {
        throw forbidden("Agents may only update organizational observations they created or own");
      }
      if (req.body.agentId && req.body.agentId !== actor.agentId) {
        throw forbidden("Agents may only attribute an organizational observation to themselves");
      }
    }
    const observation = await svc.update(id, req.body);
    if (!observation) { res.status(404).json({ error: "Organizational observation not found" }); return; }
    await logActivity(db, {
      companyId: observation.companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId,
      action: `organizational_observation.${observation.kind}.updated`, entityType: "organizational_observation", entityId: observation.id,
      details: { changedFields: Object.keys(req.body), fromStatus: existing.status, toStatus: observation.status },
    });
    res.json(observation);
  });

  return router;
}
