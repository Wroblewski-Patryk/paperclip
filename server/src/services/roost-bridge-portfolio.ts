import { createHash } from "node:crypto";
import type { Db } from "@paperclipai/db";
import {
  approvals,
  companies,
  heartbeatRuns,
  issueApprovals,
  issues,
  issueWorkProducts,
  projects,
} from "@paperclipai/db";
import {
  roostBridgePortfolioProjectionSchema,
  roostBridgePortfolioRouteVersion,
  roostBridgePortfolioSchemaVersion,
  roostBridgePortfolioSourceVersion,
  type RoostBridgePortfolioItem,
  type RoostBridgePortfolioProjection,
  type SoftwarehouseControlStatusResponse,
} from "@paperclipai/shared";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const MAX_PROJECTS = 100;
const MAX_AGGREGATE_ROWS = 2_000;
const DEFAULT_SOURCE_TIMEOUT_MS = 7_000;

interface PortfolioCompanyRow {
  id: string;
  issuePrefix: string;
}

interface PortfolioProjectRow {
  id: string;
  name: string;
}

interface PortfolioIssueRow {
  id: string;
  projectId: string | null;
  status: string;
  checkoutRunId: string | null;
  executionRunId: string | null;
  completionEvidence: unknown;
}

interface PortfolioRunRow {
  id: string;
  status: string;
}

interface PortfolioApprovalRow {
  id: string;
  projectId: string | null;
  status: string;
}

interface PortfolioEvidenceRow {
  id: string;
  projectId: string | null;
  status: string;
  reviewState: string;
  healthStatus: string;
}

export interface RoostBridgePortfolioData {
  company: PortfolioCompanyRow | null;
  projects: PortfolioProjectRow[];
  issues: PortfolioIssueRow[];
  runs: PortfolioRunRow[];
  approvals: PortfolioApprovalRow[];
  evidence: PortfolioEvidenceRow[];
  truncated: boolean;
}

export interface RoostBridgePortfolioRepository {
  load(companyId: string, projectNames: string[]): Promise<RoostBridgePortfolioData>;
}

function takeBounded<T>(rows: T[], limit = MAX_AGGREGATE_ROWS) {
  return {
    rows: rows.slice(0, limit),
    truncated: rows.length > limit,
  };
}

export function createRoostBridgePortfolioRepository(db: Db): RoostBridgePortfolioRepository {
  return {
    async load(companyId, projectNames) {
      const [company] = await db
        .select({ id: companies.id, issuePrefix: companies.issuePrefix })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company || projectNames.length === 0) {
        return {
          company: company ?? null,
          projects: [],
          issues: [],
          runs: [],
          approvals: [],
          evidence: [],
          truncated: false,
        };
      }

      const projectResult = takeBounded(await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(and(
          eq(projects.companyId, companyId),
          inArray(projects.name, [...new Set(projectNames)]),
        ))
        .limit(MAX_PROJECTS + 1), MAX_PROJECTS);
      const projectIds = projectResult.rows.map((project) => project.id);

      if (projectIds.length === 0) {
        return {
          company,
          projects: [],
          issues: [],
          runs: [],
          approvals: [],
          evidence: [],
          truncated: projectResult.truncated,
        };
      }

      const issueResult = takeBounded(await db
        .select({
          id: issues.id,
          projectId: issues.projectId,
          status: issues.status,
          checkoutRunId: issues.checkoutRunId,
          executionRunId: issues.executionRunId,
          completionEvidence: issues.completionEvidence,
        })
        .from(issues)
        .where(and(eq(issues.companyId, companyId), inArray(issues.projectId, projectIds)))
        .limit(MAX_AGGREGATE_ROWS + 1));

      const runIds = [...new Set(issueResult.rows.flatMap((issue) => [
        issue.checkoutRunId,
        issue.executionRunId,
      ]).filter((id): id is string => Boolean(id)))];
      const runResult = takeBounded(runIds.length === 0 ? [] : await db
        .select({ id: heartbeatRuns.id, status: heartbeatRuns.status })
        .from(heartbeatRuns)
        .where(and(eq(heartbeatRuns.companyId, companyId), inArray(heartbeatRuns.id, runIds)))
        .limit(MAX_AGGREGATE_ROWS + 1));

      const approvalResult = takeBounded(await db
        .select({ id: approvals.id, projectId: issues.projectId, status: approvals.status })
        .from(issueApprovals)
        .innerJoin(issues, eq(issueApprovals.issueId, issues.id))
        .innerJoin(approvals, eq(issueApprovals.approvalId, approvals.id))
        .where(and(
          eq(issueApprovals.companyId, companyId),
          eq(issues.companyId, companyId),
          eq(approvals.companyId, companyId),
          inArray(issues.projectId, projectIds),
        ))
        .limit(MAX_AGGREGATE_ROWS + 1));

      const evidenceResult = takeBounded(await db
        .select({
          id: issueWorkProducts.id,
          projectId: issueWorkProducts.projectId,
          status: issueWorkProducts.status,
          reviewState: issueWorkProducts.reviewState,
          healthStatus: issueWorkProducts.healthStatus,
        })
        .from(issueWorkProducts)
        .where(and(
          eq(issueWorkProducts.companyId, companyId),
          inArray(issueWorkProducts.projectId, projectIds),
        ))
        .limit(MAX_AGGREGATE_ROWS + 1));

      return {
        company,
        projects: projectResult.rows,
        issues: issueResult.rows,
        runs: runResult.rows,
        approvals: approvalResult.rows,
        evidence: evidenceResult.rows,
        truncated: projectResult.truncated
          || issueResult.truncated
          || runResult.truncated
          || approvalResult.truncated
          || evidenceResult.truncated,
      };
    },
  };
}

function countByStatus(rows: Array<{ status: string }>) {
  return Object.fromEntries(
    [...rows.reduce((counts, row) => {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function statusAggregate(rows: Array<{ status: string }>, truncated: boolean) {
  return {
    total: rows.length,
    byStatus: countByStatus(rows),
    limit: MAX_AGGREGATE_ROWS,
    truncated,
  };
}

function normalizedReadinessStatus(status: string | null, decision: string | null) {
  const value = `${status ?? ""} ${decision ?? ""}`.toUpperCase();
  if (value.includes("NO-GO") || value.includes("NO GO")) return "NO-GO" as const;
  if (/(^|\s)GO(?:\s|$|\/)/.test(value)) return "GO" as const;
  return "UNKNOWN" as const;
}

function stableOfferingId(companyId: string, projectId: string) {
  return `offering:${companyId}:${projectId}`;
}

function sourceSnapshotId(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

const provenanceTimestampSchema = z.string().datetime();

function validProvenanceTimestamp(value: string | null | undefined) {
  if (!value || !provenanceTimestampSchema.safeParse(value).success) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? { value, milliseconds } : null;
}

export function createUnavailableRoostBridgePortfolioProjection(
  companyId: string,
  observedAt: string,
  sourceState: "unavailable" | "timed_out",
): RoostBridgePortfolioProjection {
  const failureCode = sourceState === "timed_out" ? "source_timeout" : "source_unavailable";
  const basis = {
    schemaVersion: roostBridgePortfolioSchemaVersion,
    sourceVersion: roostBridgePortfolioSourceVersion,
    companyId,
    sourceState,
    failureCode,
    items: [],
  };
  return roostBridgePortfolioProjectionSchema.parse({
    schemaVersion: roostBridgePortfolioSchemaVersion,
    sourceVersion: roostBridgePortfolioSourceVersion,
    compatibility: {
      routeVersion: roostBridgePortfolioRouteVersion,
      supportedSchemaVersions: [roostBridgePortfolioSchemaVersion],
      backwardCompatibleWith: [],
    },
    observedAt,
    companyId,
    sourceSnapshotId: sourceSnapshotId(basis),
    sourceState,
    stale: true,
    conflictState: "source_unavailable",
    supersessionState: "unknown",
    failure: { code: failureCode, retryable: true },
    items: [],
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("ROOST_BRIDGE_SOURCE_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export interface BuildRoostBridgePortfolioProjectionOptions {
  companyId: string;
  sourceOwnerCompanyId: string | null;
  repository: RoostBridgePortfolioRepository;
  loadControlStatus: () => Promise<SoftwarehouseControlStatusResponse>;
  now?: Date;
  timeoutMs?: number;
}

export async function buildRoostBridgePortfolioProjection(
  options: BuildRoostBridgePortfolioProjectionOptions,
): Promise<RoostBridgePortfolioProjection> {
  const now = options.now ?? new Date();
  const observedAt = now.toISOString();
  if (!options.sourceOwnerCompanyId || options.companyId !== options.sourceOwnerCompanyId) {
    return createUnavailableRoostBridgePortfolioProjection(options.companyId, observedAt, "unavailable");
  }

  let controlStatus: SoftwarehouseControlStatusResponse;
  try {
    controlStatus = await withTimeout(
      options.loadControlStatus(),
      options.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS,
    );
  } catch (error) {
    return createUnavailableRoostBridgePortfolioProjection(
      options.companyId,
      observedAt,
      error instanceof Error && error.message === "ROOST_BRIDGE_SOURCE_TIMEOUT" ? "timed_out" : "unavailable",
    );
  }

  if (!controlStatus.available) {
    return createUnavailableRoostBridgePortfolioProjection(options.companyId, observedAt, "unavailable");
  }

  const sourceProjects = controlStatus.projectTruth.projects.filter((project) => project.portfolio);
  let data: RoostBridgePortfolioData;
  try {
    data = await withTimeout(
      options.repository.load(options.companyId, sourceProjects.map((project) => project.portfolio!.paperclipProjectName)),
      options.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS,
    );
  } catch (error) {
    return createUnavailableRoostBridgePortfolioProjection(
      options.companyId,
      observedAt,
      error instanceof Error && error.message === "ROOST_BRIDGE_SOURCE_TIMEOUT" ? "timed_out" : "unavailable",
    );
  }

  if (!data.company) {
    return createUnavailableRoostBridgePortfolioProjection(options.companyId, observedAt, "unavailable");
  }

  const projectsByName = new Map(data.projects.map((project) => [project.name.toLowerCase(), project]));
  const runStatusById = new Map(data.runs.map((run) => [run.id, run.status]));
  const hasProjectMappingConflict = sourceProjects.some(
    (sourceProject) => !projectsByName.has(sourceProject.portfolio!.paperclipProjectName.toLowerCase()),
  );
  const items = sourceProjects.flatMap<RoostBridgePortfolioItem>((sourceProject) => {
    const portfolio = sourceProject.portfolio!;
    const project = projectsByName.get(portfolio.paperclipProjectName.toLowerCase()) ?? null;
    // Never project file-backed portfolio facts without a same-company database project.
    // The top-level conflict state preserves the mismatch without leaking another company's source row.
    if (!project) return [];
    const projectIssues = data.issues.filter((issue) => issue.projectId === project.id);
    const projectRuns = [...new Set(projectIssues.flatMap((issue) => [
      issue.checkoutRunId,
      issue.executionRunId,
    ]).filter((id): id is string => Boolean(id)))]
      .map((id) => ({ id, status: runStatusById.get(id) }))
      .filter((run): run is { id: string; status: string } => Boolean(run.status));
    const projectApprovals = data.approvals.filter((approval) => approval.projectId === project.id);
    const projectEvidence = data.evidence.filter((evidence) => evidence.projectId === project.id);
    const readiness = portfolio.commercialReadiness;
    const readinessStatus = normalizedReadinessStatus(readiness?.status ?? null, readiness?.decision ?? null);
    const ownerSurfaceAvailable = portfolio.ownerSurface != null
      && portfolio.ownerSurface.publicationStatus !== "unavailable";
    const controlStatusObservedAt = validProvenanceTimestamp(controlStatus.observedAt);
    const ownerSurfaceUpdatedAt = validProvenanceTimestamp(portfolio.ownerSurface?.sourceUpdatedAt);
    const ownerSurfaceUnavailable = !ownerSurfaceAvailable;
    const conflictState = ownerSurfaceUnavailable ? "owner_surface_unavailable" as const : "none" as const;
    const supersessionState = !ownerSurfaceAvailable
      || !controlStatusObservedAt
      || !ownerSurfaceUpdatedAt
      ? "unknown" as const
      : ownerSurfaceUpdatedAt.milliseconds > controlStatusObservedAt.milliseconds
        ? "superseded" as const
        : "current" as const;

    return [{
      offeringId: stableOfferingId(options.companyId, project.id),
      companyId: options.companyId,
      paperclipProjectId: project.id,
      paperclipProjectName: portfolio.paperclipProjectName,
      paperclipProjectLink: `/${data.company!.issuePrefix}/projects/${project.id}`,
      lifecycleStage: portfolio.lifecycleStage,
      offeringType: portfolio.offeringType,
      mappingState: "mapped",
      conflictState,
      supersessionState,
      sourceControl: {
        branch: portfolio.sourceControl.branch,
        sourceSha: portfolio.sourceControl.headSha,
        deployedSha: portfolio.deployment.deployedSha,
        versionAlignment: portfolio.versionAlignment,
      },
      readiness: {
        status: readinessStatus,
        decision: readiness?.decision ?? null,
        evidenceState: readiness?.status && readiness.decision ? "complete" : "missing",
        zeroGapButNoGo: sourceProject.totalGaps === 0 && readinessStatus === "NO-GO",
        totalGaps: sourceProject.totalGaps,
        nextGate: readiness?.nextGate ?? null,
      },
      aggregates: {
        issues: {
          ...statusAggregate(projectIssues, data.truncated),
          withCompletionEvidence: projectIssues.filter((issue) => issue.completionEvidence != null).length,
        },
        runs: statusAggregate(projectRuns, data.truncated),
        approvals: {
          ...statusAggregate(projectApprovals, data.truncated),
          pending: projectApprovals.filter((approval) => approval.status === "pending").length,
        },
        evidence: {
          ...statusAggregate(projectEvidence, data.truncated),
          healthy: projectEvidence.filter((evidence) => evidence.healthStatus === "healthy").length,
          reviewed: projectEvidence.filter((evidence) => evidence.reviewState !== "none").length,
        },
      },
      provenance: {
        controlStatusPath: controlStatus.sourcePath,
        controlStatusObservedAt: controlStatusObservedAt?.value ?? null,
        readinessSourcePath: readiness?.sourcePath ?? null,
        readinessSourceUpdatedAt: readiness?.sourceUpdatedAt ?? null,
        ownerSurfacePath: portfolio.ownerSurface?.sourcePath ?? null,
        ownerSurfaceUpdatedAt: ownerSurfaceUpdatedAt?.value ?? null,
      },
    }];
  }).sort((left, right) => left.offeringId.localeCompare(right.offeringId));

  const conflictState = hasProjectMappingConflict
    ? "project_mapping_conflict" as const
    : items.some((item) => item.conflictState === "owner_surface_unavailable")
      ? "owner_surface_unavailable" as const
      : "none" as const;
  const supersessionState = conflictState !== "none"
    || items.length === 0
    || items.some((item) => item.supersessionState === "unknown")
    ? "unknown" as const
    : items.some((item) => item.supersessionState === "superseded")
      ? "superseded" as const
      : "current" as const;
  const snapshotBasis = {
    schemaVersion: roostBridgePortfolioSchemaVersion,
    sourceVersion: roostBridgePortfolioSourceVersion,
    companyId: options.companyId,
    sourceState: "available",
    stale: controlStatus.stale,
    conflictState,
    supersessionState,
    items,
  };

  return roostBridgePortfolioProjectionSchema.parse({
    schemaVersion: roostBridgePortfolioSchemaVersion,
    sourceVersion: roostBridgePortfolioSourceVersion,
    compatibility: {
      routeVersion: roostBridgePortfolioRouteVersion,
      supportedSchemaVersions: [roostBridgePortfolioSchemaVersion],
      backwardCompatibleWith: [],
    },
    observedAt,
    companyId: options.companyId,
    sourceSnapshotId: sourceSnapshotId(snapshotBasis),
    sourceState: "available",
    stale: controlStatus.stale,
    conflictState,
    supersessionState,
    failure: null,
    items,
  });
}

export const roostBridgePortfolioLimits = {
  projects: MAX_PROJECTS,
  aggregateRows: MAX_AGGREGATE_ROWS,
  sourceTimeoutMs: DEFAULT_SOURCE_TIMEOUT_MS,
} as const;
