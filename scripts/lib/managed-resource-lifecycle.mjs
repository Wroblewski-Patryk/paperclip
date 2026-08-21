const UUID_TOKEN = /^[a-z0-9][a-z0-9-]{7,63}$/i;

export const MANAGED_RESOURCE_LIFECYCLE_MARKER = "softwarehouse-managed-resource-lifecycle:v1";

export function assertBoundedResourceRef(value, label) {
  const normalized = String(value ?? "").trim();
  if (!UUID_TOKEN.test(normalized)) throw new Error(`${label} must be an exact provider resource identifier`);
  return normalized;
}

export function assertTeardownAuthorization({ issue, applicationUuid, projectUuid, environmentUuid, excludedResourceUuids = [] }) {
  const description = String(issue?.description ?? "");
  const required = [
    MANAGED_RESOURCE_LIFECYCLE_MARKER,
    `provider: coolify`,
    `applicationUuid: ${applicationUuid}`,
    `projectUuid: ${projectUuid}`,
    `environmentUuid: ${environmentUuid}`,
    `disposition: teardown_authorized`,
  ];
  const missing = required.filter((token) => !description.includes(token));
  if (missing.length > 0) throw new Error(`Issue is missing teardown authorization tokens: ${missing.join(", ")}`);
  for (const excluded of excludedResourceUuids) {
    if (!description.includes(`excludedResourceUuid: ${excluded}`)) {
      throw new Error(`Issue does not explicitly exclude protected resource ${excluded}`);
    }
  }
}

export function assertEnvironmentTeardownAuthorization({ issue, applicationUuid, projectUuid, environmentUuid, excludedResourceUuids = [] }) {
  assertTeardownAuthorization({ issue, applicationUuid, projectUuid, environmentUuid, excludedResourceUuids });
  const description = String(issue?.description ?? "");
  if (!description.includes("environmentDisposition: teardown_authorized")) {
    throw new Error("Issue is missing explicit empty-environment teardown authorization");
  }
}

export function assertApplicationBoundary({ application, environment, applicationUuid, environmentUuid, excludedResourceUuids = [] }) {
  const actualUuid = String(application?.uuid ?? "");
  if (actualUuid !== applicationUuid) throw new Error("Coolify returned a different application than requested");
  if (excludedResourceUuids.includes(actualUuid)) throw new Error("Target application is protected by an exclusion");
  const actualEnvironmentId = String(application?.environment_id ?? application?.environmentId ?? "");
  const expectedEnvironmentId = String(environment?.id ?? "");
  const actualEnvironmentUuid = String(environment?.uuid ?? environmentUuid ?? "");
  if (!expectedEnvironmentId || actualEnvironmentId !== expectedEnvironmentId) {
    throw new Error("Application does not belong to the authorized environment");
  }
  if (actualEnvironmentUuid !== environmentUuid) throw new Error("Coolify returned a different environment than requested");
}

export function assertUnusedTemporaryApplication(application, { deploymentHistoryDisposition = null } = {}) {
  const status = String(application?.status ?? "").toLowerCase();
  const fqdn = String(application?.fqdn ?? "").trim();
  if (!Array.isArray(application?.deployments)) throw new Error("Deployment history was not returned as an inspectable list");
  const deployments = application.deployments;
  if (!status.startsWith("exited")) throw new Error(`Temporary application is not stopped: ${status || "unknown"}`);
  if (fqdn) throw new Error("Temporary application has an active FQDN and requires a separate retention decision");
  if (deployments.length > 0 && deploymentHistoryDisposition !== "disposable_qa_delete_without_backup") {
    throw new Error("Temporary application has deployment history and requires data/retention review");
  }
}

export function coolifyApplicationDeleteRoute(applicationUuid) {
  const uuid = assertBoundedResourceRef(applicationUuid, "applicationUuid");
  const params = new URLSearchParams({
    delete_configurations: "true",
    delete_volumes: "true",
    docker_cleanup: "true",
    delete_connected_networks: "true",
  });
  return `/api/v1/applications/${encodeURIComponent(uuid)}?${params.toString()}`;
}

export const COOLIFY_ENVIRONMENT_RESOURCE_RELATIONS = [
  "applications",
  "mariadbs",
  "mongodbs",
  "mysqls",
  "postgresqls",
  "redis",
  "services",
];

export function assertEmptyCoolifyEnvironment(environment, { allowMissingSharedVariableField = false } = {}) {
  const counts = {};
  for (const key of COOLIFY_ENVIRONMENT_RESOURCE_RELATIONS) {
    if (!Array.isArray(environment?.[key])) throw new Error(`Coolify environment relation ${key} is not inspectable`);
    counts[key] = environment[key].length;
  }
  const nonEmpty = Object.entries(counts).filter(([, count]) => count > 0);
  if (nonEmpty.length > 0) {
    throw new Error(`Coolify environment is not empty: ${nonEmpty.map(([key, count]) => `${key}=${count}`).join(", ")}`);
  }
  const sharedVariableFields = ["environment_variables", "shared_variables", "sharedVariables"]
    .filter((key) => Object.hasOwn(environment ?? {}, key));
  if (sharedVariableFields.length === 0 && !allowMissingSharedVariableField) {
    throw new Error("Coolify environment does not expose an inspectable shared-variable field");
  }
  for (const key of sharedVariableFields) {
    if (!Array.isArray(environment[key])) throw new Error(`Coolify environment field ${key} is not inspectable`);
    if (environment[key].length > 0) throw new Error(`Coolify environment has ${environment[key].length} ${key} entries`);
  }
  return { relationCounts: counts, sharedVariableFields };
}

export function coolifyEnvironmentDeleteRoute(projectUuid, environmentUuid) {
  const project = assertBoundedResourceRef(projectUuid, "projectUuid");
  const environment = assertBoundedResourceRef(environmentUuid, "environmentUuid");
  return `/api/v1/projects/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`;
}

function contractField(description, name) {
  const match = String(description ?? "").match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "im"));
  return match?.[1]?.trim() ?? null;
}

export function evaluateManagedResourceLifecycles(issues, now = new Date()) {
  const contracts = (Array.isArray(issues) ? issues : [])
    .filter((issue) => String(issue?.description ?? "").includes(MANAGED_RESOURCE_LIFECYCLE_MARKER))
    .map((issue) => ({
      issue,
      resourceUuid: contractField(issue.description, "applicationUuid") ?? contractField(issue.description, "resourceUuid"),
      disposition: contractField(issue.description, "disposition"),
      expiresAt: contractField(issue.description, "expiresAt"),
      nextReviewAt: contractField(issue.description, "nextReviewAt"),
      teardownEvidence: contractField(issue.description, "teardownEvidence"),
    }));
  const findings = [];
  const finalStatuses = new Set(["done", "cancelled"]);
  for (const contract of contracts) {
    const label = contract.issue.identifier ?? contract.issue.id ?? "unknown";
    if (!contract.resourceUuid || !contract.disposition) {
      findings.push({ code: "managed_resource_contract_incomplete", issue: label, resourceUuid: contract.resourceUuid });
      continue;
    }
    if (contract.disposition === "teardown_authorized" && contract.teardownEvidence !== "verified") {
      findings.push({ code: "managed_resource_teardown_unverified", issue: label, resourceUuid: contract.resourceUuid });
    }
    if (!finalStatuses.has(contract.issue.status) && ["active", "retained"].includes(contract.disposition)) {
      const boundary = contract.expiresAt ?? contract.nextReviewAt;
      if (!boundary || !Number.isFinite(Date.parse(boundary)) || Date.parse(boundary) <= now.getTime()) {
        findings.push({ code: "managed_resource_lease_expired_or_missing", issue: label, resourceUuid: contract.resourceUuid });
      }
    }
    if (finalStatuses.has(contract.issue.status) && contract.disposition !== "deleted" && contract.teardownEvidence !== "verified") {
      findings.push({ code: "managed_resource_closed_without_teardown", issue: label, resourceUuid: contract.resourceUuid });
    }
  }
  const openByResource = new Map();
  for (const contract of contracts.filter((item) => !finalStatuses.has(item.issue.status) && item.resourceUuid)) {
    const bucket = openByResource.get(contract.resourceUuid) ?? [];
    bucket.push(contract.issue.identifier ?? contract.issue.id ?? "unknown");
    openByResource.set(contract.resourceUuid, bucket);
  }
  for (const [resourceUuid, labels] of openByResource) {
    if (labels.length > 1) findings.push({ code: "managed_resource_duplicate_ownership", resourceUuid, issues: labels.sort() });
  }
  return { contracts, findings };
}
