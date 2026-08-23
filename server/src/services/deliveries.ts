import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  costEvents,
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
  UpdateDeliveryStatus,
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
  review_accepted: ["integrated", "outcome_rejected"],
  integrated: ["push_ready"],
  push_ready: ["deployed"],
  deployed: ["observed_healthy", "rolled_back"],
  observed_healthy: ["outcome_accepted", "rolled_back"],
  rolled_back: ["implementing"],
  outcome_accepted: ["observed_healthy"],
  outcome_rejected: [],
};

const outcomeTransitions: Record<ProductOutcomeStatus, readonly ProductOutcomeStatus[]> = {
  unachieved: ["observing", "achieved", "partial", "rejected", "rolled_back", "unknown"],
  observing: ["achieved", "unachieved", "partial", "rejected", "rolled_back", "unknown"],
  achieved: ["accepted", "accepted_with_risk", "partial", "rejected", "observing", "rolled_back", "unknown"],
  accepted: ["observing", "unknown", "rolled_back"],
  accepted_with_risk: ["observing", "rolled_back"],
  partial: ["observing", "achieved", "rejected", "rolled_back", "unknown"],
  rejected: ["observing", "unachieved", "unknown"],
  rolled_back: ["unachieved"],
  unknown: ["observing", "unachieved", "achieved", "rejected"],
};

function requireEvidence(toStage: DeliveryStage, evidence: Array<Record<string, unknown>>) {
  if (["evidence_complete", "review_rejected", "review_accepted", "deployed", "observed_healthy", "rolled_back", "outcome_accepted", "outcome_rejected"].includes(toStage) && evidence.length === 0) {
    throw unprocessable(`Delivery transition to '${toStage}' requires inspectable evidence`);
  }
}

export function validateAutonomousDeliveryIntentContract(decisionContract: Record<string, unknown>) {
  if (decisionContract.source !== "paperclip_autonomous_cycle") return null;
  const intent = decisionContract.intentContract;
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) return "Autonomous ProductDelivery requires decisionContract.intentContract";
  const value = intent as Record<string, unknown>;
  const trace = value.trace;
  if (value.schemaVersion !== 1 || value.marker !== "softwarehouse-product-intent-trace:v1") {
    return "Autonomous ProductDelivery requires softwarehouse-product-intent-trace:v1";
  }
  if (value.manifestPath !== "docs/documentation-contract.json") return "Autonomous ProductDelivery requires the project documentation authority manifest";
  if (!Array.isArray(value.productAuthority) || value.productAuthority.length === 0 || value.productAuthority.some((item) => typeof item !== "string" || !item.trim())) {
    return "Autonomous ProductDelivery requires declared product authority";
  }
  if (!Array.isArray(value.architectureAuthority) || value.architectureAuthority.length === 0 || value.architectureAuthority.some((item) => typeof item !== "string" || !item.trim())) {
    return "Autonomous ProductDelivery requires declared architecture authority";
  }
  if (!Array.isArray(value.productSources) || value.productSources.length === 0 || value.productSources.some((item) => typeof item !== "string" || !item.trim())) {
    return "Autonomous ProductDelivery requires canonical product sources";
  }
  if (!Array.isArray(value.architectureSources) || value.architectureSources.length === 0 || value.architectureSources.some((item) => typeof item !== "string" || !item.trim())) {
    return "Autonomous ProductDelivery requires canonical architecture sources";
  }
  if (typeof value.observedStateSource !== "string" || !value.observedStateSource.trim()) return "Autonomous ProductDelivery requires an observed-state source";
  if (!trace || typeof trace !== "object" || Array.isArray(trace)) return "Autonomous ProductDelivery requires an issue-specific intent trace";
  const fields = trace as Record<string, unknown>;
  for (const field of ["ownerIntent", "productContract", "architectureContract", "observedGap", "assumptionDisposition", "expectedOutcome", "acceptanceEvidence"]) {
    if (typeof fields[field] !== "string" || !String(fields[field]).trim()) return `Autonomous ProductDelivery intent trace is missing ${field}`;
  }
  for (const field of ["observedGap", "expectedOutcome", "acceptanceEvidence"]) {
    if (String(fields[field]).trim().length < 20) return `Autonomous ProductDelivery intent trace ${field} is not substantive`;
  }
  const belongsTo = (candidate: string, authority: unknown[]) => {
    const normalized = candidate.split("#", 1)[0].replaceAll("\\", "/").replace(/^\.\//, "");
    return authority.some((entry) => {
      const prefix = String(entry).replaceAll("\\", "/").replace(/^\.\//, "");
      return prefix.endsWith("/") ? normalized.startsWith(prefix) : normalized === prefix;
    });
  };
  if (!belongsTo(String(fields.ownerIntent), value.productAuthority)) return "Autonomous ProductDelivery owner intent is outside declared product authority";
  if (!belongsTo(String(fields.productContract), value.productAuthority)) return "Autonomous ProductDelivery product contract is outside declared product authority";
  const architectureNotApplicable = /^not_applicable\s+-\s+.{20,}$/i.test(String(fields.architectureContract));
  if (!architectureNotApplicable && !belongsTo(String(fields.architectureContract), value.architectureAuthority)) {
    return "Autonomous ProductDelivery architecture contract is outside declared architecture authority";
  }
  if (/\b(?:pending|unknown|unvalidated|needs_decision|conflict)\b/i.test(String(fields.assumptionDisposition))) {
    return "Autonomous ProductDelivery cannot admit unresolved assumptions or source conflicts";
  }
  if (!/^(?:none|validated|owner_approved|rejected|experiment_only)(?:\s+-\s+.+)?$/i.test(String(fields.assumptionDisposition))) {
    return "Autonomous ProductDelivery requires an explicit assumption disposition";
  }
  return null;
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
          acceptancePredicates: (data.acceptancePredicates ?? []).length > 0
            ? data.acceptancePredicates
            : data.acceptanceCriteria.map((criterion, index) => ({
                key: `criterion_${index + 1}`,
                label: typeof criterion.label === "string"
                  ? criterion.label
                  : typeof criterion.kind === "string"
                    ? criterion.kind
                    : `Acceptance criterion ${index + 1}`,
                kind: "custom",
                required: true,
                expected: criterion,
              })),
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
        const intentContractError = validateAutonomousDeliveryIntentContract(existing.decisionContract);
        if (intentContractError) throw unprocessable(intentContractError);
        const isAutonomousCycle = existing.decisionContract.source === "paperclip_autonomous_cycle";
        let boundedIssueId: string | undefined;
        if (isAutonomousCycle) {
          const intentContract = existing.decisionContract.intentContract as Record<string, unknown> | undefined;
          const intentIssue = intentContract?.issue as Record<string, unknown> | undefined;
          const intentIssueId = typeof intentIssue?.id === "string" ? intentIssue.id : null;
          if (!intentIssueId || existing.decisionContract.boundedToIssueId !== intentIssueId) {
            throw unprocessable("Autonomous ProductDelivery intent trace must identify its bounded source issue");
          }
          const linkedIntentTask = await db.select({ issueId: deliveryTasks.issueId }).from(deliveryTasks)
            .where(and(eq(deliveryTasks.deliveryId, existing.id), eq(deliveryTasks.issueId, intentIssueId)))
            .then((rows) => rows[0] ?? null);
          if (!linkedIntentTask) throw unprocessable("Autonomous ProductDelivery intent source issue must be a linked delivery task");
          boundedIssueId = intentIssueId;
        }
        const decision = await admission.evaluateWork({
          companyId: existing.companyId,
          projectId: existing.projectId,
          issueId: boundedIssueId,
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
      if (data.toStage === "outcome_accepted" && !["accepted", "accepted_with_risk"].includes(outcome?.status ?? "")) {
        throw unprocessable("Delivery cannot reach outcome_accepted until its outcome is accepted independently");
      }
      if (data.toStage === "outcome_rejected") {
        if (outcome?.status !== "rejected") {
          throw unprocessable("Delivery can only be outcome-rejected after its product outcome is rejected");
        }
        if (data.integrationSha ?? existing.integrationSha) {
          throw unprocessable("Outcome-rejected delivery cannot have an integration SHA");
        }
      }
      if (
        (data.toStage === "review_accepted" || data.toStage === "review_rejected")
        && actor.actorType === "agent"
        && actor.actorId
        && actor.actorId === existing.ownerAgentId
      ) {
        throw unprocessable("Delivery review verdict must be issued by an independent actor");
      }
      if (data.reviewVerdict) {
        if (actor.actorType === "agent" && actor.actorId !== data.reviewVerdict.reviewerAgentId) {
          throw unprocessable("Typed review verdict reviewer must match the acting agent");
        }
        const [reviewer, executor] = await Promise.all([
          db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.reviewVerdict.reviewerAgentId)).then((rows) => rows[0] ?? null),
          db.select({ companyId: agents.companyId }).from(agents).where(eq(agents.id, data.reviewVerdict.executorAgentId)).then((rows) => rows[0] ?? null),
        ]);
        if (!reviewer || !executor || reviewer.companyId !== existing.companyId || executor.companyId !== existing.companyId) {
          throw badRequest("Review verdict actors must belong to the delivery company");
        }
        if (data.toStage === "review_rejected") {
          const rejectedCount = await db.select().from(deliveryTransitions).where(and(
            eq(deliveryTransitions.deliveryId, id),
            eq(deliveryTransitions.toStage, "review_rejected"),
          ));
          if (rejectedCount.length >= 3 || data.reviewVerdict.correctionIteration !== rejectedCount.length + 1) {
            throw unprocessable("Correction loop is limited to three ordered CHANGES_REQUIRED iterations");
          }
        }
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
          details: { localSha: data.localSha, originSha: data.originSha, integrationSha: data.integrationSha, deployedSha: data.deployedSha, deploymentUrl: data.deploymentUrl, reviewVerdict: data.reviewVerdict },
        }).returning().then((rows) => rows[0]);
        if (data.toStage === "rolled_back" && outcome) await tx.update(productOutcomes)
          .set({ status: "rolled_back", evidence: [...(outcome.evidence ?? []), ...data.evidence], updatedAt: now })
          .where(eq(productOutcomes.id, outcome.id));
        return { delivery, transition, idempotent: false };
      });
    },

    async updateStatus(id: string, data: UpdateDeliveryStatus) {
      const existing = await getById(id);
      if (!existing) throw notFound("Delivery not found");
      return db.update(productDeliveries).set({
        blocker: data.blocker === undefined ? existing.blocker : data.blocker,
        needsDecision: data.needsDecision ?? existing.needsDecision,
        localSha: data.localSha === undefined ? existing.localSha : data.localSha,
        updatedAt: new Date(),
      }).where(eq(productDeliveries.id, id)).returning().then((rows) => rows[0]);
    },

    async updateOutcome(deliveryId: string, data: UpdateProductOutcome, actor: { agentId?: string | null; userId?: string | null }) {
      const delivery = await getById(deliveryId);
      if (!delivery) throw notFound("Delivery not found");
      const outcome = await db.select().from(productOutcomes).where(eq(productOutcomes.deliveryId, deliveryId))
        .then((rows) => rows[0] ?? null);
      if (!outcome) throw notFound("Product outcome not found");
      const from = outcome.status as ProductOutcomeStatus;
      if (!outcomeTransitions[from].includes(data.status)) throw conflict(`Illegal outcome transition: ${from} -> ${data.status}`);
      if (["achieved", "accepted", "accepted_with_risk", "partial", "rejected", "rolled_back", "unknown"].includes(data.status) && data.evidence.length === 0) {
        throw unprocessable(`Outcome transition to '${data.status}' requires inspectable evidence`);
      }
      if (["accepted", "accepted_with_risk"].includes(data.status) && delivery.stage !== "observed_healthy") {
        throw unprocessable("Outcome acceptance requires an observed_healthy delivery");
      }
      if (["accepted", "accepted_with_risk"].includes(data.status)) {
        const linkedTasks = await db.select({ issueId: deliveryTasks.issueId }).from(deliveryTasks)
          .where(and(eq(deliveryTasks.companyId, delivery.companyId), eq(deliveryTasks.deliveryId, delivery.id)));
        if (linkedTasks.length === 0) {
          throw unprocessable("Outcome acceptance requires at least one linked delivery task");
        }
        const linkedCosts = await db.select({ id: costEvents.id }).from(costEvents).where(and(
          eq(costEvents.companyId, delivery.companyId),
          inArray(costEvents.issueId, linkedTasks.map((task) => task.issueId)),
        )).limit(1);
        if (linkedCosts.length === 0) {
          throw unprocessable("Outcome acceptance requires linked cost telemetry, including an explicit zero-cost event");
        }
      }
      if (data.acceptancePredicates && !actor.userId) {
        throw unprocessable("Only an identified board owner can replace outcome acceptance predicates");
      }
      if (data.acceptancePredicates && !["observing", "unknown", "achieved"].includes(data.status)) {
        throw unprocessable("Acceptance predicates can only be replaced while the outcome is observing, unknown, or achieved");
      }
      const definitions = (data.acceptancePredicates ?? outcome.acceptancePredicates ?? []) as Array<Record<string, unknown>>;
      const priorResults = (outcome.predicateResults ?? []) as Array<Record<string, unknown>>;
      const mergedResults = new Map(priorResults.map((result) => [String(result.key ?? ""), result]));
      for (const result of data.predicateResults ?? []) mergedResults.set(result.key, result);
      const nowMs = Date.now();
      const requiredKeys = definitions.filter((definition) => definition.required !== false).map((definition) => String(definition.key ?? "")).filter(Boolean);
      const failedPredicateKeys = requiredKeys.filter((key) => {
        const result = mergedResults.get(key);
        if (!result || result.passed !== true) return true;
        if (typeof result.expiresAt === "string" && Date.parse(result.expiresAt) <= nowMs) return true;
        const definition = definitions.find((item) => item.key === key);
        if (typeof definition?.maxAgeMinutes === "number") {
          const checkedAt = typeof result.checkedAt === "string" ? Date.parse(result.checkedAt) : Number.NaN;
          if (!Number.isFinite(checkedAt) || checkedAt + definition.maxAgeMinutes * 60_000 <= nowMs) return true;
        }
        return false;
      });
      const passedPredicateKeys = requiredKeys.filter((key) => !failedPredicateKeys.includes(key));
      if (data.status === "accepted" && (requiredKeys.length === 0 || failedPredicateKeys.length > 0)) {
        throw unprocessable("Outcome acceptance failed closed because required predicates are missing, failed, or stale", { requiredKeys, failedPredicateKeys });
      }
      if (data.status === "accepted_with_risk") {
        if (!actor.userId || !data.manualOverride) throw unprocessable("accepted_with_risk requires an identified board owner and a time-bounded manual override");
        const declared = [...new Set(data.manualOverride.failedPredicateKeys)].sort();
        const actual = [...failedPredicateKeys].sort();
        if (JSON.stringify(declared) !== JSON.stringify(actual)) {
          throw unprocessable("Manual override must name every failed acceptance predicate exactly", { declared, actual });
        }
        if (Date.parse(data.manualOverride.expiresAt) <= nowMs) throw unprocessable("Manual acceptance override is already expired");
      } else if (data.manualOverride) {
        throw unprocessable("manualOverride is only valid for accepted_with_risk");
      }
      if (data.status === "partial" && (passedPredicateKeys.length === 0 || failedPredicateKeys.length === 0)) {
        throw unprocessable("Partial outcome requires both passed and failed required predicates", { passedPredicateKeys, failedPredicateKeys });
      }
      if (data.status === "rejected" && failedPredicateKeys.length === 0) {
        throw unprocessable("Rejected outcome requires at least one failed required predicate");
      }
      if (["accepted", "accepted_with_risk"].includes(data.status)) {
        if (!actor.agentId && !actor.userId) {
          throw unprocessable("Outcome acceptance requires an identified independent actor");
        }
        if (actor.agentId && actor.agentId === delivery.ownerAgentId) {
          throw unprocessable("Delivery owners cannot accept their own product outcome");
        }
      }
      return db.update(productOutcomes).set({
        status: data.status,
        evidence: [...(outcome.evidence ?? []), ...data.evidence],
        acceptancePredicates: definitions,
        predicateResults: [...mergedResults.values()],
        acceptanceDecision: {
          status: data.status,
          requiredPredicateKeys: requiredKeys,
          passedPredicateKeys,
          failedPredicateKeys,
          manualOverride: data.manualOverride ?? null,
          decidedAt: new Date().toISOString(),
        },
        acceptedByAgentId: ["accepted", "accepted_with_risk"].includes(data.status) ? actor.agentId ?? null : null,
        acceptedByUserId: ["accepted", "accepted_with_risk"].includes(data.status) ? actor.userId ?? null : null,
        acceptedAt: ["accepted", "accepted_with_risk"].includes(data.status) ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(productOutcomes.id, outcome.id)).returning().then((rows) => rows[0]);
    },
  };
}
