import { z } from "zod";

export const proposeAssignmentSchema = z.object({
  proposedAssigneeAgentId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(300),
  reason: z.string().trim().min(1).max(5000),
  evidenceHash: z.string().trim().min(1).max(256).optional(),
  routingMode: z.enum(["direct_child", "product_delivery_fast_path"]).optional().default("direct_child"),
  deliveryId: z.string().uuid().optional(),
  scopeContract: z.record(z.string(), z.unknown()),
  budgetContract: z.record(z.string(), z.unknown()),
  acceptanceCriteria: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
  reviewerAgentId: z.string().uuid(),
}).strict().superRefine((value, ctx) => {
  if (value.routingMode === "product_delivery_fast_path" && !value.deliveryId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryId"], message: "Fast-path assignment requires deliveryId" });
  }
});

export type ProposeAssignment = z.infer<typeof proposeAssignmentSchema>;
