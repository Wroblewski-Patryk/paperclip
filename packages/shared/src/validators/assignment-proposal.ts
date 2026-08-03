import { z } from "zod";

export const proposeAssignmentSchema = z.object({
  proposedAssigneeAgentId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(300),
  reason: z.string().trim().min(1).max(5000),
  evidenceHash: z.string().trim().min(1).max(256).optional(),
}).strict();

export type ProposeAssignment = z.infer<typeof proposeAssignmentSchema>;
