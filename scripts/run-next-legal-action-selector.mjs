import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const apply = process.argv.includes("--apply");
const outputPathJson = "report/softwarehouse-next-legal-action.latest.json";
const outputPathMd = "report/softwarehouse-next-legal-action.latest.md";
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const fallbackCompanyId = "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const healthTimeoutMs = Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_HEALTH_TIMEOUT_MS ?? 5_000);

const applyCommands = new Map([
  ["start_runnable_work", ["pnpm", ["softwarehouse:local-repair-lane-starter:apply"]]],
  ["start_source_control_closure", ["pnpm", ["softwarehouse:local-repair-lane-starter:apply"]]],
  ["start_blocked_triage", ["pnpm", ["run", "softwarehouse:blocked-triage-lane-starter:apply"]]],
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
    return {
      checked: true,
      ok: true,
      liveRunCount: Array.isArray(liveRuns) ? liveRuns.length : null,
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

export function pickAction(
  control,
  readiness,
  appHealth = { checked: false, ok: true },
  liveRunProbe = { checked: false },
  acceptanceLedger = null,
  governorProbe = { checked: false },
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
  const ledgerReportsDirtySoar = acceptanceCheckBlocks(acceptanceLedger, "soar_source_control_clean");
  const dirtyProject = control?.controlBrief?.dirtyProjects?.[0]
    ?? readiness?.dirtyProjects?.[0]
    ?? (ledgerReportsDirtySoar ? { project: "Soar", source: "soar_acceptance_ledger" } : null);
  const runnableSourceControlGate = [
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
  const inReviewFinding = (control?.auditFindings ?? []).find((finding) =>
    finding.area === "issues" && /in review/i.test(finding.message ?? "")
  );
  if (inReviewFinding) {
    return {
      decision: "repair_in_review_decision_path",
      reason: inReviewFinding.message,
      command: "pnpm softwarehouse:in-review-decision-path",
      allowed: ["name reviewer", "accept/reject/block/delegate decision"],
      forbidden: ["leave narrative-only review"],
    };
  }
  const autonomyGovernor = controlStepSummary(control, "autonomyGovernor");
  const localRepairLaneStarter = controlStepSummary(control, "localRepairLaneStarter");
  const governorDecision = governorProbe?.decision ?? control?.autonomyGovernor?.decision ?? autonomyGovernor?.decision ?? null;
  const governorEligibleRunnableIssues = Number(governorProbe?.counts?.eligibleRunnableIssues ?? governorProbe?.counts?.runnableIssues ?? Number.NaN);
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
  const [executable, args] = command;
  const commandText = `${executable} ${args.join(" ")}`;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
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
  const [control, readiness, acceptanceLedger, appHealth, governorProbe] = await Promise.all([
    readJson("report/softwarehouse-control-tick.latest.json"),
    readJson("report/softwarehouse-readiness-snapshot.latest.json"),
    readJson("report/soar-delivery-acceptance.latest.json"),
    probeAppHealth(),
    Promise.resolve(probeAutonomyGovernor()),
  ]);
  const resolvedCompanyId = resolveCompanyId(control, readiness);
  const liveRunProbeResult = await probeLiveRuns(resolvedCompanyId);

  const output = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    appHealth,
    liveRunProbe: liveRunProbeResult,
    governorProbe,
    action: pickAction(control, readiness, appHealth, liveRunProbeResult, acceptanceLedger, governorProbe),
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
