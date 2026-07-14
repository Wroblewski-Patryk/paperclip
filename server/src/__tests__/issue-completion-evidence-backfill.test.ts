import { describe, expect, it } from "vitest";
import {
  buildBackfillCompletionEvidenceBundle,
  isSubstantiveCompletionComment,
} from "../services/issue-completion-evidence-backfill.ts";

describe("issue completion evidence backfill helpers", () => {
  it("accepts substantive closeout comments and rejects boilerplate probes", () => {
    expect(isSubstantiveCompletionComment("## Done\n\n- Verified with `pnpm test`.\n- Attached the artifact packet and documentation evidence used for closure.\n- No push or deploy was required.")).toBe(true);
    expect(isSubstantiveCompletionComment("Post-restart bare done probe without completionEvidence.")).toBe(false);
    expect(isSubstantiveCompletionComment("Paperclip needs a disposition before this issue can continue.")).toBe(false);
  });

  it("prefers existing artifacts when they are already attached to the same issue", () => {
    const bundle = buildBackfillCompletionEvidenceBundle({
      substantiveComments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          body: "## Done\n\n- Verified with `pnpm test`.\n- Attached artifact evidence and docs for the original closeout.\n- No push or deploy was required.",
        },
      ],
      documentationDocuments: [{ id: "22222222-2222-4222-8222-222222222222", key: "evidence-backfill-audit" }],
      attachments: [{ id: "33333333-3333-4333-8333-333333333333" }],
      workProducts: [{ id: "44444444-4444-4444-8444-444444444444" }],
    });

    expect(bundle).toEqual(
      expect.objectContaining({
        summary: expect.stringContaining("Historical typed completionEvidence backfill"),
        testEvidence: expect.objectContaining({
          refs: expect.arrayContaining([expect.objectContaining({ kind: "comment" })]),
        }),
        documentationEvidence: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({ kind: "work_product" }),
            expect.objectContaining({ kind: "attachment" }),
            expect.objectContaining({ kind: "document" }),
          ]),
        }),
      }),
    );

    const commentOnlyBundle = buildBackfillCompletionEvidenceBundle({
      substantiveComments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          body: "## Done\n\n- Verified with `pnpm test`.\n- Attached artifact evidence and docs for the original closeout.\n- No push or deploy was required.",
        },
      ],
      documentationDocuments: [],
      attachments: [],
      workProducts: [],
    });

    expect(commentOnlyBundle).toBeNull();
  });

  it("falls back to same-issue comment refs when no documents, attachments, or work products exist", () => {
    const bundle = buildBackfillCompletionEvidenceBundle({
      substantiveComments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          body: "## Done\n\n- Verified with `pnpm test -- --runInBand`.\n- Reviewed the migration output and confirmed no follow-up DB repair was required.\n- No docs or artifacts were attached because the closeout was entirely in-thread.",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          body: "Follow-up verification note:\n\n- Rechecked the repaired rows directly in the issue thread.\n- Confirmed the same-issue closeout context is complete and no deploy impact exists.\n- No extra work products were needed for this repair.",
        },
      ],
      documentationDocuments: [],
      attachments: [],
      workProducts: [],
    });

    expect(bundle).toEqual(
      expect.objectContaining({
        testEvidence: expect.objectContaining({
          refs: expect.arrayContaining([expect.objectContaining({
            kind: "comment",
            id: "11111111-1111-4111-8111-111111111111",
          })]),
        }),
        reviewEvidence: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({
              kind: "comment",
              id: "11111111-1111-4111-8111-111111111111",
            }),
            expect.objectContaining({
              kind: "comment",
              id: "22222222-2222-4222-8222-222222222222",
            }),
          ]),
        }),
        documentationEvidence: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({
              kind: "comment",
              id: "11111111-1111-4111-8111-111111111111",
            }),
            expect.objectContaining({
              kind: "comment",
              id: "22222222-2222-4222-8222-222222222222",
            }),
          ]),
        }),
      }),
    );
  });
});
