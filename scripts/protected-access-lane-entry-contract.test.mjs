import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  auditProtectedAccessLaneEntryDocuments,
  auditProtectedCredentialProofDocuments,
  evaluateProtectedCredentialProofRecord,
  protectedAccessLaneEntryDocPaths,
  protectedAccessLaneEntryFieldKeys,
  protectedCredentialProofDocPaths,
  protectedCredentialProofFieldKeys,
} from "./lib/protected-access-lane-entry-contract.mjs";

async function readCanonicalDocuments() {
  return Object.fromEntries(
    await Promise.all(
      protectedAccessLaneEntryDocPaths.map(async (docPath) => [
        docPath,
        await readFile(docPath, "utf8"),
      ]),
    ),
  );
}

async function readCredentialProofDocuments() {
  return Object.fromEntries(
    await Promise.all(
      protectedCredentialProofDocPaths.map(async (docPath) => [
        docPath,
        await readFile(docPath, "utf8"),
      ]),
    ),
  );
}

test("canonical docs retain the complete protected-access lane-entry packet", async () => {
  const documents = await readCanonicalDocuments();

  assert.deepEqual(auditProtectedAccessLaneEntryDocuments(documents), []);
});

test("guardrail detects a deliberately missing prerequisite field", async () => {
  const documents = await readCanonicalDocuments();
  const targetPath = protectedAccessLaneEntryDocPaths[0];
  const missingField = protectedAccessLaneEntryFieldKeys[0];
  const fixture = {
    ...documents,
    [targetPath]: documents[targetPath].replaceAll(`\`${missingField}\``, "`removedField`"),
  };

  assert.deepEqual(auditProtectedAccessLaneEntryDocuments(fixture), [
    {
      severity: "error",
      type: "protected_access_lane_entry_contract_drift",
      path: targetPath,
      missingFields: [missingField],
      missingMarkers: [],
    },
  ]);
});

test("canonical templates and instructions retain the credential-proof preflight", async () => {
  const documents = await readCredentialProofDocuments();

  assert.deepEqual(auditProtectedCredentialProofDocuments(documents), []);
});

test("credential-proof guardrail detects template drift", async () => {
  const documents = await readCredentialProofDocuments();
  const targetPath = protectedCredentialProofDocPaths[0];
  const missingField = protectedCredentialProofFieldKeys[0];
  const fixture = {
    ...documents,
    [targetPath]: documents[targetPath].replaceAll(`\`${missingField}\``, "`removedField`"),
  };

  assert.deepEqual(auditProtectedCredentialProofDocuments(fixture), [
    {
      severity: "error",
      type: "protected_credential_proof_contract_drift",
      path: targetPath,
      missingFields: [missingField],
      missingMarkers: [],
    },
  ]);
});

test("credential-proof preflight blocks a task with a named least-privilege owner action", () => {
  const report = evaluateProtectedCredentialProofRecord({
    taskRef: "LUC-2228",
    protectedAction: "observability proof",
    credentialProofOwner: "Featherly operations owner",
    environment: "Featherly production",
    credentialOrAccountAlias: "FEATHERLY_OBSERVABILITY_READ_ACCOUNT",
    accessScope: "read health, readiness, and alert status only",
    proofStatus: "blocked",
    expiryOrRotationPath: "owner confirms expiry and rotates through the provider runbook",
    leastPrivilegeUnblockAction: "grant a short-lived read-only alert-status session",
    missingProof: "value-free account authorization confirmation",
    blockerIssue: "LUC-1900",
    blockedTask: "LUC-2228",
  });

  assert.equal(report.ready, false);
  assert.equal(report.decision, "blocked");
  assert.deepEqual(report.missingFields, []);
});

test("credential-proof preflight clears a complete task-scoped record", () => {
  const report = evaluateProtectedCredentialProofRecord({
    taskRef: "LUC-2219",
    protectedAction: "release proof",
    credentialProofOwner: "Featherly release owner",
    environment: "Featherly production",
    credentialOrAccountAlias: "FEATHERLY_RELEASE_STATUS_READER",
    accessScope: "read deployment SHA and status; no deploy or restart",
    proofStatus: "cleared",
    proofRef: "value-free owner confirmation recorded on the task at 2026-08-09T00:00:00Z",
    expiryOrRotationPath: "session expires after the proof window; owner rotates via provider controls",
    leastPrivilegeUnblockAction: "reconfirm the same read-only scope if the proof expires",
  });

  assert.equal(report.ready, true);
  assert.equal(report.decision, "cleared");
  assert.deepEqual(report.missingFields, []);
});

test("credential-proof preflight rejects secret-value fields", () => {
  const report = evaluateProtectedCredentialProofRecord({
    taskRef: "LUC-2219",
    proofStatus: "cleared",
    token: "must-never-be-recorded",
  });

  assert.equal(report.ready, false);
  assert.deepEqual(report.forbiddenFields, ["token"]);
});
