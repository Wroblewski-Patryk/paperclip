#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.env.LUCKYSPARROW_SOFTWAREHOUSE_ROOT || process.cwd());
const registryPath = resolve(
  process.env.PAPERCLIP_SUPERVISION_REGISTRY
    || join(root, "report", "paperclip-supervision", "findings-registry.json"),
);
const mutationLockPath = `${registryPath}.mutation.lock`;
const mutationLockStaleMs = 5 * 60_000;
const maxCycleHistory = 200;
const maxFindingHistory = 1_000;
const maxEvidenceReferences = 50;
const terminalFindingStatuses = new Set([
  "resolved",
  "closed",
  "rejected_as_duplicate",
  "not_worth_doing",
  "accepted_risk",
]);

function parseArgs(argv) {
  const [command = "show", ...rest] = argv;
  const values = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      values[key] = true;
      continue;
    }
    values[key] = value;
    index += 1;
  }
  return { command, values };
}

function nowIso() {
  return new Date().toISOString();
}

function emptyRegistry() {
  return {
    schema_version: 1,
    updated_at: nowIso(),
    active_cycle: null,
    cycles: [],
    findings: [],
  };
}

async function readRegistry() {
  try {
    const parsed = JSON.parse(await readFile(registryPath, "utf8"));
    if (parsed?.schema_version !== 1 || !Array.isArray(parsed.findings) || !Array.isArray(parsed.cycles)) {
      throw new Error("Unsupported or malformed supervision registry");
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return emptyRegistry();
    throw error;
  }
}

async function writeRegistry(registry) {
  await mkdir(dirname(registryPath), { recursive: true });
  registry.updated_at = nowIso();
  const tempPath = `${registryPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await rename(tempPath, registryPath);
}

async function acquireMutationLock() {
  await mkdir(dirname(registryPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(mutationLockPath, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, created_at: nowIso() }));
      return handle;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const lockStat = await stat(mutationLockPath);
      if (Date.now() - lockStat.mtimeMs <= mutationLockStaleMs) {
        throw new Error(`Supervision registry mutation is already locked: ${mutationLockPath}`);
      }
      await rm(mutationLockPath, { force: true });
    }
  }
  throw new Error(`Could not acquire supervision registry mutation lock: ${mutationLockPath}`);
}

async function withRegistryMutation(callback) {
  const handle = await acquireMutationLock();
  try {
    const registry = await readRegistry();
    const result = await callback(registry);
    await writeRegistry(registry);
    return result;
  } finally {
    await handle.close();
    await rm(mutationLockPath, { force: true });
  }
}

function requireValue(values, key) {
  const value = values[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing --${key}`);
  return value;
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Expected a positive integer, got: ${value}`);
  return parsed;
}

function parseDataJson(value, base64Value) {
  const serialized = base64Value
    ? Buffer.from(base64Value, "base64").toString("utf8")
    : value;
  if (!serialized) return {};
  const parsed = JSON.parse(serialized);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("--data-json must contain one JSON object");
  }
  return parsed;
}

function boundedReferences(value, fallback = []) {
  const references = Array.isArray(value) ? value : fallback;
  return references.slice(-maxEvidenceReferences);
}

function makeRoomForFinding(registry) {
  if (registry.findings.length < maxFindingHistory) return;
  const terminal = registry.findings
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => terminalFindingStatuses.has(finding.current_status))
    .sort((left, right) => Date.parse(left.finding.last_seen_at) - Date.parse(right.finding.last_seen_at));
  if (terminal.length === 0) {
    throw new Error(
      `Supervision registry reached ${maxFindingHistory} active findings; resolve or consolidate findings before adding another`,
    );
  }
  registry.findings.splice(terminal[0].index, 1);
}

function cycleExpired(cycle) {
  return Boolean(cycle?.expires_at && Date.parse(cycle.expires_at) <= Date.now());
}

function closeExpiredCycle(registry) {
  const active = registry.active_cycle;
  if (!active || !cycleExpired(active)) return;
  registry.cycles.push({
    ...active,
    finished_at: nowIso(),
    result: "interrupted_or_expired",
  });
  registry.cycles = registry.cycles.slice(-maxCycleHistory);
  registry.active_cycle = null;
}

async function initRegistry() {
  return await withRegistryMutation(async (registry) => ({
    status: "ready",
    registry_path: registryPath,
    findings: registry.findings.length,
  }));
}

async function beginCycle(values) {
  const automation = requireValue(values, "automation");
  const cycleId = requireValue(values, "cycle-id");
  const ttlMinutes = parsePositiveInteger(values["ttl-minutes"], 30);
  return await withRegistryMutation(async (registry) => {
    closeExpiredCycle(registry);
    if (registry.active_cycle) {
      process.exitCode = 2;
      return { status: "locked", active_cycle: registry.active_cycle };
    }
    const startedAt = nowIso();
    registry.active_cycle = {
      automation,
      cycle_id: cycleId,
      started_at: startedAt,
      expires_at: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
      budget: {
        input_tokens: parsePositiveInteger(values["input-token-budget"], 10_000),
        output_tokens: parsePositiveInteger(values["output-token-budget"], 2_000),
        max_changes: parsePositiveInteger(values["max-changes"], 1),
        max_tasks: parsePositiveInteger(values["max-tasks"], 1),
      },
    };
    return { status: "started", active_cycle: registry.active_cycle };
  });
}

async function finishCycle(values) {
  const automation = requireValue(values, "automation");
  const cycleId = requireValue(values, "cycle-id");
  const result = requireValue(values, "result");
  return await withRegistryMutation(async (registry) => {
    const active = registry.active_cycle;
    if (!active || active.automation !== automation || active.cycle_id !== cycleId) {
      throw new Error("Active supervision cycle does not match --automation and --cycle-id");
    }
    const completed = {
      ...active,
      finished_at: nowIso(),
      result,
      summary: values.summary || null,
    };
    registry.cycles.push(completed);
    registry.cycles = registry.cycles.slice(-maxCycleHistory);
    registry.active_cycle = null;
    return { status: "finished", cycle: completed };
  });
}

async function upsertFinding(values) {
  const automation = requireValue(values, "automation");
  const fingerprint = requireValue(values, "fingerprint");
  const data = parseDataJson(values["data-json"], values["data-base64"]);
  return await withRegistryMutation(async (registry) => {
    const timestamp = nowIso();
    const index = registry.findings.findIndex((finding) => finding.fingerprint === fingerprint);
    const previous = index >= 0 ? registry.findings[index] : null;
    const finding = {
      finding_id: previous?.finding_id || randomUUID(),
      fingerprint,
      problem_class: data.problem_class ?? previous?.problem_class ?? "unclassified",
      severity: data.severity ?? previous?.severity ?? "warning",
      affected_project: data.affected_project ?? previous?.affected_project ?? null,
      affected_issue: data.affected_issue ?? previous?.affected_issue ?? null,
      affected_agent_or_routine:
        data.affected_agent_or_routine ?? previous?.affected_agent_or_routine ?? null,
      first_seen_at: previous?.first_seen_at || timestamp,
      last_seen_at: timestamp,
      occurrence_count: (previous?.occurrence_count || 0) + 1,
      source_automation: automation,
      evidence_references: boundedReferences(
        data.evidence_references,
        previous?.evidence_references,
      ),
      current_status: data.current_status ?? previous?.current_status ?? "detected",
      owner: data.owner ?? previous?.owner ?? null,
      admission_decision: data.admission_decision ?? previous?.admission_decision ?? null,
      retry_count: data.retry_count ?? previous?.retry_count ?? 0,
      token_budget_used: data.token_budget_used ?? previous?.token_budget_used ?? 0,
      cooldown_until: data.cooldown_until ?? previous?.cooldown_until ?? null,
      observation_until: data.observation_until ?? previous?.observation_until ?? null,
      last_intervention: data.last_intervention ?? previous?.last_intervention ?? null,
      intervention_result: data.intervention_result ?? previous?.intervention_result ?? null,
      root_cause: data.root_cause ?? previous?.root_cause ?? null,
      permanent_safeguard: data.permanent_safeguard ?? previous?.permanent_safeguard ?? null,
      recurrence_count: data.recurrence_count ?? previous?.recurrence_count ?? 0,
      escalation_target: data.escalation_target ?? previous?.escalation_target ?? null,
      closure_evidence: boundedReferences(data.closure_evidence, previous?.closure_evidence),
    };
    if (index >= 0) registry.findings[index] = finding;
    else {
      makeRoomForFinding(registry);
      registry.findings.push(finding);
    }
    return { status: previous ? "updated" : "created", finding };
  });
}

async function showRegistry() {
  const registry = await readRegistry();
  closeExpiredCycle(registry);
  const statusCounts = Object.fromEntries(
    [...new Set(registry.findings.map((finding) => finding.current_status))]
      .sort()
      .map((status) => [status, registry.findings.filter((finding) => finding.current_status === status).length]),
  );
  return {
    status: "ok",
    registry_path: registryPath,
    updated_at: registry.updated_at,
    active_cycle: registry.active_cycle,
    finding_count: registry.findings.length,
    finding_statuses: statusCounts,
    recent_cycles: registry.cycles.slice(-10),
  };
}

const { command, values } = parseArgs(process.argv.slice(2));
let result;
switch (command) {
  case "init":
    result = await initRegistry();
    break;
  case "begin-cycle":
    result = await beginCycle(values);
    break;
  case "finish-cycle":
    result = await finishCycle(values);
    break;
  case "upsert":
    result = await upsertFinding(values);
    break;
  case "show":
    result = await showRegistry();
    break;
  default:
    throw new Error(`Unknown command: ${command}`);
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
