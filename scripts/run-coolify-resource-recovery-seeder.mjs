import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const configuredCompanyId = process.env.PAPERCLIP_COMPANY_ID ?? null;
const currentRunId = process.env.PAPERCLIP_RUN_ID ?? null;
const apply = process.argv.includes("--apply");
const ledgerPath = process.env.SOFTWAREHOUSE_SOAR_ACCEPTANCE_LEDGER
  ?? "report/soar-delivery-acceptance.latest.json";

async function request(method, route, body) {
  const headers = { "content-type": "application/json" };
  if (process.env.PAPERCLIP_API_KEY) headers.authorization = `Bearer ${process.env.PAPERCLIP_API_KEY}`;
  if (currentRunId && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-paperclip-run-id"] = currentRunId;
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

export function parseUnhealthyCoolifyResources(reason) {
  const match = String(reason ?? "").match(/unhealthy resources:\s*(.+?)(?:\.|$)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const [name, ...statusParts] = entry.split(":");
      const normalizedName = String(name ?? "").trim();
      const status = statusParts.join(":").trim();
      if (!/^[a-z0-9._-]+$/i.test(normalizedName) || !status) return null;
      return { name: normalizedName, status };
    })
    .filter(Boolean);
}

export function blockingLiveRunCount({ activeRunCount, liveRuns, currentRunId: ownRunId }) {
  const ownRunCount = ownRunId
    ? liveRuns.filter((run) => run.id === ownRunId).length
    : 0;
  const healthBlockingCount = Math.max(0, Number(activeRunCount ?? 0) - ownRunCount);
  const listedBlockingCount = liveRuns.filter((run) => !ownRunId || run.id !== ownRunId).length;
  return Math.max(healthBlockingCount, listedBlockingCount);
}

async function resolveCompany() {
  if (configuredCompanyId) return { id: configuredCompanyId };
  const companies = await request("GET", "/api/companies");
  const company = companies.find((candidate) =>
    ["LuckySparrow", "LuckySparrow Software House"].includes(candidate.name),
  );
  if (!company) throw new Error("LuckySparrow company not found");
  return company;
}

export async function main() {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const reconciliation = (ledger.checks ?? []).find((check) => check.id === "coolify_resources_reconciled");
  const resources = reconciliation?.status === "blocker"
    ? parseUnhealthyCoolifyResources(reconciliation.reason)
    : [];
  const resource = resources[0] ?? null;
  const company = await resolveCompany();

  const [health, projects, agents, goals, issues, liveRuns] = await Promise.all([
    request("GET", "/api/health"),
    request("GET", `/api/companies/${company.id}/projects`),
    request("GET", `/api/companies/${company.id}/agents`),
    request("GET", `/api/companies/${company.id}/goals`),
    request("GET", `/api/companies/${company.id}/issues?limit=2000`),
    request("GET", `/api/companies/${company.id}/live-runs`),
  ]);
  const observedActiveRunCount = Math.max(Number(health.devServer?.activeRunCount ?? 0), liveRuns.length);
  const blockingActiveRunCount = blockingLiveRunCount({
    activeRunCount: health.devServer?.activeRunCount,
    liveRuns,
    currentRunId,
  });
  if (apply && blockingActiveRunCount > 0) {
    throw new Error(`Refusing to seed Coolify recovery while ${blockingActiveRunCount} non-seeder live run(s) exist.`);
  }

  const actions = [];
  if (!resource) {
    actions.push({ action: "noop_no_unhealthy_resource" });
  } else {
    const marker = `softwarehouse-coolify-resource-recovery:${resource.name}:v1`;
    const existing = issues.find((issue) =>
      !["done", "cancelled"].includes(issue.status)
      && String(issue.description ?? "").includes(marker),
    );
    if (existing) {
      actions.push({
        action: "noop_existing_recovery_issue",
        identifier: existing.identifier,
        status: existing.status,
        resource: resource.name,
      });
    } else {
      const parent = issues.find((issue) => issue.identifier === "LUC-25");
      const project = projects.find((candidate) =>
        !candidate.archivedAt && /(?:^|:\s*)Soar$/i.test(candidate.name),
      );
      const projectWorkspace = project?.workspaces?.find((workspace) => workspace.isPrimary)
        ?? project?.workspaces?.[0]
        ?? null;
      const assignee = agents.find((candidate) =>
        candidate.name === "09 DRE (Deployment & Reliability Engineer)",
      ) ?? agents.find((candidate) => /Deployment.*Reliability|DevOps Release/i.test(candidate.name));
      const goal = goals.find((candidate) => candidate.title === "Soar V1 audit-to-completion loop") ?? null;
      if (!parent || !project || !projectWorkspace || !assignee) {
        throw new Error("Cannot resolve LUC-25, active Soar project/workspace, or DRE owner for Coolify recovery.");
      }

      const title = `[Soar][Coolify] Diagnose and recover ${resource.name} ${resource.status}`;
      const description = [
        marker,
        "",
        `The current Soar acceptance ledger reports \`${resource.name}\` as \`${resource.status}\` while the other production resources are available.`,
        "",
        "Convergence contract:",
        "- begin with read-only Coolify status, deployment log, command/health-check, and presence-only environment inspection;",
        "- verify whether the resource is intended to be long-running and whether the deployed split-worker topology sets `WORKER_BACKTEST_OWNERSHIP=worker`;",
        "- never print secret values; report only configured/missing and redacted identifiers;",
        "- if a config repair, restart, or redeploy is necessary, record DRE/SPA/QVE evidence first and perform only the smallest governed recovery with before/after readback;",
        "- do not broaden into unrelated Soar resources, trading activity, or speculative infrastructure changes;",
        "- refresh the Coolify reconciler and Soar acceptance ledger after recovery.",
        "",
        "Definition of done:",
        `- \`${resource.name}\` is running and no longer unhealthy, or a precise external permission blocker is recorded;`,
        "- `pnpm softwarehouse:coolify-reconciler` records 8/8 resources without exposing secrets;",
        "- `pnpm softwarehouse:soar-acceptance-ledger` no longer blocks on `coolify_resources_reconciled`;",
        "- public Soar reachability remains healthy and LUC-25 receives the evidence link.",
      ].join("\n");
      const input = {
        title,
        description,
        status: "todo",
        priority: "critical",
        assigneeAgentId: assignee.id,
        projectId: project.id,
        projectWorkspaceId: projectWorkspace.id,
        goalId: goal?.id ?? null,
        parentId: parent.id,
        requestDepth: 1,
        acceptanceCriteria: [
          `${resource.name} is running and no longer unhealthy, or an exact permission blocker is recorded.`,
          "No secret value is printed or attached.",
          "Any mutation is minimal, governed, and followed by Coolify and public-health readback.",
          "The refreshed Soar acceptance ledger no longer reports this stale resource blocker before closure.",
        ],
      };
      actions.push({
        action: apply ? "created_recovery_issue" : "would_create_recovery_issue",
        resource: resource.name,
        status: resource.status,
        assignee: assignee.name,
        parent: parent.identifier,
      });
      if (apply) {
        const created = await request("POST", `/api/companies/${company.id}/issues`, input);
        actions.at(-1).identifier = created.identifier;
        actions.at(-1).issueStatus = created.status;
      }
    }
  }

  const output = {
    apiBase,
    mode: apply ? "apply" : "dry-run",
    companyId: company.id,
    ledgerGeneratedAt: ledger.generatedAt ?? null,
    activeRunCount: observedActiveRunCount,
    blockingActiveRunCount,
    currentRunId,
    resources,
    actions,
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
