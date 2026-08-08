import { mkdir, readFile, writeFile } from "node:fs/promises";

import { agentWipBlockerFor, fetchAgentWipState } from "./lib/agent-wip-guard.mjs";
import { isRunnableAgent } from "./lib/softwarehouse-agent-resolver.mjs";

const apply = process.argv.includes("--apply");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyNames = ["LuckySparrow", "LuckySparrow Software House"];
const outputJson = "report/softwarehouse-access-unblock-tasks.latest.json";
const outputMd = "report/softwarehouse-access-unblock-tasks.latest.md";
const authToken = process.env.PAPERCLIP_API_KEY ?? null;
const actorAgentId = process.env.PAPERCLIP_AGENT_ID ?? null;

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) {
    headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  }
  if (process.env.PAPERCLIP_RUN_ID && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-paperclip-run-id"] = process.env.PAPERCLIP_RUN_ID;
  }
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
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

function byNameOrRosterKey(items, name, rosterKeys = []) {
  const runnableItems = items.filter(isRunnableAgent);
  const candidates = runnableItems.length > 0 ? runnableItems : items;
  return candidates.find((item) =>
    item.name === name
    || rosterKeys.includes(item.metadata?.rosterKey)
    || rosterKeys.some((key) => String(item.name ?? "").toLowerCase().includes(key.replaceAll("-", " ")))
  );
}

function ownerAgentForPlan(agents, ownerName) {
  if (ownerName === "Ops Release Lead") {
    return byNameOrRosterKey(agents, ownerName, ["deployment-reliability-engineer"]);
  }
  if (ownerName === "Security Review Lead") {
    return byNameOrRosterKey(agents, ownerName, ["security-privacy-auditor", "security-review-lead"]);
  }
  if (ownerName === "QA Regression Lead") {
    return byNameOrRosterKey(agents, ownerName, ["qa-verification-engineer", "test-automation-engineer", "qa-lead"]);
  }
  return byName(agents, ownerName);
}

function projectByNameOrUrlKey(items, names, urlKeys = []) {
  return items.find((item) => names.includes(item.name) || urlKeys.includes(item.urlKey));
}

async function primaryWorkspaceForProject(projectId) {
  if (!projectId) return null;
  const workspaces = await request("GET", `/api/projects/${projectId}/workspaces`);
  return workspaces.find((item) => item.isPrimary) ?? workspaces[0] ?? null;
}

function missingCheck(checks, id) {
  const check = checks.find((item) => item.id === id);
  return check && ["missing", "blocker", "partial"].includes(check.status);
}

function taskBody({ missing, why, setup, after }) {
  return [
    `Missing: ${missing}`,
    "",
    `Why this is needed: ${why}`,
    "",
    "Safe setup request:",
    setup,
    "",
    "After this is provided, Paperclip will:",
    after,
    "",
    "Safety boundary:",
    "- Do not paste secret values into chat, issues, docs, screenshots, or commits.",
    "- Use Paperclip secrets or the approved local encrypted secret store.",
    "- Paperclip will use this only for the named verification/deploy lane and will record redacted evidence.",
  ].join("\n");
}

function isIssueLocked(issue) {
  return Boolean(issue?.checkoutRunId || issue?.executionRunId || issue?.executionLockedAt);
}

function isExpectedImmutableIssueError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /failed with 409: .*Issue is checked out by another agent/.test(message)
    || /failed with 403: .*Agent cannot mutate another agent's issue/.test(message)
    || /failed with 403: .*Issue is outside this actor's authorization boundary/.test(message);
}

function semanticIssueKey(title) {
  const normalized = String(title ?? "").toLowerCase();
  if (normalized.includes("coolify") && normalized.includes("bind coolify read-only production status access")) {
    return "operator:coolify:bind-read-only-production-status-access";
  }
  if (normalized.includes("coolify") && normalized.includes("confirm expected coolify team")) {
    return "operator:coolify:confirm-expected-team-workspace";
  }
  if (normalized.includes("coolify") && normalized.includes("reconcile coolify resource inventory")) {
    return "ops:soar:reconcile-coolify-resource-inventory";
  }
  return `title:${normalized.replace(/\s+/g, " ").trim()}`;
}

function directWakeBoundaryForAgent(agentId) {
  if (!authToken) return null;
  if (!actorAgentId) return null;
  if (actorAgentId === agentId) return null;
  return "cross_agent_direct_invoke_forbidden";
}

function sameJson(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function ensureIssue(companyId, issuesByTitle, issuesBySemanticKey, input) {
  const existing = issuesByTitle.get(input.title) ?? issuesBySemanticKey.get(semanticIssueKey(input.title));
  if (existing) {
    if (isIssueLocked(existing)) {
      return { action: "kept_existing_locked_issue", issue: existing };
    }
    const patch = {
      title: input.title,
      description: input.description,
      assigneeAgentId: input.assigneeAgentId,
      assigneeUserId: input.assigneeAgentId ? null : undefined,
      priority: input.priority,
      status: existing.status,
    };
    if (input.projectId !== existing.projectId) {
      patch.projectId = input.projectId;
      patch.projectWorkspaceId = input.projectWorkspaceId;
      patch.executionWorkspacePreference = input.executionWorkspacePreference;
      patch.executionWorkspaceSettings = input.executionWorkspaceSettings;
    } else if (!existing.projectWorkspaceId && input.projectWorkspaceId) {
      patch.projectWorkspaceId = input.projectWorkspaceId;
      patch.executionWorkspacePreference = input.executionWorkspacePreference;
      patch.executionWorkspaceSettings = input.executionWorkspaceSettings;
    }
    if (input.goalId !== existing.goalId) {
      patch.goalId = input.goalId;
    }
    const patchNeeded =
      patch.title !== existing.title
      || patch.description !== (existing.description ?? null)
      || (patch.assigneeAgentId ?? null) !== (existing.assigneeAgentId ?? null)
      || (patch.assigneeUserId !== undefined && (patch.assigneeUserId ?? null) !== (existing.assigneeUserId ?? null))
      || patch.priority !== existing.priority
      || patch.status !== existing.status
      || (patch.projectId ?? existing.projectId ?? null) !== (existing.projectId ?? null)
      || (patch.projectWorkspaceId ?? existing.projectWorkspaceId ?? null) !== (existing.projectWorkspaceId ?? null)
      || (patch.goalId ?? existing.goalId ?? null) !== (existing.goalId ?? null)
      || (patch.executionWorkspacePreference ?? existing.executionWorkspacePreference ?? null)
        !== (existing.executionWorkspacePreference ?? null)
      || !sameJson(
        patch.executionWorkspaceSettings ?? existing.executionWorkspaceSettings ?? null,
        existing.executionWorkspaceSettings ?? null,
      );
    if (!patchNeeded) {
      return { action: "kept_existing_issue", issue: existing };
    }
    let updated;
    try {
      updated = await request("PATCH", `/api/issues/${existing.id}`, patch);
    } catch (error) {
      if (!isExpectedImmutableIssueError(error)) throw error;
      return { action: "skipped_immutable_existing_issue", issue: existing };
    }
    issuesByTitle.set(input.title, updated);
    issuesBySemanticKey.set(semanticIssueKey(input.title), updated);
    return { action: "updated_issue", issue: updated };
  }
  const created = await request("POST", `/api/companies/${companyId}/issues`, input);
  issuesByTitle.set(input.title, created);
  issuesBySemanticKey.set(semanticIssueKey(input.title), created);
  return { action: "created_issue", issue: created };
}

function preferredIssueForDuplicateGroup(group) {
  const rank = { in_progress: 0, todo: 1, blocked: 2, in_review: 3, done: 4, cancelled: 5 };
  return [...group].sort((a, b) =>
    (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
    || new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
  )[0];
}

function freshTerminalIssueForDuplicateGroup(group, now = new Date()) {
  const freshnessMs = 24 * 60 * 60 * 1000;
  const terminalRank = { done: 0, cancelled: 1 };
  return [...group]
    .filter((issue) => ["done", "cancelled"].includes(issue.status))
    .filter((issue) => {
      const terminalAt = issue.completedAt ?? issue.cancelledAt ?? issue.updatedAt;
      return terminalAt && now.getTime() - new Date(terminalAt).getTime() <= freshnessMs;
    })
    .sort((a, b) =>
      (terminalRank[a.status] ?? 9) - (terminalRank[b.status] ?? 9)
      ||
      new Date(b.completedAt ?? b.cancelledAt ?? b.updatedAt ?? 0).getTime()
      - new Date(a.completedAt ?? a.cancelledAt ?? a.updatedAt ?? 0).getTime()
    )[0];
}

async function refreshIssueGroupByExactTitle(companyId, issueGroupsByTitle, issuesByTitle, title) {
  const result = await request("GET", `/api/companies/${companyId}/issues?q=${encodeURIComponent(title)}&limit=100`);
  const matches = (result.value ?? result ?? []).filter((issue) => issue.title === title);
  if (matches.length === 0) return;

  const existing = issueGroupsByTitle.get(title) ?? [];
  const byId = new Map([...existing, ...matches].map((issue) => [issue.id, issue]));
  const group = [...byId.values()];
  issueGroupsByTitle.set(title, group);
  const preferred = preferredIssueForDuplicateGroup(group.filter((issue) => !["done", "cancelled"].includes(issue.status)));
  if (preferred) issuesByTitle.set(title, preferred);
}

function goalForPlan(goals, plan) {
  const title = plan.title.toLowerCase();
  if (title.includes("coolify") || title.includes("deploy")) {
    return goals.find((item) => item.title === "Soar production deploy confidence")
      ?? goals.find((item) => item.title === "Soar: sellable or personally excellent product")
      ?? null;
  }
  if (title.includes("test-account") || title.includes("smoke")) {
    return goals.find((item) => item.title === "Soar no-regression system")
      ?? goals.find((item) => item.title === "Soar: sellable or personally excellent product")
      ?? null;
  }
  if (title.includes("owner-login") || title.includes("[soar]")) {
    return goals.find((item) => item.title === "Soar known-state baseline")
      ?? goals.find((item) => item.title === "Soar: sellable or personally excellent product")
      ?? null;
  }
  return goals.find((item) => item.title === "Softwarehouse operating cadence")
    ?? goals.find((item) => item.title === "Soar: sellable or personally excellent product")
    ?? null;
}

const soarLedger = await readJson("report/soar-delivery-acceptance.latest.json", {});
const coolify = await readJson("report/coolify-production-reconciler.latest.json", {});
const soarChecks = soarLedger.checks ?? [];
const coolifyChecks = coolify.checks ?? [];

const planned = [];
const addPlan = (plan) => planned.push(plan);

if (missingCheck(soarChecks, "owner_login_verified")) {
  addPlan({
    title: "[Operator][Soar] Provide owner-login verification path",
    owner: "Security Review Lead",
    priority: "critical",
    missing: "Owner-account login proof for Soar.",
    why: "Soar cannot be accepted as delivered until Paperclip can prove Patryk can log in and see the required workflows without exposing private exchange/API data.",
    setup: "Provide an approved owner-login verification method: either run a supervised browser proof with Patryk present, create a temporary least-privilege proof session, or document where Paperclip can find a redacted login evidence artifact.",
    after: "run the Soar acceptance ledger, record redacted browser/API evidence, and continue delivery only if no live-risk boundary is crossed.",
  });
}

if (missingCheck(soarChecks, "test_account_verified")) {
  addPlan({
    title: "[Operator][Soar] Provide protected test-account smoke path",
    owner: "QA Regression Lead",
    priority: "critical",
    missing: "A non-dangerous Soar test account or smoke path.",
    why: "Paperclip needs a repeatable way to verify login and core flows without touching Patryk's exchange-linked live account.",
    setup: "Create or approve a test account/smoke fixture, or explicitly state which flows must only be verified by owner-supervised session.",
    after: "run the QA smoke plan, store redacted evidence, and keep live trading/API-key actions blocked unless separately approved.",
  });
}

if (missingCheck(coolifyChecks, "coolify_credentials_available") || missingCheck(coolifyChecks, "coolify_project_id_available")) {
  addPlan({
    title: "[Operator][Coolify] Bind Coolify read-only production status access",
    owner: "Ops Release Lead",
    priority: "critical",
    missing: "Coolify base URL/API token/project id for read-only deploy status reconciliation.",
    why: "After push, Paperclip must verify whether Coolify auto-redeployed each app/service resource and whether server health stayed safe.",
    setup: "Bind COOLIFY_BASE_URL, COOLIFY_API_TOKEN, COOLIFY_SOAR_PROJECT_ID, and preferably COOLIFY_SOAR_TEAM_ID/COOLIFY_TEAM_ID through Paperclip secrets or approved local env. Use least-privilege read/status/log access where possible.",
    after: "inventory Coolify team/project/environment/resources, record redacted deploy status, and request a separate permit only if manual redeploy/restart is required.",
  });
}

if (missingCheck(coolifyChecks, "coolify_team_context")) {
  addPlan({
    title: "[Operator][Coolify] Confirm expected Coolify team/workspace",
    owner: "Ops Release Lead",
    priority: "high",
    missing: "Expected Coolify team/workspace selector.",
    why: "Wrong team context can make Paperclip inspect or mutate the wrong project. Team must be known before trusting resource status.",
    setup: "Bind COOLIFY_SOAR_TEAM_ID or COOLIFY_TEAM_ID, or record the exact team/workspace name/id in a redacted Ops issue.",
    after: "rerun Coolify reconciler and compare discovered project/resources against the expected topology.",
  });
}

if (missingCheck(coolifyChecks, "coolify_resource_inventory")) {
  addPlan({
    title: "[Ops][Soar] Reconcile Coolify resource inventory",
    owner: "Ops Release Lead",
    priority: "critical",
    missing: "Complete Soar production resource inventory.",
    why: "Soar production has multiple deployable resources. Paperclip must verify each resource after push, not one legacy app id.",
    setup: "Use read-only Coolify access to list project/environment resources and store redacted resource names/types/statuses. Expected default is 6 app/service resources plus Postgres and Redis unless a newer ledger says otherwise.",
    after: "update the Coolify resource ledger, then verify post-push auto-redeploy resource-by-resource.",
  });
}

let applied = [];
if (apply && planned.length > 0) {
  let companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
  if (!companyId) {
    const companies = await request("GET", "/api/companies");
    const company = companies.find((candidate) => companyNames.includes(candidate.name))
      ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
    if (!company) throw new Error(`Company not found: ${companyName}`);
    companyId = company.id;
  }
  const [agents, projects, goals, issues] = await Promise.all([
    request("GET", `/api/companies/${companyId}/agents`),
    request("GET", `/api/companies/${companyId}/projects`),
    request("GET", `/api/companies/${companyId}/goals`),
    request("GET", `/api/companies/${companyId}/issues?limit=3000`),
  ]);
  const operating = projectByNameOrUrlKey(projects, ["Softwarehouse Operating System", "Softwarehouse"], ["softwarehouse"]);
  const soar = projectByNameOrUrlKey(projects, ["Soar"], ["soar"]);
  const issueGroupsByTitle = new Map();
  for (const issue of issues) {
    if (!issueGroupsByTitle.has(issue.title)) issueGroupsByTitle.set(issue.title, []);
    issueGroupsByTitle.get(issue.title).push(issue);
  }
  const primaryWorkspaceByProjectId = new Map();
  await Promise.all(
    [operating, soar]
      .filter((project) => project?.id)
      .map(async (project) => {
        primaryWorkspaceByProjectId.set(project.id, await primaryWorkspaceForProject(project.id));
      }),
  );
  const issuesByTitle = new Map(
    [...issueGroupsByTitle]
      .map(([title, group]) => [
        title,
        preferredIssueForDuplicateGroup(group.filter((issue) => !["done", "cancelled"].includes(issue.status))),
      ])
      .filter(([, issue]) => issue)
  );
  const issuesBySemanticKey = new Map();
  for (const issue of issuesByTitle.values()) {
    issuesBySemanticKey.set(semanticIssueKey(issue.title), issue);
  }
  for (const plan of planned) {
    const owner = ownerAgentForPlan(agents, plan.owner);
    await refreshIssueGroupByExactTitle(companyId, issueGroupsByTitle, issuesByTitle, plan.title);
    const titleGroup = issueGroupsByTitle.get(plan.title) ?? [];
    const freshTerminal = freshTerminalIssueForDuplicateGroup(titleGroup);
    if (freshTerminal) {
      const duplicates = titleGroup.filter((issue) => issue.id !== freshTerminal.id && !["done", "cancelled"].includes(issue.status));
      for (const duplicate of duplicates) {
        if (isIssueLocked(duplicate)) {
          applied.push({
            action: "kept_locked_duplicate_covered_by_recent_terminal_issue",
            identifier: duplicate.identifier,
            title: duplicate.title,
            assignee: plan.owner,
            keptIdentifier: freshTerminal.identifier,
          });
          continue;
        }
        let cancelled;
        try {
          cancelled = await request("PATCH", `/api/issues/${duplicate.id}`, {
            status: "cancelled",
            description: `${duplicate.description ?? ""}\n\nCancelled by access unblock task seeder: duplicate covered by recent terminal issue ${freshTerminal.identifier}.`,
          });
        } catch (error) {
          if (!isExpectedImmutableIssueError(error)) throw error;
          applied.push({
            action: "skipped_immutable_duplicate_covered_by_recent_terminal_issue",
            identifier: duplicate.identifier,
            title: duplicate.title,
            assignee: plan.owner,
            keptIdentifier: freshTerminal.identifier,
          });
          continue;
        }
        applied.push({
          action: "cancelled_duplicate_covered_by_recent_terminal_issue",
          identifier: cancelled.identifier,
          title: cancelled.title,
          assignee: plan.owner,
          keptIdentifier: freshTerminal.identifier,
        });
      }
      applied.push({
        action: "covered_by_recent_terminal_issue",
        identifier: freshTerminal.identifier,
        title: freshTerminal.title,
        assignee: plan.owner,
      });
      continue;
    }
    const exactAfterRefresh = issuesByTitle.get(plan.title);
    if (exactAfterRefresh) issuesBySemanticKey.set(semanticIssueKey(plan.title), exactAfterRefresh);
    const freshWip = await fetchAgentWipState({ request, companyId });
    const wakeBlocker = agentWipBlockerFor(owner?.id, freshWip);
    const project = (plan.title.includes("[Soar]") || plan.title.includes("[Coolify]")) ? soar ?? operating : operating ?? soar;
    const goal = goalForPlan(goals, plan);
    const workspace = project?.id ? primaryWorkspaceByProjectId.get(project.id) ?? null : null;
    const result = await ensureIssue(companyId, issuesByTitle, issuesBySemanticKey, {
      title: plan.title,
      description: taskBody(plan),
      projectId: project?.id ?? null,
      projectWorkspaceId: workspace?.id ?? null,
      goalId: goal?.id ?? null,
      assigneeAgentId: owner?.id ?? null,
      priority: plan.priority,
      status: wakeBlocker ? "backlog" : "todo",
      executionWorkspacePreference: workspace ? "shared_workspace" : null,
      executionWorkspaceSettings: workspace ? {
        mode: "shared_workspace",
        workspaceRuntime: {
          evidenceRequiredBeforeDone: true,
          accessUnblockLane: true,
        },
      } : null,
    });
    applied.push({
      action: result.action,
      identifier: result.issue.identifier,
      title: result.issue.title,
      assignee: plan.owner,
    });
    const wakeBoundary = result.issue.assigneeAgentId
      ? directWakeBoundaryForAgent(result.issue.assigneeAgentId)
      : "missing_assignee";
    const wakeSkipped = wakeBlocker ?? wakeBoundary;
    if (!wakeSkipped && ["created_issue", "updated_issue", "kept_existing_issue"].includes(result.action)) {
      await request("POST", `/api/agents/${result.issue.assigneeAgentId}/heartbeat/invoke?companyId=${companyId}`, {
        reason: "issue_assigned",
        payload: {
          issueId: result.issue.id,
          taskId: result.issue.id,
          taskKey: result.issue.identifier,
          source: "softwarehouse-access-unblock-task-seeder",
        },
        idempotencyKey: `softwarehouse-access-unblock-task-seeder:${result.issue.id}:${result.issue.updatedAt ?? Date.now()}`,
      });
      applied.at(-1).wakeStatus = "invoked";
    }
    if (wakeSkipped) {
      applied.at(-1).wakeSkipped = wakeSkipped;
      applied.at(-1).activeRunCount = freshWip.activeRunCount;
      applied.at(-1).liveRunCount = freshWip.liveRunCount;
      applied.at(-1).unknownActiveRunCount = freshWip.unknownActiveRunCount;
    }
    const duplicates = (issueGroupsByTitle.get(plan.title) ?? [])
      .filter((issue) => issue.id !== result.issue.id && !["done", "cancelled"].includes(issue.status));
    for (const duplicate of duplicates) {
      if (isIssueLocked(duplicate)) {
        applied.push({
          action: "skipped_locked_duplicate_issue",
          identifier: duplicate.identifier,
          title: duplicate.title,
          assignee: plan.owner,
          keptIdentifier: result.issue.identifier,
        });
        continue;
      }
      let cancelled;
      try {
        cancelled = await request("PATCH", `/api/issues/${duplicate.id}`, {
          status: "cancelled",
          description: `${duplicate.description ?? ""}\n\nCancelled by access unblock task seeder: duplicate of ${result.issue.identifier}.`,
        });
      } catch (error) {
        if (!isExpectedImmutableIssueError(error)) throw error;
        applied.push({
          action: "skipped_immutable_duplicate_issue",
          identifier: duplicate.identifier,
          title: duplicate.title,
          assignee: plan.owner,
          keptIdentifier: result.issue.identifier,
        });
        continue;
      }
      applied.push({
        action: "cancelled_duplicate_issue",
        identifier: cancelled.identifier,
        title: cancelled.title,
        assignee: plan.owner,
        keptIdentifier: result.issue.identifier,
      });
    }
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  apply,
  plannedCount: planned.length,
  planned: planned.map(({ title, owner, priority, missing, why }) => ({ title, owner, priority, missing, why })),
  applied,
};

await mkdir("report", { recursive: true });
await writeFile(outputJson, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(outputMd, [
  "# Softwarehouse Access Unblock Tasks",
  "",
  `Generated at: ${output.generatedAt}`,
  "",
  `Apply: ${output.apply}`,
  "",
  ...(planned.length > 0 ? planned.map((plan) => `- ${plan.title}: ${plan.missing}`) : ["- none"]),
  "",
].join("\n"));
console.log(JSON.stringify(output, null, 2));
