import test from "node:test";
import assert from "node:assert/strict";
import { changedPathKind, projectDeploymentReadiness, releaseDecision } from "./lib/release-delivery-policy.mjs";

function repo(overrides = {}) {
  return {
    name: "Roost",
    exists: true,
    upstream: "origin/main",
    ahead: 111,
    behind: 0,
    dirtyLines: [],
    batchKinds: ["code", "tests", "docs", "release-risk"],
    ...overrides,
  };
}

test("committed application paths classify the release batch", () => {
  assert.equal(changedPathKind("src/modules/product-map/service.ts"), "code");
  assert.equal(changedPathKind("prisma/migrations/20260728_product_map/migration.sql"), "release-risk");
  assert.equal(changedPathKind("docs/operations/release.md"), "docs");
});

test("legacy reconciler readiness is Soar-only", () => {
  const report = { overall: "ready", resourceCount: 8 };
  assert.equal(projectDeploymentReadiness(report, "Soar").overall, "ready");
  assert.equal(projectDeploymentReadiness(report, "Roost"), null);
});

test("clean Roost delivery debt is blocked without project-specific Coolify readiness", () => {
  const decision = releaseDecision(repo(), null, null);
  assert.equal(decision.decision, "push_blocked_until_project_coolify_ready");
  assert.equal(decision.pushAllowed, false);
  assert.match(decision.deployImpact, /auto-redeploy expected/);
});

test("clean meaningful Roost batch becomes a push candidate with current project readiness", () => {
  const decision = releaseDecision(repo(), null, { overall: "ready" });
  assert.equal(decision.decision, "push_candidate_requires_ops_verification");
  assert.equal(decision.pushAllowed, true);
  assert.equal(decision.deployImpact, "auto-redeploy expected");
});

test("missing upstream never becomes a push candidate", () => {
  const decision = releaseDecision(repo({ name: "Featherly", upstream: null }), null, { overall: "ready" });
  assert.equal(decision.decision, "push_blocked_until_upstream_known");
  assert.equal(decision.pushAllowed, false);
});
