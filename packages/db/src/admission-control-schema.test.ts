import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  admissionControlTransitions,
  admissionControls,
  admissionDecisions,
  agentWakeupRequests,
  heartbeatRuns,
} from "./schema/index.js";

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((entry) => entry.config.name);
}

describe("admission-control persistence contract", () => {
  it("persists one versioned control per company or project scope", () => {
    const config = getTableConfig(admissionControls);

    expect(config.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "company_id",
        "scope_type",
        "scope_id",
        "state",
        "version",
        "maintenance_owner_agent_id",
        "maintenance_issue_id",
        "drain_snapshot",
        "replay_snapshot",
        "reopen_attempt_id",
        "reopen_result",
        "policy",
      ]),
    );
    expect(indexNames(admissionControls)).toContain("admission_controls_company_scope_unique");
    expect(config.checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "admission_controls_scope_type_check",
        "admission_controls_state_check",
        "admission_controls_version_check",
        "admission_controls_company_scope_check",
      ]),
    );
  });

  it("persists inspectable deterministic work-admission decisions", () => {
    const config = getTableConfig(admissionDecisions);
    expect(config.columns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "fingerprint",
      "disposition",
      "reason_code",
      "evidence_hash",
      "retry_count",
      "expected_value",
      "observed",
      "limits",
      "cooldown_until",
      "observation_until",
    ]));
    expect(indexNames(admissionDecisions)).toContain("admission_decisions_fingerprint_created_idx");
    expect(config.checks.map((entry) => entry.name)).toContain("admission_decisions_disposition_check");
  });

  it("makes transition and deferred-wakeup retries idempotent", () => {
    expect(indexNames(admissionControlTransitions)).toContain(
      "admission_control_transitions_control_key_unique",
    );
    expect(indexNames(agentWakeupRequests)).toEqual(
      expect.arrayContaining([
        "agent_wakeup_requests_deferred_dedupe_unique",
        "agent_wakeup_requests_company_project_status_idx",
        "agent_wakeup_requests_control_status_idx",
      ]),
    );
    expect(indexNames(heartbeatRuns)).toContain("heartbeat_runs_wakeup_request_unique_idx");
  });

  it("preflights legacy duplicate runs and maps manual pauses without consuming budget pauses", async () => {
    const migrationPath = fileURLToPath(
      new URL("./migrations/0107_admission_control.sql", import.meta.url),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("duplicate wakeup_request_id values exist");
    expect(migration).toContain("HAVING count(*) > 1");
    expect(migration).toContain("\"pause_reason\" IS DISTINCT FROM 'budget'");
    expect(migration).toContain("'legacy_company_pause'");
    expect(migration).not.toContain('CREATE TABLE "workspace_resource_claims"');
  });
});
