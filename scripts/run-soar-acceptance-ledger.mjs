import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? "C:/Personal/Projekty/Aplikacje";
const soarRoot = process.env.SOAR_REPO_PATH ?? path.join(appsRoot, "Soar");
const prodUrl = process.env.SOAR_PRODUCTION_URL ?? process.env.SOAR_APP_URL ?? "https://soar.luckysparrow.ch";
const timeoutMs = Number(process.env.SOAR_ACCEPTANCE_FETCH_TIMEOUT_MS ?? 8000);
const coolifyReportPath = process.env.COOLIFY_PRODUCTION_RECONCILER_REPORT_PATH ?? "report/coolify-production-reconciler.latest.json";
const paperclipApiBase = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200/api").replace(/\/$/, "");

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

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function latestEvidenceFile(pattern) {
  const evidenceRoot = path.join(soarRoot, "history", "evidence");
  let files = [];
  try {
    files = await readdir(evidenceRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  const matches = [];
  for (const file of files) {
    if (!file.isFile()) continue;
    if (!pattern.test(file.name)) continue;
    const filePath = path.join(evidenceRoot, file.name);
    const [body, fileStat] = await Promise.all([
      readFile(filePath, "utf8").catch(() => ""),
      stat(filePath).catch(() => null),
    ]);
    matches.push({ filePath, fileName: file.name, body, mtimeMs: fileStat?.mtimeMs ?? 0 });
  }
  return matches
    .filter((item) => /\bPASS\b/i.test(item.body))
    .sort((left, right) => right.mtimeMs - left.mtimeMs || right.fileName.localeCompare(left.fileName))
    .at(0) ?? null;
}

async function issueWorkProductProof(issueIdentifier, predicate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${paperclipApiBase}/issues/${encodeURIComponent(issueIdentifier)}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const issue = await response.json();
    if (!["done", "closed"].includes(String(issue.status ?? "").toLowerCase())) return null;
    const workProducts = Array.isArray(issue.workProducts) ? issue.workProducts : [];
    const proof = workProducts.find((workProduct) => predicate(workProduct, issue));
    if (!proof) return null;
    return { issue, workProduct: proof };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isOwnerLoginProof(workProduct) {
  const title = String(workProduct?.title ?? "");
  const metadata = workProduct?.metadata && typeof workProduct.metadata === "object" ? workProduct.metadata : {};
  const evidenceKinds = Array.isArray(metadata.evidenceKinds) ? metadata.evidenceKinds.map(String) : [];
  const text = `${title}\n${metadata.documentKey ?? ""}\n${metadata.issueIdentifier ?? ""}`;
  return /owner-login|login verification|owner login/i.test(text)
    && metadata.secretValuesStored === false
    && evidenceKinds.includes("security")
    && evidenceKinds.includes("test");
}

function coolifyResourceStatusCheck(report) {
  if (!report) {
    return {
      status: "missing",
      reason: "No Coolify production reconciler report is recorded yet.",
    };
  }
  const resources = Array.isArray(report.resources) ? report.resources : [];
  const expected = Number(report.expectedResourceCount ?? 0);
  const unhealthy = resources.filter((resource) =>
    /unhealthy|exited|failed|error/i.test(String(resource.status ?? ""))
    || resource.serverStatus === false
  );
  if (resources.length < expected || expected <= 0) {
    return {
      status: "missing",
      reason: `Coolify resource inventory is incomplete: discovered ${resources.length}, expected ${expected || "unknown"}.`,
    };
  }
  if (unhealthy.length > 0) {
    return {
      status: "blocker",
      reason: `Coolify resource inventory found unhealthy resources: ${unhealthy.map((item) => `${item.name ?? item.id}:${item.status ?? "unknown"}`).join(", ")}.`,
    };
  }
  return {
    status: "pass",
    reason: `Coolify resource inventory reconciled ${resources.length}/${expected} resources with no unhealthy status.`,
  };
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
const [testAccountEvidence, coolifyReport] = await Promise.all([
  latestEvidenceFile(/protected-test-account-smoke-path.*\.md$/i),
  readJson(coolifyReportPath, null),
]);
const [ownerLoginEvidence, ownerLoginWorkProductProof] = await Promise.all([
  latestEvidenceFile(/(?:owner-login|live-login|prod-test-account-auth-session-browser-proof).*\.md$/i),
  issueWorkProductProof("LUC-228", isOwnerLoginProof),
]);
const coolifyCheck = coolifyResourceStatusCheck(coolifyReport);

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
    status: ownerLoginEvidence || ownerLoginWorkProductProof ? "pass" : "missing",
    reason: ownerLoginWorkProductProof
      ? `Paperclip work product confirms redacted owner-login verification path: ${ownerLoginWorkProductProof.issue.identifier}/${ownerLoginWorkProductProof.workProduct.id}.`
      : ownerLoginEvidence
        ? `Redacted owner-login proof found: ${path.relative(soarRoot, ownerLoginEvidence.filePath).replaceAll("\\", "/")}.`
        : "No browser login proof artifact or Paperclip owner-login work product is recorded yet.",
  },
  {
    id: "test_account_verified",
    status: testAccountEvidence ? "pass" : "missing",
    reason: testAccountEvidence
      ? `Redacted test-account smoke proof found: ${path.relative(soarRoot, testAccountEvidence.filePath).replaceAll("\\", "/")}.`
      : "No test-account smoke proof artifact is recorded yet.",
  },
  {
    id: "coolify_resources_reconciled",
    status: coolifyCheck.status,
    reason: coolifyCheck.reason,
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
