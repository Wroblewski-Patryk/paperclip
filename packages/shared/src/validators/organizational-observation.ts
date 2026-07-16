import { z } from "zod";
import {
  CAUSAL_ROLES,
  EXTERNAL_SIGNAL_CATEGORIES,
  LEARNING_TARGET_KINDS,
  ORGANIZATIONAL_OBSERVATION_KINDS,
  ORGANIZATIONAL_OBSERVATION_STATUSES,
  OUTCOME_LAYERS,
  OUTCOME_RESULTS,
} from "../types/organizational-observation.js";
import { organizationalEvidenceRefSchema } from "./organizational-record.js";
import { multilineTextSchema } from "./text.js";

const isoDateTime = z.string().datetime({ offset: true });
const nullableUuid = z.string().uuid().nullable().optional();
const measurementSchema = z.object({
  name: z.string().trim().min(1).max(200),
  value: z.union([z.number(), z.string().trim().min(1).max(500)]),
  unit: z.string().trim().max(80).nullable().optional(),
  baseline: z.union([z.number(), z.string().trim().max(500)]).nullable().optional(),
  target: z.union([z.number(), z.string().trim().max(500)]).nullable().optional(),
});
const promotionTargetSchema = z.object({
  kind: z.enum(LEARNING_TARGET_KINDS),
  ref: z.string().trim().min(1).max(1000),
  label: z.string().trim().max(300).nullable().optional(),
});

const commonFields = {
  title: z.string().trim().min(1).max(300),
  summary: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  sourceClass: z.string().trim().min(1).max(100),
  provenance: z.array(organizationalEvidenceRefSchema).min(1).max(100),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  observedAt: isoDateTime,
  validUntil: isoDateTime.nullable().optional(),
  freshnessWindowHours: z.number().int().min(1).max(8760).nullable().optional(),
  goalId: nullableUuid,
  projectId: nullableUuid,
  issueId: nullableUuid,
  agentId: nullableUuid,
  runId: nullableUuid,
  parentObservationId: nullableUuid,
  supersedesId: nullableUuid,
  measurement: measurementSchema.nullable().optional(),
};

export const createOrganizationalObservationSchema = z.union([
  z.object({
    kind: z.literal("outcome"), status: z.enum(["active", "verified", "disputed", "superseded", "archived"]).optional().default("active"),
    outcomeLayer: z.enum(OUTCOME_LAYERS), outcomeResult: z.enum(OUTCOME_RESULTS), ...commonFields,
  }),
  z.object({
    kind: z.literal("causal"), status: z.enum(["proposed", "accepted", "disputed", "superseded", "archived"]).optional().default("proposed"),
    causalRole: z.enum(CAUSAL_ROLES), ...commonFields,
  }),
  z.object({
    kind: z.literal("external_signal"), status: z.enum(["current", "stale", "contradicted", "superseded", "archived"]).optional().default("current"),
    externalCategory: z.enum(EXTERNAL_SIGNAL_CATEGORIES), ...commonFields,
  }).superRefine((value, ctx) => {
    if (!value.validUntil && !value.freshnessWindowHours) {
      ctx.addIssue({ code: "custom", path: ["freshnessWindowHours"], message: "External signals require validUntil or freshnessWindowHours" });
    }
  }),
  z.object({
    kind: z.literal("learning"), status: z.literal("proposed").optional().default("proposed"),
    promotionTarget: promotionTargetSchema.nullable().optional(), ...commonFields,
  }),
]);

const updateFieldsSchema = z.object({
  status: z.enum(ORGANIZATIONAL_OBSERVATION_STATUSES).optional(),
  title: commonFields.title.optional(),
  summary: commonFields.summary.optional(),
  sourceClass: commonFields.sourceClass.optional(),
  provenance: commonFields.provenance.optional(),
  confidence: commonFields.confidence,
  observedAt: commonFields.observedAt.optional(),
  validUntil: commonFields.validUntil,
  freshnessWindowHours: commonFields.freshnessWindowHours,
  goalId: commonFields.goalId,
  projectId: commonFields.projectId,
  issueId: commonFields.issueId,
  agentId: commonFields.agentId,
  runId: commonFields.runId,
  parentObservationId: commonFields.parentObservationId,
  supersedesId: commonFields.supersedesId,
  outcomeLayer: z.enum(OUTCOME_LAYERS).nullable().optional(),
  outcomeResult: z.enum(OUTCOME_RESULTS).nullable().optional(),
  causalRole: z.enum(CAUSAL_ROLES).nullable().optional(),
  externalCategory: z.enum(EXTERNAL_SIGNAL_CATEGORIES).nullable().optional(),
  measurement: measurementSchema.nullable().optional(),
  promotionTarget: promotionTargetSchema.nullable().optional(),
}).strict();
export const updateOrganizationalObservationSchema = updateFieldsSchema;

export const listOrganizationalObservationsQuerySchema = z.object({
  kind: z.enum(ORGANIZATIONAL_OBSERVATION_KINDS).optional(),
  status: z.enum(ORGANIZATIONAL_OBSERVATION_STATUSES).optional(),
  projectId: z.string().uuid().optional(),
  issueId: z.string().uuid().optional(),
  attention: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type CreateOrganizationalObservation = z.infer<typeof createOrganizationalObservationSchema>;
export type UpdateOrganizationalObservation = z.infer<typeof updateOrganizationalObservationSchema>;
export type ListOrganizationalObservationsQuery = z.infer<typeof listOrganizationalObservationsQuerySchema>;
