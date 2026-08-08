import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import {
  closeSupervisionRootCauseSchema,
  completeObservationWindowSchema,
  createNativeSafeguardSchema,
  createObservationWindowSchema,
  createSupervisionCycleSchema,
  createSupervisionInterventionSchema,
  createSupervisionRootCauseSchema,
  createSupervisionShadowComparisonSchema,
  finishSupervisionCycleSchema,
  linkFindingRootCauseSchema,
  listSupervisionFindingsQuerySchema,
  updateNativeSafeguardSchema,
  upsertSupervisionFindingSchema,
} from "@paperclipai/shared";
import { forbidden, notFound } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { autonomyDecisionService, heartbeatService, logActivity, nativeSupervisionEngine, supervisionRegistryService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function supervisionRoutes(db: Db) {
  const router = Router();
  const svc = supervisionRegistryService(db);
  const heartbeat = heartbeatService(db);
  const native = nativeSupervisionEngine(db, {
    enqueueWakeup: (agentId, options) => heartbeat.wakeup(agentId, options),
  });
  const autonomy = autonomyDecisionService(db, {
    enqueueWakeup: (agentId, options) => heartbeat.wakeup(agentId, options),
  });

  const decisionEvaluationSchema = z.object({
    evaluatorSource: z.string().trim().min(1).max(200),
    signalType: z.enum(["ORACLE_VERDICT", "OPERATOR_DECISION", "COUNTERFACTUAL_WEAK_EVIDENCE"]).optional(),
    evaluatorMetadata: z.record(z.string(), z.unknown()).optional(),
    evidenceAvailable: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
    verdict: z.enum(["agree", "disagree", "insufficient_evidence", "alternative", "unsafe", "stale_state"]),
    rationale: z.string().trim().min(1).max(4000),
    alternativeIssueId: z.string().uuid().optional().nullable(),
    evidenceRefs: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
    actualOutcomeQuality: z.string().trim().max(100).optional().nullable(),
  }).strict();
  const intentConfirmationSchema = z.object({
    status: z.enum(["ACTIVE", "RECONFIRM_REQUIRED", "SUPERSEDED", "OBSOLETE", "SATISFIED_ELSEWHERE", "UNKNOWN"]),
    validUntil: z.string().datetime().optional().nullable(),
    ownerAgentId: z.string().uuid().optional().nullable(),
    source: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(1).max(4000),
  }).strict();
  const canaryAuthorizationSchema = z.object({
    validUntil: z.string().datetime(),
    maxExecutions: z.number().int().min(1).max(3).optional(),
    maxConcurrency: z.number().int().min(1).max(2).optional(),
    maxCostCents: z.number().int().min(0).max(10_000),
    maxCalls: z.number().int().min(1).max(100),
    allowedCostUncertainty: z.array(z.enum(["VERIFIED", "PARTIAL", "UNKNOWN_BOUNDED"])).min(1).optional(),
    verificationIndependence: z.enum(["INDEPENDENT_INTERNAL", "EXTERNAL", "HUMAN"] as const).optional(),
    rationale: z.string().trim().min(1).max(4000),
    stopConditions: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  }).strict();
  const interruptSchema = z.object({
    severity: z.enum(["info", "warning", "critical"]),
    scope: z.record(z.string(), z.unknown()),
    source: z.string().trim().min(1).max(200),
    evidence: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
    preemptibleWorkClasses: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
    expiresAt: z.string().datetime(),
  }).strict();
  const learnedPolicySchema = z.object({
    key: z.string().trim().min(1).max(200),
    lifecycle: z.enum(["PROPOSED", "EXPERIMENTAL", "ACTIVE", "SUSPECT", "ROLLED_BACK", "SUPERSEDED", "RETIRED"]),
    scope: z.record(z.string(), z.unknown()),
    provenance: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    expectedEffect: z.record(z.string(), z.unknown()),
    rollbackCondition: z.record(z.string(), z.unknown()),
    ownerAgentId: z.string().uuid().optional().nullable(),
    reviewAt: z.string().datetime().optional().nullable(),
  }).strict();

  const activity = async (req: Parameters<typeof getActorInfo>[0], companyId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) => {
    const actor = getActorInfo(req);
    await logActivity(db, { companyId, actorType: actor.actorType, actorId: actor.actorId, agentId: actor.agentId, runId: actor.runId, action, entityType, entityId, details });
  };
  const requireBoard = (req: Parameters<typeof getActorInfo>[0]) => {
    if (getActorInfo(req).actorType === "agent") throw forbidden("This supervision maintenance operation requires board authority");
  };

  router.get("/companies/:companyId/supervision/findings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listFindings(companyId, listSupervisionFindingsQuerySchema.parse(req.query)));
  });

  router.get("/supervision/findings/:id", async (req, res) => {
    const finding = await svc.getFinding(req.params.id as string);
    if (!finding) throw notFound("Supervision finding not found");
    assertCompanyAccess(req, finding.companyId);
    res.json(finding);
  });

  router.post("/companies/:companyId/supervision/stalled-ready/dispatch", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    requireBoard(req);
    const results = await native.dispatchStalledReady(companyId);
    await activity(req, companyId, "supervision.stalled_ready.scanned", "company", companyId, {
      candidates: results.length,
      dispatched: results.filter((item) => item.status === "dispatched").length,
    });
    res.json({ results });
  });

  router.post("/companies/:companyId/supervision/findings", validate(upsertSupervisionFindingSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && req.body.ownerAgentId && req.body.ownerAgentId !== actor.agentId) {
      throw forbidden("Agents may only own findings they create themselves");
    }
    const result = await svc.upsertFinding(companyId, {
      ...req.body,
      ownerAgentId: req.body.ownerAgentId ?? (actor.actorType === "agent" ? actor.agentId : null),
      ownerUserId: req.body.ownerUserId ?? (actor.actorType === "user" ? actor.actorId : null),
      runId: req.body.runId ?? actor.runId,
    });
    await activity(req, companyId, result.created ? "supervision.finding.created" : "supervision.finding.recurred", "supervision_finding", result.finding.id, { fingerprint: result.finding.fingerprint });
    res.status(result.created ? 201 : 200).json(result);
  });

  router.post("/companies/:companyId/supervision/root-causes", validate(createSupervisionRootCauseSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && req.body.ownerAgentId && req.body.ownerAgentId !== actor.agentId) throw forbidden("Agents may only own root causes they create themselves");
    const result = await svc.createRootCause(companyId, { ...req.body, ownerAgentId: req.body.ownerAgentId ?? (actor.actorType === "agent" ? actor.agentId : null), ownerUserId: req.body.ownerUserId ?? (actor.actorType === "user" ? actor.actorId : null) });
    await activity(req, companyId, result.created ? "supervision.root_cause.created" : "supervision.root_cause.deduplicated", "supervision_root_cause", result.rootCause.id);
    res.status(result.created ? 201 : 200).json(result);
  });

  router.post("/supervision/findings/:id/root-cause", validate(linkFindingRootCauseSchema), async (req, res) => {
    const finding = await svc.getFinding(req.params.id as string);
    if (!finding) throw notFound("Supervision finding not found");
    assertCompanyAccess(req, finding.companyId);
    const linked = await svc.linkFindingRootCause(finding.id, req.body.rootCauseId);
    if (!linked) throw notFound("Supervision root cause not found");
    await activity(req, finding.companyId, "supervision.finding.root_cause_linked", "supervision_finding", finding.id, { rootCauseId: req.body.rootCauseId });
    res.json(linked);
  });

  router.post("/companies/:companyId/supervision/safeguards", validate(createNativeSafeguardSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && req.body.ownerAgentId && req.body.ownerAgentId !== actor.agentId) throw forbidden("Agents may only own safeguards they create themselves");
    const result = await svc.createSafeguard(companyId, { ...req.body, ownerAgentId: req.body.ownerAgentId ?? (actor.actorType === "agent" ? actor.agentId : null) });
    await activity(req, companyId, result.created ? "supervision.safeguard.created" : "supervision.safeguard.deduplicated", "native_safeguard", result.safeguard.id);
    res.status(result.created ? 201 : 200).json(result);
  });

  router.patch("/supervision/safeguards/:id", validate(updateNativeSafeguardSchema), async (req, res) => {
    const existing = await svc.getSafeguard(req.params.id as string);
    if (!existing) throw notFound("Native safeguard not found");
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && existing.ownerAgentId !== actor.agentId) throw forbidden("Agents may only update safeguards they own");
    const updated = await svc.updateSafeguard(existing.id, req.body);
    await activity(req, existing.companyId, "supervision.safeguard.updated", "native_safeguard", existing.id, { changedFields: Object.keys(req.body) });
    res.json(updated);
  });

  router.post("/companies/:companyId/supervision/cycles", validate(createSupervisionCycleSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.createCycle(companyId, req.body);
    await activity(req, companyId, result.created ? "supervision.cycle.started" : "supervision.cycle.deduplicated", "supervision_cycle", result.cycle.id);
    res.status(result.created ? 201 : 200).json(result);
  });

  router.post("/supervision/cycles/:id/finish", validate(finishSupervisionCycleSchema), async (req, res) => {
    const existing = await svc.getCycle(req.params.id as string);
    if (!existing) throw notFound("Supervision cycle not found");
    assertCompanyAccess(req, existing.companyId);
    const finished = await svc.finishCycle(existing.id, req.body);
    if (!finished) throw notFound("Running supervision cycle not found");
    await activity(req, existing.companyId, "supervision.cycle.finished", "supervision_cycle", existing.id, { status: finished.status });
    res.json(finished);
  });

  router.post("/companies/:companyId/supervision/interventions", validate(createSupervisionInterventionSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && req.body.ownerAgentId !== actor.agentId) throw forbidden("Agents may only own interventions they create themselves");
    const intervention = await svc.createIntervention(companyId, req.body);
    await activity(req, companyId, "supervision.intervention.created", "supervision_intervention", intervention.id, { findingId: intervention.findingId, admissionDecisionId: intervention.admissionDecisionId });
    res.status(201).json(intervention);
  });

  router.post("/companies/:companyId/supervision/observation-windows", validate(createObservationWindowSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const window = await svc.createObservationWindow(companyId, req.body);
    await activity(req, companyId, "supervision.observation.started", "supervision_observation_window", window.id, { findingId: window.findingId });
    res.status(201).json(window);
  });

  router.post("/supervision/observation-windows/:id/complete", validate(completeObservationWindowSchema), async (req, res) => {
    const existing = await svc.getObservationWindow(req.params.id as string);
    if (!existing) throw notFound("Supervision observation window not found");
    assertCompanyAccess(req, existing.companyId);
    const window = await svc.completeObservationWindow(existing.id, req.body);
    await activity(req, existing.companyId, "supervision.observation.completed", "supervision_observation_window", existing.id, { status: window?.status });
    res.json(window);
  });

  router.post("/supervision/root-causes/:id/close", validate(closeSupervisionRootCauseSchema), async (req, res) => {
    const rootCause = await svc.getRootCause(req.params.id as string);
    if (!rootCause) throw notFound("Supervision root cause not found");
    assertCompanyAccess(req, rootCause.companyId);
    const actor = getActorInfo(req);
    if (actor.actorType === "agent" && rootCause.ownerAgentId !== actor.agentId) throw forbidden("Agents may only close root causes they own");
    const result = await svc.closeRootCause(rootCause.id, req.body);
    await activity(req, rootCause.companyId, "supervision.root_cause.closed", "supervision_root_cause", rootCause.id, { safeguardId: req.body.nativeSafeguardId, closedFindingCount: result?.closedFindings.length ?? 0 });
    res.json(result);
  });

  router.post("/companies/:companyId/supervision/recover", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId); requireBoard(req);
    const recovered = await svc.recoverExpiredCycles(companyId);
    await activity(req, companyId, "supervision.cycles.recovered", "company", companyId, { count: recovered.length });
    res.json({ recovered });
  });

  router.post("/companies/:companyId/supervision/archive", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId); requireBoard(req);
    const archived = await svc.archiveExpired(companyId);
    await activity(req, companyId, "supervision.findings.archived", "company", companyId, { count: archived.length });
    res.json({ archived });
  });

  router.get("/companies/:companyId/supervision/snapshot", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.snapshot(companyId));
  });

  router.get("/companies/:companyId/supervision/shadow-comparisons", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listShadowComparisons(companyId));
  });

  router.post("/companies/:companyId/supervision/shadow-comparisons", validate(createSupervisionShadowComparisonSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.compareExternalAssurance(companyId, req.body);
    await activity(req, companyId, result.created ? "supervision.shadow_comparison.created" : "supervision.shadow_comparison.deduplicated", "supervision_shadow_comparison", result.comparison.id, result.comparison.metrics as Record<string, unknown>);
    res.status(result.created ? 201 : 200).json(result);
  });

  router.get("/companies/:companyId/autonomy/decisions", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listDecisions(companyId));
  });

  router.get("/companies/:companyId/autonomy/envelopes", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listEnvelopes(companyId));
  });

  router.get("/companies/:companyId/autonomy/constraints", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listConstraints(companyId));
  });

  router.get("/companies/:companyId/autonomy/executions", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listExecutions(companyId));
  });

  router.get("/companies/:companyId/autonomy/health", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.autonomyHealth(companyId));
  });

  router.get("/companies/:companyId/autonomy/intents", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listIntents(companyId));
  });

  router.post("/companies/:companyId/autonomy/intents/:issueId", validate(intentConfirmationSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId); requireBoard(req);
    const actor = getActorInfo(req);
    const intent = await autonomy.confirmIssueIntent(companyId, req.params.issueId as string, { ...req.body, validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null, ownerUserId: actor.actorType === "user" ? actor.actorId : null });
    if (!intent) throw notFound("Issue not found");
    await activity(req, companyId, "autonomy.intent.confirmed", "issue_intent", intent.id, { issueId: intent.issueId, status: intent.status, validUntil: intent.validUntil });
    res.status(201).json(intent);
  });

  router.get("/companies/:companyId/autonomy/canary-authorizations", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listCanaryAuthorizations(companyId));
  });

  router.post("/autonomy/decisions/:id/canary-authorizations", validate(canaryAuthorizationSchema), async (req, res) => {
    const decision = await autonomy.getDecision(req.params.id as string);
    if (!decision) throw notFound("Autonomy decision not found");
    assertCompanyAccess(req, decision.companyId); requireBoard(req);
    const actor = getActorInfo(req);
    const authorization = await autonomy.createCanaryAuthorization(decision.companyId, decision.id, { ...req.body, validUntil: new Date(req.body.validUntil), issuerType: "user", issuerId: actor.actorId ?? "board" });
    if (!authorization) throw notFound("Dispatchable autonomy decision not found");
    await activity(req, decision.companyId, "autonomy.canary.authorized", "autonomy_canary_authorization", authorization.id, { decisionId: decision.id, validUntil: authorization.validUntil, maxExecutions: authorization.maxExecutions });
    res.status(201).json(authorization);
  });

  router.get("/companies/:companyId/autonomy/interrupts", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listInterrupts(companyId));
  });

  router.post("/companies/:companyId/autonomy/interrupts", validate(interruptSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId); requireBoard(req);
    const interrupt = await autonomy.createInterrupt(companyId, { ...req.body, expiresAt: new Date(req.body.expiresAt) });
    await activity(req, companyId, "autonomy.interrupt.created", "autonomy_interrupt", interrupt.id, { severity: interrupt.severity, expiresAt: interrupt.expiresAt });
    res.status(201).json(interrupt);
  });

  router.get("/companies/:companyId/autonomy/learned-policies", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await autonomy.listLearnedPolicies(companyId));
  });

  router.post("/companies/:companyId/autonomy/learned-policies", validate(learnedPolicySchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId); requireBoard(req);
    const policy = await autonomy.createLearnedPolicy(companyId, { ...req.body, reviewAt: req.body.reviewAt ? new Date(req.body.reviewAt) : null });
    await activity(req, companyId, "autonomy.learned_policy.version_created", "learned_policy", policy.id, { key: policy.key, version: policy.version, lifecycle: policy.lifecycle });
    res.status(201).json(policy);
  });

  router.get("/autonomy/decisions/:id/evaluations", async (req, res) => {
    const decision = await autonomy.getDecision(req.params.id as string);
    if (!decision) throw notFound("Autonomy decision not found");
    assertCompanyAccess(req, decision.companyId);
    res.json(await autonomy.listEvaluations(decision.id));
  });

  router.post("/autonomy/decisions/:id/evaluations", validate(decisionEvaluationSchema), async (req, res) => {
    const decision = await autonomy.getDecision(req.params.id as string);
    if (!decision) throw notFound("Autonomy decision not found");
    assertCompanyAccess(req, decision.companyId);
    const evaluation = await autonomy.evaluateDecision(decision.id, req.body);
    await activity(req, decision.companyId, "autonomy.decision.evaluated", "autonomy_decision", decision.id, { verdict: req.body.verdict, evaluatorSource: req.body.evaluatorSource });
    res.status(201).json(evaluation);
  });

  router.post("/autonomy/decisions/:id/dispatch", async (req, res) => {
    const decision = await autonomy.getDecision(req.params.id as string);
    if (!decision) throw notFound("Autonomy decision not found");
    assertCompanyAccess(req, decision.companyId);
    requireBoard(req);
    const body = z.object({ canaryAuthorizationId: z.string().uuid().optional().nullable() }).strict().parse(req.body ?? {});
    const result = await autonomy.dispatchAuthorized(decision.id, body.canaryAuthorizationId);
    await activity(req, decision.companyId, "autonomy.decision.dispatch_attempted", "autonomy_decision", decision.id, result);
    res.status(result.status === "ACCEPTED" ? 202 : 409).json(result);
  });

  return router;
}
