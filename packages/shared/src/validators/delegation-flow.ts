import { z } from "zod";

export const createWorkProposalSchema = z.object({
  targetParentAgentId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  problemStatement: z.string().trim().min(1).max(10_000),
  expectedOutcome: z.string().trim().min(1).max(10_000),
  scopeContract: z.record(z.string(), z.unknown()),
  evidence: z.array(z.record(z.string(), z.unknown())).max(50).optional().default([]),
  idempotencyKey: z.string().trim().min(1).max(300),
}).strict();

export const createDelegationReportSchema = z.object({
  toParentAgentId: z.string().uuid(),
  kind: z.enum(["result", "evidence", "status", "blocker", "risk", "budget", "review", "outcome"]),
  summary: z.string().trim().min(1).max(5000),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().trim().min(1).max(300),
}).strict();

export type CreateWorkProposal = z.infer<typeof createWorkProposalSchema>;
export type CreateDelegationReport = z.infer<typeof createDelegationReportSchema>;
