import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

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
    const normalizedLiveRuns = Array.isArray(liveRuns)
      ? liveRuns.map((run) => ({
          id: run.id,
          status: run.status,
          issueId: run.issueId ?? null,
          issueIdentifier: run.issueIdentifier ?? null,
          agentName: run.agentName ?? null,
          lastOutputAt: run.lastOutputAt ?? null,
          effectiveQuotaLane: run.effectiveQuotaLane ?? null,
          effectiveModel: run.effectiveModel ?? null,
        }))
      : [];
    const selfRuns = normalizedLiveRuns.filter(
      (run) =>
        (currentRunId && run.id === currentRunId) ||
        (currentIssueId && run.issueId === currentIssueId) ||
        (currentIssueId && run.issueIdentifier === currentIssueId),
    );
    const selfRunSet = new Set(selfRuns);
    const externalLiveRuns = normalizedLiveRuns.filter((run) => !selfRunSet.has(run));
    return {
      checked: true,
      ok: true,
      observedLiveRunCount: normalizedLiveRuns.length,
      ignoredSelfRunCount: selfRuns.length,
      liveRunCount: externalLiveRuns.length,
      liveRuns: externalLiveRuns,
      ignoredSelfRuns: selfRuns,
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
    };

    if (liveBefore.ok && Number(liveBefore.liveRunCount ?? 0) > 0) {
      step.action = {
        decision: "supervise_active_runs",
        reason: "A live run exists, so the watchdog must not start duplicate owner work.",
      };
    } else {
      step.action = runNextLegalActionApply();
      step.liveAfter = await probeLiveRuns();
    }

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

await main();
