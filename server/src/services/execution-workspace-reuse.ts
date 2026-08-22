import { canonicalWorkspacePath } from "./workspace-path-identity.js";

type SharedWorkspaceCandidate = {
  mode: string;
  status: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  cwd: string | null;
};

export function canReuseSharedExecutionWorkspace(input: {
  workspace: SharedWorkspaceCandidate | null;
  requestedMode: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  cwd: string;
}) {
  const workspace = input.workspace;
  if (!workspace || input.requestedMode !== "shared_workspace") return false;
  if (workspace.mode !== "shared_workspace") return false;
  if (!new Set(["active", "idle", "in_review"]).has(workspace.status)) return false;
  if (workspace.projectId !== input.projectId) return false;

  if (workspace.projectWorkspaceId || input.projectWorkspaceId) {
    if (workspace.projectWorkspaceId !== input.projectWorkspaceId) return false;
  }

  return canonicalWorkspacePath(workspace.cwd) === canonicalWorkspacePath(input.cwd);
}
