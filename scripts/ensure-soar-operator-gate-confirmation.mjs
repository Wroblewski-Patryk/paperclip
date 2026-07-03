const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const issueIdentifier = "LUC-181";
const idempotencyKey = "soar:luc-181:workers-market-stream:operator-gate:v2";

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

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => candidate.name === companyName);
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return { id: company.id, source: "company_name" };
}

const company = await resolveCompany();

const issue = await request("GET", `/api/issues/${issueIdentifier}`);
if (issue.companyId !== company.id) {
  throw new Error(`${issueIdentifier} does not belong to ${companyName}`);
}

const interactions = await request("GET", `/api/issues/${issue.id}/interactions`);
const existing = (interactions.value ?? interactions).find((interaction) =>
  interaction.kind === "request_confirmation"
  && interaction.idempotencyKey === idempotencyKey
  && interaction.status === "pending"
);

if (existing) {
  console.log(JSON.stringify({
    apiBase,
    company: { id: company.id, name: company.name },
    issue: { id: issue.id, identifier: issue.identifier, status: issue.status },
    interaction: { id: existing.id, status: existing.status, reused: true },
  }, null, 2));
  process.exit(0);
}

const detailsMarkdown = [
  "This is the explicit operator gate for the current Soar V1 production blocker.",
  "",
  "Known read-only evidence:",
  "- `workers-market-stream` resource `d2oo1wwy8i55q27e5mdky0i4` is reported as `exited:unhealthy`.",
  "- Coolify application logs endpoint returned `400 {\"message\":\"Application is not running.\"}`.",
  "- Production expected-SHA smoke passed for the current deployed SHA.",
  "- Temp stack remains unavailable, so temp-stack acceptance is not proven.",
  "",
  "Accept means:",
  "- Permit only the narrow worker recovery/readiness lane for `workers-market-stream`.",
  "- The responsible ops/release agent may use configured Coolify access to inspect authenticated runtime/container logs and perform the minimum reversible restart/redeploy action needed for this worker.",
  "- Required output: pre-state, operation summary, readiness proof or exact deeper blocker, rollback/cutover note, and parent updates for LUC-99/LUC-98/LUC-47.",
  "",
  "Reject means:",
  "- Do not mutate production in this cycle.",
  "- Treat the existing `Application is not running` evidence as the accepted deeper-blocker decision for this release cycle.",
  "- The responsible agent should propagate that decision up the Soar V1 blocker chain.",
  "",
    "Always forbidden unless separately approved:",
  "- Printing secrets, tokens, cookies, passwords, env values, or account data.",
  "- Postgres/Redis data mutation.",
  "- Secret/env mutation.",
  "- Restarting/redeploying unrelated resources.",
].join("\n");

const interaction = await request("POST", `/api/issues/${issue.id}/interactions`, {
  kind: "request_confirmation",
  idempotencyKey,
  title: "Soar worker recovery operator gate",
  summary: "Choose whether Paperclip may run the narrow Coolify worker recovery lane for workers-market-stream, or must record a no-mutation deeper-blocker decision for this release cycle.",
  continuationPolicy: "wake_assignee",
  payload: {
    version: 1,
    prompt: "Approve the narrow Coolify worker recovery/readiness lane for Soar `workers-market-stream`?",
    acceptLabel: "Approve worker recovery",
    rejectLabel: "Keep blocked",
    rejectRequiresReason: true,
    rejectReasonLabel: "Why should production remain untouched for this cycle?",
    detailsMarkdown,
    supersedeOnUserComment: true,
    target: {
      type: "custom",
      key: "soar-luc-181-workers-market-stream-operator-gate",
      revisionId: "v1",
      revisionNumber: 1,
      label: "Soar LUC-181 operator gate",
      href: "/LUC/issues/LUC-181",
    },
  },
});

await request("PATCH", `/api/issues/${issue.id}`, {
  status: "in_review",
});

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  issue: { id: issue.id, identifier: issue.identifier, status: issue.status },
  interaction: { id: interaction.id, status: interaction.status, reused: false },
}, null, 2));
