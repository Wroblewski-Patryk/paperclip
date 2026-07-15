import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  approvals,
  companies,
  goals,
  issues,
  projects,
} from "@paperclipai/db";
import type {
  CompanySituation,
  CompanySituationProjectTarget,
  CompanySituationSeverity,
  CompanySituationSignal,
  CompanySituationSourceRef,
} from "@paperclipai/shared";
import { notFound } from "../errors.js";
import { budgetService } from "./budgets.js";

export const COMPANY_SITUATION_DUE_SOON_DAYS = 7;
const MAX_GOALS = 10;
const MAX_PROJECT_SIGNALS = 5;
const MAX_SAMPLE_SOURCES = 3;

const OPEN_WORK_CONDITION = and(
  isNull(issues.hiddenAt),
  ne(issues.originKind, "routine_execution"),
  sql`${issues.status} not in ('done', 'cancelled')`,
);

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function utcDateStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function calendarDaysRemaining(targetDate: string, now: Date): number {
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  return Math.round((target.getTime() - utcDateStart(now)) / 86_400_000);
}

function countByStatus(rows: Array<{ status: string; count: number }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) result[row.status] = Number(row.count);
  return result;
}

function severityRank(severity: CompanySituationSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function sortAttention(signals: CompanySituationSignal[]): CompanySituationSignal[] {
  return signals.sort((left, right) => {
    const severityDifference = severityRank(left.severity) - severityRank(right.severity);
    if (severityDifference !== 0) return severityDifference;
    return left.id.localeCompare(right.id);
  });
}

function sourceRef(
  entityType: CompanySituationSourceRef["entityType"],
  entityId: string,
  observedAt: Date | string,
): CompanySituationSourceRef {
  return { entityType, entityId, observedAt: asIso(observedAt) };
}

export function companySituationService(db: Db) {
  const budgets = budgetService(db);

  return {
    get: async (companyId: string, options: { now?: Date } = {}): Promise<CompanySituation> => {
      const now = options.now ?? new Date();
      const company = await db
        .select({ id: companies.id, updatedAt: companies.updatedAt })
        .from(companies)
        .where(eq(companies.id, companyId))
        .then((rows) => rows[0] ?? null);

      if (!company) throw notFound("Company not found");

      const [
        activeGoals,
        activeProjects,
        issueStatusRows,
        agentStatusRows,
        unassignedRunnableCount,
        pendingApprovalCount,
        errorAgentSamples,
        blockedIssueSamples,
        unassignedIssueSamples,
        pendingApprovalSamples,
        budgetOverview,
      ] = await Promise.all([
        db
          .select({
            id: goals.id,
            title: goals.title,
            level: goals.level,
            ownerAgentId: goals.ownerAgentId,
            updatedAt: goals.updatedAt,
          })
          .from(goals)
          .where(and(eq(goals.companyId, companyId), eq(goals.status, "active")))
          .orderBy(desc(goals.updatedAt))
          .limit(MAX_GOALS),
        db
          .select({
            id: projects.id,
            name: projects.name,
            status: projects.status,
            targetDate: projects.targetDate,
            leadAgentId: projects.leadAgentId,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(
            and(
              eq(projects.companyId, companyId),
              isNull(projects.archivedAt),
              sql`${projects.status} in ('planned', 'in_progress')`,
            ),
          )
          .orderBy(desc(projects.updatedAt)),
        db
          .select({ status: issues.status, count: sql<number>`count(*)::double precision` })
          .from(issues)
          .where(and(eq(issues.companyId, companyId), OPEN_WORK_CONDITION))
          .groupBy(issues.status),
        db
          .select({ status: agents.status, count: sql<number>`count(*)::double precision` })
          .from(agents)
          .where(and(eq(agents.companyId, companyId), ne(agents.status, "terminated")))
          .groupBy(agents.status),
        db
          .select({ count: sql<number>`count(*)::double precision` })
          .from(issues)
          .where(
            and(
              eq(issues.companyId, companyId),
              OPEN_WORK_CONDITION,
              sql`${issues.status} in ('backlog', 'todo')`,
              isNull(issues.assigneeAgentId),
              isNull(issues.assigneeUserId),
            ),
          )
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)::double precision` })
          .from(approvals)
          .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db
          .select({ id: agents.id, updatedAt: agents.updatedAt })
          .from(agents)
          .where(and(eq(agents.companyId, companyId), eq(agents.status, "error")))
          .orderBy(desc(agents.updatedAt))
          .limit(MAX_SAMPLE_SOURCES),
        db
          .select({ id: issues.id, updatedAt: issues.updatedAt })
          .from(issues)
          .where(and(eq(issues.companyId, companyId), OPEN_WORK_CONDITION, eq(issues.status, "blocked")))
          .orderBy(desc(issues.updatedAt))
          .limit(MAX_SAMPLE_SOURCES),
        db
          .select({ id: issues.id, updatedAt: issues.updatedAt })
          .from(issues)
          .where(
            and(
              eq(issues.companyId, companyId),
              OPEN_WORK_CONDITION,
              sql`${issues.status} in ('backlog', 'todo')`,
              isNull(issues.assigneeAgentId),
              isNull(issues.assigneeUserId),
            ),
          )
          .orderBy(desc(issues.updatedAt))
          .limit(MAX_SAMPLE_SOURCES),
        db
          .select({ id: approvals.id, updatedAt: approvals.updatedAt })
          .from(approvals)
          .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
          .orderBy(desc(approvals.updatedAt))
          .limit(MAX_SAMPLE_SOURCES),
        budgets.overview(companyId),
      ]);

      const issueCounts = countByStatus(issueStatusRows);
      const agentCounts = countByStatus(agentStatusRows);
      const open = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
      const inProgress = issueCounts.in_progress ?? 0;
      const inReview = issueCounts.in_review ?? 0;
      const blocked = issueCounts.blocked ?? 0;
      const runnable = (issueCounts.backlog ?? 0) + (issueCounts.todo ?? 0) + inProgress;
      const availableAgents = (agentCounts.active ?? 0) + (agentCounts.idle ?? 0);
      const runningAgents = agentCounts.running ?? 0;
      const pausedAgents = agentCounts.paused ?? 0;
      const errorAgents = agentCounts.error ?? 0;
      const totalAgents = Object.values(agentCounts).reduce((sum, count) => sum + count, 0);

      const projectTargets = activeProjects
        .filter((project): project is typeof project & { targetDate: string } => Boolean(project.targetDate))
        .map<CompanySituationProjectTarget>((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          targetDate: project.targetDate,
          daysRemaining: calendarDaysRemaining(project.targetDate, now),
          leadAgentId: project.leadAgentId,
          updatedAt: asIso(project.updatedAt),
        }));
      const overdueProjects = projectTargets
        .filter((project) => project.daysRemaining < 0)
        .sort((left, right) => left.daysRemaining - right.daysRemaining)
        .slice(0, MAX_PROJECT_SIGNALS);
      const dueSoonProjects = projectTargets
        .filter(
          (project) =>
            project.daysRemaining >= 0 &&
            project.daysRemaining <= COMPANY_SITUATION_DUE_SOON_DAYS,
        )
        .sort((left, right) => left.daysRemaining - right.daysRemaining)
        .slice(0, MAX_PROJECT_SIGNALS);

      const attention: CompanySituationSignal[] = [];
      if (errorAgents > 0) {
        attention.push({
          id: "agent-errors",
          kind: "agent_error",
          severity: "critical",
          title: `${errorAgents} agent${errorAgents === 1 ? " is" : "s are"} in error state`,
          summary: "Execution capacity or continuity may be reduced until the errors are reviewed.",
          suggestedAction: "Inspect the affected agent runs and establish a recovery or owner path.",
          sources: errorAgentSamples.map((row) => sourceRef("agent", row.id, row.updatedAt)),
        });
      }
      if (budgetOverview.activeIncidents.length > 0) {
        attention.push({
          id: "budget-incidents",
          kind: "budget_incident",
          severity: "critical",
          title: `${budgetOverview.activeIncidents.length} active budget incident${budgetOverview.activeIncidents.length === 1 ? "" : "s"}`,
          summary: "A budget policy has reached a warning or hard-stop condition.",
          suggestedAction: "Review spend, paused scopes, and any governed budget override request.",
          sources: budgetOverview.activeIncidents
            .slice(0, MAX_SAMPLE_SOURCES)
            .map((incident) => sourceRef("budget_incident", incident.id, incident.updatedAt)),
        });
      }
      for (const project of overdueProjects) {
        attention.push({
          id: `project-overdue:${project.id}`,
          kind: "project_overdue",
          severity: "warning",
          title: `${project.name} is ${Math.abs(project.daysRemaining)} day${Math.abs(project.daysRemaining) === 1 ? "" : "s"} past target`,
          summary: "The project remains active after its recorded target date; this is a schedule fact, not an automatic failure.",
          suggestedAction: "Review the target, current critical path, and whether the commitment should be revised.",
          sources: [sourceRef("project", project.id, project.updatedAt)],
        });
      }
      if (pendingApprovalCount > 0) {
        attention.push({
          id: "pending-approvals",
          kind: "pending_approval",
          severity: "warning",
          title: `${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? "" : "s"}`,
          summary: "Governed work may be waiting for a board decision.",
          suggestedAction: "Review the approval queue and decide, request revision, or record the waiting path.",
          sources: pendingApprovalSamples.map((row) => sourceRef("approval", row.id, row.updatedAt)),
        });
      }
      if (blocked > 0) {
        attention.push({
          id: "blocked-work",
          kind: "blocked_work",
          severity: "warning",
          title: `${blocked} blocked issue${blocked === 1 ? "" : "s"}`,
          summary: "Blocked work needs an explicit unblock owner, waiting condition, or recovery path.",
          suggestedAction: "Review blocker attention and prioritize root blockers that unlock downstream work.",
          sources: blockedIssueSamples.map((row) => sourceRef("issue", row.id, row.updatedAt)),
        });
      }
      if (runnable > 0 && availableAgents + runningAgents === 0) {
        attention.push({
          id: "no-available-agents",
          kind: "no_available_agents",
          severity: "warning",
          title: "Runnable work exists without an available agent",
          summary: `${runnable} runnable issue${runnable === 1 ? " has" : "s have"} no active or running execution capacity.`,
          suggestedAction: "Review paused/error agents, ownership, and whether a safe worker lane can be activated.",
          sources: [sourceRef("company", company.id, company.updatedAt)],
        });
      }
      if (unassignedRunnableCount > 0) {
        attention.push({
          id: "unassigned-runnable-work",
          kind: "unassigned_runnable_work",
          severity: "info",
          title: `${unassignedRunnableCount} unassigned runnable issue${unassignedRunnableCount === 1 ? "" : "s"}`,
          summary: "Accepted work is not currently owned by an agent or board user.",
          suggestedAction: "Assign only work that fits current priorities, capacity, and authority boundaries.",
          sources: unassignedIssueSamples.map((row) => sourceRef("issue", row.id, row.updatedAt)),
        });
      }
      if (activeGoals.length === 0) {
        attention.push({
          id: "missing-active-goal",
          kind: "missing_active_goal",
          severity: "warning",
          title: "No active goal is recorded",
          summary: "Work can continue, but the company lacks an explicit active mission in the control plane.",
          suggestedAction: "Activate or create the goal that current work should serve.",
          sources: [sourceRef("company", company.id, company.updatedAt)],
        });
      }
      for (const project of dueSoonProjects) {
        attention.push({
          id: `project-due-soon:${project.id}`,
          kind: "project_due_soon",
          severity: "info",
          title: `${project.name} target is ${project.daysRemaining === 0 ? "today" : `in ${project.daysRemaining} day${project.daysRemaining === 1 ? "" : "s"}`}`,
          summary: "The target is approaching; Paperclip is reporting timing, not forcing completion.",
          suggestedAction: "Confirm the critical path, evidence needs, and any decision or external waiting time.",
          sources: [sourceRef("project", project.id, project.updatedAt)],
        });
      }
      const projectsWithoutTargets = activeProjects.length - projectTargets.length;
      if (activeProjects.length > 0 && projectsWithoutTargets === activeProjects.length) {
        attention.push({
          id: "project-targets-missing",
          kind: "project_target_missing",
          severity: "info",
          title: "Active projects have no target dates",
          summary: "Paperclip can report execution state but cannot provide temporal orientation for these projects.",
          suggestedAction: "Add targets only where they improve coordination; do not invent artificial deadlines.",
          sources: activeProjects
            .slice(0, MAX_SAMPLE_SOURCES)
            .map((project) => sourceRef("project", project.id, project.updatedAt)),
        });
      }

      return {
        companyId,
        generatedAt: now.toISOString(),
        timezone: "UTC",
        basis: "deterministic_projection",
        horizon: { dueSoonDays: COMPANY_SITUATION_DUE_SOON_DAYS },
        mission: {
          activeGoals: activeGoals.map((goal) => ({
            ...goal,
            updatedAt: asIso(goal.updatedAt),
          })),
        },
        work: {
          open,
          runnable,
          inProgress,
          inReview,
          blocked,
          unassignedRunnable: unassignedRunnableCount,
        },
        capacity: {
          totalAgents,
          availableAgents,
          runningAgents,
          pausedAgents,
          errorAgents,
          runnableIssuesPerAvailableAgent:
            availableAgents > 0 ? Number((runnable / availableAgents).toFixed(2)) : null,
        },
        temporal: {
          activeProjects: activeProjects.length,
          projectsWithTargets: projectTargets.length,
          projectsWithoutTargets,
          overdueProjects,
          dueSoonProjects,
        },
        governance: {
          pendingApprovals: pendingApprovalCount,
          activeBudgetIncidents: budgetOverview.activeIncidents.length,
        },
        attention: sortAttention(attention),
        limitations: [
          "This projection reports deterministic control-plane facts; it does not infer causes or business impact.",
          "Completion forecasts and confidence calibration are not part of this slice.",
          "Issue-level due dates, commitments, assumptions, and decision records are not yet modeled as first-class inputs.",
        ],
      };
    },
  };
}
