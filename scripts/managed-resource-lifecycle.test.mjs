import assert from "node:assert/strict";
import test from "node:test";
import {
  MANAGED_RESOURCE_LIFECYCLE_MARKER,
  assertApplicationBoundary,
  assertEmptyCoolifyEnvironment,
  assertEnvironmentTeardownAuthorization,
  assertTeardownAuthorization,
  assertUnusedTemporaryApplication,
  coolifyApplicationDeleteRoute,
  coolifyEnvironmentDeleteRoute,
  evaluateManagedResourceLifecycles,
} from "./lib/managed-resource-lifecycle.mjs";

const applicationUuid = "qa-application-1234";
const projectUuid = "project-12345678";
const environmentUuid = "environment-1234";
const productionUuid = "production-app-12";
const authorization = {
  description: [
    MANAGED_RESOURCE_LIFECYCLE_MARKER,
    "provider: coolify",
    `applicationUuid: ${applicationUuid}`,
    `projectUuid: ${projectUuid}`,
    `environmentUuid: ${environmentUuid}`,
    "disposition: teardown_authorized",
    `excludedResourceUuid: ${productionUuid}`,
  ].join("\n"),
};
const environmentAuthorization = {
  description: `${authorization.description}\nenvironmentDisposition: teardown_authorized`,
};

test("teardown requires an exact issue authorization and production exclusion", () => {
  assert.doesNotThrow(() => assertTeardownAuthorization({
    issue: authorization,
    applicationUuid,
    projectUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }));
  assert.throws(() => assertTeardownAuthorization({
    issue: { description: authorization.description.replace("disposition: teardown_authorized", "disposition: planned") },
    applicationUuid,
    projectUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }), /missing teardown authorization/);
});

test("lifecycle audit catches expired leases, duplicate ownership, and paper-only teardown", () => {
  const active = `${MANAGED_RESOURCE_LIFECYCLE_MARKER}\napplicationUuid: qa-resource-1234\ndisposition: active\nexpiresAt: 2026-08-20T00:00:00.000Z`;
  const teardown = `${MANAGED_RESOURCE_LIFECYCLE_MARKER}\napplicationUuid: old-resource-12\ndisposition: teardown_authorized`;
  const result = evaluateManagedResourceLifecycles([
    { identifier: "LUC-1", status: "todo", description: active },
    { identifier: "LUC-2", status: "blocked", description: active },
    { identifier: "LUC-3", status: "done", description: teardown },
  ], new Date("2026-08-21T00:00:00.000Z"));
  assert.ok(result.findings.some((item) => item.code === "managed_resource_lease_expired_or_missing"));
  assert.ok(result.findings.some((item) => item.code === "managed_resource_duplicate_ownership"));
  assert.ok(result.findings.some((item) => item.code === "managed_resource_teardown_unverified"));
  assert.ok(result.findings.some((item) => item.code === "managed_resource_closed_without_teardown"));
});

test("provider readback must match the exact environment and cannot target production", () => {
  assert.doesNotThrow(() => assertApplicationBoundary({
    application: { uuid: applicationUuid, environment_id: 16 },
    environment: { id: 16, uuid: environmentUuid },
    applicationUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }));
  assert.throws(() => assertApplicationBoundary({
    application: { uuid: productionUuid, environment_id: 16 },
    environment: { id: 16, uuid: environmentUuid },
    applicationUuid: productionUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }), /protected by an exclusion/);
});

test("only a stopped, unpublished, never-deployed temporary application qualifies", () => {
  assert.doesNotThrow(() => assertUnusedTemporaryApplication({ status: "exited:unhealthy", fqdn: null, deployments: [] }));
  assert.throws(() => assertUnusedTemporaryApplication({ status: "running:healthy", fqdn: null, deployments: [] }), /not stopped/);
  assert.throws(() => assertUnusedTemporaryApplication({ status: "exited:unhealthy", fqdn: "https://qa.example", deployments: [] }), /active FQDN/);
  assert.throws(() => assertUnusedTemporaryApplication({ status: "exited:unhealthy", fqdn: null, deployments: [{ id: 1 }] }), /deployment history/);
  assert.doesNotThrow(() => assertUnusedTemporaryApplication(
    { status: "exited:unhealthy", fqdn: null, deployments: [{ id: 1 }] },
    { deploymentHistoryDisposition: "disposable_qa_delete_without_backup" },
  ));
});

test("Coolify deletion always includes configurations, volumes, networks, and bounded Docker cleanup", () => {
  const route = coolifyApplicationDeleteRoute(applicationUuid);
  assert.match(route, /^\/api\/v1\/applications\/qa-application-1234\?/);
  for (const token of ["delete_configurations=true", "delete_volumes=true", "docker_cleanup=true", "delete_connected_networks=true"]) {
    assert.match(route, new RegExp(token));
  }
});

test("empty-environment teardown requires a separate exact authorization", () => {
  assert.doesNotThrow(() => assertEnvironmentTeardownAuthorization({
    issue: environmentAuthorization,
    applicationUuid,
    projectUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }));
  assert.throws(() => assertEnvironmentTeardownAuthorization({
    issue: authorization,
    applicationUuid,
    projectUuid,
    environmentUuid,
    excludedResourceUuids: [productionUuid],
  }), /missing explicit empty-environment/);
});

test("empty-environment proof fails closed on resources and uninspectable provider fields", () => {
  const empty = {
    applications: [], mariadbs: [], mongodbs: [], mysqls: [], postgresqls: [], redis: [], services: [],
  };
  assert.throws(() => assertEmptyCoolifyEnvironment(empty), /shared-variable field/);
  assert.deepEqual(
    assertEmptyCoolifyEnvironment(empty, { allowMissingSharedVariableField: true }).relationCounts,
    { applications: 0, mariadbs: 0, mongodbs: 0, mysqls: 0, postgresqls: 0, redis: 0, services: 0 },
  );
  assert.throws(() => assertEmptyCoolifyEnvironment({ ...empty, applications: [{ uuid: applicationUuid }] }, { allowMissingSharedVariableField: true }), /applications=1/);
  assert.throws(() => assertEmptyCoolifyEnvironment({ ...empty, shared_variables: [{}] }), /shared_variables entries/);
});

test("Coolify environment deletion uses only the exact project/environment route", () => {
  assert.equal(
    coolifyEnvironmentDeleteRoute(projectUuid, environmentUuid),
    `/api/v1/projects/${projectUuid}/${environmentUuid}`,
  );
  assert.throws(() => coolifyEnvironmentDeleteRoute("", environmentUuid), /exact provider resource identifier/);
});
