import { Router } from "express";
import { assertCompanyAccess } from "./authz.js";
import { companyCoreBridgeService } from "../services/companycore-bridge.js";

export function companyCoreBridgeRoutes() {
  const router = Router();
  const svc = companyCoreBridgeService();

  router.get("/companies/:companyId/knowledge/connection", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.connection());
  });

  router.get("/companies/:companyId/knowledge/overview", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const [connection, manifest] = await Promise.all([
      svc.connection(),
      svc.manifest(),
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

  router.get("/companies/:companyId/tools/companycore/health", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.connection());
  });

  router.get("/companies/:companyId/tools/companycore/manifest", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.manifest());
  });

  return router;
}
