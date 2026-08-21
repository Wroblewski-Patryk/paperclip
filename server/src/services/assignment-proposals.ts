import { and, eq, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  assignmentProposals,
  deliveryTasks,
  heartbeatRuns,
  issues,
  productDeliveries,
} from "@paperclipai/db";
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

        if (data.routingMode === "direct_child") {
          if (assignee.reportsTo !== actor.agentId) {
            throw forbidden("Hierarchical delegation is limited to the actor's direct reports");
          }
        } else {
          const delivery = data.deliveryId
            ? await db.select().from(productDeliveries).where(and(
              eq(productDeliveries.id, data.deliveryId),
              eq(productDeliveries.companyId, issue.companyId),
            )).then((rows) => rows[0] ?? null)
            : null;
          if (!delivery || !["admitted", "implementing"].includes(delivery.stage)) {
            throw forbidden("ProductDelivery fast path requires an admitted active delivery");
          }
          if (delivery.projectId !== issue.projectId) {
            throw forbidden("ProductDelivery fast path cannot cross project boundaries");
          }
          const linkedTask = await db.select({ id: deliveryTasks.id }).from(deliveryTasks).where(and(
            eq(deliveryTasks.deliveryId, delivery.id),
            eq(deliveryTasks.issueId, issue.id),
          )).then((rows) => rows[0] ?? null);
          const contract = delivery.decisionContract as Record<string, unknown>;
          const fastPath = contract.fastPath as Record<string, unknown> | undefined;
          const allowedAgentIds = Array.isArray(fastPath?.allowedAgentIds)
            ? fastPath.allowedAgentIds.filter((value): value is string => typeof value === "string")
            : [];
          if (!linkedTask || fastPath?.enabled !== true || !allowedAgentIds.includes(actor.agentId) || !allowedAgentIds.includes(assignee.id)) {
            throw forbidden("ProductDelivery fast path is not approved for this issue and actor pair");
          }
        }
      }

      if (data.reviewerAgentId === data.proposedAssigneeAgentId) {
        throw unprocessable("Executor and reviewer must be different agents");
      }
      const reviewer = await db.select().from(agents).where(and(
        eq(agents.id, data.reviewerAgentId),
        eq(agents.companyId, issue.companyId),
      )).then((rows) => rows[0] ?? null);
      if (!reviewer || ["terminated", "pending_approval"].includes(reviewer.status)) {
        throw unprocessable("Reviewer is not an active agent in this company");
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

      const actorOwnsRunningIssueHeartbeat = actor.type === "agent" && actor.agentId
        ? await db.select({ id: heartbeatRuns.id }).from(heartbeatRuns).where(and(
          eq(heartbeatRuns.companyId, issue.companyId),
          eq(heartbeatRuns.agentId, actor.agentId),
          eq(heartbeatRuns.status, "running"),
          sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issue.id}`,
        )).limit(1).then((rows) => rows.length > 0)
        : false;

      const decision = await admission.evaluateWork({
        companyId: issue.companyId,
        projectId: issue.projectId,
        issueId: issue.id,
        agentId: data.proposedAssigneeAgentId,
        source: "assignment.proposal",
        fingerprint: `assignment:${issue.id}:${data.proposedAssigneeAgentId}`,
        evidenceHash: data.evidenceHash ?? data.idempotencyKey,
        allowIssueWipContinuation: actorOwnsRunningIssueHeartbeat,
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
          parentAgentId: actor.agentId ?? null,
          routingMode: data.routingMode,
          deliveryId: data.deliveryId ?? null,
          delegationPath: actor.agentId ? [actor.agentId, data.proposedAssigneeAgentId] : [data.proposedAssigneeAgentId],
          scopeContract: data.scopeContract,
          budgetContract: data.budgetContract,
          acceptanceCriteria: data.acceptanceCriteria,
          reviewerAgentId: data.reviewerAgentId,
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
