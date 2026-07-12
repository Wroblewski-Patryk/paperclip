import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const reportDir = "report/longevity";
const restartRequestPath = ".paperclip/dev-server-restart-request.json";
const apply = process.argv.includes("--apply");
const staleRunMinutes = Number(process.env.SOFTWAREHOUSE_STALE_RUN_MINUTES ?? 45);
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_REQUEST_TIMEOUT_MS ?? 60_000);
const issuePageSize = Number(process.env.SOFTWAREHOUSE_LONGEVITY_ISSUE_PAGE_SIZE ?? 500);
const requestRetryCount = Number(process.env.SOFTWAREHOUSE_LONGEVITY_REQUEST_RETRIES ?? 2);
const requestRetryBaseDelayMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_RETRY_BASE_DELAY_MS ?? 500);
const childScriptTimeoutMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_CHILD_TIMEOUT_MS ?? 300_000);
const governanceChildTimeoutMs = Number(process.env.SOFTWAREHOUSE_LONGEVITY_GOVERNANCE_CHILD_TIMEOUT_MS ?? 180_000);
const heavyGovernanceChecksEnabled = process.env.SOFTWAREHOUSE_LONGEVITY_SKIP_HEAVY_GOVERNANCE_CHECKS !== "true";
const controlTickCheckEnabled = process.env.SOFTWAREHOUSE_LONGEVITY_RUN_CONTROL_TICK === "true";
const activeIssueStatuses = ["backlog", "todo", "in_progress", "in_review", "blocked"];
const targetProjects = (process.env.SOFTWAREHOUSE_LONGTERM_PROJECTS ?? "Soar,Roost")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

async function requestJson(method, route, body) {
  let lastError = null;
  for (let attempt = 0; attempt <= requestRetryCount; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const headers = { "content-type": "application/json" };
      if (process.env.PAPERCLIP_API_KEY) {
        headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
      }
      if (process.env.PAPERCLIP_RUN_ID) {
        headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
      }
      const response = await fetch(`${apiBase}${route}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        const error = new Error(`${method} ${route} failed with ${response.status}: ${text}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? new Error(`${method} ${route} timed out after ${requestTimeoutMs}ms`)
        : error;
      const retryable = error?.name === "AbortError" || error?.status === 429 || error?.status >= 500;
      if (!retryable || attempt >= requestRetryCount) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, requestRetryBaseDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function request(route) {
  return requestJson("GET", route);
}

async function requestAllPages(route, { limit = issuePageSize } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += limit) {
    const separator = route.includes("?") ? "&" : "?";
    const page = await request(`${route}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(page)) {
      throw new Error(`Expected paginated route to return an array: ${route}`);
    }
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

function runNodeScript(script, args = [], { timeoutMs = childScriptTimeoutMs } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    killSignal: "SIGTERM",
  });
  const timedOut = result.error?.code === "ETIMEDOUT";
  return {
    ok: !timedOut && result.status === 0,
    exitCode: result.status,
    timedOut,
    stdout: result.stdout?.trim() ?? "",
    stderr: timedOut
      ? `Timed out after ${timeoutMs}ms`
      : result.stderr?.trim() ?? "",
  };
}

function runPackageScript(scriptName, { timeoutMs = governanceChildTimeoutMs } = {}) {
  const result = spawnSync("pnpm", [scriptName], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    shell: process.platform === "win32",
  });
  const timedOut = result.error?.code === "ETIMEDOUT";
  return {
    ok: !timedOut && result.status === 0,
    exitCode: result.status,
    timedOut,
    stdout: result.stdout?.trim() ?? "",
    stderr: timedOut
      ? `Timed out after ${timeoutMs}ms`
      : result.stderr?.trim() ?? "",
  };
}

function parseJsonFromOutput(output) {
  const text = String(output ?? "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function summarizeChildResult(result, max = 1200) {
  return {
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdout: result.stdout.slice(0, max),
    stderr: result.stderr.slice(0, max),
  };
}

function ageMinutes(timestamp) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 600) / 100);
}

function severityRank(severity) {
  return { info: 0, warn: 1, critical: 2 }[severity] ?? 0;
}

function pushFinding(findings, severity, area, message, data = {}) {
  findings.push({ severity, area, message, data });
}

function issueList(result) {
  return Array.isArray(result) ? result : Array.isArray(result?.value) ? result.value : [];
}

function findingsDigest(rows) {
  return rows.slice(0, 12).map((finding) => {
    const data = Object.keys(finding.data ?? {}).length > 0
      ? ` data=${JSON.stringify(finding.data).slice(0, 700)}`
      : "";
    return `- ${finding.severity} ${finding.area}: ${finding.message}${data}`;
  }).join("\n");
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function projectMatchesTarget(project, targetName) {
  const projectName = normalizeName(project.name);
  const target = normalizeName(targetName);
  return projectName === target || projectName.endsWith(`: ${target}`);
}

function findActiveProjectByTarget(projects, targetName) {
  return projects.find((project) => !project.archivedAt && projectMatchesTarget(project, targetName)) ?? null;
}

function hasActiveRoutine(activeRoutineTitles, aliases) {
  return aliases.some((title) => activeRoutineTitles.has(title));
}

async function searchIssues(companyId, query) {
  const params = new URLSearchParams({ q: query, limit: "50" });
  return request(`/api/companies/${companyId}/issues?${params.toString()}`);
}

function isKnownStateEvidenceLane(issue) {
  const title = String(issue?.title ?? "");
  if (["done", "cancelled"].includes(issue?.status)) return false;
  if (title.includes("[Known State] Evidence collection")) return true;
  return title.includes("[Project Truth]")
    && (
      title.includes("[App Completion]")
      || /\b(Prove|Proof|Reconcile|Evidence)\b/i.test(title)
    );
}

async function findKnownStateEvidenceLane(companyId, project, projectName, issues) {
  const fromLoadedIssues = issues.find((issue) =>
    issue.projectId === project.id
    && isKnownStateEvidenceLane(issue)
  );
  if (fromLoadedIssues) return fromLoadedIssues;

  const searchResult = await searchIssues(companyId, `${projectName} known-state project truth app completion`);
  const searchIssuesValue = Array.isArray(searchResult) ? searchResult : searchResult?.value ?? [];
  return searchIssuesValue.find((issue) =>
    issue.projectId === project.id
    && isKnownStateEvidenceLane(issue)
  ) ?? null;
}

function markdownFor(report) {
  const liveRuns = report.liveRuns ?? [];
  const checkRows = (report.softwarehouseChecks ?? [])
    .map((check) => `| ${check.id} | ${check.status} | ${String(check.summary ?? "").replaceAll("|", "\\|")} |`)
    .join("\n");
  const findingRows = (report.findings ?? [])
    .map((finding) => `| ${finding.severity} | ${finding.area} | ${String(finding.message).replaceAll("|", "\\|")} |`)
    .join("\n");
  const repairRows = (report.repairActions ?? [])
    .map((action) => `| ${action.action} | ${action.identifier ?? ""} | ${action.status ?? ""} |`)
    .join("\n");
  const liveRows = liveRuns
    .map((run) => `| ${run.issueIdentifier ?? ""} | ${run.agentName ?? ""} | ${run.issueStatus ?? ""} | ${run.ageMinutes} |`)
    .join("\n");
  return [
    "# Softwarehouse Longevity Doctor",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Result",
    "",
    `- overall: ${report.overall}`,
    `- apply: ${report.apply}`,
    `- activeRunCount: ${report.health?.devServer?.activeRunCount ?? liveRuns.length}`,
    `- liveRunCount: ${liveRuns.length}`,
    `- restartRequestWritten: ${report.restartRequestWritten}`,
    "",
    "## Findings",
    "",
    "| Severity | Area | Message |",
    "| --- | --- | --- |",
    findingRows || "| info | doctor | No findings |",
    "",
    "## Softwarehouse Checks",
    "",
    "| Check | Status | Summary |",
    "| --- | --- | --- |",
    checkRows || "| none | | |",
    "",
    "## Repair Actions",
    "",
    "| Action | Issue | Status |",
    "| --- | --- | --- |",
    repairRows || "| none | | |",
    "",
    "## Live Runs",
    "",
    "| Issue | Agent | Issue Status | Age Minutes |",
    "| --- | --- | --- | ---: |",
    liveRows || "| none | | | |",
    "",
  ].join("\n");
}

let apiReachable = false;
let company = null;
let payload = {};
const findings = [];
const softwarehouseChecks = [];
const repairActions = [];
let restartRequestWritten = false;

function recordSoftwarehouseCheck(id, status, summary, data = {}) {
  softwarehouseChecks.push({ id, status, summary, data });
}

function handleChildCheck({ id, result, passSummary, failSeverity = "warn", failArea = "softwarehouse", failMessage }) {
  if (result.ok) {
    recordSoftwarehouseCheck(id, "pass", passSummary, summarizeChildResult(result, 500));
    return true;
  }
  recordSoftwarehouseCheck(id, "fail", failMessage, summarizeChildResult(result));
  pushFinding(findings, failSeverity, failArea, failMessage, summarizeChildResult(result));
  return false;
}

async function resolveCompany() {
  if (companyId) {
    return request(`/api/companies/${companyId}`);
  }

  const companies = await request("/api/companies");
  const companyList = Array.isArray(companies) ? companies : companies?.value ?? [];
  return companyList.find((candidate) => candidate.name === companyName)
    ?? companyList.find((candidate) => candidate.name === "LuckySparrow Software House")
    ?? null;
}

function shouldWriteRestartRequest(error) {
  return error?.name === "AbortError"
    || error?.status === undefined
    || error?.status >= 500;
}

try {
  company = await resolveCompany();
  if (!company) throw new Error(`Company not found: ${companyId ?? companyName}`);
  apiReachable = true;
} catch (error) {
  const restartable = shouldWriteRestartRequest(error);
  pushFinding(
    findings,
    "critical",
    "api",
    restartable
      ? `Paperclip API is not reachable: ${error.message}`
      : `Paperclip API is reachable but the watchdog is not authorized for its company discovery route: ${error.message}`,
  );
  if (apply && restartable) {
    await mkdir(path.dirname(restartRequestPath), { recursive: true });
    await writeFile(restartRequestPath, `${JSON.stringify({
      requestedAt: new Date().toISOString(),
      reason: "softwarehouse longevity doctor could not reach Paperclip API",
      apiBase,
      safeRestartOnly: true,
    }, null, 2)}\n`);
    restartRequestWritten = true;
  }
}

if (apiReachable) {
  try {
    const [health, agents, projects, issues, routines, liveRuns] = await Promise.all([
      request("/api/health"),
      request(`/api/companies/${company.id}/agents`),
      request(`/api/companies/${company.id}/projects`),
      requestAllPages(`/api/companies/${company.id}/issues?status=${activeIssueStatuses.join(",")}`),
      request(`/api/companies/${company.id}/routines`),
      request(`/api/companies/${company.id}/live-runs`),
    ]);

    const issueById = new Map(issues.map((issue) => [issue.id, issue]));
    const agentById = new Map(agents.map((agent) => [agent.id, agent]));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const projectByName = new Map(projects.filter((project) => !project.archivedAt).map((project) => [project.name, project]));
    const issueByExecutionRunId = new Map();
    for (const issue of issues) {
      if (issue.executionRunId) issueByExecutionRunId.set(issue.executionRunId, issue);
      if (issue.checkoutRunId) issueByExecutionRunId.set(issue.checkoutRunId, issue);
    }
    function issueForLiveRun(run) {
      return issueById.get(run.issueId) ?? issueByExecutionRunId.get(run.id) ?? null;
    }
    const runningLiveRuns = liveRuns.filter((run) => run.status === "running");
    const liveIssueIds = new Set(runningLiveRuns
      .map((run) => run.issueId ?? issueByExecutionRunId.get(run.id)?.id)
      .filter(Boolean));
    const liveRunsByAgent = new Map();
    for (const run of runningLiveRuns) {
      if (!run.agentId) continue;
      if (!liveRunsByAgent.has(run.agentId)) liveRunsByAgent.set(run.agentId, []);
      liveRunsByAgent.get(run.agentId).push(run);
    }

  if (health.devServer?.restartRequired) {
    pushFinding(findings, "critical", "runtime", "Paperclip dev server reports restartRequired.");
    if (apply) {
      await mkdir(path.dirname(restartRequestPath), { recursive: true });
      await writeFile(restartRequestPath, `${JSON.stringify({
        requestedAt: new Date().toISOString(),
        reason: "Paperclip health reports restartRequired",
        safeRestartOnly: true,
      }, null, 2)}\n`);
      restartRequestWritten = true;
    }
  }

  for (const [agentId, runs] of liveRunsByAgent.entries()) {
    if (runs.length > 1) {
      pushFinding(findings, "critical", "wip", "One agent has more than one live lane.", {
        agent: agentById.get(agentId)?.name ?? agentId,
        liveRunCount: runs.length,
        issues: runs.map((run) => issueById.get(run.issueId)?.identifier ?? run.issueId),
      });
    }
  }

  const liveRunSummaries = liveRuns.map((run) => {
    const issue = issueForLiveRun(run);
    const agent = agentById.get(run.agentId);
    const age = run.lastOutputAt || run.startedAt ? ageMinutes(run.lastOutputAt ?? run.startedAt) : null;
    if (run.status === "running" && age !== null && age >= staleRunMinutes) {
      pushFinding(findings, "warn", "live-run", "Live run has stale output and should be inspected before starting duplicate work.", {
        issue: issue?.identifier ?? run.issueId,
        agent: agent?.name ?? run.agentId,
        ageMinutes: age,
      });
    }
    if (issue && ["done", "cancelled", "blocked"].includes(issue.status)) {
      pushFinding(findings, "warn", "live-run", "Live run is attached to a non-running issue status.", {
        issue: issue.identifier,
        issueStatus: issue.status,
        agent: agent?.name ?? run.agentId,
      });
    }
    return {
      id: run.id,
      agentName: agent?.name ?? null,
      issueIdentifier: issue?.identifier ?? null,
      issueStatus: issue?.status ?? null,
      runStatus: run.status ?? null,
      ageMinutes: age,
      lastOutputAt: run.lastOutputAt ?? null,
    };
  });

  const staleInProgress = issues.filter((issue) =>
    issue.status === "in_progress" && !liveIssueIds.has(issue.id)
  );
  if (staleInProgress.length > 0) {
    pushFinding(findings, "critical", "issues", "Issues are in_progress without live runs.", {
      issues: staleInProgress.slice(0, 10).map((issue) => issue.identifier),
      count: staleInProgress.length,
    });
  }

  const activeProjectIds = new Set(projects.filter((project) => !project.archivedAt).map((project) => project.id));
  const unassignedOpen = issues.filter((issue) =>
    !["done", "cancelled"].includes(issue.status)
    && activeProjectIds.has(issue.projectId)
    && !issue.assigneeAgentId
    && !issue.assigneeUserId
    && !String(issue.title ?? "").includes("[Nest] [Known State]")
  );
  if (unassignedOpen.length > 0) {
    pushFinding(findings, "warn", "issues", "Open issues without owners exist.", {
      issues: unassignedOpen.slice(0, 10).map((issue) => issue.identifier),
      count: unassignedOpen.length,
    });
  }

  for (const projectName of targetProjects) {
    const names = projectName === "Aviary" ? ["Aviary", "Personality"] : [projectName];
    const project = names.map((name) => findActiveProjectByTarget(projects, name)).find(Boolean);
    if (!project) {
      pushFinding(findings, "warn", "projects", `Target project is not active in Paperclip: ${projectName}`);
      continue;
    }
    if (!project.executionWorkspacePolicy?.enabled) {
      pushFinding(findings, "critical", "projects", `Target project lacks executionWorkspacePolicy: ${projectName}`, {
        projectId: project.id,
      });
    }
    const knownState = await findKnownStateEvidenceLane(company.id, project, projectName, issues);
    if (!knownState) {
      pushFinding(findings, "warn", "knowledge", `Target project lacks a known-state evidence lane: ${projectName}`);
    }
  }

  const activeRoutineTitles = new Set(routines.filter((routine) => routine.status === "active").map((routine) => routine.title));
  for (const routineCoverage of [
    {
      label: "autonomy and liveness governance",
      aliases: [
        "[Softwarehouse] Autonomy governor",
        "00 General: Owner Direction and Proposal Review",
        "00 General: Softwarehouse Liveness and Active Work Review",
      ],
    },
    {
      label: "board/project truth hygiene",
      aliases: [
        "[Softwarehouse] Stale board janitor",
        "04 Operations: Portfolio Truth and Workspace Boundary Review",
      ],
    },
    {
      label: "agent health and model governance",
      aliases: [
        "[Softwarehouse] Agent health and model governance",
        "06 People: Agent Hiring and Governance Review",
      ],
    },
    {
      label: "docs, memory, and learning loop",
      aliases: [
        "[Softwarehouse] Docs and memory loop",
        "[Softwarehouse] Organizational learning loop",
        "04 Operations: PDCA Learning and Company Memory Review",
      ],
    },
    {
      label: "AI-agent development review",
      aliases: ["[Softwarehouse] AI-agent development review"],
    },
  ]) {
    if (!hasActiveRoutine(activeRoutineTitles, routineCoverage.aliases)) {
      pushFinding(findings, "warn", "routines", `Core routine coverage is not active: ${routineCoverage.label}`, {
        acceptableTitles: routineCoverage.aliases,
      });
    }
  }

  const snapshot = runNodeScript("scripts/export-softwarehouse-longevity-snapshot.mjs");
  if (!snapshot.ok) {
    pushFinding(findings, "warn", "snapshot", "Longevity snapshot export failed.", {
      exitCode: snapshot.exitCode,
      timedOut: snapshot.timedOut,
      stderr: snapshot.stderr.slice(0, 1000),
    });
  }

  const blockedRootGuardrail = runNodeScript("scripts/run-blocked-root-guardrail.mjs");
  if (!blockedRootGuardrail.ok) {
    pushFinding(findings, "warn", "blocked-root-guardrail", "Blocked-root guardrail failed to run.", {
      exitCode: blockedRootGuardrail.exitCode,
      timedOut: blockedRootGuardrail.timedOut,
      stderr: blockedRootGuardrail.stderr.slice(0, 1000),
    });
  } else {
    try {
      const guardrailReport = JSON.parse(blockedRootGuardrail.stdout);
      if ((guardrailReport.repairActionCount ?? 0) > 0) {
        pushFinding(findings, "warn", "blocked-root-guardrail", "Blocked issues need root blocker metadata repair.", {
          repairActionCount: guardrailReport.repairActionCount,
          duplicateRootFindings: guardrailReport.duplicateRootFindings ?? [],
        });
      }
      if ((guardrailReport.staleGateFindings?.length ?? 0) > 0) {
        pushFinding(findings, "warn", "blocked-root-guardrail", "Blocked root gate evidence is stale.", {
          staleGateFindings: guardrailReport.staleGateFindings,
        });
      }
    } catch (error) {
      pushFinding(findings, "warn", "blocked-root-guardrail", `Blocked-root guardrail emitted unreadable JSON: ${error.message}`);
    }
  }

  const operatingDocs = runNodeScript("scripts/validate-softwarehouse-operating-docs.mjs", [], {
    timeoutMs: governanceChildTimeoutMs,
  });
  handleChildCheck({
    id: "softwarehouse_operating_docs",
    result: operatingDocs,
    passSummary: "Softwarehouse operating docs, ADR, evidence map, and audit sections are present.",
    failSeverity: "critical",
    failArea: "governance",
    failMessage: "Softwarehouse operating docs contract is broken; repair docs/ADR/evidence-map before increasing autonomy.",
  });

  const softwarehouseAudit = runNodeScript("scripts/audit-luckysparrow-softwarehouse.mjs", [], {
    timeoutMs: governanceChildTimeoutMs,
  });
  const softwarehouseAuditReport = parseJsonFromOutput(softwarehouseAudit.stdout);
  if (softwarehouseAudit.ok && softwarehouseAuditReport) {
    recordSoftwarehouseCheck(
      "softwarehouse_autonomy_audit",
      softwarehouseAuditReport.overall === "pass" ? "pass" : "warn",
      `Softwarehouse audit overall=${softwarehouseAuditReport.overall}; runtimeBindingGaps=${softwarehouseAuditReport.runtimeBindingGaps?.length ?? "unknown"}.`,
      {
        overall: softwarehouseAuditReport.overall,
        runtimeBindingGaps: softwarehouseAuditReport.runtimeBindingGaps ?? [],
        findingCount: softwarehouseAuditReport.findings?.length ?? 0,
      },
    );
    if (softwarehouseAuditReport.overall !== "pass") {
      pushFinding(findings, "warn", "softwarehouse-audit", "Softwarehouse audit is not passing; inspect findings and route repair tasks.", {
        overall: softwarehouseAuditReport.overall,
        findings: softwarehouseAuditReport.findings ?? [],
      });
    }
    if ((softwarehouseAuditReport.runtimeBindingGaps?.length ?? 0) > 0) {
      pushFinding(findings, "critical", "secrets", "Runtime binding gaps still block autonomous work.", {
        runtimeBindingGaps: softwarehouseAuditReport.runtimeBindingGaps,
      });
    }
  } else {
    handleChildCheck({
      id: "softwarehouse_autonomy_audit",
      result: softwarehouseAudit,
      passSummary: "Softwarehouse autonomy audit passed.",
      failSeverity: "critical",
      failArea: "softwarehouse-audit",
      failMessage: "Softwarehouse autonomy audit failed to run.",
    });
  }

  const coolify = runNodeScript("scripts/run-coolify-production-reconciler.mjs", [], {
    timeoutMs: governanceChildTimeoutMs,
  });
  const coolifyReport = parseJsonFromOutput(coolify.stdout);
  if (coolify.ok && coolifyReport) {
    recordSoftwarehouseCheck(
      "coolify_runtime_access",
      coolifyReport.overall === "ready" ? "pass" : "warn",
      `Coolify reconciler overall=${coolifyReport.overall}; resources=${coolifyReport.resourceCount ?? 0}/${coolifyReport.expectedResourceCount ?? "?"}.`,
      {
        overall: coolifyReport.overall,
        resourceCount: coolifyReport.resourceCount ?? null,
        expectedResourceCount: coolifyReport.expectedResourceCount ?? null,
        loadedSecretKeys: coolifyReport.secretEnvFallback?.loadedKeys ?? [],
        secretEnvFallbackAttempted: Boolean(coolifyReport.secretEnvFallback?.attempted),
        secretEnvFallbackError: coolifyReport.secretEnvFallback?.error ?? null,
      },
    );
    if (coolifyReport.overall !== "ready") {
      pushFinding(findings, "critical", "deployment", "Coolify production reconciler is not ready; deployment agents may be blocked.", {
        overall: coolifyReport.overall,
        checks: coolifyReport.checks ?? [],
      });
    }
  } else {
    handleChildCheck({
      id: "coolify_runtime_access",
      result: coolify,
      passSummary: "Coolify runtime access is ready.",
      failSeverity: "critical",
      failArea: "deployment",
      failMessage: "Coolify production reconciler failed to run.",
    });
  }

  if (heavyGovernanceChecksEnabled) {
    const operatingStandard = runNodeScript("scripts/audit-softwarehouse-operating-standard.mjs", [], {
      timeoutMs: governanceChildTimeoutMs,
    });
    handleChildCheck({
      id: "softwarehouse_operating_standard",
      result: operatingStandard,
      passSummary: "Operating standard audit completed.",
      failSeverity: "warn",
      failArea: "governance",
      failMessage: "Operating standard audit failed; route governance repair.",
    });

    const projectTruth = runNodeScript("scripts/check-project-truth-indexes.mjs", [], {
      timeoutMs: governanceChildTimeoutMs,
    });
    handleChildCheck({
      id: "project_truth_indexes",
      result: projectTruth,
      passSummary: "Project truth indexes are readable and checked.",
      failSeverity: "warn",
      failArea: "project-truth",
      failMessage: "Project truth index check failed; app state may not be knowable without guessing.",
    });

    const gateSpecs = runPackageScript("softwarehouse:test-gates", { timeoutMs: governanceChildTimeoutMs });
    handleChildCheck({
      id: "softwarehouse_gate_specs",
      result: gateSpecs,
      passSummary: "Softwarehouse gate specs and key process invariants pass.",
      failSeverity: "critical",
      failArea: "policy-gates",
      failMessage: "Softwarehouse gate specs failed; policy automation is unsafe to trust.",
    });
  }

  if (controlTickCheckEnabled) {
    const controlTick = runPackageScript("softwarehouse:control-tick", { timeoutMs: childScriptTimeoutMs });
    const controlTickReport = parseJsonFromOutput(controlTick.stdout);
    if (controlTick.ok && controlTickReport) {
      recordSoftwarehouseCheck(
        "softwarehouse_control_tick",
        controlTickReport.ok ? "pass" : "warn",
        `Control tick decision=${controlTickReport.controlDecision ?? "unknown"}.`,
        {
          ok: controlTickReport.ok,
          decision: controlTickReport.controlDecision ?? null,
          recommendedAction: controlTickReport.recommendedAction ?? null,
        },
      );
      if (!controlTickReport.ok) {
        pushFinding(findings, "critical", "control-tick", "Softwarehouse control tick did not complete cleanly.", {
          decision: controlTickReport.controlDecision ?? null,
          recommendedAction: controlTickReport.recommendedAction ?? null,
        });
      }
    } else {
      handleChildCheck({
        id: "softwarehouse_control_tick",
        result: controlTick,
        passSummary: "Control tick completed.",
        failSeverity: "critical",
        failArea: "control-tick",
        failMessage: "Softwarehouse control tick failed to run.",
      });
    }
  } else {
    recordSoftwarehouseCheck(
      "softwarehouse_control_tick",
      "skipped",
      "Skipped by default to avoid recursive heavy control-loop execution; set SOFTWAREHOUSE_LONGEVITY_RUN_CONTROL_TICK=true for full watchdog runs.",
    );
  }

    if (apply && findings.length > 0) {
      const repairTitle = "[Softwarehouse][Longevity Watchdog] Repair autonomous softwarehouse control gaps";
      const softwarehouseProject = findActiveProjectByTarget(projects, "Softwarehouse")
        ?? findActiveProjectByTarget(projects, "Softwarehouse Operating System")
        ?? null;
      const repairOwner = agents.find((agent) => agent.name === "09 CTO (Chief Technology Officer)")
        ?? agents.find((agent) => agent.name === "11 IPM (Innovation Portfolio Manager)")
        ?? null;
      const existingRepairIssues = issueList(await request(
        `/api/companies/${company.id}/issues?q=${encodeURIComponent(repairTitle)}&limit=50`,
      ));
      const existingRepairIssue = existingRepairIssues.find((issue) =>
        issue.title === repairTitle && !["done", "cancelled"].includes(issue.status)
      );
      const repairBody = [
        "Longevity watchdog detected autonomous softwarehouse control gaps that must be routed into constructive repair work.",
        "",
        `Generated at: ${new Date().toISOString()}`,
        `Overall before repair routing: ${findings.some((finding) => finding.severity === "critical") ? "fail" : "warn"}`,
        "",
        "Findings:",
        findingsDigest(findings) || "- none",
        "",
        "Required loop:",
        "- identify owner and affected app/control-plane layer",
        "- repair implementation/config/docs/indexes as needed",
        "- verify with evidence",
        "- update documentation/work products",
        "- close or return with concrete next blocker",
      ].join("\n");
      if (existingRepairIssue) {
        await requestJson("PATCH", `/api/issues/${existingRepairIssue.id}`, {
          description: repairBody,
          projectId: softwarehouseProject?.id ?? existingRepairIssue.projectId ?? null,
          priority: findings.some((finding) => finding.severity === "critical") ? "critical" : "high",
        });
        await requestJson("POST", `/api/issues/${existingRepairIssue.id}/comments`, {
          body: repairBody,
          resume: false,
        });
        repairActions.push({
          action: "updated_existing_repair_issue",
          identifier: existingRepairIssue.identifier,
          status: existingRepairIssue.status,
        });
      } else {
        const createdRepairIssue = await requestJson("POST", `/api/companies/${company.id}/issues`, {
          title: repairTitle,
          description: repairBody,
          status: "todo",
          priority: findings.some((finding) => finding.severity === "critical") ? "critical" : "high",
          projectId: softwarehouseProject?.id ?? null,
          assigneeAgentId: repairOwner?.id ?? null,
        });
        repairActions.push({
          action: "created_repair_issue",
          identifier: createdRepairIssue.identifier,
          status: createdRepairIssue.status,
        });
      }
    }

    payload = {
      health,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        archivedAt: project.archivedAt ?? null,
        status: project.status,
        workspacePolicyEnabled: project.executionWorkspacePolicy?.enabled ?? false,
        preparationOnly: project.executionWorkspacePolicy?.runtimePolicy?.preparationOnly ?? false,
      })),
      liveRuns: liveRunSummaries,
      routineCount: routines.length,
      activeRoutineCount: routines.filter((routine) => routine.status === "active").length,
      softwarehouseChecks,
      repairActions,
      projectNamesById: Object.fromEntries(projects.map((project) => [project.id, project.name])),
      openIssuesByProject: Object.fromEntries(projects.map((project) => [
        project.name,
        issues.filter((issue) => issue.projectId === project.id && !["done", "cancelled"].includes(issue.status)).length,
      ])),
    };
  } catch (error) {
    pushFinding(findings, "critical", "api", `Paperclip API degraded during longevity checks: ${error.message}`);
    if (apply) {
      await mkdir(path.dirname(restartRequestPath), { recursive: true });
      await writeFile(restartRequestPath, `${JSON.stringify({
        requestedAt: new Date().toISOString(),
        reason: "softwarehouse longevity doctor detected degraded Paperclip API during deeper checks",
        error: error.message,
        apiBase,
        safeRestartOnly: true,
      }, null, 2)}\n`);
      restartRequestWritten = true;
    }
  }
}

const generatedAt = new Date().toISOString();
const highest = findings.reduce((max, finding) =>
  Math.max(max, severityRank(finding.severity)), 0);
const overall = highest >= 2 ? "fail" : highest === 1 ? "warn" : "pass";
const report = {
  generatedAt,
  apiBase,
  company: company ? { id: company.id, name: company.name } : null,
  apply,
  overall,
  restartRequestWritten,
  findings,
  softwarehouseChecks,
  ...payload,
};

await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, "softwarehouse-longevity-doctor.latest.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, "softwarehouse-longevity-doctor.latest.md"), markdownFor(report));

console.log(JSON.stringify(report, null, 2));
if (overall === "fail") process.exitCode = 1;
