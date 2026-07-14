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

  it("builds a typed bundle only when a substantive comment and inspectable artifact already exist", () => {
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

    expect(buildBackfillCompletionEvidenceBundle({
      substantiveComments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          body: "## Done\n\n- Verified with `pnpm test`.\n- Attached artifact evidence and docs for the original closeout.\n- No push or deploy was required.",
        },
      ],
      documentationDocuments: [],
      attachments: [],
      workProducts: [],
    })).toBeNull();
  });
});
