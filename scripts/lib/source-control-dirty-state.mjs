import { statSync } from "node:fs";
import path from "node:path";

export function parsePorcelainV1ZPaths(output) {
  const records = String(output ?? "").split("\0").filter(Boolean);
  const paths = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4) continue;
    const status = record.slice(0, 2);
    paths.push(record.slice(3));

    if (status[0] === "R" || status[0] === "C") {
      const previousPath = records[index + 1];
      if (previousPath) paths.push(previousPath);
      index += 1;
    }
  }

  return [...new Set(paths.filter(Boolean))];
}

export function latestDirtyMutationMs(repoRoot, porcelainOutput) {
  const resolvedRoot = path.resolve(repoRoot);
  let latest = null;

  for (const relativePath of parsePorcelainV1ZPaths(porcelainOutput)) {
    let candidate = path.resolve(resolvedRoot, relativePath);
    if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) continue;

    while (candidate !== resolvedRoot) {
      try {
        const stats = statSync(candidate);
        const mutationMs = Math.max(stats.mtimeMs, stats.ctimeMs);
        latest = latest === null ? mutationMs : Math.max(latest, mutationMs);
        break;
      } catch {
        candidate = path.dirname(candidate);
      }
    }
  }

  return latest;
}

export function dirtyStateCouldInvalidateClosure(repo, closureTimestamp) {
  const closureMs = Date.parse(closureTimestamp ?? "");
  if (!Number.isFinite(closureMs)) return true;
  if (!Number.isFinite(repo?.latestDirtyMutationMs)) return true;

  // A later write is a new dirty packet, not evidence that the old closeout lied.
  return repo.latestDirtyMutationMs <= closureMs + 2_000;
}
