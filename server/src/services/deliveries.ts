import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  deliveryTasks,
  deliveryTransitions,
  issues,
  productDeliveries,
  productOutcomes,
  projects,
} from "@paperclipai/db";
import type {
  CreateDelivery,
  DeliveryStage,
  ListDeliveriesQuery,
  ProductOutcomeStatus,
  TransitionDelivery,
  UpdateProductOutcome,
} from "@paperclipai/shared";
import { badRequest, conflict, notFound, unprocessable } from "../errors.js";
import { admissionControlService } from "./admission-control.js";

const transitions: Record<DeliveryStage, readonly DeliveryStage[]> = {
  proposed: ["admitted"],
  admitted: ["implementing"],
  implementing: ["evidence_complete"],
  evidence_complete: ["review_rejected", "review_accepted"],
  review_rejected: ["implementing"],
  review_accepted: ["integrated"],
  integrated: ["push_ready"],
  push_ready: ["deployed"],
  deployed: ["observed_healthy", "rolled_back"],
  observed_healthy: ["outcome_accepted", "rolled_back"],
  rolled_back: ["implementing"],
  outcome_accepted: [],
};

const outcomeTransitions: Record<ProductOutcomeStatus, readonly ProductOutcomeStatus[]> = {
  unachieved: ["observing", "achieved", "rejected", "rolled_back"],
  observing: ["achieved", "unachieved", "rejected", "rolled_back"],
  achieved: ["accepted", "rejected", "observing", "rolled_back"],
  accepted: ["rolled_back"],
  rejected: ["observing", "unachieved"],
  rolled_back: ["unachieved"],
};

function requireEvidence(toStage: DeliveryStage, evidence: Array<Record<string, unknown>>) {
  if (["evidence_complete", "review_rejected", "review_accepted", "deployed", "observed_healthy", "rolled_back", "outcome_accepted"].includes(toStage) && evidence.length === 0) {
    throw unprocessable(`Delivery transition to '${toStage}' requires inspectable evidence`);
  }
}

export function deliveryService(db: Db) {
  const admission = admissionControlService(db);

  const getById = (id: string) => db.select().from(productDeliveries)
    .where(eq(productDeliveries.id, id)).then((rows) => rows[0] ?? null);

  async function getDetail(id: string) {
    const delivery = await getById(id);
    if (!delivery) return null;
    const [outcome, tasks, history] = await Promise.all([
      db.select().from(productOutcomes).where(eq(productOutcomes.deliveryId, id)).then((rows) => rows[0] ?? null),
      db.select().from(deliveryTasks).where(eq(deliveryTasks.deliveryId, id)),
      db.select().from(deliveryTransitions).where(eq(deliveryTransitions.deliveryId, id)).orderBy(desc(deliveryTransitions.createdAt)),
    ]);
    return { ...delivery, outcome, tasks, transitions: history };
  }

  async function assertCompanyRefs(companyId: string, data: Pick<CreateDelivery, "projectId" | "ownerAgentId" | "taskIssueIds">) {
    const project = await db.select({ companyId: projects.companyId }).from(projects)
      .where(eq(projects.id, data.projectId)).then((rows) => rows[0] ?? null);
    if (!project || project.companyId !== companyId) throw badRequest("projectId belongs to another company or does not exist");
    if (data.ownerAgentId) {
      const owner = await db.select({ companyId: agents.companyId }).from(agents)
        .where(eq(agents.id, data.ownerAgentId)).then((rows) => rows[0] ?? null);
      if (!owner || owner.companyId !== companyId) throw badRequest("ownerAgentId belongs to another company or does not exist");
    }
    if (data.taskIssueIds.length > 0) {
      const taskRows = await Promise.all(data.taskIssueIds.map((issueId) => db.select({ companyId: issues.companyId, projectId: issues.projectId })
        .from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null)));
      if (taskRows.some((row) => !row || row.companyId !== companyId || row.projectId !== data.projectId)) {
        throw badRequest("Every delivery task must exist in the same company and project");
      }
    }
  }

  return {
    getById,
    getDetail,

    list(companyId: string, query: ListDeliveriesQuery) {
      const conditions = [eq(productDeliveries.companyId, companyId)];
      if (query.projectId) conditions.push(eq(productDeliveries.projectId, query.projectId));
      if (query.stage) conditions.push(eq(productDeliveries.stage, query.stage));
      return db.select().from(productDeliveries).where(and(...conditions))
        .orderBy(desc(productDeliveries.updatedAt)).limit(query.limit);
    },

    async create(companyId: string, data: CreateDelivery) {
      await assertCompanyRefs(companyId, data);
      return db.transaction(async (tx) => {
        const delivery = await tx.insert(productDeliveries).values({
          companyId,
          projectId: data.projectId,
          title: data.title,
          problemStatement: data.problemStatement,
          decisionContract: data.decisionContract,
          ownerAgentId: data.ownerAgentId ?? null,
        }).returning().then((rows) => rows[0]);
        const outcome = await tx.insert(productOutcomes).values({
          companyId,
          deliveryId: delivery.id,
          statement: data.outcomeStatement,
          acceptanceCriteria: data.acceptanceCriteria,
        }).returning().then((rows) => rows[0]);
        if (data.taskIssueIds.length > 0) await tx.insert(deliveryTasks).values(
          data.taskIssueIds.map((issueId) => ({ companyId, deliveryId: delivery.id, issueId })),
        );
        return { ...delivery, outcome, tasks: data.taskIssueIds };
      });
    },

    async transition(id: string, data: TransitionDelivery, actor: { actorType: string; actorId?: string | null }) {
      const existing = await getById(id);
      if (!existing) throw notFound("Delivery not found");
      const currentStage = existing.stage as DeliveryStage;
      if (!transitions[currentStage].includes(data.toStage)) {
        throw conflict(`Illegal delivery transition: ${currentStage} -> ${data.toStage}`);
      }
      requireEvidence(data.toStage, data.evidence);
      if (data.toStage === "admitted") {
        const decision = await admission.evaluateWork({
          companyId: existing.companyId,
          projectId: existing.projectId,
          agentId: existing.ownerAgentId,
          source: "delivery.transition",
          fingerprint: `delivery:${existing.id}`,
          evidenceHash: data.idempotencyKey,
        });
        if (!decision.admitted) throw conflict("Delivery was not admitted", { disposition: decision.disposition, reasonCode: decision.reasonCode });
      }
      const outcome = await db.select().from(productOutcomes).where(eq(productOutcomes.deliveryId, id))
        .then((rows) => rows[0] ?? null);
      if (data.toStage === "integrated" && !(data.integrationSha ?? existing.integrationSha)) {
        throw unprocessable("Integrated delivery requires integrationSha");
      }
      if (data.toStage === "push_ready" && !(data.originSha ?? existing.originSha)) {
        throw unprocessable("Push-ready delivery requires originSha");
      }
      if (data.toStage === "deployed" && (!(data.deployedSha ?? existing.deployedSha) || !(data.deploymentUrl ?? existing.deploymentUrl))) {
        throw unprocessable("Deployed delivery requires deployedSha and deploymentUrl");
      }
      if (data.toStage === "outcome_accepted" && outcome?.status !== "accepted") {
        throw unprocessable("Delivery cannot reach outcome_accepted until its outcome is accepted independently");
      }
      return db.transaction(async (tx) => {
        const prior = await tx.select().from(deliveryTransitions).where(and(
          eq(deliveryTransitions.deliveryId, id),
          eq(deliveryTransitions.idempotencyKey, data.idempotencyKey),
        )).then((rows) => rows[0] ?? null);
        if (prior) return { delivery: existing, transition: prior, idempotent: true };
        const now = new Date();
        const delivery = await tx.update(productDeliveries).set({
          stage: data.toStage,
          localSha: data.localSha === undefined ? existing.localSha : data.localSha,
          originSha: data.originSha === undefined ? existing.originSha : data.originSha,
          integrationSha: data.integrationSha === undefined ? existing.integrationSha : data.integrationSha,
          deployedSha: data.deployedSha === undefined ? existing.deployedSha : data.deployedSha,
          deploymentUrl: data.deploymentUrl === undefined ? existing.deploymentUrl : data.deploymentUrl,
          blocker: data.blocker === undefined ? existing.blocker : data.blocker,
          needsDecision: data.needsDecision ?? existing.needsDecision,
          evidence: [...(existing.evidence ?? []), ...data.evidence],
          observedAt: data.toStage === "observed_healthy" ? now : existing.observedAt,
          updatedAt: now,
        }).where(and(eq(productDeliveries.id, id), eq(productDeliveries.stage, currentStage)))
          .returning().then((rows) => rows[0] ?? null);
        if (!delivery) throw conflict("Delivery changed concurrently");
        const transition = await tx.insert(deliveryTransitions).values({
          companyId: existing.companyId,
          deliveryId: id,
          fromStage: currentStage,
          toStage: data.toStage,
          idempotencyKey: data.idempotencyKey,
          actorType: actor.actorType,
          actorId: actor.actorId ?? null,
          evidence: data.evidence,
          details: { localSha: data.localSha, originSha: data.originSha, integrationSha: data.integrationSha, deployedSha: data.deployedSha, deploymentUrl: data.deploymentUrl },
        }).returning().then((rows) => rows[0]);
        if (data.toStage === "rolled_back" && outcome) await tx.update(productOutcomes)
          .set({ status: "rolled_back", evidence: [...(outcome.evidence ?? []), ...data.evidence], updatedAt: now })
          .where(eq(productOutcomes.id, outcome.id));
        return { delivery, transition, idempotent: false };
      });
    },

    async updateOutcome(deliveryId: string, data: UpdateProductOutcome, actor: { agentId?: string | null; userId?: string | null }) {
      const delivery = await getById(deliveryId);
      if (!delivery) throw notFound("Delivery not found");
      const outcome = await db.select().from(productOutcomes).where(eq(productOutcomes.deliveryId, deliveryId))
        .then((rows) => rows[0] ?? null);
      if (!outcome) throw notFound("Product outcome not found");
      const from = outcome.status as ProductOutcomeStatus;
      if (!outcomeTransitions[from].includes(data.status)) throw conflict(`Illegal outcome transition: ${from} -> ${data.status}`);
      if (["achieved", "accepted", "rejected", "rolled_back"].includes(data.status) && data.evidence.length === 0) {
        throw unprocessable(`Outcome transition to '${data.status}' requires inspectable evidence`);
      }
      if (data.status === "accepted" && delivery.stage !== "observed_healthy") {
        throw unprocessable("Outcome acceptance requires an observed_healthy delivery");
      }
      return db.update(productOutcomes).set({
        status: data.status,
        evidence: [...(outcome.evidence ?? []), ...data.evidence],
        acceptedByAgentId: data.status === "accepted" ? actor.agentId ?? null : outcome.acceptedByAgentId,
        acceptedByUserId: data.status === "accepted" ? actor.userId ?? null : outcome.acceptedByUserId,
        acceptedAt: data.status === "accepted" ? new Date() : outcome.acceptedAt,
        updatedAt: new Date(),
      }).where(eq(productOutcomes.id, outcome.id)).returning().then((rows) => rows[0]);
    },
  };
}
