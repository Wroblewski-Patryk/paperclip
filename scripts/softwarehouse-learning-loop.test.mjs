import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOpenIssueTitles,
  classifyLearningGapFromIssues,
  collectTransitiveBlockerRelatedIssues,
  findActiveRunCoveredOpsReleaseBlockerChain,
  findBoardAuthorizationWaitChain,
  findCompletedBlockerDelegatedRecoveryChain,
  findCompliantFailedReleasePermitRecoveryChain,
  findCompliantOpsReleaseBlockerChain,
  findControlPlaneWriteBoundaryRecoveryChain,
  findCoveredProtectedCapabilityCredentialChain,
  findPausedOwnerDelegatedRoutingRepairChain,
  findProjectMutationSourceControlGuardChain,
  findProtectedCoolifyVpsBindingWaitChain,
  findQaToolingProofBlockedChain,
  findStaleNonReleaseRootProtectedBacklogChain,
  findSuppressibleV1LearningDuplicate,
  findSuppressibleV2ReviewDecisionPathDuplicate,
  findSuppressibleV2WorkerFanoutDuplicate,
  parseV1LearningSignature,
  parseV2ReviewDecisionPathLearningSignature,
  parseV2WorkerFanoutLearningSignature,
  resolveLearningOwner,
} from "./lib/softwarehouse-learning-loop.mjs";
import {
  hasPendingRequestConfirmation,
  hasPendingReviewInteraction,
  hasRepeatedRoutineCommentWithoutNewEvidence,
  routineCommentMarkers,
} from "./lib/softwarehouse-routine-gates.mjs";

const terminalStatuses = new Set(["done", "cancelled"]);

test("buildOpenIssueTitles ignores done learning issues so recurring gaps can reopen", () => {
  const titles = buildOpenIssueTitles([
    { title: "[Softwarehouse][Learning] Worker queue fan-out capability gap", status: "done" },
  ], terminalStatuses);

  assert.equal(
    titles.has("[Softwarehouse][Learning] Worker queue fan-out capability gap"),
    false
  );
});

test("buildOpenIssueTitles keeps open learning issues deduped by title", () => {
  const titles = buildOpenIssueTitles([
    { title: "[Softwarehouse][Learning] Worker queue fan-out capability gap", status: "done" },
    { title: "[Softwarehouse][Learning] Worker queue fan-out capability gap", status: "todo" },
    { title: "[Softwarehouse][Learning] In-review decision path capability gap", status: "blocked" },
  ], terminalStatuses);

  assert.equal(
    titles.has("[Softwarehouse][Learning] Worker queue fan-out capability gap"),
    true
  );
  assert.equal(
    titles.has("[Softwarehouse][Learning] In-review decision path capability gap"),
    true
  );
});

test("parseV1LearningSignature extracts the root blocker, area, and boundary", () => {
  const parsed = parseV1LearningSignature({
    description: [
      "softwarehouse-learning-loop:v1",
      "",
      "Root/blocker key: LUC-1439",
      "Area: ops-release",
      "Smallest responsibility boundary: release/deploy evidence, rollback, and protected gate contract",
    ].join("\n"),
  });

  assert.deepEqual(parsed, {
    rootBlocker: "LUC-1439",
    area: "ops-release",
    boundary: "release/deploy evidence, rollback, and protected gate contract",
    signature: [
      "luc-1439",
      "ops-release",
      "release/deploy evidence, rollback, and protected gate contract",
    ].join("\n"),
  });
});

test("parseV2WorkerFanoutLearningSignature extracts the title and queue counts", () => {
  const parsed = parseV2WorkerFanoutLearningSignature({
    title: "[Softwarehouse][Learning] Worker queue fan-out capability gap",
    description: [
      "softwarehouse-learning-loop:v2",
      "",
      "Observed process gap: runnable work is concentrated above the leaf worker layer.",
      "",
      "Planned supervisor issue count: 7",
      "Planned worker issue count: 1",
      "Planned issue count: 9",
      "",
      "Weak tracks:",
      "- Roost: planned worker=1, planned supervisor=0, open=3, blocked=2",
    ].join("\n"),
  });

  assert.deepEqual(parsed, {
    title: "[Softwarehouse][Learning] Worker queue fan-out capability gap",
    area: "worker-fanout",
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 7,
    plannedIssueCount: 9,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=3, blocked=2"],
    weakTrackNames: ["roost"],
    signature: [
      "[softwarehouse][learning] worker queue fan-out capability gap",
      "worker-fanout",
      "1",
      "7",
      "9",
      "roost: planned worker=1, planned supervisor=0, open=3, blocked=2",
    ].join("\n"),
  });
});

test("parseV2ReviewDecisionPathLearningSignature extracts source issue identifiers", () => {
  const parsed = parseV2ReviewDecisionPathLearningSignature({
    title: "[Softwarehouse][Learning] In-review decision path capability gap",
    description: [
      "softwarehouse-learning-loop:v2",
      "",
      "Observed process gap: issues reached in_review without a clear structured decision path.",
      "",
      "Observed issues:",
      "- LUC-1233: [Softwarehouse] Fix control-tick liveRunJanitor timeout (unknown)",
      "- LUC-1451: [Softwarehouse][Learning] In-review decision path capability gap (Paperclip)",
    ].join("\n"),
  });

  assert.deepEqual(parsed, {
    title: "[Softwarehouse][Learning] In-review decision path capability gap",
    area: "review-decision-path",
    sourceIssueIdentifiers: ["LUC-1233", "LUC-1451"],
    signature: [
      "[softwarehouse][learning] in-review decision path capability gap",
      "review-decision-path",
      "luc-1233",
      "luc-1451",
    ].join("\n"),
  });
});

test("resolveLearningOwner maps legacy Ops Release Lead to current DRE roster", () => {
  const owner = resolveLearningOwner([
    {
      id: "dre",
      name: "09 DRE (Deployment & Reliability Engineer)",
      title: "Deployment and Reliability Engineer",
      status: "active",
      urlKey: "09-dre-deployment-reliability-engineer",
      metadata: {
        rosterKey: "deployment-reliability-engineer",
        luckysparrowFinalRole: "09 DRE (Deployment & Reliability Engineer)",
      },
    },
    {
      id: "portfolio",
      name: "Portfolio Director",
      status: "active",
      urlKey: "portfolio-director",
    },
  ], "Ops Release Lead", ["Portfolio Director"]);

  assert.equal(owner.id, "dre");
});

test("resolveLearningOwner falls back when no requested owner or alias exists", () => {
  const owner = resolveLearningOwner([
    {
      id: "portfolio",
      name: "Portfolio Director",
      status: "active",
      urlKey: "portfolio-director",
    },
  ], "Unknown Historical Owner", ["Portfolio Director"]);

  assert.equal(owner.id, "portfolio");
});

test("resolveLearningOwner maps legacy Security Review Lead to current SPA roster", () => {
  const owner = resolveLearningOwner([
    {
      id: "spa",
      name: "10 SPA (Security & Privacy Auditor)",
      title: "Security & Privacy Auditor",
      status: "active",
      urlKey: "10-spa-security-privacy-auditor",
      metadata: {
        rosterKey: "security-privacy-auditor",
        luckysparrowFinalRole: "10 SPA (Security & Privacy Auditor)",
      },
    },
    {
      id: "portfolio",
      name: "Portfolio Director",
      status: "active",
      urlKey: "portfolio-director",
    },
  ], "Security Review Lead", ["Portfolio Director"]);

  assert.equal(owner.id, "spa");
});

test("classifyLearningGapFromIssues prioritizes credential rotation over deploy-smoke wording", () => {
  const gap = classifyLearningGapFromIssues("LUC-496", [
    {
      title: "Coordinate Credential Rotation for Transcript Exposure",
      description: "Rotate exposed Coolify and production account credentials after deploy smoke transcript leakage.",
    },
    {
      title: "Deliver usable VPS production",
      description: "Blocked until credential rotation gate clears.",
    },
  ]);

  assert.deepEqual(gap, {
    area: "security-credentials",
    owner: "Security Review Lead",
    title: "[Softwarehouse][Learning] Security/credential blocker pattern LUC-496",
    boundary: "credential/account proof and least-privilege unblock path",
  });
});

test("findSuppressibleV1LearningDuplicate suppresses a closed exact root blocker duplicate", () => {
  const duplicate = findSuppressibleV1LearningDuplicate({
    issues: [
      {
        id: "learning-1",
        identifier: "LUC-1465",
        title: "[Softwarehouse][Learning] Ops/release blocker pattern LUC-1439",
        status: "done",
        updatedAt: "2026-06-02T08:36:59.047Z",
        description: [
          "softwarehouse-learning-loop:v1",
          "",
          "Root/blocker key: LUC-1439",
          "Area: ops-release",
          "Smallest responsibility boundary: release/deploy evidence, rollback, and protected gate contract",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    rootBlocker: "LUC-1439",
    area: "ops-release",
    boundary: "release/deploy evidence, rollback, and protected gate contract",
    sourceIssues: [
      {
        identifier: "LUC-1439",
        title: "Provide approved production smoke auth binding",
        description: "Goal: expose approved binding.\nAcceptance: no secret values are written.",
        status: "blocked",
        assigneeAgentId: "security",
        updatedAt: "2026-06-02T08:16:34.359Z",
      },
    ],
  });

  assert.equal(duplicate.identifier, "LUC-1465");
});

test("findSuppressibleV1LearningDuplicate does not suppress after a new source issue delta", () => {
  const duplicate = findSuppressibleV1LearningDuplicate({
    issues: [
      {
        id: "learning-1",
        identifier: "LUC-1465",
        title: "[Softwarehouse][Learning] Ops/release blocker pattern LUC-1439",
        status: "done",
        updatedAt: "2026-06-02T08:36:59.047Z",
        description: [
          "softwarehouse-learning-loop:v1",
          "",
          "Root/blocker key: LUC-1439",
          "Area: ops-release",
          "Smallest responsibility boundary: release/deploy evidence, rollback, and protected gate contract",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    rootBlocker: "LUC-1439",
    area: "ops-release",
    boundary: "release/deploy evidence, rollback, and protected gate contract",
    now: new Date("2026-06-04T08:36:59.047Z"),
    sourceIssues: [
      {
        identifier: "LUC-1439",
        title: "Provide approved production smoke auth binding",
        description: "Goal: expose approved binding.\nAcceptance: no secret values are written.",
        status: "blocked",
        assigneeAgentId: "security",
        updatedAt: "2026-06-02T08:40:00.000Z",
      },
    ],
  });

  assert.equal(duplicate, null);
});

test("findSuppressibleV1LearningDuplicate cools down a just-closed identical lesson", () => {
  const duplicate = findSuppressibleV1LearningDuplicate({
    issues: [
      {
        id: "learning-1",
        identifier: "LUC-1465",
        status: "done",
        updatedAt: "2026-06-02T08:36:59.047Z",
        description: [
          "softwarehouse-learning-loop:v1",
          "",
          "Root/blocker key: LUC-1439",
          "Area: ops-release",
          "Smallest responsibility boundary: release/deploy evidence, rollback, and protected gate contract",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    rootBlocker: "LUC-1439",
    area: "ops-release",
    boundary: "release/deploy evidence, rollback, and protected gate contract",
    now: new Date("2026-06-02T09:00:00.000Z"),
    sourceIssues: [
      {
        identifier: "LUC-1439",
        title: "Provide approved production smoke auth binding",
        description: "A new system comment touched the issue timestamp.",
        status: "blocked",
        assigneeAgentId: "security",
        updatedAt: "2026-06-02T08:50:00.000Z",
      },
    ],
  });

  assert.equal(duplicate.identifier, "LUC-1465");
});

test("findSuppressibleV1LearningDuplicate does not suppress when blocker disposition is missing", () => {
  const duplicate = findSuppressibleV1LearningDuplicate({
    issues: [
      {
        id: "learning-1",
        identifier: "LUC-1465",
        status: "done",
        updatedAt: "2026-06-02T08:36:59.047Z",
        description: [
          "softwarehouse-learning-loop:v1",
          "",
          "Root/blocker key: LUC-1439",
          "Area: ops-release",
          "Smallest responsibility boundary: release/deploy evidence, rollback, and protected gate contract",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    rootBlocker: "LUC-1439",
    area: "ops-release",
    boundary: "release/deploy evidence, rollback, and protected gate contract",
    sourceIssues: [
      {
        identifier: "LUC-1439",
        title: "Blocked smoke credential",
        description: "Waiting.",
        status: "blocked",
        assigneeAgentId: null,
        updatedAt: "2026-06-02T08:16:34.359Z",
      },
    ],
  });

  assert.equal(duplicate, null);
});

test("findCompliantOpsReleaseBlockerChain suppresses a protected gate chain with named owner action", () => {
  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-1768",
    terminalStatuses,
    sourceIssues: [
      {
        identifier: "LUC-1768",
        title: "Provide redaction-safe board-secret unblock packet",
        description: "Blocked: protected production smoke gate. Unblock owner/action: board approves a redaction-safe credential metadata packet.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
      },
      {
        identifier: "LUC-1770",
        title: "Protected evidence lane waits on LUC-1768",
        description: "Blocked by root blocker. Next handoff: retry only after the board-secret unblock action is accepted.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
      },
    ],
    relatedIssues: [
      {
        identifier: "LUC-1768",
        title: "Provide redaction-safe board-secret unblock packet",
        description: "Blocked: protected production smoke gate. Unblock owner/action: board approves a redaction-safe credential metadata packet.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
      },
      {
        identifier: "LUC-1770",
        title: "Protected evidence lane waits on LUC-1768",
        description: "Blocked by root blocker. Next handoff: retry only after the board-secret unblock action is accepted.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
        blockedBy: [{ identifier: "LUC-1768", status: "blocked" }],
      },
      {
        identifier: "LUC-1772",
        title: "[Softwarehouse][Learning] Ops/release blocker pattern LUC-1768",
        description: "softwarehouse-learning-loop:v1",
        status: "done",
      },
    ],
  });

  assert.equal(compliant.identifier, "LUC-1768");
});

test("findActiveRunCoveredOpsReleaseBlockerChain suppresses an active child blocker run", () => {
  const active = findActiveRunCoveredOpsReleaseBlockerChain({
    rootBlocker: "LUC-2319",
    sourceIssues: [
      {
        identifier: "LUC-2317",
        title: "Run DB-backed runtime aggregate e2e proof",
        description: "Blocked until local test infra is restored.",
        status: "blocked",
        assigneeAgentId: "test-automation-engineer",
        blockedBy: [{ identifier: "LUC-2319", status: "in_progress" }],
        blockerAttention: {
          state: "covered",
          reason: "active_child",
          sampleBlockerIdentifier: "LUC-2319",
        },
      },
      {
        identifier: "LUC-2315",
        title: "V1 audit-to-completion controller",
        description: "Blocked by active QA/Ops proof chain.",
        status: "blocked",
        assigneeAgentId: "soar-project-manager",
        blockedBy: [{ identifier: "LUC-2317", status: "blocked" }],
      },
    ],
    relatedIssues: [
      {
        identifier: "LUC-2319",
        title: "Restore local DB/Redis infra for aggregate e2e proof",
        description: "Local runtime infra restoration. Forbidden: production deploy, restart, protected production smoke, secret logging, exchange mutation, or live-trading action.",
        status: "in_progress",
        assigneeAgentId: "ops-release-lead",
        checkoutRunId: "run-2319",
        executionRunId: "run-2319",
      },
      {
        identifier: "LUC-2317",
        title: "Run DB-backed runtime aggregate e2e proof",
        description: "Blocked until local test infra is restored.",
        status: "blocked",
        assigneeAgentId: "test-automation-engineer",
        blockedBy: [{ identifier: "LUC-2319", status: "in_progress" }],
        blockerAttention: {
          state: "covered",
          reason: "active_child",
          sampleBlockerIdentifier: "LUC-2319",
        },
      },
      {
        identifier: "LUC-2315",
        title: "V1 audit-to-completion controller",
        description: "Blocked by active QA/Ops proof chain.",
        status: "blocked",
        assigneeAgentId: "soar-project-manager",
        blockedBy: [{ identifier: "LUC-2317", status: "blocked" }],
      },
    ],
  });

  assert.equal(active.identifier, "LUC-2319");
});

test("findActiveRunCoveredOpsReleaseBlockerChain does not suppress stale in_progress release gates", () => {
  const active = findActiveRunCoveredOpsReleaseBlockerChain({
    rootBlocker: "LUC-2319",
    sourceIssues: [
      {
        identifier: "LUC-2317",
        title: "Run DB-backed runtime aggregate e2e proof",
        description: "Blocked until local test infra is restored.",
        status: "blocked",
        assigneeAgentId: "test-automation-engineer",
        blockedBy: [{ identifier: "LUC-2319", status: "in_progress" }],
      },
    ],
    relatedIssues: [
      {
        identifier: "LUC-2319",
        title: "Restore local DB/Redis infra for aggregate e2e proof",
        description: "Local runtime infra restoration.",
        status: "in_progress",
        assigneeAgentId: "ops-release-lead",
        checkoutRunId: null,
        executionRunId: null,
      },
      {
        identifier: "LUC-2317",
        title: "Run DB-backed runtime aggregate e2e proof",
        description: "Blocked until local test infra is restored.",
        status: "blocked",
        assigneeAgentId: "test-automation-engineer",
        blockedBy: [{ identifier: "LUC-2319", status: "in_progress" }],
      },
    ],
  });

  assert.equal(active, null);
});

test("findCompliantOpsReleaseBlockerChain suppresses downstream churn under a transitive protected root", () => {
  const issues = [
    {
      identifier: "LUC-2056",
      title: "Downstream release proof lane",
      description: "Blocked by parent gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
    },
    {
      identifier: "LUC-2058",
      title: "Another downstream release proof lane",
      description: "Blocked by parent gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
    },
    {
      identifier: "LUC-241",
      title: "Protected production proof parent",
      description: "Blocked by protected auth-binding gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-1438", status: "blocked" }],
    },
    {
      identifier: "LUC-1438",
      title: "Release gate waits on security binding",
      description: "Blocked by protected credential gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-1439", status: "blocked" }],
    },
    {
      identifier: "LUC-1439",
      title: "Provide approved production smoke auth binding",
      description: "Blocked: protected production smoke gate. Unblock owner/action: Security supplies a redaction-safe auth-binding packet after board approval.",
      status: "blocked",
      assigneeAgentId: "security-review-lead",
    },
  ];
  const sourceIssues = issues.slice(0, 2);
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-241",
    sourceIssues,
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-241",
    terminalStatuses,
    sourceIssues,
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-1439");
});

test("findCompliantOpsReleaseBlockerChain allows planned carriers with terminal protected blockers", () => {
  const issues = [
    {
      identifier: "LUC-2232",
      title: "Architecture gate proof lane",
      description: "Blocked by parent protected proof gate.",
      status: "blocked",
      assigneeAgentId: "cto",
      blockedBy: [
        {
          identifier: "LUC-241",
          status: "todo",
          terminalBlockers: [{ identifier: "LUC-1439", status: "blocked" }],
        },
      ],
    },
    {
      identifier: "LUC-2190",
      title: "Protected proof follow-up",
      description: "Blocked by parent protected proof gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [
        {
          identifier: "LUC-241",
          status: "todo",
          terminalBlockers: [{ identifier: "LUC-1439", status: "blocked" }],
        },
      ],
    },
    {
      identifier: "LUC-241",
      title: "Protected production proof parent",
      description: "Ready to resume only after terminal protected auth-binding gate clears.",
      status: "todo",
      assigneeAgentId: "ops-release-lead",
      terminalBlockers: [{ identifier: "LUC-1439", status: "blocked" }],
    },
    {
      identifier: "LUC-1439",
      title: "Provide approved production smoke auth binding",
      description: "Blocked: protected production smoke gate. Unblock owner/action: Security supplies a redaction-safe auth-binding packet after board approval.",
      status: "blocked",
      assigneeAgentId: "security-review-lead",
    },
  ];
  const sourceIssues = issues.slice(0, 2);
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1439",
    sourceIssues,
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-1439",
    terminalStatuses,
    sourceIssues,
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-1439");
});

test("findCompliantOpsReleaseBlockerChain suppresses LUC-1768 downstream churn with side protected blockers", () => {
  const issues = [
    {
      identifier: "LUC-1758",
      title: "[Soar][ARB-006][Release] Produce RC protected sign-off evidence",
      description: "Blocked release-controller packet. No deploy, restart, production mutation, account mutation, secret disclosure, or live trading action.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [
        { identifier: "LUC-1757", status: "blocked" },
        { identifier: "LUC-1755", status: "blocked" },
        { identifier: "LUC-1754", status: "blocked" },
        { identifier: "LUC-1756", status: "blocked" },
      ],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-1768",
      },
    },
    {
      identifier: "LUC-1754",
      title: "[Soar][ARB-006][Integration+QA] Produce LIVEIMPORT_READBACK protected evidence",
      description: "Blocked until approved read-only protected inputs are bound.",
      status: "blocked",
      assigneeAgentId: "integration",
      blockedBy: [{ identifier: "LUC-1765", status: "blocked" }],
    },
    {
      identifier: "LUC-1765",
      title: "[Soar][ARB-006][Security/Ops] Bind LIVEIMPORT_READBACK read-only production principal",
      description: "Blocked by board-secret binding. Next handoff: wake protected readback after binding.",
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-1768", status: "blocked" }],
    },
    {
      identifier: "LUC-1768",
      title: "[Soar][ARB-006][Board Secrets] Bind LIVEIMPORT_READBACK protected read-only principal refs",
      description: "Blocked protected board-secret read-only principal binding. Unblock owner/action: board binds approved encrypted secret refs without exposing values.",
      status: "blocked",
      assigneeAgentId: "board-secret-owner",
    },
    {
      identifier: "LUC-2772",
      title: "[Soar][LUC-965 Follow-up] Refresh SOAR-DATA-001 protected production migration and restore evidence",
      description: "Protected production migration and restore evidence without DB mutation, secret readback, deploy, or restart.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-1768", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-1768",
      },
    },
    {
      identifier: "LUC-1756",
      title: "[Soar][ARB-006][QA] Produce SOAR_PROD protected app evidence",
      description: "Side protected proof lane blocked by another protected session gate.",
      status: "blocked",
      assigneeAgentId: "qa",
      blockedBy: [{ identifier: "LUC-1774", status: "blocked" }],
    },
    {
      identifier: "LUC-1774",
      title: "[Soar][ARB-006][Security] Provide valid PROD_UI_AUDIT session for protected app proof",
      description: "Side protected session gate.",
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-1775", status: "blocked" }],
    },
    {
      identifier: "LUC-1775",
      title: "[Soar][ARB-006][Portfolio] Bind fresh valid PROD_UI_AUDIT app session",
      description: "Side protected session binding.",
      status: "blocked",
      assigneeAgentId: "portfolio",
      blockedBy: [{ identifier: "LUC-3409", status: "in_review" }],
    },
    {
      identifier: "LUC-3409",
      title: "[Operator][Soar] Provide owner-login verification path",
      description: "Side operator review path for a different protected evidence family.",
      status: "in_review",
      assigneeUserId: "local-board",
    },
  ];
  const sourceIssues = [issues[0], issues[3], issues[4]];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1768",
    sourceIssues,
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-1768",
    terminalStatuses,
    sourceIssues,
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-1768");
});

test("findCompliantOpsReleaseBlockerChain suppresses protected input propagation roots covered by blocker attention", () => {
  const issues = [
    {
      id: "issue-luc-3692",
      identifier: "LUC-3692",
      title: "[Soar][ARB-006][Board] Propagate PROD_DB_CHECK inputs to dependent proof runner",
      description: [
        "Bind or propagate one complete accepted production DB check input family into the protected runner/session.",
        "Values stay in Paperclip secrets or another approved encrypted runner config only.",
        "Unblock owner/action: Board binds accepted redaction-safe input refs without exposing values.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "board-secret-owner",
    },
    {
      id: "issue-luc-1758",
      identifier: "LUC-1758",
      title: "[Soar][ARB-006][Release] Produce RC protected sign-off evidence",
      description: "Release-controller/QA sign-off packet only. No deploy, restart, production mutation, account mutation, secret disclosure, or live trading action.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3692",
      },
    },
    {
      id: "issue-luc-1764",
      identifier: "LUC-1764",
      title: "[Soar][ARB-006][Ops] Inject protected PROD_DB_CHECK runner inputs",
      description: "Configure exactly one complete protected runner/session input family. No secret values are exposed.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3692",
      },
    },
    {
      id: "issue-luc-2372",
      identifier: "LUC-2372",
      title: "[Soar][Security/Ops] Bind protected runtime worker SLO proof inputs for de3db789",
      description: "Bind approved transient read-only production inputs needed for protected runtime freshness and RC evidence checks.",
      status: "blocked",
      assigneeAgentId: "security",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3692",
      },
    },
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-3692",
    sourceIssues: issues,
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-3692",
    terminalStatuses,
    sourceIssues: issues,
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-3692");
});

test("findCompliantOpsReleaseBlockerChain suppresses protected secret-ref roots covered by blocker attention", () => {
  const issues = [
    {
      id: "issue-luc-3749",
      identifier: "LUC-3749",
      title: "[Soar][Security/Ops] Resume LUC-3740 PROD_DB_CHECK gate after LUC-3692 resolves",
      description: [
        "Target blocked lane: LUC-3740.",
        "After unblock, verify the names-only protected runner input state.",
        "No secret values are posted into issue comments, docs, artifacts, logs, screenshots, or repo files.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-3692", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3740",
      },
    },
    {
      id: "issue-luc-3740",
      identifier: "LUC-3740",
      title: "[Soar][ARB-006][Security/Ops] Bind accepted PROD_DB_CHECK secret refs for LUC-3737",
      description: [
        "Bind exactly one complete accepted production DB-check input family into the protected Paperclip runner/session or approved encrypted agent/project env refs, without exposing values.",
        "Use Paperclip secrets or another approved encrypted runtime secret store only.",
        "No secret values are posted into comments, docs, artifacts, logs, screenshots, or repo files.",
        "After binding, close this issue and wake LUC-3737 / LUC-1764 so DRE can rerun the proof.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "security",
    },
    {
      id: "issue-luc-3737",
      identifier: "LUC-3737",
      title: "[Soar][ARB-006][Ops] Bind protected PROD_DB_CHECK runner secret refs after LUC-3692",
      description: "Bind exactly one complete accepted input family into the protected runner/session or approved encrypted agent/project env refs.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-3740", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3740",
      },
    },
    {
      id: "issue-luc-3692",
      identifier: "LUC-3692",
      title: "[Soar][ARB-006][Board] Propagate PROD_DB_CHECK inputs to dependent proof runner",
      description: "Bind or propagate one complete accepted production DB check input family into the protected runner/session, without exposing secret values.",
      status: "blocked",
      assigneeAgentId: "board",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3740",
      },
    },
    {
      id: "issue-luc-1764",
      identifier: "LUC-1764",
      title: "[Soar][ARB-006][Ops] Inject protected PROD_DB_CHECK runner inputs",
      description: "Configure exactly one complete family in the protected runner/session. Use Paperclip secrets or another approved encrypted runtime secret store.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3740",
      },
    },
    {
      id: "issue-luc-2372",
      identifier: "LUC-2372",
      title: "[Soar][Security/Ops] Bind protected runtime worker SLO proof inputs for de3db789",
      description: "Bind or confirm approved transient read-only production inputs needed for protected runtime freshness and production DB/RC evidence checks.",
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [
        { identifier: "LUC-2619", status: "blocked" },
        { identifier: "LUC-1763", status: "blocked" },
        { identifier: "LUC-1762", status: "blocked" },
      ],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-3740",
      },
    },
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-3740",
    sourceIssues: issues,
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-3740",
    terminalStatuses,
    sourceIssues: issues,
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-3740");
});

test("findCompliantOpsReleaseBlockerChain suppresses operator in-review protected binding waits", () => {
  const sourceIssues = [
    "LUC-3934",
    "LUC-3930",
    "LUC-3749",
    "LUC-3740",
    "LUC-3737",
    "LUC-3692",
    "LUC-1764",
    "LUC-2372",
    "LUC-2378",
    "LUC-2366",
    "LUC-2361",
    "LUC-1762",
    "LUC-1758",
  ].map((identifier) => ({
    identifier,
    title: `[Soar][ARB-006][Release] ${identifier} PROD_DB_CHECK protected runner refs`,
    description: "Blocked until accepted protected DB-check refs are bound into approved encrypted runner/env refs, without exposing values.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4019", status: "in_review" }],
  }));
  const issues = [
    ...sourceIssues,
    {
      identifier: "LUC-4019",
      title: "[Operator][Soar][ARB-006] Bind accepted PROD_DB_CHECK refs into protected runner env",
      description: [
        "Goal",
        "- Bind exactly one complete accepted DB-check input family into approved encrypted Paperclip runner/env refs for the protected proof runner, without exposing values.",
        "",
        "Accepted families",
        "- PROD_DB_CHECK_CONTAINER, PROD_DB_CHECK_USER, PROD_DB_CHECK_NAME; or",
        "- PRODUCTION_DB_CHECK_CONTAINER, PRODUCTION_DB_CHECK_USER, PRODUCTION_DB_CHECK_NAME.",
        "",
        "Safety",
        "- Do not post raw secret values, tokens, passwords, cookies, auth headers, protected payloads, env files, screenshots with private data, or database output.",
        "- Do not deploy, restart, rollback, run migrations, restore/write DB data, mutate accounts/subscriptions/payments, or perform live-trading action.",
        "",
        "Acceptance",
        "- Names-only/type-only confirmation says which accepted family was bound and at what redacted resource/ref level.",
      ].join("\n"),
      status: "in_review",
      assigneeUserId: "local-board",
    },
  ];

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-4019",
    terminalStatuses,
    sourceIssues,
    relatedIssues: issues,
  });

  assert.equal(sourceIssues.length, 13);
  assert.equal(compliant.identifier, "LUC-4019");
});

test("findCompliantOpsReleaseBlockerChain suppresses agent-owned in-review Roost protected binding coordination waits", () => {
  const sourceIssues = [
    {
      identifier: "LUC-447",
      title: "09 Technology: Bind protected Roost COMPANYCORE_API_KEY for deeper smoke",
      description: "Blocked until the protected Roost COMPANYCORE_API_KEY binding coordination lane completes.",
      status: "blocked",
      assigneeAgentId: "aia",
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        sampleBlockerIdentifier: "LUC-450",
      },
    },
    {
      identifier: "LUC-387",
      title: "09 Technology: Roost source-control and authenticated smoke closure after LUC-383",
      description: "Blocked until COMPANYCORE_API_KEY is available as a protected binding for deeper smoke.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-447", status: "blocked" }],
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        sampleBlockerIdentifier: "LUC-450",
      },
    },
  ];
  const issues = [
    ...sourceIssues,
    {
      identifier: "LUC-450",
      title: "00 General: Coordinate approved Roost COMPANYCORE_API_KEY protected binding",
      description: [
        "The board approval is accepted, but the current Technology runner cannot inspect or bind company secrets because /api/companies/{companyId}/secrets returns board-only access.",
        "The next legal action is a protected-binding coordination lane, not a repo/code/deploy lane.",
        "Use secret refs / protected bindings only. Never request, print, store, paste, or attach raw secret values.",
        "No raw secret disclosure.",
        "No push, deploy, restart, rollback, production mutation, paid-resource action, database mutation, or live/customer action.",
      ].join("\n"),
      status: "in_review",
      assigneeAgentId: "aia",
      executionRunId: "run-450",
    },
  ];

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-450",
    terminalStatuses,
    sourceIssues,
    relatedIssues: issues,
  });

  assert.equal(compliant.identifier, "LUC-450");
});

test("findCompliantOpsReleaseBlockerChain follows nested blocker attention to operator waits", () => {
  const issues = [
    {
      identifier: "LUC-2372",
      title: "[Soar][Security/Ops] Bind protected runtime worker SLO proof inputs for de3db789",
      description: "Blocked until approved transient read-only production inputs are available.",
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-1762", status: "blocked" }],
      blockerAttention: {
        state: "covered",
        reason: "active_dependency",
        sampleBlockerIdentifier: "LUC-1762",
      },
    },
    {
      identifier: "LUC-1762",
      title: "[Soar][ARB-006][Security/Ops] Provide protected PROD_DB_CHECK runner inputs",
      description: "Blocked by protected DB-check input propagation.",
      status: "blocked",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-1764", status: "blocked" }],
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        sampleBlockerIdentifier: "LUC-1764",
      },
    },
    {
      identifier: "LUC-1764",
      title: "[Soar][ARB-006][Ops] Inject protected PROD_DB_CHECK runner inputs",
      description: "Configure exactly one complete protected runner/session input family. No secret values are exposed.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        sampleBlockerIdentifier: "LUC-4019",
      },
    },
    {
      identifier: "LUC-4019",
      title: "[Operator][Soar][ARB-006] Bind accepted PROD_DB_CHECK refs into protected runner env",
      description: [
        "Bind exactly one complete accepted DB-check input family into approved encrypted Paperclip runner/env refs for the protected proof runner, without exposing values.",
        "Do not post raw secret values, tokens, passwords, cookies, auth headers, protected payloads, env files, screenshots with private data, or database output.",
        "Do not deploy, restart, rollback, run migrations, restore/write DB data, mutate accounts/subscriptions/payments, mutate exchange/API-key settings, place orders, change positions, or perform live-trading action.",
      ].join("\n"),
      status: "in_review",
      assigneeUserId: "local-board",
    },
  ];

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-4019",
    terminalStatuses,
    sourceIssues: issues.slice(0, 3),
    relatedIssues: issues,
  });

  assert.equal(compliant.identifier, "LUC-4019");
});

test("findCompliantOpsReleaseBlockerChain suppresses LUC-241 smoke principal gates blocked by operator review", () => {
  const issues = [
    {
      identifier: "LUC-12",
      title: "[Soar] Full takeover audit and operating baseline",
      description: "Blocked until protected production/auth/smoke proof set can continue.",
      status: "blocked",
      assigneeAgentId: "portfolio",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-241",
      },
    },
    {
      identifier: "LUC-2582",
      title: "[Soar][Integration] Protected manual-order DCA and LIVE-readback proof backlog",
      description: "Blocked by the protected workers/ready smoke gate.",
      status: "blocked",
      assigneeAgentId: "integration",
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-241",
      },
    },
    {
      identifier: "LUC-241",
      title: "[Soar][LUC-99-B] Unblock workers/ready smoke principal permissions",
      description: [
        "Confirm or grant read-only authorization for the smoke principal to access /workers/ready.",
        "Run one smoke recheck and post evidence plus rollback-impact note.",
        "No deploy/restart/runtime mutation.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-2755", status: "in_review" }],
    },
    {
      identifier: "LUC-2755",
      title: "[Operator][Soar] Provision accepted SMOKE auth principal for workers/ready",
      description: [
        "Required action:",
        "- Provision or rotate one production-smoke appropriate ADMIN principal/session accepted by Soar API auth.",
        "- Bind it through exactly one supported secret-store path: SMOKE_AUTH_TOKEN or valid SMOKE_AUTH_EMAIL + SMOKE_AUTH_PASSWORD.",
        "- Do not paste, print, screenshot, commit, or issue-comment any secret values, cookies, tokens, account passwords, API keys, private account data, or headers.",
        "",
        "Acceptance:",
        "- Secret-store binding exists under an approved path.",
        "- Security/Ops can rerun the protected read-only GET /workers/ready smoke without receiving 401 from auth.",
        "",
        "Safety boundary:",
        "- No deploy, restart, live trading, exchange mutation, payment mutation, or repo mutation is requested here.",
        "- Use Paperclip secrets or the approved encrypted local secret store only.",
      ].join("\n"),
      status: "in_review",
      assigneeUserId: "local-board",
    },
  ];

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-241",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues: issues,
  });

  assert.equal(compliant.identifier, "LUC-241");
});

test("findCompliantOpsReleaseBlockerChain ignores side docs gates for LUC-241 smoke principal waits", () => {
  const issues = [
    {
      identifier: "LUC-7025",
      title: "[Soar][SPM] Attach local-first shippable gate bundle to active Soar closure lanes",
      description: "Blocked until the accepted gate bundle source of truth is attached to active closure lanes.",
      status: "blocked",
      assigneeAgentId: "portfolio",
      blockedBy: [
        { identifier: "LUC-241", status: "blocked" },
        { identifier: "LUC-7024", status: "in_progress" },
      ],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-241",
      },
    },
    {
      identifier: "LUC-12",
      title: "[Soar] Full takeover audit and operating baseline",
      description: "Blocked until protected production/auth/smoke proof set can continue.",
      status: "blocked",
      assigneeAgentId: "portfolio",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-241",
      },
    },
    {
      identifier: "LUC-241",
      title: "[Soar][LUC-99-B] Unblock workers/ready smoke principal permissions",
      description: [
        "Narrow ops/security unblock lane for LUC-99.",
        "Confirm or grant read-only authorization for the smoke principal to access /workers/ready.",
        "No deploy/restart/runtime mutation.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-2755", status: "blocked" }],
    },
    {
      identifier: "LUC-2755",
      title: "[Operator][Soar] Provision accepted SMOKE auth principal for workers/ready",
      description: [
        "Required action:",
        "- Provision or rotate one production-smoke appropriate ADMIN principal/session accepted by Soar API auth.",
        "- Bind it through exactly one supported secret-store path: SMOKE_AUTH_TOKEN or valid SMOKE_AUTH_EMAIL + SMOKE_AUTH_PASSWORD.",
        "- Do not paste, print, screenshot, commit, or issue-comment any secret values, cookies, tokens, account passwords, API keys, private account data, or headers.",
        "",
        "Acceptance:",
        "- Secret-store binding exists under an approved path.",
        "- Security/Ops can rerun the protected read-only GET /workers/ready smoke without receiving 401 from auth.",
        "",
        "Safety boundary:",
        "- No deploy, restart, live trading, exchange mutation, payment mutation, or repo mutation is requested here.",
        "- Use Paperclip secrets or the approved encrypted local secret store only.",
      ].join("\n"),
      status: "blocked",
      assigneeUserId: "local-board",
    },
    {
      identifier: "LUC-7024",
      title: "[Softwarehouse][Docs] Publish accepted local-first shippable gate bundle source of truth",
      description: [
        "Scope:",
        "- Add the accepted gate bundle to Softwarehouse docs/memory after evidence packets are available.",
        "- Preserve protected-action fail-closed rules.",
      ].join("\n"),
      status: "in_progress",
      assigneeAgentId: "docs",
    },
  ];

  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-241",
    sourceIssues: issues.slice(0, 2),
  });

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-241",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues,
  });

  assert.equal(compliant.identifier, "LUC-2755");
});

test("findCompliantOpsReleaseBlockerChain does not suppress operator waits without reviewer ownership", () => {
  const issues = [
    {
      identifier: "LUC-3934",
      title: "[Soar][ARB-006][DRE] Bind accepted PROD_DB_CHECK runner refs for protected DB proof",
      description: "Blocked until the board/operator binds accepted PROD_DB_CHECK runner refs without exposing values.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-4019", status: "in_review" }],
    },
    {
      identifier: "LUC-4019",
      title: "[Operator][Soar][ARB-006] Bind accepted PROD_DB_CHECK refs into protected runner env",
      description: [
        "Bind exactly one complete accepted production DB-check input family into approved encrypted runner/env refs, without exposing values.",
        "Do not deploy, restart, run migrations, or perform production mutation.",
      ].join("\n"),
      status: "in_review",
      assigneeUserId: null,
    },
  ];

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-4019",
    terminalStatuses,
    sourceIssues: [issues[0]],
    relatedIssues: issues,
  });

  assert.equal(compliant, null);
});

test("findCompliantOpsReleaseBlockerChain does not suppress a stale active release gate", () => {
  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-1768",
    terminalStatuses,
    sourceIssues: [
      {
        identifier: "LUC-1768",
        title: "Provide redaction-safe board-secret unblock packet",
        description: "Blocked: protected production smoke gate. Unblock owner/action: board approves a redaction-safe credential metadata packet.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
      },
    ],
    relatedIssues: [
      {
        identifier: "LUC-1768",
        title: "Provide redaction-safe board-secret unblock packet",
        description: "Blocked: protected production smoke gate. Unblock owner/action: board approves a redaction-safe credential metadata packet.",
        status: "blocked",
        assigneeAgentId: "ops-release-lead",
      },
      {
        identifier: "LUC-1771",
        title: "Run protected production smoke",
        description: "Release gate is still running against production.",
        status: "in_progress",
        assigneeAgentId: "ops-release-lead",
        blockedBy: [{ identifier: "LUC-1768", status: "blocked" }],
      },
    ],
  });

  assert.equal(compliant, null);
});

test("findCompliantOpsReleaseBlockerChain does not suppress transitive churn with a stale active release gate", () => {
  const issues = [
    {
      identifier: "LUC-2056",
      title: "Downstream release proof lane",
      description: "Blocked by parent gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
    },
    {
      identifier: "LUC-241",
      title: "Protected production proof parent",
      description: "Blocked by protected auth-binding gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-1439", status: "blocked" }],
    },
    {
      identifier: "LUC-1439",
      title: "Provide approved production smoke auth binding",
      description: "Blocked: protected production smoke gate. Unblock owner/action: Security supplies a redaction-safe auth-binding packet after board approval.",
      status: "blocked",
      assigneeAgentId: "security-review-lead",
    },
    {
      identifier: "LUC-2060",
      title: "Run protected production smoke",
      description: "Release gate is still running against production.",
      status: "in_progress",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-1439", status: "blocked" }],
    },
  ];
  const sourceIssues = [issues[0]];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-241",
    sourceIssues,
  }).concat(issues[3]);

  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-241",
    terminalStatuses,
    sourceIssues,
    relatedIssues,
  });

  assert.equal(compliant, null);
});

test("findCompliantOpsReleaseBlockerChain does not suppress missing unblock owner action", () => {
  const compliant = findCompliantOpsReleaseBlockerChain({
    rootBlocker: "LUC-1768",
    terminalStatuses,
    sourceIssues: [
      {
        identifier: "LUC-1768",
        title: "Protected production smoke credential",
        description: "Waiting.",
        status: "blocked",
        assigneeAgentId: null,
      },
    ],
    relatedIssues: [
      {
        identifier: "LUC-1768",
        title: "Protected production smoke credential",
        description: "Waiting.",
        status: "blocked",
        assigneeAgentId: null,
      },
    ],
  });

  assert.equal(compliant, null);
});

test("findCompliantFailedReleasePermitRecoveryChain suppresses a failed release-permit chain after repair evidence", () => {
  const issues = [
    {
      identifier: "LUC-2284",
      title: "[Soar][Release Permit][Ops] Rollback or redeploy soar-web after controlled restart failed",
      description: [
        "Required decision/action: issue a separate rollback or redeploy permit.",
        "Do not chain this from LUC-2280; that permit is exhausted after one restart attempt.",
        "Forbidden until this permit is complete: additional restart attempts.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2304", status: "done" }],
    },
    {
      identifier: "LUC-2280",
      title: "[Soar][Release Permit][Ops] Controlled soar-web restart for 503 restarting state",
      description: "Rollback/stop condition: if restart does not restore web readiness, stop further mutation and request a separate rollback/deploy permit.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2284", status: "blocked" }],
    },
    {
      identifier: "LUC-1160",
      title: "[Soar][Production Stability] Diagnose Coolify restart loop and runtime crash cause",
      description: "Blocked by the failed web recovery chain; root cause owner is named.",
      status: "blocked",
      assigneeAgentId: "soar-project-manager",
      blockedBy: [{ identifier: "LUC-1438", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-2284",
      },
    },
    {
      identifier: "LUC-2304",
      title: "[Soar][Frontend] Fix production Web image startup wrapper missing from runtime image",
      description: "Implemented startup wrapper repair after redacted runtime crash investigation.",
      status: "done",
      assigneeAgentId: "frontend-engineer",
    },
  ];

  const compliant = findCompliantFailedReleasePermitRecoveryChain({
    rootBlocker: "LUC-2284",
    terminalStatuses,
    sourceIssues: issues.slice(0, 3),
    relatedIssues: issues,
  });

  assert.equal(compliant.identifier, "LUC-2284");
});

test("findCompliantFailedReleasePermitRecoveryChain does not suppress when the repair blocker is not terminal", () => {
  const issues = [
    {
      identifier: "LUC-2284",
      title: "[Soar][Release Permit][Ops] Rollback or redeploy soar-web after controlled restart failed",
      description: "Do not chain this from LUC-2280; request a separate rollback/deploy permit. Forbidden: additional restart attempts.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2304", status: "todo" }],
    },
    {
      identifier: "LUC-2280",
      title: "[Soar][Release Permit][Ops] Controlled soar-web restart for 503 restarting state",
      description: "Stop condition: if restart fails, stop further mutation.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2284", status: "blocked" }],
    },
    {
      identifier: "LUC-2304",
      title: "[Soar][Frontend] Fix production Web image startup wrapper missing from runtime image",
      description: "Repair still pending.",
      status: "todo",
      assigneeAgentId: "frontend-engineer",
    },
  ];

  const compliant = findCompliantFailedReleasePermitRecoveryChain({
    rootBlocker: "LUC-2284",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues: issues,
  });

  assert.equal(compliant, null);
});

test("findCompliantFailedReleasePermitRecoveryChain does not suppress a stale active release gate", () => {
  const issues = [
    {
      identifier: "LUC-2284",
      title: "[Soar][Release Permit][Ops] Rollback or redeploy soar-web after controlled restart failed",
      description: "Do not chain this from LUC-2280; request a separate rollback/deploy permit. Forbidden: additional restart attempts.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2304", status: "done" }],
    },
    {
      identifier: "LUC-2280",
      title: "[Soar][Release Permit][Ops] Controlled soar-web restart for 503 restarting state",
      description: "Stop condition: if restart fails, stop further mutation.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-2284", status: "blocked" }],
    },
    {
      identifier: "LUC-2304",
      title: "[Soar][Frontend] Fix production Web image startup wrapper missing from runtime image",
      description: "Implemented startup wrapper repair.",
      status: "done",
      assigneeAgentId: "frontend-engineer",
    },
    {
      identifier: "LUC-2292",
      title: "[Soar][Release Permit][Ops] Execute one controlled soar-web redeploy from pushed main",
      description: "Release gate is still running.",
      status: "in_progress",
      assigneeAgentId: "ops-release-lead",
    },
  ];

  const compliant = findCompliantFailedReleasePermitRecoveryChain({
    rootBlocker: "LUC-2284",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues: issues,
  });

  assert.equal(compliant, null);
});

function completedBlockerRecoveryFixture(overrides = {}) {
  const root = {
    identifier: "LUC-1756",
    title: "[Soar][ARB-006][QA] Produce SOAR_PROD protected app evidence",
    description: [
      "Goal: Produce authenticated, read-only production app journey evidence.",
      "Scope: Browser/API proof for approved read-only production account class.",
      "No account mutation, LIVE setting mutation, trading action, secret disclosure, deploy, restart, rollback, or DB write.",
      "Acceptance: Evidence packet includes redacted screenshots/logs or explicit blocked reason and next handoff.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "qa",
    blockedBy: [{ identifier: "LUC-1774", status: "done" }],
  };
  const completedBlocker = {
    identifier: "LUC-1774",
    title: "[Soar][ARB-006][Security] Provide valid PROD_UI_AUDIT session for protected app proof",
    description: "Done: valid protected app proof auth binding was supplied without exposing secrets.",
    status: "done",
    assigneeAgentId: "security",
  };
  const dependent = {
    identifier: "LUC-1758",
    title: "[Soar][ARB-006][Release] Produce RC protected sign-off evidence",
    description: "Blocked by protected app proof recovery path.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-1756", status: "blocked" }],
  };
  const delegatedRecovery = {
    identifier: "LUC-3827",
    title: "[Soar][ARB-006][QA] Apply LUC-1756 recovered app-proof disposition",
    description: "Apply the recovered LUC-1756 disposition after resolved auth blocker LUC-1774; resume or re-block with exact evidence.",
    status: "todo",
    assigneeAgentId: "qa",
  };
  return {
    root,
    completedBlocker,
    dependent,
    delegatedRecovery,
    ...overrides,
  };
}

test("findCompletedBlockerDelegatedRecoveryChain suppresses LUC-1756 completed-blocker recovery noise", () => {
  const fixture = completedBlockerRecoveryFixture();
  const issues = [
    fixture.root,
    fixture.completedBlocker,
    fixture.dependent,
    fixture.delegatedRecovery,
  ];
  const sourceIssues = [fixture.root, fixture.dependent];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1756",
    sourceIssues,
  });

  const suppressed = findCompletedBlockerDelegatedRecoveryChain({
    rootBlocker: "LUC-1756",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed.rootIssue.identifier, "LUC-1756");
  assert.deepEqual(
    suppressed.completedBlockers.map((issue) => issue.identifier),
    ["LUC-1774"]
  );
  assert.equal(suppressed.recoveryIssue.identifier, "LUC-3827");
});

test("findCompletedBlockerDelegatedRecoveryChain requires an existing delegated recovery owner", () => {
  const fixture = completedBlockerRecoveryFixture({
    delegatedRecovery: {
      identifier: "LUC-3827",
      title: "[Soar][ARB-006][QA] Apply LUC-1756 recovered app-proof disposition",
      description: "Apply the recovered LUC-1756 disposition after resolved auth blocker LUC-1774.",
      status: "todo",
      assigneeAgentId: null,
    },
  });
  const issues = [
    fixture.root,
    fixture.completedBlocker,
    fixture.dependent,
    fixture.delegatedRecovery,
  ];
  const sourceIssues = [fixture.root, fixture.dependent];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1756",
    sourceIssues,
  });

  const suppressed = findCompletedBlockerDelegatedRecoveryChain({
    rootBlocker: "LUC-1756",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

test("findCompletedBlockerDelegatedRecoveryChain does not suppress stale active release evidence", () => {
  const fixture = completedBlockerRecoveryFixture();
  const staleReleaseGate = {
    identifier: "LUC-4999",
    title: "[Soar][Release] Run protected production smoke",
    description: "Protected smoke release evidence is still running.",
    status: "in_progress",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-1756", status: "blocked" }],
  };
  const issues = [
    fixture.root,
    fixture.completedBlocker,
    fixture.dependent,
    fixture.delegatedRecovery,
    staleReleaseGate,
  ];
  const sourceIssues = [fixture.root, fixture.dependent];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1756",
    sourceIssues,
  }).concat(staleReleaseGate);

  const suppressed = findCompletedBlockerDelegatedRecoveryChain({
    rootBlocker: "LUC-1756",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

function pausedOwnerRoutingFixture(overrides = {}) {
  const root = {
    identifier: "LUC-4099",
    title: "[Soar][ARB-006][QA] Resume LUC-1756 after protected session blocker resolved",
    description: "Assigned QA proof repair. Current assignee is paused; route to a live owner or first-class blocker.",
    status: "todo",
    assigneeAgentId: "paused-tae",
    blockedBy: [],
  };
  const architectureProgram = {
    identifier: "LUC-4048",
    title: "[Soar][V1] Architecture-to-code drift index and repair program before V2",
    description: "Blocked by paused-owner QA routing repair.",
    status: "blocked",
    assigneeAgentId: "qve",
    blockedBy: [{ identifier: "LUC-4099", status: "todo" }],
  };
  const releaseEvidence = {
    identifier: "LUC-1758",
    title: "[Soar][ARB-006][Release] Produce RC protected sign-off evidence",
    description: "Blocked by LUC-4099 until the protected app proof owner path is live.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4099", status: "todo" }],
  };
  const opsWindow = {
    identifier: "LUC-405",
    title: "[Soar][ARB-006][Ops] Coordinate protected evidence window and input readiness package",
    description: "Blocked by the upstream QA proof routing repair.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockerAttention: {
      state: "needs_attention",
      sampleBlockerIdentifier: "LUC-4099",
    },
  };
  const delegatedRepair = {
    identifier: "LUC-4133",
    title: "[Soar][ARB-006][Root Control] Repair LUC-4099 paused QA assignment boundary",
    description: "Use a root/authorized control-plane path to repair the paused owner assignment for LUC-4099; prefer reassign, release, or block with exact owner action.",
    status: "todo",
    assigneeAgentId: "aia",
  };
  return {
    root,
    architectureProgram,
    releaseEvidence,
    opsWindow,
    delegatedRepair,
    ...overrides,
  };
}

test("findPausedOwnerDelegatedRoutingRepairChain suppresses LUC-4099 paused-owner routing noise", () => {
  const fixture = pausedOwnerRoutingFixture();
  const issues = [
    fixture.root,
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
    fixture.delegatedRepair,
  ];
  const sourceIssues = [
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4099",
    sourceIssues,
  });

  const suppressed = findPausedOwnerDelegatedRoutingRepairChain({
    rootBlocker: "LUC-4099",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed.rootIssue.identifier, "LUC-4099");
  assert.equal(suppressed.repairIssue.identifier, "LUC-4133");
});

test("findPausedOwnerDelegatedRoutingRepairChain requires a delegated repair owner", () => {
  const fixture = pausedOwnerRoutingFixture({
    delegatedRepair: {
      identifier: "LUC-4133",
      title: "[Soar][ARB-006][Root Control] Repair LUC-4099 paused QA assignment boundary",
      description: "Use a root/authorized control-plane path to repair the paused owner assignment for LUC-4099.",
      status: "todo",
      assigneeAgentId: null,
    },
  });
  const issues = [
    fixture.root,
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
    fixture.delegatedRepair,
  ];
  const sourceIssues = [
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4099",
    sourceIssues,
  });

  const suppressed = findPausedOwnerDelegatedRoutingRepairChain({
    rootBlocker: "LUC-4099",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

test("findPausedOwnerDelegatedRoutingRepairChain does not suppress true protected smoke failures", () => {
  const fixture = pausedOwnerRoutingFixture();
  const failedSmoke = {
    identifier: "LUC-4998",
    title: "[Soar][Release] Protected smoke failed on production route",
    description: "Protected smoke failed with timeout after deploy; release owner must preserve the failed gate artifact.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4099", status: "todo" }],
  };
  const issues = [
    fixture.root,
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
    fixture.delegatedRepair,
    failedSmoke,
  ];
  const sourceIssues = [
    fixture.architectureProgram,
    fixture.releaseEvidence,
    fixture.opsWindow,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4099",
    sourceIssues,
  }).concat(failedSmoke);

  const suppressed = findPausedOwnerDelegatedRoutingRepairChain({
    rootBlocker: "LUC-4099",
    sourceIssues,
    relatedIssues,
    allIssues: issues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

test("findStaleNonReleaseRootProtectedBacklogChain suppresses backend root noise covered by protected backlog", () => {
  const issues = [
    {
      identifier: "LUC-1144",
      title: "[Soar][Backend] Source-level auth map for /workers/ready and fix-lane stub",
      description: "Backend/API only. Acceptance: route path and guard path. If protected credentials are needed, escalate to the protected gate owner.",
      status: "blocked",
      assigneeAgentId: "backend-api-engineer",
    },
    {
      identifier: "LUC-2771",
      title: "Protected release evidence packet",
      description: "Blocked by protected backlog gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
      terminalBlockers: [{ identifier: "LUC-1144", status: "blocked" }],
    },
    {
      identifier: "LUC-2581",
      title: "Protected browser proof backlog",
      description: "Blocked by protected backlog gate.",
      status: "blocked",
      assigneeAgentId: "qa-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
      terminalBlockers: [{ identifier: "LUC-1144", status: "blocked" }],
    },
    {
      identifier: "LUC-241",
      title: "Unblock workers/ready smoke principal permissions",
      description: "Blocked protected auth gate. Unblock owner/action: local board provisions an accepted smoke auth principal.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
    },
  ];

  const protectedBacklog = findStaleNonReleaseRootProtectedBacklogChain({
    rootBlocker: "LUC-1144",
    sourceIssues: issues.slice(1, 3),
    relatedIssues: issues,
    terminalStatuses,
  });

  assert.equal(protectedBacklog.identifier, "LUC-241");
});

test("findStaleNonReleaseRootProtectedBacklogChain does not suppress stale active release gates", () => {
  const issues = [
    {
      identifier: "LUC-1144",
      title: "[Soar][Backend] Source-level auth map for /workers/ready and fix-lane stub",
      description: "Backend/API only.",
      status: "blocked",
      assigneeAgentId: "backend-api-engineer",
    },
    {
      identifier: "LUC-2771",
      title: "Protected release evidence packet",
      description: "Blocked by protected backlog gate.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
      blockedBy: [{ identifier: "LUC-241", status: "blocked" }],
    },
    {
      identifier: "LUC-241",
      title: "Unblock workers/ready smoke principal permissions",
      description: "Blocked protected auth gate. Unblock owner/action: local board provisions an accepted smoke auth principal.",
      status: "blocked",
      assigneeAgentId: "ops-release-lead",
    },
    {
      identifier: "LUC-9999",
      title: "Run protected production smoke",
      description: "Release gate is still running.",
      status: "in_progress",
      assigneeAgentId: "ops-release-lead",
    },
  ];

  const protectedBacklog = findStaleNonReleaseRootProtectedBacklogChain({
    rootBlocker: "LUC-1144",
    sourceIssues: [issues[1]],
    relatedIssues: issues,
    terminalStatuses,
  });

  assert.equal(protectedBacklog, null);
});

test("findProjectMutationSourceControlGuardChain suppresses project mutation guard source-control blockers", () => {
  const issues = [
    {
      identifier: "LUC-4045",
      title: "[Soar][DCA][Runtime] Repair DCA replay resume contract",
      description: [
        "Project mutation guard stopped this run because protected project changes appeared during a gated/non-delivery lane.",
        "Sample dirty path: apps/api/src/modules/subscriptions/payments/stripeWebhook.e2e.test.ts.",
        "Source-control classification owner/action: Soar PM source-control lane decides commit/no-commit; no push, deploy, restart, production mutation, protected smoke, or secret access.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "runtime-adapter-engineer",
    },
    {
      identifier: "LUC-4046",
      title: "[Soar][DCA][QA] Replay DCA after runtime source-control guard clears",
      description: "Blocked by project mutation guard source-control classification; wait for the source-control owner packet.",
      status: "blocked",
      assigneeAgentId: "test-automation-engineer",
      blockedBy: [{ identifier: "LUC-4045", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-4045",
      },
    },
    {
      identifier: "LUC-4052",
      title: "[Softwarehouse][Learning] Ops/release blocker pattern LUC-4045",
      description: "softwarehouse-learning-loop:v1",
      status: "blocked",
    },
  ];

  const suppressed = findProjectMutationSourceControlGuardChain({
    rootBlocker: "LUC-4045",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues: issues,
  });

  assert.equal(suppressed.identifier, "LUC-4045");
});

test("findProjectMutationSourceControlGuardChain suppresses project mutation guard source-control blockers when one branch cancels via board-access", () => {
  const issues = [
    {
      identifier: "LUC-4045",
      title: "[Soar][DCA][Runtime] Repair DCA replay resume contract",
      description: [
        "Project mutation guard stopped this run because protected project changes appeared during a gated/non-delivery lane.",
        "Sample dirty path: apps/api/src/modules/subscriptions/payments/stripeWebhook.e2e.test.ts.",
        "Source-control classification owner/action: Soar PM source-control lane decides commit/no-commit; no push, deploy, restart, production mutation, protected smoke, or secret access.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "runtime-adapter-engineer",
    },
    {
      identifier: "LUC-4046",
      title: "[Soar][Runtime] Project mutation guard board-access cancellation path",
      description: [
        "Project mutation guard source-control path was deferred because board access was required to close the secret metadata gap.",
        "Keep blocked delivery paused until the board-authorized refresh is available.",
      ].join("\n"),
      status: "cancelled",
      assigneeAgentId: "security",
      blockedBy: [{ identifier: "LUC-4045", status: "blocked" }],
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        sampleBlockerIdentifier: "LUC-4045",
      },
    },
    {
      identifier: "LUC-4052",
      title: "[Softwarehouse][Learning] Ops/release blocker pattern LUC-4045",
      description: "softwarehouse-learning-loop:v1",
      status: "blocked",
    },
  ];

  const suppressed = findProjectMutationSourceControlGuardChain({
    rootBlocker: "LUC-4045",
    terminalStatuses,
    sourceIssues: issues.slice(0, 2),
    relatedIssues: issues,
  });

  assert.equal(suppressed.identifier, "LUC-4045");
});

test("findProjectMutationSourceControlGuardChain does not suppress protected smoke failures", () => {
  const issues = [
    {
      identifier: "LUC-4045",
      title: "[Soar][DCA][Runtime] Repair DCA replay resume contract",
      description: [
        "Project mutation guard stopped this run because protected project changes appeared during a gated/non-delivery lane.",
        "Sample dirty path: apps/api/src/modules/subscriptions/payments/stripeWebhook.e2e.test.ts.",
      ].join("\n"),
      status: "blocked",
      assigneeAgentId: "runtime-adapter-engineer",
    },
    {
      identifier: "LUC-4999",
      title: "[Soar][Release] Protected smoke failed after deploy",
      description: "Protected smoke failed with a release gate timeout and needs DRE unblock action.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-4045", status: "blocked" }],
    },
  ];

  const suppressed = findProjectMutationSourceControlGuardChain({
    rootBlocker: "LUC-4045",
    terminalStatuses,
    sourceIssues: issues,
    relatedIssues: issues,
  });

  assert.equal(suppressed, null);
});

function qaToolingProofFixture() {
  const root = {
    identifier: "LUC-4174",
    title: "[Soar][QA] Repair local Vitest startup for dashboard fan-out regression proof",
    description: "Repair local Vitest startup so QA can collect the focused dashboard fan-out regression proof. No deploy, restart, production mutation, protected smoke, or secret access.",
    status: "todo",
    assigneeAgentId: "qve",
    blockedBy: [],
  };
  const frontendProof = {
    identifier: "LUC-3840",
    title: "[Soar][Frontend] Reduce dashboard runtime fan-out and loading stalls",
    description: "Blocked by local QA tooling proof repair.",
    status: "blocked",
    assigneeAgentId: "frontend",
    blockedBy: [{ identifier: "LUC-4174", status: "todo" }],
    blockerAttention: {
      state: "covered",
      reason: "active_child",
      sampleBlockerIdentifier: "LUC-4174",
    },
  };
  const qaRecheck = {
    identifier: "LUC-3841",
    title: "[Soar][QA] Recheck protected dashboard performance after aggregate/fan-out fixes",
    description: "Blocked behind the same local Vitest startup proof chain.",
    status: "blocked",
    assigneeAgentId: "qve",
    blockedBy: [{ identifier: "LUC-3840", status: "blocked" }],
  };
  const performanceParent = {
    identifier: "LUC-3832",
    title: "[Soar][Production Performance] Diagnose slow authenticated dashboard and server health",
    description: "Blocked until dashboard fan-out regression proof is available.",
    status: "blocked",
    assigneeAgentId: "aia",
    blockedBy: [{ identifier: "LUC-3840", status: "blocked" }],
  };
  return {
    root,
    frontendProof,
    qaRecheck,
    performanceParent,
  };
}

test("findQaToolingProofBlockedChain suppresses LUC-4174 QA tooling proof blockers", () => {
  const fixture = qaToolingProofFixture();
  const issues = [
    fixture.root,
    fixture.frontendProof,
    fixture.qaRecheck,
    fixture.performanceParent,
  ];
  const sourceIssues = [
    fixture.frontendProof,
    fixture.qaRecheck,
    fixture.performanceParent,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4174",
    sourceIssues,
  });

  const suppressed = findQaToolingProofBlockedChain({
    rootBlocker: "LUC-4174",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed.identifier, "LUC-4174");
});

test("findQaToolingProofBlockedChain does not suppress true protected smoke failures", () => {
  const fixture = qaToolingProofFixture();
  const failedSmoke = {
    identifier: "LUC-4999",
    title: "[Soar][Release] Protected smoke failed after dashboard deploy",
    description: "Protected smoke failed with timeout after deploy; DRE must preserve the failed gate artifact.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4174", status: "todo" }],
  };
  const issues = [
    fixture.root,
    fixture.frontendProof,
    fixture.qaRecheck,
    fixture.performanceParent,
    failedSmoke,
  ];
  const sourceIssues = [
    fixture.frontendProof,
    fixture.qaRecheck,
    fixture.performanceParent,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4174",
    sourceIssues,
  }).concat(failedSmoke);

  const suppressed = findQaToolingProofBlockedChain({
    rootBlocker: "LUC-4174",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

function boardAuthorizationWaitFixture() {
  const root = {
    identifier: "LUC-4192",
    title: "[Softwarehouse][Control Plane] Authorize or apply LUC-1378 routing mutation",
    description: [
      "CTO, Soar PM, and AIA all attempted the required routing mutation on LUC-1378.",
      "Paperclip rejected each attempt with Issue is outside this actor's authorization boundary.",
      "Either apply the exact blockedByIssueIds mutation or grant a scoped actor permission path.",
      "Keep the source issue blocked; this is control-plane authorization, not deploy or smoke work.",
    ].join("\n"),
    status: "in_review",
    assigneeUserId: "local-board",
    blockedBy: [],
  };
  const ctoWait = {
    identifier: "LUC-4172",
    title: "[Softwarehouse][CTO] Bind protected owner-login proof blocker for paused TAE source",
    description: "Blocked by the board authorization path for the scoped routing mutation.",
    status: "blocked",
    assigneeAgentId: "cto",
    blockedBy: [{ identifier: "LUC-4192", status: "in_review" }],
    blockerAttention: {
      state: "covered",
      reason: "active_dependency",
      sampleBlockerIdentifier: "LUC-4192",
    },
  };
  const pmWait = {
    identifier: "LUC-4185",
    title: "[Soar][PM] Bind LUC-4184 blocker and live QVE owner to LUC-1378",
    description: "Blocked until the board applies or authorizes the routing mutation.",
    status: "blocked",
    assigneeAgentId: "pm",
    blockedBy: [{ identifier: "LUC-4192", status: "in_review" }],
    blockerAttention: {
      state: "covered",
      reason: "active_child",
      sampleBlockerIdentifier: "LUC-4192",
    },
  };
  const aiaWait = {
    identifier: "LUC-4187",
    title: "[Softwarehouse][AIA] Apply cross-boundary LUC-1378 blocker/QVE routing mutation",
    description: "Blocked because the actor still needs a scoped permission path.",
    status: "blocked",
    assigneeAgentId: "aia",
    blockedBy: [{ identifier: "LUC-4192", status: "in_review" }],
    blockerAttention: {
      state: "covered",
      reason: "active_child",
      sampleBlockerIdentifier: "LUC-4192",
    },
  };
  return {
    root,
    ctoWait,
    pmWait,
    aiaWait,
  };
}

test("findBoardAuthorizationWaitChain suppresses LUC-4192 board authorization waits", () => {
  const fixture = boardAuthorizationWaitFixture();
  const issues = [
    fixture.root,
    fixture.ctoWait,
    fixture.pmWait,
    fixture.aiaWait,
  ];
  const sourceIssues = [
    fixture.ctoWait,
    fixture.pmWait,
    fixture.aiaWait,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4192",
    sourceIssues,
  });

  const suppressed = findBoardAuthorizationWaitChain({
    rootBlocker: "LUC-4192",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed.identifier, "LUC-4192");
});

test("findBoardAuthorizationWaitChain does not suppress true protected smoke failures", () => {
  const fixture = boardAuthorizationWaitFixture();
  const failedSmoke = {
    identifier: "LUC-5999",
    title: "[Soar][Release] Protected smoke failed after deploy",
    description: "Protected smoke failed after deploy; DRE must preserve failed gate evidence.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4192", status: "in_review" }],
  };
  const issues = [
    fixture.root,
    fixture.ctoWait,
    fixture.pmWait,
    fixture.aiaWait,
    failedSmoke,
  ];
  const sourceIssues = [
    fixture.ctoWait,
    fixture.pmWait,
    fixture.aiaWait,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4192",
    sourceIssues,
  }).concat(failedSmoke);

  const suppressed = findBoardAuthorizationWaitChain({
    rootBlocker: "LUC-4192",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

function controlPlaneWriteBoundaryRecoveryFixture() {
  const root = {
    identifier: "LUC-4335",
    title: "[Softwarehouse][Control Plane] Repair Paperclip write-boundary recovery path",
    description: [
      "Paperclip control-plane authorization/write-boundary repair for failed blocker routing.",
      "Restore a live execution path, fix the runtime/adapter failure, or record an intentional manual resolution.",
      "The issue update mutation is outside the current actor authorization boundary.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "aia",
    blockedBy: [],
    activeRecoveryAction: {
      kind: "stranded_assigned_issue",
      wakePolicy: { type: "wake_owner" },
    },
  };
  const opsParent = {
    identifier: "LUC-4329",
    title: "[Soar][Ops] Close stale Coolify deployment diagnostics",
    description: "Blocked while the control-plane repair restores the authorized write path.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4335", status: "blocked" }],
    blockerAttention: {
      state: "covered",
      reason: "active_child",
      sampleBlockerIdentifier: "LUC-4335",
    },
  };
  const releaseDependent = {
    identifier: "LUC-4334",
    title: "[Soar][Release] Integrate deployment diagnostic closure",
    description: "Blocked by LUC-4335 because the source write-boundary repair owns the recovery action.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4335", status: "blocked" }],
  };
  return {
    root,
    opsParent,
    releaseDependent,
  };
}

test("findControlPlaneWriteBoundaryRecoveryChain suppresses LUC-4335 control-plane repair roots", () => {
  const fixture = controlPlaneWriteBoundaryRecoveryFixture();
  const issues = [
    fixture.root,
    fixture.opsParent,
    fixture.releaseDependent,
  ];
  const sourceIssues = [
    fixture.opsParent,
    fixture.releaseDependent,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4335",
    sourceIssues,
  });

  const suppressed = findControlPlaneWriteBoundaryRecoveryChain({
    rootBlocker: "LUC-4335",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed.identifier, "LUC-4335");
});

test("findControlPlaneWriteBoundaryRecoveryChain does not suppress true release failures", () => {
  const fixture = controlPlaneWriteBoundaryRecoveryFixture();
  const failedSmoke = {
    identifier: "LUC-6999",
    title: "[Soar][Release] Protected smoke failed after deploy",
    description: "Protected smoke failed after deploy; DRE must preserve failed gate evidence.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4335", status: "blocked" }],
  };
  const issues = [
    fixture.root,
    fixture.opsParent,
    fixture.releaseDependent,
    failedSmoke,
  ];
  const sourceIssues = [
    fixture.opsParent,
    fixture.releaseDependent,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4335",
    sourceIssues,
  }).concat(failedSmoke);

  const suppressed = findControlPlaneWriteBoundaryRecoveryChain({
    rootBlocker: "LUC-4335",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

function protectedCoolifyVpsBindingWaitFixture() {
  const root = {
    identifier: "LUC-4811",
    title: "[Secret Binding][Soar] Inject read-only Coolify/VPS status bindings into DRE runtime",
    description: [
      "DRE production health readback cannot run because the DRE runner exposes no read-only Coolify/VPS status binding names.",
      "Inject approved read-only Coolify/VPS status bindings into the DRE heartbeat/runtime environment.",
      "Names only, no values in comments/artifacts.",
      "Approved read-only bindings are injected into the DRE runtime, or this issue is blocked with the exact missing secret-store owner/action.",
      "No deploy, push, restart, rollback, raw secret value disclosure, raw log capture, screenshot, database/Redis mutation, production account mutation, exchange/trading action, payment/subscription action, or live-money action.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "aia",
    blockedBy: [],
  };
  const securityOpsBinding = {
    identifier: "LUC-4806",
    title: "[Security/Ops][Soar] Bind read-only Coolify/VPS status inputs for production health readback",
    description: [
      "Provide an approved redaction-safe read-only binding path so DRE can collect Coolify/VPS deployment and server-health evidence without exposing secret values.",
      "Comment with names-only evidence: present/missing binding families and the exact consumer issue to wake.",
      "No deploy, push, restart, rollback, env edit beyond approved binding injection, database/Redis mutation, account mutation, secret value readback, screenshot, raw log capture, exchange/trading action, payment/subscription action, or live-money action.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "security",
    blockedBy: [{ identifier: "LUC-4811", status: "blocked" }],
  };
  const dreReadback = {
    identifier: "LUC-4767",
    title: "[Ops][Soar] Restore/read Coolify VPS health evidence for production watch",
    description: [
      "Read-only DRE/Ops follow-up only.",
      "Names-only binding scan reports required Coolify/VPS binding names present or records exact missing families.",
      "No deploy, restart, rollback, env edit, DB/Redis mutation, account mutation, secret readback, screenshot, raw log capture, or live-trading action occurs.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4806", status: "blocked" }],
    blockerAttention: {
      state: "needs_attention",
      reason: "attention_required",
      sampleBlockerIdentifier: "LUC-4811",
    },
  };
  return {
    root,
    securityOpsBinding,
    dreReadback,
  };
}

test("findProtectedCoolifyVpsBindingWaitChain suppresses LUC-4811 protected binding waits", () => {
  const fixture = protectedCoolifyVpsBindingWaitFixture();
  const issues = [
    fixture.root,
    fixture.securityOpsBinding,
    fixture.dreReadback,
  ];
  const sourceIssues = [
    fixture.root,
    fixture.securityOpsBinding,
    fixture.dreReadback,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4811",
    sourceIssues,
  });

  const suppressed = findProtectedCoolifyVpsBindingWaitChain({
    rootBlocker: "LUC-4811",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed.identifier, "LUC-4811");
});

test("findProtectedCoolifyVpsBindingWaitChain suppresses expanded LUC-4811 dependent sets", () => {
  const fixture = protectedCoolifyVpsBindingWaitFixture();
  const expandedDependents = [
    {
      identifier: "LUC-4929",
      title: "[Ops][Soar] Recheck production health after protected binding wait",
      description: "Blocked until the read-only Coolify/VPS binding names exist in the DRE runtime.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-4767", status: "blocked" }],
    },
    {
      identifier: "LUC-5022",
      title: "[Ops][Soar] Refresh deployment evidence after Coolify/VPS binding wait",
      description: "DRE cannot collect deployment evidence until the approved names-only bindings are present.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-4929", status: "blocked" }],
    },
    {
      identifier: "LUC-5027",
      title: "[Ops][Soar] Continue production watch after protected runtime binding",
      description: "Waits on the same read-only Coolify/VPS runtime binding root; no deploy or restart permitted.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-5022", status: "blocked" }],
    },
    {
      identifier: "LUC-5032",
      title: "[Ops][Soar] Latest production watch checkpoint after binding wait",
      description: "Blocked behind approved Coolify/VPS binding names; no secret values or production mutation.",
      status: "blocked",
      assigneeAgentId: "dre",
      blockedBy: [{ identifier: "LUC-5027", status: "blocked" }],
      blockerAttention: {
        state: "needs_attention",
        reason: "attention_required",
        sampleBlockerIdentifier: "LUC-4811",
      },
    },
  ];
  const issues = [
    fixture.root,
    fixture.securityOpsBinding,
    fixture.dreReadback,
    ...expandedDependents,
  ];
  const sourceIssues = issues;
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4811",
    sourceIssues,
  });

  const suppressed = findProtectedCoolifyVpsBindingWaitChain({
    rootBlocker: "LUC-4811",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(sourceIssues.length, 7);
  assert.equal(suppressed.identifier, "LUC-4811");
});

function protectedCoolifyWatchBindingRestorationFixture() {
  const runtimeRoot = {
    identifier: "LUC-4713",
    title: "[Soar][Runtime/Ops] Restore DRE read-only Coolify watch bindings",
    description: [
      "Restore the DRE production watch runtime binding names without exposing values.",
      "Required binding names: COOLIFY_BASE_URL, COOLIFY_API_TOKEN or COOLIFY_TOKEN, COOLIFY_SOAR_PROJECT_ID, COOLIFY_SOAR_PRODUCTION_ENVIRONMENT.",
      "DRE watch runtime has the required Coolify binding names by names-only proof.",
      "No deploy, restart, rollback, production env edit, DB/Redis mutation, account mutation, protected smoke, exchange action, or live-trading action.",
      "Do not print, store, screenshot, or comment secret values, raw ids, cookies, tokens, passwords, API keys, production sessions, or raw logs.",
    ].join("\n"),
    status: "todo",
    assigneeAgentId: "rte",
    blockedBy: [],
  };
  const secretBindingRoot = {
    ...protectedCoolifyVpsBindingWaitFixture().root,
    blockedBy: [{ identifier: "LUC-4713", status: "todo" }],
  };
  const restoreBindings = {
    identifier: "LUC-4710",
    title: "[Soar][Security/Ops] Restore read-only production watch bindings for DRE smoke",
    description: [
      "No COOLIFY_* env names were present in the DRE runtime, so read-only Coolify project/environment/resource/log/deploy-status evidence could not be refreshed.",
      "Restore or confirm approved read-only production watch bindings for future DRE heartbeats without exposing secret values.",
      "No deploy, restart, rollback, production env edit, DB/Redis mutation, account mutation, protected smoke, secret value disclosure, or raw log capture.",
    ].join("\n"),
    status: "blocked",
    assigneeAgentId: "security",
    blockedBy: [{ identifier: "LUC-4713", status: "todo" }],
    blockerAttention: {
      state: "needs_attention",
      reason: "attention_required",
      sampleBlockerIdentifier: "LUC-4713",
    },
  };
  const healthEvidence = {
    identifier: "LUC-4767",
    title: "[Ops][Soar] Restore/read Coolify VPS health evidence for production watch",
    description: "Blocked behind the approved names-only Coolify watch binding path; no deploy, restart, protected smoke, or secret readback.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4710", status: "blocked" }],
  };
  const deployHealth = {
    identifier: "LUC-4929",
    title: "[Soar] Coolify production deploy health sweep",
    description: "Fail closed until read-only Coolify watch binding names exist in the DRE runtime.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4767", status: "blocked" }],
  };
  const serverWatch = {
    identifier: "LUC-5022",
    title: "[Soar] Production performance and server health watch",
    description: "Blocked behind approved Coolify watch binding names; no secret values or production mutation.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4929", status: "blocked" }],
  };
  const restartGate = {
    identifier: "LUC-5027",
    title: "[Softwarehouse] Safe local Paperclip dev-server restart after longevity doctor",
    description: "Waits on the same read-only Coolify watch binding root; no production deploy or protected smoke.",
    status: "blocked",
    assigneeAgentId: "aia",
    blockedBy: [{ identifier: "LUC-5022", status: "blocked" }],
  };
  const acceptanceSweep = {
    identifier: "LUC-5032",
    title: "[Soar] Authenticated production acceptance and performance sweep",
    description: "Blocked behind approved Coolify watch binding names; no secret values or production mutation.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-5027", status: "blocked" }],
    blockerAttention: {
      state: "needs_attention",
      reason: "attention_required",
      sampleBlockerIdentifier: "LUC-4713",
    },
  };
  return {
    runtimeRoot,
    secretBindingRoot,
    restoreBindings,
    healthEvidence,
    deployHealth,
    serverWatch,
    restartGate,
    acceptanceSweep,
  };
}

function protectedCapabilityCredentialFixture() {
  const root = {
    identifier: "LUC-1368",
    title: "[Soar][Protected Gate] Provide deploy-capable Redis recovery path for LUC-1359",
    description: [
      "Protected provider-capability gate.",
      "Exact denied mutation: POST /api/v1/databases/{redis}/restart -> 403 Missing required permissions: deploy.",
      "Evidence remains redacted and value-free; do not print, paste, or attach secret values.",
      "Least-privilege unblock owner/action: board/operator grants the single deploy capability or routes one approved owner action.",
      "No deploy, rebuild, restart retry, or broader production mutation is allowed until that owner action completes.",
    ].join("\n"),
    status: "blocked",
    assigneeUserId: "local-board",
  };
  const runtimeRecovery = {
    identifier: "LUC-1359",
    title: "[Soar][Project Truth][Critical Runtime] Restore production runtime",
    description: "Blocked until the protected Redis recovery capability gate clears.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-1368", status: "blocked" }],
  };
  const deliveryRoot = {
    identifier: "LUC-25",
    title: "00 General: Deliver Soar and Roost to Usable VPS Production",
    description: "Blocked until the protected runtime recovery chain clears.",
    status: "blocked",
    assigneeAgentId: "portfolio",
    blockedBy: [{ identifier: "LUC-1359", status: "blocked" }],
    blockerAttention: {
      state: "covered",
      reason: "active_dependency",
      sampleBlockerIdentifier: "LUC-1368",
    },
  };
  return { root, runtimeRecovery, deliveryRoot };
}

test("findProtectedCoolifyVpsBindingWaitChain suppresses LUC-4713 live read-only Coolify watch binding waits", () => {
  const fixture = protectedCoolifyWatchBindingRestorationFixture();
  const issues = Object.values(fixture);
  const sourceIssues = [
    fixture.secretBindingRoot,
    fixture.acceptanceSweep,
    fixture.restartGate,
    fixture.serverWatch,
    fixture.deployHealth,
    fixture.healthEvidence,
    fixture.restoreBindings,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4713",
    sourceIssues,
  });

  const suppressed = findProtectedCoolifyVpsBindingWaitChain({
    rootBlocker: "LUC-4713",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(sourceIssues.length, 7);
  assert.equal(suppressed.identifier, "LUC-4713");
  assert.equal(suppressed.status, "todo");
});

test("findProtectedCoolifyVpsBindingWaitChain requires an owner for live binding restoration roots", () => {
  const fixture = protectedCoolifyWatchBindingRestorationFixture();
  fixture.runtimeRoot.assigneeAgentId = null;
  const issues = Object.values(fixture);
  const sourceIssues = [
    fixture.secretBindingRoot,
    fixture.restoreBindings,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4713",
    sourceIssues,
  });

  const suppressed = findProtectedCoolifyVpsBindingWaitChain({
    rootBlocker: "LUC-4713",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

test("findProtectedCoolifyVpsBindingWaitChain does not suppress true protected smoke failures", () => {
  const fixture = protectedCoolifyVpsBindingWaitFixture();
  const failedSmoke = {
    identifier: "LUC-7999",
    title: "[Soar][Release] Protected smoke failed after deploy",
    description: "Protected smoke failed after deploy; DRE must preserve failed gate evidence.",
    status: "blocked",
    assigneeAgentId: "dre",
    blockedBy: [{ identifier: "LUC-4811", status: "blocked" }],
  };
  const issues = [
    fixture.root,
    fixture.securityOpsBinding,
    fixture.dreReadback,
    failedSmoke,
  ];
  const sourceIssues = [
    fixture.root,
    fixture.securityOpsBinding,
    fixture.dreReadback,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-4811",
    sourceIssues,
  }).concat(failedSmoke);

  const suppressed = findProtectedCoolifyVpsBindingWaitChain({
    rootBlocker: "LUC-4811",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

test("findCoveredProtectedCapabilityCredentialChain suppresses covered protected capability mismatch chains", () => {
  const fixture = protectedCapabilityCredentialFixture();
  const issues = [
    fixture.root,
    fixture.runtimeRecovery,
    fixture.deliveryRoot,
  ];
  const sourceIssues = [
    fixture.root,
    fixture.runtimeRecovery,
    fixture.deliveryRoot,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1368",
    sourceIssues,
  });

  const suppressed = findCoveredProtectedCapabilityCredentialChain({
    rootBlocker: "LUC-1368",
    sourceIssues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed.identifier, "LUC-1368");
});

test("findCoveredProtectedCapabilityCredentialChain does not suppress ambiguous credential blockers", () => {
  const fixture = protectedCapabilityCredentialFixture();
  fixture.root.description = [
    "Protected provider-capability gate.",
    "Permission problem suspected.",
    "Waiting for more details.",
  ].join("\n");
  const issues = [
    fixture.root,
    fixture.runtimeRecovery,
  ];
  const relatedIssues = collectTransitiveBlockerRelatedIssues({
    issues,
    rootKey: "LUC-1368",
    sourceIssues: issues,
  });

  const suppressed = findCoveredProtectedCapabilityCredentialChain({
    rootBlocker: "LUC-1368",
    sourceIssues: issues,
    relatedIssues,
    terminalStatuses,
  });

  assert.equal(suppressed, null);
});

function workerFanoutLearningIssue(overrides = {}) {
  return {
    id: "learning-v2-1",
    identifier: "LUC-1471",
    title: "[Softwarehouse][Learning] Worker queue fan-out capability gap",
    status: "done",
    updatedAt: "2026-06-02T08:36:59.047Z",
    description: [
      "softwarehouse-learning-loop:v2",
      "",
      "Observed process gap: runnable work is concentrated above the leaf worker layer.",
      "",
      "Planned supervisor issue count: 7",
      "Planned worker issue count: 1",
      "Planned issue count: 9",
      "",
      "Weak tracks:",
      "- Roost: planned worker=1, planned supervisor=0, open=3, blocked=2",
    ].join("\n"),
    ...overrides,
  };
}

const workerFanoutSourceIssues = [
  {
    identifier: "LUC-1400",
    title: "Supervisor-held delivery lane",
    status: "todo",
    assigneeAgentId: "engineering-lead",
    updatedAt: "2026-06-02T08:16:34.359Z",
  },
];

test("findSuppressibleV2WorkerFanoutDuplicate suppresses an existing done duplicate with matching counts", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue()],
    terminalStatuses,
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 7,
    plannedIssueCount: 9,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=3, blocked=2"],
    sourceIssues: workerFanoutSourceIssues,
  });

  assert.equal(duplicate.identifier, "LUC-1471");
});

test("findSuppressibleV2WorkerFanoutDuplicate suppresses an existing blocked duplicate with no first-class blocker", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue({
      status: "blocked",
      blockedBy: [],
    })],
    terminalStatuses,
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 7,
    plannedIssueCount: 9,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=3, blocked=2"],
    sourceIssues: workerFanoutSourceIssues,
  });

  assert.equal(duplicate.identifier, "LUC-1471");
});

test("findSuppressibleV2WorkerFanoutDuplicate suppresses a narrower repeat of a handled fanout family", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue()],
    terminalStatuses,
    plannedWorkerIssueCount: 0,
    plannedSupervisorIssueCount: 1,
    plannedIssueCount: 1,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=3, blocked=2"],
    sourceIssues: [
      {
        identifier: "LUC-1505",
        title: "Current worker fanout learning duplicate",
        status: "blocked",
        assigneeAgentId: "engineering-lead",
        updatedAt: "2026-06-02T14:00:00.000Z",
      },
    ],
  });

  assert.equal(duplicate.identifier, "LUC-1471");
});

test("findSuppressibleV2WorkerFanoutDuplicate ignores source timestamp churn for same worker-fanout posture", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue()],
    terminalStatuses,
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 7,
    plannedIssueCount: 9,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=3, blocked=2"],
    sourceIssues: [
      {
        identifier: "LUC-1505",
        title: "Current worker fanout learning duplicate",
        status: "blocked",
        assigneeAgentId: "engineering-lead",
        updatedAt: "2026-06-02T14:00:00.000Z",
      },
    ],
  });

  assert.equal(duplicate.identifier, "LUC-1471");
});

test("findSuppressibleV2WorkerFanoutDuplicate cools down changed counters for the same weak track family", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue({
      updatedAt: "2026-06-02T08:30:00.000Z",
    })],
    terminalStatuses,
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 0,
    plannedIssueCount: 1,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=5, blocked=0"],
    sourceIssues: workerFanoutSourceIssues,
    now: new Date("2026-06-02T09:00:00.000Z"),
  });

  assert.equal(duplicate.identifier, "LUC-1471");
});

test("findSuppressibleV2WorkerFanoutDuplicate allows the same weak track family after cooldown", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue({
      updatedAt: "2026-06-01T08:30:00.000Z",
    })],
    terminalStatuses,
    plannedWorkerIssueCount: 1,
    plannedSupervisorIssueCount: 0,
    plannedIssueCount: 1,
    weakTrackSummaries: ["Roost: planned worker=1, planned supervisor=0, open=5, blocked=0"],
    sourceIssues: workerFanoutSourceIssues,
    now: new Date("2026-06-02T09:00:00.000Z"),
  });

  assert.equal(duplicate, null);
});

test("findSuppressibleV2WorkerFanoutDuplicate does not suppress per-track fanout evidence with only legacy aggregate history", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue({
      description: [
        "softwarehouse-learning-loop:v2",
        "",
        "Observed process gap: runnable work is concentrated above the leaf worker layer.",
        "",
        "Planned supervisor issue count: 7",
        "Planned worker issue count: 1",
        "Planned issue count: 9",
      ].join("\n"),
    })],
    terminalStatuses,
    plannedWorkerIssueCount: 0,
    plannedSupervisorIssueCount: 2,
    plannedIssueCount: 2,
    weakTrackSummaries: ["Roost: planned worker=0, planned supervisor=0, open=3, blocked=0"],
    sourceIssues: workerFanoutSourceIssues,
  });

  assert.equal(duplicate, null);
});

test("findSuppressibleV2WorkerFanoutDuplicate does not suppress a true new worker-fanout delta", () => {
  const duplicate = findSuppressibleV2WorkerFanoutDuplicate({
    issues: [workerFanoutLearningIssue()],
    terminalStatuses,
    plannedWorkerIssueCount: 2,
    plannedSupervisorIssueCount: 7,
    plannedIssueCount: 10,
    weakTrackSummaries: ["Roost: planned worker=2, planned supervisor=0, open=3, blocked=1"],
    sourceIssues: [
      {
        identifier: "LUC-1480",
        title: "New supervisor-held delivery lane",
        status: "todo",
        assigneeAgentId: "engineering-lead",
        updatedAt: "2026-06-02T08:40:00.000Z",
      },
    ],
  });

  assert.equal(duplicate, null);
});

test("findSuppressibleV2ReviewDecisionPathDuplicate suppresses an open same-source learning issue", () => {
  const duplicate = findSuppressibleV2ReviewDecisionPathDuplicate({
    issues: [
      {
        id: "learning-review-1",
        identifier: "LUC-1506",
        title: "[Softwarehouse][Learning] In-review decision path capability gap",
        status: "blocked",
        description: [
          "softwarehouse-learning-loop:v2",
          "",
          "Observed issues:",
          "- LUC-1233: [Softwarehouse] Fix control-tick liveRunJanitor timeout (unknown)",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    sourceIssueIdentifiers: ["LUC-1233"],
  });

  assert.equal(duplicate.identifier, "LUC-1506");
});

test("findSuppressibleV2ReviewDecisionPathDuplicate allows a new source issue delta", () => {
  const duplicate = findSuppressibleV2ReviewDecisionPathDuplicate({
    issues: [
      {
        id: "learning-review-1",
        identifier: "LUC-1506",
        title: "[Softwarehouse][Learning] In-review decision path capability gap",
        status: "done",
        description: [
          "softwarehouse-learning-loop:v2",
          "",
          "Observed issues:",
          "- LUC-1233: [Softwarehouse] Fix control-tick liveRunJanitor timeout (unknown)",
        ].join("\n"),
      },
    ],
    terminalStatuses,
    sourceIssueIdentifiers: ["LUC-1233", "LUC-1510"],
  });

  assert.equal(duplicate, null);
});

test("hasPendingRequestConfirmation treats pending confirmations as stop signs", () => {
  assert.equal(hasPendingRequestConfirmation([
    { kind: "request_confirmation", status: "expired" },
    { kind: "request_confirmation", status: "pending" },
  ]), true);
});

test("hasPendingReviewInteraction treats pending question interactions as review waiters", () => {
  assert.equal(hasPendingReviewInteraction([
    { kind: "ask_user_questions", status: "pending" },
  ]), true);
  assert.equal(hasPendingReviewInteraction([
    { kind: "request_checkbox_confirmation", status: "pending" },
  ]), true);
  assert.equal(hasPendingReviewInteraction([
    { kind: "ask_user_questions", status: "responded" },
    { kind: "request_confirmation", status: "rejected" },
    { kind: "request_checkbox_confirmation", status: "responded" },
  ]), false);
});

test("hasRepeatedRoutineCommentWithoutNewEvidence suppresses duplicate machine reminders", () => {
  const suppressed = hasRepeatedRoutineCommentWithoutNewEvidence([
    {
      body: `${routineCommentMarkers.runDispositionEnforcer}\n\nMissing disposition.`,
      createdAt: "2026-06-02T13:32:10.639Z",
    },
    {
      body: `${routineCommentMarkers.inReviewDecisionPath}\n\nMissing decision path.`,
      createdAt: "2026-06-02T13:32:09.954Z",
    },
  ], routineCommentMarkers.runDispositionEnforcer);

  assert.equal(suppressed, true);
});

test("hasRepeatedRoutineCommentWithoutNewEvidence allows a reminder after new non-routine evidence", () => {
  const suppressed = hasRepeatedRoutineCommentWithoutNewEvidence([
    {
      body: "Reviewer: board\nDecision owner: CTO",
      createdAt: "2026-06-02T13:40:00.000Z",
    },
    {
      body: `${routineCommentMarkers.inReviewDecisionPath}\n\nMissing decision path.`,
      createdAt: "2026-06-02T13:32:09.954Z",
    },
  ], routineCommentMarkers.inReviewDecisionPath);

  assert.equal(suppressed, false);
});
