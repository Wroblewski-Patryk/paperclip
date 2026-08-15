import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import type { DecisionCenterResponse } from "@paperclipai/shared";
import { issueThreadDecisionContextSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { redactEventPayload } from "../redaction.js";
import { decisionCenterService } from "../services/decision-center.js";
import { logActivity } from "../services/activity-log.js";
import { agentService } from "../services/agents.js";
import { forbidden } from "../errors.js";
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
  const agents = agentService(db);

  async function assertDecisionSteward(req: Parameters<typeof assertBoard>[0]) {
    if (req.actor.type === "board") return;
    if (req.actor.type !== "agent" || !req.actor.agentId) throw forbidden("Decision steward access required");
    const agent = await agents.getById(req.actor.agentId);
    if (!agent || (agent.role !== "ai-assistant" && !/^00 AIA\b/i.test(agent.name))) {
      throw forbidden("Only the AIA decision steward may prepare owner decisions");
    }
  }

  router.get("/companies/:companyId/decisions", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    await assertDecisionSteward(req);
    const response = await service.list(companyId);
    res.json(redactDecisionResponse(response));
  });

  router.post(
    "/companies/:companyId/decisions/interaction/:sourceId/prepare",
    validate(z.object({ decisionContext: issueThreadDecisionContextSchema })),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await assertDecisionSteward(req);
      if (req.actor.type !== "agent" || !req.actor.agentId) {
        throw forbidden("AIA agent authentication is required to prepare a decision");
      }
      const sourceId = z.string().uuid().parse(req.params.sourceId);
      const interaction = await service.prepareInteraction({
        companyId,
        sourceId,
        decisionContext: req.body.decisionContext,
        agentId: req.actor.agentId,
      });
      await logActivity(db, {
        companyId,
        actorType: "agent",
        actorId: req.actor.agentId,
        agentId: req.actor.agentId,
        runId: req.actor.runId ?? null,
        action: "decision.owner_briefing_prepared",
        entityType: "interaction",
        entityId: sourceId,
        details: { issueId: interaction.issueId },
      });
      res.json(interaction);
    },
  );

  router.post(
    "/companies/:companyId/decisions/interaction/:sourceId/reroute",
    validate(z.object({ reason: z.string().trim().min(1).max(2000) })),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await assertDecisionSteward(req);
      if (req.actor.type !== "agent" || !req.actor.agentId) {
        throw forbidden("AIA agent authentication is required to reroute a decision");
      }
      const sourceId = z.string().uuid().parse(req.params.sourceId);
      const interaction = await service.rerouteInteraction({
        companyId,
        sourceId,
        reason: req.body.reason,
        agentId: req.actor.agentId,
      });
      await logActivity(db, {
        companyId,
        actorType: "agent",
        actorId: req.actor.agentId,
        agentId: req.actor.agentId,
        runId: req.actor.runId ?? null,
        action: "decision.rerouted_to_internal_owner",
        entityType: "interaction",
        entityId: sourceId,
        details: { issueId: interaction.issueId, reason: req.body.reason },
      });
      res.json(interaction);
    },
  );

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
