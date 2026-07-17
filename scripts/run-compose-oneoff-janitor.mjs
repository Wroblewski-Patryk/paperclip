#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyComposeOneoffForCleanup,
  listCanonicalComposeOneoffs,
  removeComposeOneoff,
} from "./lib/docker-compose-oneoffs.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.resolve(repoRoot, "..");
const roots = [
  { key: "paperclip", cwd: repoRoot },
  { key: "soar", cwd: path.join(appsRoot, "Soar") },
  { key: "roost", cwd: path.join(appsRoot, "Roost") },
];
const apply = process.argv.includes("--apply");
const graceMs = Number(process.env.SOFTWAREHOUSE_COMPOSE_ONEOFF_GRACE_MS ?? 15 * 60 * 1000);

const warnings = [];
const failures = [];
const actions = [];
const applied = [];
const skipped = [];
let oneoffs = [];

try {
  oneoffs = listCanonicalComposeOneoffs(roots);
} catch (error) {
  warnings.push({
    code: "docker_inventory_unavailable",
    message: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
  });
}

for (const container of oneoffs) {
  const decision = classifyComposeOneoffForCleanup(container, { graceMs });
  const detail = {
    id: container.shortId,
    name: container.name,
    state: container.state,
    project: container.project,
    service: container.service,
    workingDir: container.workingDir,
    mountCount: container.mountCount,
    bindCount: container.bindCount,
    decision: decision.action,
    reason: decision.reason,
    ageMs: decision.ageMs ?? null,
  };

  if (decision.action !== "remove") {
    skipped.push(detail);
    continue;
  }

  actions.push(detail);
  if (!apply) continue;
  try {
    removeComposeOneoff(container.id);
    applied.push(detail);
  } catch (error) {
    failures.push({
      code: "compose_oneoff_remove_failed",
      ...detail,
      message: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
    });
  }
}

const result = {
  overall: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  apply,
  graceMs,
  oneoffCount: oneoffs.length,
  actionCount: actions.length,
  actions,
  applied,
  skipped,
  warnings,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
