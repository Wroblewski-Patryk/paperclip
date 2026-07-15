import { z } from "zod";
import {
  ASSUMPTION_STATUSES,
  COMMITMENT_STATUSES,
  DECISION_STATUSES,
  ORGANIZATIONAL_RECORD_KINDS,
} from "../types/organizational-record.js";
import { multilineTextSchema } from "./text.js";

const isoDateTime = z.string().datetime({ offset: true });
const nullableUuid = z.string().uuid().nullable().optional();

export const organizationalEvidenceRefSchema = z.object({
  kind: z.enum(["issue", "work_product", "document", "approval", "metric", "external", "other"]),
  ref: z.string().trim().min(1).max(1000),
  label: z.string().trim().max(300).nullable().optional(),
  observedAt: isoDateTime.nullable().optional(),
});

const fields = {
  title: z.string().trim().min(1).max(300),
  statement: multilineTextSchema.pipe(z.string().min(1).max(20_000)),
  rationale: multilineTextSchema.pipe(z.string().max(20_000)).nullable().optional(),
  consequences: multilineTextSchema.pipe(z.string().max(20_000)).nullable().optional(),
  resolution: multilineTextSchema.pipe(z.string().max(20_000)).nullable().optional(),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  ownerAgentId: nullableUuid,
  ownerUserId: z.string().trim().min(1).max(300).nullable().optional(),
  goalId: nullableUuid,
  projectId: nullableUuid,
  issueId: nullableUuid,
  supersedesId: nullableUuid,
  evidence: z.array(organizationalEvidenceRefSchema).max(100).optional(),
  dueAt: isoDateTime.nullable().optional(),
  reviewAt: isoDateTime.nullable().optional(),
  expiresAt: isoDateTime.nullable().optional(),
};
const organizationalRecordFieldsSchema = z.object(fields);

export const createOrganizationalRecordSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assumption"), status: z.enum(ASSUMPTION_STATUSES).optional().default("active"), ...fields }),
  z.object({ kind: z.literal("commitment"), status: z.enum(COMMITMENT_STATUSES).optional().default("proposed"), ...fields }),
  z.object({ kind: z.literal("decision"), status: z.enum(DECISION_STATUSES).optional().default("proposed"), ...fields }),
]);

export const updateOrganizationalRecordSchema = organizationalRecordFieldsSchema.partial().extend({
  status: z.union([z.enum(ASSUMPTION_STATUSES), z.enum(COMMITMENT_STATUSES), z.enum(DECISION_STATUSES)]).optional(),
}).strict();

export const listOrganizationalRecordsQuerySchema = z.object({
  kind: z.enum(ORGANIZATIONAL_RECORD_KINDS).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  ownerAgentId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  issueId: z.string().uuid().optional(),
  attention: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type CreateOrganizationalRecord = z.infer<typeof createOrganizationalRecordSchema>;
export type UpdateOrganizationalRecord = z.infer<typeof updateOrganizationalRecordSchema>;
export type ListOrganizationalRecordsQuery = z.infer<typeof listOrganizationalRecordsQuerySchema>;
