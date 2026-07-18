import { z } from "zod";

export const softwarehouseIssueTemplateKindSchema = z.enum([
  "task",
  "bug",
  "feature",
  "qa",
  "release",
  "work-report",
  "adr",
  "agent-role",
]);

export const softwarehouseIssueTemplateSchema = z.object({
  kind: softwarehouseIssueTemplateKindSchema,
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  useCase: z.string().min(1),
  path: z.string().min(1),
  body: z.string().min(1),
  defaultDocumentKey: z.string().min(1).nullable(),
});

export const softwarehouseIssueTemplateCatalogResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  templates: z.array(softwarehouseIssueTemplateSchema),
});

export const softwarehouseControlGateSchema = z.object({
  project: z.string().nullable(),
  rootBlocker: z.string().nullable(),
  owner: z.string().nullable(),
  evidenceRequired: z.string().nullable(),
  operatorPrompt: z.string().nullable(),
});

export const softwarehouseProjectTruthGapSchema = z.object({
  kind: z.string().nullable(),
  severity: z.string().nullable(),
  userFlow: z.string().nullable(),
  summary: z.string().nullable(),
  nextOwner: z.string().nullable(),
  nextAction: z.string().nullable(),
  risk: z.string().nullable(),
});

export const softwarehouseProjectTruthStatusSchema = z.object({
  name: z.string(),
  ok: z.boolean().nullable(),
  publicProbeStatus: z.string().nullable(),
  projectTruthStatus: z.string().nullable(),
  totalGaps: z.number().int().nonnegative(),
  firstGap: softwarehouseProjectTruthGapSchema.nullable(),
});

export const softwarehouseControlStatusResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  observedAt: z.string().datetime().nullable(),
  sourcePath: z.string(),
  available: z.boolean(),
  stale: z.boolean(),
  staleAfterSeconds: z.number().int().positive(),
  ageSeconds: z.number().int().nonnegative().nullable(),
  auditOverall: z.string().nullable(),
  controlDecision: z.string().nullable(),
  effectiveOperatingPosture: z.string().nullable(),
  supervisionReady: z.boolean().nullable(),
  fullDeliveryReady: z.boolean().nullable(),
  activeRunCount: z.number().int().nonnegative().nullable(),
  liveRunCount: z.number().int().nonnegative().nullable(),
  operatorActionStatus: z.string().nullable(),
  headline: z.string().nullable(),
  recommendedAction: z.string().nullable(),
  primaryNextAction: z.string().nullable(),
  deliveryPermission: z.object({
    protectedDeliveryAllowed: z.boolean().nullable(),
    projectRepoMutationAllowed: z.boolean().nullable(),
    canStartNewLane: z.boolean().nullable(),
    allowedLaneTypes: z.array(z.string()),
    reason: z.string().nullable(),
  }),
  blockedGates: z.array(softwarehouseControlGateSchema),
  dirtyProjects: z.array(z.string()),
  allowedWhileBlocked: z.array(z.string()),
  forbiddenWhileBlocked: z.array(z.string()),
  requiredBeforeFullDelivery: z.array(z.string()),
  nextControlActions: z.array(z.string()),
  projectTruth: z.object({
    projectCount: z.number().int().nonnegative(),
    projectsWithGaps: z.number().int().nonnegative(),
    criticalRuntimeFindings: z.number().int().nonnegative(),
    totalGaps: z.number().int().nonnegative(),
    projects: z.array(softwarehouseProjectTruthStatusSchema),
  }),
});

export type SoftwarehouseIssueTemplateKind = z.infer<typeof softwarehouseIssueTemplateKindSchema>;
export type SoftwarehouseIssueTemplate = z.infer<typeof softwarehouseIssueTemplateSchema>;
export type SoftwarehouseIssueTemplateCatalogResponse = z.infer<typeof softwarehouseIssueTemplateCatalogResponseSchema>;
export type SoftwarehouseControlGate = z.infer<typeof softwarehouseControlGateSchema>;
export type SoftwarehouseProjectTruthGap = z.infer<typeof softwarehouseProjectTruthGapSchema>;
export type SoftwarehouseProjectTruthStatus = z.infer<typeof softwarehouseProjectTruthStatusSchema>;
export type SoftwarehouseControlStatusResponse = z.infer<typeof softwarehouseControlStatusResponseSchema>;
