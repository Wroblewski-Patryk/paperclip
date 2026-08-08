import { z } from "zod";

export const SUPERVISION_FINDING_SEVERITIES = ["info", "warning", "high", "critical"] as const;
export const SUPERVISION_FINDING_STATUSES = [
  "detected", "classified", "admission_pending", "admitted", "assigned", "in_progress",
  "observing", "verified", "resolved", "closed", "needs_decision", "no_action",
  "duplicate", "accepted_risk", "not_worth_doing", "archived",
] as const;
export const SUPERVISION_SOURCE_KINDS = [
  "native_watchdog", "operational_doctor", "daily_integrity", "weekly_meta",
  "external_assurance", "manual", "migration",
] as const;
export const SUPERVISION_ROOT_CAUSE_STATUSES = [
  "hypothesis", "confirmed", "mitigated", "resolved", "rejected", "archived",
] as const;
export const SUPERVISION_BOTTLENECK_TYPES = [
  "admission_bottleneck", "delegation_bottleneck", "owner_bottleneck",
  "executor_bottleneck", "review_bottleneck", "correction_bottleneck",
  "integration_bottleneck", "deployment_bottleneck", "observation_bottleneck",
  "reporting_bottleneck", "context_bottleneck", "quota_bottleneck",
] as const;

export type SupervisionFindingSeverity = typeof SUPERVISION_FINDING_SEVERITIES[number];
export type SupervisionFindingStatus = typeof SUPERVISION_FINDING_STATUSES[number];
export type SupervisionSourceKind = typeof SUPERVISION_SOURCE_KINDS[number];

const evidenceRefSchema = z.object({
  sourceKind: z.string().trim().min(1).max(100),
  sourceRef: z.string().trim().min(1).max(2000),
  label: z.string().trim().max(300).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
}).strict();

const economicsSchema = z.object({
  expectedValue: z.number().nonnegative().optional(),
  costEstimate: z.number().nonnegative().optional(),
  risk: z.string().trim().max(500).optional(),
  priority: z.string().trim().max(100).optional(),
  reversibility: z.string().trim().max(500).optional(),
  opportunityCost: z.string().trim().max(1000).optional(),
  tokenBudget: z.number().int().nonnegative().optional(),
  timeBudgetMinutes: z.number().int().nonnegative().optional(),
  retryBudget: z.number().int().nonnegative().optional(),
  stopBoundary: z.string().trim().max(1000).optional(),
}).strict();

export const upsertSupervisionFindingSchema = z.object({
  fingerprint: z.string().trim().min(1).max(500),
  problemClass: z.string().trim().min(1).max(200),
  severity: z.enum(SUPERVISION_FINDING_SEVERITIES).optional().default("warning"),
  status: z.enum(SUPERVISION_FINDING_STATUSES).optional().default("detected"),
  classification: z.string().trim().min(1).max(200).optional().default("unclassified"),
  sourceKind: z.enum(SUPERVISION_SOURCE_KINDS),
  sourceRef: z.string().trim().max(2000).optional().nullable(),
  title: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(10000),
  affectedComponent: z.string().trim().max(500).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  issueId: z.string().uuid().optional().nullable(),
  deliveryId: z.string().uuid().optional().nullable(),
  deliveryTaskId: z.string().uuid().optional().nullable(),
  affectedAgentId: z.string().uuid().optional().nullable(),
  ownerAgentId: z.string().uuid().optional().nullable(),
  ownerUserId: z.string().trim().max(300).optional().nullable(),
  admissionDecisionId: z.string().uuid().optional().nullable(),
  rootCauseId: z.string().uuid().optional().nullable(),
  nativeSafeguardId: z.string().uuid().optional().nullable(),
  retryCount: z.number().int().nonnegative().optional().default(0),
  economics: economicsSchema.optional().default({}),
  decision: z.record(z.unknown()).optional().default({}),
  recoveryState: z.string().trim().min(1).max(100).optional().default("healthy"),
  bottleneckType: z.enum(SUPERVISION_BOTTLENECK_TYPES).optional().nullable(),
  bottleneckStartedAt: z.string().datetime().optional().nullable(),
  bottleneckStage: z.string().trim().min(1).max(200).optional().nullable(),
  dependency: z.string().trim().min(1).max(2000).optional().nullable(),
  slaDueAt: z.string().datetime().optional().nullable(),
  nextAllowedAction: z.string().trim().min(1).max(2000).optional().nullable(),
  escalationCondition: z.string().trim().min(1).max(2000).optional().nullable(),
  cooldownUntil: z.string().datetime().optional().nullable(),
  evidence: z.array(evidenceRefSchema).max(50).optional().default([]),
  recurrenceEvidence: z.record(z.unknown()).optional().default({}),
  runId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
}).strict().superRefine((value, ctx) => {
  if (!value.bottleneckType) return;
  for (const field of ["ownerAgentId", "bottleneckStartedAt", "bottleneckStage", "slaDueAt", "nextAllowedAction", "escalationCondition"] as const) {
    if (!value[field]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for a persisted bottleneck` });
  }
});

export const listSupervisionFindingsQuerySchema = z.object({
  status: z.enum(SUPERVISION_FINDING_STATUSES).optional(),
  severity: z.enum(SUPERVISION_FINDING_SEVERITIES).optional(),
  problemClass: z.string().trim().min(1).max(200).optional(),
  ownerAgentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  deliveryId: z.string().uuid().optional(),
  includeArchived: z.enum(["true", "false"]).optional().default("false"),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
}).strict();

export const createSupervisionRootCauseSchema = z.object({
  fingerprint: z.string().trim().min(1).max(500),
  problemClass: z.string().trim().min(1).max(200),
  status: z.enum(SUPERVISION_ROOT_CAUSE_STATUSES).optional().default("hypothesis"),
  title: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(10000),
  hypothesis: z.string().trim().max(10000).optional().nullable(),
  ownerAgentId: z.string().uuid().optional().nullable(),
  ownerUserId: z.string().trim().max(300).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  issueId: z.string().uuid().optional().nullable(),
}).strict();

export const linkFindingRootCauseSchema = z.object({ rootCauseId: z.string().uuid() }).strict();

export const closeSupervisionRootCauseSchema = z.object({
  resolution: z.string().trim().min(1).max(10000),
  nativeSafeguardId: z.string().uuid(),
  evidence: z.array(evidenceRefSchema).min(1).max(50),
  retentionDays: z.number().int().min(1).max(3650).optional().default(365),
}).strict();

export const createSupervisionInterventionSchema = z.object({
  findingId: z.string().uuid(),
  rootCauseId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  admissionDecisionId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  deliveryId: z.string().uuid().optional().nullable(),
  ownerAgentId: z.string().uuid(),
  kind: z.string().trim().min(1).max(200),
  status: z.string().trim().min(1).max(100).optional().default("proposed"),
  changeSummary: z.string().trim().min(1).max(10000),
  expectedEffect: z.string().trim().min(1).max(10000),
  rollbackPlan: z.string().trim().min(1).max(10000),
  budget: z.record(z.unknown()).optional().default({}),
}).strict();

export const createSupervisionCycleSchema = z.object({
  sourceKind: z.enum(SUPERVISION_SOURCE_KINDS),
  externalCycleId: z.string().trim().min(1).max(500),
  triggerKind: z.string().trim().min(1).max(200),
  budget: z.record(z.unknown()).optional().default({}),
  expiresAt: z.string().datetime().optional().nullable(),
}).strict();

export const finishSupervisionCycleSchema = z.object({
  status: z.enum(["completed", "failed", "expired", "cancelled"]),
  metrics: z.record(z.unknown()).optional().default({}),
  summary: z.string().trim().max(10000).optional().nullable(),
}).strict();

export const createNativeSafeguardSchema = z.object({
  key: z.string().trim().min(1).max(500),
  kind: z.string().trim().min(1).max(200),
  status: z.string().trim().min(1).max(100).optional().default("proposed"),
  title: z.string().trim().min(1).max(500),
  target: z.string().trim().min(1).max(1000),
  implementationRef: z.string().trim().max(2000).optional().nullable(),
  regressionTestRef: z.string().trim().max(2000).optional().nullable(),
  removalCondition: z.string().trim().max(2000).optional().nullable(),
  ownerAgentId: z.string().uuid().optional().nullable(),
  rootCauseId: z.string().uuid().optional().nullable(),
  enabled: z.boolean().optional().default(false),
}).strict();

export const updateNativeSafeguardSchema = z.object({
  status: z.enum(["proposed", "implemented", "observing", "verified", "failed", "retired"]).optional(),
  implementationRef: z.string().trim().max(2000).optional().nullable(),
  regressionTestRef: z.string().trim().max(2000).optional().nullable(),
  removalCondition: z.string().trim().max(2000).optional().nullable(),
  enabled: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one safeguard field is required");

export const createObservationWindowSchema = z.object({
  findingId: z.string().uuid(),
  interventionId: z.string().uuid().optional().nullable(),
  nativeSafeguardId: z.string().uuid().optional().nullable(),
  expectedEffect: z.string().trim().min(1).max(10000),
  successCriteria: z.array(z.record(z.unknown())).min(1).max(50),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).strict().refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
  message: "endsAt must be after startsAt",
  path: ["endsAt"],
});

export const completeObservationWindowSchema = z.object({
  status: z.enum(["passed", "failed", "inconclusive", "cancelled"]),
  measurements: z.array(z.record(z.unknown())).min(1).max(200),
  conclusion: z.string().trim().min(1).max(10000),
}).strict();

export const createSupervisionShadowComparisonSchema = z.object({
  externalSource: z.enum(["paperclip_watchdog", "operational_doctor", "daily_integrity_audit", "weekly_meta_architecture_review"]),
  externalCycleId: z.string().trim().min(1).max(500),
  nativeCycleId: z.string().uuid().optional().nullable(),
  externalFindings: z.array(z.object({
    fingerprint: z.string().trim().min(1).max(500),
    severity: z.enum(SUPERVISION_FINDING_SEVERITIES),
    title: z.string().trim().min(1).max(500),
  }).strict()).max(1000),
}).strict();

export type UpsertSupervisionFinding = z.infer<typeof upsertSupervisionFindingSchema>;
export type ListSupervisionFindingsQuery = z.infer<typeof listSupervisionFindingsQuerySchema>;
export type CreateSupervisionRootCause = z.infer<typeof createSupervisionRootCauseSchema>;
export type CloseSupervisionRootCause = z.infer<typeof closeSupervisionRootCauseSchema>;
export type CreateSupervisionIntervention = z.infer<typeof createSupervisionInterventionSchema>;
export type CreateSupervisionCycle = z.infer<typeof createSupervisionCycleSchema>;
export type FinishSupervisionCycle = z.infer<typeof finishSupervisionCycleSchema>;
export type CreateNativeSafeguard = z.infer<typeof createNativeSafeguardSchema>;
export type UpdateNativeSafeguard = z.infer<typeof updateNativeSafeguardSchema>;
export type CreateObservationWindow = z.infer<typeof createObservationWindowSchema>;
export type CompleteObservationWindow = z.infer<typeof completeObservationWindowSchema>;
export type CreateSupervisionShadowComparison = z.infer<typeof createSupervisionShadowComparisonSchema>;
