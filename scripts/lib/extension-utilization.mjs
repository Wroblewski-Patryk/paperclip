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
  if (Array.isArray(probe.anyOf) && probe.anyOf.length > 0) {
    const accepted = probe.anyOf.some((expected) => matches(data, expected));
    if (!accepted) failures.push(`response does not match any accepted state: ${JSON.stringify(probe.anyOf)}`);
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

export function evaluateCapabilityRelations(capabilities, relations = []) {
  const ids = capabilities.map((capability) => capability.id);
  const idSet = new Set(ids);
  const structuralFailures = [];
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicateIds)) structuralFailures.push(`duplicate capability id: ${id}`);

  const dependencies = new Map(ids.map((id) => [id, []]));
  const consumers = new Map(ids.map((id) => [id, []]));
  const relationKeys = new Set();
  for (const relation of relations) {
    const key = `${relation.type}:${relation.from}:${relation.to}`;
    if (relationKeys.has(key)) structuralFailures.push(`duplicate relation: ${key}`);
    relationKeys.add(key);
    if (relation.type !== "depends_on") structuralFailures.push(`unsupported relation type: ${relation.type}`);
    if (!idSet.has(relation.from)) structuralFailures.push(`relation source is missing: ${relation.from}`);
    if (!idSet.has(relation.to)) structuralFailures.push(`relation target is missing: ${relation.to}`);
    if (relation.from === relation.to) structuralFailures.push(`self dependency: ${relation.from}`);
    if (relation.type === "depends_on" && idSet.has(relation.from) && idSet.has(relation.to) && relation.from !== relation.to) {
      dependencies.get(relation.from).push(relation.to);
      consumers.get(relation.to).push(relation.from);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id, path) {
    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      structuralFailures.push(`dependency cycle: ${[...path.slice(cycleStart), id].join(" -> ")}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id, []);

  const effectivePass = new Map(capabilities.map((capability) => [capability.id, capability.localPassed]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const capability of capabilities) {
      const passed = Boolean(capability.localPassed)
        && (dependencies.get(capability.id) ?? []).every((dependency) => effectivePass.get(dependency));
      if (effectivePass.get(capability.id) !== passed) {
        effectivePass.set(capability.id, passed);
        changed = true;
      }
    }
  }

  return {
    passed: structuralFailures.length === 0,
    structuralFailures: [...new Set(structuralFailures)],
    byCapability: Object.fromEntries(ids.map((id) => [id, {
      dependencies: [...new Set(dependencies.get(id) ?? [])],
      consumers: [...new Set(consumers.get(id) ?? [])],
      dependencyFailures: [...new Set(dependencies.get(id) ?? [])].filter((dependency) => !effectivePass.get(dependency)),
      passed: Boolean(effectivePass.get(id)),
    }])),
  };
}
