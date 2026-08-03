import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./softwarehouse-supervision-registry.mjs", import.meta.url));

function run(registry, args, expectedStatus = 0) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: { ...process.env, PAPERCLIP_SUPERVISION_REGISTRY: registry },
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(expectedStatus, 0);
    return JSON.parse(stdout);
  } catch (error) {
    assert.equal(error.status, expectedStatus);
    return JSON.parse(error.stdout);
  }
}

test("serializes cycles and deduplicates findings by fingerprint", () => {
  const dir = mkdtempSync(join(tmpdir(), "paperclip-supervision-registry-"));
  const registry = join(dir, "findings.json");
  try {
    assert.equal(run(registry, ["init"]).status, "ready");
    assert.equal(
      run(registry, [
        "begin-cycle",
        "--automation",
        "watchdog",
        "--cycle-id",
        "cycle-1",
        "--ttl-minutes",
        "5",
      ]).status,
      "started",
    );
    assert.equal(
      run(registry, [
        "begin-cycle",
        "--automation",
        "doctor",
        "--cycle-id",
        "cycle-2",
      ], 2).status,
      "locked",
    );

    const data = JSON.stringify({ severity: "critical", current_status: "needs_decision" });
    const dataBase64 = Buffer.from(data, "utf8").toString("base64");
    assert.equal(
      run(registry, [
        "upsert",
        "--automation",
        "watchdog",
        "--fingerprint",
        "same-root-cause",
        "--data-base64",
        dataBase64,
      ]).status,
      "created",
    );
    assert.equal(
      run(registry, [
        "upsert",
        "--automation",
        "watchdog",
        "--fingerprint",
        "same-root-cause",
        "--data-json",
        data,
      ]).status,
      "updated",
    );
    assert.equal(
      run(registry, [
        "finish-cycle",
        "--automation",
        "watchdog",
        "--cycle-id",
        "cycle-1",
        "--result",
        "no_action_required",
      ]).status,
      "finished",
    );

    const persisted = JSON.parse(readFileSync(registry, "utf8"));
    assert.equal(persisted.active_cycle, null);
    assert.equal(persisted.findings.length, 1);
    assert.equal(persisted.findings[0].occurrence_count, 2);
    assert.equal(persisted.findings[0].current_status, "needs_decision");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bounds evidence retained for a finding", () => {
  const dir = mkdtempSync(join(tmpdir(), "paperclip-supervision-registry-"));
  const registry = join(dir, "findings.json");
  try {
    const evidence = Array.from({ length: 75 }, (_, index) => `evidence-${index}`);
    const data = JSON.stringify({ evidence_references: evidence, closure_evidence: evidence });
    assert.equal(
      run(registry, [
        "upsert",
        "--automation",
        "daily-integrity",
        "--fingerprint",
        "bounded-evidence",
        "--data-json",
        data,
      ]).status,
      "created",
    );
    const persisted = JSON.parse(readFileSync(registry, "utf8"));
    assert.deepEqual(persisted.findings[0].evidence_references, evidence.slice(-50));
    assert.deepEqual(persisted.findings[0].closure_evidence, evidence.slice(-50));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
