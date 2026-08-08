import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { dashboardService } from "../services/dashboard.js";
import { companySituationService } from "../services/company-situation.js";
import { nextLegalActionService } from "../services/next-legal-action.js";
import { assertCompanyAccess } from "./authz.js";

export function dashboardRoutes(db: Db) {
  const router = Router();
  const svc = dashboardService(db);
  const situationSvc = companySituationService(db);
  const nextActionSvc = nextLegalActionService(db);

  router.get("/companies/:companyId/dashboard", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const summary = await svc.summary(companyId);
    res.json(summary);
  });

  router.get("/companies/:companyId/situation", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const situation = await situationSvc.get(companyId);
    res.json(situation);
  });

  router.get("/companies/:companyId/next-legal-actions", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await nextActionSvc.project(companyId));
  });

  return router;
}
