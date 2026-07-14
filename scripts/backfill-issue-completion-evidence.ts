import { createDb } from "../packages/db/src/index.js";
import { loadConfig } from "../server/src/config.js";
import {
  getCompletionEvidenceBackfillCounts,
  runIssueCompletionEvidenceBackfill,
} from "../server/src/services/issue-completion-evidence-backfill.js";

function parseFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const config = loadConfig();
  const dbUrl =
    process.env.DATABASE_URL?.trim()
    || config.databaseUrl
    || `postgres://paperclip:paperclip@127.0.0.1:${config.embeddedPostgresPort}/paperclip`;

  const companyId = parseFlag("--company") || process.env.PAPERCLIP_COMPANY_ID;
  if (!companyId) {
    throw new Error("Company id is required. Pass --company <company-id> or set PAPERCLIP_COMPANY_ID.");
  }

  const hoursValue = parseFlag("--hours");
  const limitValue = parseFlag("--limit");
  const hours = hoursValue ? Number(hoursValue) : 72;
  const limit = limitValue ? Number(limitValue) : undefined;
  if (!Number.isFinite(hours) || hours <= 0) throw new Error("--hours must be a positive number.");
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) throw new Error("--limit must be a positive number.");

  const db = createDb(dbUrl);
  const before = await getCompletionEvidenceBackfillCounts(db, companyId);
  const result = await runIssueCompletionEvidenceBackfill(db, {
    companyId,
    since: new Date(Date.now() - hours * 60 * 60 * 1000),
    limit,
    dryRun: hasFlag("--dry-run"),
    actorType: process.env.PAPERCLIP_AGENT_ID ? "agent" : "system",
    actorId: process.env.PAPERCLIP_AGENT_ID || "issue-completion-evidence-backfill",
    agentId: process.env.PAPERCLIP_AGENT_ID || null,
    runId: process.env.PAPERCLIP_RUN_ID || null,
  });
  const after = await getCompletionEvidenceBackfillCounts(db, companyId);

  console.log(JSON.stringify({
    companyId,
    hours,
    dryRun: hasFlag("--dry-run"),
    before,
    result: {
      scanned: result.scanned,
      repairedCount: result.repaired.length,
      repaired: result.repaired,
      skippedCount: result.skipped.length,
      skipped: result.skipped,
    },
    after,
  }, null, 2));
  process.exit(0);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Issue completionEvidence backfill failed: ${message}`);
  process.exitCode = 1;
});
