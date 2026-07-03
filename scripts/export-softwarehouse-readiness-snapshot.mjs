import { readFile, mkdir, writeFile } from "node:fs/promises";

const controlTickPath = "report/softwarehouse-control-tick.latest.json";
const jsonOutputPath = "report/softwarehouse-readiness-snapshot.latest.json";
const markdownOutputPath = "report/softwarehouse-readiness-snapshot.latest.md";

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

function buildSnapshot(packet) {
  const blockedGates = blockedGateSummary(packet);
  const dirtyProjects = dirtyProjectSummary(packet);
  const sourceControlGates = sourceControlGateSummary(packet);
  return {
    generatedAt: new Date().toISOString(),
    sourceControlTickGeneratedAt: packet.generatedAt ?? null,
    ok: packet.ok ?? null,
    auditOverall: packet.auditOverall ?? null,
    controlDecision: packet.controlDecision ?? null,
    effectiveOperatingPosture: packet.effectiveOperatingPosture ?? null,
    supervisionReady: packet.supervisionReady ?? null,
    twoProjectFullDeliveryReady: packet.twoProjectFullDeliveryReady ?? null,
    activeRunCount: packet.activeRunCount ?? null,
    liveRunCount: packet.liveRunCount ?? null,
    restartRequired: packet.steps?.find((step) => step.name === "softwarehouseAudit")?.summary?.restartRequired ?? null,
    operatorActionStatus: packet.operatorActionPacket?.status ?? null,
    recommendedAction: packet.recommendedAction ?? null,
    blockedGates,
    sourceControlGates,
    dirtyProjects,
    allowedWhileBlocked: packet.allowedWhileBlocked ?? [],
    forbiddenWhileBlocked: packet.forbiddenWhileBlocked ?? [],
    requiredBeforeFullDelivery: packet.requiredBeforeFullDelivery ?? [],
    nextControlActions: packet.nextControlActions ?? [],
  };
}

function renderMarkdown(snapshot) {
  return [
    "# Softwarehouse Readiness Snapshot",
    "",
    "Runtime-only summary generated from `report/softwarehouse-control-tick.latest.json`.",
    "",
    table([
      ["generatedAt", snapshot.generatedAt],
      ["controlTickGeneratedAt", snapshot.sourceControlTickGeneratedAt],
      ["ok", snapshot.ok],
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

const raw = await readFile(controlTickPath, "utf8");
const packet = JSON.parse(raw);
const snapshot = buildSnapshot(packet);

await mkdir("report", { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(markdownOutputPath, renderMarkdown(snapshot));

console.log(JSON.stringify({
  ok: true,
  outputs: [jsonOutputPath, markdownOutputPath],
  snapshot,
}, null, 2));
