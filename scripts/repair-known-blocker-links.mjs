import { planStaleCancelledBlockerRepair } from "./lib/stale-blocker-repair.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";
const companyNameAliases = [companyName, "LuckySparrow Software House"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const apply = process.argv.includes("--apply");

const repairs = [
  {
    issueIdentifier: "LUC-12",
    staleBlockerIdentifier: "LUC-45",
    replacementBlockerIdentifier: "LUC-241",
    reason: "Soar takeover parent still points at the cancelled V1 controller instead of the current protected-smoke credential gate.",
  },
];

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

async function issueDetail(issue) {
  return request("GET", `/api/issues/${issue.identifier ?? issue.id}`);
}

function relationIdsWithout(issue, staleId) {
  return (issue.blockedBy ?? [])
    .map((blocker) => blocker.id)
    .filter((id) => id && id !== staleId);
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const [health, activeIssues, terminalTriageIssues, liveRuns] = await Promise.all([
  request("GET", "/api/health"),
  request("GET", `/api/companies/${company.id}/issues?status=backlog,todo,in_progress,in_review,blocked&limit=2000`),
  request("GET", `/api/companies/${company.id}/issues?status=done&q=${encodeURIComponent("[Softwarehouse][Blocked Triage]")}&limit=500`),
  request("GET", `/api/companies/${company.id}/live-runs`),
]);

const liveActiveRunCount = liveRuns.filter((run) => ["queued", "running"].includes(run.status)).length;
const healthReportedActiveRunCount = health.devServer?.activeRunCount ?? null;
const activeRunCount = liveActiveRunCount;
if (apply && activeRunCount > 0) {
  throw new Error(`Refusing to repair blocker links while ${activeRunCount} run(s) are active.`);
}

const actions = [];
for (const repair of repairs) {
  const [issue, staleBlocker, replacement] = await Promise.all([
    request("GET", `/api/issues/${repair.issueIdentifier}`),
    request("GET", `/api/issues/${repair.staleBlockerIdentifier}`),
    request("GET", `/api/issues/${repair.replacementBlockerIdentifier}`),
  ]);

  const detailedIssue = await issueDetail(issue);
  const hasStaleRelation = (detailedIssue.blockedBy ?? []).some((blocker) => blocker.id === staleBlocker.id);
  const alreadyHasReplacement = (detailedIssue.blockedBy ?? []).some((blocker) => blocker.id === replacement.id);
  const staleIsTerminal = ["done", "cancelled"].includes(staleBlocker.status);
  if (!hasStaleRelation || !staleIsTerminal || alreadyHasReplacement) {
    actions.push({
      ...repair,
      issueStatus: issue.status,
      staleBlockerStatus: staleBlocker.status,
      replacementStatus: replacement.status,
      action: "noop",
      reason: hasStaleRelation
        ? "No stale terminal relation needing replacement."
        : "Issue does not point at the stale blocker.",
    });
    continue;
  }

  const blockedByIssueIds = [...new Set([...relationIdsWithout(detailedIssue, staleBlocker.id), replacement.id])];
  const action = {
    ...repair,
    issueId: issue.id,
    issueStatus: issue.status,
    staleBlockerStatus: staleBlocker.status,
    replacementStatus: replacement.status,
    blockedByIssueIds,
    action: apply ? "repaired" : "would_repair",
  };
  actions.push(action);

  if (apply) {
    await request("PATCH", `/api/issues/${issue.id}`, {
      blockedByIssueIds,
      status: issue.status,
      comment: [
        "Known blocker link repair:",
        `- removed stale terminal blocker ${repair.staleBlockerIdentifier} (${staleBlocker.status});`,
        `- linked current blocker ${repair.replacementBlockerIdentifier} (${replacement.status});`,
        `- reason: ${repair.reason}`,
        "No production, deploy, secret, or worktree mutation was performed.",
      ].join("\n"),
    });
  }
}

const knownRepairIdentifiers = new Set(repairs.map((repair) => repair.issueIdentifier));
const discoveredRepairs = [];
for (const target of activeIssues
  .filter((issue) => issue.status === "blocked")
  .filter((issue) => !knownRepairIdentifiers.has(issue.identifier))) {
  const detailedTarget = await issueDetail(target);
  const repair = planStaleCancelledBlockerRepair({
    target,
    detailedTarget,
    triageIssues: terminalTriageIssues,
  });
  if (repair) discoveredRepairs.push(repair);
}

discoveredRepairs.sort((left, right) => left.issueIdentifier.localeCompare(right.issueIdentifier));
const selectedDiscoveredRepair = discoveredRepairs[0] ?? null;
if (selectedDiscoveredRepair) {
  actions.push({
    ...selectedDiscoveredRepair,
    action: apply ? "repaired_stale_cancelled_blocker" : "would_repair_stale_cancelled_blocker",
  });

  if (apply) {
    await request("PATCH", `/api/issues/${selectedDiscoveredRepair.issueId}`, {
      blockedByIssueIds: selectedDiscoveredRepair.blockedByIssueIds,
      status: selectedDiscoveredRepair.nextStatus,
      comment: [
        "Stale cancelled blocker cleanup after completed blocked-triage disposition:",
        `- triage evidence: ${selectedDiscoveredRepair.triageIdentifier};`,
        `- removed cancelled blocker relation(s): ${selectedDiscoveredRepair.staleBlockerIdentifiers.join(", ")};`,
        `- next status: ${selectedDiscoveredRepair.nextStatus};`,
        "- all non-cancelled blocker relations were preserved.",
        "No repository, production, deploy, secret, or worktree mutation was performed.",
      ].join("\n"),
    });
  }
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  activeRunCount,
  liveActiveRunCount,
  healthReportedActiveRunCount,
  mode: apply ? "apply" : "dry-run",
  actionCount: actions.filter((action) => [
    "would_repair",
    "repaired",
    "would_repair_stale_cancelled_blocker",
    "repaired_stale_cancelled_blocker",
  ].includes(action.action)).length,
  discoveredRepairCount: discoveredRepairs.length,
  deferredDiscoveredRepairCount: Math.max(0, discoveredRepairs.length - (selectedDiscoveredRepair ? 1 : 0)),
  actions,
}, null, 2));
