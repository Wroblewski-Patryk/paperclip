import path from "node:path";

type SharedWorkspaceCandidate = {
  mode: string;
  status: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  cwd: string | null;
};

function normalizedPath(value: string | null | undefined) {
  if (!value) return null;
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function canReuseSharedExecutionWorkspace(input: {
  workspace: SharedWorkspaceCandidate | null;
  requestedMode: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  cwd: string;
  forceFresh: boolean;
}) {
  const workspace = input.workspace;
  if (!workspace || input.forceFresh || input.requestedMode !== "shared_workspace") return false;
  if (workspace.mode !== "shared_workspace") return false;
  if (!new Set(["active", "idle", "in_review"]).has(workspace.status)) return false;
  if (workspace.projectId !== input.projectId) return false;

  if (workspace.projectWorkspaceId || input.projectWorkspaceId) {
    if (workspace.projectWorkspaceId !== input.projectWorkspaceId) return false;
  }

  return normalizedPath(workspace.cwd) === normalizedPath(input.cwd);
}
