import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { classifyLiveRuns } from "./lib/softwarehouse-live-run-classifier.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.SOFTWAREHOUSE_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const loop = process.argv.includes("--loop");
const once = process.argv.includes("--once") || !loop;
const intervalMs = Number(process.env.SOFTWAREHOUSE_CONTINUATION_INTERVAL_MS ?? 60_000);
const maxIterations = Number(process.env.SOFTWAREHOUSE_CONTINUATION_MAX_ITERATIONS ?? (once ? 1 : 0));
const childTimeoutMs = Number(process.env.SOFTWAREHOUSE_CONTINUATION_CHILD_TIMEOUT_MS ?? 240_000);
const outputPath = "report/softwarehouse-continuation-watchdog.latest.json";
const currentRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const currentIssueId = process.env.PAPERCLIP_ISSUE_ID ?? process.env.PAPERCLIP_TASK_ID ?? null;
const currentApiKey = process.env.PAPERCLIP_API_KEY ?? null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseLastJsonBlock(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.lastIndexOf("\n{");
  const candidate = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function probeLiveRuns() {
  try {
    const response = await fetch(`${apiBase}/api/companies/${companyId}/live-runs?limit=50&minCount=0`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return { checked: true, ok: false, status: response.status, liveRunCount: null };
    }
    const data = await response.json();
    const liveRuns = Array.isArray(data) ? data : data.runs ?? data.liveRuns ?? [];
    const classification = await classifyLiveRuns({
      apiBase,
      liveRuns,
      currentRunId,
      currentIssueId,
    });
    return {
      checked: true,
      ok: true,
      ...classification,
    };
  } catch (error) {
    return { checked: true, ok: false, error: String(error?.message ?? error), liveRunCount: null };
  }
}

function runNextLegalActionApply() {
  const result = spawnSync("pnpm", ["run", "softwarehouse:next-legal-action:apply"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    timeout: childTimeoutMs,
  });
  return {
    command: "pnpm run softwarehouse:next-legal-action:apply",
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message ?? result.error) : null,
    stdout: String(result.stdout ?? "").slice(0, 30_000),
    stderr: String(result.stderr ?? "").slice(0, 30_000),
    parsedOutput: parseLastJsonBlock(result.stdout),
  };
}

export async function finalizeRecurringIssue({
  apiBase: targetApiBase,
  currentIssueId: issueId,
  currentRunId: runId,
  currentApiKey: apiKey = currentApiKey,
  step,
  fetchImpl = fetch,
}) {
  if (!issueId) {
    return { attempted: false, reason: "not_running_from_paperclip_issue" };
  }

  const decision = step?.action?.parsedOutput?.action?.decision
    ?? step?.action?.parsedOutput?.decision
    ?? step?.action?.decision
    ?? "cycle_complete";

  const currentIssueResponse = await fetchImpl(`${targetApiBase}/api/issues/${encodeURIComponent(issueId)}`, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      ...(runId ? { "x-paperclip-run-id": runId } : {}),
    },
  });
  if (!currentIssueResponse.ok) {
    const responseText = await currentIssueResponse.text();
    throw new Error(`Failed to load recurring watchdog issue before finalizing (${currentIssueResponse.status}): ${responseText}`);
  }
  const currentIssue = await currentIssueResponse.json();
  const currentLockRunId = currentIssue?.checkoutRunId ?? currentIssue?.executionRunId ?? null;
  if (currentLockRunId && currentLockRunId !== runId) {
    return {
      attempted: false,
      ok: false,
      status: 409,
      decision,
      deferred: true,
      reason: `issue_locked_by_${currentLockRunId}`,
    };
  }

  const response = await fetchImpl(`${targetApiBase}/api/issues/${encodeURIComponent(issueId)}`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      ...(runId ? { "x-paperclip-run-id": runId } : {}),
    },
    body: JSON.stringify({
      status: "todo",
      comment: [
        "Continuation watchdog cycle complete.",
        `Decision: \`${decision}\`.`,
        "Final disposition: `todo` for the next scheduled cycle; this recurring controller does not remain `in_progress` between runs.",
      ].join("\n"),
    }),
  });
  const responseText = await response.text();
  if (!response.ok) {
    if (response.status === 409) {
      return {
        attempted: true,
        ok: false,
        status: response.status,
        decision,
        deferred: true,
        reason: responseText,
      };
    }
    throw new Error(`Failed to finalize recurring watchdog issue (${response.status}): ${responseText}`);
  }
  return {
    attempted: true,
    ok: true,
    status: response.status,
    decision,
  };
}

async function writeSnapshot(snapshot) {
  await mkdir("report", { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const iterations = [];
  let iteration = 0;

  while (true) {
    iteration += 1;
    const liveBefore = await probeLiveRuns();
    const step = {
      iteration,
      checkedAt: new Date().toISOString(),
      liveBefore,
      action: null,
      liveAfter: null,
      finalDisposition: null,
    };

    // The next-action selector and local lane starter enforce per-agent and
    // per-project WIP. Do not turn one productive run into a company-wide
    // mutex: an independent Soar, Roost, or operating-system lane may still be
    // legal. The selector returns supervision-only when no safe lane exists.
    step.action = runNextLegalActionApply();
    step.liveAfter = await probeLiveRuns();

    step.finalDisposition = await finalizeRecurringIssue({
      apiBase,
      currentIssueId,
      currentRunId,
      step,
    });

    iterations.push(step);
    await writeSnapshot({
      startedAt,
      generatedAt: new Date().toISOString(),
      mode: loop ? "loop" : "once",
      intervalMs,
      maxIterations,
      iterationCount: iterations.length,
      latest: step,
      iterations: iterations.slice(-20),
    });

    if (!loop) break;
    if (maxIterations > 0 && iteration >= maxIterations) break;
    await sleep(intervalMs);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
