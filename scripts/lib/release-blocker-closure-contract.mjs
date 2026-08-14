export const releaseBlockerClosureDocPaths = [
  "docs/softwarehouse-sdlc.md",
  "docs/softwarehouse/08-devops-and-release.md",
  "docs/softwarehouse/templates/release-checklist-template.md",
  "softwarehouse/instructions/shared/20-release-and-deploy-safety.md",
];

export const releaseBlockerClosureFieldKeys = [
  "blockerRef",
  "candidateSha",
  "candidateParentSha",
  "sourceRepository",
  "sourceBranch",
  "targetEnvironment",
  "lineageEvidenceRef",
  "unblockOwner",
  "protectedGateContract",
  "protectedGateStatus",
  "protectedGateEvidenceRef",
  "rollbackPath",
  "rollbackOwner",
  "freshVerificationEvidence",
  "verifiedCandidateSha",
  "verifiedAt",
  "verificationMaxAgeHours",
  "dependentLaneRefs",
];

const contractMarker = "release-blocker-closure:v1";
const exactGitShaPattern = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const issueRefPattern = /^[A-Z][A-Z0-9]*-\d+$/;
const terminalReferenceDispositions = new Set(["closed", "superseded"]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(hasText);
}

function parseInstant(value) {
  if (!hasText(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function auditReleaseBlockerClosureDocuments(documentsByPath) {
  const findings = [];

  for (const docPath of releaseBlockerClosureDocPaths) {
    const text = documentsByPath?.[docPath];
    if (!hasText(text)) {
      findings.push({
        severity: "error",
        type: "release_blocker_closure_contract_missing_doc",
        path: docPath,
      });
      continue;
    }

    const missingFields = releaseBlockerClosureFieldKeys.filter(
      (field) => !text.includes(`\`${field}\``),
    );
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    const missingMarkers = [
      contractMarker,
      "before dependent implementation or qa lanes open",
      "fail closed",
    ].filter((marker) => !normalized.includes(marker));

    if (missingFields.length > 0 || missingMarkers.length > 0) {
      findings.push({
        severity: "error",
        type: "release_blocker_closure_contract_drift",
        path: docPath,
        missingFields,
        missingMarkers,
      });
    }
  }

  return findings;
}

export function evaluateReleaseBlockerClosureRecord(record, options = {}) {
  const input = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const missingFields = releaseBlockerClosureFieldKeys.filter((field) => {
    if (field === "dependentLaneRefs") return !isNonEmptyStringArray(input[field]);
    if (field === "verificationMaxAgeHours") {
      return !Number.isFinite(input[field]) || input[field] <= 0;
    }
    return !hasText(input[field]);
  });
  const invalidFields = [];

  if (hasText(input.contractVersion) && input.contractVersion !== contractMarker) {
    invalidFields.push("contractVersion");
  }
  if (hasText(input.candidateSha) && !exactGitShaPattern.test(input.candidateSha)) {
    invalidFields.push("candidateSha");
  }
  if (hasText(input.candidateParentSha) && !exactGitShaPattern.test(input.candidateParentSha)) {
    invalidFields.push("candidateParentSha");
  }
  if (
    hasText(input.candidateSha)
    && hasText(input.candidateParentSha)
    && input.candidateSha.toLowerCase() === input.candidateParentSha.toLowerCase()
  ) {
    invalidFields.push("candidateParentSha");
  }
  if (
    hasText(input.candidateSha)
    && hasText(input.verifiedCandidateSha)
    && input.candidateSha.toLowerCase() !== input.verifiedCandidateSha.toLowerCase()
  ) {
    invalidFields.push("verifiedCandidateSha");
  }
  if (hasText(input.verifiedCandidateSha) && !exactGitShaPattern.test(input.verifiedCandidateSha)) {
    invalidFields.push("verifiedCandidateSha");
  }
  if (isNonEmptyStringArray(input.dependentLaneRefs)) {
    if (input.dependentLaneRefs.some((ref) => !issueRefPattern.test(ref.trim()))) {
      invalidFields.push("dependentLaneRefs");
    }
    if (new Set(input.dependentLaneRefs.map((ref) => ref.trim())).size !== input.dependentLaneRefs.length) {
      invalidFields.push("dependentLaneRefs");
    }
  }

  const verifiedAt = parseInstant(input.verifiedAt);
  if (hasText(input.verifiedAt) && verifiedAt === null) invalidFields.push("verifiedAt");
  if (verifiedAt !== null && verifiedAt > now.getTime() + 5 * 60 * 1000) invalidFields.push("verifiedAt");

  const ageHours = verifiedAt === null ? null : (now.getTime() - verifiedAt) / 3_600_000;
  const verificationFresh = ageHours !== null
    && Number.isFinite(input.verificationMaxAgeHours)
    && ageHours >= 0
    && ageHours <= input.verificationMaxAgeHours;

  if (missingFields.length > 0 || invalidFields.length > 0) {
    return {
      ready: false,
      decision: "blocked",
      mayOpenDependentLanes: false,
      unblockOwner: hasText(input.unblockOwner) ? input.unblockOwner.trim() : null,
      dependentLaneRefs: isNonEmptyStringArray(input.dependentLaneRefs) ? input.dependentLaneRefs : [],
      missingFields,
      invalidFields: [...new Set(invalidFields)],
      verificationFresh,
      reason: "Release blocker closure packet is incomplete or invalid; dependent implementation and QA lanes must remain closed.",
    };
  }

  if (input.protectedGateStatus !== "cleared") {
    return {
      ready: false,
      decision: "blocked",
      mayOpenDependentLanes: false,
      unblockOwner: input.unblockOwner.trim(),
      dependentLaneRefs: input.dependentLaneRefs,
      missingFields: [],
      invalidFields: [],
      verificationFresh,
      reason: "The named protected gate is not cleared; the accountable unblock owner must keep dependent lanes closed.",
    };
  }

  if (!verificationFresh) {
    return {
      ready: false,
      decision: "blocked",
      mayOpenDependentLanes: false,
      unblockOwner: input.unblockOwner.trim(),
      dependentLaneRefs: input.dependentLaneRefs,
      missingFields: [],
      invalidFields: [],
      verificationFresh: false,
      reason: "Exact-candidate verification evidence is stale; refresh it before dependent lanes open.",
    };
  }

  return {
    ready: true,
    decision: "cleared",
    mayOpenDependentLanes: true,
    unblockOwner: input.unblockOwner.trim(),
    dependentLaneRefs: input.dependentLaneRefs,
    missingFields: [],
    invalidFields: [],
    verificationFresh: true,
    reason: "Candidate identity, lineage, protected gate, rollback, and fresh exact-candidate verification are complete.",
  };
}

export function evaluateReleaseBlockerRetirement(record) {
  const input = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const observedReferences = Array.isArray(input.observedReferences) ? input.observedReferences : [];
  const referenceDispositions = Array.isArray(input.referenceDispositions)
    ? input.referenceDispositions
    : [];
  const releaseCycles = Array.isArray(input.subsequentReleaseCycles)
    ? input.subsequentReleaseCycles
    : [];
  const dispositionByRef = new Map(
    referenceDispositions
      .filter((entry) => entry && hasText(entry.issueRef))
      .map((entry) => [entry.issueRef.trim(), entry.disposition]),
  );
  const unresolvedReferences = observedReferences.filter(
    (ref) => !terminalReferenceDispositions.has(dispositionByRef.get(ref)),
  );
  const passedCycleRefs = [...new Set(
    releaseCycles
      .filter((cycle) => cycle?.gatePassed === true && hasText(cycle.releaseRef))
      .map((cycle) => cycle.releaseRef.trim()),
  )];
  const missingFields = [];
  if (observedReferences.length === 0) missingFields.push("observedReferences");
  if (referenceDispositions.length === 0) missingFields.push("referenceDispositions");
  if (releaseCycles.length === 0) missingFields.push("subsequentReleaseCycles");

  const retirementReady = missingFields.length === 0
    && unresolvedReferences.length === 0
    && passedCycleRefs.length >= 2;

  return {
    retirementReady,
    missingFields,
    observedReferenceCount: observedReferences.length,
    unresolvedReferences,
    passedSubsequentReleaseCycles: passedCycleRefs,
    reason: retirementReady
      ? "Every observed reference is closed or superseded and two subsequent release cycles passed the gate."
      : "Retain the prevention until every observed reference is closed or superseded and two subsequent release cycles pass the gate.",
  };
}
