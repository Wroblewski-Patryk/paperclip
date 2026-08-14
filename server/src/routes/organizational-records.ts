import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createOrganizationalRecordSchema,
  listOrganizationalRecordsQuerySchema,
  updateOrganizationalRecordSchema,
} from "@paperclipai/shared";
import { forbidden } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { logActivity, organizationalRecordService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function organizationalRecordRoutes(db: Db) {
  const router = Router();
  const svc = organizationalRecordService(db);

  router.get("/companies/:companyId/organizational-records", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const query = listOrganizationalRecordsQuerySchema.parse(req.query);
    res.json(await svc.list(companyId, query));
  });

  router.get("/organizational-records/:id", async (req, res) => {
    const record = await svc.getById(req.params.id as string);
    if (!record) {
      res.status(404).json({ error: "Organizational record not found" });
      return;
    }
    assertCompanyAccess(req, record.companyId);
    res.json(record);
  });

  router.post(
    "/companies/:companyId/organizational-records",
    validate(createOrganizationalRecordSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      if (actor.actorType === "agent" && req.body.ownerUserId) {
        throw forbidden("Agents may not assign organizational records to board users");
      }
      if (actor.actorType === "agent" && req.body.ownerAgentId && req.body.ownerAgentId !== actor.agentId) {
        throw forbidden("Agents may only create organizational records owned by themselves");
      }
      const record = await svc.create(
        companyId,
        {
          ...req.body,
          ownerAgentId: req.body.ownerAgentId ?? (actor.actorType === "agent" ? actor.agentId : null),
          ownerUserId: req.body.ownerUserId ?? (actor.actorType === "user" ? actor.actorId : null),
        },
        {
          agentId: actor.agentId,
          userId: actor.actorType === "user" ? actor.actorId : null,
        },
      );
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: `organizational_record.${record.kind}.created`,
        entityType: "organizational_record",
        entityId: record.id,
        details: { kind: record.kind, status: record.status, title: record.title, supersedesId: record.supersedesId },
      });
      res.status(201).json(record);
    },
  );

  router.patch(
    "/organizational-records/:id",
    validate(updateOrganizationalRecordSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const existing = await svc.getById(id);
      if (!existing) {
        res.status(404).json({ error: "Organizational record not found" });
        return;
      }
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      if (actor.actorType === "agent") {
        const ownsRecord = existing.ownerAgentId === actor.agentId || existing.createdByAgentId === actor.agentId;
        if (!ownsRecord) throw forbidden("Agents may only update organizational records they own or created");
        if (req.body.ownerUserId !== undefined) {
          throw forbidden("Agents may not transfer organizational records to board users");
        }
        if (req.body.ownerAgentId && req.body.ownerAgentId !== actor.agentId) {
          throw forbidden("Agents may not transfer organizational record ownership");
        }
      }
      const record = await svc.update(id, req.body);
      if (!record) {
        res.status(404).json({ error: "Organizational record not found" });
        return;
      }
      await logActivity(db, {
        companyId: record.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: `organizational_record.${record.kind}.updated`,
        entityType: "organizational_record",
        entityId: record.id,
        details: { changedFields: Object.keys(req.body), fromStatus: existing.status, toStatus: record.status },
      });
      res.json(record);
    },
  );

  return router;
}
