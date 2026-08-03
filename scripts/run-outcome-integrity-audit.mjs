import { auditOutcomeIntegrity } from "./lib/outcome-integrity.mjs";

const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const configuredCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? process.env.SOFTWAREHOUSE_COMPANY_ID ?? null;
const strict = process.argv.includes("--strict");

async function request(route) {
  const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}

const companies = configuredCompanyId ? [] : await request("/api/companies");
const companyId = configuredCompanyId
  ?? companies.find((company) => ["LuckySparrow Software House", "LuckySparrow"].includes(company.name))?.id;
if (!companyId) throw new Error("LuckySparrow Software House company not found");

const [projects, openIssues, doneIssues] = await Promise.all([
  request(`/api/companies/${companyId}/projects`),
  request(`/api/companies/${companyId}/issues?limit=2000`),
  request(`/api/companies/${companyId}/issues?status=done&limit=2000`),
]);
const issues = [...new Map([...openIssues, ...doneIssues].map((issue) => [issue.id, issue])).values()];
const report = auditOutcomeIntegrity({ issues, projects });

console.log(JSON.stringify({ mode: strict ? "strict" : "report", companyId, ...report }, null, 2));
if (strict && report.status === "fail") process.exitCode = 1;
