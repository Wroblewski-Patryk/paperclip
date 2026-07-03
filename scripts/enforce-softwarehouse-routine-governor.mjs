import {
  softwarehousePilotActiveRoutineTitles,
  softwarehousePilotRoutineScheduleLabels,
} from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;

const activeRoutineTitles = softwarehousePilotActiveRoutineTitles;
const canonicalScheduleByRoutineTitle = softwarehousePilotRoutineScheduleLabels;

const parallelExecutionPolicy = [
  "",
  "",
  "Parallel execution policy: Paperclip may run independent lanes in parallel according to agent/runtime limits.",
  "Do not impose a global one-lane or five-lane cap. Coordination agents prevent duplicate, dependency-conflicting, or unsafe work instead.",
  "Per-agent WIP limit: one agent may have only one active execution lane at a time. If a specialist is already running, queue additional requests instead of starting a second live run or mixing project contexts.",
  "Project Managers are per project. They may coordinate many queued issues, but each PM run should produce one clear decision, handoff, or status integration before moving to the next lane.",
  "Production/operator gates are valid autonomous outcomes: if work is blocked on explicit approval, operator logs, restart/redeploy permission, or an accepted deeper-blocker decision, keep the issue blocked fail-closed with owner/action/evidence instead of retrying it.",
  "Pending review interactions (request_confirmation, request_checkbox_confirmation, ask_user_questions, suggest_tasks) are hard stop signs; do not reopen, resume, reassign, or work around that issue until the board/user resolves the interaction.",
  "Use `pnpm softwarehouse:control-tick` as the control signal. Treat controlDecision, nextControlActions, effectiveOperatingPosture, operatingPosture, readinessOperatingPosture, readinessOperatingConstraints, allowedWhileBlocked, and forbiddenWhileBlocked as the execution contract before waking or mutating anything.",
  "Read nextControlActions as the short PM/operator handoff: execute or report those actions first, then use the detailed posture fields only to resolve ambiguity.",
  "Treat `Stale gate owner action:` lines as safe organizational escalation only: the named owner must obtain a fresh accepted operator/credential fact or keep the blocker closed with a next review condition. This is not approval to run a protected recheck, mutate a repo, push, deploy, restart, or touch secrets.",
  "Treat `controlBrief.deliveryPermission` as the lane-start authority. If `canStartNewLane=false`, do not start a new lane even when no live runs exist; only execute the listed `allowedLaneTypes`.",
  "Treat `controlBrief.autonomyDisposition` as the human-readable company state. `intentional_gate_hold` means the company is not idle; it is deliberately waiting on accepted gate facts while safe packet refresh, stale-gate owner escalation, and Paperclip OS improvements remain allowed.",
  "Use the softwarehouse audit autonomyPosture as secondary detail: can_start_parallel_lanes wakes safe independent runnable issues; active_work_running supervises current work; needs_review_closure closes or returns review issues; waiting_for_operator_gate reports the pending confirmation and keeps safe non-production evidence lanes alive.",
  "When the active app is gated by production/operator approval, safe non-production work should continue through PM status, architecture/map drift, regression evidence, gap register, docs/memory, and security/account-safety lanes as long as they cannot touch deploy, secrets, live data, or production accounts.",
  "Parent/controller issues must not wake repeatedly just to regenerate manifests; use a gate issue and close existing artifacts first.",
  "Dirty worktree state is not an operator gate by default. Continue on top of relevant same-lane dirty work with a baseline note; stop only for unrelated overwrite risk, secrets/local env/log exposure, merge conflicts, unattributed generated churn, push/deploy/production mutation, credential handling, or broad destructive filesystem work.",
  "Status-sync comments are not work. Record at most one durable acknowledgement for a non-terminal active run, then stop writing status-sync comments until there is a new operational fact: completed work, changed run state, a real blocker, a new runnable lane, or a handoff decision.",
  "Ownership sync is not an unblock. When changing assignee/owner on a blocked issue, preserve `status: blocked` in the same update and avoid ordinary comments that can implicitly move the issue to todo or wake a continuation. Add a separate fresh operator approval only when the gate is intentionally allowed to run.",
  "Do not wake or resume a routine/controller issue solely because of its own status-sync comments. Repeated status-sync comments are churn and should be collapsed before starting real work.",
  "Control-loop source-control states are first-class outcomes: project_source_control_closure_needed routes through the existing project PM/source-control lane; project_source_control_gate_blocked keeps the gate blocked without duplicate cleanup/commit work but allows read-only source-control classification from the packet as Paperclip issue comments only and safe architecture planning as Paperclip backlog/issues only; operating_source_control_closure_needed closes Paperclip OS changes before broader delivery.",
  "When operatingPosture is project_repo_mutation_blocked_monitoring_allowed, keep supervision and packets fresh, execute read-only source-control classification when listed by commenting in Paperclip only, seed safe architecture planning/backlog lanes in Paperclip when listed, and improve only Paperclip OS/process logic outside the blocked project repo; obey forbiddenWhileBlocked literally.",
  "When operatorActionPacket.status is operator_input_or_gate_evidence_needed, surface that redacted packet as the operator-facing unblock summary and wait for one accepted fresh fact before resuming protected project mutation.",
  "When postureConsistent is false, obey effectiveOperatingPosture and record the mismatch as a control-loop inconsistency before waking any lane.",
  "When readinessOperatingConstraints are present, pass them into PM handoffs so project managers know whether they may deliver, only supervise, or must wait for a gate fact.",
  "Stale board janitor should run `node scripts/run-live-run-janitor.mjs` before narrative cleanup; apply only named closed-issue live-run tails or governor self-supervision loops.",
  "Done issues stay done unless explicit reopen/resume intent moves them through todo before live checkout.",
].join("\n");

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return data;
}

function withParallelExecutionPolicy(description) {
  const text = description ?? "";
  const withoutOldPolicy = text
    .replace(/\n\nCapacity governor:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "")
    .replace(/\n\nParallel execution policy:[\s\S]*?Done issues stay done unless explicit reopen\/resume intent moves them through todo before live checkout\./g, "");
  return `${withoutOldPolicy}${parallelExecutionPolicy}`.trim();
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, liveRuns, routines] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/live-runs`),
  request("GET", `/api/companies/${company.id}/routines`),
]);

const liveRunCount = Array.isArray(liveRuns) ? liveRuns.length : 0;
const activeRunCount = Math.max(Number(health.devServer?.activeRunCount ?? 0), liveRunCount);
if (activeRunCount > 0) {
  console.error(`Refusing to rewrite routine posture while ${activeRunCount} run(s) are active.`);
  process.exit(2);
}

const updates = [];
for (const routine of routines) {
  const shouldBeActive = activeRoutineTitles.has(routine.title);
  const nextStatus = shouldBeActive ? "active" : "paused";
  const patch = {};
  if (routine.status !== nextStatus) patch.status = nextStatus;
  const nextDescription = withParallelExecutionPolicy(routine.description);
  if (nextDescription !== (routine.description ?? "")) patch.description = nextDescription;

  if (Object.keys(patch).length > 0) {
    const updated = await request("PATCH", `/api/routines/${routine.id}`, patch);
    updates.push({ title: routine.title, from: routine.status, to: updated.status });
  }

  const detail = await request("GET", `/api/routines/${routine.id}`);
  const canonicalScheduleLabel = canonicalScheduleByRoutineTitle.get(routine.title) ?? null;
  for (const trigger of detail.triggers ?? []) {
    if (trigger.kind !== "schedule") continue;
    const shouldEnableTrigger = shouldBeActive && trigger.label === canonicalScheduleLabel;
    if (trigger.enabled === shouldEnableTrigger) continue;
    await request("PATCH", `/api/routine-triggers/${trigger.id}`, {
      label: trigger.label,
      enabled: shouldEnableTrigger,
      cronExpression: trigger.cronExpression,
      timezone: trigger.timezone,
    });
    updates.push({
      title: routine.title,
      trigger: trigger.label,
      enabled: shouldEnableTrigger,
    });
  }
}

const finalRoutines = await request("GET", `/api/companies/${company.id}/routines`);
const activeRoutines = finalRoutines.filter((routine) => routine.status === "active").map((routine) => routine.title);

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  activeRunCount,
  liveRunCount,
  updates,
  activeRoutines,
  pausedRoutineCount: finalRoutines.filter((routine) => routine.status === "paused").length,
}, null, 2));
