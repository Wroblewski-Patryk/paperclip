import assert from "node:assert/strict";
import test from "node:test";
import { evaluateApplicationWork, loadApplicationVersionPolicy, orderApplicationVersionPolicyActions } from "./lib/application-version-policy.mjs";

const policy = loadApplicationVersionPolicy();

test("Soar v0 repair remains runnable", () => {
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Repair DCA across paper and live" }).disposition, "authorized_current");
});

test("Soar mobile and MCP work remain locked behind predecessors", () => {
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Create mobile app" }).targetVersion, "v1");
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Create mobile app" }).disposition, "future_version_locked");
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Add MCP agent API" }).targetVersion, "v2");
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Add MCP agent API" }).disposition, "future_version_locked");
});

test("platform V0 wording cannot unlock an application release", () => {
  const result = evaluateApplicationWork({ policy, projectName: "11 Innovation: Soar", title: "Softwarehouse platform V0: build mobile app" });
  assert.equal(result.disposition, "future_version_locked");
  assert.equal(result.targetVersion, "v1");
});

test("Featherly rejects foreign exchange scope but allows CMS scope", () => {
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Featherly", title: "Add exchange connection" }).disposition, "product_domain_not_authorized");
  assert.equal(evaluateApplicationWork({ policy, projectName: "11 Innovation: Featherly", title: "Repair multilingual page publishing" }).disposition, "authorized_current");
});

test("invalid descendants close before a forbidden root that dependency repair could reopen", () => {
  const actions = orderApplicationVersionPolicyActions([
    { identifier: "ROOT", reasonCode: "product_scope.domain_not_authorized" },
    { identifier: "REVIEW", reasonCode: "product_scope.invalid_ancestor" },
  ]);
  assert.deepEqual(actions.map((action) => action.identifier), ["REVIEW", "ROOT"]);
});
