import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { patchCompanyCoreSettingsSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/index.js";
import { forbidden, unprocessable } from "../errors.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { companyCoreBridgeService } from "../services/companycore-bridge.js";

export function companyCoreBridgeRoutes(db: Db) {
  const router = Router();
  const svc = companyCoreBridgeService(db);

  router.get("/companies/:companyId/companycore/settings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    res.json(await svc.settings(companyId));
  });

  router.patch(
    "/companies/:companyId/companycore/settings",
    validate(patchCompanyCoreSettingsSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const settings = await svc.updateSettings(companyId, req.body);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "companycore.settings.updated",
        entityType: "companycore_settings",
        entityId: companyId,
        agentId: actor.agentId,
        runId: actor.runId,
        details: {
          baseUrl: settings.baseUrl,
          workspaceId: settings.workspace.id,
          knowledgeEnabled: settings.knowledge.enabled,
          knowledgeApiKeyConfigured: settings.knowledge.apiKeyConfigured,
          toolsEnabled: settings.tools.enabled,
          toolsApiKeyConfigured: settings.tools.apiKeyConfigured,
          toolsCommandMode: settings.tools.commandMode,
        },
      });
      res.json(settings);
    },
  );

  router.get("/companies/:companyId/knowledge/connection", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.connection(companyId, "knowledge"));
  });

  router.get("/companies/:companyId/knowledge/overview", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const [connection, manifest] = await Promise.all([
      svc.connection(companyId, "knowledge"),
      svc.manifest(companyId),
    ]);
    res.json({
      provider: "companycore",
      connection,
      toolCount: manifest.tools.length,
      approvalToolCount: manifest.tools.filter((tool) => tool.requiresApproval).length,
      readToolCount: manifest.tools.filter((tool) => tool.riskLevel === "read").length,
      writeToolCount: manifest.tools.filter((tool) => tool.riskLevel === "write").length,
      destructiveToolCount: manifest.tools.filter((tool) => tool.riskLevel === "destructive").length,
    });
  });

  router.get("/companies/:companyId/knowledge/map", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.knowledgeMap(companyId));
  });

  router.get("/agents/me/knowledge", async (req, res) => {
    if (req.actor.type !== "agent" || !req.actor.companyId || !req.actor.agentId) {
      throw forbidden("Agent access required");
    }
    res.json(await svc.agentKnowledge(req.actor.companyId, req.actor.agentId));
  });

  router.get("/agents/me/tools", async (req, res) => {
    if (req.actor.type !== "agent" || !req.actor.companyId || !req.actor.agentId) {
      throw forbidden("Agent access required");
    }
    const context = await svc.agentTools(req.actor.companyId, req.actor.agentId);
    res.json({
      ...context,
      tools: context.tools.filter((tool) => tool.assigned),
    });
  });

  router.get("/companies/:companyId/tools/companycore/health", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.connection(companyId, "tools"));
  });

  router.get("/companies/:companyId/tools/companycore/manifest", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.manifest(companyId));
  });

  router.get("/companies/:companyId/tools/companycore/assignments", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.toolAssignments(companyId));
  });

  router.post("/companies/:companyId/tools/companycore/recommendations/apply", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const actor = getActorInfo(req);
    const summary = await svc.applyRecommendedTools(companyId);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "companycore.tools.recommendations_applied",
      entityType: "companycore_tools",
      entityId: companyId,
      agentId: actor.agentId,
      runId: actor.runId,
      details: {
        agentCount: summary.agentCount,
        assignedToolCount: summary.assignedToolCount,
      },
    });
    res.json(summary);
  });

  router.get("/agents/:id/tools/companycore", async (req, res) => {
    const agentId = req.params.id as string;
    const companyId = typeof req.query.companyId === "string" ? req.query.companyId : null;
    if (!companyId) throw unprocessable("companyId is required.");
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    res.json(await svc.agentTools(companyId, agentId));
  });

  router.post("/agents/:id/tools/companycore/sync", async (req, res) => {
    const agentId = req.params.id as string;
    const companyId = typeof req.query.companyId === "string" ? req.query.companyId : null;
    if (!companyId) throw unprocessable("companyId is required.");
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const desiredTools = Array.isArray(req.body?.desiredTools)
      ? req.body.desiredTools.filter((value: unknown): value is string => typeof value === "string")
      : null;
    if (!desiredTools) throw unprocessable("desiredTools must be an array of tool names.");
    const actor = getActorInfo(req);
    const context = await svc.syncAgentTools(companyId, agentId, desiredTools);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "agent.companycore_tools_synced",
      entityType: "agent",
      entityId: agentId,
      agentId: actor.agentId,
      runId: actor.runId,
      details: {
        desiredTools: context.desiredTools,
        assignedToolCount: context.desiredTools.length,
        recommendedToolCount: context.recommendedTools.length,
      },
    });
    res.json(context);
  });

  return router;
}
