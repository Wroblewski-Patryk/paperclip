import { execFileSync } from "node:child_process";
import path from "node:path";

const ISSUE_SCOPED_CONTAINER_RE = /(?:^|[-_])luc[-_]?\d+(?:$|[-_])/i;

function normalized(value) {
  return path.resolve(value).toLowerCase();
}

export function listCanonicalComposeOneoffs(roots) {
  const ids = execFileSync(
    "docker",
    ["ps", "--all", "--filter", "label=com.docker.compose.oneoff", "--format", "{{.ID}}"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 5_000,
      windowsHide: true,
    },
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (ids.length === 0) return [];

  const inspected = JSON.parse(
    execFileSync("docker", ["inspect", ...ids], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 5_000,
      windowsHide: true,
    }),
  );
  const canonicalRoots = roots.map((root) => normalized(root.cwd));

  return inspected
    .filter(
      (container) =>
        String(container?.Config?.Labels?.["com.docker.compose.oneoff"] ?? "").toLowerCase() ===
        "true",
    )
    .map((container) => ({
      id: String(container?.Id ?? ""),
      shortId: String(container?.Id ?? "").slice(0, 12),
      name: String(container?.Name ?? "").replace(/^\//, ""),
      createdAt: container?.Created ?? null,
      state: container?.State?.Status ?? "unknown",
      running: container?.State?.Running === true,
      project: container?.Config?.Labels?.["com.docker.compose.project"] ?? null,
      service: container?.Config?.Labels?.["com.docker.compose.service"] ?? null,
      workingDir: container?.Config?.Labels?.["com.docker.compose.project.working_dir"] ?? null,
      autoRemove: container?.HostConfig?.AutoRemove === true,
      mountCount: Array.isArray(container?.Mounts) ? container.Mounts.length : 0,
      bindCount: Array.isArray(container?.HostConfig?.Binds) ? container.HostConfig.Binds.length : 0,
    }))
    .filter(
      (container) =>
        typeof container.workingDir === "string" &&
        canonicalRoots.includes(normalized(container.workingDir)),
    );
}

export function classifyComposeOneoffForCleanup(
  container,
  { nowMs = Date.now(), graceMs = 15 * 60 * 1000 } = {},
) {
  if (container.running) return { action: "skip", reason: "active_proof" };
  if (container.mountCount > 0 || container.bindCount > 0) {
    return { action: "skip", reason: "persistent_mounts_present" };
  }
  if (!ISSUE_SCOPED_CONTAINER_RE.test(container.name)) {
    return { action: "skip", reason: "not_issue_scoped" };
  }

  const createdMs = Date.parse(container.createdAt ?? "");
  if (!Number.isFinite(createdMs)) return { action: "skip", reason: "unknown_age" };
  const ageMs = Math.max(0, nowMs - createdMs);
  if (ageMs < graceMs) return { action: "skip", reason: "grace_period", ageMs };

  return { action: "remove", reason: "stale_issue_scoped_oneoff", ageMs };
}

export function removeComposeOneoff(containerId) {
  return execFileSync("docker", ["rm", containerId], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 10_000,
    windowsHide: true,
  }).trim();
}
