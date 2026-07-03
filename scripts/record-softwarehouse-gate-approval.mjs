import { softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyName = "LuckySparrow Software House";
const companyNameAliases = [companyName, "LuckySparrow"];
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? null;

const gate = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length) ?? "LUC-241";
const apply = process.argv.includes("--apply");
const spec = softwarehouseGateSpecsByRootBlocker.get(gate);

if (!spec) {
  throw new Error(`Unknown gate ${gate}. Supported gates: ${Array.from(softwarehouseGateSpecsByRootBlocker.keys()).join(", ")}`);
}

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

function recentApprovalComment(comments) {
  return comments.find((comment) =>
    String(comment.body ?? "").includes(`softwarehouse-gate-approval:${gate}:v1`)
  );
}

async function resolveCompany() {
  if (companyId) return { id: companyId, source: "PAPERCLIP_COMPANY_ID" };

  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) => companyNameAliases.includes(candidate.name))
    ?? companies.find((candidate) => /^LuckySparrow\b/i.test(candidate.name));
  if (!company) throw new Error(`Company not found: ${companyName}`);
  return {
    id: company.id,
    source: company.name === companyName ? "company_name" : `company_alias:${company.name}`,
  };
}

const company = await resolveCompany();

const issue = await request("GET", `/api/issues/${gate}`);
if (issue.companyId !== company.id) {
  throw new Error(`${gate} does not belong to ${companyName}`);
}

const comments = await request("GET", `/api/issues/${issue.id}/comments?order=desc&limit=20`)
  .then((result) => result.value ?? result ?? []);
const existing = recentApprovalComment(comments);

const body = [
  `softwarehouse-gate-approval:${gate}:v1`,
  "",
  `Operator approved one narrow ${spec.project} gate recheck for ${spec.approvalPurpose}.`,
  "This approval is a fresh control fact for the current blocker only.",
  "Resume gate recheck exactly once through the responsible owner.",
  "Required evidence: command or UI path, timestamp, pass/fail result, affected endpoint/resource, and next blocker if any.",
  spec.forbiddenAction,
  "This is not approval to commit, push, deploy, restart production, mutate runtime state, print secrets, or broaden scope.",
].join("\n");

let comment = null;
if (apply && !existing) {
  comment = await request("POST", `/api/issues/${issue.id}/comments`, { body });
}

console.log(JSON.stringify({
  apiBase,
  company: { id: company.id, name: company.name },
  mode: apply ? "apply" : "dry-run",
  gate,
  issue: {
    id: issue.id,
    identifier: issue.identifier,
    status: issue.status,
    updatedAt: issue.updatedAt,
    title: issue.title,
  },
  owner: spec.owner,
  existingApproval: existing ? {
    id: existing.id,
    createdAt: existing.createdAt ?? null,
    updatedAt: existing.updatedAt ?? null,
  } : null,
  applied: Boolean(comment),
  comment: comment ? {
    id: comment.id,
    createdAt: comment.createdAt ?? null,
    updatedAt: comment.updatedAt ?? null,
  } : null,
}, null, 2));
