import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evaluateCapabilityRelations, evaluateProbe, scoreCapability, valueAt } from "./lib/extension-utilization.mjs";

test("reads nested values and array lengths", () => {
  assert.equal(valueAt({ cycles: [{ id: 1 }] }, "cycles.length"), 1);
});

test("evaluates runtime evidence rather than endpoint existence alone", () => {
  assert.equal(evaluateProbe([{ state: "open" }], { shape: "array", minItems: 1, where: { state: "open" } }).passed, true);
  assert.equal(evaluateProbe([], { shape: "array", minItems: 1 }).passed, false);
  assert.equal(evaluateProbe({ stale: true }, { shape: "object", equals: { stale: false } }).passed, false);
});

test("does not treat productive runs as a topology failure when no restart is pending", () => {
  const result = evaluateProbe({
    status: "ok",
    devServer: {
      restartRequired: false,
      waitingForIdle: false,
      restartBlockingRunCount: 3,
    },
  }, {
    shape: "object",
    equals: {
      status: "ok",
      "devServer.restartRequired": false,
      "devServer.waitingForIdle": false,
    },
  });
  assert.equal(result.passed, true);
});

test("requires all four completion dimensions to reach full utilization", () => {
  const staticResult = {
    fileChecks: [{ passed: true }, { passed: true }],
    integrationChecks: [{ passed: true }],
    proofChecks: [{ passed: true }],
  };
  assert.deepEqual(scoreCapability(staticResult, [{ passed: true }]), {
    dimensions: { implementation: 25, integration: 25, runtime: 25, proof: 25 },
    utilizationPercent: 100,
  });
  assert.equal(scoreCapability(staticResult, [{ passed: false }]).utilizationPercent, 75);
});

test("propagates a dependency failure to its consumers", () => {
  const result = evaluateCapabilityRelations([
    { id: "runtime", localPassed: false },
    { id: "delivery", localPassed: true },
  ], [{ from: "delivery", to: "runtime", type: "depends_on" }]);
  assert.equal(result.passed, true);
  assert.equal(result.byCapability.runtime.passed, false);
  assert.equal(result.byCapability.delivery.passed, false);
  assert.deepEqual(result.byCapability.delivery.dependencyFailures, ["runtime"]);
  assert.deepEqual(result.byCapability.runtime.consumers, ["delivery"]);
});

test("rejects missing relation endpoints and dependency cycles", () => {
  const missing = evaluateCapabilityRelations([{ id: "a", localPassed: true }], [
    { from: "a", to: "missing", type: "depends_on" },
  ]);
  assert.equal(missing.passed, false);
  assert.match(missing.structuralFailures.join("\n"), /target is missing/);

  const cyclic = evaluateCapabilityRelations([
    { id: "a", localPassed: true },
    { id: "b", localPassed: true },
  ], [
    { from: "a", to: "b", type: "depends_on" },
    { from: "b", to: "a", type: "depends_on" },
  ]);
  assert.equal(cyclic.passed, false);
  assert.match(cyclic.structuralFailures.join("\n"), /dependency cycle/);
});

test("the registry and recurring control tick enforce complete capabilities", async () => {
  const registry = JSON.parse(await readFile("softwarehouse/extension-utilization-registry.json", "utf8"));
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");
  assert.equal(registry.minimumUtilizationPercent, 100);
  assert.equal(registry.schemaVersion, 2);
  assert.ok(registry.capabilities.length >= 13);
  const decisionCenter = registry.capabilities.find((capability) => capability.id === "owner_decision_center");
  assert.ok(decisionCenter);
  assert.deepEqual(decisionCenter.runtimeProbes[0].pathMinimums, {
    "counts.allOpen": 0,
    "items.length": 0,
  }, "An empty owner-decision queue is a healthy, inspectable state rather than a utilization failure");
  assert.ok(registry.relations.some((relation) => relation.from === "owner_decision_center"));
  assert.match(controlTick, /name: "extensionUtilization"/);
  assert.match(controlTick, /scripts\/audit-extension-utilization\.mjs/);
  const bridge = registry.capabilities.find((capability) => capability.id === "roost_portfolio_bridge");
  assert.equal(bridge.runtimeProbes[0].pathMinimums, undefined,
    "The bridge utilization probe must not depend on items derived from the previous control tick");
  assert.equal(bridge.runtimeProbes[0].equals?.stale, undefined,
    "The bridge utilization probe must not require freshness derived from the control tick it gates");
});
