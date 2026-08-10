import { mkdir, readFile, writeFile } from "node:fs/promises";
import { evaluateProbe, evaluateStaticCapability, scoreCapability } from "./lib/extension-utilization.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("../softwarehouse/extension-utilization-registry.json", import.meta.url), "utf8"));
const apiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const preferredNames = [process.env.SOFTWAREHOUSE_COMPANY_NAME, process.env.PAPERCLIP_COMPANY_NAME, "LuckySparrow", "LuckySparrow Software House"].filter(Boolean);

async function request(path) {
  try {
    const response = await fetch(`${apiBase}${path}`, { signal: AbortSignal.timeout(15_000) });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { return { passed: false, status: response.status, failures: ["response is not JSON"] }; }
    if (!response.ok) return { passed: false, status: response.status, failures: [`HTTP ${response.status}`] };
    return { passed: true, status: response.status, data };
  } catch (error) {
    return { passed: false, status: null, failures: [error instanceof Error ? error.message : String(error)] };
  }
}

const companiesResponse = await request("/api/companies");
const companies = Array.isArray(companiesResponse.data) ? companiesResponse.data : [];
const company = preferredNames.map((name) => companies.find((item) => item.name === name)).find(Boolean) ?? companies.find((item) => item.status === "active") ?? companies[0] ?? null;

const capabilities = [];
for (const capability of registry.capabilities) {
  const staticResult = await evaluateStaticCapability(root, capability);
  const runtimeChecks = [];
  for (const probe of capability.runtimeProbes) {
    const path = probe.path.replaceAll("{companyId}", company?.id ?? "missing-company");
    const response = await request(path);
    const evaluation = response.passed ? evaluateProbe(response.data, probe) : { passed: false, failures: response.failures };
    runtimeChecks.push({ path, status: response.status, ...evaluation });
  }
  const score = scoreCapability(staticResult, runtimeChecks);
  const passed = score.utilizationPercent >= registry.minimumUtilizationPercent
    && Object.values(score.dimensions).every((value) => value === 25);
  capabilities.push({ id: capability.id, name: capability.name, lifecycle: capability.lifecycle, passed, ...score, ...staticResult, runtimeChecks });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  apiBase,
  company: company ? { id: company.id, name: company.name } : null,
  completionContract: registry.completionContract,
  minimumUtilizationPercent: registry.minimumUtilizationPercent,
  passed: Boolean(company) && capabilities.every((capability) => capability.passed),
  summary: {
    total: capabilities.length,
    passing: capabilities.filter((capability) => capability.passed).length,
    belowThreshold: capabilities.filter((capability) => !capability.passed).map((capability) => capability.id),
    averageUtilizationPercent: Math.round(capabilities.reduce((sum, capability) => sum + capability.utilizationPercent, 0) / Math.max(capabilities.length, 1)),
  },
  capabilities,
};

await mkdir(new URL("../report/", import.meta.url), { recursive: true });
await writeFile(new URL("../report/softwarehouse-extension-utilization.latest.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
