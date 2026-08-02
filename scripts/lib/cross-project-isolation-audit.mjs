import path from "node:path";
import {
  canonicalSoftwarehouseProject,
  projectMarker,
  softwarehouseActiveApplicationProjects,
} from "./softwarehouse-project-registry.mjs";

const openStatuses = new Set(["backlog", "todo", "in_progress", "in_review", "blocked"]);

function normalizedPath(value) {
  return path.resolve(String(value ?? "")).replaceAll("\\", "/").toLowerCase();
}

function finding(severity, code, project, message, details = {}) {
  return { severity, code, project: project ?? null, message, details };
}

export function auditCrossProjectIsolation({ projects = [], projectDetails = [], agents = [], routines = [], issues = [] }) {
  const findings = [];
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const activeByCanonicalName = new Map();

  for (const spec of softwarehouseActiveApplicationProjects) {
    const matches = activeProjects.filter((project) => canonicalSoftwarehouseProject(project.name)?.name === spec.name);
    if (matches.length !== 1) {
      findings.push(finding("blocker", "canonical_project_count", spec.name,
        `Expected exactly one active ${spec.name} project, found ${matches.length}.`,
        { projectIds: matches.map((project) => project.id) }));
      continue;
    }
    activeByCanonicalName.set(spec.name, matches[0]);
  }

  const detailsById = new Map(projectDetails.map((project) => [project.id, project]));
  for (const spec of softwarehouseActiveApplicationProjects) {
    const project = activeByCanonicalName.get(spec.name);
    if (!project) continue;
    const detail = detailsById.get(project.id) ?? project;
    const defaultWorkspaceId = project.executionWorkspacePolicy?.defaultProjectWorkspaceId ?? null;
    const workspace = (detail.workspaces ?? []).find((entry) => entry.id === defaultWorkspaceId)
      ?? (detail.workspaces ?? []).find((entry) => entry.isPrimary)
      ?? null;
    if (!defaultWorkspaceId) {
      findings.push(finding("blocker", "default_workspace_missing", spec.name,
        `${spec.name} has no default project workspace id.`));
    } else if (workspace && normalizedPath(workspace.cwd) !== normalizedPath(spec.root)) {
      findings.push(finding("blocker", "workspace_root_mismatch", spec.name,
        `${spec.name} primary workspace points outside its canonical root.`,
        { workspaceId: workspace.id, cwd: workspace.cwd, expected: spec.root }));
    } else if (!workspace && Array.isArray(detail.workspaces)) {
      findings.push(finding("blocker", "default_workspace_unresolved", spec.name,
        `${spec.name} default workspace id does not resolve in the project workspace list.`,
        { defaultWorkspaceId }));
    }

    const manager = agents.find((agent) => agent.metadata?.rosterKey === spec.managerRosterKey && agent.status !== "terminated");
    if (!manager) {
      findings.push(finding("blocker", "project_manager_missing", spec.name,
        `${spec.name} has no active canonical project manager.`));
      continue;
    }
    if (project.leadAgentId !== manager.id) {
      findings.push(finding("blocker", "project_lead_mismatch", spec.name,
        `${spec.name} lead is not its canonical project manager.`,
        { leadAgentId: project.leadAgentId, expectedAgentId: manager.id }));
    }
    if (normalizedPath(manager.adapterConfig?.cwd) !== normalizedPath(spec.root)) {
      findings.push(finding("blocker", "project_manager_cwd_mismatch", spec.name,
        `${spec.name} manager cwd points outside its canonical repository.`,
        { cwd: manager.adapterConfig?.cwd ?? null, expected: spec.root }));
    }
    const envKeys = Object.keys(manager.adapterConfig?.env ?? {});
    const foreignPrefixes = softwarehouseActiveApplicationProjects
      .filter((candidate) => candidate.name !== spec.name)
      .flatMap((candidate) => candidate.secretPrefixes);
    const foreignEnvKeys = envKeys.filter((key) => foreignPrefixes.some((prefix) => key.startsWith(prefix)));
    if (foreignEnvKeys.length > 0) {
      findings.push(finding("blocker", "foreign_project_secret_binding", spec.name,
        `${spec.name} manager has secret-reference bindings from another project namespace.`,
        { agentId: manager.id, envKeys: foreignEnvKeys.sort() }));
    }
  }

  for (const routine of routines) {
    const marker = projectMarker(routine.title);
    if (!marker) continue;
    const expected = activeByCanonicalName.get(marker.name);
    if (expected && routine.projectId !== expected.id) {
      findings.push(finding("blocker", "routine_project_mismatch", marker.name,
        `${routine.title} is bound to the wrong Paperclip project.`,
        { routineId: routine.id, actualProjectId: routine.projectId, expectedProjectId: expected.id }));
    }
  }

  for (const issue of issues) {
    const marker = projectMarker(issue.title);
    if (!marker) continue;
    const expected = activeByCanonicalName.get(marker.name);
    if (!expected || issue.projectId === expected.id) continue;
    findings.push(finding(openStatuses.has(issue.status) ? "blocker" : "warn", "issue_project_mismatch", marker.name,
      `${issue.identifier ?? issue.id} is titled for ${marker.name} but bound to another project.`,
      { issueId: issue.id, status: issue.status, actualProjectId: issue.projectId, expectedProjectId: expected.id }));
  }

  return findings;
}

export function summarizeIsolationFindings(findings) {
  return {
    total: findings.length,
    blockers: findings.filter((item) => item.severity === "blocker").length,
    warnings: findings.filter((item) => item.severity === "warn").length,
    byProject: Object.fromEntries(softwarehouseActiveApplicationProjects.map((project) => [
      project.name,
      {
        total: findings.filter((item) => item.project === project.name).length,
        blockers: findings.filter((item) => item.project === project.name && item.severity === "blocker").length,
      },
    ])),
  };
}
