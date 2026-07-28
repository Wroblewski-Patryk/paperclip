import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  auditProtectedAccessLaneEntryDocuments,
  protectedAccessLaneEntryDocPaths,
  protectedAccessLaneEntryFieldKeys,
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
