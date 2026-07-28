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

const requiredMarkers = [
  "protected-access-lane-entry:v1",
  "production-bound",
  "before follow-on work opens",
];

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
