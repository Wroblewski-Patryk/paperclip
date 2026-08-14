import { readFile } from "node:fs/promises";
import path from "node:path";

export const projectTruthRepositorySnapshotVersion = 1;

const shaPattern = /^[0-9a-f]{40}$/i;
const controlPlanePathPattern = /^(?:(?:docs?|history|\.agents|\.codex)(?:\/|$)|(?:README|AGENTS)\.md$)/i;

function normalizedRoot(value) {
  return path.resolve(String(value)).replaceAll("\\", "/").replace(/\/$/, "");
}

function normalizedSha(value, field, source) {
  const sha = String(value ?? "").trim().toLowerCase();
  if (!shaPattern.test(sha)) throw new Error(`${source}.${field} must be a 40-character Git SHA.`);
  return sha;
}

function optionalSha(value, field, source) {
  return value === null || value === undefined ? null : normalizedSha(value, field, source);
}

function nonNegativeInteger(value, field, source) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${source}.${field} must be a non-negative integer.`);
  }
  return value;
}

export function isControlPlaneOnlyPath(value) {
  return controlPlanePathPattern.test(value);
}

export function validateProjectTruthRepositorySnapshot(value, {
  expectedRepositoryRoot,
  source = "repository snapshot",
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source} must be a JSON object.`);
  }
  if (value.schemaVersion !== projectTruthRepositorySnapshotVersion) {
    throw new Error(`${source}.schemaVersion must be ${projectTruthRepositorySnapshotVersion}.`);
  }

  const repositoryRoot = normalizedRoot(value.repositoryRoot ?? "");
  if (!value.repositoryRoot || (expectedRepositoryRoot && repositoryRoot.toLowerCase() !== normalizedRoot(expectedRepositoryRoot).toLowerCase())) {
    throw new Error(`${source}.repositoryRoot does not match the requested repository.`);
  }

  const headSha = normalizedSha(value.headSha, "headSha", source);
  const upstreamSha = optionalSha(value.upstreamSha, "upstreamSha", source);
  const behind = value.behind === null || value.behind === undefined
    ? null
    : nonNegativeInteger(value.behind, "behind", source);
  const ahead = value.ahead === null || value.ahead === undefined
    ? null
    : nonNegativeInteger(value.ahead, "ahead", source);
  if (upstreamSha === null && (behind !== null || ahead !== null)) {
    throw new Error(`${source}.behind and .ahead must be null when no upstream is configured.`);
  }
  if (upstreamSha !== null && (behind === null || ahead === null)) {
    throw new Error(`${source}.behind and .ahead are required when an upstream is configured.`);
  }
  if (!Array.isArray(value.aheadPaths)) throw new Error(`${source}.aheadPaths must be an array.`);

  const aheadPaths = value.aheadPaths.map((entry, index) => {
    const candidate = String(entry ?? "").trim().replaceAll("\\", "/");
    if (!candidate || path.posix.isAbsolute(candidate) || path.win32.isAbsolute(candidate) || candidate === ".." || candidate.startsWith("../") || candidate.includes("/../")) {
      throw new Error(`${source}.aheadPaths[${index}] must be a normalized repository-relative path.`);
    }
    return candidate;
  });
  if ((ahead === 0 || upstreamSha === null) && aheadPaths.length > 0) {
    throw new Error(`${source}.aheadPaths must be empty when ahead is zero.`);
  }

  const controlPlaneOnlyAhead = upstreamSha !== null && aheadPaths.length > 0 && aheadPaths.every(isControlPlaneOnlyPath);
  if (value.controlPlaneOnlyAhead !== controlPlaneOnlyAhead) {
    throw new Error(`${source}.controlPlaneOnlyAhead does not match aheadPaths.`);
  }
  const releaseSha = controlPlaneOnlyAhead ? upstreamSha : headSha;
  if (normalizedSha(value.releaseSha, "releaseSha", source) !== releaseSha) {
    throw new Error(`${source}.releaseSha is inconsistent with repository divergence.`);
  }

  return {
    schemaVersion: projectTruthRepositorySnapshotVersion,
    repositoryRoot,
    headSha,
    upstreamSha,
    behind,
    ahead,
    aheadPaths,
    controlPlaneOnlyAhead,
    releaseSha,
  };
}

function requiredGitOutput(runGit, args) {
  const result = runGit(args);
  if (result?.error) {
    throw new Error(`git ${args.join(" ")} could not start: ${result.error.code ?? result.error.message}`);
  }
  if (result?.status !== 0) {
    const detail = String(result?.stderr ?? "").trim();
    throw new Error(`git ${args.join(" ")} exited ${result?.status ?? "without a status"}${detail ? `: ${detail}` : ""}`);
  }
  return String(result.stdout ?? "").trim();
}

function optionalGitOutput(runGit, args) {
  const result = runGit(args);
  if (result?.error) {
    throw new Error(`git ${args.join(" ")} could not start: ${result.error.code ?? result.error.message}`);
  }
  return result?.status === 0 ? String(result.stdout ?? "").trim() : null;
}

export function captureProjectTruthRepositorySnapshot({ repositoryRoot, runGit }) {
  if (typeof runGit !== "function") throw new Error("A Git runner is required.");
  const root = normalizedRoot(repositoryRoot);
  const headSha = requiredGitOutput(runGit, ["rev-parse", "--verify", "HEAD"]);
  const upstreamSha = optionalGitOutput(runGit, ["rev-parse", "--verify", "@{upstream}"]);
  if (upstreamSha === null) {
    return validateProjectTruthRepositorySnapshot({
      schemaVersion: projectTruthRepositorySnapshotVersion,
      repositoryRoot: root,
      headSha,
      upstreamSha: null,
      behind: null,
      ahead: null,
      aheadPaths: [],
      controlPlaneOnlyAhead: false,
      releaseSha: headSha,
    }, { expectedRepositoryRoot: root, source: "native Git snapshot" });
  }
  const divergence = requiredGitOutput(runGit, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]);
  const divergenceParts = divergence.split(/\s+/);
  if (divergenceParts.length !== 2 || divergenceParts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`git rev-list returned invalid divergence: ${JSON.stringify(divergence)}`);
  }
  const [behind, ahead] = divergenceParts.map(Number);
  const aheadPaths = ahead > 0
    ? requiredGitOutput(runGit, ["diff", "--name-only", "@{upstream}..HEAD"]).split(/\r?\n/).filter(Boolean)
    : [];
  const controlPlaneOnlyAhead = aheadPaths.length > 0 && aheadPaths.every(isControlPlaneOnlyPath);

  return validateProjectTruthRepositorySnapshot({
    schemaVersion: projectTruthRepositorySnapshotVersion,
    repositoryRoot: root,
    headSha,
    upstreamSha,
    behind,
    ahead,
    aheadPaths,
    controlPlaneOnlyAhead,
    releaseSha: controlPlaneOnlyAhead ? upstreamSha : headSha,
  }, { expectedRepositoryRoot: root, source: "native Git snapshot" });
}

export async function resolveProjectTruthRepositorySnapshot({
  repositoryRoot,
  snapshotJson = null,
  snapshotFile = null,
  runGit,
} = {}) {
  if (snapshotJson && snapshotFile) {
    throw new Error("Use only one of repository snapshot JSON or repository snapshot file.");
  }

  if (snapshotJson || snapshotFile) {
    const source = snapshotFile ? `repository snapshot file ${path.resolve(snapshotFile)}` : "repository snapshot JSON";
    let parsed;
    try {
      parsed = JSON.parse(snapshotFile ? await readFile(path.resolve(snapshotFile), "utf8") : snapshotJson);
    } catch (error) {
      throw new Error(`${source} is invalid JSON: ${error.message}`);
    }
    return validateProjectTruthRepositorySnapshot(parsed, { expectedRepositoryRoot: repositoryRoot, source });
  }

  try {
    return captureProjectTruthRepositorySnapshot({ repositoryRoot, runGit });
  } catch (error) {
    throw new Error(
      `Repository identity is unavailable for ${normalizedRoot(repositoryRoot)}: ${error.message}. ` +
      "Supply PROJECT_TRUTH_REPOSITORY_SNAPSHOT, --repository-snapshot-json, or --repository-snapshot-file with a validated snapshot.",
    );
  }
}
