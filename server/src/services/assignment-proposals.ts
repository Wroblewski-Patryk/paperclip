import { and, eq, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, assignmentProposals, issues } from "@paperclipai/db";
import type { ProposeAssignment } from "@paperclipai/shared";
import { conflict, forbidden, notFound, unprocessable } from "../errors.js";
import { admissionControlService } from "./admission-control.js";
import { MAX_DISTINCT_AGENTS_PER_PROBLEM } from "./issues.js";

export function assignmentProposalService(db: Db) {
  const admission = admissionControlService(db);

  return {
    list(issueId: string) {
      return db.select().from(assignmentProposals).where(eq(assignmentProposals.issueId, issueId));
    },

    async proposeAndApply(
      issueId: string,
      data: ProposeAssignment,
      actor: { type: "agent" | "user" | "board"; agentId?: string | null; userId?: string | null },
    ) {
      const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
      if (!issue) throw notFound("Issue not found");
      const existing = await db.select().from(assignmentProposals).where(and(
        eq(assignmentProposals.companyId, issue.companyId),
        eq(assignmentProposals.idempotencyKey, data.idempotencyKey),
      )).then((rows) => rows[0] ?? null);
      if (existing) return { proposal: existing, issue, idempotent: true };
      if (["done", "cancelled", "in_progress"].includes(issue.status)) {
        throw conflict("Assignments may only be proposed for non-terminal work without an active checkout");
      }
      const assignee = await db.select().from(agents).where(and(
        eq(agents.id, data.proposedAssigneeAgentId),
        eq(agents.companyId, issue.companyId),
      )).then((rows) => rows[0] ?? null);
      if (!assignee || ["terminated", "pending_approval"].includes(assignee.status)) {
        throw unprocessable("Proposed assignee is not an assignable agent in this company");
      }
      if (actor.type === "agent") {
        if (!actor.agentId) throw forbidden("Agent identity is required");
        const parent = issue.parentId
          ? await db.select({ assigneeAgentId: issues.assigneeAgentId }).from(issues)
            .where(eq(issues.id, issue.parentId)).then((rows) => rows[0] ?? null)
          : null;
        const ownsDelegation = issue.assigneeAgentId === actor.agentId
          || issue.createdByAgentId === actor.agentId
          || parent?.assigneeAgentId === actor.agentId;
        if (!ownsDelegation) throw forbidden("Agent may propose assignment only for work it owns, created, or directly supervises");
      }

      const familyAssignees = await db.select({ assigneeAgentId: issues.assigneeAgentId }).from(issues)
        .where(and(
          eq(issues.companyId, issue.companyId),
          issue.parentId
            ? or(eq(issues.id, issue.parentId), eq(issues.parentId, issue.parentId))
            : or(eq(issues.id, issue.id), eq(issues.parentId, issue.id)),
        ));
      const distinct = new Set(familyAssignees.map((row) => row.assigneeAgentId).filter(Boolean));
      distinct.add(data.proposedAssigneeAgentId);
      if (distinct.size > MAX_DISTINCT_AGENTS_PER_PROBLEM) {
        throw unprocessable(`Problem already uses the maximum ${MAX_DISTINCT_AGENTS_PER_PROBLEM} distinct agents`);
      }

      const decision = await admission.evaluateWork({
        companyId: issue.companyId,
        projectId: issue.projectId,
        issueId: issue.id,
        agentId: data.proposedAssigneeAgentId,
        source: "assignment.proposal",
        fingerprint: `assignment:${issue.id}:${data.proposedAssigneeAgentId}`,
        evidenceHash: data.evidenceHash ?? data.idempotencyKey,
      });

      return db.transaction(async (tx) => {
        await tx.execute(sql`select id from issues where id = ${issue.id} for update`);
        const current = await tx.select().from(issues).where(eq(issues.id, issue.id)).then((rows) => rows[0] ?? null);
        if (!current) throw notFound("Issue not found");
        if (current.assigneeAgentId && current.assigneeAgentId !== issue.assigneeAgentId) {
          throw conflict("Issue assignment changed while proposal was evaluated");
        }
        const appliedAt = decision.admitted ? new Date() : null;
        const status = decision.admitted ? "applied" : decision.disposition;
        const proposal = await tx.insert(assignmentProposals).values({
          companyId: issue.companyId,
          projectId: issue.projectId,
          issueId: issue.id,
          proposedAssigneeAgentId: data.proposedAssigneeAgentId,
          proposedByAgentId: actor.agentId ?? null,
          proposedByUserId: actor.userId ?? null,
          admissionDecisionId: decision.decisionId,
          status,
          idempotencyKey: data.idempotencyKey,
          reason: data.reason,
          disposition: decision.disposition,
          appliedAt,
          updatedAt: new Date(),
        }).returning().then((rows) => rows[0]);
        const updatedIssue = decision.admitted
          ? await tx.update(issues).set({
            assigneeAgentId: data.proposedAssigneeAgentId,
            assigneeUserId: null,
            status: current.status === "backlog" ? "todo" : current.status,
            updatedAt: new Date(),
          }).where(eq(issues.id, issue.id)).returning().then((rows) => rows[0])
          : current;
        return { proposal, issue: updatedIssue, decision, idempotent: false };
      });
    },
  };
}
