import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const soarRoot = process.env.SOAR_REPO_PATH ?? path.join(appsRoot, "Soar");
const prodUrl = process.env.SOAR_PRODUCTION_URL ?? process.env.SOAR_APP_URL ?? "https://soar.luckysparrow.ch";
const timeoutMs = Number(process.env.SOAR_ACCEPTANCE_FETCH_TIMEOUT_MS ?? 8000);

function git(args) {
  const result = spawnSync("git", args, { cwd: soarRoot, encoding: "utf8", windowsHide: true });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function renderMarkdown(output) {
  return [
    "# Soar Delivery Acceptance Ledger",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    `Overall: ${output.overall}`,
    "",
    "## Checks",
    "",
    ...output.checks.map((check) => `- ${check.id}: ${check.status} - ${check.reason}`),
    "",
  ].join("\n");
}

const status = git(["status", "--short"]);
const head = git(["rev-parse", "--short", "HEAD"]);
const probes = await Promise.all([
  probe(prodUrl),
  probe(`${prodUrl.replace(/\/$/, "")}/health`),
  probe(`${prodUrl.replace(/\/$/, "")}/api/health`),
]);

const checks = [
  {
    id: "soar_repo_reachable",
    status: status.ok ? "pass" : "fail",
    reason: status.ok ? "Git status command succeeded." : status.stderr || "Git status failed.",
  },
  {
    id: "soar_source_control_clean",
    status: status.ok && status.stdout === "" ? "pass" : "blocker",
    reason: status.ok && status.stdout === "" ? "Soar worktree is clean." : "Soar worktree has local changes that must be classified before acceptance.",
  },
  {
    id: "production_public_reachable",
    status: probes.some((item) => item.ok) ? "pass" : "unknown",
    reason: probes.some((item) => item.ok) ? "At least one public production endpoint responded successfully." : "No public endpoint returned a successful response.",
  },
  {
    id: "owner_login_verified",
    status: "missing",
    reason: "No browser login proof artifact is recorded yet.",
  },
  {
    id: "test_account_verified",
    status: "missing",
    reason: "No test-account smoke proof artifact is recorded yet.",
  },
  {
    id: "coolify_resources_reconciled",
    status: "missing",
    reason: "Coolify production resource ledger must confirm apps, Postgres, Redis, deploy ref, logs, and health.",
  },
];

const overall = checks.some((check) => ["fail", "blocker"].includes(check.status))
  ? "blocked"
  : checks.some((check) => ["missing", "unknown"].includes(check.status))
    ? "not_ready"
    : "ready";

const output = {
  generatedAt: new Date().toISOString(),
  prodUrl,
  soarRoot,
  gitHead: head.ok ? head.stdout : null,
  gitStatus: status.stdout,
  probes,
  overall,
  checks,
};

await mkdir("report", { recursive: true });
await writeFile("report/soar-delivery-acceptance.latest.json", `${JSON.stringify(output, null, 2)}\n`);
await writeFile("report/soar-delivery-acceptance.latest.md", renderMarkdown(output));
console.log(JSON.stringify(output, null, 2));
