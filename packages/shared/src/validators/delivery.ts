import { z } from "zod";
import { DELIVERY_STAGES, PRODUCT_OUTCOME_STATUSES } from "../types/delivery.js";
import { multilineTextSchema } from "./text.js";

const evidenceSchema = z.array(z.record(z.string(), z.unknown())).max(100);

export const createDeliverySchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  problemStatement: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  decisionContract: z.record(z.string(), z.unknown()),
  ownerAgentId: z.string().uuid().nullable().optional(),
  outcomeStatement: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  acceptanceCriteria: evidenceSchema.min(1),
  taskIssueIds: z.array(z.string().uuid()).max(50).optional().default([]),
}).strict();

export const transitionDeliverySchema = z.object({
  toStage: z.enum(DELIVERY_STAGES),
  idempotencyKey: z.string().trim().min(1).max(300),
  evidence: evidenceSchema.optional().default([]),
  localSha: z.string().trim().min(7).max(64).nullable().optional(),
  originSha: z.string().trim().min(7).max(64).nullable().optional(),
  integrationSha: z.string().trim().min(7).max(64).nullable().optional(),
  deployedSha: z.string().trim().min(7).max(64).nullable().optional(),
  deploymentUrl: z.string().url().max(2000).nullable().optional(),
  blocker: z.string().trim().max(5000).nullable().optional(),
  needsDecision: z.boolean().optional(),
}).strict();

export const updateDeliveryStatusSchema = z.object({
  blocker: z.string().trim().max(5000).nullable().optional(),
  needsDecision: z.boolean().optional(),
  localSha: z.string().trim().min(7).max(64).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one status field is required");

export const updateProductOutcomeSchema = z.object({
  status: z.enum(PRODUCT_OUTCOME_STATUSES),
  evidence: evidenceSchema.optional().default([]),
}).strict();

export const listDeliveriesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  stage: z.enum(DELIVERY_STAGES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type CreateDelivery = z.infer<typeof createDeliverySchema>;
export type TransitionDelivery = z.infer<typeof transitionDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;
export type UpdateProductOutcome = z.infer<typeof updateProductOutcomeSchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
