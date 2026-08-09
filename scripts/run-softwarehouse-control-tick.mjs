import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import {
  autonomyDispositionForMode,
  controlActionSummaryFor,
  deliveryPermissionForMode,
  gateBriefFor,
  guardrailsForOperatingPosture,
  operatorActionStatusFor,
  staleGateOwnerActionLine,
} from "./lib/softwarehouse-control-brief.mjs";
import { mergeProtectedDeliveryGates } from "./lib/delivery-blocker-graph.mjs";
import { acquireSingleFlightExecution } from "./lib/single-flight-lock.mjs";
import { resolveRuntimeBindingRepairSummary } from "./lib/softwarehouse-runtime-binding-repair-summary.mjs";
import {
  dryRunCommandFor,
  isNonFatalBlockedRootGuardrailTimeout,
  isNonFatalJanitorBoardCancelDenied,
  isNonFatalJanitorBulkRefusal,
  isNonFatalLearningLoopTimeout,
  isNonFatalProjectMutationGuardBoardCancelDenied,
  isNonFatalSoftwarehouseAuditTimeout,
} from "./lib/control-tick-step-runner.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const preferredCompanyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const requestedStepTimeoutMs = Number(process.env.SOFTWAREHOUSE_CONTROL_TICK_STEP_TIMEOUT_MS ?? 180_000);
const minimumStepTimeoutMs = Number(process.env.SOFTWAREHOUSE_CONTROL_TICK_MIN_STEP_TIMEOUT_MS ?? 120_000);
const defaultStepTimeoutMs = Math.max(requestedStepTimeoutMs, minimumStepTimeoutMs);
const liveRunJanitorStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_LIVE_RUN_JANITOR_TIMEOUT_MS ?? 600_000,
);
const takeoverIntakeDedupeStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_TAKEOVER_INTAKE_DEDUPE_TIMEOUT_MS ?? 180_000,
);
const runtimeBindingAssigneeRepairStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_RUNTIME_BINDING_ASSIGNEE_REPAIR_TIMEOUT_MS ?? 600_000,
);
const blockedRootGuardrailStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_BLOCKED_ROOT_GUARDRAIL_TIMEOUT_MS ?? 600_000,
);
const gateFreshnessWatcherStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_GATE_FRESHNESS_WATCHER_TIMEOUT_MS ?? 300_000,
);
const softwarehouseAuditStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_SOFTWAREHOUSE_AUDIT_TIMEOUT_MS ?? 600_000,
);
const autonomyGovernorStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_AUTONOMY_GOVERNOR_TIMEOUT_MS ?? 600_000,
);
const localRepairLaneStarterStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_LOCAL_REPAIR_LANE_STARTER_TIMEOUT_MS ?? 300_000,
);
const learningLoopStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_LEARNING_LOOP_TIMEOUT_MS ?? 300_000,
);
const runDispositionEnforcerStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_RUN_DISPOSITION_ENFORCER_TIMEOUT_MS ?? 120_000,
);
const blockedTriageLaneStarterStepTimeoutMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_BLOCKED_TRIAGE_LANE_STARTER_TIMEOUT_MS ?? 300_000,
);
const controlTickBudgetMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_BUDGET_MS ?? 1_500_000,
);
const controlTickLockWaitMs = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_LOCK_WAIT_MS ?? 90_000,
);
const stepOutputMaxBufferBytes = Number(
  process.env.SOFTWAREHOUSE_CONTROL_TICK_STEP_OUTPUT_MAX_BUFFER_BYTES ?? 64 * 1024 * 1024,
);

const steps = [
  {
    name: "liveRunJanitor",
    command: ["scripts/run-live-run-janitor.mjs", "--apply"],
    timeoutMs: liveRunJanitorStepTimeoutMs,
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      skippedCount: data.skipped?.length ?? 0,
      skipped: data.skipped?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        skippedReason: action.skippedReason,
        ownerAction: action.ownerAction,
      })) ?? [],
      actions: data.actions?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        issueStatus: action.issueStatus,
      })) ?? [],
    }),
  },
  {
    name: "issueQueueReconciler",
    command: ["scripts/run-issue-queue-reconciler.mjs", "--apply"],
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      blockerRepairCount: data.blockerRepairCount ?? null,
      stalledTodoWakeCount: data.stalledTodoWakeCount ?? null,
      skippedCount: data.skippedCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      applied: data.applied ?? [],
      skipped: data.skipped ?? [],
    }),
  },
  {
    name: "composeOneoffJanitor",
    command: ["scripts/run-compose-oneoff-janitor.mjs", "--apply"],
    summary: (data) => ({
      oneoffCount: data.oneoffCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      skippedCount: data.skipped?.length ?? 0,
      warnings: data.warnings ?? [],
      failures: data.failures ?? [],
    }),
  },
  {
    name: "runtimeTopology",
    command: ["scripts/audit-local-runtime-topology.mjs"],
    summary: (data) => ({
      overall: data.overall ?? null,
      composeOneoffCount: data.composeOneoffs?.length ?? 0,
      warningCount: data.warnings?.length ?? 0,
      failureCount: data.failures?.length ?? 0,
      warnings: data.warnings ?? [],
      failures: data.failures ?? [],
    }),
  },
  {
    name: "outcomeIntegrity",
    command: ["scripts/run-outcome-integrity-audit.mjs"],
    summary: (data) => ({
      status: data.status ?? null,
      openIssues: data.summary?.openIssues ?? null,
      recentDone: data.summary?.recentDone ?? null,
      evidenceBackedRecentDone: data.summary?.evidenceBackedRecentDone ?? null,
      findingCount: data.summary?.findingCount ?? null,
      errorCount: data.summary?.errorCount ?? null,
      warningCount: data.summary?.warningCount ?? null,
      complexitySnapshot: data.summary?.complexitySnapshot ?? null,
      findingCodes: data.findings?.map((finding) => finding.code) ?? [],
    }),
  },
  {
    name: "productIntentTraceability",
    command: ["scripts/audit-product-intent-traceability.mjs"],
    summary: (data) => ({
      status: data.status ?? null,
      contractFailures: data.contracts?.filter((contract) => !contract.ready).map((contract) => contract.project) ?? [],
      readyCandidates: data.live?.projects?.reduce((count, project) => count + Number(project.readyCandidates ?? 0), 0) ?? 0,
      reconciliationRequired: data.live?.projects?.reduce((count, project) => count + Number(project.reconciliationRequired ?? 0), 0) ?? 0,
      conflicts: data.live?.projects?.flatMap((project) => project.candidates
        ?.filter((candidate) => candidate.conflicts?.length > 0)
        .map((candidate) => ({ project: project.name, identifier: candidate.identifier, conflicts: candidate.conflicts })) ?? []) ?? [],
    }),
  },
  {
    name: "quotaAgentRecovery",
    command: ["scripts/recover-softwarehouse-quota-agents.mjs", "--apply"],
    summary: (data) => ({
      candidateCount: data.candidateCount ?? null,
      decision: data.decision ?? null,
      recoveredAgentCount: data.recoveredAgents?.length ?? 0,
      recoveredAgents: data.recoveredAgents?.map((agent) => agent.name) ?? [],
      decisions: data.decisions?.map((entry) => ({
        agent: entry.agent,
        recover: entry.recover,
        reason: entry.reason,
        primaryProbe: entry.primaryProbe,
        fallbackProbe: entry.fallbackProbe,
      })) ?? [],
    }),
  },
  {
    name: "takeoverIntakeDedupe",
    command: ["scripts/run-takeover-intake-dedupe.mjs", "--apply"],
    timeoutMs: takeoverIntakeDedupeStepTimeoutMs,
    summary: (data) => ({
      duplicateGroupCount: data.duplicateGroupCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      actions: data.actions?.map((action) => ({
        project: action.project,
        identifier: action.identifier,
        keepIdentifier: action.keepIdentifier,
      })) ?? [],
    }),
  },
  {
    name: "routineDuplicateJanitor",
    command: ["scripts/run-routine-duplicate-janitor.mjs", "--apply"],
    summary: (data) => ({
      duplicateGroupCount: data.duplicateGroupCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      actions: data.actions?.map((action) => ({
        identifier: action.identifier,
        keepIdentifier: action.keepIdentifier,
        status: action.status,
      })) ?? [],
    }),
  },
  {
    name: "projectMutationGuard",
    command: ["scripts/run-project-mutation-guard.mjs", "--apply"],
    summary: (data) => ({
      activeSoarRunCount: data.activeSoarRunCount ?? null,
      actionCount: data.actionCount ?? null,
      newProtectedGroups: data.newProtectedGroups ?? [],
      skippedCount: data.actionSkips?.length ?? 0,
      skipped: data.actionSkips?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        skippedReason: action.skippedReason,
      })) ?? [],
      actions: data.actions?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        issueStatus: action.issueStatus,
        newProtectedGroups: action.newProtectedGroups ?? [],
      })) ?? [],
      appliedCount: data.applied?.length ?? 0,
    }),
  },
  {
    name: "recoveryActionJanitor",
    command: ["scripts/run-recovery-action-janitor.mjs"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      actionCount: data.actionCount ?? null,
      actions: data.actions?.map((action) => ({
        issueIdentifier: action.issueIdentifier,
        issueStatus: action.issueStatus,
        recoveryKind: action.recoveryKind,
        rootBlocker: action.rootBlocker,
        action: action.action,
        reason: action.reason,
      })) ?? [],
    }),
  },
  {
    name: "finalDispositionJanitor",
    command: ["scripts/run-final-disposition-janitor.mjs", "--apply"],
    summary: (data) => ({
      candidateScanStatus: data.candidateScanStatus ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateIssueCount: data.candidateIssueCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      skippedCount: Array.isArray(data.skipped) ? data.skipped.length : 0,
      skipped: Array.isArray(data.skipped)
        ? data.skipped.map((action) => ({
          identifier: action.identifier ?? null,
          reason: action.reason ?? null,
          ownerAction: action.ownerAction ?? null,
        }))
        : data.skipped ?? [],
      actions: data.actions?.map((action) => ({
        identifier: action.identifier,
        project: action.project,
        status: action.status,
        recoveryKind: action.recoveryKind,
      })) ?? [],
    }),
  },
  {
    name: "blockedRootGuardrail",
    command: ["scripts/run-blocked-root-guardrail.mjs"],
    timeoutMs: blockedRootGuardrailStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      findingCount: data.findingCount ?? null,
      repairActionCount: data.repairActionCount ?? null,
      duplicateRootFindings: data.duplicateRootFindings?.map((finding) => ({
        rootBlocker: finding.rootBlocker,
        blockedIssueCount: finding.blockedIssueCount,
        missingBlockedByRootCount: finding.missingBlockedByRootCount,
      })) ?? [],
      staleGateFindings: data.staleGateFindings?.map((finding) => ({
        rootBlocker: finding.rootBlocker,
        project: finding.project,
        ageHours: finding.ageHours,
      })) ?? [],
      resolvedRootDependentsStillBlocked: data.resolvedRootDependentsStillBlocked?.map((finding) => ({
        rootBlocker: finding.rootBlocker,
        rootStatus: finding.rootStatus,
        dependentIdentifier: finding.dependentIdentifier,
      })) ?? [],
    }),
  },
  {
    name: "autonomousGateApproval",
    command: ["scripts/run-autonomous-gate-approval.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateCount: data.candidateCount ?? null,
      actions: data.actions ?? [],
    }),
  },
  {
    name: "runtimeGateBindingRepair",
    command: ["scripts/repair-runtime-gate-bindings.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      plannedCount: data.plannedCount ?? null,
      selectedCount: data.selectedCount ?? null,
      applySkipped: data.applySkipped ?? null,
      applied: data.applied ?? [],
      actions: data.actions?.map((action) => ({
        rootBlocker: action.rootBlocker,
        project: action.project,
        currentAssigneeName: action.currentAssigneeName ?? null,
        targetAgentNames: action.targetAgentNames ?? [],
        changedEnvKeys: action.changedEnvKeys ?? [],
        agentActions: action.agentActions?.map((agentAction) => ({
          agentName: agentAction.agentName,
          addedEnvKeys: agentAction.addedEnvKeys ?? [],
          sourceSecretKeys: agentAction.sourceSecretKeys ?? [],
        })) ?? [],
      })) ?? [],
    }),
  },
  {
    name: "gateFreshnessWatcher",
    command: ["scripts/run-gate-freshness-watcher.mjs"],
    timeoutMs: gateFreshnessWatcherStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      observations: data.observations?.map((gate) => ({
        rootBlocker: gate.rootBlocker,
        status: gate.status,
        secretUpdatedAfterIssue: gate.secretUpdatedAfterIssue,
        hasExplicitApprovalOrEvidence: gate.hasExplicitApprovalOrEvidence,
      })) ?? [],
      applied: data.applied ?? [],
    }),
  },
  {
    name: "unblockPacket",
    command: ["scripts/export-softwarehouse-unblock-packet.mjs"],
    summary: (data) => ({
      freshGateCount: data.freshGateCount ?? null,
      operatingDecision: data.operatingDecision ?? null,
      gateHandoffs: data.gates?.map((gate) => ({
        project: gate.project,
        rootBlocker: gate.rootBlocker,
        status: gate.status,
        owner: gate.owner,
        fresh: gate.fresh,
        nextAction: gate.nextAction,
        evidenceRequired: gate.evidenceRequired,
        acceptedFreshFacts: gate.acceptedFreshFacts ?? [],
        operatorPrompt: gate.operatorPrompt ?? null,
        approvalDryRunCommand: gate.approvalDryRunCommand ?? null,
        approvalApplyCommand: gate.approvalApplyCommand ?? null,
        recheckHandoff: gate.recheckHandoff ?? null,
        latestEvidence: gate.latestEvidence ?? null,
      })) ?? [],
      outputs: data.outputs ?? [],
    }),
  },
  {
    name: "sourceControl",
    command: ["scripts/check-softwarehouse-source-control.mjs"],
    summary: (data) => ({
      clean: data.clean ?? null,
      repos: data.repos?.map((repo) => ({
        name: repo.name,
        parked: repo.parked === true,
        exists: repo.exists,
        git: repo.git,
        branch: repo.branch ?? null,
        head: repo.head ?? null,
        clean: repo.clean,
        dirtyCount: repo.dirtyCount ?? null,
        statusCounts: repo.statusCounts ?? {},
        dirtyGroups: repo.dirtyGroups ?? [],
        sourceControlClosureLanes: repo.sourceControlClosureLanes ?? [],
        sample: repo.sample ?? [],
      })) ?? [],
    }),
  },
  {
    name: "sourceControlClosureJanitor",
    command: ["scripts/run-source-control-closure-janitor.mjs", "--apply"],
    summary: (data) => ({
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      actions: data.actions?.map((action) => ({
        identifier: action.identifier,
        project: action.project,
        status: action.status,
        head: action.head ?? null,
      })) ?? [],
    }),
  },
  {
    name: "sourceControlClosureExecutor",
    command: ["scripts/run-source-control-closure-executor.mjs"],
    summary: (data) => ({
      laneCount: data.laneCount ?? null,
      safeAutoCommitCandidateCount: data.safeAutoCommitCandidateCount ?? null,
      specialistReviewRequiredCount: data.specialistReviewRequiredCount ?? null,
      lanes: data.lanes?.map((lane) => ({
        repository: lane.repository,
        group: lane.group,
        count: lane.count,
        decision: lane.decision,
        safeAutoCommitCandidate: lane.safeAutoCommitCandidate,
        requiresHumanOrSpecialist: lane.requiresHumanOrSpecialist,
        validationOk: lane.validation?.every((item) => item.result?.ok) ?? null,
      })) ?? [],
    }),
  },
  {
    name: "architectureAwarenessLifecycle",
    command: ["scripts/check-architecture-awareness-lifecycle.mjs"],
    summary: (data) => ({
      maxAgeHours: data.maxAgeHours ?? null,
      projectsMissingExportsCount: data.summary?.projectsMissingExportsCount ?? null,
      projectsWithStaleExportsCount: data.summary?.projectsWithStaleExportsCount ?? null,
      allExistingProjectsHaveExports: data.summary?.allExistingProjectsHaveExports ?? null,
      allExistingProjectsFresh: data.summary?.allExistingProjectsFresh ?? null,
      projects: data.projects?.map((project) => ({
        name: project.name,
        exists: project.exists,
        action: project.action,
        missingExports: project.missingExports ?? [],
        staleExports: project.staleExports ?? [],
        oldestExportUpdatedAt: project.oldestExportUpdatedAt ?? null,
      })) ?? [],
    }),
  },
  {
    name: "projectTruthAudit",
    command: ["scripts/check-project-truth-indexes.mjs"],
    summary: (data) => ({
      projectNames: data.projectNames ?? [],
      projectCount: data.summary?.projectCount ?? null,
      failedProjectCount: data.summary?.failedProjectCount ?? null,
      projectsWithGaps: data.summary?.projectsWithGaps ?? null,
      incompleteEventChains: data.summary?.incompleteEventChains ?? null,
      criticalRuntimeFindings: data.summary?.criticalRuntimeFindings ?? null,
      totalGaps: data.summary?.totalGaps ?? null,
      firstGap: data.firstGap ?? null,
      projects: data.projects?.map((project) => ({
        name: project.name,
        ok: project.ok,
        publicProbeStatus: project.publicProbe?.status ?? null,
        projectTruthStatus: project.projectTruth?.status ?? null,
        totalGaps: project.projectTruth?.counts?.totalGaps ?? null,
        firstGap: project.projectTruth?.firstGap ?? null,
      })) ?? [],
    }),
  },
  {
    name: "projectTruthGapDispatcher",
    command: ["scripts/run-project-truth-gap-dispatcher.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      projectTruth: data.projectTruth ?? null,
      firstGap: data.firstGap ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        project: action.project ?? null,
        title: action.title ?? null,
        assignee: action.assignee ?? null,
        wakeSkipped: action.wakeSkipped ?? null,
      })) ?? [],
    }),
  },
  {
    name: "runtimeBindingAssigneeRepair",
    command: ["scripts/repair-runtime-binding-assignees.mjs"],
    timeoutMs: runtimeBindingAssigneeRepairStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      actionCount: data.actionCount ?? null,
      reassignCount: data.actions?.filter((action) => action.type === "reassign_runtime_binding_owner").length ?? 0,
      manualCount: data.actions?.filter((action) => action.type === "needs_manual_assignment").length ?? 0,
      actions: data.actions?.map((action) => ({
        type: action.type,
        identifier: action.identifier,
        status: action.status,
        fromAgentName: action.fromAgentName ?? action.currentAssignee ?? null,
        toAgentName: action.toAgentName ?? null,
        missingGroups: action.missingGroups ?? action.requiredGroups ?? [],
      })) ?? [],
    }),
  },
  {
    name: "safeArchitecturePlanningSeeder",
    command: ["scripts/run-safe-architecture-planning-seeder.mjs"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateScanStatus: data.candidateScanStatus ?? null,
      architectureFileCount: data.architectureFileCount ?? null,
      missingLabels: data.missingLabels ?? [],
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        title: action.title ?? null,
        updatedAt: action.updatedAt ?? null,
        recentPlanningWindowMs: action.recentPlanningWindowMs ?? null,
      })) ?? [],
    }),
  },
  {
    name: "safeNonproductionLaneSeeder",
    command: ["scripts/run-safe-nonproduction-lane-seeder.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      actionCount: data.actions?.length ?? null,
      createdOrWoken: data.actions?.filter((action) => action.action === "created_safe_lane").length ?? 0,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        title: action.title ?? null,
        assignee: action.assignee ?? null,
        allSoarOpenBlockedByKnownGates: action.allSoarOpenBlockedByKnownGates ?? null,
        blockedSoarIssuesWithoutSafeDisposition: action.blockedSoarIssuesWithoutSafeDisposition ?? null,
      })) ?? [],
    }),
  },
  {
    name: "projectKnownStateHarvester",
    command: ["scripts/run-project-known-state-harvester.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      targetProjects: data.targetProjects ?? [],
      createdOrWoken: data.createdOrWoken ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        project: action.project ?? null,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
      })) ?? [],
    }),
  },
  {
    name: "twoProjectReadiness",
    command: ["scripts/check-two-project-readiness.mjs"],
    summary: (data) => ({
      supervisionReady: data.readiness?.supervisionReady ?? null,
      twoProjectFullDeliveryReady: data.readiness?.twoProjectFullDeliveryReady ?? null,
      multiProjectTakeoverReady: data.readiness?.multiProjectTakeoverReady ?? null,
      operatingPosture: data.readiness?.operatingPosture ?? null,
      operatingConstraints: data.readiness?.operatingConstraints ?? [],
      requiredBeforeFullDelivery: data.readiness?.requiredBeforeFullDelivery ?? [],
      protectedDeliveryBlockers: data.protectedDeliveryBlockers ?? [],
      deliveryBlockerGraph: data.deliveryBlockerGraph ?? null,
      activeRunCount: data.health?.activeRunCount ?? null,
      liveRunCount: data.health?.liveRunCount ?? null,
    }),
  },
  {
    name: "autonomyGovernor",
    command: ["scripts/run-autonomy-governor.mjs"],
    timeoutMs: autonomyGovernorStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      candidateScanStatus: data.candidateScanStatus ?? null,
      decision: data.decision ?? null,
      recommendedAction: data.recommendedAction ?? null,
      operatingPosture: data.operatingPosture ?? null,
      allowedWhileBlocked: data.allowedWhileBlocked ?? [],
      forbiddenWhileBlocked: data.forbiddenWhileBlocked ?? [],
      runnableIssues: data.counts?.runnableIssues ?? null,
      blockedIssues: data.counts?.blockedIssues ?? null,
      freshGateActions: data.counts?.freshGateActions ?? null,
      sourceControlGateIssues: data.sourceControl?.candidateIssues ?? [],
    }),
  },
  {
    name: "localRepairLaneStarter",
    command: ["scripts/run-local-repair-lane-starter.mjs", "--apply"],
    timeoutMs: localRepairLaneStarterStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateCount: data.candidateCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        project: action.project ?? null,
        status: action.status ?? null,
        updatedStatus: action.updatedStatus ?? null,
      })) ?? [],
    }),
  },
  {
    name: "workerBacklogDecompositionSeeder",
    command: ["scripts/run-worker-backlog-decomposition-seeder.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      shouldSeed: data.shouldSeed ?? null,
      plannedWorkerIssues: data.counts?.plannedWorkerIssues ?? null,
      runnableWorkerIssues: data.counts?.runnableWorkerIssues ?? null,
      plannedSupervisorIssues: data.counts?.plannedSupervisorIssues ?? null,
      trackDispositions: data.trackDispositions ?? [],
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        assignee: action.assignee ?? null,
      })) ?? [],
    }),
  },
  {
    name: "inReviewDecisionPath",
    command: ["scripts/run-in-review-decision-path.mjs", "--apply"],
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      candidateScanStatus: data.candidateScanStatus ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      actions: data.actions?.map((action) => ({
        identifier: action.identifier,
        title: action.title,
      })) ?? [],
    }),
  },
  {
    name: "runDispositionEnforcer",
    command: ["scripts/run-run-disposition-enforcer.mjs", "--apply"],
    timeoutMs: runDispositionEnforcerStepTimeoutMs,
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      candidateIssueCount: data.candidateIssueCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      actions: data.actions?.map((action) => ({
        identifier: action.identifier,
        status: action.status,
        recoveryKind: action.recoveryKind ?? null,
      })) ?? [],
    }),
  },
  {
    name: "learningLoop",
    command: ["scripts/run-softwarehouse-learning-loop.mjs", "--apply"],
    timeoutMs: learningLoopStepTimeoutMs,
    summary: (data) => ({
      candidateScanStatus: data.candidateScanStatus ?? null,
      minRepeatedBlocked: data.minRepeatedBlocked ?? null,
      blockedGroupCount: data.blockedGroupCount ?? null,
      actionCount: data.actionCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        area: action.area ?? null,
        rootBlocker: action.rootBlocker ?? null,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        assignee: action.assignee ?? null,
        title: action.title ?? null,
      })) ?? [],
    }),
  },
  {
    name: "workerLaneNormalizer",
    command: ["scripts/run-worker-lane-normalizer.mjs", "--apply"],
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.appliedCount ?? 0,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        project: action.project ?? null,
        parentIdentifier: action.parentIdentifier ?? null,
        assignee: action.assignee ?? null,
        liveRunActive: action.liveRunActive ?? null,
      })) ?? [],
    }),
  },
  {
    name: "blockedTriageLaneStarter",
    command: ["scripts/run-blocked-triage-lane-starter.mjs", "--apply"],
    timeoutMs: blockedTriageLaneStarterStepTimeoutMs,
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      activeIssueCount: data.activeIssueCount ?? null,
      terminalTriageIssueCount: data.terminalTriageIssueCount ?? null,
      candidateCount: data.candidateCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        targetIdentifier: action.targetIdentifier ?? null,
        project: action.project ?? null,
        status: action.status ?? null,
        wakeStatus: action.wakeStatus ?? null,
      })) ?? [],
    }),
  },
  {
    name: "projectOwnershipAssignment",
    command: ["scripts/run-project-ownership-assignment.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateCount: data.candidateCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        project: action.project ?? null,
        controlledProject: action.controlledProject ?? null,
        assigneeName: action.assigneeName ?? action.agentName ?? null,
        status: action.status ?? null,
      })) ?? [],
    }),
  },
  {
    name: "projectStatusSync",
    command: ["scripts/run-project-status-sync.mjs", "--apply"],
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      actionCount: data.actionCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        project: action.project ?? null,
        fromStatus: action.fromStatus ?? null,
        toStatus: action.toStatus ?? null,
        inProgressIssues: action.inProgressIssues ?? [],
      })) ?? [],
    }),
  },
  {
    name: "architecturePlanningSeeder",
    command: ["scripts/run-safe-architecture-planning-seeder.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      candidateScanStatus: data.candidateScanStatus ?? null,
      architectureFileCount: data.architectureFileCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        identifier: action.identifier ?? null,
        status: action.status ?? null,
        title: action.title ?? null,
        assignee: action.assignee ?? null,
      })) ?? [],
    }),
  },
  {
    name: "soarArchitectureBacklogMaterializer",
    command: ["scripts/run-soar-architecture-backlog-materializer.mjs", "--apply"],
    summary: (data) => ({
      activeRunCount: data.activeRunCount ?? null,
      liveRunCount: data.liveRunCount ?? null,
      sourcePath: data.sourcePath ?? null,
      parsedRows: data.parsedRows ?? null,
      maxCreate: data.maxCreate ?? null,
      actionCount: data.actionCount ?? null,
      actions: data.actions?.map((action) => ({
        action: action.action,
        backlogId: action.backlogId ?? null,
        identifier: action.identifier ?? null,
        status: action.status ?? action.createdStatus ?? null,
        priority: action.priority ?? null,
        assignee: action.assignee ?? null,
        title: action.title ?? null,
      })) ?? [],
    }),
  },
  {
    name: "coolifyProductionReconciler",
    command: ["scripts/run-coolify-production-reconciler.mjs"],
    summary: (data) => ({
      overall: data.overall ?? null,
      projectIdConfigured: data.projectIdConfigured ?? null,
      teamIdConfigured: data.teamIdConfigured ?? null,
      tokenConfigured: data.tokenConfigured ?? null,
      resourceCount: data.resourceCount ?? null,
      expectedResourceCount: data.expectedResourceCount ?? null,
      checks: data.checks ?? [],
    }),
  },
  {
    name: "releasePushDeployGovernor",
    command: ["scripts/run-release-push-deploy-governor.mjs"],
    summary: (data) => ({
      coolifyOverall: data.coolifyOverall ?? null,
      actionCount: data.actions?.length ?? 0,
      projects: data.projects?.map((project) => ({
        name: project.name,
        ahead: project.ahead,
        behind: project.behind,
        dirtyCount: project.dirtyCount,
        decision: project.decision,
        pushAllowed: project.pushAllowed,
        deployImpact: project.deployImpact,
      })) ?? [],
    }),
  },
  {
    name: "soarAcceptanceLedger",
    command: ["scripts/run-soar-acceptance-ledger.mjs"],
    summary: (data) => ({
      overall: data.overall ?? null,
      gitHead: data.gitHead ?? null,
      checks: data.checks?.map((check) => ({
        id: check.id,
        status: check.status,
        reason: check.reason,
      })) ?? [],
    }),
  },
  {
    name: "accessUnblockTaskSeeder",
    command: ["scripts/run-access-unblock-task-seeder.mjs", "--apply"],
    summary: (data) => ({
      plannedCount: data.plannedCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      applied: data.applied ?? [],
    }),
  },
  {
    name: "nextLegalActionSelector",
    command: ["scripts/run-next-legal-action-selector.mjs"],
    summary: (data) => ({
      decision: data.action?.decision ?? null,
      reason: data.action?.reason ?? null,
      command: data.action?.command ?? null,
      target: data.action?.target ?? null,
    }),
  },
  {
    name: "finalLiveRunJanitor",
    command: ["scripts/run-live-run-janitor.mjs", "--apply"],
    timeoutMs: liveRunJanitorStepTimeoutMs,
    summary: (data) => ({
      liveRunCount: data.liveRunCount ?? null,
      actionCount: data.actionCount ?? null,
      appliedCount: data.applied?.length ?? 0,
      skippedCount: data.skipped?.length ?? 0,
      skipped: data.skipped?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        skippedReason: action.skippedReason,
        ownerAction: action.ownerAction,
      })) ?? [],
      actions: data.actions?.map((action) => ({
        kind: action.kind,
        identifier: action.identifier,
        issueStatus: action.issueStatus,
      })) ?? [],
    }),
  },
  {
    name: "softwarehouseAudit",
    command: ["scripts/audit-luckysparrow-softwarehouse.mjs"],
    timeoutMs: softwarehouseAuditStepTimeoutMs,
    env: {
      SOFTWAREHOUSE_CONTROL_TICK_RUNNING: "1",
      SOFTWAREHOUSE_AUDIT_ENFORCE_WORKER_QUEUE: "1",
    },
    summary: (data) => ({
      overall: data.overall ?? null,
      activeRunCount: data.health?.activeRunCount ?? null,
      restartRequired: data.health?.restartRequired ?? null,
      autonomyState: data.autonomyPosture?.state ?? null,
      findings: data.findings?.map((finding) => ({
        severity: finding.severity,
        area: finding.area,
        message: finding.message,
      })) ?? [],
      unblockPacketStale: data.unblockPacketStatus?.stale ?? null,
    }),
  },
];

function parseJsonOutput(output, name) {
  const trimmed = output.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${name} did not emit parseable JSON: ${error.message}\n${trimmed.slice(0, 1000)}`);
  }
}

async function resolveControlTickCompanyEnv() {
  if (process.env.PAPERCLIP_COMPANY_ID) {
    return {
      PAPERCLIP_COMPANY_ID: process.env.PAPERCLIP_COMPANY_ID,
      PAPERCLIP_COMPANY_NAME: process.env.PAPERCLIP_COMPANY_NAME ?? process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "",
      SOFTWAREHOUSE_COMPANY_NAME: process.env.SOFTWAREHOUSE_COMPANY_NAME ?? process.env.PAPERCLIP_COMPANY_NAME ?? "",
    };
  }

  try {
    const response = await fetch(`${apiBase}/api/companies`);
    if (!response.ok) return {};
    const companies = await response.json();
    if (!Array.isArray(companies)) return {};
    const company = preferredCompanyNames
      .map((name) => companies.find((candidate) => candidate?.name === name))
      .find(Boolean)
      ?? companies.find((candidate) => candidate?.status === "active")
      ?? companies[0];
    if (!company?.id) return {};
    const resolvedName = company.name ?? preferredCompanyNames[0] ?? "";
    return {
      PAPERCLIP_COMPANY_ID: company.id,
      PAPERCLIP_COMPANY_NAME: resolvedName,
      SOFTWAREHOUSE_COMPANY_NAME: resolvedName,
    };
  } catch {
    return {};
  }
}

const controlTickCompanyEnv = await resolveControlTickCompanyEnv();

function runStep(step, options = {}) {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const timeoutMs = Math.max(1, Math.floor(options.timeoutMs ?? step.timeoutMs ?? defaultStepTimeoutMs));
  console.error(`[control-tick] step:start name=${step.name} timeoutMs=${timeoutMs} startedAt=${startedAt}`);
  const result = spawnSync(process.execPath, step.command, {
    cwd: process.cwd(),
    env: { ...process.env, ...controlTickCompanyEnv, ...(step.env ?? {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    maxBuffer: stepOutputMaxBufferBytes,
  });
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAtDate.getTime();
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.error?.code === "ETIMEDOUT") {
    console.error(`[control-tick] step:timeout name=${step.name} durationMs=${durationMs} timeoutMs=${timeoutMs}`);
    return {
      name: step.name,
      ok: false,
      startedAt,
      endedAt,
      durationMs,
      exitCode: null,
      timedOut: true,
      timeoutMs,
      stderr: `Step timed out after ${timeoutMs}ms; inspect ${step.command.join(" ")} before continuing.`,
      stdout: stdout.trim().slice(0, 2000),
    };
  }
  if (result.status !== 0) {
    console.error(`[control-tick] step:failed name=${step.name} durationMs=${durationMs} exitCode=${result.status ?? "unknown"}`);
    return {
      name: step.name,
      ok: false,
      startedAt,
      endedAt,
      durationMs,
      exitCode: result.status,
      timedOut: false,
      timeoutMs,
      stderr: stderr.trim(),
      stdout: stdout.trim().slice(0, 2000),
    };
  }

  const data = parseJsonOutput(stdout, step.name);
  console.error(`[control-tick] step:ok name=${step.name} durationMs=${durationMs}`);
  return {
    name: step.name,
    ok: true,
    startedAt,
    endedAt,
    durationMs,
    timeoutMs,
    summary: step.summary(data),
  };
}

function runStepWithNonFatalFallback(step, options = {}) {
  const primary = runStep(step, options);
  if (isNonFatalBlockedRootGuardrailTimeout(step.name, primary)) {
    return {
      name: step.name,
      ok: true,
      startedAt: primary.startedAt,
      endedAt: primary.endedAt,
      timeoutMs: primary.timeoutMs ?? null,
      degraded: true,
      degradedReason: "timeout",
      summary: {
        activeRunCount: null,
        findingCount: null,
        repairActionCount: 0,
        duplicateRootFindings: [],
        staleGateFindings: [],
        resolvedRootDependentsStillBlocked: [],
        timedOut: true,
        timeoutMs: primary.timeoutMs ?? null,
        timeoutMessage: primary.stderr ?? null,
      },
    };
  }
  if (isNonFatalSoftwarehouseAuditTimeout(step.name, primary)) {
    return {
      name: step.name,
      ok: true,
      startedAt: primary.startedAt,
      endedAt: primary.endedAt,
      timeoutMs: primary.timeoutMs ?? null,
      degraded: true,
      degradedReason: "timeout",
      summary: {
        overall: "warn",
        activeRunCount: null,
        restartRequired: null,
        autonomyState: null,
        findings: [],
        unblockPacketStale: null,
        timedOut: true,
        timeoutMs: primary.timeoutMs ?? null,
        timeoutMessage: primary.stderr ?? null,
      },
    };
  }
  if (isNonFatalLearningLoopTimeout(step.name, primary)) {
    return {
      name: step.name,
      ok: true,
      startedAt: primary.startedAt,
      endedAt: primary.endedAt,
      durationMs: primary.durationMs,
      timeoutMs: primary.timeoutMs ?? null,
      summary: {
        overall: "degraded_timeout",
        actionCount: 1,
        actions: [{
          action: "defer_learning_loop_timeout",
          status: "degraded",
          reason: "learning_loop_timeout",
          ownerAction: "Inspect scripts/run-softwarehouse-learning-loop.mjs performance, then rerun the learning loop explicitly before relying on new teaching output.",
        }],
      },
      timedOut: true,
      timeoutMessage: primary.stderr ?? null,
    };
  }
  const janitorApplyDenied = isNonFatalJanitorBoardCancelDenied(step.name, primary);
  const projectMutationGuardApplyDenied = isNonFatalProjectMutationGuardBoardCancelDenied(step.name, primary);
  const janitorBulkRefused = isNonFatalJanitorBulkRefusal(step.name, primary);
  if (primary.ok || (!janitorBulkRefused && !janitorApplyDenied && !projectMutationGuardApplyDenied)) return primary;

  const dryRunStep = {
    ...step,
    command: dryRunCommandFor(step.command),
  };
  const fallback = runStep(dryRunStep, options);
  if (!fallback.ok) return primary;
  return {
    ...fallback,
    startedAt: primary.startedAt,
    applyDeferred: true,
    deferredReason: janitorApplyDenied
      ? "janitor_cancel_requires_board_access"
      : projectMutationGuardApplyDenied
        ? "project_mutation_guard_cancel_requires_board_access"
        : "janitor_bulk_action_limit",
    deferredExitCode: primary.exitCode ?? null,
    deferredStderr: primary.stderr ?? "",
  };
}

const postureRank = new Map([
  ["control_tick_failed", 100],
  ["operating_system_closure_required", 95],
  ["cleanup_tail_only", 90],
  ["cleanup_self_supervision_only", 90],
  ["runtime_binding_repair_allowed", 83],
  ["project_source_control_closure_allowed", 80],
  ["project_repo_mutation_blocked_monitoring_allowed", 78],
  ["one_gate_recheck_allowed", 75],
  ["known_gate_hold_no_evidence_cooldown", 70],
  ["known_gate_hold_cooldown", 65],
  ["blocked_triage_allowed", 60],
  ["safe_nonproduction_lane_allowed", 55],
  ["supervise_active_work", 50],
  ["review_closure_allowed", 45],
  ["runnable_work_allowed", 40],
  ["supervision_ready_limited_delivery", 35],
  ["two_project_delivery_ready", 30],
  ["monitoring_only", 20],
  ["supervision_not_ready", 10],
]);

function stricterPosture(left, right) {
  if (!left) return right ?? null;
  if (!right) return left;
  return (postureRank.get(left) ?? 0) >= (postureRank.get(right) ?? 0)
    ? left
    : right;
}

function resolveEffectivePosture(governorPosture, readinessPosture, activeRunCount) {
  if (
    activeRunCount === 0
    && governorPosture === "one_gate_recheck_allowed"
    && readinessPosture === "project_repo_mutation_blocked_monitoring_allowed"
  ) {
    return "one_gate_recheck_allowed";
  }
  if (
    activeRunCount === 0
    && governorPosture === "runnable_work_allowed"
    && readinessPosture === "project_repo_mutation_blocked_monitoring_allowed"
  ) {
    return "runnable_work_allowed";
  }
  if (
    activeRunCount === 0
    && governorPosture === "assignment_required"
    && readinessPosture === "project_repo_mutation_blocked_monitoring_allowed"
  ) {
    return "assignment_required";
  }
  return stricterPosture(governorPosture, readinessPosture);
}

function posturesAreConsistent({ governorPosture, readinessPosture, activeWorkOverlay, gateRecheckOverlay }) {
  const readinessHasNoBlockingConstraint =
    readinessPosture === "two_project_delivery_ready"
    || readinessPosture === "supervision_ready_limited_delivery";
  const readinessIsStricterGateHold =
    (
      governorPosture === "blocked_triage_allowed"
      || governorPosture === "monitoring_only"
      || governorPosture === "assignment_required"
      || governorPosture === "runnable_work_allowed"
      || governorPosture === "review_closure_allowed"
    )
    && readinessPosture === "project_repo_mutation_blocked_monitoring_allowed";
  const readinessIsStricterSourceControlClosure =
    (
      governorPosture === "blocked_triage_allowed"
      || governorPosture === "monitoring_only"
      || governorPosture === "assignment_required"
      || governorPosture === "runnable_work_allowed"
      || governorPosture === "review_closure_allowed"
      || governorPosture === "safe_nonproduction_lane_allowed"
    )
    && readinessPosture === "project_source_control_closure_allowed";
  return !governorPosture
    || !readinessPosture
    || governorPosture === readinessPosture
    || activeWorkOverlay
    || gateRecheckOverlay
    || readinessHasNoBlockingConstraint
    || readinessIsStricterGateHold
    || readinessIsStricterSourceControlClosure;
}

function nextControlActionsFor({
  controlDecision,
  effectiveOperatingPosture,
  allowedWhileBlocked,
  forbiddenWhileBlocked,
  requiredBeforeFullDelivery,
  gateHandoffs,
  sourceControlGateIssues,
  sourceControlRepos,
  safeArchitecturePlanning,
  activeRunCount,
}) {
  const staleGateOwnerActions = () => gateHandoffs
    .filter((gate) => gate.status === "blocked" && !gate.fresh)
    .map((gate) => gateBriefFor(gate))
    .filter((brief) => brief.stale)
    .map(staleGateOwnerActionLine);

  if (controlDecision === "control_tick_failed") {
    return ["Fix the failed control tick step before starting or resuming agent work."];
  }
  if (effectiveOperatingPosture === "runtime_binding_repair_allowed") {
    return ["Run the runtime-binding assignee repair dry-run, then apply exactly one clear owner repair if no live runs are active."];
  }
  if (effectiveOperatingPosture === "operating_system_closure_required") {
    return [
      ...(activeRunCount > 0 ? ["Supervise active runs and do not start duplicate work."] : []),
      "Verify and commit/classify Paperclip OS changes before broad delivery.",
      ...staleGateOwnerActions(),
    ];
  }
  if ([
    "project_repo_mutation_blocked_monitoring_allowed",
    "supervision_ready_limited_delivery",
    "blocked_triage_allowed",
    "project_truth_repair_allowed",
  ].includes(effectiveOperatingPosture)) {
    const dirtyProjects = sourceControlRepos
      .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true)
      .map((repo) => `${repo.name} has ${repo.dirtyCount ?? "unknown"} uncommitted change(s)`);
    const dirtyGroupLines = sourceControlRepos
      .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true)
      .flatMap((repo) => (repo.dirtyGroups ?? []).map((group) =>
        `Source-control group: ${repo.name}/${group.group} has ${group.count} change(s)`
      ));
    const latestEvidenceByRoot = new Map((gateHandoffs ?? []).map((gate) => [gate.rootBlocker, gate.latestEvidence ?? null]));
    const sourceControlGateLines = (sourceControlGateIssues ?? []).slice(0, 3).map((issue) => {
      const latest = issue.rootBlocker ? latestEvidenceByRoot.get(issue.rootBlocker) : null;
      return `Source-control gate: ${issue.identifier} is ${issue.status}${issue.rootBlocker ? ` via ${issue.rootBlocker}` : ""} (${issue.title})${latest?.summary ? `; latest=${latest.summary}` : ""}`;
    });
    const infrastructureGateActions = (gateHandoffs ?? [])
      .filter((gate) => gate.status === "blocked" && !gate.fresh)
      .filter((gate) => {
        const summary = String(gate.latestEvidence?.summary ?? "").toLowerCase();
        if (/canonical public .*pass|remaining protected gate|auth\/permission/.test(summary)) return false;
        const latest = [
          gate.latestEvidence?.summary,
          ...(gate.latestEvidence?.failureSignals ?? []),
          ...(gate.latestEvidence?.contextSignals ?? []),
        ].join(" ").toLowerCase();
        return /\b(fetch failed|dns|name resolution|tcptestsucceeded=false|enotfound|getaddrinfo|proxy|coolify|gateway|502|503|504)\b/.test(latest);
      })
      .map((gate) =>
        `Seed infrastructure gate diagnosis lane for ${gate.project} ${gate.rootBlocker}: latest evidence indicates DNS/network/proxy failure, so Ops must diagnose domain, TLS/proxy, Coolify routing, and endpoint reachability without project repo mutation, deploy, restart, push, protected account mutation, or secret disclosure.`
      );
    const sourceControlClassificationActions = sourceControlRepos
      .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true)
      .flatMap((repo) => (repo.sourceControlClosureLanes ?? []).map((lane) =>
        `Classify ${repo.name} source-control ${lane.group} lane only: ${lane.action} Evidence required: ${lane.evidenceRequired}. Policy: ${lane.gatePolicy ?? "no project mutation, push, deploy, restart, or protected smoke without fresh gate fact"}.`
      ));
    const safeArchitectureAction = (safeArchitecturePlanning?.actions ?? [])
      .find((action) => action.action === "would_create_architecture_planning_lane");
    const safeArchitectureNoop = (safeArchitecturePlanning?.actions ?? [])
      .find((action) => String(action.action ?? "").startsWith("noop_"));
    return [
      "Refresh control tick, source-control packet, and unblock packet.",
      activeRunCount > 0
        ? "Supervise live runs and stale board state; do not duplicate blocked lanes."
        : "Confirm no live runs are active before considering allowed gate-hold actions.",
      ...(safeArchitectureAction ? [
        "Seed safe architecture planning lane from Soar architecture docs into Paperclip backlog only; no project repo mutation, commit, push, deploy, restart, protected smoke, or secret access.",
      ] : safeArchitectureNoop ? [
        `Safe architecture planning lane not currently seedable: ${safeArchitectureNoop.action}${safeArchitectureNoop.identifier ? ` (${safeArchitectureNoop.identifier})` : ""}.`,
      ] : []),
      ...infrastructureGateActions,
      ...sourceControlClassificationActions,
      "Wait for a fresh operator/credential fact before project repo mutation, commit, push, deploy, or restart.",
      ...sourceControlGateLines,
      ...staleGateOwnerActions(),
      ...gateHandoffs
        .filter((gate) => gate.status === "blocked" && !gate.fresh)
        .map((gate) =>
          `Gate fact needed: ${gate.project} ${gate.rootBlocker} (${gate.owner}) - ${gate.evidenceRequired}; operator=${gate.operatorPrompt ?? "see unblock packet"}; latest=${gate.latestEvidence?.summary ?? gate.latestEvidence?.status ?? "none"}`
        ),
      ...dirtyProjects,
      ...dirtyGroupLines,
      ...requiredBeforeFullDelivery.map((item) => `Full delivery blocker: ${item}`),
    ];
  }
  if (effectiveOperatingPosture === "assignment_required") {
    return [
      "Refresh control tick, source-control packet, and unblock packet.",
      "Assign exactly one controlled-project runnable backlog issue to the correct project manager before waking work.",
      "Do not mutate project repos, push, deploy, restart, run protected smoke, or disclose secrets while protected gates remain blocked.",
    ];
  }
  if (effectiveOperatingPosture === "project_source_control_closure_allowed") {
    const sourceControlActions = sourceControlRepos
      .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true)
      .flatMap((repo) => (repo.sourceControlClosureLanes ?? []).map((lane) =>
        `Classify and close ${repo.name} source-control ${lane.group} lane: ${lane.action} Evidence required: ${lane.evidenceRequired}. Allowed: local diff review, local validation, commit/no-commit decision. Forbidden: push, deploy, restart, protected smoke, secret disclosure.`
      ));
    const blockedGateLines = (gateHandoffs ?? [])
      .filter((gate) => gate.status === "blocked" && !gate.fresh)
      .map((gate) =>
        `Protected gate still blocked: ${gate.project} ${gate.rootBlocker} (${gate.owner}) - ${gate.evidenceRequired}; this blocks production/protected smoke, not local source-control closure.`
      );
    return [
      "Refresh control tick, source-control packet, and unblock packet.",
      activeRunCount > 0
        ? "Supervise live runs and do not duplicate source-control closure."
        : "Route one source-control closure lane to the owning PM/CTO with local validation and commit/no-commit evidence.",
      ...sourceControlActions,
      ...staleGateOwnerActions(),
      ...blockedGateLines,
      ...requiredBeforeFullDelivery.map((item) => `Full delivery blocker: ${item}`),
    ];
  }
  if (effectiveOperatingPosture === "one_gate_recheck_allowed") {
    return ["Run the gate watcher dry-run, then apply responsible gate recheck lanes only for idle target assignees; keep protected scope read-only and per gate."];
  }
  if (effectiveOperatingPosture === "runnable_work_allowed") {
    const protectedGateLines = (gateHandoffs ?? [])
      .filter((gate) => gate.status === "blocked" && !gate.fresh)
      .map((gate) =>
        `Protected gate still blocked: ${gate.project} ${gate.rootBlocker} (${gate.owner}) blocks push, deploy, restart, and protected smoke; it does not block local repair, local validation, or local commit evidence.`
      );
    return [
      "Start or assign the highest-priority runnable issue with one owner, one scope, and one evidence contract.",
      "Require local validation before any commit; do not push, deploy, restart, run protected smoke, or disclose secrets.",
      ...staleGateOwnerActions(),
      ...protectedGateLines,
    ];
  }
  if (effectiveOperatingPosture === "supervise_active_work") {
    return ["Supervise active runs and avoid duplicate work in the same lane."];
  }
  return [
    "Follow recommendedAction and obey allowed/forbidden action lists.",
    ...allowedWhileBlocked.map((item) => `Allowed: ${item}`),
    ...forbiddenWhileBlocked.map((item) => `Forbidden: ${item}`),
  ];
}

function nextControlActionStatusFor(actions) {
  const normalized = actions.map((action) => action.trim()).filter(Boolean);
  const duplicateActions = normalized.filter((action, index) => normalized.indexOf(action) !== index);
  return {
    count: normalized.length,
    empty: normalized.length === 0,
    duplicateActions: [...new Set(duplicateActions)],
  };
}

function operatorActionPacketFor({ gateHandoffs, protectedDeliveryBlockers, sourceControlGateIssues, sourceControlRepos, requiredBeforeFullDelivery }) {
  const blockedGateByRoot = new Map(
    mergeProtectedDeliveryGates({ gateHandoffs, protectedDeliveryBlockers })
      .filter((gate) => gate.status === "blocked" && !gate.fresh)
      .map((gate) => [gate.rootBlocker, gate]),
  );
  const blockedGates = [...blockedGateByRoot.values()];
  const gateEvidenceByRoot = new Map((gateHandoffs ?? []).map((gate) => [gate.rootBlocker, gate.latestEvidence ?? null]));
  const dirtyProjects = (sourceControlRepos ?? [])
    .filter((repo) => repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true)
    .map((repo) => ({
      project: repo.name,
      dirtyCount: repo.dirtyCount ?? null,
      dirtyGroups: repo.dirtyGroups ?? [],
      sourceControlClosureLanes: repo.sourceControlClosureLanes ?? [],
    }));

  return {
    status: operatorActionStatusFor({
      blockedGateCount: blockedGates.length,
      dirtyProjectCount: dirtyProjects.length,
    }),
    blockedGates: blockedGates.map((gate) => ({
      project: gate.project,
      rootBlocker: gate.rootBlocker,
      owner: gate.owner,
      evidenceRequired: gate.evidenceRequired,
      acceptedFreshFacts: gate.acceptedFreshFacts ?? [],
      operatorPrompt: gate.operatorPrompt ?? null,
      approvalDryRunCommand: gate.approvalDryRunCommand ?? null,
      approvalApplyCommand: gate.approvalApplyCommand ?? null,
      recheckHandoff: gate.recheckHandoff ?? null,
      latestEvidence: gate.latestEvidence ?? null,
    })),
    sourceControlGates: (sourceControlGateIssues ?? []).map((issue) => ({
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      updatedAt: issue.updatedAt ?? null,
      rootBlocker: issue.rootBlocker ?? null,
      blockerAttention: issue.blockerAttention ?? null,
      terminalBlockerLatestEvidence: issue.rootBlocker ? gateEvidenceByRoot.get(issue.rootBlocker) ?? null : null,
    })),
    dirtyProjects,
    requiredBeforeFullDelivery: requiredBeforeFullDelivery ?? [],
  };
}

function controlBriefFor({
  controlDecision,
  effectiveOperatingPosture,
  recommendedAction,
  operatorActionPacket,
  nextControlActions,
  allowedWhileBlocked,
  forbiddenWhileBlocked,
  requiredBeforeFullDelivery,
  activeRunCount,
  liveRunCount,
}) {
  const blockedGates = operatorActionPacket?.blockedGates ?? [];
  const dirtyProjects = operatorActionPacket?.dirtyProjects ?? [];
  const gateBriefs = blockedGates.map((gate) => gateBriefFor(gate));
  const staleGateBriefs = gateBriefs.filter((gate) => gate.stale);
  const mode = effectiveOperatingPosture === "operating_system_closure_required"
    ? "operating_system_closure"
    : effectiveOperatingPosture === "project_source_control_closure_allowed"
      ? "source_control_closure"
      : effectiveOperatingPosture === "project_repo_mutation_blocked_monitoring_allowed"
        ? "wait_for_gate_fact"
      : effectiveOperatingPosture === "assignment_required"
        ? "assignment_required"
      : effectiveOperatingPosture === "supervise_active_work"
        ? "supervise_live_work"
      : effectiveOperatingPosture === "runnable_work_allowed"
        ? "local_repair_lane"
      : controlDecision === "operating_source_control_closure_needed"
    ? "operating_system_closure"
    : controlDecision === "supervise_active_runs"
      ? "supervise_live_work"
      : controlDecision === "runnable_work_assignment_needed"
        ? "assignment_required"
      : dirtyProjects.length > 0 && controlDecision === "project_source_control_closure_needed"
        ? "source_control_closure"
        : ["runnable_work_available", "blocked_needs_triage"].includes(controlDecision) && blockedGates.length > 0
          ? "local_repair_lane"
        : blockedGates.length > 0
          ? "wait_for_gate_fact"
          : dirtyProjects.length > 0
            ? "source_control_closure"
            : "ready_for_next_lane";
  const headline = mode === "operating_system_closure"
    ? "Paperclip OS has uncommitted changes; verify and close them before broad delivery."
    : mode === "supervise_live_work"
    ? "Live work is active; supervise it and do not duplicate its lane."
    : mode === "assignment_required"
      ? "Runnable backlog exists, but it needs one explicit owner before agents can work safely."
    : mode === "wait_for_gate_fact"
      ? "Project delivery is blocked by protected gates; wait for one accepted fresh fact before mutation."
      : mode === "local_repair_lane"
        ? "Protected gates block production actions, but local repair lanes may proceed with validation and local commits."
      : mode === "source_control_closure"
        ? "Project source-control closure is required; protected gates still block deploy/protected smoke, not local closure."
        : "No protected gate blocks the next lane; choose one owner, one scope, and one evidence contract.";
  const deliveryPermission = deliveryPermissionForMode(mode, blockedGates.length);

  return {
    mode,
    autonomyDisposition: autonomyDispositionForMode(mode),
    headline,
    decision: controlDecision,
    deliveryPermission,
    primaryNextAction: nextControlActions[0] ?? recommendedAction ?? null,
    blockedGateCount: blockedGates.length,
    staleBlockedGateCount: staleGateBriefs.length,
    dirtyProjectCount: dirtyProjects.length,
    blockedGates: gateBriefs,
    staleBlockedGates: staleGateBriefs,
    dirtyProjects: dirtyProjects.map((project) => ({
      project: project.project,
      dirtyCount: project.dirtyCount ?? null,
      groups: (project.dirtyGroups ?? []).map((group) => `${group.group}:${group.count}`),
    })),
    allowed: allowedWhileBlocked ?? [],
    forbidden: forbiddenWhileBlocked ?? [],
    requiredBeforeFullDelivery: requiredBeforeFullDelivery ?? [],
  };
}

function markdownList(items) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- none";
}

function markdownTable(rows) {
  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${String(value ?? "null").replace(/\|/g, "\\|")} |`),
  ].join("\n");
}

function renderControlTickMarkdown(output) {
  return [
    "# Softwarehouse Control Tick",
    "",
    "Runtime-only handoff generated by `pnpm softwarehouse:control-tick`.",
    "",
    markdownTable([
      ["generatedAt", output.generatedAt],
      ["ok", output.ok],
      ["controlDecision", output.controlDecision],
      ["auditOverall", output.auditOverall],
      ["effectiveOperatingPosture", output.effectiveOperatingPosture],
      ["postureConsistent", output.postureConsistent],
      ["activeRunCount", output.activeRunCount],
      ["liveRunCount", output.liveRunCount],
      ["sourceControlClean", output.sourceControlClean],
      ["runtimeBindingRepairActionCount", output.runtimeBindingRepairActionCount],
      ["recoveryActionJanitorActionCount", output.recoveryActionJanitorActionCount],
      ["nextControlActionStatus.count", output.nextControlActionStatus?.count],
      ["nextControlActionStatus.empty", output.nextControlActionStatus?.empty],
      ["controlActionSummary.allowedActionCount", output.controlActionSummary?.allowedActionCount],
      ["controlActionSummary.contextOrGuardrailCount", output.controlActionSummary?.contextOrGuardrailCount],
    ]),
    "",
    "## Recommended Action",
    "",
    output.recommendedAction ?? "No recommendation emitted.",
    "",
    "## Control Brief",
    "",
    markdownTable([
      ["mode", output.controlBrief?.mode],
      ["autonomyDisposition", output.controlBrief?.autonomyDisposition],
      ["headline", output.controlBrief?.headline],
      ["protectedDeliveryAllowed", output.controlBrief?.deliveryPermission?.protectedDeliveryAllowed],
      ["projectRepoMutationAllowed", output.controlBrief?.deliveryPermission?.projectRepoMutationAllowed],
      ["canStartNewLane", output.controlBrief?.deliveryPermission?.canStartNewLane],
      ["allowedLaneTypes", output.controlBrief?.deliveryPermission?.allowedLaneTypes?.join(", ")],
      ["deliveryPermissionReason", output.controlBrief?.deliveryPermission?.reason],
      ["primaryNextAction", output.controlBrief?.primaryNextAction],
      ["blockedGateCount", output.controlBrief?.blockedGateCount],
      ["staleBlockedGateCount", output.controlBrief?.staleBlockedGateCount],
      ["dirtyProjectCount", output.controlBrief?.dirtyProjectCount],
    ]),
    "",
    "### Brief Blocked Gates",
    "",
    markdownList((output.controlBrief?.blockedGates ?? []).map((gate) =>
      `${gate.project} ${gate.rootBlocker} (${gate.owner}): latest=${gate.latestEvidence}; ageHours=${gate.waitAgeHours ?? "unknown"}; stale=${gate.stale}; ownerAction=${gate.ownerAction}; operator=${gate.operatorPrompt ?? "see unblock packet"}`
    )),
    "",
    "### Stale Gate Owner Actions",
    "",
    markdownList((output.controlBrief?.staleBlockedGates ?? []).map((gate) =>
      `${gate.project} ${gate.rootBlocker}: ${gate.ownerAction}`
    )),
    "",
    "## Operator Action Packet",
    "",
    markdownTable([
      ["status", output.operatorActionPacket?.status],
      ["blockedGates", output.operatorActionPacket?.blockedGates?.length ?? 0],
      ["sourceControlGates", output.operatorActionPacket?.sourceControlGates?.length ?? 0],
      ["dirtyProjects", output.operatorActionPacket?.dirtyProjects?.length ?? 0],
      ["closureLanes", (output.operatorActionPacket?.dirtyProjects ?? []).reduce((count, project) => count + (project.sourceControlClosureLanes?.length ?? 0), 0)],
    ]),
    "",
    "### Blocked Gates",
    "",
    markdownList((output.operatorActionPacket?.blockedGates ?? []).map((gate) =>
      `${gate.project} ${gate.rootBlocker} (${gate.owner}): ${gate.evidenceRequired}; operator=${gate.operatorPrompt ?? "see unblock packet"}; dryRun=${gate.approvalDryRunCommand ?? "n/a"}; apply=${gate.approvalApplyCommand ?? "n/a"}; latest=${gate.latestEvidence?.summary ?? gate.latestEvidence?.status ?? "none"}`
    )),
    "",
    "### Source-Control Closure Lanes",
    "",
    markdownList((output.operatorActionPacket?.dirtyProjects ?? []).flatMap((project) =>
      (project.sourceControlClosureLanes ?? []).map((lane) =>
        `${project.project}/${lane.group}: ${lane.owner} - ${lane.evidenceRequired}`
      )
    )),
    "",
    "## Next Control Actions",
    "",
    markdownList(output.nextControlActions ?? []),
    "",
    "### Next Control Action Classification",
    "",
    markdownList((output.controlActionSummary?.actions ?? []).map((item) =>
      `${item.type}${item.allowedByDeliveryPermission ? " allowed" : " context"}: ${item.action}`
    )),
    "",
    "## Runtime-Binding Assignee Repair",
    "",
    markdownList((output.runtimeBindingRepairActions ?? []).map((action) =>
      `${action.type}: ${action.identifier} ${action.fromAgentName ?? ""}${action.toAgentName ? ` -> ${action.toAgentName}` : ""}`
    )),
    "",
    "## Recovery Action Janitor",
    "",
    markdownList((output.recoveryActionJanitorActions ?? []).map((action) =>
      `${action.action}: ${action.issueIdentifier} ${action.issueStatus}; root=${action.rootBlocker ?? "unknown"}; reason=${action.reason ?? "n/a"}`
    )),
    "",
    "## Allowed While Blocked",
    "",
    markdownList(output.allowedWhileBlocked ?? []),
    "",
    "## Forbidden While Blocked",
    "",
    markdownList(output.forbiddenWhileBlocked ?? []),
    "",
    "## Required Before Full Delivery",
    "",
    markdownList(output.requiredBeforeFullDelivery ?? []),
    "",
    "## Source-Control Gates",
    "",
    (output.sourceControlGateIssues ?? []).length > 0
      ? [
        "| Issue | Status | Root Blocker | Latest Root Evidence | Title | Updated At |",
        "| --- | --- | --- | --- | --- | --- |",
        ...(output.sourceControlGateIssues ?? []).map((issue) =>
          `| ${issue.identifier} | ${issue.status} | ${issue.rootBlocker ?? ""} | ${String(issue.terminalBlockerLatestEvidence?.summary ?? "").replace(/\|/g, "\\|")} | ${String(issue.title ?? "").replace(/\|/g, "\\|")} | ${issue.updatedAt ?? ""} |`
        ),
      ].join("\n")
      : "none",
    "",
    "## Source Control Repositories",
    "",
    [
      "| Repository | Clean | Dirty Count | Dirty Groups | Branch | Head |",
      "| --- | --- | ---: | --- | --- | --- |",
      ...(output.sourceControlRepos ?? []).map((repo) =>
        `| ${repo.name} | ${repo.clean} | ${repo.dirtyCount ?? 0} | ${(repo.dirtyGroups ?? []).map((group) => `${group.group}:${group.count}`).join(", ")} | ${repo.branch ?? ""} | ${repo.head ?? ""} |`
      ),
    ].join("\n"),
    "",
    "## Architecture Awareness Lifecycle",
    "",
    [
      "| Project | Exists | Action | Missing Exports | Stale Exports | Oldest Export |",
      "| --- | --- | --- | ---: | ---: | --- |",
      ...((output.architectureAwarenessLifecycle?.projects ?? []).map((project) =>
        `| ${project.name} | ${project.exists} | ${project.action} | ${(project.missingExports ?? []).length} | ${(project.staleExports ?? []).length} | ${project.oldestExportUpdatedAt ?? ""} |`
      )),
    ].join("\n"),
    "",
    "## Project Truth Audit",
    "",
    markdownTable([
      ["projects", output.projectTruthAudit?.projectNames?.join(", ")],
      ["projectsWithGaps", output.projectTruthAudit?.projectsWithGaps],
      ["totalGaps", output.projectTruthAudit?.totalGaps],
      ["incompleteEventChains", output.projectTruthAudit?.incompleteEventChains],
      ["criticalRuntimeFindings", output.projectTruthAudit?.criticalRuntimeFindings],
    ]),
    "",
    "### Project Truth By Project",
    "",
    [
      "| Project | OK | Public Probe | Truth Status | Gaps | First Gap |",
      "| --- | --- | --- | --- | ---: | --- |",
      ...((output.projectTruthAudit?.projects ?? []).map((project) =>
        `| ${project.name} | ${project.ok} | ${project.publicProbeStatus ?? ""} | ${project.projectTruthStatus ?? ""} | ${project.totalGaps ?? 0} | ${String(project.firstGap?.summary ?? "").replace(/\|/g, "\\|")} |`
      )),
    ].join("\n"),
    "",
    "### First Truth Gap",
    "",
    output.projectTruthAudit?.firstGap
      ? markdownList([
        `${output.projectTruthAudit.firstGap.severity}: ${output.projectTruthAudit.firstGap.summary}`,
        `Owner: ${output.projectTruthAudit.firstGap.nextOwner}`,
        `Next action: ${output.projectTruthAudit.firstGap.nextAction}`,
      ])
      : "- none",
    "",
  ].join("\n");
}

function readinessSnapshotFor(output) {
  const softwarehouseAudit = output.steps?.find((step) => step.name === "softwarehouseAudit")?.summary ?? {};
  return {
    generatedAt: new Date().toISOString(),
    sourceControlTickGeneratedAt: output.generatedAt ?? null,
    ok: output.ok ?? null,
    auditOverall: output.auditOverall ?? null,
    controlDecision: output.controlDecision ?? null,
    effectiveOperatingPosture: output.effectiveOperatingPosture ?? null,
    supervisionReady: output.supervisionReady ?? null,
    twoProjectFullDeliveryReady: output.twoProjectFullDeliveryReady ?? null,
    activeRunCount: output.activeRunCount ?? null,
    liveRunCount: output.liveRunCount ?? null,
    restartRequired: softwarehouseAudit.restartRequired ?? null,
    operatorActionStatus: output.operatorActionPacket?.status ?? null,
    runtimeBindingRepairActionCount: output.runtimeBindingRepairActionCount ?? null,
    runtimeBindingRepairActions: output.runtimeBindingRepairActions ?? [],
    recoveryActionJanitorActionCount: output.recoveryActionJanitorActionCount ?? null,
    recoveryActionJanitorActions: output.recoveryActionJanitorActions ?? [],
    controlBrief: output.controlBrief ?? null,
    recommendedAction: output.recommendedAction ?? null,
    blockedGates: (output.operatorActionPacket?.blockedGates ?? []).map((gate) => ({
      project: gate.project,
      rootBlocker: gate.rootBlocker,
      owner: gate.owner,
      evidenceRequired: gate.evidenceRequired,
      operatorPrompt: gate.operatorPrompt ?? null,
      approvalDryRunCommand: gate.approvalDryRunCommand ?? null,
      approvalApplyCommand: gate.approvalApplyCommand ?? null,
      recheckHandoff: gate.recheckHandoff ?? null,
      latestEvidence: gate.latestEvidence ?? null,
    })),
    sourceControlGates: (output.operatorActionPacket?.sourceControlGates ?? []).map((gate) => ({
      identifier: gate.identifier,
      status: gate.status,
      title: gate.title,
      rootBlocker: gate.rootBlocker ?? null,
      terminalBlockerLatestEvidence: gate.terminalBlockerLatestEvidence ?? null,
    })),
    dirtyProjects: (output.operatorActionPacket?.dirtyProjects ?? []).map((project) => ({
      project: project.project,
      dirtyCount: project.dirtyCount ?? 0,
      groups: (project.dirtyGroups ?? []).map((group) => `${group.group}:${group.count}`),
      sourceControlClosureLanes: project.sourceControlClosureLanes ?? [],
    })),
    allowedWhileBlocked: output.allowedWhileBlocked ?? [],
    forbiddenWhileBlocked: output.forbiddenWhileBlocked ?? [],
    requiredBeforeFullDelivery: output.requiredBeforeFullDelivery ?? [],
    nextControlActions: output.nextControlActions ?? [],
    controlActionSummary: output.controlActionSummary ?? null,
    projectTruthAudit: output.projectTruthAudit ?? null,
  };
}

function renderReadinessSnapshotMarkdown(snapshot) {
  return [
    "# Softwarehouse Readiness Snapshot",
    "",
    "Runtime-only summary generated by `pnpm softwarehouse:control-tick`.",
    "",
    markdownTable([
      ["generatedAt", snapshot.generatedAt],
      ["controlTickGeneratedAt", snapshot.sourceControlTickGeneratedAt],
      ["ok", snapshot.ok],
      ["auditOverall", snapshot.auditOverall],
      ["controlDecision", snapshot.controlDecision],
      ["effectiveOperatingPosture", snapshot.effectiveOperatingPosture],
      ["operatorActionStatus", snapshot.operatorActionStatus],
      ["supervisionReady", snapshot.supervisionReady],
      ["twoProjectFullDeliveryReady", snapshot.twoProjectFullDeliveryReady],
      ["activeRunCount", snapshot.activeRunCount],
      ["liveRunCount", snapshot.liveRunCount],
      ["restartRequired", snapshot.restartRequired],
      ["runtimeBindingRepairActionCount", snapshot.runtimeBindingRepairActionCount],
      ["recoveryActionJanitorActionCount", snapshot.recoveryActionJanitorActionCount],
    ]),
    "",
    "## Recommended Action",
    "",
    snapshot.recommendedAction ?? "none",
    "",
    "## Control Brief",
    "",
    markdownTable([
      ["mode", snapshot.controlBrief?.mode],
      ["autonomyDisposition", snapshot.controlBrief?.autonomyDisposition],
      ["headline", snapshot.controlBrief?.headline],
      ["protectedDeliveryAllowed", snapshot.controlBrief?.deliveryPermission?.protectedDeliveryAllowed],
      ["projectRepoMutationAllowed", snapshot.controlBrief?.deliveryPermission?.projectRepoMutationAllowed],
      ["canStartNewLane", snapshot.controlBrief?.deliveryPermission?.canStartNewLane],
      ["allowedLaneTypes", snapshot.controlBrief?.deliveryPermission?.allowedLaneTypes?.join(", ")],
      ["deliveryPermissionReason", snapshot.controlBrief?.deliveryPermission?.reason],
      ["primaryNextAction", snapshot.controlBrief?.primaryNextAction],
      ["blockedGateCount", snapshot.controlBrief?.blockedGateCount],
      ["staleBlockedGateCount", snapshot.controlBrief?.staleBlockedGateCount],
      ["dirtyProjectCount", snapshot.controlBrief?.dirtyProjectCount],
    ]),
    "",
    "## Runtime-Binding Assignee Repair",
    "",
    markdownList((snapshot.runtimeBindingRepairActions ?? []).map((action) =>
      `${action.type}: ${action.identifier} ${action.fromAgentName ?? ""}${action.toAgentName ? ` -> ${action.toAgentName}` : ""}`
    )),
    "",
    "## Stale Gate Owner Actions",
    "",
    markdownList((snapshot.controlBrief?.staleBlockedGates ?? []).map((gate) =>
      `${gate.project} ${gate.rootBlocker}: ${gate.ownerAction}`
    )),
    "",
    "## Recovery Action Janitor",
    "",
    markdownList((snapshot.recoveryActionJanitorActions ?? []).map((action) =>
      `${action.action}: ${action.issueIdentifier} ${action.issueStatus}; root=${action.rootBlocker ?? "unknown"}; reason=${action.reason ?? "n/a"}`
    )),
    "",
    "## Blocked Gates",
    "",
    markdownList(snapshot.blockedGates.map((gate) =>
      `${gate.project} ${gate.rootBlocker} (${gate.owner}): ${gate.evidenceRequired}; operator=${gate.operatorPrompt ?? "see unblock packet"}; dryRun=${gate.approvalDryRunCommand ?? "n/a"}; apply=${gate.approvalApplyCommand ?? "n/a"}; latest=${gate.latestEvidence?.summary ?? gate.latestEvidence?.status ?? "none"}`
    )),
    "",
    "## Source-Control Gates",
    "",
    markdownList(snapshot.sourceControlGates.map((gate) =>
      `${gate.identifier} ${gate.status}${gate.rootBlocker ? ` via ${gate.rootBlocker}` : ""}: ${gate.title}${gate.terminalBlockerLatestEvidence?.summary ? `; latest=${gate.terminalBlockerLatestEvidence.summary}` : ""}`
    )),
    "",
    "## Dirty Projects",
    "",
    markdownList(snapshot.dirtyProjects.map((project) =>
      `${project.project}: ${project.dirtyCount} change(s); ${project.groups.join(", ")}`
    )),
    "",
    "## Source-Control Closure Lanes",
    "",
    markdownList(snapshot.dirtyProjects.flatMap((project) =>
      (project.sourceControlClosureLanes ?? []).map((lane) =>
        `${project.project}/${lane.group}: ${lane.owner} - ${lane.evidenceRequired}`
      )
    )),
    "",
    "## Required Before Full Delivery",
    "",
    markdownList(snapshot.requiredBeforeFullDelivery),
    "",
    "## Project Truth Audit",
    "",
    markdownTable([
      ["projects", snapshot.projectTruthAudit?.projectNames?.join(", ")],
      ["projectsWithGaps", snapshot.projectTruthAudit?.projectsWithGaps],
      ["totalGaps", snapshot.projectTruthAudit?.totalGaps],
      ["incompleteEventChains", snapshot.projectTruthAudit?.incompleteEventChains],
      ["criticalRuntimeFindings", snapshot.projectTruthAudit?.criticalRuntimeFindings],
    ]),
    "",
    "### First Truth Gap",
    "",
    snapshot.projectTruthAudit?.firstGap
      ? markdownList([
        `${snapshot.projectTruthAudit.firstGap.severity}: ${snapshot.projectTruthAudit.firstGap.summary}`,
        `Owner: ${snapshot.projectTruthAudit.firstGap.nextOwner}`,
        `Next action: ${snapshot.projectTruthAudit.firstGap.nextAction}`,
      ])
      : "- none",
    "",
    "## Allowed While Blocked",
    "",
    markdownList(snapshot.allowedWhileBlocked),
    "",
    "## Forbidden While Blocked",
    "",
    markdownList(snapshot.forbiddenWhileBlocked),
    "",
    "## Next Control Actions",
    "",
    markdownList(snapshot.nextControlActions),
    "",
    "## Next Control Action Classification",
    "",
    markdownList((snapshot.controlActionSummary?.actions ?? []).map((item) =>
      `${item.type}${item.allowedByDeliveryPermission ? " allowed" : " context"}: ${item.action}`
    )),
    "",
  ].join("\n");
}

await mkdir("report", { recursive: true });
const singleFlight = await acquireSingleFlightExecution({
  lockDir: "report/softwarehouse-control-tick.lock",
  reportPath: "report/softwarehouse-control-tick.latest.json",
  waitMs: controlTickLockWaitMs,
  reuseReportOnTimeout: true,
  metadata: {
    script: "run-softwarehouse-control-tick.mjs",
  },
});

if (singleFlight.mode === "follower") {
  if (singleFlight.waitTimedOut) {
    process.exitCode = 1;
  }
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    ok: !singleFlight.waitTimedOut,
    reusedExistingTick: true,
    staleReportReused: singleFlight.waitTimedOut,
    activePid: singleFlight.metadata?.pid ?? null,
    waitedMs: singleFlight.waitedMs ?? 0,
    reportGeneratedAt: singleFlight.reusedReport?.generatedAt ?? null,
    controlDecision: singleFlight.reusedReport?.controlDecision ?? null,
    recommendedAction: singleFlight.reusedReport?.recommendedAction ?? null,
    error: singleFlight.waitTimedOut
      ? `Timed out waiting ${controlTickLockWaitMs}ms for active single-flight run to finish; reused stale report metadata for triage.`
      : null,
  }, null, 2));
} else {
  try {
    const results = [];
    const controlTickStartedAt = Date.now();
    for (const step of steps) {
      const elapsedMs = Date.now() - controlTickStartedAt;
      const remainingBudgetMs = controlTickBudgetMs - elapsedMs;
      if (remainingBudgetMs <= 0) {
        const now = new Date().toISOString();
        results.push({
          name: "controlTickBudgetGuard",
          ok: false,
          startedAt: now,
          endedAt: now,
          durationMs: 0,
          exitCode: null,
          timedOut: true,
          timeoutMs: controlTickBudgetMs,
          stderr: `Control-tick budget exceeded after ${elapsedMs}ms before step ${step.name}. Increase SOFTWAREHOUSE_CONTROL_TICK_BUDGET_MS or inspect slow steps from control-tick logs.`,
          stdout: "",
          budgetExceeded: true,
          elapsedMs,
          nextStep: step.name,
        });
        break;
      }
      const result = runStepWithNonFatalFallback(step, {
        timeoutMs: Math.min(step.timeoutMs ?? defaultStepTimeoutMs, remainingBudgetMs),
      });
      results.push(result);
      if (!result.ok) break;
    }

    const failedStep = results.find((result) => !result.ok);
    const byName = new Map(results.map((result) => [result.name, result]));
    const governor = byName.get("autonomyGovernor")?.summary ?? {};
    const readiness = byName.get("twoProjectReadiness")?.summary ?? {};
    const audit = byName.get("softwarehouseAudit")?.summary ?? {};
    const gateWatcher = byName.get("gateFreshnessWatcher")?.summary ?? {};
    const recoveryActionJanitor = byName.get("recoveryActionJanitor")?.summary ?? {};
    const blockedRootGuardrail = byName.get("blockedRootGuardrail")?.summary ?? {};
    const unblockPacket = byName.get("unblockPacket")?.summary ?? {};
    const sourceControl = byName.get("sourceControl")?.summary ?? {};
    const architectureLifecycle = byName.get("architectureAwarenessLifecycle")?.summary ?? {};
    const productIntentTraceability = byName.get("productIntentTraceability")?.summary ?? {};
    const projectTruthAudit = byName.get("projectTruthAudit")?.summary ?? {};
    const projectTruthGapDispatcher = byName.get("projectTruthGapDispatcher")?.summary ?? {};
    const learningLoop = byName.get("learningLoop")?.summary ?? {};
    const runtimeBindingRepairRaw = byName.get("runtimeBindingAssigneeRepair")?.summary ?? {};
    const projectOwnershipAssignment = byName.get("projectOwnershipAssignment")?.summary ?? {};
    const runtimeBindingRepair = resolveRuntimeBindingRepairSummary(
      runtimeBindingRepairRaw,
      projectOwnershipAssignment,
    );
    const safeArchitecturePlanning = byName.get("safeArchitecturePlanningSeeder")?.summary ?? {};
    const observedActiveRunCount = Math.max(
      0,
      ...results.map((result) => Number(result.summary?.activeRunCount ?? 0)).filter(Number.isFinite),
    );
    const observedLiveRunCount = Math.max(
      0,
      ...results.map((result) => Number(result.summary?.liveRunCount ?? 0)).filter(Number.isFinite),
    );
    const auditActiveRunCount = audit.activeRunCount == null ? Number.NaN : Number(audit.activeRunCount);
    const currentActiveRunCount = Number.isFinite(auditActiveRunCount)
      ? auditActiveRunCount
      : Math.max(
        0,
        Number(governor.activeRunCount ?? 0),
        Number(readiness.activeRunCount ?? 0),
        observedActiveRunCount,
        observedLiveRunCount,
      );
    const currentLiveRunCount = Math.max(
      0,
      Number(readiness.liveRunCount ?? 0),
      Number(gateWatcher.liveRunCount ?? 0),
      observedLiveRunCount,
      currentActiveRunCount,
    );

    const softwarehouseAuditResult = byName.get("softwarehouseAudit");
    if (softwarehouseAuditResult?.summary && governor.decision) {
      softwarehouseAuditResult.summary.autonomyState = governor.decision;
    }

    let controlDecision = failedStep
      ? "control_tick_failed"
      : governor.decision ?? "unknown";
    let recommendedAction = failedStep
      ? `Fix failed step ${failedStep.name} before starting or resuming agent work.`
      : governor.recommendedAction ?? unblockPacket.operatingDecision ?? "No recommendation emitted.";
    const activeRunCount = currentActiveRunCount;
    let allowedWhileBlocked = governor.allowedWhileBlocked ?? [];
    let forbiddenWhileBlocked = governor.forbiddenWhileBlocked ?? [];
    const gateRecheckOverlay = activeRunCount === 0
      && governor.operatingPosture === "one_gate_recheck_allowed"
      && readiness.operatingPosture === "project_repo_mutation_blocked_monitoring_allowed";
    let effectiveOperatingPosture = failedStep
      ? "control_tick_failed"
      : resolveEffectivePosture(governor.operatingPosture, readiness.operatingPosture, activeRunCount);
    const dirtyProjectRepoAfterAudit = (sourceControl.repos ?? []).find((repo) =>
      repo.name !== "Paperclip_Softwarehouse" && repo.clean === false && repo.parked !== true
    ) ?? null;
    const sourceControlGateAfterAudit = (governor.sourceControlGateIssues ?? []).find((issue) =>
      dirtyProjectRepoAfterAudit && new RegExp(`\\b${dirtyProjectRepoAfterAudit.name}\\b`, "i").test(`${issue.title ?? ""}\n${issue.project ?? ""}`)
    ) ?? (governor.sourceControlGateIssues ?? [])[0] ?? null;
    if (!failedStep && activeRunCount === 0 && governor.decision === "supervise_active_runs") {
      if (dirtyProjectRepoAfterAudit) {
        controlDecision = "project_source_control_closure_needed";
        recommendedAction = `No current live runs remain; route ${dirtyProjectRepoAfterAudit.name} through ${sourceControlGateAfterAudit?.identifier ?? "its source-control closure lane"} for local diff classification, validation, and commit/no-commit decisions. Do not push, deploy, restart, or run protected smoke without a fresh accepted gate fact.`;
        effectiveOperatingPosture = "project_source_control_closure_allowed";
        allowedWhileBlocked = [
          "refresh control tick, source-control packet, and unblock packet",
          "classify dirty project source-control lanes",
          "run local validation for changed files",
          "commit local project source-control closure when evidence supports it",
          "supervise stale board state",
          "update Paperclip OS process logic when the improvement is outside the blocked project repo",
          "wait for accepted gate freshness facts",
        ];
        forbiddenWhileBlocked = [
          "create duplicate source-control cleanup/commit issues",
          `push ${dirtyProjectRepoAfterAudit.name}`,
          "deploy or restart production",
          "protected smoke without fresh gate fact",
          "secret disclosure",
        ];
      } else {
        controlDecision = "stale_in_progress_recovery_needed";
        recommendedAction = "No current live runs remain; reconcile in_progress issues without live runs before treating autonomy as healthy or idle.";
        effectiveOperatingPosture = "cleanup_tail_only";
      }
    }
    if (!failedStep && activeRunCount === 0 && (runtimeBindingRepair.reassignCount ?? 0) > 0) {
      controlDecision = "runtime_binding_repair_ready";
      recommendedAction = "Run `pnpm softwarehouse:repair-runtime-bindings`, then `pnpm softwarehouse:repair-runtime-bindings:apply` only if exactly one reassignment action is listed and no live runs are active.";
      effectiveOperatingPosture = "runtime_binding_repair_allowed";
    }
    if (!failedStep && activeRunCount === 0 && (recoveryActionJanitor.actionCount ?? 0) > 0) {
      controlDecision = "recovery_action_cleanup_ready";
      recommendedAction = "Run `pnpm softwarehouse:recovery-janitor`, then `pnpm softwarehouse:recovery-janitor:apply` only if every listed action is a clear blocked-source cleanup and no live runs are active.";
      effectiveOperatingPosture = "cleanup_tail_only";
    }
    if (!failedStep && activeRunCount === 0 && (blockedRootGuardrail.repairActionCount ?? 0) > 0) {
      controlDecision = "blocked_root_guardrail_repair_ready";
      recommendedAction = "Run `pnpm softwarehouse:blocked-root-guardrail`, then `pnpm softwarehouse:blocked-root-guardrail:apply` only if the listed repairs are board-metadata-only root blocker links and no live runs are active.";
      effectiveOperatingPosture = "cleanup_tail_only";
    }
    if (!failedStep && activeRunCount === 0 && (projectTruthAudit.totalGaps ?? 0) > 0) {
      controlDecision = "project_truth_gap_routing_needed";
      const firstGap = projectTruthAudit.firstGap;
      recommendedAction = firstGap
        ? `Route the first ${firstGap.project ?? "project"} truth gap before claiming app readiness: ${firstGap.summary} Owner: ${firstGap.nextOwner}. Next action: ${firstGap.nextAction}`
        : "Route active project truth gaps from docs/status/project-truth-index.json before claiming app readiness.";
      effectiveOperatingPosture = "project_truth_repair_allowed";
      allowedWhileBlocked = [
        "refresh architecture, app-completion, event-chain, runtime-error, operational-readiness, and project-truth indexes",
        "create or wake the smallest owner-scoped map/proof/repair lane for the first truth gap",
        "run local validation for changed files",
        "commit local non-production repair work when evidence supports it",
        "supervise live runs and stale board state",
        "wait for accepted gate freshness facts for protected production actions",
      ];
      forbiddenWhileBlocked = [
        "claim app readiness from narrative summaries",
        "skip event-chain impact analysis for backend/frontend/worker changes",
        "push or deploy without source-control and release-gate evidence",
        "protected smoke without fresh gate fact",
        "secret disclosure",
      ];
    }
    const activeWorkOverlay = activeRunCount > 0 && [
      "supervise_active_work",
      "cleanup_tail_only",
      "cleanup_self_supervision_only",
    ].includes(governor.operatingPosture);
    const postureConsistent = posturesAreConsistent({
      governorPosture: governor.operatingPosture,
      readinessPosture: readiness.operatingPosture,
      activeWorkOverlay,
      gateRecheckOverlay,
    });
    const controlGateHandoffs = mergeProtectedDeliveryGates({
      gateHandoffs: unblockPacket.gateHandoffs ?? [],
      protectedDeliveryBlockers: readiness.protectedDeliveryBlockers ?? [],
    });
    const normalizedGuardrails = guardrailsForOperatingPosture(
      effectiveOperatingPosture,
      allowedWhileBlocked,
      forbiddenWhileBlocked,
    );
    allowedWhileBlocked = normalizedGuardrails.allowed;
    forbiddenWhileBlocked = normalizedGuardrails.forbidden;
    const nextControlActions = nextControlActionsFor({
      controlDecision,
      effectiveOperatingPosture,
      allowedWhileBlocked,
      forbiddenWhileBlocked,
      requiredBeforeFullDelivery: readiness.requiredBeforeFullDelivery ?? [],
      gateHandoffs: controlGateHandoffs,
      sourceControlGateIssues: governor.sourceControlGateIssues ?? [],
      sourceControlRepos: sourceControl.repos ?? [],
      safeArchitecturePlanning,
      activeRunCount,
    });
    if (!failedStep && (projectTruthAudit.totalGaps ?? 0) > 0) {
      const firstGap = projectTruthAudit.firstGap;
      const action = firstGap
        ? `Project truth gap (${firstGap.project ?? "project"}): ${firstGap.summary}; owner=${firstGap.nextOwner}; next=${firstGap.nextAction}`
        : "Project truth gap: inspect docs/status/project-truth-index.json and route the first gap.";
      if (!nextControlActions.includes(action)) {
        nextControlActions.splice(Math.min(2, nextControlActions.length), 0, action);
      }
      const dispatcherAction = (projectTruthGapDispatcher.actions ?? [])[0] ?? null;
      const dispatchedIdentifier = dispatcherAction?.identifier ? ` (${dispatcherAction.identifier})` : "";
      const dispatchAction = dispatcherAction
        ? `Dispatch project truth gap${dispatchedIdentifier}: ${dispatcherAction.action}; assignee=${dispatcherAction.assignee ?? "unassigned"}; title=${dispatcherAction.title ?? "unknown"}`
        : "Dispatch project truth gap through the project-truth gap dispatcher.";
      if (!nextControlActions.includes(dispatchAction)) {
        nextControlActions.splice(Math.min(2, nextControlActions.length), 0, dispatchAction);
      }
    }
    const workerBacklogSeeder = byName.get("workerBacklogDecompositionSeeder")?.summary ?? {};
    if (!failedStep && activeRunCount === 0 && workerBacklogSeeder.shouldSeed) {
      const createdAction = (workerBacklogSeeder.actions ?? []).find((action) =>
        action.action === "create_worker_backlog_decomposition_lane"
        || action.action === "wake_existing_worker_backlog_decomposition_lane"
      );
      if (createdAction) {
        nextControlActions.splice(1, 0, `Worker backlog decomposition active: ${createdAction.identifier ?? "new lane"} assigned to ${createdAction.assignee ?? "Engineering Delivery Lead"}; split supervisor work into worker-ready lanes before treating autonomy as healthy.`);
      }
    }
    if (!failedStep && activeRunCount > 0 && workerBacklogSeeder.shouldSeed) {
      const activeWorkerBacklogAction = (workerBacklogSeeder.actions ?? []).find((action) =>
        action.action === "supervise_active_worker_backlog_decomposition_lane"
      );
      if (activeWorkerBacklogAction) {
        nextControlActions.splice(1, 0, `Worker backlog decomposition already running: ${activeWorkerBacklogAction.identifier ?? "active lane"} assigned to ${activeWorkerBacklogAction.assignee ?? "Engineering Delivery Lead"}; supervise it and require worker-ready child lanes or explicit legal blockers.`);
      }
    }
    const nextControlActionStatus = nextControlActionStatusFor(nextControlActions);
    const operatorActionPacket = operatorActionPacketFor({
      gateHandoffs: unblockPacket.gateHandoffs ?? [],
      protectedDeliveryBlockers: readiness.protectedDeliveryBlockers ?? [],
      sourceControlGateIssues: governor.sourceControlGateIssues ?? [],
      sourceControlRepos: sourceControl.repos ?? [],
      requiredBeforeFullDelivery: readiness.requiredBeforeFullDelivery ?? [],
    });
    const controlBrief = controlBriefFor({
      controlDecision,
      effectiveOperatingPosture,
      recommendedAction,
      operatorActionPacket,
      nextControlActions,
      allowedWhileBlocked,
      forbiddenWhileBlocked,
      requiredBeforeFullDelivery: readiness.requiredBeforeFullDelivery ?? [],
      activeRunCount,
      liveRunCount: currentLiveRunCount,
    });
    const controlActionSummary = controlActionSummaryFor(
      nextControlActions,
      controlBrief.deliveryPermission?.allowedLaneTypes ?? [],
    );
    const controlFindings = [];
    if (!postureConsistent) {
      controlFindings.push({
        severity: "critical",
        area: "control-loop",
        message: "Governor and readiness posture disagree; obey effectiveOperatingPosture before waking lanes.",
        items: {
          operatingPosture: governor.operatingPosture ?? null,
          readinessOperatingPosture: readiness.operatingPosture ?? null,
          effectiveOperatingPosture,
        },
      });
    }
    if (nextControlActionStatus.empty) {
      controlFindings.push({
        severity: "critical",
        area: "control-loop",
        message: "Control tick emitted no nextControlActions; agents do not have an executable handoff.",
      });
    }
    if (nextControlActionStatus.duplicateActions.length > 0) {
      controlFindings.push({
        severity: "warn",
        area: "control-loop",
        message: "Control tick emitted duplicate nextControlActions; consolidate the PM/operator handoff.",
        items: nextControlActionStatus.duplicateActions,
      });
    }
    if ((runtimeBindingRepair.manualCount ?? 0) > 0) {
      controlFindings.push({
        severity: "warn",
        area: "runtime-bindings",
        message: "Some runtime-gated issues need manual owner assignment because no single clear bound agent was found.",
        items: runtimeBindingRepair.actions ?? [],
      });
    }
    if ((blockedRootGuardrail.repairActionCount ?? 0) > 0) {
      controlFindings.push({
        severity: "warn",
        area: "blocked-root-guardrail",
        message: "Blocked issues are classified under a monitored root gate but lack direct blockedBy links.",
        items: blockedRootGuardrail.duplicateRootFindings ?? [],
      });
    }
    if (blockedRootGuardrail.timedOut === true) {
      controlFindings.push({
        severity: "warn",
        area: "blocked-root-guardrail",
        message: "Blocked-root guardrail timed out; control tick continued in degraded mode and skipped guardrail findings for this run.",
        items: {
          timeoutMs: blockedRootGuardrail.timeoutMs ?? null,
          timeoutMessage: blockedRootGuardrail.timeoutMessage ?? null,
        },
      });
    }
    if (audit.timedOut === true) {
      controlFindings.push({
        severity: "warn",
        area: "softwarehouse-audit",
        message: "Softwarehouse audit timed out; control tick continued in degraded mode and skipped audit findings for this run.",
        items: {
          timeoutMs: audit.timeoutMs ?? null,
          timeoutMessage: audit.timeoutMessage ?? null,
        },
      });
    }
    if (learningLoop.timedOut === true) {
      controlFindings.push({
        severity: "warn",
        area: "learning-loop",
        message: "Learning loop timed out; control tick continued in degraded mode and reused the prior teaching state for this run.",
        items: {
          timeoutMs: learningLoop.timeoutMs ?? null,
          timeoutMessage: learningLoop.timeoutMessage ?? null,
        },
      });
    }
    if ((architectureLifecycle.projectsMissingExportsCount ?? 0) > 0) {
      controlFindings.push({
        severity: "warn",
        area: "architecture-awareness",
        message: "Some controlled projects are missing required Architectural Awareness Layer exports.",
        items: architectureLifecycle.projects ?? [],
      });
    }
    if ((architectureLifecycle.projectsWithStaleExportsCount ?? 0) > 0) {
      controlFindings.push({
        severity: "warn",
        area: "architecture-awareness",
        message: "Some controlled projects have stale Architectural Awareness Layer exports.",
        items: architectureLifecycle.projects ?? [],
      });
    }
    if ((projectTruthAudit.totalGaps ?? 0) > 0) {
      controlFindings.push({
        severity: (projectTruthAudit.criticalRuntimeFindings ?? 0) > 0 ? "critical" : "warn",
        area: "project-truth",
        message: "Active app truth indexes show unresolved routing gaps; agents must route the first indexed gap instead of guessing readiness.",
        items: {
          projectNames: projectTruthAudit.projectNames ?? [],
          totalGaps: projectTruthAudit.totalGaps ?? null,
          incompleteEventChains: projectTruthAudit.incompleteEventChains ?? null,
          criticalRuntimeFindings: projectTruthAudit.criticalRuntimeFindings ?? null,
          projects: projectTruthAudit.projects ?? [],
          firstGap: projectTruthAudit.firstGap ?? null,
        },
      });
    }
    const auditFindings = [
      ...controlFindings,
      ...(audit.findings ?? []),
    ];
    const auditOverall = controlFindings.some((finding) => finding.severity === "critical")
      ? "fail"
      : audit.overall ?? null;

    const output = {
      generatedAt: new Date().toISOString(),
      controlTickBudgetMs,
      totalDurationMs: Date.now() - controlTickStartedAt,
      ok: !failedStep,
      controlDecision,
      recommendedAction,
      controlBrief,
      controlActionSummary,
      operatorActionPacket,
      nextControlActions,
      nextControlActionStatus,
      operatingPosture: governor.operatingPosture ?? null,
      readinessOperatingPosture: readiness.operatingPosture ?? null,
      effectiveOperatingPosture,
      postureConsistent,
      activeWorkOverlay,
      readinessOperatingConstraints: readiness.operatingConstraints ?? [],
      allowedWhileBlocked,
      forbiddenWhileBlocked,
      supervisionReady: readiness.supervisionReady ?? null,
      twoProjectFullDeliveryReady: readiness.twoProjectFullDeliveryReady ?? null,
      activeRunCount: activeRunCount ?? null,
      liveRunCount: currentLiveRunCount ?? null,
      observedMaxActiveRunCount: observedActiveRunCount,
      observedMaxLiveRunCount: observedLiveRunCount,
      gateActionCount: gateWatcher.actionCount ?? null,
      freshGateCount: unblockPacket.freshGateCount ?? null,
      gateHandoffs: controlGateHandoffs,
      sourceControlGateIssues: operatorActionPacket.sourceControlGates ?? governor.sourceControlGateIssues ?? [],
      sourceControlClean: sourceControl.clean ?? null,
      sourceControlRepos: sourceControl.repos ?? [],
      architectureAwarenessLifecycle: architectureLifecycle,
      productIntentTraceability,
      projectTruthAudit,
      projectTruthGapDispatcher,
      runtimeBindingRepairActionCount: runtimeBindingRepair.actionCount ?? null,
      runtimeBindingRepairActions: runtimeBindingRepair.actions ?? [],
      recoveryActionJanitorActionCount: recoveryActionJanitor.actionCount ?? null,
      recoveryActionJanitorActions: recoveryActionJanitor.actions ?? [],
      blockedRootGuardrailFindingCount: blockedRootGuardrail.findingCount ?? null,
      blockedRootGuardrailRepairActionCount: blockedRootGuardrail.repairActionCount ?? null,
      blockedRootGuardrailFindings: {
        duplicateRootFindings: blockedRootGuardrail.duplicateRootFindings ?? [],
        staleGateFindings: blockedRootGuardrail.staleGateFindings ?? [],
        resolvedRootDependentsStillBlocked: blockedRootGuardrail.resolvedRootDependentsStillBlocked ?? [],
      },
      auditOverall,
      auditFindings,
      requiredBeforeFullDelivery: readiness.requiredBeforeFullDelivery ?? [],
      steps: results,
    };

    const readinessSnapshot = readinessSnapshotFor(output);
    await writeFile("report/softwarehouse-control-tick.latest.json", `${JSON.stringify(output, null, 2)}\n`);
    await writeFile("report/softwarehouse-control-tick.latest.md", renderControlTickMarkdown(output));
    await writeFile("report/softwarehouse-readiness-snapshot.latest.json", `${JSON.stringify(readinessSnapshot, null, 2)}\n`);
    await writeFile("report/softwarehouse-readiness-snapshot.latest.md", renderReadinessSnapshotMarkdown(readinessSnapshot));

    console.log(JSON.stringify(output, null, 2));
    if (failedStep) process.exitCode = 1;
  } finally {
    await singleFlight.release();
  }
}
