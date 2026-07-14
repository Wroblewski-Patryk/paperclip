import { spawnSync } from "node:child_process";

import { agentWipBlockerFor, fetchAgentWipState } from "./lib/agent-wip-guard.mjs";
import {
  activeProjectTruthTrackIssues,
  parseProjectTruthSourceItemId,
} from "./lib/project-truth-gap-dispatcher.mjs";
import { findAgentByNameOrAlias } from "./lib/softwarehouse-agent-resolver.mjs";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const authToken = process.env.PAPERCLIP_API_KEY ?? null;
const runId = process.env.PAPERCLIP_RUN_ID ?? null;
const actorAgentId = process.env.PAPERCLIP_AGENT_ID ?? null;
const apply = process.argv.includes("--apply");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_REQUEST_TIMEOUT_MS ?? 30_000);
// Keep the Windows owner workstation responsive by default. Operators on larger
// hosts can opt into broader fan-out through the existing environment override.
const perTrackDispatchDepth = Number(process.env.SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_PER_TRACK_DEPTH ?? 1);
const maxDispatchGaps = Number(process.env.SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_MAX_GAPS ?? (perTrackDispatchDepth * 2));
const terminalStatuses = new Set(["done", "cancelled"]);
const marker = "softwarehouse-project-truth-gap-dispatcher:v1";
const supersededMarker = `${marker}:superseded`;

async function request(method, route, body) {
  return requestJson({
    apiBase,
    method,
    route,
    body,
    timeoutMs: requestTimeoutMs,
    authToken,
    runId,
  });
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) =>
    candidate.name === companyName || candidate.name === "LuckySparrow"
  );
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

function runProjectTruthAudit() {
  const result = spawnSync(process.execPath, ["scripts/check-project-truth-indexes.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Number(process.env.SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_AUDIT_TIMEOUT_MS ?? 180_000),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`project truth audit failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return JSON.parse(result.stdout);
}

function runSourceControlAudit() {
  const result = spawnSync(process.execPath, ["scripts/check-softwarehouse-source-control.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Number(process.env.SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_SOURCE_CONTROL_TIMEOUT_MS ?? 180_000),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`source-control audit failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return JSON.parse(result.stdout);
}

function slugFor(value) {
  return String(value ?? "gap")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "gap";
}

function sourceItemSlug(gap) {
  const sourceItemId = String(gap.sourceItemId ?? "").trim();
  if (sourceItemId) {
    const parts = sourceItemId.split(":").filter(Boolean);
    return slugFor(parts.length >= 2 ? parts[1] : parts[0]);
  }
  const evidence = Array.isArray(gap.evidence) ? gap.evidence.find(Boolean) : null;
  const symbol = String(evidence ?? "").split("#").at(-1);
  return symbol && symbol !== evidence ? slugFor(symbol) : "gap";
}

function issueTitleForGap(gap) {
  const project = gap.project ?? "Project";
  if (gap.kind === "runtime_error" && gap.severity === "critical") {
    return `[${project}][Project Truth][Critical Runtime] Restore production runtime for ${slugFor(gap.userFlow ?? gap.summary ?? "public-probe")}`;
  }
  if (gap.kind === "event_chain_gap") {
    return `[${project}][Project Truth][Event Chain] Complete ${gap.userFlow ?? "unclassified workflow"} chain`;
  }
  if (gap.kind === "app_completion_gap") {
    return `[${project}][Project Truth][App Completion] Prove ${gap.userFlow ?? "unclassified workflow"} ${slugFor(gap.risk ?? gap.summary)} for ${sourceItemSlug(gap)}`;
  }
  return `[${project}][Project Truth] Route ${gap.kind ?? "gap"} ${slugFor(gap.userFlow ?? gap.summary)}`;
}

function ownerNamesForGap(gap) {
  const indexedOwner = String(gap.nextOwner ?? "").trim();
  const indexedOwnerCandidates = indexedOwner
    ? indexedOwner
      .split(/\s*\+\s*|\s*,\s*|\s+and\s+/i)
      .map((name) => name.trim())
      .filter(Boolean)
    : [];
  if (gap.kind === "runtime_error" && gap.severity === "critical") {
    return [...indexedOwnerCandidates, "Deployment & Reliability Engineer", "Deployment and Reliability Engineer", "Ops Release Lead", "CTO Architect"];
  }
  if (gap.kind === "event_chain_gap") {
    return [...indexedOwnerCandidates, "Technical Solution Architect", "Engineering Delivery Lead", "Soar Project Manager", "Roost Project Manager"];
  }
  if (gap.kind === "app_completion_gap") {
    const risk = String(gap.risk ?? "");
    if (risk === "needs_browser_review") {
      return [...indexedOwnerCandidates, "QA Regression Lead", "Frontend Experience Lead", "UX Designer", `${gap.project} Project Manager`];
    }
    if (risk === "missing_test_link" || risk === "implemented_needs_proof") {
      return [...indexedOwnerCandidates, "Test Automation Engineer", "QA Regression Lead", `${gap.project} Project Manager`];
    }
    if (risk === "missing_doc_link") {
      return [...indexedOwnerCandidates, "Docs Memory Lead", `${gap.project} Project Manager`];
    }
    return [...indexedOwnerCandidates, `${gap.project} Project Manager`, "Engineering Delivery Lead", "QA Regression Lead"];
  }
  if (/docs|documentation/i.test(gap.kind ?? "")) {
    return [...indexedOwnerCandidates, "Docs Memory Lead", "Documentation Steward"];
  }
  return [...indexedOwnerCandidates, `${gap.project} Project Manager`, "Engineering Delivery Lead", "CTO Architect"];
}

function projectGoalTitles(project) {
  return [
    `${project} V1 audit-to-completion loop`,
    `${project}: sellable or personally excellent product`,
    `${project} known-state baseline`,
  ];
}

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

function identifierNumber(identifier) {
  const match = String(identifier ?? "").match(/(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function canonicalExistingIssue(title, issues) {
  const exactTitleIssues = issues
    .filter((issue) => issue.title === title && !issue.hiddenAt);
  return exactTitleIssues
    .filter((issue) => !terminalStatuses.has(issue.status))
    .sort((a, b) => identifierNumber(a.identifier) - identifierNumber(b.identifier))
    .at(0) ?? null;
}

async function findExistingIssueByTitle(companyId, title, initialIssues) {
  const searched = await request(
    "GET",
    `/api/companies/${companyId}/issues?q=${encodeURIComponent(title)}&limit=25`,
  );
  return canonicalExistingIssue(title, [...initialIssues, ...searched]);
}

async function findExistingIssueBySourceItemId(companyId, sourceItemId, initialIssues) {
  if (!sourceItemId) return null;
  const normalized = String(sourceItemId).trim();
  const localMatch = initialIssues
    .filter((issue) => !terminalStatuses.has(issue.status))
    .find((issue) => parseProjectTruthSourceItemId(issue) === normalized) ?? null;
  if (localMatch) return localMatch;
  const searched = await request(
    "GET",
    `/api/companies/${companyId}/issues?q=${encodeURIComponent(normalized)}&limit=25`,
  );
  return searched
    .filter((issue) => !terminalStatuses.has(issue.status))
    .find((issue) => parseProjectTruthSourceItemId(issue) === normalized) ?? null;
}

function relatedRuntimeProbeTerms(gap) {
  if (gap.kind !== "runtime_error" || gap.severity !== "critical") return [];
  const summary = String(gap.summary ?? "").toLowerCase();
  const terms = [];
  if (/public|probe|build-info|ready|health|401|503|runtime|production/.test(summary)) {
    terms.push("public runtime probe", "build-info", "api_ready", "ready", "401", "production runtime");
  }
  return terms;
}

function relatedExistingIssue(gap, issues) {
  const project = String(gap.project ?? "");
  const terms = relatedRuntimeProbeTerms(gap);
  if (terms.length === 0) return null;
  return issues
    .filter((issue) => !terminalStatuses.has(issue.status))
    .filter((issue) => String(issue.title ?? "").includes(`[${project}][Project Truth]`))
    .filter((issue) => {
      const text = `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
      const isRuntimeIssue = String(issue.title ?? "").includes("[Critical Runtime]")
        || text.includes("kind: runtime_error");
      if (!isRuntimeIssue) return false;
      return terms.some((term) => text.includes(term));
    })
    .sort((a, b) => identifierNumber(a.identifier) - identifierNumber(b.identifier))
    .at(0) ?? null;
}

async function findExistingIssueForGap(companyId, title, gap, initialIssues) {
  const bySourceItem = await findExistingIssueBySourceItemId(companyId, gap.sourceItemId, initialIssues);
  if (bySourceItem) return bySourceItem;
  const exact = await findExistingIssueByTitle(companyId, title, initialIssues);
  if (exact) return exact;
  const relatedTerms = relatedRuntimeProbeTerms(gap);
  if (relatedTerms.length === 0) return null;
  const searched = await request(
    "GET",
    `/api/companies/${companyId}/issues?q=${encodeURIComponent(`[${gap.project}][Project Truth]`)}&limit=50`,
  );
  return relatedExistingIssue(gap, [...initialIssues, ...searched]);
}

function findProject(projects, name) {
  const aliases = {
    Soar: ["Soar", "11 Innovation: Soar"],
    Roost: ["Roost", "11 Innovation: Roost"],
    "Softwarehouse Operating System": ["Softwarehouse Operating System", "00 General: Softwarehouse"],
  }[name] ?? [name];
  return projects.find((project) => aliases.includes(project.name) && !project.archivedAt) ?? null;
}

function findOwner(agents, gap) {
  for (const name of ownerNamesForGap(gap)) {
    const agent = findAgentByNameOrAlias(agents, name);
    if (agent) return agent;
  }
  return null;
}

async function ensureLabel(companyId, labelsByName, name, color) {
  const existing = labelsByName.get(name);
  if (existing) return existing;
  const created = await request("POST", `/api/companies/${companyId}/labels`, { name, color });
  labelsByName.set(name, created);
  return created;
}

function descriptionForGap(gap, audit) {
  const project = gap.project ?? "Project";
  const projectSummary = (audit.projects ?? []).find((item) => item.name === project);
  const isCriticalRuntime = gap.kind === "runtime_error" && gap.severity === "critical";
  return [
    marker,
    "",
    `Indexed project truth found the next required ${project} gap. This is not an advisory note; it is the dispatch point for the autonomous delivery chain.`,
    "",
    "Gap:",
    `- kind: ${gap.kind ?? "unknown"}`,
    `- severity: ${gap.severity ?? "unknown"}`,
    `- userFlow: ${gap.userFlow ?? "n/a"}`,
    `- summary: ${String(gap.summary ?? "").trim() || "n/a"}`,
    `- source item: ${gap.sourceItemId ?? "n/a"}`,
    `- indexed owner: ${gap.nextOwner ?? "n/a"}`,
    `- indexed next action: ${gap.nextAction ?? "n/a"}`,
    "",
    "Truth inputs:",
    `- project truth index: ${project}/docs/status/project-truth-index.json`,
    `- event-chain index: ${project}/docs/status/event-chain-index.json`,
    `- runtime-error index: ${project}/docs/status/runtime-error-index.json`,
    `- operational-readiness index: ${project}/docs/status/operational-readiness-index.json`,
    `- audit totals: totalGaps=${audit.summary?.totalGaps ?? "unknown"}, criticalRuntimeFindings=${audit.summary?.criticalRuntimeFindings ?? "unknown"}, incompleteEventChains=${audit.summary?.incompleteEventChains ?? "unknown"}`,
    projectSummary?.publicProbe?.summary ? `- public probe: ${String(projectSummary.publicProbe.summary).trim()}` : "",
    "",
    "Required autonomous chain:",
    "1. Diagnose the indexed gap using project indexes and current runtime evidence.",
    "2. If a code/config fix is needed, create or update the smallest owner-scoped repair issue with affected files, acceptance criteria, and validation command.",
    "3. If verification is needed, hand off to QA/Test Automation with the exact failing command or smoke route.",
    "4. If docs/indexes changed or new truth was found, hand off to Docs Memory with exact files/indexes to update.",
    "5. If local changes pass verification, route source-control closure with commit/no-commit evidence.",
    "6. If push/deploy/redeploy is required, route Ops release/deploy with SHA/resource/rollback/smoke proof.",
    "7. If Coolify/VPS did not redeploy or runtime stays down, create the next recovery issue with observed provider/resource/log evidence.",
    "",
    "Closure contract references:",
    "- docs/softwarehouse/05-definition-of-done.md",
    "- docs/softwarehouse/06-quality-gates.md",
    "- docs/softwarehouse/local-first-shippable-gate-bundle.md",
    "",
    "Required closure packet on this lane:",
    "- affected files list, or an explicit `no files changed` statement;",
    "- exact verification commands/results, or the explicit missing-proof blocker;",
    "- inspectable artifact/work-product links when evidence lives in workspace files, screenshots, logs, or generated reports;",
    "- local commit SHA, or an exact no-commit blocker plus linked open source-control closure sidecar/owner issue when the repo stays dirty;",
    "- push status and deploy impact;",
    "- residual risk and next owner.",
    "",
    isCriticalRuntime
      ? "Critical runtime rule: do not stop at `blocked` just because production is down. Perform read-only Coolify/VPS/runtime diagnosis when credentials are available. If restart/redeploy/rollback/DNS/proxy mutation is required, create the exact mutation permit or recovery issue and keep the chain alive until production health is proven or a concrete permission gate is the only remaining blocker."
      : gap.kind === "app_completion_gap"
        ? "App-completion rule: do not claim a user-facing flow works until the indexed frontend/backend/worker/data/test/docs/browser evidence is present, or the missing proof is delegated to the exact owner with a verification command or browser artifact requirement."
      : "Event-chain rule: do not claim readiness until frontend, backend, worker/data, tests, docs, and ownership links are represented in the index or an explicit deferral is recorded.",
    "",
    "Forbidden without an explicit release/prod permit:",
    "- secret disclosure;",
    "- live trading/account mutation;",
    "- production restart, deploy, rollback, DNS edit, or provider mutation;",
    "- push without source-control closure and branch/remote intent.",
    "",
    "Definition of done:",
    "- the gap has a current root-cause or implementation diagnosis with evidence;",
    "- the next owner issue exists for any required repair/test/docs/source-control/deploy-monitor step;",
    "- the issue state matches reality: done only with proof, blocked only with a named next owner/action, delegated only with a child issue;",
    "- project truth indexes are refreshed or a Docs Memory follow-up is open;",
    "- for runtime gaps, production/local parity is either restored with smoke proof or the remaining provider/permission blocker is exact and assigned.",
  ].filter(Boolean).join("\n");
}

function activeRunSummary({ health, liveRuns }) {
  const activeRunCount = health.devServer?.activeRunCount ?? liveRuns.length;
  return {
    activeRunCount,
    liveRunCount: liveRuns.length,
  };
}

function activeConflictForCreatedIssue(created, wip) {
  return agentWipBlockerFor(created.assigneeAgentId, wip);
}

function directWakeBoundaryForAgent(agentId) {
  if (!authToken) return null;
  if (!actorAgentId) return null;
  if (actorAgentId === agentId) return null;
  return "cross_agent_direct_invoke_forbidden";
}

function severityRank(gap) {
  if (gap?.severity === "critical") return 0;
  if (gap?.severity === "high") return 1;
  if (gap?.severity === "medium") return 2;
  return 3;
}

function dispatchableGaps(audit) {
  return (audit.projects ?? [])
    .map((project) => ({
      project: project.name,
      gaps: Array.isArray(project.projectTruth?.gaps)
        ? project.projectTruth.gaps.map((gap) => ({ project: project.name, ...gap }))
        : [],
    }))
    .filter((project) => project.gaps.length > 0)
    .sort((left, right) => String(left.project).localeCompare(String(right.project)));
}

function isProjectTruthIssue(issue) {
  return String(issue.title ?? "").includes("[Project Truth]")
    && String(issue.description ?? "").includes(marker);
}

function supersededCommentForIssue(issue, currentTitles) {
  return [
    supersededMarker,
    "",
    "This project-truth issue was created from an older first-gap snapshot and is no longer one of the current dispatchable first gaps.",
    "",
    `Superseded issue: ${issue.identifier ?? issue.id} ${issue.title}`,
    "",
    "Current dispatchable project-truth issue titles:",
    ...[...currentTitles].map((title) => `- ${title}`),
    "",
    "Owner action: stop treating this issue as the active first-gap lane. Recheck the current project-truth index and continue only through the current dispatcher-created issue, or leave a comment with evidence if this older gap is still independently valid.",
  ].join("\n");
}

const actions = [];
let audit;
let sourceControl;
try {
  audit = runProjectTruthAudit();
  sourceControl = runSourceControlAudit();
} catch (error) {
  console.log(JSON.stringify({
    apiBase,
    mode: apply ? "apply" : "dry-run",
    ok: false,
    actions: [{
      action: "noop_project_truth_or_source_control_audit_failed",
      error: error instanceof Error ? error.message : String(error),
    }],
  }, null, 2));
  process.exit(0);
}

const gapsToDispatch = dispatchableGaps(audit);
const firstGap = gapsToDispatch.flatMap((project) => project.gaps).find((gap) => gap.severity === "critical")
  ?? gapsToDispatch.flatMap((project) => project.gaps)[0]
  ?? audit.firstGap
  ?? null;
const currentDispatchTitles = new Set();
if (gapsToDispatch.length === 0) {
  console.log(JSON.stringify({
    apiBase,
    mode: apply ? "apply" : "dry-run",
    ok: true,
    projectTruth: audit.summary ?? {},
    actions: [{ action: "noop_no_project_truth_gap" }],
  }, null, 2));
  process.exit(0);
}

let company;
let health;
let projects;
let agents;
let goals;
let labels;
let issues;
let projectTruthIssues;
let liveRuns;
try {
  company = await resolveCompany();
  [health, projects, agents, goals, labels, issues, projectTruthIssues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/goals`),
    request("GET", `/api/companies/${company.id}/labels`),
    request("GET", `/api/companies/${company.id}/issues?limit=1000`),
    request("GET", `/api/companies/${company.id}/issues?q=${encodeURIComponent("[Project Truth]")}&limit=200`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
} catch (error) {
  console.log(JSON.stringify({
    apiBase,
    mode: apply ? "apply" : "dry-run",
    ok: false,
    projectTruth: audit.summary ?? {},
    actions: [{
      action: isRequestTimeoutError(error) ? "noop_api_timeout" : "noop_api_error",
      error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      ownerAction: "Restore Paperclip API responsiveness, then rerun project truth gap dispatch.",
    }],
  }, null, 2));
  process.exit(0);
}

const labelsByName = new Map(labels.map((label) => [label.name, label]));
const wip = apply ? await fetchAgentWipState({ request, companyId: company.id }) : null;
const liveIssueIds = new Set(liveRuns.map((run) => run.issueId).filter(Boolean));
const dirtyDispatchProjects = new Map(
  (sourceControl.repos ?? [])
    .filter((repo) => repo.parked !== true && repo.clean === false)
    .filter((repo) => ["Soar", "Roost"].includes(repo.name))
    .map((repo) => [repo.name, repo]),
);
const retainedDispatchTitles = new Set();
const retainedDispatchIds = new Set();
const trackPlans = [];
let plannedDispatchCount = 0;

for (const projectGapSet of gapsToDispatch) {
  const projectName = projectGapSet.project;
  const project = findProject(projects, projectName);
  if (!project) {
    actions.push({
      action: "noop_project_not_found",
      project: projectName,
    });
    continue;
  }
  const dirtyProjectRepo = dirtyDispatchProjects.get(projectName);
  if (dirtyProjectRepo) {
    const action = {
      action: "noop_project_repo_dirty_source_control_closure_required",
      project: projectName,
      dirtyCount: dirtyProjectRepo.dirtyCount ?? null,
      head: dirtyProjectRepo.head ?? null,
      ownerAction: `Route ${projectName} through one local source-control closure before dispatching another project-truth gap.`,
    };
    actions.push(action);
    trackPlans.push({
      project: projectName,
      targetDepth: perTrackDispatchDepth,
      startingActiveDepth: 0,
      resultingPlannedDepth: 0,
      indexedGapCount: projectGapSet.gaps.length,
      activeIssueIdentifiers: [],
      actions: [action],
      missingDepthReasons: [{
        reason: "source_control_closure_required",
        dirtyCount: dirtyProjectRepo.dirtyCount ?? null,
      }],
    });
    continue;
  }
  const goal = projectGoalTitles(projectName)
    .map((goalTitle) => byTitle(goals, goalTitle))
    .find(Boolean) ?? null;
  const activeTrackIssues = activeProjectTruthTrackIssues({
    projectName,
    issues,
    projects,
    marker,
    terminalStatuses,
  });
  for (const issue of activeTrackIssues) {
    retainedDispatchTitles.add(issue.title);
    retainedDispatchIds.add(issue.id);
  }

  let trackDepth = activeTrackIssues.length;
  const projectActionsStart = actions.length;
  const missingDepthReasons = [];
  for (const gap of projectGapSet.gaps) {
    if (trackDepth >= perTrackDispatchDepth || plannedDispatchCount >= maxDispatchGaps) break;
    const title = issueTitleForGap(gap);
    currentDispatchTitles.add(title);
    const assignee = findOwner(agents, gap);
    if (!assignee) {
      missingDepthReasons.push({
        reason: "no_owner",
        title,
        ownerCandidates: ownerNamesForGap(gap),
      });
      actions.push({
        action: "noop_assignee_not_found",
        project: gap.project,
        ownerCandidates: ownerNamesForGap(gap),
        title,
      });
      continue;
    }
    const existing = await findExistingIssueForGap(company.id, title, gap, issues);
    if (existing) {
      retainedDispatchTitles.add(existing.title);
      retainedDispatchIds.add(existing.id);
      actions.push({
        action: "kept_existing_project_truth_gap_issue",
        identifier: existing.identifier,
        status: existing.status,
        title: existing.title,
        project: gap.project,
        assignee: agents.find((agent) => agent.id === existing.assigneeAgentId)?.name ?? null,
      });
      if (["backlog", "todo", "in_progress", "in_review"].includes(existing.status)) {
        trackDepth += 1;
      } else {
        missingDepthReasons.push({
          reason: "existing_issue_not_active_queue_lane",
          identifier: existing.identifier,
          status: existing.status,
          title: existing.title,
        });
      }
      continue;
    }

    actions.push({
      action: apply ? "create_project_truth_gap_issue" : "would_create_project_truth_gap_issue",
      project: gap.project,
      title,
      assignee: assignee.name,
      gap,
      trackDepthBefore: trackDepth,
      trackDepthTarget: perTrackDispatchDepth,
    });

    if (apply) {
      for (const [name, color] of [
        [String(gap.project).toLowerCase(), "#0f766e"],
        ["project-truth", "#7c3aed"],
        ["runtime", "#dc2626"],
        ["ops", "#0369a1"],
        ["architecture", "#475569"],
      ]) {
        await ensureLabel(company.id, labelsByName, name, color);
      }
      const labelNames = [
        String(gap.project).toLowerCase(),
        "project-truth",
        gap.kind === "event_chain_gap" ? "architecture" : "runtime",
        gap.kind === "runtime_error" ? "ops" : "architecture",
      ];
      const created = await request("POST", `/api/companies/${company.id}/issues`, {
        title,
        description: descriptionForGap(gap, audit),
        status: "todo",
        priority: gap.severity === "critical" ? "critical" : "high",
        assigneeAgentId: assignee.id,
        projectId: project.id,
        goalId: goal?.id ?? null,
        requestDepth: 2,
        labelIds: labelNames
          .map((name) => labelsByName.get(name)?.id)
          .filter(Boolean),
        executionWorkspacePreference: "shared_workspace",
        acceptanceCriteria: [
          "Diagnosis names the affected indexed flow, layer, service, endpoint, or provider resource.",
          "A required code/config repair is delegated to the smallest owner-scoped issue with validation commands.",
          "A required verification step is delegated to QA/Test Automation with expected evidence.",
          "Docs/status/project truth indexes are refreshed or a Docs Memory follow-up exists.",
          "Source-control, push, deploy, redeploy, and monitoring steps are each routed to the proper owner when needed.",
          "Final closure records the affected files, exact verification commands/results, inspectable artifact or work-product links when applicable, commit SHA or exact no-commit/source-control-sidecar evidence, push status, deploy impact, residual risk, and next owner.",
          "If the lane leaves repo changes uncommitted, it does not close done without a linked open source-control closure sidecar or exact no-commit blocker.",
          "For runtime findings, production health is restored with smoke proof or an exact remaining provider/permission blocker is assigned.",
        ],
      });
      const wakeBlocker = activeConflictForCreatedIssue(created, wip);
      const wakeBoundary = directWakeBoundaryForAgent(created.assigneeAgentId);
      const wakeSkipped = wakeBlocker ?? wakeBoundary;
      if (!wakeSkipped) {
        await request("POST", `/api/agents/${created.assigneeAgentId}/heartbeat/invoke?companyId=${company.id}`, {
          reason: "issue_assigned",
          payload: {
            issueId: created.id,
            taskId: created.id,
            taskKey: created.identifier,
            source: "softwarehouse-project-truth-gap-dispatcher",
          },
          idempotencyKey: `softwarehouse-project-truth-gap-dispatcher:${created.id}:${created.updatedAt ?? Date.now()}`,
        });
      }
      actions.at(-1).identifier = created.identifier;
      actions.at(-1).status = created.status;
      actions.at(-1).wakeSkipped = wakeSkipped;
      actions.at(-1).handoff = wakeBoundary
        ? "created_todo_issue_for_assignee_without_cross_agent_direct_invoke"
        : "direct_wake_allowed_or_guarded";
      actions.at(-1).activeRunCount = wip?.activeRunCount ?? null;
      actions.at(-1).liveRunCount = wip?.liveRunCount ?? null;
      retainedDispatchTitles.add(created.title);
      retainedDispatchIds.add(created.id);
    }
    trackDepth += 1;
    plannedDispatchCount += 1;
  }

  const createdOrKeptActions = actions.slice(projectActionsStart);
  trackPlans.push({
    project: projectName,
    targetDepth: perTrackDispatchDepth,
    startingActiveDepth: activeTrackIssues.length,
    resultingPlannedDepth: trackDepth,
    indexedGapCount: projectGapSet.gaps.length,
    activeIssueIdentifiers: activeTrackIssues.map((issue) => issue.identifier ?? issue.id),
    actions: createdOrKeptActions.map((action) => ({
      action: action.action,
      identifier: action.identifier ?? null,
      status: action.status ?? null,
      title: action.title ?? null,
    })),
    missingDepthReasons,
  });

  if (trackDepth < perTrackDispatchDepth) {
    actions.push({
      action: "track_dispatch_depth_shortfall",
      project: projectName,
      targetDepth: perTrackDispatchDepth,
      resultingPlannedDepth: trackDepth,
      indexedGapCount: projectGapSet.gaps.length,
      missingDepthReasons,
    });
  }
}

const supersededProjectTruthCandidates = issues
  .concat(projectTruthIssues)
  .filter((issue) => !terminalStatuses.has(issue.status))
  .filter(isProjectTruthIssue)
  .filter((issue) => ![...dirtyDispatchProjects.keys()].some((projectName) =>
    String(issue.title ?? "").includes(`[${projectName}]`)
  ))
  .filter((issue) => !String(issue.description ?? "").includes(supersededMarker))
  .filter((issue) => !retainedDispatchIds.has(issue.id))
  .filter((issue) => !retainedDispatchTitles.has(issue.title))
  .filter((issue) => !currentDispatchTitles.has(issue.title))
  .filter((issue, index, all) => all.findIndex((candidate) => candidate.id === issue.id) === index);
const supersededProjectTruthIssues = [];
for (const issue of supersededProjectTruthCandidates) {
  let comments = [];
  try {
    comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=12`);
  } catch {
    comments = [];
  }
  if (comments.some((comment) => String(comment.body ?? "").includes(supersededMarker))) continue;
  supersededProjectTruthIssues.push(issue);
}

for (const issue of supersededProjectTruthIssues) {
  const hasLiveRun = liveIssueIds.has(issue.id);
  actions.push({
    action: apply ? "mark_superseded_project_truth_gap_issue" : "would_mark_superseded_project_truth_gap_issue",
    identifier: issue.identifier,
    status: issue.status,
    title: issue.title,
    hasLiveRun,
    targetStatus: hasLiveRun ? issue.status : "blocked",
  });

  if (apply) {
    const existingDescription = String(issue.description ?? "");
    await request("POST", `/api/issues/${issue.id}/comments`, {
      body: supersededCommentForIssue(issue, currentDispatchTitles),
    });
    await request("PATCH", `/api/issues/${issue.id}`, {
      description: existingDescription.includes(supersededMarker)
        ? existingDescription
        : `${existingDescription.trimEnd()}\n\n${supersededCommentForIssue(issue, currentDispatchTitles)}`,
    });
    if (!hasLiveRun && issue.status !== "blocked") {
      await request("PATCH", `/api/issues/${issue.id}`, {
        status: "blocked",
      });
    }
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  ok: true,
  ...activeRunSummary({ health, liveRuns }),
  projectTruth: audit.summary ?? {},
  sourceControl: {
    dirtyDispatchProjects: [...dirtyDispatchProjects.values()].map((repo) => ({
      name: repo.name,
      head: repo.head ?? null,
      dirtyCount: repo.dirtyCount ?? null,
    })),
  },
  perTrackDispatchDepth,
  trackPlans,
  maxDispatchGaps,
  firstGap,
  gapsToDispatch,
  actions,
}, null, 2));
