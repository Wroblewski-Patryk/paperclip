import path from "node:path";
import { readFile } from "node:fs/promises";

const nonBlockingGapStatuses = new Set(["accepted_deferral", "blocked_external_non_blocking"]);

function defaultTrackRoots(cwd = process.cwd()) {
  return new Map([
    ["Soar", process.env.SOAR_ROOT ?? path.resolve(cwd, "..", "Soar")],
    ["Roost", process.env.ROOST_ROOT ?? path.resolve(cwd, "..", "Roost")],
  ]);
}

async function readJsonIfPresent(filePath) {
  try {
    const text = globalThis.__paperclipTrackTruthReadFile
      ? await globalThis.__paperclipTrackTruthReadFile(filePath)
      : await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readTextIfPresent(filePath) {
  try {
    return globalThis.__paperclipTrackTruthReadFile
      ? await globalThis.__paperclipTrackTruthReadFile(filePath)
      : await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseGapRegister(markdown) {
  const rows = [];
  for (const line of String(markdown ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6 || cells[0] === "ID") continue;
    rows.push({
      id: cells[0],
      domain: cells[1],
      status: cells[2],
      blockingScope: cells[3],
      evidence: cells[4],
      nextOwnerAction: cells[5],
    });
  }
  return rows;
}

function summarizeGapRegisterEntries(entries) {
  const openBlockingEntries = entries.filter((entry) => entry.status === "open");
  const deferredEntries = entries.filter((entry) => entry.status === "accepted_deferral");
  const externalNonBlockingEntries = entries.filter((entry) => entry.status === "blocked_external_non_blocking");
  return {
    entries,
    openBlockingEntries,
    deferredEntries,
    externalNonBlockingEntries,
  };
}

function truthHoldFor(summary) {
  if (summary.currentGapCount > 0) {
    return {
      allowsNewProductLane: true,
      holdReason: null,
      holdSummary: null,
    };
  }

  if (summary.openBlockingEntries.length > 0) {
    const ids = summary.openBlockingEntries.map((entry) => entry.id).join(", ");
    return {
      allowsNewProductLane: false,
      holdReason: "release_gap_open_blocker_only",
      holdSummary: `Current project truth has no routable gaps; release gap register stays blocked by ${ids}.`,
    };
  }

  if (
    summary.entries.length > 0
    && summary.entries.every((entry) => nonBlockingGapStatuses.has(entry.status))
  ) {
    const statuses = [
      summary.deferredEntries.length > 0 ? `${summary.deferredEntries.length} accepted deferral` : null,
      summary.externalNonBlockingEntries.length > 0 ? `${summary.externalNonBlockingEntries.length} external non-blocking` : null,
    ].filter(Boolean).join(", ");
    return {
      allowsNewProductLane: false,
      holdReason: "release_gap_non_blocking_only",
      holdSummary: `Current project truth has no routable gaps; remaining release entries are ${statuses}.`,
    };
  }

  if (summary.projectTruthStatus && summary.currentGapCount === 0) {
    return {
      allowsNewProductLane: false,
      holdReason: "project_truth_intentionally_empty",
      holdSummary: `Current project truth is ${summary.projectTruthStatus} with zero routable gaps.`,
    };
  }

  return {
    allowsNewProductLane: true,
    holdReason: null,
    holdSummary: null,
  };
}

export async function loadTrackTruthByTrack({
  cwd = process.cwd(),
  tracks = ["Soar", "Roost"],
} = {}) {
  const roots = defaultTrackRoots(cwd);
  const summaryByTrack = new Map();

  for (const track of tracks) {
    const root = roots.get(track);
    if (!root) continue;
    const projectTruth = await readJsonIfPresent(path.join(root, "docs", "status", "project-truth-index.json"));
    const releaseGapRegisterText = await readTextIfPresent(
      path.join(root, "docs", "releases", `${track.toLowerCase()}-v1-0-gap-register.md`),
    );
    const parsedEntries = summarizeGapRegisterEntries(parseGapRegister(releaseGapRegisterText));
    const currentGapCount = Number(projectTruth?.counts?.totalGaps ?? projectTruth?.gaps?.length ?? 0);
    const summary = {
      track,
      root,
      projectTruthStatus: projectTruth?.status ?? null,
      currentGapCount,
      firstGap: projectTruth?.firstGap ?? null,
      entries: parsedEntries.entries,
      openBlockingEntries: parsedEntries.openBlockingEntries,
      deferredEntries: parsedEntries.deferredEntries,
      externalNonBlockingEntries: parsedEntries.externalNonBlockingEntries,
    };
    summaryByTrack.set(track, {
      ...summary,
      ...truthHoldFor(summary),
    });
  }

  return summaryByTrack;
}
