import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  auditReleaseBlockerClosureDocuments,
  evaluateReleaseBlockerClosureRecord,
  evaluateReleaseBlockerRetirement,
  releaseBlockerClosureDocPaths,
  releaseBlockerClosureFieldKeys,
} from "./lib/release-blocker-closure-contract.mjs";

async function readCanonicalDocuments() {
  return Object.fromEntries(
    await Promise.all(
      releaseBlockerClosureDocPaths.map(async (docPath) => [
        docPath,
        await readFile(docPath, "utf8"),
      ]),
    ),
  );
}

async function readObservedFixture() {
  return JSON.parse(
    await readFile("scripts/fixtures/luc-2627-release-blocker-references.json", "utf8"),
  );
}

test("canonical process, template, and operating instruction retain the release blocker gate", async () => {
  const documents = await readCanonicalDocuments();
  assert.deepEqual(auditReleaseBlockerClosureDocuments(documents), []);
});

test("guardrail detects a deliberately missing closure field", async () => {
  const documents = await readCanonicalDocuments();
  const targetPath = releaseBlockerClosureDocPaths[0];
  const missingField = releaseBlockerClosureFieldKeys[0];
  const fixture = {
    ...documents,
    [targetPath]: documents[targetPath].replaceAll(`\`${missingField}\``, "`removedField`"),
  };

  assert.deepEqual(auditReleaseBlockerClosureDocuments(fixture), [
    {
      severity: "error",
      type: "release_blocker_closure_contract_drift",
      path: targetPath,
      missingFields: [missingField],
      missingMarkers: [],
    },
  ]);
});

test("the LUC-2627 nine-reference packet keeps every dependent lane closed while the protected gate is blocked", async () => {
  const fixture = await readObservedFixture();
  assert.equal(fixture.observedReferences.length, 9);
  assert.deepEqual(fixture.closurePacket.dependentLaneRefs, fixture.observedReferences);

  const report = evaluateReleaseBlockerClosureRecord(fixture.closurePacket, {
    now: new Date("2026-08-10T02:00:00.000Z"),
  });

  assert.equal(report.ready, false);
  assert.equal(report.mayOpenDependentLanes, false);
  assert.equal(report.unblockOwner, "09 DRE (Deployment & Reliability Engineer)");
  assert.equal(report.dependentLaneRefs.length, 9);
  assert.match(report.reason, /protected gate is not cleared/i);
});

test("the gate clears only a complete, fresh, exact-candidate packet", async () => {
  const fixture = await readObservedFixture();
  const report = evaluateReleaseBlockerClosureRecord({
    ...fixture.closurePacket,
    protectedGateStatus: "cleared",
  }, {
    now: new Date("2026-08-10T02:00:00.000Z"),
  });

  assert.equal(report.ready, true);
  assert.equal(report.mayOpenDependentLanes, true);
  assert.equal(report.verificationFresh, true);
});

test("the gate fails closed on abbreviated SHA, mismatched verification, missing lineage, and stale proof", async () => {
  const fixture = await readObservedFixture();
  const base = { ...fixture.closurePacket, protectedGateStatus: "cleared" };
  const cases = [
    { ...base, candidateSha: "54339cab" },
    { ...base, verifiedCandidateSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    { ...base, lineageEvidenceRef: "" },
    base,
  ];
  const times = [
    "2026-08-10T02:00:00.000Z",
    "2026-08-10T02:00:00.000Z",
    "2026-08-10T02:00:00.000Z",
    "2026-08-12T02:00:00.000Z",
  ];

  for (const [index, record] of cases.entries()) {
    const report = evaluateReleaseBlockerClosureRecord(record, { now: new Date(times[index]) });
    assert.equal(report.ready, false);
    assert.equal(report.mayOpenDependentLanes, false);
    assert.equal(report.unblockOwner, "09 DRE (Deployment & Reliability Engineer)");
  }
});

test("retirement requires all nine references closed or superseded and two later passing cycles", async () => {
  const fixture = await readObservedFixture();
  const incomplete = evaluateReleaseBlockerRetirement({
    observedReferences: fixture.observedReferences,
    referenceDispositions: fixture.observedReferences.slice(0, 8).map((issueRef) => ({
      issueRef,
      disposition: "closed",
    })),
    subsequentReleaseCycles: [{ releaseRef: "LUC-3001", gatePassed: true }],
  });
  assert.equal(incomplete.retirementReady, false);
  assert.deepEqual(incomplete.unresolvedReferences, ["LUC-2194"]);

  const complete = evaluateReleaseBlockerRetirement({
    observedReferences: fixture.observedReferences,
    referenceDispositions: fixture.observedReferences.map((issueRef, index) => ({
      issueRef,
      disposition: index % 2 === 0 ? "closed" : "superseded",
    })),
    subsequentReleaseCycles: [
      { releaseRef: "LUC-3001", gatePassed: true },
      { releaseRef: "LUC-3002", gatePassed: true },
    ],
  });
  assert.equal(complete.retirementReady, true);
  assert.equal(complete.observedReferenceCount, 9);
  assert.equal(complete.passedSubsequentReleaseCycles.length, 2);
});
