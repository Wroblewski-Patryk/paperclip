const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow";

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  }
  return data;
}

const companies = await request("GET", "/api/companies");
const company = companies.find((candidate) => candidate.name === companyName);
if (!company) {
  throw new Error(`Company not found: ${companyName}`);
}

const agents = await request("GET", `/api/companies/${company.id}/agents`);
const issues = await request("GET", `/api/companies/${company.id}/issues`);

let resetAgents = 0;
let resetIssues = 0;
let resolvedRecoveryActions = 0;

for (const agent of agents) {
  if (!agent.metadata?.rosterKey) continue;
  if (agent.status === "idle") continue;
  await request("PATCH", `/api/agents/${agent.id}?companyId=${company.id}`, {
    status: "idle",
  });
  resetAgents += 1;
}

for (const issue of issues) {
  if (!issue.title?.endsWith("Full takeover audit and operating baseline")) continue;
  if (issue.activeRecoveryAction?.id) {
    await request("POST", `/api/issues/${issue.id}/recovery-actions/resolve`, {
      actionId: issue.activeRecoveryAction.id,
      outcome: "restored",
      sourceIssueStatus: "todo",
      resolutionNote: "Reset seedu Software House: recovery action pochodzi z pierwszego uruchomienia przed gotowością adaptera. Zadanie wraca do bezpiecznego backlogu.",
    });
    resolvedRecoveryActions += 1;
  }
  const payload = {
    status: "backlog",
    assigneeAgentId: null,
    interrupt: true,
    reopen: issue.status === "done" || issue.status === "cancelled",
    comment: "Reset do bezpiecznego backlogu po inicjalnym smoke-runie adaptera. Uruchomić dopiero po potwierdzeniu lokalnego model lane i workspace runtime.",
  };
  await request("PATCH", `/api/issues/${issue.id}`, payload);
  resetIssues += 1;
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  resetAgents,
  resetIssues,
  resolvedRecoveryActions,
}, null, 2));
