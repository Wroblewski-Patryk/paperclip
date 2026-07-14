import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  activityLog,
  assets,
  documents,
  issueAttachments,
  issueComments,
  issueDocuments,
  issues,
  issueWorkProducts,
} from "@paperclipai/db";
import {
  isSystemIssueDocumentKey,
  type IssueCompletionEvidenceBundle,
  type IssueCompletionEvidenceRef,
} from "@paperclipai/shared";

const PROOF_SIGNAL_PATTERN =
  /(`.+`|##\s*done|\b(done|verified|verification|validated|validation|test|tests|proof|evidence|artifact|attachment|work product|commit|docs?|documentation|smoke)\b)/i;

const COMMENT_TEST_SIGNAL_PATTERN =
  /(`[^`]+`|\b(test(?:ed|s|ing)?|verif(?:y|ied|ication)|validat(?:e|ed|ion)|smoke|check(?:ed|s)?|pass(?:ed|es)?|fail(?:ed|ure)?)\b)/i;
const COMMENT_REVIEW_SIGNAL_PATTERN =
  /\b(review(?:ed|s)?|inspect(?:ed|ion)?|approv(?:e|ed|al)|disposition|decision|accepted|rejected|no follow-up|follow-up (?:is )?required)\b/i;
const COMMENT_DOCUMENTATION_SIGNAL_PATTERN =
  /\b(docs?|documentation|document(?:ed|ation)?|runbook|readme|changelog|work product|artifact|no (?:additional |extra )?(?:docs?|documentation|artifacts?|work products?) (?:were |was )?(?:needed|required|necessary|added|attached))\b/i;
const HIGH_RISK_ISSUE_TITLE_PATTERN =
  /\b(production|deploy(?:ment)?|credential|secret|security|privacy|rollback|restart|coolify|vps|destructive)\b/i;

const BOILERPLATE_COMMENT_PATTERNS = [
  /^paperclip needs a disposition before this issue can continue\.$/i,
  /^paperclip could not resolve this issue's missing disposition automatically\./i,
  /^post-restart bare done probe without completionevidence\.$/i,
];

export type CompletionEvidenceBackfillSkipReason =
  | "already_has_completion_evidence"
  | "no_substantive_comment"
  | "insufficient_typed_evidence"
  | "high_risk_requires_manual_evidence";

export interface CompletionEvidenceBackfillIssueResult {
  issueId: string;
  identifier: string | null;
  title: string;
}

export interface CompletionEvidenceBackfillSkipResult extends CompletionEvidenceBackfillIssueResult {
  reason: CompletionEvidenceBackfillSkipReason;
}

export interface CompletionEvidenceBackfillRunResult {
  scanned: number;
  repaired: CompletionEvidenceBackfillIssueResult[];
  skipped: CompletionEvidenceBackfillSkipResult[];
}

export interface CompletionEvidenceBackfillCounts {
  doneWithoutProof24h: number;
  doneWithoutProof72h: number;
  doneWithProof72h: number;
}

interface BackfillIssueRow {
  id: string;
  companyId: string;
  identifier: string | null;
  title: string;
  completionEvidence: IssueCompletionEvidenceBundle | null;
}

interface EvidenceCommentRow {
  id: string;
  body: string;
}

interface EvidenceDocumentRow {
  id: string;
  key: string;
}

interface EvidenceAttachmentRow {
  id: string;
}

interface EvidenceWorkProductRow {
  id: string;
}

export interface RunIssueCompletionEvidenceBackfillOptions {
  companyId: string;
  since: Date;
  dryRun?: boolean;
  limit?: number;
  actorType?: "agent" | "user" | "system";
  actorId?: string;
  agentId?: string | null;
  runId?: string | null;
}

export async function getCompletionEvidenceBackfillCounts(
  db: Db,
  companyId: string,
): Promise<CompletionEvidenceBackfillCounts> {
  const now = Date.now();
  const window24h = new Date(now - 24 * 60 * 60 * 1000);
  const window72h = new Date(now - 72 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: issues.id,
      completedAt: issues.completedAt,
      completionEvidence: issues.completionEvidence,
    })
    .from(issues)
    .where(and(eq(issues.companyId, companyId), eq(issues.status, "done"), isNull(issues.hiddenAt)));

  let doneWithoutProof24h = 0;
  let doneWithoutProof72h = 0;
  let doneWithProof72h = 0;

  for (const row of rows) {
    const completedAt = row.completedAt instanceof Date ? row.completedAt : null;
    if (!completedAt) continue;
    const hasProof = !!row.completionEvidence;

    if (completedAt >= window24h && !hasProof) doneWithoutProof24h += 1;
    if (completedAt >= window72h && !hasProof) doneWithoutProof72h += 1;
    if (completedAt >= window72h && hasProof) doneWithProof72h += 1;
  }

  return {
    doneWithoutProof24h,
    doneWithoutProof72h,
    doneWithProof72h,
  };
}

export async function runIssueCompletionEvidenceBackfill(
  db: Db,
  options: RunIssueCompletionEvidenceBackfillOptions,
): Promise<CompletionEvidenceBackfillRunResult> {
  const issueRows = await db
    .select({
      id: issues.id,
      companyId: issues.companyId,
      identifier: issues.identifier,
      title: issues.title,
      completionEvidence: issues.completionEvidence,
    })
    .from(issues)
    .where(
      and(
        eq(issues.companyId, options.companyId),
        eq(issues.status, "done"),
        isNull(issues.hiddenAt),
        gte(issues.completedAt, options.since),
      ),
    )
    .orderBy(desc(issues.completedAt), asc(issues.id))
    .limit(options.limit ?? 500);

  const repaired: CompletionEvidenceBackfillIssueResult[] = [];
  const skipped: CompletionEvidenceBackfillSkipResult[] = [];

  for (const issue of issueRows) {
    if (issue.completionEvidence) {
      skipped.push({ ...baseIssueResult(issue), reason: "already_has_completion_evidence" });
      continue;
    }

    if (HIGH_RISK_ISSUE_TITLE_PATTERN.test(issue.title)) {
      skipped.push({ ...baseIssueResult(issue), reason: "high_risk_requires_manual_evidence" });
      continue;
    }

    const evidence = await loadIssueEvidence(db, issue.id);
    const bundle = buildBackfillCompletionEvidenceBundle(evidence);
    if (!bundle) {
      skipped.push({
        ...baseIssueResult(issue),
        reason: evidence.substantiveComments.length === 0
          ? "no_substantive_comment"
          : "insufficient_typed_evidence",
      });
      continue;
    }

    if (!options.dryRun) {
      await db.transaction(async (tx) => {
        await tx
          .update(issues)
          .set({
            completionEvidence: bundle,
            updatedAt: new Date(),
          })
          .where(eq(issues.id, issue.id));

        await tx.insert(activityLog).values({
          companyId: issue.companyId,
          actorType: options.actorType ?? "system",
          actorId: options.actorId ?? "issue-completion-evidence-backfill",
          action: "issue.completion_evidence_backfilled",
          entityType: "issue",
          entityId: issue.id,
          agentId: options.agentId ?? null,
          runId: options.runId ?? null,
          details: {
            strategy: hasInspectableIssueArtifact(evidence)
              ? "substantive_comment_plus_artifact"
              : "category_complete_closeout_comments",
            repairedBy: "issue-completion-evidence-backfill",
            refs: {
              commentIds: evidence.substantiveComments.map((comment) => comment.id),
              documentIds: evidence.documentationDocuments.map((document) => document.id),
              attachmentIds: evidence.attachments.map((attachment) => attachment.id),
              workProductIds: evidence.workProducts.map((workProduct) => workProduct.id),
            },
          },
        });
      });
    }

    repaired.push(baseIssueResult(issue));
  }

  return {
    scanned: issueRows.length,
    repaired,
    skipped,
  };
}

function baseIssueResult(issue: BackfillIssueRow): CompletionEvidenceBackfillIssueResult {
  return {
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
  };
}

export function isSubstantiveCompletionComment(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < 80) return false;
  if (BOILERPLATE_COMMENT_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  return PROOF_SIGNAL_PATTERN.test(trimmed);
}

async function loadIssueEvidence(db: Db, issueId: string) {
  const [comments, rawDocuments, attachments, workProducts] = await Promise.all([
    db
      .select({
        id: issueComments.id,
        body: issueComments.body,
      })
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
      .orderBy(desc(issueComments.createdAt), desc(issueComments.id)),
    db
      .select({
        id: documents.id,
        key: issueDocuments.key,
      })
      .from(issueDocuments)
      .innerJoin(documents, eq(documents.id, issueDocuments.documentId))
      .where(eq(issueDocuments.issueId, issueId))
      .orderBy(asc(issueDocuments.key), desc(documents.updatedAt)),
    db
      .select({
        id: issueAttachments.id,
      })
      .from(issueAttachments)
      .innerJoin(assets, eq(assets.id, issueAttachments.assetId))
      .where(eq(issueAttachments.issueId, issueId))
      .orderBy(desc(issueAttachments.createdAt), desc(issueAttachments.id)),
    db
      .select({
        id: issueWorkProducts.id,
      })
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.issueId, issueId))
      .orderBy(desc(issueWorkProducts.updatedAt), desc(issueWorkProducts.id)),
  ]);

  return {
    substantiveComments: comments.filter((comment) => isSubstantiveCompletionComment(comment.body)),
    documentationDocuments: rawDocuments.filter((document) => !isSystemIssueDocumentKey(document.key)),
    attachments,
    workProducts,
  };
}

export function buildBackfillCompletionEvidenceBundle(evidence: {
  substantiveComments: EvidenceCommentRow[];
  documentationDocuments: EvidenceDocumentRow[];
  attachments: EvidenceAttachmentRow[];
  workProducts: EvidenceWorkProductRow[];
}): IssueCompletionEvidenceBundle | null {
  if (evidence.substantiveComments.length === 0) return null;

  const hasInspectableArtifact = hasInspectableIssueArtifact(evidence);
  const combinedCommentBody = evidence.substantiveComments
    .map((comment) => comment.body)
    .join("\n\n");
  const hasCompleteCommentOnlyEvidence =
    COMMENT_TEST_SIGNAL_PATTERN.test(combinedCommentBody)
    && COMMENT_REVIEW_SIGNAL_PATTERN.test(combinedCommentBody)
    && COMMENT_DOCUMENTATION_SIGNAL_PATTERN.test(combinedCommentBody);

  if (!hasInspectableArtifact && !hasCompleteCommentOnlyEvidence) return null;

  const commentRefs = evidence.substantiveComments
    .map((comment, index) => evidenceRef(
      "comment",
      comment.id,
      index === 0 ? "Existing closeout comment" : "Existing supporting comment",
    ))
    .slice(0, 5);
  const documentationRefs = [
    ...evidence.workProducts.map((workProduct) => evidenceRef("work_product", workProduct.id, "Existing work product")),
    ...evidence.attachments.map((attachment) => evidenceRef("attachment", attachment.id, "Existing attachment")),
    ...evidence.documentationDocuments.map((document) => evidenceRef("document", document.id, "Existing document")),
    ...(hasInspectableArtifact ? [] : commentRefs),
  ].slice(0, 5);

  if (documentationRefs.length === 0) return null;

  const closeoutCommentRef = commentRefs[0];
  const secondaryCommentRef = commentRefs[1] ?? null;

  const testRefs = [closeoutCommentRef, documentationRefs[0]].filter((ref, index, refs) => ref && refs.findIndex((item) => item?.kind === ref.kind && "id" in item! && "id" in ref ? item.id === ref.id : false) === index) as IssueCompletionEvidenceRef[];
  const reviewRefs = secondaryCommentRef ? [closeoutCommentRef, secondaryCommentRef] : [closeoutCommentRef];

  return {
    summary: "Historical typed completionEvidence backfill from pre-existing same-issue proof. No new proof artifacts were created by this repair.",
    riskLevel: "standard",
    testEvidence: {
      summary: "Existing closeout comments and attached issue evidence record the verification that supported the original done disposition.",
      refs: testRefs,
    },
    reviewEvidence: {
      summary: "Existing same-issue closeout thread records the terminal review and disposition context.",
      refs: reviewRefs,
    },
    documentationEvidence: {
      summary: hasInspectableArtifact
        ? "Pre-existing Paperclip-visible issue artifacts or documents preserve the deliverable and closure packet for this issue."
        : "Existing same-issue closeout comments explicitly record the documentation outcome or explain why no additional documentation artifact was required.",
      refs: documentationRefs,
    },
  };
}

function hasInspectableIssueArtifact(evidence: {
  documentationDocuments: EvidenceDocumentRow[];
  attachments: EvidenceAttachmentRow[];
  workProducts: EvidenceWorkProductRow[];
}): boolean {
  return evidence.documentationDocuments.length > 0
    || evidence.attachments.length > 0
    || evidence.workProducts.length > 0;
}

function evidenceRef(
  kind: "comment" | "document" | "attachment" | "work_product",
  id: string,
  label: string,
): IssueCompletionEvidenceRef {
  return { kind, id, label };
}
