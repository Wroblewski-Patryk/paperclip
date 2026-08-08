import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, delegationReports, issues, workProposals } from "@paperclipai/db";
import type { CreateDelegationReport, CreateWorkProposal } from "@paperclipai/shared";
import { forbidden, notFound } from "../errors.js";

export function delegationFlowService(db: Db) {
  async function ownedIssue(issueId: string, actorAgentId: string) {
    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    if (issue.assigneeAgentId !== actorAgentId && issue.createdByAgentId !== actorAgentId) {
      throw forbidden("Only the issue owner may report or propose work upward");
    }
    const actor = await db.select().from(agents).where(and(
      eq(agents.id, actorAgentId),
      eq(agents.companyId, issue.companyId),
    )).then((rows) => rows[0] ?? null);
    if (!actor) throw forbidden("Actor agent was not found in the issue company");
    return { issue, actor };
  }

  return {
    listWorkProposals(issueId: string) {
      return db.select().from(workProposals).where(eq(workProposals.sourceIssueId, issueId));
    },
    async createWorkProposal(issueId: string, actorAgentId: string, data: CreateWorkProposal) {
      const { issue, actor } = await ownedIssue(issueId, actorAgentId);
      if (!actor.reportsTo || actor.reportsTo !== data.targetParentAgentId) {
        throw forbidden("Work proposals may only move upward to the actor's direct parent");
      }
      const existing = await db.select().from(workProposals).where(and(
        eq(workProposals.companyId, issue.companyId),
        eq(workProposals.idempotencyKey, data.idempotencyKey),
      )).then((rows) => rows[0] ?? null);
      if (existing) return existing;
      return db.insert(workProposals).values({
        companyId: issue.companyId,
        projectId: issue.projectId,
        sourceIssueId: issue.id,
        proposedByAgentId: actor.id,
        ...data,
      }).returning().then((rows) => rows[0]);
    },
    listReports(issueId: string) {
      return db.select().from(delegationReports).where(eq(delegationReports.issueId, issueId));
    },
    async createReport(issueId: string, actorAgentId: string, data: CreateDelegationReport) {
      const { issue, actor } = await ownedIssue(issueId, actorAgentId);
      if (!actor.reportsTo || actor.reportsTo !== data.toParentAgentId) {
        throw forbidden("Delegation reports may only move upward to the actor's direct parent");
      }
      const existing = await db.select().from(delegationReports).where(and(
        eq(delegationReports.companyId, issue.companyId),
        eq(delegationReports.idempotencyKey, data.idempotencyKey),
      )).then((rows) => rows[0] ?? null);
      if (existing) return existing;
      return db.insert(delegationReports).values({
        companyId: issue.companyId,
        issueId: issue.id,
        fromAgentId: actor.id,
        ...data,
      }).returning().then((rows) => rows[0]);
    },
  };
}
