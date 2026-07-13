import {
  softwarehousePilotActiveRoutineTitles,
  softwarehousePilotRoutineScheduleLabels,
} from "./lib/softwarehouse-active-routines.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyNames = [
  process.env.SOFTWAREHOUSE_COMPANY_NAME,
  process.env.PAPERCLIP_COMPANY_NAME,
  "LuckySparrow",
  "LuckySparrow Software House",
].filter(Boolean);
const legacyAutonomyRoutineTitle = "[Softwarehouse] Single-lane autonomy governor";
const autonomyRoutineTitle = "[Softwarehouse] Autonomy governor";
const autonomyScheduleLabel = "Every 30 minutes autonomy governor";
const autonomyScheduleCron = "2,32 * * * *";

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

function byName(items, name) {
  return items.find((item) => item.name === name);
}

function byNameAlias(items, names) {
  return items.find((item) => names.includes(item.name));
}

function byNameOrUrlKey(items, names, urlKeys = []) {
  return items.find((item) => names.includes(item.name) || urlKeys.includes(item.urlKey));
}

function byRosterKey(items, rosterKey) {
  return items.find((item) => item.metadata?.rosterKey === rosterKey);
}

function byTitle(items, title) {
  return items.find((item) => item.title === title);
}

function timestampMs(value) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : 0;
}

function canonicalRoutineIdsByTitleFor(routines) {
  const groups = new Map();
  for (const routine of routines) {
    if (!groups.has(routine.title)) groups.set(routine.title, []);
    groups.get(routine.title).push(routine);
  }
  const canonical = new Map();
  for (const [title, items] of groups) {
    const keep = [...items].sort((a, b) =>
      timestampMs(a.createdAt) - timestampMs(b.createdAt)
      || String(a.id).localeCompare(String(b.id))
    )[0];
    canonical.set(title, keep.id);
  }
  return canonical;
}

async function ensureRoutine(companyId, routinesByTitle, input) {
  const existing = routinesByTitle.get(input.title) ?? routinesByTitle.get(legacyAutonomyRoutineTitle);
  if (existing) {
    const updated = await request("PATCH", `/api/routines/${existing.id}`, input);
    routinesByTitle.set(input.title, updated);
    return updated;
  }
  const created = await request("POST", `/api/companies/${companyId}/routines`, input);
  routinesByTitle.set(input.title, created);
  return created;
}

async function ensureScheduleTrigger(routineId, input) {
  const detail = await request("GET", `/api/routines/${routineId}`);
  const existing = detail.triggers?.find((trigger) => trigger.kind === "schedule" && trigger.label === input.label);
  if (existing) return request("PATCH", `/api/routine-triggers/${existing.id}`, input);
  return request("POST", `/api/routines/${routineId}/triggers`, {
    kind: "schedule",
    ...input,
  });
}

const activeRoutineTitles = softwarehousePilotActiveRoutineTitles;
const activeRoutineSchedules = softwarehousePilotRoutineScheduleLabels;

async function applySchedulePosture(routines) {
  const changes = [];
  for (const routine of routines) {
    const detail = await request("GET", `/api/routines/${routine.id}`);
    const allowedLabel = activeRoutineSchedules.get(routine.title);
    for (const trigger of detail.triggers ?? []) {
      if (trigger.kind !== "schedule") continue;
      const allowed = Boolean(allowedLabel && trigger.label === allowedLabel);
      if (trigger.enabled === allowed) continue;
      await request("PATCH", `/api/routine-triggers/${trigger.id}`, {
        label: trigger.label,
        enabled: allowed,
        cronExpression: trigger.cronExpression,
        timezone: trigger.timezone,
      });
      changes.push({ routine: routine.title, trigger: trigger.label, enabled: allowed });
    }
  }
  return changes;
}

async function main() {
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNames.includes(candidate.name));
  if (!company) throw new Error(`Company not found. Tried: ${companyNames.join(" / ")}`);

  const [health, agents, projects, routines, goals] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/routines`),
    request("GET", `/api/companies/${company.id}/goals`),
  ]);

  const activeRunCount = health.devServer?.activeRunCount ?? 0;
  if (activeRunCount > 0) {
    throw new Error(`Refusing to reconfigure autonomy while ${activeRunCount} run(s) are active.`);
  }

  const activeProjects = projects.filter((project) => !project.archivedAt);
  const operating = byNameOrUrlKey(
    activeProjects,
    ["Softwarehouse Operating System", "Softwarehouse", "00 General: Softwarehouse"],
    ["softwarehouse", "00-general-softwarehouse"],
  );
  const soar = byNameOrUrlKey(
    activeProjects,
    ["Soar", "11 Innovation: Soar"],
    ["soar", "11-innovation-soar"],
  );
  const portfolio = byNameAlias(agents, ["Portfolio Director", "11 IPM (Innovation Portfolio Manager)"])
    ?? byRosterKey(agents, "innovation-portfolio-manager");
  const innovations = byNameAlias(agents, ["11 Innovations Director", "11 CINO (Chief Innovation Officer)"])
    ?? byRosterKey(agents, "chief-innovation-officer");
  const cto = byNameAlias(agents, ["CTO Architect", "09 CTO (Chief Technology Officer)"]);
  const soarPm = byNameAlias(agents, ["Soar Project Manager", "11 SPM (Soar Product Manager)"]);
  const governorOwner = portfolio ?? innovations ?? cto ?? soarPm ?? agents.find((agent) => agent.role === "pm") ?? null;
  const goal = byTitle(goals, "Softwarehouse operating cadence")
    ?? byTitle(goals, "Soar: sellable or personally excellent product");
  if (!operating || !soar) throw new Error("Required projects are missing. Run the softwarehouse bootstrap/configuration scripts first.");
  if (!governorOwner) throw new Error("No Portfolio/Innovation/CTO/Soar PM agent found.");

  const description = [
    "Autonomous control loop for LuckySparrow Software House.",
    "",
    "This routine keeps the company moving through explicit queues, handoffs, and evidence-based closure instead of uncontrolled wakeups.",
    "",
    "Execution policy: Paperclip may run independent lanes in parallel according to agent/runtime limits. One agent may execute one lane at a time. Project Managers may keep many lanes planned, but they must queue work behind busy specialists and never mix project contexts inside one run.",
    "",
    "Mandatory loop:",
    "1. Run `pnpm softwarehouse:control-tick` first and treat its `controlDecision`, `nextControlActions`, `effectiveOperatingPosture`, `operatingPosture`, `readinessOperatingPosture`, `readinessOperatingConstraints`, `allowedWhileBlocked`, and `forbiddenWhileBlocked` as the control-loop contract. It refreshes janitor/gate/unblock/source-control/readiness/governor/audit context before any mutation. Supervise live work and only wake additional lanes when ownership is idle and dependencies are independent.",
    "2. Keep Soar as the active takeover project until its current target is fully known, verified, explicitly deferred, or blocked by a named external decision.",
    "3. Use the Soar Project Manager as the bridge between the user, Paperclip, and the Soar project chat.",
    "4. Work top-down, then bottom-up: read project/goal/issue status, choose the next narrow lane that should move, assign one accountable owner, and require evidence.",
    "5. Do not wake LUC-103 directly while the source-control queue gate exists. Route source-control cleanup through LUC-175 or a child of that gate.",
    "6. Never regenerate manifest/controller artifacts just because a parent woke. Commit or classify existing artifacts first; create new files only when the task explicitly asks for new evidence.",
    "7. Default capacity follows per-agent one-agent-one-active-lane. Supervisors should prevent duplicate work, dependency conflicts, and specialist context mixing before increasing throughput.",
    "8. No push, deploy, live trading mutation, credential disclosure, or user-real-account mutation without explicit approval in the issue/thread.",
    "9. Done requires proof: files, commands, tests, commits when appropriate, docs/index updates, and clear unresolved risk.",
    "10. One agent, one active lane: do not start a second live run or unrelated in_progress issue for an agent that is already executing. Queue or delegate the second request with dependency notes.",
    "11. Project Managers are per project and own project context; shared specialists can serve multiple projects only sequentially, never by mixing project contexts in one run.",
    "12. Treat production/operator approval gates as live work, not idleness: if a lane is blocked on explicit approval, operator logs, restart/redeploy permission, or an accepted deeper-blocker decision, do not retry it automatically. Preserve the fail-closed blocker with owner, exact approval/deeper-blocker options, evidence needed, and next review time.",
    "13. Pending review interactions (request_confirmation, request_checkbox_confirmation, ask_user_questions, suggest_tasks) are hard stop signs. Do not reopen, resume, reassign, or work around the issue while it waits for board/user choice; report the pending interaction as the current autonomous outcome.",
    "14. Use the softwarehouse audit autonomyPosture as the control signal: can_start_parallel_lanes means wake safe independent runnable issues; active_work_running means keep supervising; needs_review_closure means close or return review issues; waiting_for_operator_gate means do not mutate that gated lane and keep non-production evidence lanes alive.",
    "15. If the active project is blocked by a production/operator gate, safe non-production work should continue through PM status, architecture/map drift, regression evidence, gap register, docs/memory, and security/account-safety lanes as long as they do not touch deploy, secrets, live data, or production accounts.",
    "16. For routine-generated control lanes, prefer the canonical open issue for that routine/title over creating a sibling. For Soar PM no-stall, use LUC-244 while it remains open.",
    "17. Dirty worktree questions are not operator gates by default. If dirty files are relevant to the same lane and no push/deploy/secret/destructive action is needed, the responsible agent should continue on top of them, preserve existing work, and record a baseline note instead of waiting for a yes/no answer.",
    "18. Escalate dirty worktree state only when unrelated changes must be overwritten, secrets/local env/log artifacts may be exposed, merge conflicts exist, generated churn cannot be attributed, or the next action is push, deploy, production mutation, credential handling, or broad delete/move.",
    "19. If all useful work is blocked, create or update the blocker with owner, unblock action, and next review time instead of spinning.",
    "20. Status-sync comments are not work. If the only new fact is that an active run remains non-terminal, record at most one durable acknowledgement, then stop writing status-sync comments until a new operational fact appears: completed work, changed run state, a real blocker, a new runnable lane, or a handoff decision.",
    "21. Do not wake or resume the same governor issue solely because of its own status-sync comments. Treat repeated status-sync comments as churn: cancel or let the current echo run finish, then choose an actual independent lane or report no safe work.",
    "22. If activeRunCount is greater than zero and no active run needs intervention, exit silently after read-only supervision. Do not post a comment to the governor issue just to say that work is still running.",
    "23. Do not re-run a production/protected smoke gate when the latest evidence already proves the same credential/session path fails and no newer credential rotation, secret update, deploy event, or operator approval has been recorded.",
    "24. If all remaining open work is covered by known external gates, set/keep the gated issues blocked with owner, exact unblock action, and next review condition, then stop. Do not create a new status-sync issue or wake a specialist until a real new fact exists.",
    "25. If the control loop reports a stale cancelled blocker relation, run `node scripts/repair-known-blocker-links.mjs` first, then `node scripts/repair-known-blocker-links.mjs --apply` only when activeRunCount is zero and the dry-run lists exactly one safe repair.",
    "26. If the control loop reports safe_nonproduction_lane_needed, run `node scripts/run-safe-nonproduction-lane-seeder.mjs` first, then apply only when it would create exactly one docs/status/architecture lane and activeRunCount is zero. This lane must not touch deploy, push, production, secrets, live accounts, or product code.",
    "27. If the control loop reports closed_issue_live_run_tail, wait briefly or cancel only that stale heartbeat run; do not create follow-up/productivity-review work for a closed issue.",
    "28. If the control loop reports governor_self_supervision_loop, cancel the governor self-run and close the governor issue. The governor must not leave itself in_progress merely to supervise itself, and must not create productivity-review issues for its own quiet/no-op supervision.",
    "29. If the control loop reports safe_nonproduction_cooldown, do not seed another safe docs/status lane. Treat the recent completed safe lane as the current evidence checkpoint until new evidence arrives or the cooldown expires.",
    "30. If the control loop reports safe_nonproduction_no_evidence_cooldown, do not seed the same safe docs/status lane again. The last safe lane produced no evidence, so wait for new evidence, a changed scope/owner, or the longer no-evidence cooldown before trying again.",
    "31. When delivery gates are the only blocker state, run `pnpm softwarehouse:unblock-packet` to refresh the operator/PM unblock packet. Use it as the handoff artifact for what is blocked, which owner can act, what evidence is required, and which actions remain forbidden. Do not treat the packet itself as approval.",
    "32. If the control loop reports project_source_control_closure_needed, route the dirty project through its existing PM/source-control lane. Inspect diffs, preserve agent work, decide commit/no-commit, and do not push without explicit approval.",
    "33. If the control loop reports project_source_control_gate_blocked, do not create duplicate source-control cleanup/commit work. Read-only source-control classification from the packet is allowed only as Paperclip issue comments; safe architecture planning from existing docs may create Paperclip backlog/issues only; project filesystem writes, project repo mutation, commit, push, deploy, restart, and protected smoke must wait for the recorded gate unblock condition.",
    "34. If the control loop reports operating_source_control_closure_needed, close Paperclip OS changes first with verification and a local commit before treating the softwarehouse operating system as stable.",
    "35. If `operatingPosture` is project_repo_mutation_blocked_monitoring_allowed, the company is not idle: keep supervision and packets fresh, execute read-only source-control classification when listed by commenting in Paperclip only, seed safe architecture planning/backlog lanes in Paperclip when listed, improve Paperclip OS outside the blocked project repo, and obey every listed forbidden action.",
    "36. Before starting any lane while a project is gated, compare the lane against `allowedWhileBlocked` and `forbiddenWhileBlocked`; if it is not clearly allowed, leave a blocked/no-op disposition instead of improvising.",
    "37. If `postureConsistent` is false, obey `effectiveOperatingPosture` and record a control-loop inconsistency before waking work. Pass `readinessOperatingConstraints` into PM handoffs so project managers know whether they may deliver, only supervise, or must wait for a gate fact.",
    "38. Treat `nextControlActions` as the short PM/operator handoff. Execute or report those actions first, then use the detailed posture fields only to resolve ambiguity.",
    "39. Treat `Stale gate owner action:` lines as safe organizational escalation only: the named owner must obtain a fresh accepted operator/credential fact or keep the blocker closed with a next review condition. This is not approval to run a protected recheck, mutate a repo, push, deploy, restart, or touch secrets.",
    "40. Treat `controlBrief.deliveryPermission` as the lane-start authority. If `canStartNewLane=false`, do not start a new lane even when no live runs exist; only execute the listed `allowedLaneTypes`.",
    "41. Treat `controlBrief.autonomyDisposition` as the human-readable company state. `intentional_gate_hold` means the company is not idle; it is deliberately waiting on accepted gate facts while safe packet refresh, stale-gate owner escalation, and Paperclip OS improvements remain allowed.",
    "42. When `operatorActionPacket.status` is `operator_input_or_gate_evidence_needed`, do not invent work to look busy. Surface that packet as the redacted operator-facing unblock summary and wait for one accepted fresh fact before resuming protected project mutation.",
    "43. Do not mark an issue `done` while its lane leaves unclassified local source-control changes. If a lane writes files, final closure must include one of: a local commit hash, an explicit no-commit blocker with affected paths plus a linked open non-terminal owner issue/sidecar, or a linked open source-control closure sidecar. A comment saying `not committed`, `PM sidecar evidence only`, or `ownership remains with another lane` is not sufficient closure by itself and must resolve as blocked/delegated, not done.",
    "",
    "Expected output on each run:",
    "- current company health and active run count;",
    "- nextControlActions followed or explicitly deferred;",
    "- chosen lane or a clear reason no lane was started;",
    "- owner, scope, evidence contract, queue/dependency decision, and no-push/no-deploy decision for the lane;",
    "- any architecture awareness/docs/status drift that must become the next narrow issue.",
  ].join("\n");

  const routinesByTitle = new Map(routines.map((routine) => [routine.title, routine]));
  const governor = await ensureRoutine(company.id, routinesByTitle, {
    title: autonomyRoutineTitle,
    description,
    projectId: operating.id,
    goalId: goal?.id ?? null,
    assigneeAgentId: governorOwner.id,
    priority: "critical",
    status: "active",
    concurrencyPolicy: "reuse_idle_issue",
    catchUpPolicy: "skip_missed",
  });

  await ensureScheduleTrigger(governor.id, {
    label: autonomyScheduleLabel,
    enabled: true,
    cronExpression: autonomyScheduleCron,
    timezone: "Europe/Berlin",
  });

  const refreshedRoutines = await request("GET", `/api/companies/${company.id}/routines`);
  const canonicalRoutineIdsByTitle = canonicalRoutineIdsByTitleFor(refreshedRoutines);
  const statusChanges = [];
  for (const routine of refreshedRoutines) {
    const isCanonical = canonicalRoutineIdsByTitle.get(routine.title) === routine.id;
    const shouldBeActive = activeRoutineTitles.has(routine.title) && isCanonical;
    if ((routine.status === "active") === shouldBeActive) continue;
    await request("PATCH", `/api/routines/${routine.id}`, { status: shouldBeActive ? "active" : "paused" });
    statusChanges.push({
      routine: routine.title,
      id: routine.id,
      status: shouldBeActive ? "active" : "paused",
      reason: isCanonical ? "active_matrix" : "duplicate_title",
    });
  }

  const triggerChanges = await applySchedulePosture(refreshedRoutines);

  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    activeRunCount,
    governor: { id: governor.id, title: governor.title },
    statusChanges,
    triggerChanges,
  }, null, 2));
}

await main();
