import { describe, expect, it } from "vitest";
import { createIssueThreadInteractionSchema } from "./validators/issue.js";

describe("issue thread interaction schemas", () => {
  it("accepts a complete board decision context", () => {
    const parsed = createIssueThreadInteractionSchema.parse({
      kind: "request_confirmation",
      payload: {
        version: 1,
        decisionContext: {
          version: 1,
          audience: "board",
          decisionClass: "owner_authority",
          decisionReady: true,
          authorityReason: "Only the board can authorize the protected action.",
          recommendation: "Approve after reviewing the current evidence.",
          evidenceRefs: ["issue:LUC-1:comment:latest"],
          risk: "high",
          urgency: "medium",
          reversibility: "costly",
          ownerBriefing: {
            version: 1,
            language: "pl",
            preparedBy: "aia",
            decision: "Czy zatwierdzić chronioną operację?",
            contextFacts: ["Operacja dotyczy produkcji.", "Agenci nie mają uprawnienia do samodzielnej zgody."],
            options: [{
              id: "approve",
              label: "Zatwierdź",
              benefit: "Praca może być kontynuowana.",
              cost: "Wymaga nadzoru wdrożenia.",
              risk: "Błędna operacja może wpłynąć na produkcję.",
            }],
            recommendation: "Zatwierdź po sprawdzeniu aktualnych dowodów.",
            afterApproval: ["DRE wykona operację i zapisze monitoring."],
            rollback: "DRE przywróci poprzednią wersję.",
          },
        },
        prompt: "Authorize the protected action?",
      },
    });

    expect(parsed.payload.decisionContext?.audience).toBe("board");
    expect(parsed.payload.decisionContext?.decisionReady).toBe(true);
    expect(parsed.payload.decisionContext?.ownerBriefing?.language).toBe("pl");
  });

  it("rejects an incomplete AIA owner briefing", () => {
    expect(() => createIssueThreadInteractionSchema.parse({
      kind: "request_confirmation",
      payload: {
        version: 1,
        decisionContext: {
          version: 1,
          audience: "board",
          decisionClass: "owner_authority",
          decisionReady: true,
          authorityReason: "Owner authority is required.",
          ownerBriefing: {
            version: 1,
            language: "pl",
            preparedBy: "aia",
            decision: "Czy kontynuować?",
            contextFacts: ["Tylko jeden fakt."],
            options: [],
            recommendation: "Kontynuuj.",
            afterApproval: [],
            rollback: "Cofnij zmianę.",
          },
        },
        prompt: "Continue?",
      },
    })).toThrow();
  });
  it("parses request_confirmation payloads with default no-wake continuation", () => {
    const parsed = createIssueThreadInteractionSchema.parse({
      kind: "request_confirmation",
      payload: {
        version: 1,
        prompt: "Apply this plan?",
        acceptLabel: "Apply",
        rejectLabel: "Revise",
        rejectRequiresReason: true,
        rejectReasonLabel: "What needs to change?",
        declineReasonPlaceholder: "Optional: tell the agent what you'd change.",
        detailsMarkdown: "The current plan document will be accepted as-is.",
        supersedeOnUserComment: true,
      },
    });

    expect(parsed).toMatchObject({
      kind: "request_confirmation",
      continuationPolicy: "none",
      payload: {
        prompt: "Apply this plan?",
        acceptLabel: "Apply",
        rejectLabel: "Revise",
        rejectRequiresReason: true,
        rejectReasonLabel: "What needs to change?",
        allowDeclineReason: true,
        declineReasonPlaceholder: "Optional: tell the agent what you'd change.",
        supersedeOnUserComment: true,
      },
    });
  });

  it("accepts issue document targets for request_confirmation interactions", () => {
    const parsed = createIssueThreadInteractionSchema.parse({
      kind: "request_confirmation",
      continuationPolicy: "wake_assignee_on_accept",
      payload: {
        version: 1,
        prompt: "Accept the latest plan revision?",
        allowDeclineReason: false,
        target: {
          type: "issue_document",
          issueId: "11111111-1111-4111-8111-111111111111",
          documentId: "22222222-2222-4222-8222-222222222222",
          key: "plan",
          revisionId: "33333333-3333-4333-8333-333333333333",
          revisionNumber: 2,
          label: "Plan v2",
          href: "/issues/PAP-123#document-plan",
        },
      },
    });

    expect(parsed.kind).toBe("request_confirmation");
    if (parsed.kind !== "request_confirmation") return;
    expect(parsed.payload.target).toMatchObject({
      type: "issue_document",
      key: "plan",
      revisionNumber: 2,
      label: "Plan v2",
      href: "/issues/PAP-123#document-plan",
    });
  });

  it("accepts custom targets for request_confirmation interactions", () => {
    const parsed = createIssueThreadInteractionSchema.parse({
      kind: "request_confirmation",
      payload: {
        version: 1,
        prompt: "Proceed with the external checklist?",
        target: {
          type: "custom",
          key: "external-checklist",
          revisionId: "checklist-v1",
          revisionNumber: 1,
          label: "Checklist v1",
          href: "https://example.com/checklist",
        },
      },
    });

    expect(parsed.kind).toBe("request_confirmation");
    if (parsed.kind !== "request_confirmation") return;
    expect(parsed.payload.target).toMatchObject({
      type: "custom",
      key: "external-checklist",
      label: "Checklist v1",
    });
  });

  it("rejects unsafe request_confirmation target hrefs", () => {
    const base = {
      kind: "request_confirmation",
      payload: {
        version: 1,
        prompt: "Proceed?",
        target: {
          type: "custom",
          key: "external-checklist",
          revisionId: "checklist-v1",
          label: "Checklist v1",
        },
      },
    } as const;

    for (const href of ["javascript:alert(1)", "data:text/html,hi", "//evil.example/path"]) {
      expect(() => createIssueThreadInteractionSchema.parse({
        ...base,
        payload: {
          ...base.payload,
          target: {
            ...base.payload.target,
            href,
          },
        },
      })).toThrow("href must not use javascript:, data:, or protocol-relative URLs");
    }
  });
});
