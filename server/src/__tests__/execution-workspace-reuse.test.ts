import { describe, expect, it } from "vitest";
import { canReuseSharedExecutionWorkspace } from "../services/execution-workspace-reuse.js";

const workspace = {
  mode: "shared_workspace",
  status: "active",
  projectId: "project-1",
  projectWorkspaceId: "primary-1",
  cwd: "C:/projects/soar",
};

describe("canReuseSharedExecutionWorkspace", () => {
  it("reuses the compatible issue-linked shared workspace", () => {
    expect(canReuseSharedExecutionWorkspace({
      workspace,
      requestedMode: "shared_workspace",
      projectId: "project-1",
      projectWorkspaceId: "primary-1",
      cwd: "C:/projects/soar",
    })).toBe(true);
  });

  it("does not reuse for an isolated request, but keeps workspace identity across a fresh model session", () => {
    expect(canReuseSharedExecutionWorkspace({
      workspace,
      requestedMode: "isolated_workspace",
      projectId: "project-1",
      projectWorkspaceId: "primary-1",
      cwd: "C:/projects/soar",
    })).toBe(false);
    expect(canReuseSharedExecutionWorkspace({
      workspace,
      requestedMode: "shared_workspace",
      projectId: "project-1",
      projectWorkspaceId: "primary-1",
      cwd: "C:/projects/soar",
    })).toBe(true);
  });

  it("rejects a different project workspace or archived record", () => {
    expect(canReuseSharedExecutionWorkspace({
      workspace,
      requestedMode: "shared_workspace",
      projectId: "project-1",
      projectWorkspaceId: "primary-2",
      cwd: "C:/projects/soar",
    })).toBe(false);
    expect(canReuseSharedExecutionWorkspace({
      workspace: { ...workspace, status: "archived" },
      requestedMode: "shared_workspace",
      projectId: "project-1",
      projectWorkspaceId: "primary-1",
      cwd: "C:/projects/soar",
    })).toBe(false);
  });
});
