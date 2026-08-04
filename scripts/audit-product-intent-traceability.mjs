import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  evaluateProductIntentTrace,
  inspectProductIntentContract,
  parseProductIntentTrace,
} from "./lib/product-intent-traceability.mjs";
import { softwarehouseActiveApplicationProjects } from "./lib/softwarehouse-project-registry.mjs";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const companyName = process.env.SOFTWAREHOUSE_COMPANY_NAME ?? "LuckySparrow Software House";
const strict = process.argv.includes("--strict");

async function request(route) {
  const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${await response.text()}`);
  return response.json();
}

const contracts = await Promise.all(softwarehouseActiveApplicationProjects.map(async (project) => ({
  project,
  contract: await inspectProductIntentContract(project),
})));

let live = { available: false, error: null, projects: [] };
try {
  const companies = await request("/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName || candidate.name === "LuckySparrow");
  if (!company) throw new Error(`Company '${companyName}' was not found`);
  const [paperclipProjects, issues] = await Promise.all([
    request(`/api/companies/${company.id}/projects`),
    request(`/api/companies/${company.id}/issues?status=backlog,todo,in_progress&limit=2000`),
  ]);
  live = {
    available: true,
    error: null,
    projects: contracts.map(({ project, contract }) => {
      const paperclipProject = paperclipProjects.find((candidate) => candidate.name === project.paperclipName);
      const candidates = issues
        .filter((issue) => issue.projectId === paperclipProject?.id)
        .filter((issue) => !["routine_execution", "stranded_issue_recovery", "issue_productivity_review", "product_intent_reconciliation"].includes(issue.originKind))
        .filter((issue) => !/^\[[^\]]+\]\[Product Intent\] Reconcile\b/.test(issue.title ?? ""))
        .filter((issue) => issue.assigneeAgentId && typeof issue.description === "string" && issue.description.trim().length >= 120)
        .map((issue) => {
          const result = evaluateProductIntentTrace({ trace: parseProductIntentTrace(issue.description), contract });
          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            status: issue.status,
            ready: result.ready,
            missing: result.missing,
            conflicts: result.conflicts,
          };
        });
      return {
        name: project.name,
        paperclipProjectId: paperclipProject?.id ?? null,
        contractReady: contract.ready,
        candidates,
        readyCandidates: candidates.filter((item) => item.ready).length,
        reconciliationRequired: candidates.filter((item) => !item.ready).length,
      };
    }),
  };
} catch (error) {
  live = { available: false, error: error instanceof Error ? error.message : String(error), projects: [] };
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: contracts.some(({ contract }) => !contract.ready)
    ? "contract_failure"
    : live.projects.some((project) => project.reconciliationRequired > 0)
      ? "reconciliation_required"
      : live.available ? "ready" : "repository_contracts_ready_live_unavailable",
  contracts: contracts.map(({ project, contract }) => ({
    project: project.name,
    root: contract.root,
    ready: contract.ready,
    manifestPath: contract.manifestPath ?? null,
    productSources: contract.productSources ?? [],
    architectureSources: contract.architectureSources ?? [],
    observedStateSource: contract.observedStateSource ?? null,
    findings: contract.findings,
  })),
  live,
};

await mkdir(path.join("report", "product-intent"), { recursive: true });
await writeFile(path.join("report", "product-intent", "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (strict && report.status === "contract_failure") process.exitCode = 1;
