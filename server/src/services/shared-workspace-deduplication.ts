import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { activityLog, executionWorkspaces, issues, type Db } from "@paperclipai/db";

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
  return JSON.stringify([
    row.companyId,
    row.projectId,
    row.projectWorkspaceId,
    row.sourceIssueId ?? `unscoped:${row.name}`,
    row.cwd,
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

export async function archiveDuplicateSharedExecutionWorkspaces(db: Db) {
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
    .where(and(
      eq(executionWorkspaces.mode, "shared_workspace"),
      inArray(executionWorkspaces.status, ["active", "idle", "in_review"]),
    ))
    .orderBy(desc(executionWorkspaces.lastUsedAt), desc(executionWorkspaces.createdAt));
  const issueRefs = await db
    .select({ executionWorkspaceId: issues.executionWorkspaceId })
    .from(issues)
    .where(isNotNull(issues.executionWorkspaceId));
  const referencedIds = new Set(issueRefs.map((row) => row.executionWorkspaceId!).filter(Boolean));
  const archiveIds = selectDuplicateSharedWorkspaceIds(rows, referencedIds);
  const archivedAt = new Date();

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

  const archivedByCompany = new Map<string, number>();
  const archivedSet = new Set(archiveIds);
  for (const row of rows) {
    if (archivedSet.has(row.id)) {
      archivedByCompany.set(row.companyId, (archivedByCompany.get(row.companyId) ?? 0) + 1);
    }
  }
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

  return { scanned: rows.length, archived: archiveIds.length, referenced: referencedIds.size };
}
