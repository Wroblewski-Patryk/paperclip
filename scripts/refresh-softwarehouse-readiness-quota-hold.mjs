import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildQuotaHoldReadOnlyPacket,
  buildSnapshot,
  renderMarkdown,
} from "./lib/softwarehouse-readiness-snapshot.mjs";

const apply = process.argv.includes("--apply");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";

function runProjectTruthAudit() {
  const result = spawnSync(process.execPath, ["scripts/check-project-truth-indexes.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Project-truth audit failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

async function readLiveRunCount() {
  const companiesResponse = await fetch(`${apiBase}/api/companies`);
  if (!companiesResponse.ok) throw new Error(`Company inventory failed: HTTP ${companiesResponse.status}`);
  const companies = await companiesResponse.json();
  const company = Array.isArray(companies)
    ? companies.find((candidate) => candidate?.name === "LuckySparrow") ?? companies[0]
    : null;
  if (!company?.id) throw new Error("No Paperclip company is available for the quota-hold snapshot.");
  const liveResponse = await fetch(`${apiBase}/api/companies/${company.id}/live-runs?limit=100&minCount=0`);
  if (!liveResponse.ok) throw new Error(`Live-run inventory failed: HTTP ${liveResponse.status}`);
  const liveRuns = await liveResponse.json();
  return Array.isArray(liveRuns) ? liveRuns.length : 0;
}

const projectTruth = runProjectTruthAudit();
const activeRunCount = await readLiveRunCount();
if (activeRunCount > 0) {
  throw new Error(`Refusing quota-hold snapshot refresh while ${activeRunCount} run(s) are active.`);
}

const packet = buildQuotaHoldReadOnlyPacket({ projectTruth, activeRunCount });
const snapshot = buildSnapshot(packet);
const result = {
  mode: apply ? "apply" : "dry-run",
  wroteSnapshot: apply,
  createdTasks: 0,
  dispatchedRuns: 0,
  snapshot,
};

if (apply) {
  await mkdir("report", { recursive: true });
  await writeFile("report/softwarehouse-readiness-snapshot.latest.json", `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile("report/softwarehouse-readiness-snapshot.latest.md", renderMarkdown(snapshot));
}

console.log(JSON.stringify(result, null, 2));
