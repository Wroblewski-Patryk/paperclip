import type { IssueExecutionConcurrencyPolicy } from "@paperclipai/shared";
import { issueExecutionConcurrencyPolicySchema } from "@paperclipai/shared";

export type ProjectConcurrencyScope = IssueExecutionConcurrencyPolicy;

export type ProjectConcurrencyConflict = {
  kind: "unknown_scope" | "path_overlap" | "resource_overlap";
  detail: string;
};

function normalizePath(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "").toLowerCase();
}

function normalizeResource(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, ":").replace(/^:+|:+$/g, "");
}

function unique(values: string[], normalize: (value: string) => string) {
  return [...new Set(values.map(normalize).filter(Boolean))].sort();
}

export function parseProjectConcurrencyScope(executionPolicy: unknown): ProjectConcurrencyScope | null {
  if (!executionPolicy || typeof executionPolicy !== "object" || Array.isArray(executionPolicy)) return null;
  const raw = (executionPolicy as Record<string, unknown>).concurrency;
  if (raw == null) return null;
  const parsed = issueExecutionConcurrencyPolicySchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    mode: parsed.data.mode,
    writePaths: unique(parsed.data.writePaths, normalizePath),
    readPaths: unique(parsed.data.readPaths, normalizePath),
    resources: unique(parsed.data.resources, normalizeResource),
  };
}

function pathsOverlap(left: string, right: string) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function findProjectConcurrencyConflict(
  candidate: ProjectConcurrencyScope | null,
  active: ProjectConcurrencyScope | null,
): ProjectConcurrencyConflict | null {
  if (!candidate || !active || candidate.mode !== "scoped" || active.mode !== "scoped") {
    return {
      kind: "unknown_scope",
      detail: "At least one lane has no bounded scoped-concurrency contract",
    };
  }

  const activeReadsAndWrites = [...active.readPaths, ...active.writePaths];
  const candidateReadsAndWrites = [...candidate.readPaths, ...candidate.writePaths];
  for (const candidateWrite of candidate.writePaths) {
    const overlap = activeReadsAndWrites.find((path) => pathsOverlap(candidateWrite, path));
    if (overlap) return { kind: "path_overlap", detail: `${candidateWrite} overlaps ${overlap}` };
  }
  for (const activeWrite of active.writePaths) {
    const overlap = candidateReadsAndWrites.find((path) => pathsOverlap(activeWrite, path));
    if (overlap) return { kind: "path_overlap", detail: `${activeWrite} overlaps ${overlap}` };
  }

  const activeResources = new Set(active.resources);
  const resource = candidate.resources.find((key) => activeResources.has(key));
  if (resource) return { kind: "resource_overlap", detail: `Shared resource ${resource}` };
  return null;
}

export function scopesCanRunConcurrently(
  candidate: ProjectConcurrencyScope | null,
  activeScopes: Array<ProjectConcurrencyScope | null>,
) {
  for (const active of activeScopes) {
    const conflict = findProjectConcurrencyConflict(candidate, active);
    if (conflict) return { compatible: false as const, conflict };
  }
  return { compatible: true as const, conflict: null };
}
