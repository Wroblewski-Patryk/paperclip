import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { softwarehouseIssueTemplateCatalogResponseSchema } from "@paperclipai/shared";
import { errorHandler } from "../middleware/index.js";
import { softwarehouseRoutes } from "../routes/softwarehouse.js";

function createApp(actor: Express.Request["actor"]) {
  const app = express();
  app.use((req, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use("/api", softwarehouseRoutes());
  app.use(errorHandler);
  return app;
}

describe("softwarehouse issue template catalog route", () => {
  it("returns the ordered issue-template catalog for an accessible company", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-1"],
      memberships: [{ companyId: "company-1", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(200);
    const body = softwarehouseIssueTemplateCatalogResponseSchema.parse(response.body);
    expect(body.templates.map((template) => template.kind)).toEqual([
      "task",
      "bug",
      "feature",
      "qa",
      "release",
      "work-report",
      "adr",
      "agent-role",
    ]);
    expect(body.templates).toHaveLength(8);
    for (const template of body.templates) {
      expect(template.key).toBeTruthy();
      expect(template.label).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.useCase).toBeTruthy();
      expect(template.path).toMatch(/^docs\/softwarehouse\/templates\/.+\.md$/);
      expect(template.body.trim()).toBeTruthy();
    }
    expect(body.templates.find((template) => template.kind === "agent-role")?.defaultDocumentKey).toBeNull();
    expect(body.templates.find((template) => template.kind === "task")?.defaultDocumentKey).toBe("plan");
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(createApp({ type: "none" }))
      .get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("rejects board users outside the requested company", async () => {
    const response = await request(createApp({
      type: "board",
      source: "session",
      userId: "user-1",
      companyIds: ["company-2"],
      memberships: [{ companyId: "company-2", membershipRole: "operator", status: "active" }],
    })).get("/api/companies/company-1/softwarehouse/issue-templates");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("User does not have access to this company");
  });
});
