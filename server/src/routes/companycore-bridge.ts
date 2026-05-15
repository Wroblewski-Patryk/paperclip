import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { patchCompanyCoreSettingsSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/index.js";
import { forbidden } from "../errors.js";
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

  return router;
}
