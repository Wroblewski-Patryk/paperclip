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
  portfolio: z.object({
    paperclipProjectName: z.string(),
    lifecycleStage: z.string(),
    offeringType: z.string(),
    ownerSurface: z.object({
      system: z.string(),
      role: z.enum(["owner_facing_aggregate", "represented_in_aggregate"]),
      publicationStatus: z.enum(["live", "source_only", "unavailable"]),
      sourcePath: z.string(),
      sourceUpdatedAt: z.string().datetime().nullable(),
      publicUrl: z.string().url().nullable(),
    }).nullable(),
    sourceControl: z.object({
      branch: z.string().nullable(),
      headSha: z.string().nullable(),
      observedAt: z.string().datetime().nullable(),
    }),
    deployment: z.object({
      status: z.enum(["reachable", "unreachable", "not_configured"]),
      deployedSha: z.string().nullable(),
      observedAt: z.string().datetime(),
      productUrl: z.string().url().nullable(),
      buildInfoUrl: z.string().url().nullable(),
    }),
    versionAlignment: z.enum(["aligned", "different", "unknown"]),
    commercialReadiness: z.object({
      status: z.string().nullable(),
      version: z.string().nullable(),
      owner: z.string().nullable(),
      lastReviewed: z.string().nullable(),
      decision: z.string().nullable(),
      nextGate: z.string().nullable(),
      sourcePath: z.string(),
      sourceUpdatedAt: z.string().datetime().nullable(),
    }).nullable(),
  }).nullable(),
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

export const softwarehouseProjectTruthProbeRequestSchema = z.object({
  url: z.string().url().max(2_048),
}).strict();

export const softwarehouseProjectTruthProbeResponseSchema = z.object({
  outcome: z.enum(["response", "network_error"]),
  url: z.string().url().max(240),
  httpStatus: z.number().int().min(100).max(599).nullable(),
  contentType: z.string().max(120).nullable(),
  body: z.string().max(32_768).nullable(),
  error: z.object({
    name: z.string().max(80),
    message: z.string().max(240),
    code: z.string().max(80).nullable(),
  }).strict().nullable(),
}).strict();

export const softwarehouseProviderHttpResultCategorySchema = z.enum([
  "success",
  "auth_error",
  "not_found",
  "client_error",
  "provider_error",
  "redirect_blocked",
  "network_error",
  "invalid_response",
  "invalid_target",
  "not_attempted",
]);

export const softwarehouseCoolifyFeatherlyInventoryResponseSchema = z.object({
  observedAt: z.string().datetime(),
  outcome: z.enum([
    "verified",
    "provider_error",
    "scope_mismatch",
    "invalid_runtime_binding",
  ]),
  providerHost: z.string().min(1).max(253),
  target: z.object({
    projectUuid: z.literal("a14a7zgzt6r13wtqxe5c916y"),
    environmentUuid: z.literal("gz5uke25v3tpqcc0o47gyw2e"),
    applicationUuid: z.literal("dc1mn3hep62twm6ih582kblw"),
  }).strict(),
  http: z.object({
    project: softwarehouseProviderHttpResultCategorySchema,
    environment: softwarehouseProviderHttpResultCategorySchema,
    application: softwarehouseProviderHttpResultCategorySchema,
  }).strict(),
  scopeVerified: z.object({
    project: z.boolean(),
    environment: z.boolean(),
    application: z.boolean(),
  }).strict(),
  project: z.object({
    uuid: z.literal("a14a7zgzt6r13wtqxe5c916y"),
    name: z.string().max(240).nullable(),
  }).strict().nullable(),
  environment: z.object({
    uuid: z.literal("gz5uke25v3tpqcc0o47gyw2e"),
    name: z.string().max(240).nullable(),
  }).strict().nullable(),
  application: z.object({
    uuid: z.literal("dc1mn3hep62twm6ih582kblw"),
    name: z.string().max(240).nullable(),
    status: z.string().max(120).nullable(),
    fqdn: z.string().max(500).nullable(),
    gitBranch: z.string().max(240).nullable(),
    gitCommitSha: z.string().max(120).nullable(),
    updatedAt: z.string().max(120).nullable(),
  }).strict().nullable(),
  auditRef: z.string().min(1).max(240),
  sessionRef: z.string().min(1).max(240),
  providerWriteAttempted: z.literal(false),
  requestMethods: z.array(z.literal("GET")).min(1).max(3),
  secretsReturned: z.literal(false),
}).strict();

export const roostBridgePortfolioSchemaVersion = "1.0" as const;
export const roostBridgePortfolioRouteVersion = "v1" as const;
export const roostBridgePortfolioSourceVersion = "softwarehouse-status-v1" as const;

const boundedCountMapSchema = z.record(z.string(), z.number().int().nonnegative());

export const roostBridgePortfolioAggregateSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: boundedCountMapSchema,
  limit: z.number().int().positive(),
  truncated: z.boolean(),
}).strict();

export const roostBridgePortfolioItemSchema = z.object({
  offeringId: z.string().min(1),
  companyId: z.string().min(1),
  paperclipProjectId: z.string().min(1).nullable(),
  paperclipProjectName: z.string().min(1),
  paperclipProjectLink: z.string().min(1).nullable(),
  lifecycleStage: z.string().min(1),
  offeringType: z.string().min(1),
  mappingState: z.enum(["mapped", "unmapped"]),
  conflictState: z.enum([
    "none",
    "project_mapping_conflict",
    "owner_surface_unavailable",
  ]),
  supersessionState: z.enum(["current", "superseded", "unknown"]),
  sourceControl: z.object({
    branch: z.string().nullable(),
    sourceSha: z.string().nullable(),
    deployedSha: z.string().nullable(),
    versionAlignment: z.enum(["aligned", "different", "unknown"]),
  }).strict(),
  execution: z.object({
    deliveryStage: z.string().nullable(),
    outcome: z.string().nullable(),
    ownerAgentId: z.string().uuid().nullable(),
    blocker: z.string().nullable(),
    needsDecision: z.boolean(),
    lastUpdated: z.string().datetime().nullable(),
    freshness: z.enum(["fresh", "stale", "unknown"]),
    lagMs: z.number().int().nonnegative().nullable(),
    quotaStatus: z.enum(["normal", "throttled", "held", "unknown"]),
  }).strict().optional().default({
    deliveryStage: null,
    outcome: null,
    ownerAgentId: null,
    blocker: null,
    needsDecision: false,
    lastUpdated: null,
    freshness: "unknown",
    lagMs: null,
    quotaStatus: "unknown",
  }),
  readiness: z.object({
    status: z.enum(["GO", "NO-GO", "UNKNOWN"]),
    decision: z.string().nullable(),
    evidenceState: z.enum(["complete", "missing", "unknown"]),
    zeroGapButNoGo: z.boolean(),
    totalGaps: z.number().int().nonnegative(),
    nextGate: z.string().nullable(),
  }).strict(),
  aggregates: z.object({
    issues: roostBridgePortfolioAggregateSchema.extend({
      withCompletionEvidence: z.number().int().nonnegative(),
    }).strict(),
    runs: roostBridgePortfolioAggregateSchema,
    approvals: roostBridgePortfolioAggregateSchema.extend({
      pending: z.number().int().nonnegative(),
    }).strict(),
    evidence: roostBridgePortfolioAggregateSchema.extend({
      healthy: z.number().int().nonnegative(),
      reviewed: z.number().int().nonnegative(),
    }).strict(),
  }).strict(),
  provenance: z.object({
    controlStatusPath: z.string().min(1),
    controlStatusObservedAt: z.string().datetime().nullable(),
    readinessSourcePath: z.string().min(1).nullable(),
    readinessSourceUpdatedAt: z.string().datetime().nullable(),
    ownerSurfacePath: z.string().min(1).nullable(),
    ownerSurfaceUpdatedAt: z.string().datetime().nullable(),
  }).strict(),
}).strict();

export const roostBridgePortfolioProjectionSchema = z.object({
  schemaVersion: z.literal(roostBridgePortfolioSchemaVersion),
  sourceVersion: z.literal(roostBridgePortfolioSourceVersion),
  compatibility: z.object({
    routeVersion: z.literal(roostBridgePortfolioRouteVersion),
    supportedSchemaVersions: z.tuple([z.literal(roostBridgePortfolioSchemaVersion)]),
    backwardCompatibleWith: z.tuple([]),
  }).strict(),
  observedAt: z.string().datetime(),
  companyId: z.string().min(1),
  sourceSnapshotId: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  sourceState: z.enum(["available", "unavailable", "timed_out"]),
  stale: z.boolean(),
  conflictState: z.enum([
    "none",
    "source_unavailable",
    "project_mapping_conflict",
    "owner_surface_unavailable",
  ]),
  supersessionState: z.enum(["current", "superseded", "unknown"]),
  failure: z.object({
    code: z.enum(["source_unavailable", "source_timeout"]),
    retryable: z.boolean(),
  }).strict().nullable(),
  items: z.array(roostBridgePortfolioItemSchema),
}).strict();

export type SoftwarehouseIssueTemplateKind = z.infer<typeof softwarehouseIssueTemplateKindSchema>;
export type SoftwarehouseIssueTemplate = z.infer<typeof softwarehouseIssueTemplateSchema>;
export type SoftwarehouseIssueTemplateCatalogResponse = z.infer<typeof softwarehouseIssueTemplateCatalogResponseSchema>;
export type SoftwarehouseControlGate = z.infer<typeof softwarehouseControlGateSchema>;
export type SoftwarehouseProjectTruthGap = z.infer<typeof softwarehouseProjectTruthGapSchema>;
export type SoftwarehouseProjectTruthStatus = z.infer<typeof softwarehouseProjectTruthStatusSchema>;
export type SoftwarehouseControlStatusResponse = z.infer<typeof softwarehouseControlStatusResponseSchema>;
export type SoftwarehouseProjectTruthProbeRequest = z.infer<typeof softwarehouseProjectTruthProbeRequestSchema>;
export type SoftwarehouseProjectTruthProbeResponse = z.infer<typeof softwarehouseProjectTruthProbeResponseSchema>;
export type SoftwarehouseProviderHttpResultCategory = z.infer<typeof softwarehouseProviderHttpResultCategorySchema>;
export type SoftwarehouseCoolifyFeatherlyInventoryResponse = z.infer<typeof softwarehouseCoolifyFeatherlyInventoryResponseSchema>;
export type RoostBridgePortfolioAggregate = z.infer<typeof roostBridgePortfolioAggregateSchema>;
export type RoostBridgePortfolioItem = z.infer<typeof roostBridgePortfolioItemSchema>;
export type RoostBridgePortfolioProjection = z.infer<typeof roostBridgePortfolioProjectionSchema>;
