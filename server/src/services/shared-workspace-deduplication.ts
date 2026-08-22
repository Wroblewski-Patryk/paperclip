import { and, desc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { activityLog, executionWorkspaces, issues, type Db } from "@paperclipai/db";
import { canonicalWorkspacePath } from "./workspace-path-identity.js";

type SharedWorkspaceRow = {
  id: string;
  companyId: string;
  projectId: string;
  projectWorkspaceId: string | null;
  sourceIssueId: string | null;
  name: string;
  cwd: string | null;
  lastUsedAt: Date;
};

function keyFor(row: SharedWorkspaceRow) {
  if (row.sourceIssueId && row.projectWorkspaceId) {
    return JSON.stringify([row.companyId, row.sourceIssueId, row.projectWorkspaceId]);
  }
  return JSON.stringify([
    row.companyId,
    row.projectId,
    row.projectWorkspaceId,
    `unscoped:${row.name}`,
    canonicalWorkspacePath(row.cwd),
  ]);
}

export function selectDuplicateSharedWorkspaceIds(
  rowsNewestFirst: SharedWorkspaceRow[],
  referencedWorkspaceIds: ReadonlySet<string>,
) {
  const referencedKeys = new Set(
    rowsNewestFirst.filter((row) => referencedWorkspaceIds.has(row.id)).map(keyFor),
  );
  const canonicalByKey = new Set<string>();
  const archiveIds: string[] = [];
  for (const row of rowsNewestFirst) {
    const key = keyFor(row);
    if (referencedKeys.has(key)) {
      if (!referencedWorkspaceIds.has(row.id)) archiveIds.push(row.id);
      continue;
    }
    if (referencedWorkspaceIds.has(row.id)) {
      canonicalByKey.add(key);
      continue;
    }
    if (!canonicalByKey.has(key)) {
      canonicalByKey.add(key);
      continue;
    }
    archiveIds.push(row.id);
  }
  return archiveIds;
}

export async function archiveDuplicateSharedExecutionWorkspaces(
  db: Db,
  options: { companyId?: string; dryRun?: boolean } = {},
) {
  const workspaceConditions = [
    eq(executionWorkspaces.mode, "shared_workspace"),
    inArray(executionWorkspaces.status, ["active", "idle", "in_review"]),
  ];
  if (options.companyId) workspaceConditions.push(eq(executionWorkspaces.companyId, options.companyId));
  const rows = await db
    .select({
      id: executionWorkspaces.id,
      companyId: executionWorkspaces.companyId,
      projectId: executionWorkspaces.projectId,
      projectWorkspaceId: executionWorkspaces.projectWorkspaceId,
      sourceIssueId: executionWorkspaces.sourceIssueId,
      name: executionWorkspaces.name,
      cwd: executionWorkspaces.cwd,
      lastUsedAt: executionWorkspaces.lastUsedAt,
    })
    .from(executionWorkspaces)
    .where(and(...workspaceConditions))
    .orderBy(desc(executionWorkspaces.lastUsedAt), desc(executionWorkspaces.createdAt));
  const issueRefConditions = [isNotNull(issues.executionWorkspaceId)];
  if (options.companyId) issueRefConditions.push(eq(issues.companyId, options.companyId));
  const issueRefs = await db
    .select({ executionWorkspaceId: issues.executionWorkspaceId })
    .from(issues)
    .where(and(...issueRefConditions));
  const referencedIds = new Set(issueRefs.map((row) => row.executionWorkspaceId!).filter(Boolean));
  const archiveIds = selectDuplicateSharedWorkspaceIds(rows, referencedIds);
  const archivedAt = new Date();
  const terminalIssueConditions = [inArray(issues.status, ["done", "cancelled"]), isNotNull(issues.executionWorkspaceId)];
  if (options.companyId) terminalIssueConditions.push(eq(issues.companyId, options.companyId));
  const terminalWorkspaceIds = await db
    .select({ executionWorkspaceId: issues.executionWorkspaceId })
    .from(issues)
    .where(and(...terminalIssueConditions))
    .then((items) => items.map((item) => item.executionWorkspaceId!).filter(Boolean));
  const expiredWorkspaceIds = terminalWorkspaceIds.length === 0
    ? []
    : await db
        .select({ id: executionWorkspaces.id })
        .from(executionWorkspaces)
        .where(and(
          inArray(executionWorkspaces.id, terminalWorkspaceIds),
          eq(executionWorkspaces.mode, "shared_workspace"),
          eq(executionWorkspaces.status, "idle"),
          lte(executionWorkspaces.cleanupEligibleAt, archivedAt),
        ))
        .then((items) => items.map((item) => item.id));

  if (!options.dryRun) {
    for (let offset = 0; offset < archiveIds.length; offset += 500) {
      await db
        .update(executionWorkspaces)
        .set({
          status: "archived",
          closedAt: archivedAt,
          cleanupEligibleAt: archivedAt,
          cleanupReason: "deduplicated_shared_workspace_history",
          updatedAt: archivedAt,
        })
        .where(inArray(executionWorkspaces.id, archiveIds.slice(offset, offset + 500)));
    }
    for (let offset = 0; offset < expiredWorkspaceIds.length; offset += 500) {
      await db
        .update(executionWorkspaces)
        .set({
          status: "archived",
          closedAt: archivedAt,
          cleanupReason: "terminal_issue_retention_elapsed",
          updatedAt: archivedAt,
        })
        .where(inArray(executionWorkspaces.id, expiredWorkspaceIds.slice(offset, offset + 500)));
    }
  }

  const archivedByCompany = new Map<string, number>();
  const archivedSet = new Set(archiveIds);
  for (const row of rows) {
    if (archivedSet.has(row.id)) {
      archivedByCompany.set(row.companyId, (archivedByCompany.get(row.companyId) ?? 0) + 1);
    }
  }
  if (!options.dryRun) {
    for (const [companyId, archivedCount] of archivedByCompany) {
      await db.insert(activityLog).values({
        companyId,
        actorType: "system",
        actorId: "shared-workspace-deduplication",
        action: "execution_workspaces_deduplicated",
        entityType: "company",
        entityId: companyId,
        details: { archivedCount, preservedReferencedCount: referencedIds.size },
      });
    }
  }

  return {
    dryRun: options.dryRun === true,
    scanned: rows.length,
    duplicateCount: archiveIds.length,
    archived: options.dryRun ? 0 : archiveIds.length,
    expiredCount: expiredWorkspaceIds.length,
    expiredArchived: options.dryRun ? 0 : expiredWorkspaceIds.length,
    referenced: referencedIds.size,
    retained: rows.length - archiveIds.length,
  };
}
