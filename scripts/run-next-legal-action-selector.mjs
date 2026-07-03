import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const apply = process.argv.includes("--apply");
const outputPathJson = "report/softwarehouse-next-legal-action.latest.json";
const outputPathMd = "report/softwarehouse-next-legal-action.latest.md";
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const healthTimeoutMs = Number(process.env.SOFTWAREHOUSE_NEXT_LEGAL_ACTION_HEALTH_TIMEOUT_MS ?? 5_000);

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function isRunnableSourceControlGate(gate) {
  if (!gate) return false;
  if (gate.status === "blocked" || gate.status === "cancelled" || gate.status === "done") return false;
  const unresolvedBlockers = Number(gate.blockerAttention?.unresolvedBlockerCount ?? 0);
  const attentionBlockers = Number(gate.blockerAttention?.attentionBlockerCount ?? 0);
  return unresolvedBlockers === 0 && attentionBlockers === 0;
}

async function probeAppHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), healthTimeoutMs);
  try {
    const response = await fetch(`${apiBase}/api/health`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    return {
      checked: true,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function pickAction(control, readiness, appHealth = { checked: false, ok: true }) {
  const activeRunCount = Number(control?.activeRunCount ?? readiness?.activeRunCount ?? 0);
  if (appHealth.checked && !appHealth.ok) {
    return {
      decision: "repair_local_paperclip_liveness",
      reason: "The local Paperclip API is unreachable, so cached active-run reports are not enough to justify supervision.",
      command: "pnpm dev:list",
      allowed: ["inspect local Paperclip owner process", "capture port-binding evidence", "refresh reports after the app is reachable again"],
      forbidden: ["restart", "push", "deploy", "start duplicate owner lane"],
    };
  }
  if (activeRunCount > 0) {
    return {
      decision: "supervise_active_runs",
      reason: "A live run exists; starting duplicate work would hide truth.",
      command: "pnpm softwarehouse:control-tick",
      allowed: ["supervise live run", "close stale tails", "refresh reports"],
      forbidden: ["start duplicate owner lane", "push", "deploy", "restart"],
    };
  }
  const dirtyProject = control?.controlBrief?.dirtyProjects?.[0] ?? readiness?.dirtyProjects?.[0];
  const runnableSourceControlGate = [
    ...(control?.sourceControlGateIssues ?? []),
    ...(readiness?.sourceControlGates ?? []),
  ].find(isRunnableSourceControlGate);
  if (dirtyProject || runnableSourceControlGate) {
    return {
      decision: "start_source_control_closure",
      reason: "Project repositories are dirty and local source-control closure is allowed while protected delivery stays blocked.",
      command: "pnpm softwarehouse:local-repair-lane-starter:apply",
      target: dirtyProject?.project ?? runnableSourceControlGate?.identifier ?? null,
      allowed: ["local diff classification", "local validation", "commit/no-commit decision"],
      forbidden: ["push", "deploy", "restart", "protected smoke", "secret disclosure"],
    };
  }
  const inReviewFinding = (control?.auditFindings ?? []).find((finding) =>
    finding.area === "issues" && /in review/i.test(finding.message ?? "")
  );
  if (inReviewFinding) {
    return {
      decision: "repair_in_review_decision_path",
      reason: inReviewFinding.message,
      command: "pnpm softwarehouse:in-review-decision-path",
      allowed: ["name reviewer", "accept/reject/block/delegate decision"],
      forbidden: ["leave narrative-only review"],
    };
  }
  return {
    decision: "refresh_control_tick",
    reason: "No more specific safe action was selected.",
    command: "pnpm softwarehouse:control-tick",
    allowed: ["refresh reports", "monitor"],
    forbidden: ["invent broad work without evidence"],
  };
}

function renderMarkdown(output) {
  return [
    "# Softwarehouse Next Legal Action",
    "",
    `Generated at: ${output.generatedAt}`,
    "",
    `Decision: ${output.action.decision}`,
    "",
    `Reason: ${output.action.reason}`,
    "",
    `Command: \`${output.action.command}\``,
    "",
    "Allowed:",
    ...output.action.allowed.map((item) => `- ${item}`),
    "",
    "Forbidden:",
    ...output.action.forbidden.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

async function main() {
  const [control, readiness, appHealth] = await Promise.all([
    readJson("report/softwarehouse-control-tick.latest.json"),
    readJson("report/softwarehouse-readiness-snapshot.latest.json"),
    probeAppHealth(),
  ]);

  const output = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    appHealth,
    action: pickAction(control, readiness, appHealth),
  };

  await mkdir("report", { recursive: true });
  await writeFile(outputPathJson, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(outputPathMd, renderMarkdown(output));
  console.log(JSON.stringify(output, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
