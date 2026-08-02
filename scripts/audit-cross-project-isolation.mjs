import { mkdir, readFile, writeFile } from "node:fs/promises";
import { auditCrossProjectIsolation, summarizeIsolationFindings } from "./lib/cross-project-isolation-audit.mjs";
import { softwarehouseActiveApplicationProjects } from "./lib/softwarehouse-project-registry.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const strict = process.argv.includes("--strict");
const requestTimeoutMs = Number(process.env.SOFTWAREHOUSE_PROJECT_ISOLATION_REQUEST_TIMEOUT_MS ?? 60_000);
const activeIssueStatuses = "backlog,todo,in_progress,in_review,blocked";
const jsonPath = "report/softwarehouse-cross-project-isolation.latest.json";
const markdownPath = "report/softwarehouse-cross-project-isolation.latest.md";

async function request(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers = { accept: "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  try {
    const response = await fetch(`${apiBase}${route}`, { headers, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`GET ${route} failed with ${response.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`GET ${route} exceeded ${requestTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function staticFindings() {
  const checks = [
    ["source_control_registry", "scripts/run-source-control-closure-janitor.mjs", "softwarehouseActiveApplicationProjectNames"],
    ["portfolio_registry", "scripts/update-softwarehouse-portfolio-index.mjs", "softwarehouseActiveApplicationProjectNames"],
    ["truth_dispatch_registry", "scripts/run-project-truth-gap-dispatcher.mjs", "softwarehouseActiveApplicationProjectNames"],
    ["project_scoped_acceptance", "scripts/run-next-legal-action-selector.mjs", "{ Soar: soarAcceptanceLedger }"],
    ["pm_secret_namespace_cleanup", "scripts/configure-coolify-runtime-access.mjs", "removeEnvPrefixes"],
    ["agent_isolation_instruction", "softwarehouse/instructions/shared/90-pipeline-and-supervision.md", "Never substitute another project's acceptance"],
  ];
  const findings = [];
  for (const [code, file, needle] of checks) {
    const source = await readFile(file, "utf8").catch(() => "");
    if (!source.includes(needle)) findings.push({
      severity: "blocker",
      code,
      project: null,
      message: `${file} is missing the canonical cross-project isolation guard.`,
      details: { expected: needle },
    });
  }
  return findings;
}

function markdown(output) {
  const lines = [
    "# Cross-project isolation audit",
    "",
    `Generated: ${output.generatedAt}`,
    `Status: ${output.ok ? "PASS" : "FAIL"}`,
    `Findings: ${output.summary.total} (${output.summary.blockers} blockers, ${output.summary.warnings} warnings)`,
    "",
    "| Severity | Project | Code | Finding |",
    "| --- | --- | --- | --- |",
    ...output.findings.map((item) => `| ${item.severity} | ${item.project ?? "Softwarehouse"} | ${item.code} | ${item.message.replaceAll("|", "\\|")} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

let live = { checked: false, error: null };
let findings = await staticFindings();
try {
  const companies = await request("/api/companies");
  const company = companies.find((candidate) => /^LuckySparrow(?: Software House)?$/i.test(candidate.name));
  if (!company) throw new Error("LuckySparrow company not found");
  const [projects, agents, routines] = await Promise.all([
    request(`/api/companies/${company.id}/projects`),
    request(`/api/companies/${company.id}/agents`),
    request(`/api/companies/${company.id}/routines`),
  ]);
  // The issue query is the heaviest read on a long-lived company. Keep it out of
  // the metadata fan-out so the audit does not amplify database contention.
  const issues = await request(`/api/companies/${company.id}/issues?limit=1000&status=${activeIssueStatuses}`);
  const activeCanonicalProjects = projects.filter((project) =>
    !project.archivedAt && softwarehouseActiveApplicationProjects.some((spec) => spec.paperclipName === project.name),
  );
  const projectDetails = await Promise.all(activeCanonicalProjects.map((project) =>
    request(`/api/projects/${project.id}`).catch(() => project),
  ));
  findings = findings.concat(auditCrossProjectIsolation({ projects, projectDetails, agents, routines, issues }));
  live = {
    checked: true,
    ok: true,
    company: { id: company.id, name: company.name },
    counts: { projects: projects.length, agents: agents.length, routines: routines.length, issues: issues.length },
  };
} catch (error) {
  live = { checked: true, ok: false, error: String(error?.message ?? error) };
  findings.push({
    severity: "blocker",
    code: "live_audit_unavailable",
    project: null,
    message: "Live Paperclip project-isolation readback could not be completed.",
    details: { error: live.error },
  });
}

const summary = summarizeIsolationFindings(findings);
const output = {
  generatedAt: new Date().toISOString(),
  apiBase,
  strict,
  ok: summary.blockers === 0,
  live,
  summary,
  findings,
};
await mkdir("report", { recursive: true });
await Promise.all([
  writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`),
  writeFile(markdownPath, markdown(output)),
]);
console.log(JSON.stringify(output, null, 2));
if (strict && !output.ok) process.exitCode = 1;
