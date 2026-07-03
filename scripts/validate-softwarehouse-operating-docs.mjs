import { readFile } from "node:fs/promises";

const requiredDocs = [
  "docs/architecture.md",
  "docs/softwarehouse-sdlc.md",
  "docs/agent-governance.md",
  "docs/agent-runtime-layer.md",
  "docs/agent-policy-gates.md",
  "docs/agent-evidence.md",
  "docs/agent-trajectory-log.md",
  "docs/supervisor-agents.md",
  "docs/deployment.md",
  "docs/testing.md",
  "docs/security.md",
  "docs/monitoring.md",
  "docs/retrospectives.md",
  "docs/process-improvement.md",
  "docs/agent-evidence-map.csv",
  "docs/decisions/ADR-0001.md",
  "docs/paperclip-autonomous-softwarehouse-audit.md",
];

const requiredEvidenceColumns = [
  "area",
  "module",
  "feature",
  "file_path",
  "test_path",
  "docs_path",
  "task_id",
  "agent_id",
  "evidence_id",
  "status",
  "last_verified_at",
  "notes",
];

const requiredNavigationPages = [
  "architecture",
  "softwarehouse-sdlc",
  "agent-governance",
  "agent-runtime-layer",
  "agent-policy-gates",
  "agent-evidence",
  "agent-trajectory-log",
  "supervisor-agents",
  "testing",
  "security",
  "deployment",
  "monitoring",
  "retrospectives",
  "process-improvement",
  "paperclip-autonomous-softwarehouse-audit",
];

const requiredAuditSections = [
  "## Critical Backlog",
  "## High Backlog",
  "## Medium Backlog",
  "## Low Backlog",
  "## Current Verdict",
];

const requiredPolicyPhrases = [
  "No deployment without relevant test evidence.",
  "No `done` without documentation evidence.",
  "No high-risk completion without security evidence.",
  "No task handoff without a summary and next action.",
  "No repeated failure without a process-improvement issue.",
];

const failures = [];

async function readRequired(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    failures.push(`missing required file: ${path}`);
    return "";
  }
}

for (const path of requiredDocs) {
  await readRequired(path);
}

const evidenceCsv = await readRequired("docs/agent-evidence-map.csv");
const header = evidenceCsv.split(/\r?\n/, 1)[0]?.split(",") ?? [];
for (const column of requiredEvidenceColumns) {
  if (!header.includes(column)) failures.push(`agent evidence map missing column: ${column}`);
}

const docsJsonText = await readRequired("docs/docs.json");
try {
  const docsJson = JSON.parse(docsJsonText);
  const pages = JSON.stringify(docsJson.navigation ?? {});
  for (const page of requiredNavigationPages) {
    if (!pages.includes(`"${page}"`)) failures.push(`docs navigation missing page: ${page}`);
  }
} catch (error) {
  failures.push(`docs/docs.json is not valid JSON: ${error.message}`);
}

const audit = await readRequired("docs/paperclip-autonomous-softwarehouse-audit.md");
for (const section of requiredAuditSections) {
  if (!audit.includes(section)) failures.push(`audit missing section: ${section}`);
}

const policy = await readRequired("docs/agent-policy-gates.md");
for (const phrase of requiredPolicyPhrases) {
  if (!policy.includes(phrase)) failures.push(`policy gates missing phrase: ${phrase}`);
}

const adr = await readRequired("docs/decisions/ADR-0001.md");
for (const term of ["AgentOperatingRecord", "AgentTask", "AgentRun", "AgentEvidence", "AgentControlPolicy"]) {
  if (!adr.includes(term)) failures.push(`ADR-0001 missing canonical mapping term: ${term}`);
}

if (failures.length > 0) {
  console.error("Softwarehouse operating docs validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Softwarehouse operating docs validation passed.");
