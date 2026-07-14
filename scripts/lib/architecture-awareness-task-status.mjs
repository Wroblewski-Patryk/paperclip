export const architectureStatusValues = Object.freeze([
  "planned",
  "in_progress",
  "implemented",
  "tested",
  "verified",
  "deprecated",
  "blocked",
]);

const statusValueSet = new Set(architectureStatusValues);
const statusAliases = new Map([
  ["complete", "verified"],
  ["done", "verified"],
  ["implemented_not_verified", "implemented"],
  ["missing", "planned"],
  ["partial", "in_progress"],
  ["partially_verified", "tested"],
  ["verified_local", "verified"],
]);

export function canonicalArchitectureStatus(value, fallback = "implemented") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (statusValueSet.has(normalized)) return normalized;
  return statusAliases.get(normalized) ?? fallback;
}

export function taskArtifactStatus(text) {
  const headerSlice = String(text ?? "").slice(0, 4000);
  const explicitStatusPatterns = [
    /^\s*-\s*Status:\s*([A-Za-z_ ]+)/im,
    /^\s*-\s*Mission Status:\s*([A-Za-z_ ]+)/im,
    /^\s*-\s*Reality status:\s*([A-Za-z_ ]+)/im,
  ];

  for (const pattern of explicitStatusPatterns) {
    const match = headerSlice.match(pattern);
    if (!match?.[1]) continue;
    const normalized = canonicalArchitectureStatus(match[1], "");
    if (normalized) return normalized;
  }

  if (/done|verified|complete/i.test(headerSlice)) return "verified";
  if (/blocked/i.test(headerSlice)) return "blocked";
  return "in_progress";
}
