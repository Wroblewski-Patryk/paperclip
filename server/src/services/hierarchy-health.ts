import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, assignmentProposals, delegationReports, heartbeatRuns, issues } from "@paperclipai/db";

const READY_STATUSES = ["backlog", "todo"] as const;
const ACTIVE_STATUSES = ["todo", "in_progress", "in_review", "blocked"] as const;
const CONTEXT_WINDOW_HOURS = 24;
const MAX_RAW_INPUT_TOKENS_PER_RUN = 250_000;

function usageNumber(usage: Record<string, unknown> | null, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(usage?.[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

export function hierarchyHealthService(db: Db) {
  return {
    async evaluate(companyId: string, now = new Date()) {
      const contextWindowStart = new Date(now.getTime() - CONTEXT_WINDOW_HOURS * 60 * 60 * 1000);
      const [agentRows, issueRows, proposalRows, reportRows, runRows] = await Promise.all([
        db.select({ id: agents.id, name: agents.name, role: agents.role, status: agents.status, reportsTo: agents.reportsTo })
          .from(agents).where(eq(agents.companyId, companyId)),
        db.select({
          id: issues.id, identifier: issues.identifier, status: issues.status, projectId: issues.projectId,
          assigneeAgentId: issues.assigneeAgentId, createdByAgentId: issues.createdByAgentId, updatedAt: issues.updatedAt,
        }).from(issues).where(and(eq(issues.companyId, companyId), inArray(issues.status, [...ACTIVE_STATUSES, "backlog"]))),
        db.select().from(assignmentProposals).where(eq(assignmentProposals.companyId, companyId)),
        db.select().from(delegationReports).where(eq(delegationReports.companyId, companyId)),
        db.select({ id: heartbeatRuns.id, agentId: heartbeatRuns.agentId, usageJson: heartbeatRuns.usageJson, createdAt: heartbeatRuns.createdAt })
          .from(heartbeatRuns)
          .where(and(eq(heartbeatRuns.companyId, companyId), gte(heartbeatRuns.createdAt, contextWindowStart)))
          .orderBy(desc(heartbeatRuns.createdAt))
          .limit(500),
      ]);
      const byId = new Map(agentRows.map((agent) => [agent.id, agent]));
      const activeByAssignee = new Map<string, typeof issueRows>();
      for (const issue of issueRows) {
        if (!issue.assigneeAgentId) continue;
        const rows = activeByAssignee.get(issue.assigneeAgentId) ?? [];
        rows.push(issue);
        activeByAssignee.set(issue.assigneeAgentId, rows);
      }
      const hierarchyViolations = proposalRows.filter((proposal) => {
        if (proposal.status !== "applied") return false;
        if (proposal.routingMode === "product_delivery_fast_path") return !proposal.deliveryId;
        return !proposal.parentAgentId || byId.get(proposal.proposedAssigneeAgentId)?.reportsTo !== proposal.parentAgentId;
      });
      const stalledReadyWork = issueRows.filter((issue) =>
        READY_STATUSES.includes(issue.status as (typeof READY_STATUSES)[number])
        && !issue.assigneeAgentId
        && now.getTime() - issue.updatedAt.getTime() > 60 * 60 * 1000);
      const noWorkAgents = agentRows.filter((agent) =>
        !["terminated", "pending_approval", "paused"].includes(agent.status)
        && (activeByAssignee.get(agent.id)?.length ?? 0) === 0);
      const bottleneckAgents = agentRows.filter((agent) =>
        (activeByAssignee.get(agent.id)?.filter((issue) => issue.status === "blocked").length ?? 0) > 0
        || (activeByAssignee.get(agent.id)?.length ?? 0) > 1);
      const parentCapacityGaps = agentRows.filter((parent) => {
        const idleDirectChild = noWorkAgents.some((agent) => agent.reportsTo === parent.id);
        const ownedReadyWork = stalledReadyWork.some((issue) => issue.createdByAgentId === parent.id);
        return idleDirectChild && ownedReadyWork;
      });
      const latestReportByAgent = new Map<string, Date>();
      for (const report of reportRows) {
        const prior = latestReportByAgent.get(report.fromAgentId);
        if (!prior || prior < report.createdAt) latestReportByAgent.set(report.fromAgentId, report.createdAt);
      }
      const contextByRole = new Map<string, { role: string; runs: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; rawInputTokens: number; breaches: number }>();
      const contextBreaches: Array<{ runId: string; agentId: string; role: string; rawInputTokens: number; createdAt: string }> = [];
      for (const run of runRows) {
        const agent = byId.get(run.agentId);
        const role = agent?.role?.trim() || "unknown";
        const usage = run.usageJson as Record<string, unknown> | null;
        const inputTokens = usageNumber(usage, "inputTokens", "input_tokens");
        const cachedInputTokens = usageNumber(usage, "cachedInputTokens", "cached_input_tokens", "cache_read_input_tokens");
        const outputTokens = usageNumber(usage, "outputTokens", "output_tokens");
        const rawInputTokens = usageNumber(usage, "rawInputTokens", "raw_input_tokens") || inputTokens;
        const row = contextByRole.get(role) ?? { role, runs: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, rawInputTokens: 0, breaches: 0 };
        row.runs += 1;
        row.inputTokens += inputTokens;
        row.cachedInputTokens += cachedInputTokens;
        row.outputTokens += outputTokens;
        row.rawInputTokens += rawInputTokens;
        if (rawInputTokens >= MAX_RAW_INPUT_TOKENS_PER_RUN) {
          row.breaches += 1;
          contextBreaches.push({ runId: run.id, agentId: run.agentId, role, rawInputTokens, createdAt: run.createdAt.toISOString() });
        }
        contextByRole.set(role, row);
      }
      return {
        generatedAt: now.toISOString(),
        counts: {
          hierarchyViolations: hierarchyViolations.length,
          stalledReadyWork: stalledReadyWork.length,
          parentCapacityGaps: parentCapacityGaps.length,
          noWork: noWorkAgents.length,
          bottleneck: bottleneckAgents.length,
          contextBudgetBreaches: contextBreaches.length,
        },
        hierarchyViolations: hierarchyViolations.map((row) => ({ proposalId: row.id, issueId: row.issueId, routingMode: row.routingMode })),
        stalledReadyWork: stalledReadyWork.map((row) => ({ issueId: row.id, identifier: row.identifier, projectId: row.projectId, updatedAt: row.updatedAt.toISOString() })),
        parentCapacityGaps: parentCapacityGaps.map((row) => ({ agentId: row.id, name: row.name })),
        noWork: noWorkAgents.map((row) => ({ agentId: row.id, name: row.name, reportsTo: row.reportsTo, lastUpwardReportAt: latestReportByAgent.get(row.id)?.toISOString() ?? null })),
        bottleneck: bottleneckAgents.map((row) => ({ agentId: row.id, name: row.name, activeIssueCount: activeByAssignee.get(row.id)?.length ?? 0 })),
        contextTelemetry: {
          windowHours: CONTEXT_WINDOW_HOURS,
          maxRawInputTokensPerRun: MAX_RAW_INPUT_TOKENS_PER_RUN,
          sampledRunLimit: 500,
          byRole: [...contextByRole.values()].sort((a, b) => b.rawInputTokens - a.rawInputTokens),
          breaches: contextBreaches.slice(0, 50),
          breachesTruncated: contextBreaches.length > 50,
        },
      };
    },
  };
}
