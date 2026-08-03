export const DEFAULT_MAX_SOURCE_AGE_MS = 15 * 60 * 1_000;

function list(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function table(rows) {
  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${String(value ?? "null").replace(/\|/g, "\\|")} |`),
  ].join("\n");
}

function dirtyProjectSummary(packet) {
  return (packet.operatorActionPacket?.dirtyProjects ?? []).map((project) => ({
    project: project.project,
    dirtyCount: project.dirtyCount ?? 0,
    groups: (project.dirtyGroups ?? []).map((group) => `${group.group}:${group.count}`),
  }));
}

function blockedGateSummary(packet) {
  return (packet.operatorActionPacket?.blockedGates ?? []).map((gate) => ({
    project: gate.project,
    rootBlocker: gate.rootBlocker,
    owner: gate.owner,
    evidenceRequired: gate.evidenceRequired,
  }));
}

function sourceControlGateSummary(packet) {
  return (packet.operatorActionPacket?.sourceControlGates ?? []).map((gate) => ({
    identifier: gate.identifier,
    status: gate.status,
    title: gate.title,
  }));
}

export function resolveSnapshotFreshness(sourceGeneratedAt, {
  now = new Date(),
  maxSourceAgeMs = DEFAULT_MAX_SOURCE_AGE_MS,
} = {}) {
  const sourceTimestampMs = Date.parse(sourceGeneratedAt ?? "");
  const sourceAgeMs = Number.isFinite(sourceTimestampMs)
    ? Math.max(0, now.getTime() - sourceTimestampMs)
    : null;
  const stale = sourceAgeMs === null || sourceAgeMs > maxSourceAgeMs;
  return {
    status: stale ? "stale" : "fresh",
    stale,
    sourceAgeMs,
    maxSourceAgeMs,
  };
}

export function buildSnapshot(packet, options = {}) {
  const now = options.now ?? new Date();
  const freshness = resolveSnapshotFreshness(packet.generatedAt, {
    now,
    maxSourceAgeMs: options.maxSourceAgeMs,
  });
  const blockedGates = blockedGateSummary(packet);
  const dirtyProjects = dirtyProjectSummary(packet);
  const sourceControlGates = sourceControlGateSummary(packet);
  return {
    generatedAt: now.toISOString(),
    sourceControlTickGeneratedAt: packet.generatedAt ?? null,
    freshness,
    stale: freshness.stale,
    currentStateUsable: !freshness.stale,
    ok: freshness.stale ? false : packet.ok ?? null,
    sourceOk: packet.ok ?? null,
    auditOverall: packet.auditOverall ?? null,
    controlDecision: packet.controlDecision ?? null,
    effectiveOperatingPosture: packet.effectiveOperatingPosture ?? null,
    supervisionReady: packet.supervisionReady ?? null,
    twoProjectFullDeliveryReady: packet.twoProjectFullDeliveryReady ?? null,
    activeRunCount: packet.activeRunCount ?? null,
    liveRunCount: packet.liveRunCount ?? null,
    restartRequired: packet.steps?.find((step) => step.name === "softwarehouseAudit")?.summary?.restartRequired ?? null,
    operatorActionStatus: packet.operatorActionPacket?.status ?? null,
    recommendedAction: freshness.stale
      ? "Run a fresh softwarehouse control tick before using this snapshot for decisions."
      : packet.recommendedAction ?? null,
    blockedGates,
    sourceControlGates,
    dirtyProjects,
    allowedWhileBlocked: packet.allowedWhileBlocked ?? [],
    forbiddenWhileBlocked: packet.forbiddenWhileBlocked ?? [],
    requiredBeforeFullDelivery: packet.requiredBeforeFullDelivery ?? [],
    nextControlActions: packet.nextControlActions ?? [],
    // These fields are consumed by the versioned Softwarehouse status and
    // Paperclip -> Roost projection routes. A summary export must preserve
    // their structured data rather than silently turning a healthy portfolio
    // into an empty owner map.
    controlBrief: packet.controlBrief ?? null,
    projectTruthAudit: packet.projectTruthAudit ?? null,
  };
}

export function renderMarkdown(snapshot) {
  const staleWarning = snapshot.stale
    ? [
        "> [!WARNING]",
        "> This export is stale and must not be used as current operating truth. Run a fresh control tick first.",
        "",
      ]
    : [];
  return [
    "# Softwarehouse Readiness Snapshot",
    "",
    "Runtime-only summary generated from `report/softwarehouse-control-tick.latest.json`.",
    "",
    ...staleWarning,
    table([
      ["generatedAt", snapshot.generatedAt],
      ["controlTickGeneratedAt", snapshot.sourceControlTickGeneratedAt],
      ["freshness", snapshot.freshness?.status],
      ["sourceAgeMs", snapshot.freshness?.sourceAgeMs],
      ["maxSourceAgeMs", snapshot.freshness?.maxSourceAgeMs],
      ["currentStateUsable", snapshot.currentStateUsable],
      ["ok", snapshot.ok],
      ["sourceOk", snapshot.sourceOk],
      ["auditOverall", snapshot.auditOverall],
      ["controlDecision", snapshot.controlDecision],
      ["effectiveOperatingPosture", snapshot.effectiveOperatingPosture],
      ["operatorActionStatus", snapshot.operatorActionStatus],
      ["supervisionReady", snapshot.supervisionReady],
      ["twoProjectFullDeliveryReady", snapshot.twoProjectFullDeliveryReady],
      ["activeRunCount", snapshot.activeRunCount],
      ["liveRunCount", snapshot.liveRunCount],
      ["restartRequired", snapshot.restartRequired],
    ]),
    "",
    "## Recommended Action",
    "",
    snapshot.recommendedAction ?? "none",
    "",
    "## Blocked Gates",
    "",
    list(snapshot.blockedGates.map((gate) =>
      `${gate.project} ${gate.rootBlocker} (${gate.owner}): ${gate.evidenceRequired}`
    )),
    "",
    "## Source-Control Gates",
    "",
    list(snapshot.sourceControlGates.map((gate) =>
      `${gate.identifier} ${gate.status}: ${gate.title}`
    )),
    "",
    "## Dirty Projects",
    "",
    list(snapshot.dirtyProjects.map((project) =>
      `${project.project}: ${project.dirtyCount} change(s); ${project.groups.join(", ")}`
    )),
    "",
    "## Required Before Full Delivery",
    "",
    list(snapshot.requiredBeforeFullDelivery),
    "",
    "## Allowed While Blocked",
    "",
    list(snapshot.allowedWhileBlocked),
    "",
    "## Forbidden While Blocked",
    "",
    list(snapshot.forbiddenWhileBlocked),
    "",
    "## Next Control Actions",
    "",
    list(snapshot.nextControlActions),
    "",
  ].join("\n");
}
