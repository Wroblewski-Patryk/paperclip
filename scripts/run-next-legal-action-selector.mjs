import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const apply = process.argv.includes("--apply");
const outputPathJson = "report/softwarehouse-next-legal-action.latest.json";
const outputPathMd = "report/softwarehouse-next-legal-action.latest.md";
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const fallbackCompanyId = "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const healthTimeoutMs = Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_HEALTH_TIMEOUT_MS ?? 5_000);
const currentRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const currentIssueId = process.env.PAPERCLIP_ISSUE_ID ?? process.env.PAPERCLIP_TASK_ID ?? null;
const safeOperatingSourceControlGroups = new Set([
  "project-docs",
  "history-evidence",
  "codex-context",
  "agent-state",
]);

const applyCommands = new Map([
  ["assign_runnable_work_owner", { executable: "node", args: ["scripts/run-project-ownership-assignment.mjs", "--apply"] }],
  ["start_runnable_work", { executable: "pnpm", args: ["softwarehouse:local-repair-lane-starter:apply"] }],
  ["start_source_control_closure", { executable: "pnpm", args: ["softwarehouse:local-repair-lane-starter:apply"] }],
  [
    "start_operating_source_control_closure",
    {
      executable: process.execPath,
      args: ["scripts/run-local-repair-lane-starter.mjs", "--apply"],
      env: { SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS: "Softwarehouse Operating System" },
    },
  ],
  ["start_project_truth_gap", { executable: "pnpm", args: ["softwarehouse:project-truth-dispatch:apply"] }],
  ["start_blocked_triage", { executable: "pnpm", args: ["run", "softwarehouse:blocked-triage-lane-starter:apply"] }],
]);

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function isRunnableSourceControlGate(gate) {
  if (!gate) return false;
  if (gate.status === "blocked" || gate.status === "cancelled" || gate.status === "done") return false;
  const unresolvedBlockers = Number(gate.blockerAttention?.unresolvedBlockerCount ?? 0);
  const attentionBlockers = Number(gate.blockerAttention?.attentionBlockerCount ?? 0);
  return unresolvedBlockers === 0 && attentionBlockers === 0;
}

async function probeAppHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), healthTimeoutMs);
  try {
    const response = await fetch(`${apiBase}/api/health`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    return {
      checked: true,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveCompanyId(control, readiness) {
  return (
    process.env.SOFTWAREHOUSE_COMPANY_ID ??
    control?.company?.id ??
    control?.operatorActionPacket?.company?.id ??
    readiness?.company?.id ??
    fallbackCompanyId
  );
}

async function probeLiveRuns(companyId) {
  try {
    const response = await fetch(`${apiBase}/api/companies/${companyId}/live-runs?limit=50&minCount=0`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return {
        checked: true,
        ok: false,
        status: response.status,
        liveRunCount: null,
      };
    }
    const data = await response.json();
    const liveRuns = Array.isArray(data) ? data : data.runs ?? data.liveRuns ?? [];
    const normalizedLiveRuns = Array.isArray(liveRuns)
      ? liveRuns.map((run) => ({
          id: run.id,
          issueId: run.issueId ?? null,
          issueIdentifier: run.issueIdentifier ?? null,
        }))
      : [];
    const selfRuns = normalizedLiveRuns.filter(
      (run) =>
        (currentRunId && run.id === currentRunId) ||
        (currentIssueId && run.issueId === currentIssueId) ||
        (currentIssueId && run.issueIdentifier === currentIssueId),
    );
    const selfRunSet = new Set(selfRuns);
    const externalLiveRuns = normalizedLiveRuns.filter((run) => !selfRunSet.has(run));
    return {
      checked: true,
      ok: true,
      observedLiveRunCount: normalizedLiveRuns.length,
      ignoredSelfRunCount: selfRuns.length,
      liveRunCount: externalLiveRuns.length,
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      error: String(error?.message ?? error),
      liveRunCount: null,
    };
  }
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function probeAutonomyGovernor() {
  const result = spawnSync(process.execPath, ["scripts/run-autonomy-governor.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_GOVERNOR_TIMEOUT_MS ?? 60_000),
  });
  const parsed = result.status === 0 && !result.error ? parseJsonOutput(result.stdout) : null;
  return {
    checked: true,
    ok: result.status === 0 && !result.error && Boolean(parsed),
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message ?? result.error) : null,
    stderr: String(result.stderr ?? "").slice(0, 2_000),
    decision: parsed?.decision ?? null,
    operatingPosture: parsed?.operatingPosture ?? null,
    counts: parsed?.counts ?? null,
    recommendedAction: parsed?.recommendedAction ?? null,
  };
}

function probeSourceControl() {
  const result = spawnSync(process.execPath, ["scripts/check-softwarehouse-source-control.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_SOURCE_CONTROL_TIMEOUT_MS ?? 60_000),
  });
  const parsed = result.status === 0 && !result.error ? parseJsonOutput(result.stdout) : null;
  return {
    checked: true,
    ok: result.status === 0 && !result.error && Boolean(parsed),
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message ?? result.error) : null,
    stderr: String(result.stderr ?? "").slice(0, 2_000),
    clean: parsed?.clean ?? null,
    repos: Array.isArray(parsed?.repos)
      ? parsed.repos.map((repo) => ({
          name: repo.name,
          clean: repo.clean,
          dirtyCount: repo.dirtyCount,
          required: repo.required,
          sourceControlClosureLanes: repo.sourceControlClosureLanes ?? [],
        }))
      : [],
  };
}

function acceptanceCheck(acceptanceLedger, id) {
  return (acceptanceLedger?.checks ?? []).find((check) => check.id === id) ?? null;
}

function acceptanceCheckBlocks(acceptanceLedger, id) {
  const check = acceptanceCheck(acceptanceLedger, id);
  return check && ["blocker", "fail", "missing", "unknown"].includes(check.status);
}

function controlStepSummary(control, name) {
  if (!Array.isArray(control?.steps)) return null;
  return control.steps.find((step) => step?.name === name)?.summary ?? null;
}

function isSafeOperatingSourceControlClosure(repo) {
  const lanes = repo?.sourceControlClosureLanes ?? [];
  return Boolean(
    repo?.required
      && repo.clean === false
      && lanes.length > 0
      && lanes.every((lane) =>
        lane?.status === "os_closure_allowed"
        && safeOperatingSourceControlGroups.has(lane?.group),
      ),
  );
}

export function pickAction(
  control,
  readiness,
  appHealth = { checked: false, ok: true },
  liveRunProbe = { checked: false },
  acceptanceLedger = null,
  governorProbe = { checked: false },
  sourceControlProbe = { checked: false },
) {
  const reportedActiveRunCount = Number(control?.activeRunCount ?? readiness?.activeRunCount ?? 0);
  const activeRunCount =
    appHealth.ok && liveRunProbe?.checked && liveRunProbe.ok && liveRunProbe.liveRunCount != null
      ? Number(liveRunProbe.liveRunCount)
      : reportedActiveRunCount;
  if (appHealth.checked && !appHealth.ok) {
    return {
      decision: "repair_local_paperclip_liveness",
      reason: "The local Paperclip API is unreachable, so cached active-run reports are not enough to justify supervision.",
      command: "pnpm dev:list",
      allowed: ["inspect local Paperclip owner process", "capture port-binding evidence", "refresh reports after the app is reachable again"],
      forbidden: ["restart", "push", "deploy", "start duplicate owner lane"],
    };
  }
  if (activeRunCount > 0) {
    return {
      decision: "supervise_active_runs",
      reason: "A live run exists; starting duplicate work would hide truth.",
      command: "pnpm softwarehouse:control-tick",
      allowed: ["supervise live run", "close stale tails", "refresh reports"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart"],
    };
  }
  const freshSourceControlRepos = sourceControlProbe?.checked && sourceControlProbe.ok
    ? (sourceControlProbe.repos ?? [])
    : null;
  const freshOperatingDirtyRepo = freshSourceControlRepos?.find((repo) => repo.required && !repo.clean) ?? null;
  const freshProjectDirtyRepo = freshSourceControlRepos?.find((repo) => !repo.required && !repo.clean) ?? null;
  const freshGovernorSourceControlClean =
    governorProbe?.checked
    && governorProbe.ok
    && Number(governorProbe?.counts?.dirtyProjectRepos ?? 0) === 0
    && Number(governorProbe?.counts?.dirtyOperatingRepos ?? 0) === 0;
  if (isSafeOperatingSourceControlClosure(freshOperatingDirtyRepo)) {
    return {
      decision: "start_operating_source_control_closure",
      reason: "Paperclip has only safe documentation/state closure work; route one explicit OS source-control lane before returning to project delivery.",
      command: "node scripts/run-local-repair-lane-starter.mjs --apply (SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS=Softwarehouse Operating System)",
      target: freshOperatingDirtyRepo.name,
      allowed: ["classify local docs/state evidence", "run diff validation", "make one local commit when evidence supports closure"],
      forbidden: ["push", "deploy", "restart", "protected smoke", "secret disclosure", "mix product-repo changes"],
    };
  }
  if (freshOperatingDirtyRepo) {
    return {
      decision: "refresh_control_tick",
      reason: "The Paperclip operating repo has local changes; refresh control evidence and close OS source-control before starting delivery work.",
      command: "pnpm softwarehouse:control-tick",
      target: freshOperatingDirtyRepo.name,
      allowed: ["refresh reports", "classify operating repo changes", "commit or explicitly close OS source-control state"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart"],
    };
  }
  const ledgerReportsDirtySoar =
    !freshGovernorSourceControlClean && acceptanceCheckBlocks(acceptanceLedger, "soar_source_control_clean");
  const staleDirtyProject = control?.controlBrief?.dirtyProjects?.[0]
    ?? readiness?.dirtyProjects?.[0]
    ?? (ledgerReportsDirtySoar ? { project: "Soar", source: "soar_acceptance_ledger" } : null);
  const dirtyProject = freshSourceControlRepos
    ? (freshProjectDirtyRepo ? { project: freshProjectDirtyRepo.name, source: "fresh_source_control_probe" } : null)
    : freshGovernorSourceControlClean
    ? null
    : staleDirtyProject;
  const runnableSourceControlGate = [
    ...((freshProjectDirtyRepo?.sourceControlClosureLanes ?? []).map((lane) => ({
      ...lane,
      identifier: freshProjectDirtyRepo.name,
    }))),
    ...(control?.sourceControlGateIssues ?? []),
    ...(readiness?.sourceControlGates ?? []),
  ].find(isRunnableSourceControlGate);
  if (dirtyProject || runnableSourceControlGate) {
    return {
      decision: "start_source_control_closure",
      reason: "Project repositories are dirty and local source-control closure is allowed while protected delivery stays blocked.",
      command: "pnpm softwarehouse:local-repair-lane-starter:apply",
      target: dirtyProject?.project ?? runnableSourceControlGate?.identifier ?? null,
      allowed: ["local diff classification", "local validation", "commit/no-commit decision"],
      forbidden: ["push", "deploy", "restart", "protected smoke", "secret disclosure"],
    };
  }
  if (acceptanceCheckBlocks(acceptanceLedger, "coolify_resources_reconciled")) {
    return {
      decision: "repair_coolify_acceptance_gate",
      reason: acceptanceCheck(acceptanceLedger, "coolify_resources_reconciled")?.reason
        ?? "The Soar acceptance ledger reports an unresolved Coolify resource blocker.",
      command: "pnpm softwarehouse:in-review-decision-path",
      target: "LUC-238",
      allowed: ["review or delegate the existing Coolify recovery gate", "record read-only status evidence", "route safe recovery approval"],
      forbidden: ["push", "deploy", "restart", "secret disclosure", "mark production ready without Coolify evidence"],
    };
  }
  const autonomyGovernor = controlStepSummary(control, "autonomyGovernor");
  const localRepairLaneStarter = controlStepSummary(control, "localRepairLaneStarter");
  const governorDecision = governorProbe?.decision ?? control?.autonomyGovernor?.decision ?? autonomyGovernor?.decision ?? null;
  const governorEligibleRunnableIssues = Number(governorProbe?.counts?.eligibleRunnableIssues ?? governorProbe?.counts?.runnableIssues ?? Number.NaN);
  if (governorProbe?.checked && governorProbe.ok && governorDecision === "runnable_work_assignment_needed") {
    return {
      decision: "assign_runnable_work_owner",
      reason: governorProbe.recommendedAction
        ?? "Runnable work exists, but no current controlled-project issue has both an owner and an execution lane.",
      command: "node scripts/run-project-ownership-assignment.mjs --apply",
      target: "controlled_project_assignment",
      allowed: ["assign one runnable issue to the owning PM", "do not wake duplicate work", "preserve WIP guard"],
      forbidden: ["push", "deploy", "restart", "secret disclosure", "assign broad speculative backlog"],
    };
  }
  if (
    governorProbe?.checked
    && governorProbe.ok
    && governorDecision === "blocked_needs_triage"
    && Number.isFinite(governorEligibleRunnableIssues)
    && governorEligibleRunnableIssues === 0
  ) {
    return {
      decision: "start_blocked_triage",
      reason: governorProbe.recommendedAction
        ?? "Fresh autonomy governor reports blocked_needs_triage and no runnable work; create or recover one blocked-triage lane instead of applying a stale runnable-work snapshot.",
      command: "pnpm run softwarehouse:blocked-triage-lane-starter:apply",
      target: "blocked_triage",
      allowed: ["classify one blocked issue", "write owner/action/evidence", "create or wake at most one narrow follow-up lane"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart", "secret disclosure"],
    };
  }
  const governorRunnableIssues = Number(
    governorProbe?.counts?.eligibleRunnableIssues
      ?? governorProbe?.counts?.runnableIssues
      ?? control?.autonomyGovernor?.counts?.runnableIssues
      ?? autonomyGovernor?.runnableIssues
      ?? control?.counts?.runnableIssues
      ?? 0,
  );
  const localRepairCandidateCount = Number(localRepairLaneStarter?.candidateCount ?? 0);
  const backlogRunnableIssues = Number(
    readiness?.projects?.reduce((total, project) => total + Number(project.runnableIssueCount ?? 0), 0)
      ?? readiness?.runnableIssueCount
      ?? 0,
  );
  if (
    governorDecision === "runnable_work_available"
    || governorRunnableIssues > 0
    || localRepairCandidateCount > 0
    || backlogRunnableIssues > 0
  ) {
    return {
      decision: "start_runnable_work",
      reason: "Runnable project backlog exists and no live run is active; start the next one-owner evidence lane instead of waiting for a later routine.",
      command: "pnpm softwarehouse:local-repair-lane-starter:apply",
      target: governorDecision === "runnable_work_available" ? "governor:runnable_work_available" : "project_backlog",
      allowed: ["wake the highest-priority eligible backlog/todo issue", "keep WIP guard active", "record local validation evidence"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart", "secret disclosure"],
    };
  }
  if (
    control?.controlDecision === "project_truth_gap_routing_needed"
    || control?.effectiveOperatingPosture === "project_truth_repair_allowed"
  ) {
    return {
      decision: "start_project_truth_gap",
      reason: control?.recommendedAction
        ?? "Project truth indexes still contain current delivery gaps; dispatch the smallest owner-scoped proof or repair lane instead of waiting for a later routine.",
      command: "pnpm softwarehouse:project-truth-dispatch:apply",
      target: "project_truth_gap",
      allowed: ["create or wake the smallest project-truth proof/repair lane", "refresh indexes", "record local validation evidence"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart", "protected smoke", "secret disclosure"],
    };
  }
  const inReviewFinding = (control?.auditFindings ?? []).find((finding) =>
    finding.area === "issues" && /in review/i.test(finding.message ?? "")
  );
  const freshGovernorHasNoReviewClosureWork =
    governorProbe?.checked
    && governorProbe.ok
    && Number(governorProbe?.counts?.reviewIssuesWithoutPendingDecision ?? Number.NaN) === 0;
  if (inReviewFinding && !freshGovernorHasNoReviewClosureWork) {
    return {
      decision: "repair_in_review_decision_path",
      reason: inReviewFinding.message,
      command: "pnpm softwarehouse:in-review-decision-path",
      allowed: ["name reviewer", "accept/reject/block/delegate decision"],
      forbidden: ["leave narrative-only review"],
    };
  }
  return {
    decision: "refresh_control_tick",
    reason: "No more specific safe action was selected.",
    command: "pnpm softwarehouse:control-tick",
    allowed: ["refresh reports", "monitor"],
    forbidden: ["invent broad work without evidence"],
  };
}

function renderMarkdown(output) {
  return [
    "# Softwarehouse Next Legal Action",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    `Decision: ${output.action.decision}`,
    "",
    `Reason: ${output.action.reason}`,
    "",
    `Command: \`${output.action.command}\``,
    "",
    "Allowed:",
    ...output.action.allowed.map((item) => `- ${item}`),
    "",
    "Forbidden:",
    ...output.action.forbidden.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function runApplyCommand(action) {
  const command = applyCommands.get(action.decision);
  if (!command) {
    return {
      applied: false,
      reason: "No allowlisted apply command exists for this decision.",
    };
  }
  const { executable, args, env } = command;
  const commandText = `${executable} ${args.join(" ")}`;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_APPLY_TIMEOUT_MS ?? 180_000),
  });
  return {
    applied: result.status === 0 && !result.error,
    command: commandText,
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message ?? result.error) : null,
    stdout: String(result.stdout ?? "").slice(0, 20_000),
    stderr: String(result.stderr ?? "").slice(0, 20_000),
  };
}

async function main() {
  const [control, readiness, acceptanceLedger, appHealth, governorProbe, sourceControlProbe] = await Promise.all([
    readJson("report/softwarehouse-control-tick.latest.json"),
    readJson("report/softwarehouse-readiness-snapshot.latest.json"),
    readJson("report/soar-delivery-acceptance.latest.json"),
    probeAppHealth(),
    Promise.resolve(probeAutonomyGovernor()),
    Promise.resolve(probeSourceControl()),
  ]);
  const resolvedCompanyId = resolveCompanyId(control, readiness);
  const liveRunProbeResult = await probeLiveRuns(resolvedCompanyId);

  const output = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    appHealth,
    liveRunProbe: liveRunProbeResult,
    governorProbe,
    sourceControlProbe,
    action: pickAction(control, readiness, appHealth, liveRunProbeResult, acceptanceLedger, governorProbe, sourceControlProbe),
  };
  if (apply) {
    output.applyResult = runApplyCommand(output.action);
  }

  await mkdir("report", { recursive: true });
  await writeFile(outputPathJson, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(outputPathMd, renderMarkdown(output));
  console.log(JSON.stringify(output, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
