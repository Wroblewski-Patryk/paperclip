import { z } from "zod";
import { DELIVERY_STAGES, PRODUCT_OUTCOME_STATUSES } from "../types/delivery.js";
import { multilineTextSchema } from "./text.js";

const evidenceSchema = z.array(z.record(z.string(), z.unknown())).max(100);
const outcomePredicateDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(500),
  kind: z.enum([
    "exact_sha", "outbox_published", "protected_readback", "no_conflict", "freshness",
    "digest_match", "smoke", "observation", "public_health", "functional_smoke",
    "no_critical_regression", "custom",
  ]),
  required: z.boolean().optional().default(true),
  expected: z.unknown().optional(),
  maxAgeMinutes: z.number().int().positive().max(43_200).optional(),
}).strict();

const outcomePredicateResultSchema = z.object({
  key: z.string().trim().min(1).max(120),
  passed: z.boolean(),
  actual: z.unknown().optional(),
  evidenceRefs: z.array(z.string().trim().min(1).max(2000)).min(1).max(20),
  checkedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  digest: z.string().trim().min(1).max(500).optional(),
}).strict();

const outcomeManualOverrideSchema = z.object({
  reason: z.string().trim().min(20).max(5000),
  failedPredicateKeys: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  expiresAt: z.string().datetime(),
}).strict();
const reviewVerdictSchema = z.object({
  verdict: z.enum(["CHANGES_REQUIRED", "ACCEPTED"]),
  reviewerAgentId: z.string().uuid(),
  executorAgentId: z.string().uuid(),
  finding: z.string().trim().min(10).max(5000),
  evidenceRefs: z.array(z.string().trim().min(1).max(2000)).min(1).max(20),
  correctionIteration: z.number().int().min(0).max(3),
}).strict();

export const createDeliverySchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  problemStatement: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  decisionContract: z.record(z.string(), z.unknown()),
  ownerAgentId: z.string().uuid().nullable().optional(),
  outcomeStatement: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  acceptanceCriteria: evidenceSchema.min(1),
  acceptancePredicates: z.array(outcomePredicateDefinitionSchema).max(50).optional().default([]),
  taskIssueIds: z.array(z.string().uuid()).max(50).optional().default([]),
}).strict();

export const transitionDeliverySchema = z.object({
  toStage: z.enum(DELIVERY_STAGES),
  idempotencyKey: z.string().trim().min(1).max(300),
  evidence: evidenceSchema.optional().default([]),
  reviewVerdict: reviewVerdictSchema.optional(),
  localSha: z.string().trim().min(7).max(64).nullable().optional(),
  originSha: z.string().trim().min(7).max(64).nullable().optional(),
  integrationSha: z.string().trim().min(7).max(64).nullable().optional(),
  deployedSha: z.string().trim().min(7).max(64).nullable().optional(),
  deploymentUrl: z.string().url().max(2000).nullable().optional(),
  blocker: z.string().trim().max(5000).nullable().optional(),
  needsDecision: z.boolean().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.toStage === "review_rejected" || value.toStage === "review_accepted") {
    if (!value.reviewVerdict) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewVerdict"], message: "A typed review verdict is required" });
      return;
    }
    const expected = value.toStage === "review_rejected" ? "CHANGES_REQUIRED" : "ACCEPTED";
    if (value.reviewVerdict.verdict !== expected) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewVerdict", "verdict"], message: `Expected ${expected}` });
    }
    if (value.reviewVerdict.reviewerAgentId === value.reviewVerdict.executorAgentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewVerdict", "reviewerAgentId"], message: "Reviewer must be independent from executor" });
    }
  } else if (value.reviewVerdict) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewVerdict"], message: "reviewVerdict is only allowed on review transitions" });
  }
});

export const dispatchDeliverySchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(300),
}).strict();

export const updateDeliveryStatusSchema = z.object({
  blocker: z.string().trim().max(5000).nullable().optional(),
  needsDecision: z.boolean().optional(),
  localSha: z.string().trim().min(7).max(64).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one status field is required");

export const updateProductOutcomeSchema = z.object({
  status: z.enum(PRODUCT_OUTCOME_STATUSES),
  evidence: evidenceSchema.optional().default([]),
  acceptancePredicates: z.array(outcomePredicateDefinitionSchema).min(1).max(50).optional(),
  predicateResults: z.array(outcomePredicateResultSchema).max(50).optional().default([]),
  manualOverride: outcomeManualOverrideSchema.optional(),
}).strict();

export const listDeliveriesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  stage: z.enum(DELIVERY_STAGES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type CreateDelivery = z.infer<typeof createDeliverySchema>;
export type TransitionDelivery = z.infer<typeof transitionDeliverySchema>;
export type DispatchDelivery = z.infer<typeof dispatchDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;
export type UpdateProductOutcome = z.infer<typeof updateProductOutcomeSchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
