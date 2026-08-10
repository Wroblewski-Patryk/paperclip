import { readFile } from "node:fs/promises";

export function valueAt(input, dottedPath) {
  return dottedPath.split(".").reduce((value, segment) => {
    if (segment === "length") return value?.length;
    return value?.[segment];
  }, input);
}

function matches(item, expected) {
  return Object.entries(expected).every(([key, value]) => valueAt(item, key) === value);
}

export function evaluateProbe(data, probe) {
  const failures = [];
  if (probe.shape === "array" && !Array.isArray(data)) failures.push("response is not an array");
  if (probe.shape === "object" && (!data || typeof data !== "object" || Array.isArray(data))) failures.push("response is not an object");
  if (Number.isFinite(probe.minItems) && (!Array.isArray(data) || data.length < probe.minItems)) failures.push(`expected at least ${probe.minItems} items`);
  if (probe.where && Array.isArray(data)) {
    const matched = data.filter((item) => matches(item, probe.where)).length;
    if (matched < (probe.minMatched ?? 1)) failures.push(`only ${matched} items match ${JSON.stringify(probe.where)}`);
  }
  if (probe.whereAny && Array.isArray(data)) {
    const matched = data.filter((item) => probe.whereAny.some((expected) => matches(item, expected))).length;
    if (matched < (probe.minMatched ?? 1)) failures.push(`only ${matched} items match an accepted state`);
  }
  for (const [key, expected] of Object.entries(probe.equals ?? {})) {
    const actual = valueAt(data, key);
    if (actual !== expected) failures.push(`${key} expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
  for (const [key, minimum] of Object.entries(probe.pathMinimums ?? {})) {
    const actual = valueAt(data, key);
    if (!Number.isFinite(actual) || actual < minimum) failures.push(`${key} expected >= ${minimum}, received ${JSON.stringify(actual)}`);
  }
  return { passed: failures.length === 0, failures };
}

export async function evaluateStaticCapability(root, capability) {
  const fileChecks = await Promise.all(capability.requiredFiles.map(async (file) => {
    try { await readFile(new URL(file, root)); return { file, passed: true }; }
    catch { return { file, passed: false }; }
  }));
  const proofChecks = await Promise.all(capability.proofFiles.map(async (file) => {
    try { await readFile(new URL(file, root)); return { file, passed: true }; }
    catch { return { file, passed: false }; }
  }));
  const integrationChecks = await Promise.all(capability.integrationChecks.map(async (check) => {
    try {
      const content = await readFile(new URL(check.file, root), "utf8");
      const missingPatterns = check.patterns.filter((pattern) => !content.includes(pattern));
      return { ...check, passed: missingPatterns.length === 0, missingPatterns };
    } catch {
      return { ...check, passed: false, missingPatterns: check.patterns, error: "file_missing" };
    }
  }));
  return { fileChecks, proofChecks, integrationChecks };
}

export function scoreCapability(staticResult, runtimeChecks) {
  const ratio = (items) => items.length === 0 ? 1 : items.filter((item) => item.passed).length / items.length;
  const dimensions = {
    implementation: Math.round(ratio(staticResult.fileChecks) * 25),
    integration: Math.round(ratio(staticResult.integrationChecks) * 25),
    runtime: Math.round(ratio(runtimeChecks) * 25),
    proof: Math.round(ratio(staticResult.proofChecks) * 25),
  };
  return { dimensions, utilizationPercent: Object.values(dimensions).reduce((sum, value) => sum + value, 0) };
}
