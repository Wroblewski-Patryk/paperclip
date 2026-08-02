import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { auditCrossProjectIsolation } from "./lib/cross-project-isolation-audit.mjs";
import { softwarehouseActiveApplicationProjects } from "./lib/softwarehouse-project-registry.mjs";

function fixture() {
  const projects = softwarehouseActiveApplicationProjects.map((spec, index) => ({
    id: `project-${index}`,
    name: spec.paperclipName,
    leadAgentId: `manager-${index}`,
    archivedAt: null,
    executionWorkspacePolicy: { defaultProjectWorkspaceId: `workspace-${index}` },
  }));
  const projectDetails = projects.map((project, index) => ({
    ...project,
    workspaces: [{ id: `workspace-${index}`, cwd: softwarehouseActiveApplicationProjects[index].root, isPrimary: true }],
  }));
  const agents = softwarehouseActiveApplicationProjects.map((spec, index) => ({
    id: `manager-${index}`,
    name: spec.managerName,
    status: "idle",
    metadata: { rosterKey: spec.managerRosterKey },
    adapterConfig: { cwd: spec.root, env: {} },
  }));
  return { projects, projectDetails, agents, routines: [], issues: [] };
}

test("canonical project fixture passes isolation audit", () => {
  assert.deepEqual(auditCrossProjectIsolation(fixture()), []);
});

test("accepts a project-scoped marker family when project id agrees", () => {
  const input = fixture();
  input.issues.push({
    id: "roost-map",
    identifier: "LUC-ROOST-MAP",
    title: "[Roost Product Map][QA] Verify owner journey",
    status: "todo",
    projectId: input.projects[1].id,
  });

  assert.deepEqual(auditCrossProjectIsolation(input), []);
});

test("detects issue, workspace, and secret namespace contamination", () => {
  const input = fixture();
  input.projectDetails[1].workspaces[0].cwd = path.join(softwarehouseActiveApplicationProjects[0].root, "wrong");
  input.agents[1].adapterConfig.env.COOLIFY_SOAR_APP_ID = { type: "secret_ref", secretId: "secret" };
  input.issues.push({ id: "issue", identifier: "LUC-X", title: "[Roost] Wrong project", status: "todo", projectId: input.projects[0].id });
  const codes = auditCrossProjectIsolation(input).map((item) => item.code);
  assert.ok(codes.includes("workspace_root_mismatch"));
  assert.ok(codes.includes("foreign_project_secret_binding"));
  assert.ok(codes.includes("issue_project_mismatch"));
});

test("detects unmarked project work, cross-project parents, and shared-agent WIP", () => {
  const input = fixture();
  input.issues.push(
    {
      id: "soar-parent",
      identifier: "LUC-SOAR-PARENT",
      title: "[Soar] Parent",
      status: "in_progress",
      projectId: input.projects[0].id,
      assigneeAgentId: "shared-specialist",
    },
    {
      id: "roost-child",
      identifier: "LUC-ROOST-CHILD",
      title: "Roost child without marker",
      status: "in_progress",
      projectId: input.projects[1].id,
      parentId: "soar-parent",
      assigneeAgentId: "shared-specialist",
    },
  );

  const codes = auditCrossProjectIsolation(input).map((item) => item.code);
  assert.ok(codes.includes("issue_project_marker_missing"));
  assert.ok(codes.includes("cross_project_parent"));
  assert.ok(codes.includes("agent_cross_project_wip"));
});
