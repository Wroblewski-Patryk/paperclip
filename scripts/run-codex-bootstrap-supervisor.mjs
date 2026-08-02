import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { softwarehouseActiveApplicationProjects } from "./lib/softwarehouse-project-registry.mjs";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const paperclipApiUrl = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const skipControlTick = process.env.CODEX_BOOTSTRAP_SKIP_CONTROL_TICK === "1"
  || process.argv.includes("--skip-control-tick");
const generatedAt = new Date().toISOString();
const freshnessLimitMs = Number(process.env.CODEX_BOOTSTRAP_FRESHNESS_LIMIT_MS ?? 90 * 60 * 1000);

const requiredRetirementChecks = new Set([
  "controlTickHealthy",
  "paperclipOsClean",
  "autonomousCycleEntrypointExists",
  "cycleLedgerExists",
  "cycleLedgerFresh",
  "controlTickFresh",
  "cycleRoutineDocumented",
  "selfImprovementLoopAvailable",
]);

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

async function fetchStatus(route) {
  try {
    const response = await fetch(`${paperclipApiUrl}${route}`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function packageScriptsFor(packageJson) {
  return packageJson?.scripts && typeof packageJson.scripts === "object"
    ? packageJson.scripts
    : {};
}

function statusLinesForRepo(repoPath) {
  if (!existsSync(repoPath)) {
    return {
      exists: false,
      clean: null,
      lines: [],
      error: "Repository path does not exist.",
    };
  }
  const status = run("git", ["status", "--short"], { cwd: repoPath, timeoutMs: 60_000 });
  if (!status.ok) {
    return {
      exists: true,
      clean: null,
      lines: [],
      error: status.stderr || status.stdout || `git status failed with ${status.exitCode}`,
    };
  }
  const lines = status.stdout.split(/\r?\n/).filter(Boolean);
  return {
    exists: true,
    clean: lines.length === 0,
    lines,
  };
}

function summarizeControlTick(controlTick) {
  if (!controlTick) {
    return {
      available: false,
      ok: false,
    };
  }
  return {
    available: true,
    ok: controlTick.ok === true,
    generatedAt: controlTick.generatedAt ?? null,
    controlDecision: controlTick.controlDecision ?? null,
    effectiveOperatingPosture: controlTick.effectiveOperatingPosture ?? null,
    activeRunCount: controlTick.activeRunCount ?? null,
    liveRunCount: controlTick.liveRunCount ?? null,
    sourceControlClean: controlTick.sourceControlClean ?? null,
    recommendedAction: controlTick.recommendedAction ?? null,
    nextControlActions: controlTick.nextControlActions ?? [],
  };
}

function evidenceAgeMs(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? Math.max(0, Date.now() - timestamp) : null;
}

function buildRetirementChecks({ controlTick, controlTickRun, cycleLedger, packageScripts, paperclipStatus, files }) {
  const paperclipRepo = statusLinesForRepo(process.cwd());
  const cycleScript = "scripts/run-autonomous-development-cycle.mjs";
  const cycleLedgerPath = "report/autonomous-cycles/latest.json";
  const cycleDoc = "softwarehouse/autonomous-development-loop.md";

  return [
    {
      id: "paperclipApiReachable",
      required: false,
      passed: paperclipStatus.ok,
      evidence: paperclipStatus.ok
        ? `${paperclipApiUrl} responded with ${paperclipStatus.status}.`
        : `${paperclipApiUrl} is not reachable from this local Codex session.`,
    },
    {
      id: "controlTickHealthy",
      required: true,
      passed: controlTick?.ok === true && (controlTickRun?.ok ?? true),
      evidence: controlTickRun && !controlTickRun.ok
        ? `Control tick command failed with exit ${controlTickRun.exitCode}.`
        : controlTick
        ? `${controlTick.controlDecision ?? "unknown"} / ${controlTick.effectiveOperatingPosture ?? "unknown"}`
        : "No control tick report is available.",
    },
    {
      id: "paperclipOsClean",
      required: true,
      passed: paperclipRepo.clean === true,
      evidence: paperclipRepo.clean
        ? "Paperclip_Softwarehouse worktree is clean."
        : `${paperclipRepo.lines.length} local change(s) remain in Paperclip_Softwarehouse.`,
    },
    {
      id: "autonomousCycleEntrypointExists",
      required: true,
      passed: existsSync(cycleScript),
      evidence: existsSync(cycleScript)
        ? cycleScript
        : "Missing canonical 30-minute entrypoint.",
    },
    {
      id: "cycleLedgerExists",
      required: true,
      passed: existsSync(cycleLedgerPath),
      evidence: existsSync(cycleLedgerPath)
        ? cycleLedgerPath
        : "No latest autonomous cycle ledger exists.",
    },
    {
      id: "cycleLedgerFresh",
      required: true,
      passed: evidenceAgeMs(cycleLedger?.generatedAt) != null
        && evidenceAgeMs(cycleLedger?.generatedAt) <= freshnessLimitMs,
      evidence: evidenceAgeMs(cycleLedger?.generatedAt) == null
        ? "Autonomous cycle ledger has no parseable generatedAt."
        : `Autonomous cycle ledger age is ${Math.round(evidenceAgeMs(cycleLedger.generatedAt) / 60_000)} minute(s); limit is ${Math.round(freshnessLimitMs / 60_000)}.`,
    },
    {
      id: "controlTickFresh",
      required: true,
      passed: evidenceAgeMs(controlTick?.generatedAt) != null
        && evidenceAgeMs(controlTick?.generatedAt) <= freshnessLimitMs,
      evidence: evidenceAgeMs(controlTick?.generatedAt) == null
        ? "Control tick has no parseable generatedAt."
        : `Control tick age is ${Math.round(evidenceAgeMs(controlTick.generatedAt) / 60_000)} minute(s); limit is ${Math.round(freshnessLimitMs / 60_000)}.`,
    },
    {
      id: "cycleRoutineDocumented",
      required: true,
      passed: files.autonomousDevelopmentLoop.includes("run-autonomous-development-cycle.mjs")
        && files.autonomousDevelopmentLoop.includes("30 minutes"),
      evidence: existsSync(cycleDoc)
        ? "Autonomous cycle routine is documented."
        : "Autonomous cycle documentation is missing.",
    },
    {
      id: "selfImprovementLoopAvailable",
      required: true,
      passed: Boolean(packageScripts["softwarehouse:learning-loop"])
        && files.autonomousDevelopmentLoop.includes("Improvement Proposals"),
      evidence: packageScripts["softwarehouse:learning-loop"]
        ? "Learning loop script exists and cycle doc names improvement outputs."
        : "Missing softwarehouse:learning-loop package script.",
    },
  ];
}

function nextBootstrapActionsFor({ checks, controlTickSummary, paperclipRepo }) {
  const failed = new Set(checks.filter((check) => check.required && !check.passed).map((check) => check.id));
  const actions = [];

  if (paperclipRepo.clean === false) {
    actions.push("Close the Paperclip OS source-control gate: classify, validate, and commit or explicitly defer local Paperclip_Softwarehouse changes.");
  }
  if (failed.has("autonomousCycleEntrypointExists")) {
    actions.push("Implement `scripts/run-autonomous-development-cycle.mjs` as the single Paperclip-owned 30-minute Observe-Decide-Dispatch-Validate-Release-Monitor-Learn entrypoint.");
  }
  if (failed.has("cycleLedgerExists")) {
    actions.push("Add the autonomous cycle ledger under `report/autonomous-cycles/` and write one durable JSON/Markdown record per cycle.");
  }
  if (failed.has("cycleLedgerFresh")) {
    actions.push("Restore a genuinely Paperclip-owned autonomous cycle and fresh cycle ledger; file existence or a historical cycle is not autonomy proof.");
  }
  if (failed.has("controlTickFresh")) {
    actions.push("Restore fresh Paperclip control-tick evidence; a stale healthy report cannot qualify the supervisor for retirement.");
  }
  if (failed.has("cycleRoutineDocumented")) {
    actions.push("Document the scheduled Paperclip-owned cycle routine and its retirement handoff from local Codex bootstrap supervision.");
  }
  if (failed.has("selfImprovementLoopAvailable")) {
    actions.push("Wire the self-improvement loop so each cycle emits Improvement Proposals, Architecture Suggestions, and Missing Capabilities.");
  }
  if (failed.has("controlTickHealthy")) {
    actions.push("Repair `pnpm softwarehouse:control-tick` before starting new delivery lanes; the local Codex supervisor must fail closed when Paperclip cannot report its operating posture.");
  }

  if (actions.length === 0) {
    actions.push("Begin or continue the 14-day graduation window; do not retire Teachar from a single clean cycle.");
  }

  return actions;
}

function renderMarkdown(report) {
  const checks = report.retirementChecks
    .map((check) => `| ${check.id} | ${check.required ? "yes" : "no"} | ${check.passed ? "pass" : "fail"} | ${check.evidence.replace(/\|/g, "\\|")} |`)
    .join("\n");
  const actions = report.nextBootstrapActions.map((action) => `- ${action}`).join("\n");

  return [
    "# Codex Bootstrap Supervisor",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Status",
    "",
    `- Bootstrap status: ${report.bootstrapStatus}`,
    `- Paperclip API: ${report.paperclipApi.ok ? "reachable" : "unreachable"}`,
    `- Control decision: ${report.controlTick.controlDecision ?? "unknown"}`,
    `- Operating posture: ${report.controlTick.effectiveOperatingPosture ?? "unknown"}`,
    `- Active runs: ${report.controlTick.activeRunCount ?? "unknown"}`,
    `- Live runs: ${report.controlTick.liveRunCount ?? "unknown"}`,
    "",
    "## Retirement Checks",
    "",
    "| Check | Required | Result | Evidence |",
    "| --- | --- | --- | --- |",
    checks,
    "",
    "## Next Bootstrap Actions",
    "",
    actions,
    "",
    "## Retirement Rule",
    "",
    "The local Codex automation may pause itself only after every required retirement check remains green for 14 consecutive days, every active application has a project-specific terminal outcome or accepted pause/no-go, and no material Teachar repair was required during the window.",
    "",
  ].join("\n");
}

let controlTickRun = null;
if (!skipControlTick) {
  controlTickRun = run(process.execPath, ["scripts/run-softwarehouse-control-tick.mjs"], {
    timeoutMs: Number(process.env.CODEX_BOOTSTRAP_CONTROL_TICK_TIMEOUT_MS ?? 900_000),
  });
}

const packageJson = await readJsonIfExists("package.json");
const controlTick = await readJsonIfExists("report/softwarehouse-control-tick.latest.json");
const cycleLedger = await readJsonIfExists("report/autonomous-cycles/latest.json");
const paperclipStatus = await fetchStatus("/api/health");
const autonomousDevelopmentLoop = existsSync("softwarehouse/autonomous-development-loop.md")
  ? await readFile("softwarehouse/autonomous-development-loop.md", "utf8")
  : "";

const controlTickSummary = summarizeControlTick(controlTick);
const retirementChecks = buildRetirementChecks({
  controlTick: controlTickSummary,
  controlTickRun,
  cycleLedger,
  packageScripts: packageScriptsFor(packageJson),
  paperclipStatus,
  files: {
    autonomousDevelopmentLoop,
  },
});
const requiredPassed = retirementChecks
  .filter((check) => requiredRetirementChecks.has(check.id))
  .every((check) => check.passed);
const bootstrapStatus = requiredPassed ? "ready_for_graduation_observation" : "bootstrap_required";

const report = {
  generatedAt,
  appsRoot,
  paperclipApiUrl,
  bootstrapStatus,
  paperclipApi: paperclipStatus,
  controlTickRun: controlTickRun
    ? {
      ok: controlTickRun.ok,
      exitCode: controlTickRun.exitCode,
      timedOut: controlTickRun.timedOut,
      stderr: controlTickRun.stderr.slice(0, 2000),
    }
    : {
      skipped: true,
    },
  controlTick: controlTickSummary,
  freshnessLimitMs,
  cycleLedger: {
    generatedAt: cycleLedger?.generatedAt ?? null,
    ageMs: evidenceAgeMs(cycleLedger?.generatedAt),
  },
  repositories: Object.fromEntries([
    ["Paperclip_Softwarehouse", statusLinesForRepo(process.cwd())],
    ...softwarehouseActiveApplicationProjects.map((project) => [project.name, statusLinesForRepo(project.root)]),
  ]),
  retirementChecks,
  nextBootstrapActions: nextBootstrapActionsFor({
    checks: retirementChecks,
    controlTickSummary,
    paperclipRepo: statusLinesForRepo(process.cwd()),
  }),
};

await mkdir("report", { recursive: true });
await writeFile("report/codex-bootstrap-supervisor.latest.json", `${JSON.stringify(report, null, 2)}\n`);
await writeFile("report/codex-bootstrap-supervisor.latest.md", renderMarkdown(report));

console.log(JSON.stringify(report, null, 2));

if (controlTickRun && !controlTickRun.ok) {
  process.exitCode = 1;
}
