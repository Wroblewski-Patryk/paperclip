import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, assignmentProposals, issues, projectWorkspaces, projects } from "@paperclipai/db";
import { badRequest, unprocessable } from "../errors.js";
import {
  deriveContextWorkType,
  estimateContextTokens,
  hashContextSource,
  resolveContextBudget,
  type ContextManifestSource,
  type ContextWorkType,
} from "./context-admission.js";
const MAX_SOURCE_AGE_MS = 24 * 60 * 60 * 1000;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export type NativeRunContextPacket = {
  schemaVersion: 2;
  generatedAt: string;
  historyIncluded: false;
  staleInputDiscarded: boolean;
  role: Record<string, unknown>;
  project: Record<string, unknown> | null;
  task: Record<string, unknown> | null;
  references: Array<{ kind: string; ref: string; source: string }>;
  sourceAttribution: Record<string, string>;
  contextManifest: {
    workType: ContextWorkType;
    sources: ContextManifestSource[];
    forbiddenByDefault: string[];
  };
  budget: { tokenLimit: number; hardTokenLimit: number; estimatedTokens: number; fileLimit: number; hardFileLimit: number; referencedFiles: number; contextOverride: Record<string, unknown> | null };
};

export function runContextBuilderService(db: Db) {
  return {
    async build(input: {
      companyId: string;
      agentId: string;
      issueId?: string | null;
      projectId?: string | null;
      inputContext?: Record<string, unknown>;
      now?: Date;
    }): Promise<NativeRunContextPacket> {
      const now = input.now ?? new Date();
      const incoming = input.inputContext ?? {};
      const previousEnvelope = record(incoming.nativeContext);
      const previousGeneratedAt = typeof previousEnvelope.generatedAt === "string" ? Date.parse(previousEnvelope.generatedAt) : NaN;
      const staleInputDiscarded = Number.isFinite(previousGeneratedAt) && now.getTime() - previousGeneratedAt > MAX_SOURCE_AGE_MS;

      const agent = await db.select().from(agents).where(and(eq(agents.id, input.agentId), eq(agents.companyId, input.companyId)))
        .then((rows) => rows[0] ?? null);
      if (!agent) throw badRequest("Run context agent does not belong to the company");
      const [parent, children, issue] = await Promise.all([
        agent.reportsTo ? db.select({ id: agents.id, name: agents.name, role: agents.role }).from(agents).where(and(eq(agents.id, agent.reportsTo), eq(agents.companyId, input.companyId))).then((rows) => rows[0] ?? null) : null,
        db.select({ id: agents.id, name: agents.name, role: agents.role }).from(agents).where(and(eq(agents.companyId, input.companyId), eq(agents.reportsTo, agent.id))),
        input.issueId ? db.select().from(issues).where(and(eq(issues.id, input.issueId), eq(issues.companyId, input.companyId))).then((rows) => rows[0] ?? null) : null,
      ]);
      if (input.issueId && !issue) throw badRequest("Run context issue does not belong to the company");
      const projectId = issue?.projectId ?? input.projectId ?? null;
      const [project, workspaces, assignment] = await Promise.all([
        projectId ? db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.companyId, input.companyId))).then((rows) => rows[0] ?? null) : null,
        projectId ? db.select().from(projectWorkspaces).where(and(eq(projectWorkspaces.projectId, projectId), eq(projectWorkspaces.companyId, input.companyId))) : [],
        issue ? db.select().from(assignmentProposals).where(and(eq(assignmentProposals.issueId, issue.id), eq(assignmentProposals.status, "applied"))).orderBy(desc(assignmentProposals.appliedAt)).limit(1).then((rows) => rows[0] ?? null) : null,
      ]);
      if (projectId && !project) throw badRequest("Run context project does not belong to the company");

      const roleIdentity = [agent.name, agent.title, agent.role].filter(Boolean).join(" ");
      const workType = deriveContextWorkType(incoming, roleIdentity);
      const resolvedBudget = resolveContextBudget({
        workType,
        role: roleIdentity,
        requested: record(incoming.contextBudget),
        override: record(incoming.contextOverride),
        now,
      });
      const { tokenLimit, fileLimit } = resolvedBudget;
      const references = workspaces.map((workspace) => ({
        kind: "workspace",
        ref: workspace.cwd ?? workspace.repoUrl ?? workspace.remoteWorkspaceRef ?? workspace.id,
        source: `project_workspaces:${workspace.id}`,
      }));
      if (references.length > fileLimit) throw unprocessable("Native run context exceeds its file/reference budget", { fileLimit, referencedFiles: references.length });

      const base = {
        schemaVersion: 2 as const,
        generatedAt: now.toISOString(),
        historyIncluded: false as const,
        staleInputDiscarded,
        role: {
          agentId: agent.id,
          name: agent.name,
          role: agent.role,
          responsibility: agent.capabilities,
          parent,
          directChildren: children,
          permissions: agent.permissions,
          reportingRule: parent ? "Report results, evidence, blockers, cost, and risk to the direct parent." : "Report owner-relevant outcomes to the board.",
          escalationRule: parent ? "Escalate upward to the direct parent; do not assign laterally." : "Escalate exceptional or irreversible decisions to the owner.",
        },
        project: project ? {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          leadAgentId: project.leadAgentId,
          workspaceRefs: references.map((reference) => reference.ref),
          sourceOfTruth: `projects:${project.id}`,
        } : null,
        task: issue ? {
          id: issue.id,
          identifier: issue.identifier,
          problem: issue.title,
          expectedOutcome: issue.description,
          scope: assignment?.scopeContract ?? null,
          acceptanceCriteria: assignment?.acceptanceCriteria ?? [],
          budget: assignment?.budgetContract ?? null,
          ownerAgentId: assignment?.parentAgentId ?? issue.createdByAgentId,
          executorAgentId: issue.assigneeAgentId,
          reviewerAgentId: assignment?.reviewerAgentId ?? null,
          evidence: issue.completionEvidence ?? null,
          rollback: record(issue.executionPolicy).rollback ?? null,
          admissionDecisionId: assignment?.admissionDecisionId ?? null,
          sourceOfTruth: `issues:${issue.id}`,
        } : null,
        references,
        sourceAttribution: {
          role: `agents:${agent.id}`,
          hierarchy: "agents.reports_to",
          project: project ? `projects:${project.id}` : "none",
          task: issue ? `issues:${issue.id}` : "none",
          assignment: assignment ? `assignment_proposals:${assignment.id}` : "none",
        },
      };
      const source = (sourceName: string, sourceType: string, value: unknown, inclusionReason: string, owner: string): ContextManifestSource => {
        const serialized = JSON.stringify(value);
        return {
          source: sourceName,
          sourceType,
          bytes: Buffer.byteLength(serialized, "utf8"),
          estimatedTokens: estimateContextTokens(serialized),
          inclusionReason,
          requirement: "required",
          freshness: "database_read_at_run_admission",
          owner,
          version: hashContextSource(serialized),
          onDemand: false,
          included: true,
          reduction: "none",
        };
      };
      const manifestSources = [
        source(`agents:${agent.id}`, "role", base.role, "Task-scoped role, hierarchy, permissions and escalation contract", agent.id),
        ...(base.project ? [source(`projects:${project!.id}`, "project", base.project, "Current project identity and workspace references", project!.leadAgentId ?? "board")] : []),
        ...(base.task ? [source(`issues:${issue!.id}`, "task", base.task, "Current task scope, acceptance and evidence contract", issue!.assigneeAgentId ?? "unassigned")] : []),
        ...references.map((reference) => ({
          source: reference.source,
          sourceType: "workspace_reference",
          bytes: Buffer.byteLength(reference.ref, "utf8"),
          estimatedTokens: estimateContextTokens(reference.ref),
          inclusionReason: "Reference only; retrieve task-relevant files on demand",
          requirement: "optional" as const,
          freshness: "database_read_at_run_admission",
          owner: project?.leadAgentId ?? "board",
          version: hashContextSource(reference.ref),
          onDemand: true,
          included: false,
          reduction: "reference" as const,
        })),
      ];
      const contextManifest = {
        workType,
        sources: manifestSources,
        forbiddenByDefault: ["session_history", "organization_history", "cross_project_docs", "archives", "full_logs"],
      };
      const estimatedTokens = estimateContextTokens({ ...base, contextManifest });
      if (estimatedTokens > tokenLimit) {
        throw unprocessable("Native run context exceeds its hard token budget", { tokenLimit, estimatedTokens });
      }
      return {
        ...base,
        contextManifest,
        budget: {
          tokenLimit,
          hardTokenLimit: resolvedBudget.hardTokenLimit,
          estimatedTokens,
          fileLimit,
          hardFileLimit: resolvedBudget.hardFileLimit,
          contextOverride: resolvedBudget.contextOverride,
          referencedFiles: references.length,
        },
      };
    },
  };
}
