import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evaluateProbe, scoreCapability, valueAt } from "./lib/extension-utilization.mjs";

test("reads nested values and array lengths", () => {
  assert.equal(valueAt({ cycles: [{ id: 1 }] }, "cycles.length"), 1);
});

test("evaluates runtime evidence rather than endpoint existence alone", () => {
  assert.equal(evaluateProbe([{ state: "open" }], { shape: "array", minItems: 1, where: { state: "open" } }).passed, true);
  assert.equal(evaluateProbe([], { shape: "array", minItems: 1 }).passed, false);
  assert.equal(evaluateProbe({ stale: true }, { shape: "object", equals: { stale: false } }).passed, false);
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

test("the registry and recurring control tick enforce complete capabilities", async () => {
  const registry = JSON.parse(await readFile("softwarehouse/extension-utilization-registry.json", "utf8"));
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");
  assert.equal(registry.minimumUtilizationPercent, 100);
  assert.ok(registry.capabilities.length >= 10);
  assert.match(controlTick, /name: "extensionUtilization"/);
  assert.match(controlTick, /scripts\/audit-extension-utilization\.mjs/);
});
