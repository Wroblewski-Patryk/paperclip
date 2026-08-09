export const protectedAccessLaneEntryDocPaths = [
  "docs/softwarehouse-sdlc.md",
  "docs/agent-policy-gates.md",
  "docs/operations/environment-matrix.md",
  "docs/softwarehouse/local-first-shippable-gate-bundle.md",
];

export const protectedAccessLaneEntryFieldKeys = [
  "readOnlyDeploymentStatusPath",
  "nonDestructiveProtectedSmokeOrTestAccountPath",
  "secretRefOrBindingAliases",
  "responsibleRoles",
  "downstreamUnblockTargets",
  "blockerOwnershipIssue",
];

export const protectedCredentialProofDocPaths = [
  "docs/softwarehouse-sdlc.md",
  "docs/softwarehouse/templates/task-template.md",
  "docs/softwarehouse/templates/release-checklist-template.md",
  "softwarehouse/instructions/shared/30-credentials-and-accounts.md",
];

export const protectedCredentialProofFieldKeys = [
  "taskRef",
  "protectedAction",
  "credentialProofOwner",
  "environment",
  "credentialOrAccountAlias",
  "accessScope",
  "proofStatus",
  "expiryOrRotationPath",
  "leastPrivilegeUnblockAction",
];

export const protectedCredentialProofBlockedFieldKeys = [
  "missingProof",
  "blockerIssue",
  "blockedTask",
];

const protectedCredentialProofStatuses = new Set(["cleared", "blocked", "not_applicable"]);
const forbiddenSecretValueFieldPattern = /^(secretValue|credentialValue|password|token|apiKey|cookie|sessionValue)$/i;

const requiredMarkers = [
  "protected-access-lane-entry:v1",
  "production-bound",
  "before follow-on work opens",
];

const protectedCredentialProofMarkers = [
  "protected-credential-proof:v1",
  "do not request or store secret values",
];

function hasValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;
}

export function auditProtectedAccessLaneEntryDocuments(documentsByPath) {
  const findings = [];

  for (const docPath of protectedAccessLaneEntryDocPaths) {
    const text = documentsByPath?.[docPath];
    if (typeof text !== "string" || !text.trim()) {
      findings.push({
        severity: "error",
        type: "protected_access_lane_entry_contract_missing_doc",
        path: docPath,
      });
      continue;
    }

    const missingFields = protectedAccessLaneEntryFieldKeys.filter(
      (field) => !text.includes(`\`${field}\``),
    );
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    const missingMarkers = requiredMarkers.filter(
      (marker) => !normalized.includes(marker.toLowerCase()),
    );

    if (missingFields.length > 0 || missingMarkers.length > 0) {
      findings.push({
        severity: "error",
        type: "protected_access_lane_entry_contract_drift",
        path: docPath,
        missingFields,
        missingMarkers,
      });
    }
  }

  return findings;
}

export function auditProtectedCredentialProofDocuments(documentsByPath) {
  const findings = [];

  for (const docPath of protectedCredentialProofDocPaths) {
    const text = documentsByPath?.[docPath];
    if (typeof text !== "string" || !text.trim()) {
      findings.push({
        severity: "error",
        type: "protected_credential_proof_contract_missing_doc",
        path: docPath,
      });
      continue;
    }

    const requiredFields = [
      ...protectedCredentialProofFieldKeys,
      ...protectedCredentialProofBlockedFieldKeys,
    ];
    const missingFields = requiredFields.filter((field) => !text.includes(`\`${field}\``));
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    const missingMarkers = protectedCredentialProofMarkers.filter(
      (marker) => !normalized.includes(marker.toLowerCase()),
    );

    if (missingFields.length > 0 || missingMarkers.length > 0) {
      findings.push({
        severity: "error",
        type: "protected_credential_proof_contract_drift",
        path: docPath,
        missingFields,
        missingMarkers,
      });
    }
  }

  return findings;
}

export function evaluateProtectedCredentialProofRecord(record) {
  const input = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const forbiddenFields = Object.keys(input).filter((field) => forbiddenSecretValueFieldPattern.test(field));
  const proofStatus = typeof input.proofStatus === "string" ? input.proofStatus.trim() : "";

  if (forbiddenFields.length > 0) {
    return {
      ready: false,
      decision: "blocked",
      proofStatus: proofStatus || "invalid",
      missingFields: [],
      forbiddenFields,
      reason: "Secret-value fields are forbidden; record aliases and value-free proof references only.",
    };
  }

  if (!protectedCredentialProofStatuses.has(proofStatus)) {
    return {
      ready: false,
      decision: "blocked",
      proofStatus: proofStatus || "missing",
      missingFields: ["proofStatus"],
      forbiddenFields: [],
      reason: "proofStatus must be cleared, blocked, or not_applicable.",
    };
  }

  if (proofStatus === "not_applicable") {
    const missingFields = ["taskRef", "notApplicableReason"].filter((field) => !hasValue(input[field]));
    return {
      ready: missingFields.length === 0,
      decision: missingFields.length === 0 ? "not_applicable" : "blocked",
      proofStatus,
      missingFields,
      forbiddenFields: [],
      reason: missingFields.length === 0
        ? "The task records why no protected credential/account path is required."
        : "A task-scoped not-applicable rationale is required.",
    };
  }

  const requiredFields = [...protectedCredentialProofFieldKeys];
  if (proofStatus === "cleared") requiredFields.push("proofRef");
  if (proofStatus === "blocked") requiredFields.push(...protectedCredentialProofBlockedFieldKeys);
  const missingFields = requiredFields.filter((field) => !hasValue(input[field]));

  if (proofStatus === "blocked") {
    return {
      ready: false,
      decision: "blocked",
      proofStatus,
      missingFields,
      forbiddenFields: [],
      reason: missingFields.length === 0
        ? "Credential/account proof is unavailable; the named dependent task must remain blocked on the owner-scoped action."
        : "The blocked proof record is incomplete and cannot route a least-privilege unblock path.",
    };
  }

  return {
    ready: missingFields.length === 0,
    decision: missingFields.length === 0 ? "cleared" : "blocked",
    proofStatus,
    missingFields,
    forbiddenFields: [],
    reason: missingFields.length === 0
      ? "Credential/account proof is complete for the named task, environment, and least-privilege scope."
      : "Protected work must not start until the cleared proof record is complete.",
  };
}
