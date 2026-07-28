import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultAppsRoot = path.resolve(repoRoot, "..");

const appsRoot = path.resolve(
  process.env.LUCKYSPARROW_APPS_ROOT ?? defaultAppsRoot,
);
const paperclipBaseUrl =
  process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId =
  process.env.PAPERCLIP_COMPANY_ID ??
  "ae26bb8b-8f5f-4a85-b341-78d4e1985975";

const allowedRoots = (
  process.env.SOFTWAREHOUSE_ALLOWED_WORKSPACE_ROOTS ??
  [
    path.join(appsRoot, "Paperclip_Softwarehouse"),
    path.join(appsRoot, "Soar"),
    path.join(appsRoot, "Roost"),
    path.join(appsRoot, "Featherly"),
  ].join(path.delimiter)
)
  .split(path.delimiter)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => path.resolve(entry));

const forbiddenRootArtifacts = [
  path.join(appsRoot, "scripts"),
  path.join(appsRoot, "APPLICATIONS_INDEX.md"),
  path.join(appsRoot, "APPLICATIONS_INDEX.csv"),
];

function normalizeForCompare(value) {
  return path.resolve(value).toLowerCase();
}

function isWithinOrEqual(candidate, root) {
  const normalizedCandidate = normalizeForCompare(candidate);
  const normalizedRoot = normalizeForCompare(root);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function readProjectWorkspace(project) {
  return (
    project?.primaryWorkspace?.cwd ??
    project?.primaryWorkspace?.path ??
    project?.workspace?.cwd ??
    project?.workspace?.path ??
    project?.cwd ??
    project?.path ??
    null
  );
}

async function readProjects() {
  const url = `${paperclipBaseUrl.replace(/\/$/, "")}/api/companies/${companyId}/projects`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Paperclip projects request failed: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.projects)) return payload.projects;
  if (Array.isArray(payload.items)) return payload.items;
  throw new Error("Paperclip projects response did not contain a projects array");
}

async function main() {
  const failures = [];
  const warnings = [];

  for (const allowedRoot of allowedRoots) {
    if (!(await exists(allowedRoot))) {
      failures.push({
        code: "allowed_root_missing",
        path: allowedRoot,
        message: "Allowed workspace root does not exist.",
      });
    }
  }

  for (const artifactPath of forbiddenRootArtifacts) {
    if (await exists(artifactPath)) {
      failures.push({
        code: "forbidden_root_artifact",
        path: artifactPath,
        message:
          "Paperclip must not create helper scripts or generated indexes directly under the parent Aplikacje folder.",
      });
    }
  }

  const siblings = await readdir(appsRoot, { withFileTypes: true });
  for (const entry of siblings) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(appsRoot, entry.name);
    if (allowedRoots.some((root) => isWithinOrEqual(entryPath, root))) continue;
    warnings.push({
      code: "parked_or_external_sibling",
      path: entryPath,
      message:
        "Sibling directory is outside the active Stage 1 agent workspace set. Do not mutate or delete without explicit owner approval.",
    });
  }

  let projects = [];
  try {
    projects = await readProjects();
  } catch (error) {
    failures.push({
      code: "paperclip_projects_unreadable",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  for (const project of projects) {
    if (project?.archivedAt) continue;
    const workspacePath = readProjectWorkspace(project);
    if (!workspacePath) {
      failures.push({
        code: "active_project_missing_workspace",
        project: project?.name ?? project?.title ?? project?.id ?? "unknown",
        message: "Active Paperclip project has no readable workspace path.",
      });
      continue;
    }

    const resolvedWorkspace = path.resolve(workspacePath);
    const allowed = allowedRoots.some((root) =>
      isWithinOrEqual(resolvedWorkspace, root),
    );
    if (!allowed) {
      failures.push({
        code: "active_project_outside_allowed_roots",
        project: project?.name ?? project?.title ?? project?.id ?? "unknown",
        path: resolvedWorkspace,
        allowedRoots,
        message:
          "Active Paperclip project points outside the allowed Stage 1 workspace roots.",
      });
    }
  }

  for (const allowedRoot of allowedRoots) {
    try {
      const info = await stat(allowedRoot);
      if (!info.isDirectory()) {
        failures.push({
          code: "allowed_root_not_directory",
          path: allowedRoot,
          message: "Allowed workspace root is not a directory.",
        });
      }
    } catch {
      // Already reported as missing.
    }
  }

  const result = {
    overall: failures.length === 0 ? "pass" : "fail",
    appsRoot,
    allowedRoots,
    forbiddenRootArtifacts,
    activeProjectCount: projects.filter((project) => !project?.archivedAt)
      .length,
    warnings,
    failures,
  };

  console.log(JSON.stringify(result, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
