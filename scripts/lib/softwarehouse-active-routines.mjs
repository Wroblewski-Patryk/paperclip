export { softwarehouseActiveApplicationProjectNames } from "./softwarehouse-project-registry.mjs";
import { softwarehouseActiveApplicationProjectNames } from "./softwarehouse-project-registry.mjs";

export const softwarehouseApplicationRoutineLibrarySpecs = softwarehouseActiveApplicationProjectNames.flatMap((projectName) => [
  {
    title: `[${projectName}] Daily project status refresh`,
    scheduleLabel: `Daily ${projectName} PM status at 09:45`,
  },
  {
    title: `[${projectName}][PM] No-stall queue expeditor`,
    scheduleLabel: `Every 30 minutes while ${projectName} is active`,
  },
  {
    title: `[${projectName}] Known-state and map drift sweep`,
    scheduleLabel: `${projectName} known-state and map drift every 6 hours`,
  },
  {
    title: `[${projectName}] Source-control closure sweep`,
    scheduleLabel: `${projectName} source-control closure every 2 hours`,
  },
]);

// Keep one low-frequency project truth refresh per active application. The
// autonomy governor already owns queue dispatch, source-control classification,
// and known-state refresh through the control tick, so scheduling the three
// additional per-project controllers only duplicates work and comments.
export const activeApplicationRoutineSpecs = softwarehouseApplicationRoutineLibrarySpecs.filter(
  (routine) => routine.title.endsWith("Daily project status refresh"),
);

export const softwarehouseRoutineTitleRenames = new Map([
  ["[Softwarehouse] Autonomy governor", "11 Innovation: Autonomy Governor"],
  ["[Softwarehouse] Continuation watchdog", "11 Innovation: Continuation Watchdog"],
  ["[Softwarehouse] Longevity doctor and watchdog", "09 Technology: Longevity Doctor and Watchdog"],
  ["[Softwarehouse] Gate freshness watcher", "04 Operations: Gate Freshness Watcher"],
  ["[Softwarehouse] Stale board janitor", "09 Technology: Stale Board Janitor"],
  ["[Softwarehouse] Agent health and model governance", "09 Technology: Agent Health and Model Governance"],
  ["[Softwarehouse] AI-agent development review", "06 People: AI-Agent Development Review"],
  ["[Softwarehouse] Organizational learning loop", "04 Operations: Organizational Learning Loop"],
  ["[Softwarehouse] Longevity snapshot backup", "04 Operations: Longevity Snapshot Backup"],
]);

const softwarehousePilotLegacyActiveRoutineTitles = new Set([
  "[Softwarehouse] Autonomy governor",
  "[Softwarehouse] Agent health and model governance",
  "[Softwarehouse] Longevity doctor and watchdog",
  "[Softwarehouse] Longevity snapshot backup",
  "[Softwarehouse] Organizational learning loop",
  ...activeApplicationRoutineSpecs.map((routine) => routine.title),
]);

export function canonicalSoftwarehouseRoutineTitle(title) {
  return softwarehouseRoutineTitleRenames.get(title) ?? title;
}

export const softwarehousePilotActiveRoutineTitles = new Set(
  [...softwarehousePilotLegacyActiveRoutineTitles].map(canonicalSoftwarehouseRoutineTitle),
);

export const softwarehousePilotActiveRuntimeRoutineTitles = new Set([
  ...softwarehousePilotLegacyActiveRoutineTitles,
  ...softwarehousePilotActiveRoutineTitles,
]);

const softwarehousePilotLegacyRoutineScheduleLabels = new Map([
  ["[Softwarehouse] Autonomy governor", "Every 30 minutes autonomy governor"],
  ["[Softwarehouse] Continuation watchdog", "Every 5 minutes continuation watchdog"],
  ["[Softwarehouse] Gate freshness watcher", "Every 30 minutes gate freshness watcher"],
  ["[Soar] Daily project status refresh", "Daily PM status at 09:30"],
  ["[Soar][PM] No-stall queue expeditor", "Every 30 minutes while Soar is in V1 takeover"],
  ["[Soar] Autonomous idle and map drift sweep", "Paused Soar idle/map drift sweep - use only after release blockers shrink"],
  ["[Soar] Regression evidence sweep", "Daily Soar regression evidence sweep"],
  ["[Soar] V1 audit-to-completion controller", "Every 3 hours Soar V1 audit-to-completion controller"],
  ["[Soar] Gap register and repair lane refresh", "Every 3 hours Soar gap register refresh while V1 is blocked"],
  ["[Soar] Coolify production deploy health sweep", "Daily Soar Coolify deploy health sweep unless fresh gate event requires sooner"],
  ["[Soar] Security and account-access gate sweep", "Daily security/account gate at 11:00"],
  ["[Softwarehouse] Architecture awareness graph sync", "Daily architecture awareness graph sync"],
  ["[Softwarehouse] Stale board janitor", "Hourly stale board janitor"],
  ["[Softwarehouse] Agent health and model governance", "Daily agent health and model audit at 08:00"],
  ["[Softwarehouse] Docs and memory loop", "Daily docs and memory loop at 14:00"],
  ["[Softwarehouse] Template feedback sweep", "Weekly template feedback on Friday"],
  ["[Softwarehouse] Longevity doctor and watchdog", "Hourly longevity doctor"],
  ["[Softwarehouse] Longevity snapshot backup", "Daily redacted longevity snapshot"],
  ["[Softwarehouse] Organizational learning loop", "Daily learning loop"],
  ["[Softwarehouse] Company value-stream governance", "Daily company value-stream governance at 08:20"],
  ["[Softwarehouse] Human decision inbox steward", "Daily human decision inbox steward at 08:45"],
  ["[Softwarehouse] Product acceptance gate review", "Product acceptance gate review every 4 hours"],
  ["[Softwarehouse] CTO technical acceptance gate review", "CTO technical acceptance gate review every 4 hours"],
  ["[Softwarehouse] AI-agent development review", "Daily AI-agent development review"],
  ["[Softwarehouse] Organizational learning and agent improvement review", "Weekly organizational learning and agent improvement review"],
  ...softwarehouseApplicationRoutineLibrarySpecs.map((routine) => [routine.title, routine.scheduleLabel]),
]);

export const softwarehousePilotRoutineScheduleLabels = new Map(
  [...softwarehousePilotLegacyRoutineScheduleLabels].flatMap(([title, label]) => {
    const canonicalTitle = canonicalSoftwarehouseRoutineTitle(title);
    return canonicalTitle === title
      ? [[title, label]]
      : [[title, label], [canonicalTitle, label]];
  }),
);

export function isSoftwarehousePilotRoutineTitle(title) {
  return softwarehousePilotActiveRoutineTitles.has(canonicalSoftwarehouseRoutineTitle(title));
}
