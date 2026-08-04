import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  evaluateProductIntentTrace,
  inspectProductIntentContract,
  parseProductIntentTrace,
  productIntentDecisionContract,
  renderProductIntentTraceTemplate,
} from "./lib/product-intent-traceability.mjs";
import {
  canonicalSoftwarehouseProject,
  softwarehouseActiveApplicationProjects,
} from "./lib/softwarehouse-project-registry.mjs";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow Software House";
const preferredCompanyNames = [
  companyName,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const skipControlTick = process.argv.includes("--skip-control-tick")
  || process.env.SOFTWAREHOUSE_AUTONOMOUS_CYCLE_SKIP_CONTROL_TICK === "1";
const skipValidation = process.argv.includes("--skip-validation")
  || process.env.SOFTWAREHOUSE_AUTONOMOUS_CYCLE_SKIP_VALIDATION === "1";
const now = new Date();
const cycleId = `cycle-${now.toISOString().replace(/[:.]/g, "-")}`;
const generatedAt = now.toISOString();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeoutMs ?? 900_000,
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    timedOut: result.error?.code === "ETIMEDOUT",
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

async function request(method, route, body = undefined) {
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : text,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const terminalDeliveryStages = new Set(["outcome_accepted", "rolled_back"]);
const canonicalProjectRoots = new Map(softwarehouseActiveApplicationProjects
  .map((project) => [project.paperclipName, project.name]));

function priorityRank(priority) {
  return ({ critical: 0, high: 1, medium: 2, low: 3 })[priority] ?? 4;
}

function intentReconciliationTitle(projectName, issueIdentifier) {
  return `[${projectName}][Product Intent] Reconcile ${issueIdentifier} before implementation`;
}

async function ensureProductIntentReconciliation({ company, issue, project, agents, issues, contract, traceResult }) {
  const canonical = canonicalSoftwarehouseProject(project.name);
  const title = intentReconciliationTitle(canonical?.name ?? project.name, issue.identifier);
  const existing = issues.find((candidate) => candidate.title === title && !["done", "cancelled"].includes(candidate.status));
  if (existing) {
    return {
      action: "supervise_product_intent_reconciliation",
      reason: `${issue.identifier} cannot enter ProductDelivery until its existing intent-reconciliation lane is resolved.`,
      issueIdentifier: issue.identifier,
      reconciliationIdentifier: existing.identifier,
      missing: traceResult.missing,
      conflicts: traceResult.conflicts,
      startedRuns: [],
    };
  }

  const manager = agents.find((agent) => agent.metadata?.rosterKey === canonical?.managerRosterKey)
    ?? agents.find((agent) => agent.name === canonical?.managerName);
  if (!manager) {
    return {
      action: "product_intent_reconciliation_owner_missing",
      reason: `No canonical product manager can reconcile ${issue.identifier}.`,
      issueIdentifier: issue.identifier,
      missing: traceResult.missing,
      conflicts: traceResult.conflicts,
      startedRuns: [],
    };
  }

  const traceTemplate = renderProductIntentTraceTemplate(contract, {
    observedGap: `Reconcile the source issue ${issue.identifier} against current product intent, approved architecture, and observed project truth before implementation.`,
    expectedOutcome: `The source issue ${issue.identifier} contains one non-conflicting, source-backed Product Intent Trace that makes the smallest intended outcome testable.`,
    acceptanceEvidence: "Updated source issue, cited canonical files, explicit assumption disposition, contradiction review, and PM handoff evidence.",
  });
  const created = await request("POST", `/api/issues/${issue.id}/children`, {
    title,
    description: [
      "## Goal",
      "",
      `Prevent implementation of [${issue.identifier}](/LUC/issues/${issue.identifier}) from guessing product behavior. Reconcile the owner's intent, the approved product contract, architecture constraints, observed code/runtime truth, and every material assumption.`,
      "",
      "## Required decision flow",
      "",
      "1. Read the project's `docs/documentation-contract.json` and only its declared current product, architecture, decision, and observed-state authorities.",
      "2. Treat legacy owner notes in `docs/architecture/` as valuable input, but classify each relevant statement as approved product intent, approved architecture, unresolved assumption, superseded material, or contradiction.",
      "3. If sources conflict and the choice changes product behavior, do not guess. Record the options and route one bounded owner decision.",
      "4. Update the narrowest canonical product/architecture/decision source so only one current rule remains. Unresolved hypotheses belong in an assumptions/open-decisions register and do not authorize implementation.",
      "5. Patch the source issue with the completed block below. Replace every placeholder and use repo-relative authoritative paths.",
      "",
      "```markdown",
      traceTemplate,
      "```",
      "",
      "## Current gate diagnosis",
      "",
      `- Missing fields: ${traceResult.missing.join(", ") || "none"}`,
      `- Conflicts: ${traceResult.conflicts.join(", ") || "none"}`,
      `- Documentation contract findings: ${(contract.findings ?? []).map((item) => item.code).join(", ") || "none"}`,
      "",
      "Do not implement the product change in this reconciliation issue.",
    ].join("\n"),
    status: "todo",
    priority: issue.priority ?? "high",
    assigneeAgentId: manager.id,
    projectId: project.id,
    goalId: issue.goalId ?? project.goalId ?? null,
    executionWorkspacePreference: "shared_workspace",
    acceptanceCriteria: [
      "The source issue contains a complete softwarehouse-product-intent-trace:v1 block.",
      "Every cited product and architecture path belongs to the project's declared documentation authority.",
      "All material assumptions are classified; pending or conflicting assumptions block implementation.",
      "Contradictory current sources are reconciled or routed to one explicit owner decision without guessing.",
      "The smallest owner-visible expected outcome and its acceptance evidence are explicit.",
    ],
    blockParentUntilDone: true,
  });
  if (!created.ok) {
    return {
      action: "product_intent_reconciliation_creation_failed",
      reason: created.error,
      issueIdentifier: issue.identifier,
      missing: traceResult.missing,
      conflicts: traceResult.conflicts,
      startedRuns: [],
    };
  }
  const wake = await request("POST", `/api/agents/${manager.id}/wakeup`, {
    source: "automation",
    triggerDetail: "system",
    reason: `Reconcile product intent for ${issue.identifier} before ProductDelivery admission`,
    idempotencyKey: `${cycleId}:intent-reconciliation:${issue.id}`,
    forceFreshSession: true,
    payload: { issueId: created.data.id, projectId: project.id, sourceIssueId: issue.id, cycleId },
  });
  return {
    action: wake.ok ? "product_intent_reconciliation_dispatched" : "product_intent_reconciliation_wake_failed",
    reason: wake.ok
      ? `${issue.identifier} was held before implementation and one project-scoped PM reconciliation lane was dispatched.`
      : wake.error,
    issueIdentifier: issue.identifier,
    reconciliationIdentifier: created.data.identifier,
    missing: traceResult.missing,
    conflicts: traceResult.conflicts,
    startedRuns: wake.data?.id ? [wake.data.id] : [],
  };
}

async function executeBoundedDispatch({ company, issues, projects, agents, repositories, preliminary }) {
  if (!company || !Array.isArray(issues) || !Array.isArray(projects)) return preliminary;
  if (!["ready_for_next_paperclip_dispatch", "project_truth_gap_dispatched"].includes(preliminary.action)) return preliminary;

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const deliveriesResponse = await request("GET", `/api/companies/${company.id}/deliveries?limit=500`);
  const deliveries = Array.isArray(deliveriesResponse.data) ? deliveriesResponse.data : [];
  const deliveryDetails = await Promise.all(deliveries
    .filter((delivery) => !terminalDeliveryStages.has(delivery.stage))
    .map((delivery) => request("GET", `/api/deliveries/${delivery.id}`).then((result) => result.data)));
  const issueIdsAlreadyInFlight = new Set(deliveryDetails.flatMap((delivery) =>
    Array.isArray(delivery?.tasks) ? delivery.tasks.map((task) => task.issueId) : []));

  const preferredIdentifier = preliminary.issueIdentifier ?? null;
  const candidates = issues.filter((issue) => {
    const project = projectById.get(issue.projectId);
    const repoName = canonicalProjectRoots.get(project?.name);
    return repoName
      && repositories[repoName]?.clean === true
      && ["backlog", "todo"].includes(issue.status)
      && issue.assigneeAgentId
      && !["routine_execution", "stranded_issue_recovery", "issue_productivity_review"].includes(issue.originKind)
      && !/^\[[^\]]+\]\[Product Intent\] Reconcile\b/.test(issue.title ?? "")
      && !issueIdsAlreadyInFlight.has(issue.id)
      && (typeof issue.description === "string" && issue.description.trim().length >= 120);
  }).sort((left, right) => {
    if (left.identifier === preferredIdentifier) return -1;
    if (right.identifier === preferredIdentifier) return 1;
    return priorityRank(left.priority) - priorityRank(right.priority)
      || String(left.createdAt).localeCompare(String(right.createdAt));
  });
  const inspected = [];
  const contractsByProjectId = new Map();
  for (const candidate of candidates) {
    const project = projectById.get(candidate.projectId);
    const canonical = canonicalSoftwarehouseProject(project?.name);
    let contract = contractsByProjectId.get(project.id);
    if (!contract) {
      contract = await inspectProductIntentContract({ name: canonical?.name ?? project.name, root: canonical?.root ?? path.join(appsRoot, canonicalProjectRoots.get(project.name)) });
      contractsByProjectId.set(project.id, contract);
    }
    const trace = parseProductIntentTrace(candidate.description);
    inspected.push({ issue: candidate, project, contract, trace, traceResult: evaluateProductIntentTrace({ trace, contract }) });
  }
  const selected = inspected.find((candidate) => candidate.traceResult.ready);
  const issue = selected?.issue ?? null;
  if (!issue) {
    const held = inspected[0];
    if (held) {
      return ensureProductIntentReconciliation({
        company,
        issue: held.issue,
        project: held.project,
        agents,
        issues,
        contract: held.contract,
        traceResult: held.traceResult,
      });
    }
    return {
      ...preliminary,
      action: "no_admissible_product_work_packet",
      reason: "No clean-repository product issue has an assignee, bounded description, runnable status, and no existing delivery. The cycle is unhealthy until intake supplies one.",
    };
  }

  const project = projectById.get(issue.projectId);
  const contract = selected.contract;
  const trace = selected.trace;
  const acceptanceCriteria = [{
    kind: "issue_acceptance_contract",
    issueIdentifier: issue.identifier,
    requirement: "Implementation, inspectable tests, review, documentation, release impact, and owner-visible outcome evidence are attached before closure.",
  }];
  const created = await request("POST", `/api/companies/${company.id}/deliveries`, {
    projectId: issue.projectId,
    title: issue.title,
    problemStatement: issue.description,
    decisionContract: {
      source: "paperclip_autonomous_cycle",
      cycleId,
      boundedToIssueId: issue.id,
      maxConcurrentDispatches: 1,
      projectIsolation: project.name,
      intentContract: productIntentDecisionContract({ contract, trace, issue, project }),
    },
    ownerAgentId: issue.assigneeAgentId,
    outcomeStatement: `The owner can use or inspect the accepted result of ${issue.identifier} in ${project.name}; activity alone is not an outcome.`,
    acceptanceCriteria,
    taskIssueIds: [issue.id],
  });
  if (!created.ok) return { ...preliminary, action: "delivery_record_creation_failed", reason: created.error, issueIdentifier: issue.identifier };
  const delivery = created.data;
  const admitted = await request("POST", `/api/deliveries/${delivery.id}/transition`, {
    toStage: "admitted",
    idempotencyKey: `${cycleId}:admitted`,
  });
  if (!admitted.ok) return { ...preliminary, action: "delivery_admission_rejected", reason: admitted.error, deliveryId: delivery.id, issueIdentifier: issue.identifier };
  const implementing = await request("POST", `/api/deliveries/${delivery.id}/transition`, {
    toStage: "implementing",
    idempotencyKey: `${cycleId}:implementing`,
  });
  if (!implementing.ok) return { ...preliminary, action: "delivery_start_failed", reason: implementing.error, deliveryId: delivery.id, issueIdentifier: issue.identifier };
  const wake = await request("POST", `/api/agents/${issue.assigneeAgentId}/wakeup`, {
    source: "automation",
    triggerDetail: "system",
    reason: `Autonomous product delivery ${delivery.id} for ${issue.identifier}`,
    idempotencyKey: `${cycleId}:dispatch:${issue.id}`,
    forceFreshSession: true,
    payload: { issueId: issue.id, projectId: issue.projectId, deliveryId: delivery.id, cycleId },
  });
  if (!wake.ok) return { ...preliminary, action: "agent_dispatch_failed", reason: wake.error, deliveryId: delivery.id, issueIdentifier: issue.identifier };
  return {
    action: "bounded_product_delivery_dispatched",
    reason: "One company-scoped product delivery was admitted, linked to its task, and dispatched to its accountable agent.",
    deliveryId: delivery.id,
    issueIdentifier: issue.identifier,
    issueTitle: issue.title,
    projectName: project.name,
    assigneeAgentId: issue.assigneeAgentId,
    startedRuns: wake.data?.id ? [wake.data.id] : [],
    allowedLaneTypes: preliminary.allowedLaneTypes,
  };
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeCommand(result) {
  if (!result) return null;
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdoutTail: result.stdout.slice(-2000),
    stderrTail: result.stderr.slice(-2000),
  };
}

function gitStatusFor(repoPath) {
  if (!existsSync(repoPath)) {
    return {
      exists: false,
      clean: null,
      lines: [],
    };
  }
  const result = run("git", ["status", "--short"], { cwd: repoPath, timeoutMs: 60_000 });
  const lines = result.ok ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
  return {
    exists: true,
    clean: result.ok ? lines.length === 0 : null,
    lines,
    error: result.ok ? null : result.stderr || result.stdout,
  };
}

function deliveryPermission(controlTick) {
  return controlTick?.controlBrief?.deliveryPermission ?? {};
}

function phaseStatus(ok, reason = null) {
  return {
    ok,
    reason,
  };
}

function dispatchDecisionFor(controlTick) {
  const permission = deliveryPermission(controlTick);
  const allowedTypes = permission.allowedLaneTypes ?? [];
  const activeRunCount = Number(controlTick?.activeRunCount ?? 0);
  const decision = controlTick?.controlDecision ?? "unknown";
  const projectTruthGapDispatcher = controlTick?.projectTruthGapDispatcher ?? {};
  const projectTruthGapAction = (projectTruthGapDispatcher.actions ?? [])[0] ?? null;
  const projectTruthAudit = controlTick?.projectTruthAudit ?? {};

  if ((projectTruthAudit.totalGaps ?? 0) > 0 && projectTruthGapAction?.identifier) {
    return {
      action: activeRunCount > 0 ? "supervise_existing_project_truth_run" : "project_truth_gap_dispatched",
      startedRuns: [],
      issueIdentifier: projectTruthGapAction.identifier,
      issueStatus: projectTruthGapAction.status ?? null,
      issueTitle: projectTruthGapAction.title ?? null,
      assignee: projectTruthGapAction.assignee ?? null,
      projectTruthFirstGap: projectTruthAudit.firstGap ?? null,
      reason: "The first indexed project-truth gap has an owner-scoped Paperclip issue; supervise it instead of starting duplicate work.",
      allowedLaneTypes: allowedTypes,
    };
  }

  if ((projectTruthAudit.totalGaps ?? 0) > 0 && allowedTypes.includes("project_truth_gap_dispatch")) {
    return {
      action: "project_truth_gap_dispatch_required",
      startedRuns: [],
      projectTruthFirstGap: projectTruthAudit.firstGap ?? null,
      reason: "Project-truth gaps exist but no owner-scoped dispatch issue is visible in the control tick.",
      allowedLaneTypes: allowedTypes,
    };
  }

  if (activeRunCount > 0) {
    return {
      action: "supervise_existing_runs",
      startedRuns: [],
      reason: "Active runs exist; cycle must not start duplicate work.",
      allowedLaneTypes: allowedTypes,
    };
  }

  if (!permission.canStartNewLane) {
    return {
      action: "blocked_by_delivery_permission",
      startedRuns: [],
      reason: permission.reason ?? `Control decision ${decision} does not allow new lanes.`,
      allowedLaneTypes: allowedTypes,
    };
  }

  if (decision === "operating_source_control_closure_needed") {
    return {
      action: "paperclip_os_closure_required",
      startedRuns: [],
      reason: "Paperclip OS worktree must be classified/committed before broad delivery.",
      allowedLaneTypes: allowedTypes,
    };
  }

  return {
    action: "ready_for_next_paperclip_dispatch",
    startedRuns: [],
    reason: "Cycle is ready for one bounded ProductDelivery dispatch; the executor will persist the ledger and wake exactly one accountable owner.",
    allowedLaneTypes: allowedTypes,
  };
}

function releaseDecisionFor(controlTick, validation, dispatch) {
  const permission = deliveryPermission(controlTick);
  if (!validation.ok) {
    return {
      action: "release_blocked",
      reason: "Validation failed.",
    };
  }
  if (!permission.protectedDeliveryAllowed) {
    return {
      action: "release_not_allowed",
      reason: permission.reason ?? "Protected delivery is not allowed in current operating posture.",
    };
  }
  if (dispatch.action === "bounded_product_delivery_dispatched") {
    return {
      action: "release_managed_by_product_delivery",
      deliveryId: dispatch.deliveryId,
      reason: "Release is governed by the persisted ProductDelivery ledger; no deploy is claimed before review, exact SHA, deployment, observation, and independent outcome acceptance are recorded.",
    };
  }
  return {
    action: "release_waiting_for_delivery_evidence",
    reason: "No deployment occurred in this cycle. Existing work stays under its issue or ProductDelivery evidence gates without a synthetic release claim.",
  };
}

function monitorDecisionFor(release) {
  if (release.action !== "release_managed_by_product_delivery") {
    return {
      action: "monitoring_not_started",
      reason: "No deployment occurred in this cycle.",
    };
  }
  return {
    action: "monitoring_managed_by_product_delivery",
    deliveryId: release.deliveryId,
    reason: "The delivery cannot reach outcome acceptance until deployed SHA, URL, observed-health evidence, and an independent acceptance actor are persisted.",
  };
}

function learningFor(controlTick, validation, repositories) {
  const proposals = [];
  const suggestions = [];
  const missing = [];
  const paperclipOsDirty = repositories.Paperclip_Softwarehouse?.clean === false;

  if (paperclipOsDirty) {
    proposals.push({
      title: "Close Paperclip OS source-control state before broad delivery",
      safetyClass: "safe-local",
      expectedAutonomyGain: "prevents stale local OS work from blocking every autonomous cycle",
      retirementCondition: "Paperclip_Softwarehouse git status is clean after a successful cycle",
    });
  }
  if (!validation.ok) {
    proposals.push({
      title: "Repair autonomous cycle validation failures",
      safetyClass: "safe-local",
      expectedAutonomyGain: "keeps the operating loop verifiable before dispatching delivery work",
      retirementCondition: "cycle validation command passes in two consecutive cycles",
    });
  }
  return {
    improvementProposals: proposals,
    architectureSuggestions: suggestions,
    missingCapabilities: missing,
  };
}

function renderMarkdown(cycle) {
  const rows = Object.entries(cycle.phases)
    .map(([name, phase]) => `| ${name} | ${phase.status?.ok ? "pass" : "hold"} | ${(phase.status?.reason ?? phase.summary ?? "").replace(/\|/g, "\\|")} |`)
    .join("\n");
  return [
    "# Autonomous Development Cycle",
    "",
    `Cycle: ${cycle.cycleId}`,
    `Generated: ${cycle.generatedAt}`,
    "",
    "## Decision",
    "",
    `- Control decision: ${cycle.controlDecision}`,
    `- Operating posture: ${cycle.effectiveOperatingPosture}`,
    `- Outcome: ${cycle.outcome}`,
    "",
    "## Phases",
    "",
    "| Phase | Status | Summary |",
    "| --- | --- | --- |",
    rows,
    "",
    "## Next Actions",
    "",
    cycle.nextActions.map((action) => `- ${action}`).join("\n") || "- none",
    "",
    "## Improvement Proposals",
    "",
    cycle.learning.improvementProposals.map((item) => `- ${item.title}: ${item.retirementCondition}`).join("\n") || "- none",
    "",
    "## Missing Capabilities",
    "",
    cycle.learning.missingCapabilities.map((item) => `- ${item.capability}: ${item.impact}`).join("\n") || "- none",
    "",
  ].join("\n");
}

const preflight = {
  paperclipApi: await request("GET", "/api/health"),
};

let companySnapshot = {
  ok: false,
  company: null,
  issueCount: null,
  projectCount: null,
  agentCount: null,
};
let selectedCompany = null;
let companyIssues = [];
let companyProjects = [];
let companyAgents = [];
const companies = await request("GET", "/api/companies");
if (companies.ok) {
  const company = companies.data?.find((candidate) => preferredCompanyNames.includes(candidate.name));
  if (company) {
    const [issues, projects, agents] = await Promise.all([
      request("GET", `/api/companies/${company.id}/issues?limit=2000`),
      request("GET", `/api/companies/${company.id}/projects`),
      request("GET", `/api/companies/${company.id}/agents`),
    ]);
    selectedCompany = company;
    companyIssues = Array.isArray(issues.data) ? issues.data : [];
    companyProjects = Array.isArray(projects.data) ? projects.data : [];
    companyAgents = Array.isArray(agents.data) ? agents.data : [];
    companySnapshot = {
      ok: issues.ok && projects.ok && agents.ok,
      company: {
        id: company.id,
        name: company.name,
      },
      issueCount: Array.isArray(issues.data) ? issues.data.length : null,
      projectCount: Array.isArray(projects.data) ? projects.data.length : null,
      agentCount: Array.isArray(agents.data) ? agents.data.length : null,
    };
  }
}

const controlTickRun = skipControlTick
  ? null
  : run(process.execPath, ["scripts/run-softwarehouse-control-tick.mjs"], {
    timeoutMs: Number(process.env.SOFTWAREHOUSE_AUTONOMOUS_CYCLE_CONTROL_TICK_TIMEOUT_MS ?? 900_000),
  });
const controlTick = await readJsonIfExists("report/softwarehouse-control-tick.latest.json");
const repositories = {
  Paperclip_Softwarehouse: gitStatusFor(process.cwd()),
  Soar: gitStatusFor(path.join(appsRoot, "Soar")),
  Roost: gitStatusFor(path.join(appsRoot, "Roost")),
  Featherly: gitStatusFor(path.join(appsRoot, "Featherly")),
};

const dispatch = await executeBoundedDispatch({
  company: selectedCompany,
  issues: companyIssues,
  projects: companyProjects,
  agents: companyAgents,
  repositories,
  preliminary: dispatchDecisionFor(controlTick),
});
const validationRun = skipValidation
  ? null
  : run(process.execPath, ["--test", "scripts/softwarehouse-gate-specs.test.mjs"], {
    timeoutMs: Number(process.env.SOFTWAREHOUSE_AUTONOMOUS_CYCLE_VALIDATION_TIMEOUT_MS ?? 120_000),
  });
const validation = skipValidation
  ? {
    ok: true,
    command: "skipped",
    result: null,
  }
  : {
    ok: validationRun?.ok === true,
    command: "node --test scripts/softwarehouse-gate-specs.test.mjs",
    result: summarizeCommand(validationRun),
  };
const release = releaseDecisionFor(controlTick, validation, dispatch);
const monitoring = monitorDecisionFor(release);
const learning = learningFor(controlTick, validation, repositories);

const controlTickHealthy = skipControlTick ? controlTick?.ok === true : controlTickRun?.ok === true && controlTick?.ok === true;
const outcome = controlTickHealthy && validation.ok && ![
  "blocked_by_delivery_permission",
  "project_truth_gap_dispatch_required",
  "no_admissible_product_work_packet",
  "product_intent_reconciliation_owner_missing",
  "product_intent_reconciliation_creation_failed",
  "product_intent_reconciliation_wake_failed",
  "delivery_record_creation_failed",
  "delivery_admission_rejected",
  "delivery_start_failed",
  "agent_dispatch_failed",
].includes(dispatch.action)
  ? "cycle_recorded"
  : "cycle_recorded_with_holds";

const cycle = {
  cycleId,
  generatedAt,
  apiBase,
  companyName,
  outcome,
  controlDecision: controlTick?.controlDecision ?? null,
  effectiveOperatingPosture: controlTick?.effectiveOperatingPosture ?? null,
  phases: {
    preconditions: {
      status: phaseStatus(preflight.paperclipApi.ok, preflight.paperclipApi.ok ? "Paperclip API reachable." : preflight.paperclipApi.error),
      paperclipApi: {
        ok: preflight.paperclipApi.ok,
        status: preflight.paperclipApi.status,
      },
      companySnapshot,
    },
    activityAnalysis: {
      status: phaseStatus(controlTickHealthy, controlTickHealthy ? "Control tick completed and activity snapshot is available." : "Control tick failed or is missing."),
      controlTickRun: summarizeCommand(controlTickRun),
      activeRunCount: controlTick?.activeRunCount ?? null,
      liveRunCount: controlTick?.liveRunCount ?? null,
      sourceControlClean: controlTick?.sourceControlClean ?? null,
      repositories,
    },
    progressEvaluation: {
      status: phaseStatus(Boolean(controlTick), controlTick?.recommendedAction ?? "No control tick recommendation."),
      controlDecision: controlTick?.controlDecision ?? null,
      recommendedAction: controlTick?.recommendedAction ?? null,
      nextControlActions: controlTick?.nextControlActions ?? [],
      deliveryPermission: deliveryPermission(controlTick),
    },
    workDispatch: {
      status: phaseStatus(
        [
          "ready_for_next_paperclip_dispatch",
          "project_truth_gap_dispatched",
          "supervise_existing_project_truth_run",
          "supervise_existing_runs",
          "supervise_product_intent_reconciliation",
          "product_intent_reconciliation_dispatched",
          "bounded_product_delivery_dispatched",
        ].includes(dispatch.action),
        dispatch.reason,
      ),
      ...dispatch,
    },
    validation: {
      status: phaseStatus(validation.ok, validation.ok ? "Validation passed or was explicitly skipped." : "Validation command failed."),
      ...validation,
    },
    release: {
      status: phaseStatus(!["release_blocked", "release_not_allowed"].includes(release.action), release.reason),
      ...release,
    },
    monitoring: {
      status: phaseStatus(monitoring.action !== "monitoring_failed", monitoring.reason),
      ...monitoring,
    },
    selfImprovement: {
      status: phaseStatus(true, "Cycle learning outputs recorded."),
      ...learning,
    },
  },
  learning,
  nextActions: [
    ...(controlTick?.nextControlActions ?? []),
    ...learning.improvementProposals.map((proposal) => proposal.title),
    ...learning.missingCapabilities.map((capability) => `Implement missing capability: ${capability.capability}`),
  ],
};

const dateDir = generatedAt.slice(0, 10);
const cycleDir = path.join("report", "autonomous-cycles", dateDir);
await mkdir(cycleDir, { recursive: true });
await mkdir(path.join("report", "autonomous-cycles"), { recursive: true });
const json = `${JSON.stringify(cycle, null, 2)}\n`;
const markdown = renderMarkdown(cycle);
await writeFile(path.join(cycleDir, `${cycleId}.json`), json);
await writeFile(path.join(cycleDir, `${cycleId}.md`), markdown);
await writeFile(path.join("report", "autonomous-cycles", "latest.json"), json);
await writeFile(path.join("report", "autonomous-cycles", "latest.md"), markdown);

console.log(JSON.stringify(cycle, null, 2));

if (!controlTickHealthy || !validation.ok || outcome === "cycle_recorded_with_holds") {
  process.exitCode = 1;
}
