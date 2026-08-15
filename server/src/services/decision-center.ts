import { and, asc, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  approvals,
  decisionQueuePreferences,
  issues,
  issueThreadInteractions,
} from "@paperclipai/db";
import type {
  Approval,
  DecisionCenterIssueSummary,
  DecisionCenterItem,
  DecisionCenterResponse,
  DecisionCenterSourceType,
  IssueThreadDecisionContext,
  IssueThreadInteraction,
  IssueThreadInteractionResult,
} from "@paperclipai/shared";
import { notFound, unprocessable } from "../errors.js";

const OPEN_APPROVAL_STATUSES = ["pending", "revision_requested"] as const;
const OPEN_ISSUE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked"] as const;

function interactionCategory(kind: string): DecisionCenterItem["category"] {
  if (kind === "ask_user_questions") return "information_request";
  if (kind === "suggest_tasks") return "task_proposal";
  return "confirmation";
}

function interactionTitle(row: typeof issueThreadInteractions.$inferSelect) {
  if (row.title?.trim()) return row.title;
  if (row.kind === "ask_user_questions") return "Information requested";
  if (row.kind === "suggest_tasks") return "Task proposal";
  return "Confirmation requested";
}

function approvalTitle(approval: typeof approvals.$inferSelect) {
  switch (approval.type) {
    case "hire_agent": return "Approve agent hire";
    case "approve_ceo_strategy": return "Approve company strategy";
    case "budget_override_required": return "Review budget override";
    default: return "Board approval requested";
  }
}

function priorityRisk(priority: string | null): DecisionCenterItem["risk"] {
  if (priority === "critical") return "critical";
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}

function ageUrgency(createdAt: Date, risk: DecisionCenterItem["risk"], now: Date): DecisionCenterItem["urgency"] {
  if (risk === "critical") return "critical";
  const ageMs = now.getTime() - createdAt.getTime();
  if (ageMs >= 7 * 24 * 60 * 60 * 1000) return "high";
  if (ageMs >= 24 * 60 * 60 * 1000 || risk === "high") return "medium";
  return "low";
}

function interactionRecommendation(interaction: IssueThreadInteraction): string | null {
  if (interaction.payload.decisionContext?.recommendation) {
    return interaction.payload.decisionContext.recommendation;
  }
  if (interaction.kind === "request_confirmation") {
    return interaction.payload.acceptLabel ?? "Confirm after reviewing the attached evidence";
  }
  if (interaction.kind === "ask_user_questions") return "Answer the required questions";
  if (interaction.kind === "suggest_tasks") return "Review and accept only the task drafts that fit the approved scope";
  return null;
}

function isOwnerDecisionReady(interaction: IssueThreadInteraction) {
  const context = interaction.payload.decisionContext;
  const briefing = context?.ownerBriefing;
  return context?.audience === "board"
    && context.decisionReady === true
    && briefing?.preparedBy === "aia"
    && briefing.language === "pl"
    && briefing.contextFacts.length >= 2
    && briefing.options.length >= 1
    && briefing.afterApproval.length >= 1;
}

function approvalBriefing(approval: Approval): DecisionCenterItem["ownerBriefing"] {
  const budget = approval.type === "budget_override_required";
  return {
    version: 1,
    language: "pl",
    preparedBy: "system",
    decision: budget ? "Czy zaakceptować przekroczenie ustalonego budżetu?" : "Czy zatwierdzić tę formalną operację Paperclipa?",
    contextFacts: [
      "Operacja przekracza uprawnienia autonomicznych agentów i wymaga śladu audytowego właściciela.",
      `Typ wniosku: ${approval.type}.`,
    ],
    options: [
      {
        id: "approve",
        label: "Zatwierdź",
        benefit: "Paperclip może kontynuować wskazaną operację.",
        cost: budget ? "Może zwiększyć wykorzystanie budżetu." : "Uruchamia skutki opisane we wniosku.",
        risk: "Wymaga sprawdzenia treści wniosku i dołączonych dowodów.",
      },
      {
        id: "reject",
        label: "Odrzuć lub poproś o zmianę",
        benefit: "Nieautoryzowana lub niedojrzała operacja nie zostanie wykonana.",
        cost: "Powiązana praca pozostanie wstrzymana do czasu korekty.",
        risk: "Może opóźnić realizację celu.",
      },
    ],
    recommendation: "Sprawdź zakres, konsekwencje i dowody wniosku; zatwierdź tylko wtedy, gdy są zgodne z Twoim celem i akceptowanym ryzykiem.",
    afterApproval: ["Paperclip zapisze audytowalny wynik i wznowi zależną pracę zgodnie z polityką operacji."],
    rollback: "Jeśli operacja jest odwracalna, odpowiedzialny agent powinien wykonać opisany we wniosku rollback; samo zatwierdzenie pozostaje w historii.",
  };
}

function sortItems(left: DecisionCenterItem, right: DecisionCenterItem) {
  if (left.state === "resolved" && right.state === "resolved") {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }
  const rank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
  const riskDelta = rank[right.risk] - rank[left.risk];
  if (riskDelta !== 0) return riskDelta;
  const urgencyDelta = rank[right.urgency] - rank[left.urgency];
  if (urgencyDelta !== 0) return urgencyDelta;
  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

export function decisionCenterService(db: Db) {
  return {
    list: async (companyId: string, now = new Date()): Promise<DecisionCenterResponse> => {
      const [interactionRows, approvalRows, resolvedInteractionRows, resolvedApprovalRows, preferences] = await Promise.all([
        db
          .select({ interaction: issueThreadInteractions, issue: issues })
          .from(issueThreadInteractions)
          .innerJoin(issues, and(
            eq(issueThreadInteractions.issueId, issues.id),
            eq(issueThreadInteractions.companyId, issues.companyId),
          ))
          .where(and(
            eq(issueThreadInteractions.companyId, companyId),
            eq(issueThreadInteractions.status, "pending"),
            inArray(issues.status, [...OPEN_ISSUE_STATUSES]),
            isNull(issues.hiddenAt),
          ))
          .orderBy(asc(issueThreadInteractions.createdAt)),
        db
          .select()
          .from(approvals)
          .where(and(
            eq(approvals.companyId, companyId),
            inArray(approvals.status, [...OPEN_APPROVAL_STATUSES]),
          ))
          .orderBy(asc(approvals.createdAt)),
        db
          .select({ interaction: issueThreadInteractions, issue: issues })
          .from(issueThreadInteractions)
          .innerJoin(issues, and(
            eq(issueThreadInteractions.issueId, issues.id),
            eq(issueThreadInteractions.companyId, issues.companyId),
          ))
          .where(and(
            eq(issueThreadInteractions.companyId, companyId),
            notInArray(issueThreadInteractions.status, ["pending"]),
            isNull(issues.hiddenAt),
          ))
          .orderBy(desc(issueThreadInteractions.resolvedAt), desc(issueThreadInteractions.updatedAt))
          .limit(100),
        db
          .select()
          .from(approvals)
          .where(and(
            eq(approvals.companyId, companyId),
            notInArray(approvals.status, [...OPEN_APPROVAL_STATUSES]),
          ))
          .orderBy(desc(approvals.decidedAt), desc(approvals.updatedAt))
          .limit(100),
        db
          .select()
          .from(decisionQueuePreferences)
          .where(eq(decisionQueuePreferences.companyId, companyId)),
      ]);

      const preferenceBySource = new Map(
        preferences.map((row) => [`${row.sourceType}:${row.sourceId}`, row] as const),
      );
      const items: DecisionCenterItem[] = [];

      for (const row of interactionRows) {
        const interaction = row.interaction as unknown as IssueThreadInteraction;
        const preference = preferenceBySource.get(`interaction:${interaction.id}`) ?? null;
        const isDeferred = Boolean(preference?.deferredUntil && preference.deferredUntil.getTime() > now.getTime());
        const decisionContext = interaction.payload.decisionContext ?? null;
        const needsPreparation = !isOwnerDecisionReady(interaction);
        const state: DecisionCenterItem["state"] = isDeferred
          ? "deferred"
          : needsPreparation
            ? "preparing"
            : "ready";
        const risk = decisionContext?.risk ?? priorityRisk(row.issue.priority);
        items.push({
          id: `interaction:${interaction.id}`,
          companyId,
          sourceType: "interaction",
          sourceId: interaction.id,
          state,
          category: interactionCategory(interaction.kind),
          title: interactionTitle(row.interaction),
          summary: interaction.summary ?? null,
          whyOwner: decisionContext?.authorityReason
            ?? (needsPreparation
              ? "AIA must classify, consolidate, and prepare this request before it can reach the owner."
              : "This issue-thread request is pending at the board governance boundary; agents cannot resolve it for the owner."),
          recommendedAction: interactionRecommendation(interaction),
          ownerBriefing: decisionContext?.ownerBriefing ?? null,
          risk,
          urgency: decisionContext?.urgency ?? ageUrgency(row.interaction.createdAt, risk, now),
          createdAt: interaction.createdAt,
          updatedAt: interaction.updatedAt,
          deferredUntil: preference?.deferredUntil ?? null,
          deferNote: preference?.note ?? null,
          issue: {
            id: row.issue.id,
            identifier: row.issue.identifier,
            title: row.issue.title,
            status: row.issue.status as DecisionCenterIssueSummary["status"],
            priority: row.issue.priority as DecisionCenterIssueSummary["priority"],
            projectId: row.issue.projectId,
            assigneeAgentId: row.issue.assigneeAgentId,
          },
          interaction,
          approval: null,
        });
      }

      for (const approvalRow of approvalRows) {
        const approval = approvalRow as unknown as Approval;
        const preference = preferenceBySource.get(`approval:${approval.id}`) ?? null;
        const isDeferred = Boolean(preference?.deferredUntil && preference.deferredUntil.getTime() > now.getTime());
        const risk: DecisionCenterItem["risk"] = approval.type === "budget_override_required" ? "critical" : "high";
        items.push({
          id: `approval:${approval.id}`,
          companyId,
          sourceType: "approval",
          sourceId: approval.id,
          state: isDeferred ? "deferred" : "ready",
          category: "formal_approval",
          title: approvalTitle(approvalRow),
          summary: null,
          whyOwner: "This is a formal governed action that requires an auditable board decision.",
          recommendedAction: "Review the request, linked evidence, and consequences before approving or rejecting it",
          ownerBriefing: approvalBriefing(approval),
          risk,
          urgency: ageUrgency(approvalRow.createdAt, risk, now),
          createdAt: approval.createdAt,
          updatedAt: approval.updatedAt,
          deferredUntil: preference?.deferredUntil ?? null,
          deferNote: preference?.note ?? null,
          issue: null,
          interaction: null,
          approval,
        });
      }

      for (const row of resolvedInteractionRows) {
        const interaction = row.interaction as unknown as IssueThreadInteraction;
        const risk = priorityRisk(row.issue.priority);
        items.push({
          id: `interaction:${interaction.id}`,
          companyId,
          sourceType: "interaction",
          sourceId: interaction.id,
          state: "resolved",
          category: interactionCategory(interaction.kind),
          title: interactionTitle(row.interaction),
          summary: interaction.summary ?? null,
          whyOwner: "This structured interaction is part of the durable board decision history.",
          recommendedAction: null,
          ownerBriefing: interaction.payload.decisionContext?.ownerBriefing ?? null,
          risk,
          urgency: "low",
          createdAt: interaction.createdAt,
          updatedAt: interaction.updatedAt,
          deferredUntil: null,
          deferNote: null,
          issue: {
            id: row.issue.id,
            identifier: row.issue.identifier,
            title: row.issue.title,
            status: row.issue.status as DecisionCenterIssueSummary["status"],
            priority: row.issue.priority as DecisionCenterIssueSummary["priority"],
            projectId: row.issue.projectId,
            assigneeAgentId: row.issue.assigneeAgentId,
          },
          interaction,
          approval: null,
        });
      }

      for (const approvalRow of resolvedApprovalRows) {
        const approval = approvalRow as unknown as Approval;
        const risk: DecisionCenterItem["risk"] = approval.type === "budget_override_required" ? "critical" : "high";
        items.push({
          id: `approval:${approval.id}`,
          companyId,
          sourceType: "approval",
          sourceId: approval.id,
          state: "resolved",
          category: "formal_approval",
          title: approvalTitle(approvalRow),
          summary: approval.decisionNote ?? null,
          whyOwner: "This formal approval is part of the durable board governance history.",
          recommendedAction: null,
          ownerBriefing: approvalBriefing(approval),
          risk,
          urgency: "low",
          createdAt: approval.createdAt,
          updatedAt: approval.updatedAt,
          deferredUntil: null,
          deferNote: null,
          issue: null,
          interaction: null,
          approval,
        });
      }

      items.sort(sortItems);
      const ready = items.filter((item) => item.state === "ready").length;
      const preparing = items.filter((item) => item.state === "preparing").length;
      const deferred = items.filter((item) => item.state === "deferred").length;
      return { counts: { ready, preparing, deferred, allOpen: ready + preparing + deferred }, items };
    },

    prepareInteraction: async (input: {
      companyId: string;
      sourceId: string;
      decisionContext: IssueThreadDecisionContext;
      agentId: string;
    }) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.id, input.sourceId),
          eq(issueThreadInteractions.companyId, input.companyId),
          eq(issueThreadInteractions.status, "pending"),
        ))
        .then((rows) => rows[0] ?? null);
      if (!current) throw notFound("Pending decision interaction not found");
      const briefing = input.decisionContext.ownerBriefing;
      if (
        input.decisionContext.audience !== "board"
        || !input.decisionContext.decisionReady
        || briefing?.preparedBy !== "aia"
        || briefing.language !== "pl"
      ) {
        throw unprocessable("A ready owner decision requires a complete Polish AIA briefing");
      }
      const payload = current.payload;
      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          payload: {
            ...payload,
            decisionContext: {
              ...input.decisionContext,
              ownerBriefing: {
                ...briefing,
                preparedByAgentId: input.agentId,
                preparedAt: new Date().toISOString(),
              },
            },
          } as typeof current.payload,
          updatedAt: new Date(),
        })
        .where(eq(issueThreadInteractions.id, current.id))
        .returning();
      return updated;
    },

    rerouteInteraction: async (input: {
      companyId: string;
      sourceId: string;
      reason: string;
      agentId: string;
    }) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.id, input.sourceId),
          eq(issueThreadInteractions.companyId, input.companyId),
          eq(issueThreadInteractions.status, "pending"),
        ))
        .then((rows) => rows[0] ?? null);
      if (!current) throw notFound("Pending decision interaction not found");
      const result: IssueThreadInteractionResult = current.kind === "ask_user_questions"
        ? { version: 1 as const, cancelled: true as const, cancellationReason: input.reason }
        : current.kind === "request_confirmation"
          ? { version: 1 as const, outcome: "rejected" as const, reason: input.reason }
          : { version: 1 as const, rejectionReason: input.reason };
      const now = new Date();
      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: current.kind === "ask_user_questions" ? "cancelled" : "rejected",
          result,
          resolvedByAgentId: input.agentId,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(eq(issueThreadInteractions.id, current.id))
        .returning();
      return updated;
    },

    defer: async (input: {
      companyId: string;
      sourceType: DecisionCenterSourceType;
      sourceId: string;
      deferredUntil: Date;
      note?: string | null;
      userId: string | null;
    }) => {
      if (input.deferredUntil.getTime() <= Date.now()) {
        throw unprocessable("deferredUntil must be in the future");
      }
      const sourceExists = input.sourceType === "interaction"
        ? await db.select({ id: issueThreadInteractions.id }).from(issueThreadInteractions).where(and(
          eq(issueThreadInteractions.id, input.sourceId),
          eq(issueThreadInteractions.companyId, input.companyId),
          eq(issueThreadInteractions.status, "pending"),
        )).then((rows) => Boolean(rows[0]))
        : await db.select({ id: approvals.id }).from(approvals).where(and(
          eq(approvals.id, input.sourceId),
          eq(approvals.companyId, input.companyId),
          inArray(approvals.status, [...OPEN_APPROVAL_STATUSES]),
        )).then((rows) => Boolean(rows[0]));
      if (!sourceExists) throw notFound("Open decision source not found");
      const existing = await db
        .select()
        .from(decisionQueuePreferences)
        .where(and(
          eq(decisionQueuePreferences.companyId, input.companyId),
          eq(decisionQueuePreferences.sourceType, input.sourceType),
          eq(decisionQueuePreferences.sourceId, input.sourceId),
        ))
        .then((rows) => rows[0] ?? null);
      const now = new Date();
      if (existing) {
        return db.update(decisionQueuePreferences).set({
          deferredUntil: input.deferredUntil,
          note: input.note?.trim() || null,
          updatedByUserId: input.userId,
          updatedAt: now,
        }).where(eq(decisionQueuePreferences.id, existing.id)).returning().then((rows) => rows[0]);
      }
      return db.insert(decisionQueuePreferences).values({
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        deferredUntil: input.deferredUntil,
        note: input.note?.trim() || null,
        updatedByUserId: input.userId,
      }).returning().then((rows) => rows[0]);
    },

    clearDefer: async (companyId: string, sourceType: DecisionCenterSourceType, sourceId: string) => {
      const rows = await db.delete(decisionQueuePreferences).where(and(
        eq(decisionQueuePreferences.companyId, companyId),
        eq(decisionQueuePreferences.sourceType, sourceType),
        eq(decisionQueuePreferences.sourceId, sourceId),
      )).returning();
      if (rows.length === 0) throw notFound("Decision queue preference not found");
      return { ok: true as const };
    },
  };
}
