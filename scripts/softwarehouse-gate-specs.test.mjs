import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { rootBlockerIdentifierFor } from "./lib/issue-blockers.mjs";
import { resolveIssuesByIdentifier } from "./lib/issue-discovery.mjs";
import { gateFreshnessObservation } from "./lib/gate-freshness.mjs";
import { secretForKey, uniqueSecretsForKeys } from "./lib/secret-aliases.mjs";
import { autonomyDispositionForMode, controlActionSummaryFor, controlActionTypeFor, deliveryPermissionForMode, gateBriefFor, staleGateOwnerActionLine } from "./lib/softwarehouse-control-brief.mjs";
import { softwarehouseGateSpecs, softwarehouseGateSpecsByRootBlocker } from "./lib/softwarehouse-gates.mjs";

const requiredFields = [
  "project",
  "rootBlocker",
  "owner",
  "purpose",
  "approvalPurpose",
  "allowedAction",
  "forbiddenAction",
  "evidenceRequired",
  "operatorPrompt",
  "approvalDryRunCommand",
  "approvalApplyCommand",
  "recheckHandoff",
  "resumeComment",
];

test("softwarehouse gate specs are complete and keyed by root blocker", () => {
  assert.equal(softwarehouseGateSpecs.length, 3);
  assert.deepEqual(
    softwarehouseGateSpecs.map((spec) => spec.rootBlocker).sort(),
    ["LUC-30", "LUC-31", "LUC-32"],
  );
  assert.equal(softwarehouseGateSpecsByRootBlocker.size, softwarehouseGateSpecs.length);

  for (const spec of softwarehouseGateSpecs) {
    for (const field of requiredFields) {
      assert.equal(typeof spec[field], "string", `${spec.rootBlocker}.${field} must be a string`);
      assert.ok(spec[field].trim(), `${spec.rootBlocker}.${field} must not be empty`);
    }
    assert.ok(Array.isArray(spec.acceptedFreshFacts), `${spec.rootBlocker}.acceptedFreshFacts must be an array`);
    assert.ok(spec.acceptedFreshFacts.length >= 2, `${spec.rootBlocker}.acceptedFreshFacts needs useful operator facts`);
    assert.ok(Array.isArray(spec.secretKeys), `${spec.rootBlocker}.secretKeys must be an array`);
    assert.ok(spec.secretKeys.length > 0, `${spec.rootBlocker}.secretKeys must not be empty`);
    assert.ok(spec.approvalDryRunCommand.includes(`--gate=${spec.rootBlocker}`));
    assert.ok(spec.approvalApplyCommand.includes(`--gate=${spec.rootBlocker}`));
    assert.ok(spec.approvalApplyCommand.includes("--apply"));
  }
});

test("execution scripts import the canonical gate specs", async () => {
  const scripts = [
    "scripts/audit-luckysparrow-softwarehouse.mjs",
    "scripts/configure-gate-freshness-watcher.mjs",
    "scripts/export-softwarehouse-unblock-packet.mjs",
    "scripts/record-softwarehouse-gate-approval.mjs",
    "scripts/repair-runtime-binding-assignees.mjs",
    "scripts/run-autonomy-governor.mjs",
    "scripts/run-blocked-root-guardrail.mjs",
    "scripts/run-gate-freshness-watcher.mjs",
    "scripts/run-live-run-janitor.mjs",
    "scripts/run-safe-nonproduction-lane-seeder.mjs",
    "scripts/run-stale-gate-owner-escalation.mjs",
  ];

  for (const scriptPath of scripts) {
    const source = await readFile(scriptPath, "utf8");
    assert.match(
      source,
      /from "\.\/lib\/softwarehouse-gates\.mjs"/,
      `${scriptPath} must import the canonical gate specs`,
    );
  }
});

test("live-run janitor protects Paperclip OS closure lanes from ordinary duplicate cleanup", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /operatingSourceControlClosureTitlePrefix = "\[Softwarehouse\]\[OS Closure\]"/);
  assert.match(source, /function isOperatingSourceControlClosureIssue/);
  assert.match(source, /function isIssueExecutionLockedToRun/);
  assert.match(source, /function runSortRank/);
  assert.match(source, /if \(isOperatingSourceControlClosureIssue\(issue\) && isIssueExecutionLockedToRun\(issue, run\)\) return false;/);
});

test("live-run janitor does not close fresh autonomy governor runs", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /function isGovernorSelfSupervision\(issue, run\)/);
  assert.match(source, /ageMs\(run\?\.lastOutputAt \?\? run\?\.startedAt \?\? run\?\.createdAt\) >= minTailAgeMs/);
  assert.match(source, /isGovernorSelfSupervision\(issue, run\)/);
});

test("live-run janitor prefers productive runs over blocked or terminal tails", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /if \(issue\.status === "in_progress"\) return 10;/);
  assert.match(source, /if \(isRunnableIssueWithLiveRun\(issue\)\) return 20;/);
  assert.match(source, /if \(issue\.status === "blocked"\) return 80;/);
  assert.match(source, /if \(terminalStatuses\.has\(issue\.status\)\) return 90;/);
});

test("live-run janitor cancels duplicate owner runs that have no issue row", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /"cancel_duplicate_owner_orphan_run"/);
  assert.match(source, /if \(!issue\) \{/);
  assert.match(source, /kind: "cancel_duplicate_owner_orphan_run"/);
  assert.match(source, /issueId: duplicateRun\.issueId \?\? null/);
});

test("live-run janitor treats blocked duplicate owner runs as safe duplicate cleanup", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.doesNotMatch(source, /terminalStatuses\.has\(issue\.status\) \|\| issue\.status === "blocked"/);
  assert.match(source, /if \(terminalStatuses\.has\(issue\.status\)\) continue;/);
  assert.match(source, /kind: "cancel_duplicate_owner_run"/);
  assert.match(source, /status: "blocked"/);
  assert.match(source, /action\.issueStatus === "blocked"/);
  assert.match(source, /Skipped duplicate-run bookkeeping comment to avoid waking a blocked duplicate lane/);
});

test("live-run janitor does not let orphan direct wakes outrank issue-bound recovery", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /if \(!issue\) return 95;/);
  assert.match(source, /if \(issue\.status === "blocked"\) return 80;/);
});

test("live-run janitor skips cross-boundary closed-tail comments without retrying", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /function isIssueAuthorizationBoundaryError\(error\)/);
  assert.match(source, /Issue is outside this actor\(\?:'\|\\\\u0027\)s authorization boundary/);
  assert.match(source, /POST"\s*,\s*`\/api\/issues\/\$\{action\.issueId\}\/comments`/);
  assert.match(source, /skippedReason: "issue_authorization_boundary"/);
  assert.match(source, /ownerAction: "Route this closed-tail comment through the owning issue actor; do not retry the mutation from this agent\."/);
  assert.doesNotMatch(source, /if \(isIssueAuthorizationBoundaryError\(error\)\)[\s\S]{0,280}request\("POST", `\/api\/issues\/\$\{action\.issueId\}\/comments`/);
});

test("longevity doctor maps current live runs through issue lock columns", async () => {
  const source = await readFile("scripts/run-softwarehouse-longevity-doctor.mjs", "utf8");

  assert.match(source, /const issueByExecutionRunId = new Map/);
  assert.match(source, /issue\.executionRunId/);
  assert.match(source, /issue\.checkoutRunId/);
  assert.match(source, /function issueForLiveRun\(run\)/);
  assert.match(source, /issueByExecutionRunId\.get\(run\.id\)/);
  assert.match(source, /run\.issueId \?\? issueByExecutionRunId\.get\(run\.id\)\?\.id/);
});

test("longevity scripts use resilient issue pagination and retry defaults", async () => {
  const snapshot = await readFile("scripts/export-softwarehouse-longevity-snapshot.mjs", "utf8");
  const doctor = await readFile("scripts/run-softwarehouse-longevity-doctor.mjs", "utf8");

  for (const source of [snapshot, doctor]) {
    assert.match(source, /SOFTWAREHOUSE_LONGEVITY_REQUEST_TIMEOUT_MS \?\? 60_000/);
    assert.match(source, /SOFTWAREHOUSE_LONGEVITY_ISSUE_PAGE_SIZE \?\? 500/);
    assert.match(source, /SOFTWAREHOUSE_LONGEVITY_REQUEST_RETRIES \?\? 2/);
    assert.match(source, /error\?\.name === "AbortError" \|\| error\?\.status === 429 \|\| error\?\.status >= 500/);
    assert.match(source, /requestRetryBaseDelayMs \* \(attempt \+ 1\)/);
  }

  assert.match(snapshot, /async function requestAllPages\(route, \{ limit = issuePageSize \} = \{\}\)/);
  assert.match(snapshot, /SOFTWAREHOUSE_LONGEVITY_MAX_ISSUE_DETAILS \?\? 2_000/);
  assert.match(snapshot, /const activeIssueStatuses = \(process\.env\.SOFTWAREHOUSE_LONGEVITY_ISSUE_STATUSES/);
  assert.match(snapshot, /async function requestBoundedPages/);
  assert.match(snapshot, /issues\?status=\$\{activeIssueStatuses\.join\(","\)\}&sortField=updated&sortDir=desc/);
  assert.match(snapshot, /issueExport:/);
  assert.match(snapshot, /Issue details were capped for bounded longevity export/);
  assert.match(doctor, /async function requestAllPages\(route, \{ limit = issuePageSize \} = \{\}\)/);
  assert.match(doctor, /const activeIssueStatuses = \["backlog", "todo", "in_progress", "in_review", "blocked"\]/);
  assert.match(doctor, /requestAllPages\(`\/api\/companies\/\$\{company\.id\}\/issues\?status=\$\{activeIssueStatuses\.join\(","\)\}`\)/);
  assert.doesNotMatch(doctor, /issues\?limit=2000/);
});

test("longevity doctor gives snapshot export enough time for large local instances", async () => {
  const doctor = await readFile("scripts/run-softwarehouse-longevity-doctor.mjs", "utf8");

  assert.match(doctor, /SOFTWAREHOUSE_LONGEVITY_CHILD_TIMEOUT_MS \?\? 300_000/);
});

test("longevity watchdog covers autonomous softwarehouse contract checks", async () => {
  const doctor = await readFile("scripts/run-softwarehouse-longevity-doctor.mjs", "utf8");
  const configurator = await readFile("scripts/configure-softwarehouse-longevity-routines.mjs", "utf8");

  assert.match(doctor, /SOFTWAREHOUSE_LONGEVITY_GOVERNANCE_CHILD_TIMEOUT_MS \?\? 180_000/);
  assert.match(doctor, /SOFTWAREHOUSE_LONGEVITY_SKIP_HEAVY_GOVERNANCE_CHECKS !== "true"/);
  assert.match(doctor, /SOFTWAREHOUSE_LONGEVITY_RUN_CONTROL_TICK === "true"/);
  assert.match(doctor, /softwarehouse_operating_docs/);
  assert.match(doctor, /validate-softwarehouse-operating-docs\.mjs/);
  assert.match(doctor, /softwarehouse_autonomy_audit/);
  assert.match(doctor, /audit-luckysparrow-softwarehouse\.mjs/);
  assert.match(doctor, /coolify_runtime_access/);
  assert.match(doctor, /run-coolify-production-reconciler\.mjs/);
  assert.match(doctor, /project_truth_indexes/);
  assert.match(doctor, /check-project-truth-indexes\.mjs/);
  assert.match(doctor, /softwarehouse_gate_specs/);
  assert.match(doctor, /softwarehouse:test-gates/);
  assert.match(doctor, /softwarehouse_control_tick/);
  assert.match(doctor, /Softwarehouse Checks/);
  assert.match(doctor, /Repair Actions/);
  assert.match(doctor, /\[Softwarehouse\]\[Longevity Watchdog\] Repair autonomous softwarehouse control gaps/);
  assert.match(doctor, /updated_existing_repair_issue/);
  assert.match(doctor, /created_repair_issue/);
  assert.match(doctor, /requestJson\("POST", `\/api\/issues\/\$\{existingRepairIssue\.id\}\/comments`/);
  assert.match(doctor, /requestJson\("POST", `\/api\/companies\/\$\{company\.id\}\/issues`/);
  assert.match(doctor, /runtimeBindingGaps/);
  assert.match(doctor, /loadedSecretKeys/);

  assert.match(configurator, /operating docs\/ADR\/evidence-map/);
  assert.match(configurator, /softwarehouse autonomy audit/);
  assert.match(configurator, /Coolify runtime access/);
  assert.match(configurator, /project-truth indexes/);
  assert.match(configurator, /policy gate specs/);
  assert.match(configurator, /agent operating records/);
  assert.match(configurator, /task\/run\/event evidence/);
  assert.match(configurator, /QA\/security\/docs gates/);
  assert.match(configurator, /supervisor review/);
  assert.match(configurator, /deployment monitoring/);
  assert.match(configurator, /process-improvement loops/);
});

test("heartbeat scheduler gates codex_local starts on provider quota pressure", async () => {
  const source = await readFile("server/src/services/heartbeat.ts", "utf8");
  const instanceTypes = await readFile("packages/shared/src/types/instance.ts", "utf8");

  assert.match(source, /PAPERCLIP_CODEX_LOCAL_QUOTA_HOLD_USED_PERCENT/);
  assert.match(source, /DEFAULT_CODEX_LOCAL_QUOTA_SHORT_WINDOW_HOLD_USED_PERCENT/);
  assert.match(instanceTypes, /DEFAULT_CODEX_LOCAL_QUOTA_SHORT_WINDOW_HOLD_USED_PERCENT = 75/);
  assert.match(source, /PAPERCLIP_CODEX_LOCAL_QUOTA_LONG_WINDOW_HOLD_USED_PERCENT/);
  assert.match(source, /DEFAULT_CODEX_LOCAL_QUOTA_LONG_WINDOW_HOLD_USED_PERCENT/);
  assert.match(instanceTypes, /DEFAULT_CODEX_LOCAL_QUOTA_LONG_WINDOW_HOLD_USED_PERCENT = 90/);
  assert.match(source, /PAPERCLIP_CODEX_LOCAL_QUOTA_SHORT_WINDOW_MAX_MS/);
  assert.match(source, /function isShortQuotaWindow/);
  assert.match(source, /function quotaHoldThresholdForWindow/);
  assert.match(source, /PAPERCLIP_CODEX_LOCAL_QUOTA_RETRY_SPACING_MS/);
  assert.match(source, /CODEX_LOCAL_PROVIDER_QUOTA_CACHE_MS/);
  assert.match(source, /function buildProviderQuotaStartBlock/);
  assert.match(source, /adapterType !== "codex_local"/);
  assert.match(source, /adapter\.getQuotaWindows/);
  assert.match(source, /provider_quota_hold/);
  assert.match(source, /scheduledRetryReason: "provider_quota_hold"/);
  assert.match(source, /status: "scheduled_retry"/);
  assert.match(source, /deferred_issue_execution/);
  assert.match(source, /providerQuotaHold/);
});

test("dashboard surfaces provider quota separately from dollar spend", async () => {
  const source = await readFile("ui/src/pages/Dashboard.tsx", "utf8");
  const dashboardService = await readFile("server/src/services/dashboard.ts", "utf8");
  const dashboardTypes = await readFile("packages/shared/src/types/dashboard.ts", "utf8");

  assert.match(source, /costsApi\.quotaWindows/);
  assert.match(source, /queryKeys\.usageQuotaWindows/);
  assert.match(source, /Provider Quota/);
  assert.match(source, /Month Spend/);
  assert.match(source, /formatCents\(data\.costs\.monthSpendCents\)/);
  assert.match(source, /subscriptionMonthlyBudgetCents/);
  assert.match(source, /subscriptionPlanLabel/);
  assert.match(dashboardService, /reportedMonthSpendCents/);
  assert.match(dashboardTypes, /reportedMonthSpendCents/);
});

test("local Codex subscription quota is converted into effective plan spend", async () => {
  const helper = await readFile("server/src/services/effective-subscription-cost.ts", "utf8");
  const costs = await readFile("server/src/services/costs.ts", "utf8");
  const dashboard = await readFile("server/src/services/dashboard.ts", "utf8");
  const costsPage = await readFile("ui/src/pages/Costs.tsx", "utf8");
  const billerCard = await readFile("ui/src/components/BillerSpendCard.tsx", "utf8");

  assert.match(helper, /DEFAULT_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS = 20_000/);
  assert.match(helper, /PAPERCLIP_CODEX_LOCAL_SUBSCRIPTION_BUDGET_CENTS/);
  assert.match(helper, /estimateCodexLocalSubscriptionCost/);
  assert.match(costs, /reportedSpendCents/);
  assert.match(costs, /subscriptionSpendCents/);
  assert.match(dashboard, /subscriptionMonthSpendCents/);
  assert.match(costsPage, /hasSubscriptionEstimate/);
  assert.match(costsPage, /Plan quota ledger/);
  assert.match(costsPage, /plan share estimate/);
  assert.match(billerCard, /Plan usage/);
});

test("budget policies can govern effective local Codex plan usage separately from API billing", async () => {
  const constants = await readFile("packages/shared/src/constants.ts", "utf8");
    const budgets = await readFile("server/src/services/budgets.ts", "utf8");
    const costsPage = await readFile("ui/src/pages/Costs.tsx", "utf8");
    const card = await readFile("ui/src/components/BudgetPolicyCard.tsx", "utf8");
    const configurator = await readFile("scripts/configure-effective-plan-budgets.mjs", "utf8");

  assert.match(constants, /"effective_plan_cents"/);
  assert.match(budgets, /computeEffectivePlanObservedAmount/);
  assert.match(budgets, /subscription_included/);
    assert.match(budgets, /estimateCodexLocalSubscriptionCost/);
    assert.match(budgets, /policy\.metric === "billed_cents"/);
    assert.match(costsPage, /metric: BudgetPolicySummary\["metric"\]/);
    assert.match(costsPage, /metric: input\.metric/);
    assert.match(card, /Effective plan usage/);
    assert.match(card, /Metered API spend/);
  assert.match(configurator, /PAPERCLIP_EFFECTIVE_PLAN_AGENT_BUFFER/);
  assert.match(configurator, /--apply/);
});

test("softwarehouse model and cost readiness audit guards quota and future API lanes", async () => {
  const source = await readFile("scripts/audit-softwarehouse-model-cost-readiness.mjs", "utf8");
  const roster = await readFile("softwarehouse/agent-roster.json", "utf8");

  assert.match(source, /quotaHoldPercent/);
  assert.match(source, /cheapEqualsPrimaryCount/);
  assert.match(source, /metadata\?\.modelLane === "fastTriage"/);
  assert.match(source, /openAiApiKeyConfiguredCount/);
  assert.match(source, /api_metering_unverified/);
  assert.match(source, /summarizeErrorAgentRuns/);
  assert.match(source, /agent_error_status_quota_retry/);
  assert.match(source, /recent_invalid_openai_api_key_failures/);
  assert.match(roster, /"fastTriage"[\s\S]*"model": "gpt-5\.4"/);
  assert.match(roster, /"fastMode": true/);
});

test("softwarehouse runtime file-state audit protects active agent instruction bundles", async () => {
  const source = await readFile("scripts/audit-softwarehouse-runtime-file-state.mjs", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(
    packageJson.scripts["softwarehouse:runtime-file-state-audit"],
    "node scripts/audit-softwarehouse-runtime-file-state.mjs",
  );
  assert.match(source, /instructionsRootPath/);
  assert.match(source, /instructionsFilePath/);
  assert.match(source, /repoRuntimeMirrorRoot/);
  assert.match(source, /collectPathReferences/);
  assert.match(source, /managedCodexAuthPath/);
  assert.match(source, /managed_codex_auth_placeholder_secret/);
  assert.match(source, /agent_config_path_missing/);
  assert.match(source, /agent_instructions_entry_missing/);
  assert.match(source, /agent_runtime_mirror_entry_missing/);
});

test("softwarehouse agent instruction audit guards persona richness and duplicate bundles", async () => {
  const source = await readFile("scripts/audit-softwarehouse-agent-instructions.mjs", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const docs = await readFile("docs/softwarehouse-agent-instruction-audit.md", "utf8");

  assert.equal(
    packageJson.scripts["softwarehouse:agent-instructions-audit"],
    "node scripts/audit-softwarehouse-agent-instructions.mjs",
  );
  assert.match(source, /signalChecks/);
  assert.match(source, /persona/);
  assert.match(source, /scope/);
  assert.match(source, /evidence/);
  assert.match(source, /safety/);
  assert.match(source, /model/);
  assert.match(source, /hierarchy/);
  assert.match(source, /agent_instruction_bundle_duplicate/);
  assert.match(source, /frontMatterHasName/);
  assert.match(source, /mirrorCompanyAgentsRoot/);
  assert.match(docs, /per agent/i);
  assert.match(docs, /personas\/` index/);
});

test("learning loop scopes active issues and bounds API requests for large local instances", async () => {
  const source = await readFile("scripts/run-softwarehouse-learning-loop.mjs", "utf8");

  assert.match(source, /const requestTimeoutMs = Number\(process\.env\.SOFTWAREHOUSE_LEARNING_REQUEST_TIMEOUT_MS \?\? 30_000\)/);
  assert.match(source, /const maxBlockedGroups = Number\(process\.env\.SOFTWAREHOUSE_LEARNING_MAX_BLOCKED_GROUPS \?\? 2\)/);
  assert.match(source, /const maxEnrichmentSourceIssues = Number\(process\.env\.SOFTWAREHOUSE_LEARNING_MAX_ENRICHMENT_SOURCE_ISSUES \?\? 25\)/);
  assert.match(source, /const activeIssueStatuses = \["backlog", "todo", "in_progress", "in_review", "blocked"\]/);
  assert.match(source, /AbortSignal\.timeout\(requestTimeoutMs\)/);
  assert.match(source, /issues\?status=\$\{activeIssueStatuses\.join\(","\)\}&limit=2000/);
  assert.match(source, /const processedBlockedGroups = maxBlockedGroups > 0\s+\? eligibleBlockedGroups\.slice\(0, maxBlockedGroups\)/);
  assert.match(source, /skippedBlockedGroupCount/);
  assert.match(source, /gap\.area === "ops-release"\s+&& \(groupedIssues\.length <= maxEnrichmentSourceIssues \|\| blockerAttentionGroup\)/);
  assert.match(source, /enrichedIssues = await enrichIssuesForBlockerChain\(issues, key, groupedIssues\)/);
  assert.match(source, /sourceIssues: enrichedGroupedIssues/);
  assert.doesNotMatch(source, /issues\?limit=2000/);
});

test("run disposition enforcer scopes stale issues and has bounded detail reads", async () => {
  const source = await readFile("scripts/run-run-disposition-enforcer.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /const requestTimeoutMs = Number\(process\.env\.SOFTWAREHOUSE_RUN_DISPOSITION_REQUEST_TIMEOUT_MS \?\? 30_000\)/);
  assert.match(source, /const candidateConcurrency = Number\(process\.env\.SOFTWAREHOUSE_RUN_DISPOSITION_CONCURRENCY \?\? 8\)/);
  assert.match(source, /const staleStatusList = \[\.\.\.staleStatuses\]/);
  assert.match(source, /requestJson\(\{/);
  assert.match(source, /function request\(method, route, body\)/);
  assert.match(source, /issues\?status=\$\{staleStatusList\.join\(","\)\}&limit=2000/);
  assert.match(source, /candidateScanStatus = isRequestTimeoutError\(error\) \? "timed_out" : "api_error"/);
  assert.match(source, /skip_run_disposition_enforcer/);
  assert.match(source, /candidateScanStatus/);
  assert.match(source, /mapWithConcurrency\(candidateIssues, candidateConcurrency/);
  assert.match(source, /candidateIssueCount/);
  assert.doesNotMatch(source, /issues\?limit=2000/);

  assert.match(controlTick, /SOFTWAREHOUSE_CONTROL_TICK_RUN_DISPOSITION_ENFORCER_TIMEOUT_MS \?\? 120_000/);
  assert.match(controlTick, /name: "runDispositionEnforcer",\s+command: \["scripts\/run-run-disposition-enforcer\.mjs", "--apply"\],\s+timeoutMs: runDispositionEnforcerStepTimeoutMs/);
  assert.match(controlTick, /candidateIssueCount: data\.candidateIssueCount \?\? null/);
});

test("final disposition janitor scopes open issues and paginates candidate scan", async () => {
  const source = await readFile("scripts/run-final-disposition-janitor.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /FINAL_DISPOSITION_JANITOR_REQUEST_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /FINAL_DISPOSITION_JANITOR_ISSUE_PAGE_SIZE \?\? 500/);
  assert.match(source, /FINAL_DISPOSITION_JANITOR_CONCURRENCY \?\? 8/);
  assert.match(source, /const candidateStatuses = new Set\(\["in_progress", "in_review"\]\)/);
  assert.match(source, /const candidateStatusList = \[\.\.\.candidateStatuses\]/);
  assert.match(source, /async function requestAllPages/);
  assert.match(source, /async function mapWithConcurrency/);
  assert.match(source, /issues\?status=\$\{candidateStatusList\.join\(","\)\}/);
  assert.match(source, /candidateIssueCount: candidateIssues\.length/);
  assert.match(source, /candidateScanStatus: "ok"/);
  assert.match(source, /reason: isRequestTimeoutError\(commentsResult\.error\) \? "comments_timeout" : "comments_read_failed"/);
  assert.match(source, /mapWithConcurrency\(candidateIssues, candidateConcurrency/);
  assert.doesNotMatch(source, /issues\?limit=2000/);

  assert.match(controlTick, /candidateScanStatus: data\.candidateScanStatus \?\? null/);
  assert.match(controlTick, /candidateIssueCount: data\.candidateIssueCount \?\? null/);
  assert.match(controlTick, /skippedCount: Array\.isArray\(data\.skipped\) \? data\.skipped\.length : 0/);
});

test("unblock packet scopes issue scans and resolves canonical gate roots directly", async () => {
  const source = await readFile("scripts/export-softwarehouse-unblock-packet.mjs", "utf8");

  assert.match(source, /resolveIssuesByIdentifier/);
  assert.match(source, /SOFTWAREHOUSE_UNBLOCK_PACKET_ISSUE_PAGE_SIZE \?\? 500/);
  assert.match(source, /const activeIssueStatuses = \["backlog", "todo", "in_progress", "in_review", "blocked"\]/);
  assert.match(source, /async function requestAllPages/);
  assert.match(source, /issues\?status=\$\{activeIssueStatuses\.join\(","\)\}/);
  assert.match(source, /identifiers: gateSpecs\.map\(\(spec\) => spec\.rootBlocker\)/);
  assert.doesNotMatch(source, /issues\?limit=1000/);
});

test("unblock packet writes a fresh degraded packet for board-only secret metadata", async () => {
  const source = await readFile("scripts/export-softwarehouse-unblock-packet.mjs", "utf8");

  assert.match(source, /function skippedOperatingDecision/);
  assert.match(source, /board-access-required secret metadata gap/);
  assert.match(source, /candidate-scan timeout/);
  assert.match(source, /await writePacketFiles\(packet\);\s+console\.log\(JSON\.stringify\(\{/);
  assert.match(source, /"docs\/status\/softwarehouse-unblock-packet\.md"/);
  assert.doesNotMatch(source, /Unblock packet refresh skipped because the local Paperclip API scan timed out/);
});

test("blocked triage starter scopes issue scans and has a dedicated timeout", async () => {
  const source = await readFile("scripts/run-blocked-triage-lane-starter.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /const requestTimeoutMs = Number\(process\.env\.SOFTWAREHOUSE_BLOCKED_TRIAGE_REQUEST_TIMEOUT_MS \?\? 30_000\)/);
  assert.match(source, /const activeIssueStatuses = \["backlog", "todo", "in_progress", "in_review", "blocked"\]/);
  assert.match(source, /const terminalIssueStatuses = \["done", "cancelled"\]/);
  assert.match(source, /AbortSignal\.timeout\(requestTimeoutMs\)/);
  assert.match(source, /function isRequestTimeoutError\(error\)/);
  assert.match(source, /candidateScanStatus: "timed_out"/);
  assert.match(source, /skip_blocked_triage_candidate_scan_timeout/);
  assert.match(source, /issues\?status=\$\{activeIssueStatuses\.join\(","\)\}&limit=2000/);
  assert.match(source, /issues\?status=\$\{terminalIssueStatuses\.join\(","\)\}&q=\$\{encodeURIComponent\(triageTitlePrefix\)\}&limit=500/);
  assert.match(source, /activeIssueCount/);
  assert.match(source, /terminalTriageIssueCount/);
  assert.match(source, /candidateScanStatus: "ok"/);
  assert.match(source, /decision: "not_checked_active_run_guard"/);
  assert.match(source, /governorDecision = await readGovernorDecision\(\)/);
  assert.doesNotMatch(source, /liveRuns, governorDecision\] = await Promise\.all/);
  assert.doesNotMatch(source, /issues\?limit=1000/);

  assert.match(controlTick, /SOFTWAREHOUSE_CONTROL_TICK_BLOCKED_TRIAGE_LANE_STARTER_TIMEOUT_MS \?\? 300_000/);
  assert.match(controlTick, /name: "blockedTriageLaneStarter",\s+command: \["scripts\/run-blocked-triage-lane-starter\.mjs", "--apply"\],\s+timeoutMs: blockedTriageLaneStarterStepTimeoutMs/);
  assert.match(controlTick, /activeIssueCount: data\.activeIssueCount \?\? null/);
  assert.match(controlTick, /terminalTriageIssueCount: data\.terminalTriageIssueCount \?\? null/);
});

test("learning loop degrades candidate scan timeouts into reportable actions", async () => {
  const source = await readFile("scripts/run-softwarehouse-learning-loop.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /const requestTimeoutMs = Number\(process\.env\.SOFTWAREHOUSE_LEARNING_REQUEST_TIMEOUT_MS \?\? 30_000\)/);
  assert.match(source, /function isRequestTimeoutError\(error\)/);
  assert.match(source, /candidateScanStatus: "timed_out"/);
  assert.match(source, /skip_learning_loop_candidate_scan_timeout/);
  assert.match(source, /Restore local Paperclip API issue-list responsiveness/);
  assert.match(controlTick, /candidateScanStatus: data\.candidateScanStatus \?\? null/);
});

test("in-review decision path degrades candidate scan timeouts into reportable actions", async () => {
  const source = await readFile("scripts/run-in-review-decision-path.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_IN_REVIEW_DECISION_PATH_REQUEST_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /AbortSignal\.timeout\(requestTimeoutMs\)/);
  assert.match(source, /function isRequestTimeoutError\(error\)/);
  assert.match(source, /hasPendingIssueApproval\(approvals\)/);
  assert.match(source, /suppressed_pending_issue_approval/);
  assert.match(source, /candidateScanStatus: "timed_out"/);
  assert.match(source, /skip_in_review_decision_path_candidate_scan_timeout/);
  assert.match(controlTick, /name: "inReviewDecisionPath"/);
  assert.match(controlTick, /candidateScanStatus: data\.candidateScanStatus \?\? null/);
});

test("softwarehouse stale disposition checks treat pending issue approvals as structured review paths", async () => {
  const routineGates = await readFile("scripts/lib/softwarehouse-routine-gates.mjs", "utf8");
  const audit = await readFile("scripts/audit-luckysparrow-softwarehouse.mjs", "utf8");
  const disposition = await readFile("scripts/run-run-disposition-enforcer.mjs", "utf8");

  assert.match(routineGates, /export function hasPendingIssueApproval\(approvals\)/);
  assert.match(audit, /decisionPath: "pending_issue_approval"/);
  assert.match(audit, /request\("GET", `\/api\/issues\/\$\{issue\.id\}\/approvals`\)/);
  assert.match(disposition, /suppressed_pending_issue_approval/);
});

test("safe architecture planning seeder degrades candidate scan timeouts into reportable actions", async () => {
  const source = await readFile("scripts/run-safe-architecture-planning-seeder.mjs", "utf8");
  const controlTick = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_SAFE_ARCHITECTURE_PLANNING_REQUEST_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /AbortSignal\.timeout\(requestTimeoutMs\)/);
  assert.match(source, /function isRequestTimeoutError\(error\)/);
  assert.match(source, /candidateScanStatus: "timed_out"/);
  assert.match(source, /skip_safe_architecture_planning_candidate_scan_timeout/);
  assert.match(controlTick, /name: "safeArchitecturePlanningSeeder"/);
  assert.match(controlTick, /candidateScanStatus: data\.candidateScanStatus \?\? null/);
});

test("control tick does not coerce missing audit active-run counts to idle", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /audit\.activeRunCount == null \? Number\.NaN/);
  assert.match(source, /observedActiveRunCount/);
  assert.match(source, /observedLiveRunCount/);
  assert.doesNotMatch(source, /const currentLiveRunCount = currentActiveRunCount === 0\s*\?\s*0/);
});

test("control tick treats delivery-ready readiness as a non-blocking posture detail", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /readinessHasNoBlockingConstraint/);
  assert.match(source, /readinessPosture === "two_project_delivery_ready"/);
  assert.match(source, /readinessPosture === "supervision_ready_limited_delivery"/);
  assert.match(source, /\|\| readinessHasNoBlockingConstraint/);
});

test("gate freshness watcher requires exactly one action and no blocking live runs before apply", async () => {
  const source = await readFile("scripts/run-gate-freshness-watcher.mjs", "utf8");

  assert.match(source, /const currentWatcherRunId = process\.env\.PAPERCLIP_RUN_ID \?\? null/);
  assert.match(source, /SOFTWAREHOUSE_GATE_FRESHNESS_REQUEST_TIMEOUT_MS/);
  assert.match(source, /const controller = new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /timed out after \$\{requestTimeoutMs\}ms/);
  assert.match(source, /\/secrets\/metadata/);
  assert.doesNotMatch(source, /\/secrets`\)/);
  assert.match(source, /requestTimeoutMs/);
  assert.match(source, /async function captureRequest\(name, method, route, body\)/);
  assert.match(source, /async function captureCompanyResolution\(\)/);
  assert.match(source, /company_resolution_failed/);
  assert.match(source, /companyIdAvailable/);
  assert.match(source, /companyResolution/);
  assert.match(source, /const telemetry = await Promise\.all/);
  assert.match(source, /requiredTelemetryErrors/);
  assert.match(source, /requiredTelemetryAvailable/);
  assert.doesNotMatch(source, /&& agentsResult\?\.ok/);
  assert.match(source, /agentRosterAvailable/);
  assert.match(source, /state: "telemetry_unavailable"/);
  assert.match(source, /reason: "telemetry_unavailable"/);
  assert.match(source, /apiErrors/);
  assert.match(source, /function isCurrentWatcherRun\(run\)/);
  assert.match(source, /run\?\.id === currentWatcherRunId/);
  assert.match(source, /function blockingActiveRunCountFor\(\{ activeRunCount, liveRuns \}\)/);
  assert.match(source, /Math\.max\(0, activeRunCount - selfRunCount\)/);
  assert.match(source, /function duplicateAssigneeActionFor\(actionsToCheck\)/);
  assert.match(source, /function isCrossAssigneeMutationError\(error\)/);
  assert.match(source, /function isCrossAgentInvokeError\(error\)/);
  assert.match(source, /function localExistingRecheckChildFor\(action\)/);
  assert.match(source, /async function existingRecheckChildFor\(action\)/);
  assert.match(source, /issues\?parentId=\$\{encodeURIComponent\(action\.issueId\)\}&limit=100/);
  assert.match(source, /existingRecheckChildIdentifier: existingRecheckChild\?\.identifier \?\? null/);
  assert.match(source, /if \(existingRecheckChild\) continue;/);
  assert.doesNotMatch(source, /issues\?limit=1000/);
  assert.match(source, /function createOrReuseRecheckChild\(action\)/);
  assert.match(source, /Agent cannot mutate another agent's issue/);
  assert.match(source, /Issue is outside this actor's authorization boundary/);
  assert.match(source, /Agent can only invoke itself/);
  assert.match(source, /cross_agent_invoke_forbidden/);
  assert.match(source, /delegatedChildCreated/);
  assert.match(source, /const skippedActions = \[\]/);
  assert.match(source, /let eligibleActions = actions/);
  assert.match(source, /const freshBlockingActiveRunCount = blockingActiveRunCountFor/);
  assert.match(source, /actions\.length !== 1/);
  assert.match(source, /reason: "expected_exactly_one_action"/);
  assert.match(source, /freshBlockingActiveRunCount > 0/);
  assert.match(source, /reason: "blocking_active_runs_present"/);
  assert.match(source, /if \(!applySkipped && \(freshWip\?\.unknownActiveRunCount \?\? 0\) > 0\)/);
  assert.match(source, /reason: "unknown_active_run"/);
  assert.match(source, /const wipBlocker = agentWipBlockerFor\(action\.assigneeAgentId, freshWip\)/);
  assert.match(source, /reason: "duplicate_target_assignee"/);
  assert.doesNotMatch(source, /reason: "cross_assignee_mutation_forbidden"/);
  assert.match(source, /nonBlockingSelfRunCount/);
  assert.match(source, /blockingActiveRunCount: freshBlockingActiveRunCount/);
  assert.match(source, /currentWatcherRunId/);
});

test("gate freshness classifier rejects placeholder-only comments and accepts real fresh facts", () => {
  const issue = {
    id: "gate-1",
    updatedAt: "2026-06-01T10:00:00.000Z",
  };
  const secretByKey = new Map([
    ["prod_ui_audit_admin_token", {
      key: "prod_ui_audit_admin_token",
      status: "active",
      updatedAt: "2026-06-01T10:05:00.000Z",
    }],
  ]);

  const placeholderOnly = gateFreshnessObservation({
    issue,
    comments: [{
      body: "Technical binding sync only; no real credential.",
      createdAt: "2026-06-01T10:06:00.000Z",
    }],
    secretByKey,
    secretKeys: ["smoke_auth_token"],
  });

  assert.equal(placeholderOnly.trackedSecretCount, 1);
  assert.equal(placeholderOnly.secretUpdatedAfterIssue, true);
  assert.equal(placeholderOnly.latestCommentIsPlaceholderOnly, true);
  assert.equal(placeholderOnly.hasSecretFreshnessSignal, false);
  assert.equal(placeholderOnly.actionableFreshGateFact, false);

  const explicitApproval = gateFreshnessObservation({
    issue,
    comments: [{
      body: "Operator approved one resume protected smoke recheck.",
      createdAt: "2026-06-01T10:06:00.000Z",
    }],
    secretByKey: new Map(),
    secretKeys: ["smoke_auth_token"],
  });

  assert.equal(explicitApproval.hasExplicitApprovalOrEvidence, true);
  assert.equal(explicitApproval.actionableFreshGateFact, true);
});

test("gate freshness scripts share the same classifier", async () => {
  const watcher = await readFile("scripts/run-gate-freshness-watcher.mjs", "utf8");
  const governor = await readFile("scripts/run-autonomy-governor.mjs", "utf8");

  for (const source of [watcher, governor]) {
    assert.match(source, /gate-freshness\.mjs/);
    assert.match(source, /gateFreshnessObservation\(/);
    assert.doesNotMatch(source, /const positiveEvidenceTokens = \[/);
    assert.doesNotMatch(source, /const placeholderOnlyTokens = \[/);
  }
});

test("gate freshness watcher configurator reconciles legacy schedules without blocking on its own run", async () => {
  const source = await readFile("scripts/configure-gate-freshness-watcher.mjs", "utf8");

  assert.match(source, /const companyNames = \[/);
  assert.match(source, /"LuckySparrow"/);
  assert.match(source, /const currentRunId = process\.env\.PAPERCLIP_RUN_ID \?\? null/);
  assert.match(source, /SOFTWAREHOUSE_GATE_FRESHNESS_REQUEST_TIMEOUT_MS/);
  assert.match(source, /const controller = new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /headers\["x-paperclip-run-id"\] = currentRunId/);
  assert.match(source, /request\("GET", `\/api\/companies\/\$\{company\.id\}\/live-runs`\)/);
  assert.match(source, /const activeRunCount = health\.devServer\?\.activeRunCount \?\? liveRuns\.length/);
  assert.match(source, /const selfRunCount = liveRuns\.filter/);
  assert.match(source, /const blockingActiveRunCount = Math\.max\(0, activeRunCount - selfRunCount\)/);
  assert.match(source, /Refusing to reconfigure gate watcher while \$\{blockingActiveRunCount\} non-watcher run\(s\) are active/);
  assert.match(source, /legacyScheduleLabels/);
  assert.match(source, /Hourly gate freshness watcher - quiet unless fresh operator\/credential fact exists/);
  assert.match(source, /disabledLegacyTriggers/);
  assert.match(source, /enabled: false/);
  assert.match(source, /Every 30 minutes gate freshness watcher/);
  assert.match(source, /cronExpression: "\*\/30 \* \* \* \*"/);
});

test("autonomy governor configurator uses the central active routine matrix", async () => {
  const source = await readFile("scripts/configure-autonomy-governor.mjs", "utf8");

  assert.match(source, /softwarehousePilotActiveRoutineTitles/);
  assert.match(source, /softwarehousePilotRoutineScheduleLabels/);
  assert.match(source, /const activeRoutineTitles = softwarehousePilotActiveRoutineTitles/);
  assert.match(source, /const activeRoutineSchedules = softwarehousePilotRoutineScheduleLabels/);
  assert.match(source, /const shouldBeActive = activeRoutineTitles\.has\(routine\.title\)/);
  assert.doesNotMatch(source, /const activeRoutineSchedules = new Map\(\[/);
});

test("review waiters include checkbox confirmation interactions", async () => {
  const source = await readFile("scripts/lib/softwarehouse-routine-gates.mjs", "utf8");

  assert.match(source, /request_checkbox_confirmation/);
  assert.match(source, /request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"/);
});

test("control tick gives gate freshness watcher a dedicated timeout budget", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_CONTROL_TICK_GATE_FRESHNESS_WATCHER_TIMEOUT_MS/);
  assert.match(source, /const gateFreshnessWatcherStepTimeoutMs = Number/);
  assert.match(source, /name: "gateFreshnessWatcher"[\s\S]*timeoutMs: gateFreshnessWatcherStepTimeoutMs/);
});

test("control tick gives autonomy governor enough time on large local instances", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_CONTROL_TICK_AUTONOMY_GOVERNOR_TIMEOUT_MS \?\? 600_000/);
});

test("control tick gives large local step output an explicit buffer", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_CONTROL_TICK_STEP_OUTPUT_MAX_BUFFER_BYTES \?\? 64 \* 1024 \* 1024/);
  assert.match(source, /maxBuffer: stepOutputMaxBufferBytes/);
});

test("next legal action selector does not target blocked release gates for source-control closure", async () => {
  const { pickAction } = await import("./run-next-legal-action-selector.mjs");

  const action = pickAction(
    {
      activeRunCount: 0,
      sourceControlGateIssues: [
        {
          identifier: "LUC-2361",
          status: "blocked",
          blockerAttention: {
            unresolvedBlockerCount: 1,
            attentionBlockerCount: 1,
          },
        },
      ],
      controlBrief: {
        dirtyProjects: [
          {
            project: "Soar",
            dirtyCount: 222,
          },
        ],
      },
    },
    {},
  );

  assert.equal(action.decision, "start_source_control_closure");
  assert.equal(action.target, "Soar");
});

test("next legal action selector refuses stale supervision when the local app is unreachable", async () => {
  const { pickAction } = await import("./run-next-legal-action-selector.mjs");

  const action = pickAction(
    {
      activeRunCount: 7,
    },
    {
      activeRunCount: 7,
    },
    {
      checked: true,
      ok: false,
      error: "timeout",
    },
  );

  assert.equal(action.decision, "repair_local_paperclip_liveness");
  assert.equal(action.command, "pnpm dev:list");
  assert.match(action.reason, /API is unreachable/i);
  assert.match(action.forbidden.join(" "), /restart/);
});

test("next legal action selector trusts fresh live-run probe over stale cached counts", async () => {
  const { pickAction } = await import("./run-next-legal-action-selector.mjs");

  const action = pickAction(
    {
      activeRunCount: 7,
    },
    {
      activeRunCount: 7,
    },
    {
      checked: true,
      ok: true,
      status: 200,
    },
    {
      checked: true,
      ok: true,
      liveRunCount: 0,
    },
  );

  assert.notEqual(action.decision, "supervise_active_runs");
  assert.equal(action.decision, "refresh_control_tick");
});

test("control tick inspects gate freshness before any manual apply", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /name: "gateFreshnessWatcher"[\s\S]*command: \["scripts\/run-gate-freshness-watcher\.mjs"\]/);
  assert.doesNotMatch(source, /command: \["scripts\/run-gate-freshness-watcher\.mjs", "--apply"\]/);
});

test("autonomy governor does not classify fresh own runs as self-supervision loops", async () => {
  const source = await readFile("scripts/run-autonomy-governor.mjs", "utf8");

  assert.match(source, /governorSelfSupervisionMinAgeMs/);
  assert.match(source, /ageMs\(run\.lastOutputAt \?\? run\.startedAt \?\? run\.createdAt\) >= governorSelfSupervisionMinAgeMs/);
});

test("autonomy governor uses gate freshness evidence instead of a diagnostic false override", async () => {
  const source = await readFile("scripts/run-autonomy-governor.mjs", "utf8");

  assert.match(source, /\/secrets\/metadata/);
  assert.doesNotMatch(source, /\/secrets`\)/);
  assert.match(source, /resolveIssuesByIdentifier/);
  assert.match(source, /const gateIssueByIdentifier = await resolveIssuesByIdentifier/);
  assert.match(source, /const issue = gateIssueByIdentifier\.get\(identifier\)/);
  assert.match(source, /SOFTWAREHOUSE_AUTONOMY_GOVERNOR_REQUEST_TIMEOUT_MS/);
  assert.match(source, /const controller = new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /timed out after \$\{requestTimeoutMs\}ms/);
  assert.match(source, /gate-freshness\.mjs/);
  assert.match(source, /gateFreshnessObservation\(/);
  assert.match(source, /actionableFreshGateFact: freshness\.actionableFreshGateFact/);
  assert.doesNotMatch(source, /actionableFreshGateFact: false/);
  assert.doesNotMatch(source, /Diagnostic only until secret mutation timestamps/);
});

test("autonomy governor uses resilient issue pagination and retry defaults", async () => {
  const source = await readFile("scripts/run-autonomy-governor.mjs", "utf8");
  const controlTickSource = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_AUTONOMY_GOVERNOR_REQUEST_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /SOFTWAREHOUSE_AUTONOMY_GOVERNOR_ISSUE_PAGE_SIZE \?\? 50/);
  assert.match(source, /SOFTWAREHOUSE_AUTONOMY_GOVERNOR_REQUEST_RETRIES \?\? 1/);
  assert.match(source, /function isRequestTimeoutError\(error\)/);
  assert.match(source, /decision: "api_scan_degraded"/);
  assert.match(source, /candidateScanStatus: "timed_out"/);
  assert.match(source, /skip_autonomy_governor_candidate_scan_timeout/);
  assert.match(source, /error\?\.name === "AbortError" \|\| error\?\.status === 429 \|\| error\?\.status >= 500/);
  assert.match(source, /requestRetryBaseDelayMs \* \(attempt \+ 1\)/);
  assert.match(source, /async function requestAllPages\(route, \{ limit = issuePageSize \} = \{\}\)/);
  assert.match(source, /async function requestGovernorIssues\(resolvedCompanyId\)/);
  assert.match(source, /const openStatuses = "todo,backlog,in_progress,in_review,blocked"/);
  assert.match(source, /requestAllPages\(`\/api\/companies\/\$\{resolvedCompanyId\}\/issues\?status=\$\{openStatuses\}`\)/);
  assert.match(source, /const terminalTriageQuery = encodeURIComponent\("\[Softwarehouse\]\[Blocked Triage\]"\)/);
  assert.match(source, /const safeLaneQuery = encodeURIComponent\(safeNonProductionLaneTitle\)/);
  assert.doesNotMatch(source, /issues\?limit=1000/);
  assert.match(controlTickSource, /SOFTWAREHOUSE_CONTROL_TICK_AUTONOMY_GOVERNOR_TIMEOUT_MS \?\? 600_000/);
  assert.match(controlTickSource, /name: "autonomyGovernor",\s+command: \["scripts\/run-autonomy-governor\.mjs"\],\s+timeoutMs: autonomyGovernorStepTimeoutMs/s);
  assert.match(controlTickSource, /candidateScanStatus: data\.candidateScanStatus \?\? null/);
});

test("live-run janitor falls back to API reads when direct database is unavailable", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /function isDatabaseConnectionUnavailable\(error\)/);
  assert.match(source, /async function readControlDataFromSql\(company\)/);
  assert.match(source, /async function readControlDataFromApi\(company, cause\)/);
  assert.match(source, /\/api\/companies\/\$\{company\.id\}\/live-runs\?limit=50&minCount=0/);
  assert.match(source, /readMode: "api_fallback"/);
  assert.match(source, /fullIssueScanAvailable: false/);
  assert.match(source, /if \(liveRuns\.length === 0 && fullIssueScanAvailable\)/);
});

test("live-run janitor avoids duplicate-run comments that re-wake blocked lanes", async () => {
  const source = await readFile("scripts/run-live-run-janitor.mjs", "utf8");

  assert.match(source, /action\.kind === "cancel_duplicate_owner_run"/);
  assert.match(source, /action\.issueStatus === "blocked"/);
  assert.match(source, /Skipped duplicate-run bookkeeping comment to avoid waking a blocked duplicate lane/);
  assert.doesNotMatch(source, /duplicateOwnerRunMarker\(action\.identifier\)[\s\S]*Kept run:/);
});

test("routine duplicate janitor archives terminal duplicate routine issues", async () => {
  const source = await readFile("scripts/run-routine-duplicate-janitor.mjs", "utf8");

  assert.match(source, /const terminalStatuses = new Set\(\["done", "cancelled"\]\)/);
  assert.match(source, /archive_terminal_duplicate_routine_issue/);
  assert.match(source, /set hidden_at = now\(\)/);
  assert.match(source, /Cancelled duplicate routine issue in favor of canonical/);
  assert.match(source, /Archived terminal duplicate routine issue in favor of canonical/);
});

test("routine dispatch coalesces to open routine issues, not only live runs", async () => {
  const source = await readFile("server/src/services/routines.ts", "utf8");

  assert.match(source, /async function findOpenExecutionIssue/);
  assert.match(source, /eq\(issues\.title, title\)/);
  assert.match(source, /input\.routine\.concurrencyPolicy === "always_enqueue"/);
  assert.match(source, /await findOpenExecutionIssue\(input\.routine, txDb, dispatchFingerprint/);
});

test("autonomy governor only recommends gate watcher apply when the apply guard can pass", async () => {
  const source = await readFile("scripts/run-autonomy-governor.mjs", "utf8");

  assert.match(source, /function blockingActiveRunCountFor\(\{ activeRunCount, liveRuns \}\)/);
  assert.match(source, /freshGateActions\.length > 0 && blockingActiveRunCount > 0/);
  assert.match(source, /until no blocking active runs remain/);
  assert.match(source, /freshGateActions\.length === 1/);
  assert.match(source, /exactly one fresh gate action exists and no blocking active runs are present/);
  assert.match(source, /freshGateActions\.length > 1/);
  assert.match(source, /the watcher requires exactly one action/);
  assert.match(source, /nonBlockingSelfRunCount/);
  assert.match(source, /existingGateRecheckChildFor\(issue, rootBlocker, allIssues, resolvedCompanyId\)/);
  assert.match(source, /parentId=\$\{encodeURIComponent\(issue\.id\)\}&limit=100/);
  assert.match(source, /existingRecheckChildIdentifier/);
  assert.match(source, /&& !gate\.existingRecheckChildIdentifier/);
});

test("known-state harvester does not create lanes while Paperclip OS is dirty", async () => {
  const source = await readFile("scripts/run-project-known-state-harvester.mjs", "utf8");

  assert.match(source, /function operatingRepoDirty/);
  assert.match(source, /action: "noop_operating_repo_dirty"/);
  assert.match(source, /process\.exit\(0\)/);
});

test("known-state harvester defers heavy scans while active runs exist", async () => {
  const source = await readFile("scripts/run-project-known-state-harvester.mjs", "utf8");

  assert.match(source, /const requestTimeoutMs = Number\(process\.env\.SOFTWAREHOUSE_KNOWN_STATE_REQUEST_TIMEOUT_MS \?\? 30_000\)/);
  assert.match(source, /const issueStatuses = \["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"\]/);
  assert.match(source, /AbortSignal\.timeout\(requestTimeoutMs\)/);
  assert.match(source, /const \[health, liveRuns\] = await Promise\.all/);
  assert.match(source, /if \(activeRunCount > 0\) \{/);
  assert.match(source, /action: "noop_active_runs"/);
  assert.match(source, /process\.exit\(0\)/);
  assert.match(source, /issues\?status=\$\{issueStatuses\.join\(","\)\}&limit=2000/);
  assert.doesNotMatch(source, /issues\?limit=1000/);
});

test("softwarehouse autonomous project defaults keep future apps parked behind Soar and Roost", async () => {
  const activeRoutines = await readFile("scripts/lib/softwarehouse-active-routines.mjs", "utf8");
  const activeRoutineConfigurator = await readFile("scripts/configure-active-project-routines.mjs", "utf8");
  const knownStateHarvester = await readFile("scripts/run-project-known-state-harvester.mjs", "utf8");
  const localRepairStarter = await readFile("scripts/run-local-repair-lane-starter.mjs", "utf8");
  const projectOwnershipAssignment = await readFile("scripts/run-project-ownership-assignment.mjs", "utf8");
  const projectStatusSync = await readFile("scripts/run-project-status-sync.mjs", "utf8");
  const blockedTriageStarter = await readFile("scripts/run-blocked-triage-lane-starter.mjs", "utf8");

  assert.match(activeRoutines, /softwarehouseActiveApplicationProjectNames = \["Soar", "Roost"\]/);
  assert.match(activeRoutineConfigurator, /\["Soar", "Soar Project Manager"\]/);
  assert.match(activeRoutineConfigurator, /\["Roost", "Roost Project Manager"\]/);

  assert.match(knownStateHarvester, /SOFTWAREHOUSE_KNOWN_STATE_PROJECTS \?\? "Soar,Roost"/);
  assert.doesNotMatch(knownStateHarvester, /SOFTWAREHOUSE_KNOWN_STATE_PROJECTS \?\? "Soar,Roost,Aviary,Nest"/);

  for (const source of [localRepairStarter, projectOwnershipAssignment]) {
    assert.match(source, /SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS \?\? "Soar,Roost,Softwarehouse Operating System"/);
    assert.doesNotMatch(source, /SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS \?\? "Soar,Roost,Aviary,Nest/);
  }

  assert.match(projectStatusSync, /SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS \?\? "Soar,Roost"/);
  assert.doesNotMatch(projectStatusSync, /SOFTWAREHOUSE_LOCAL_REPAIR_PROJECTS \?\? "Soar,Roost,Aviary,Nest"/);

  assert.match(blockedTriageStarter, /SOFTWAREHOUSE_BLOCKED_TRIAGE_PROJECTS\s+\?\? "Softwarehouse Operating System,Soar,Roost"/);
  assert.doesNotMatch(blockedTriageStarter, /SOFTWAREHOUSE_BLOCKED_TRIAGE_PROJECTS\s+\?\? "Softwarehouse Operating System,Soar,Roost,Aviary,Nest"/);
});

test("project ownership assignment resolves both LuckySparrow company aliases", async () => {
  const source = await readFile("scripts/run-project-ownership-assignment.mjs", "utf8");

  assert.match(source, /const companyNameAliases = \[companyName, "LuckySparrow"\]/);
  assert.match(source, /companyNameAliases\.includes\(candidate\.name\)/);
  assert.match(source, /\^LuckySparrow\\b\/i/);
});

test("active app lifecycle requires project-truth index family", async () => {
  const lifecycle = await readFile("scripts/check-architecture-awareness-lifecycle.mjs", "utf8");
  const packageJson = await readFile("package.json", "utf8");
  const operatingProcesses = await readFile("softwarehouse/operating-processes.md", "utf8");

  for (const requiredPath of [
    "docs/status/event-chain-index.json",
    "docs/status/runtime-error-index.json",
    "docs/status/operational-readiness-index.json",
    "docs/status/project-truth-index.json",
  ]) {
    assert.match(lifecycle, new RegExp(requiredPath.replace(/[/.]/g, "\\$&")));
    assert.match(operatingProcesses, new RegExp(requiredPath.replace(/[/.]/g, "\\$&")));
  }

  assert.match(lifecycle, /scripts\/build-project-truth-indexes\.mjs/);
  assert.match(lifecycle, /"--apply"/);
  assert.match(packageJson, /"softwarehouse:project-truth-index": "node scripts\/build-project-truth-indexes\.mjs"/);
  assert.match(packageJson, /"softwarehouse:project-truth": "node scripts\/check-project-truth-indexes\.mjs"/);
  assert.match(packageJson, /"softwarehouse:project-truth-dispatch": "node scripts\/run-project-truth-gap-dispatcher\.mjs"/);
});

test("project truth probes cover web and API readiness", async () => {
  const source = await readFile("scripts/build-project-truth-indexes.mjs", "utf8");

  assert.match(source, /defaultPublicUrls/);
  assert.match(source, /\`\$\{projectName\.toUpperCase\(\)\}_PUBLIC_URL\`/);
  assert.match(source, /\`\$\{projectName\.toUpperCase\(\)\}_API_PUBLIC_URL\`/);
  assert.match(source, /https:\/\/soar\.luckysparrow\.ch/);
  assert.match(source, /https:\/\/api\.soar\.luckysparrow\.ch/);
  assert.match(source, /https:\/\/roost\.luckysparrow\.ch/);
  assert.match(source, /https:\/\/api\.roost\.luckysparrow\.ch/);
  assert.match(source, /web_build_info/);
  assert.match(source, /api_health/);
  assert.match(source, /api_ready/);
  assert.match(source, /new URL\("\/ready", apiUrl\)/);
});

test("control tick surfaces project truth gaps as routing work", async () => {
  const source = await readFile("scripts/run-softwarehouse-control-tick.mjs", "utf8");
  const dispatcher = await readFile("scripts/run-project-truth-gap-dispatcher.mjs", "utf8");
  const controlBrief = await readFile("scripts/lib/softwarehouse-control-brief.mjs", "utf8");
  const cycle = await readFile("scripts/run-autonomous-development-cycle.mjs", "utf8");

  assert.match(source, /name: "projectTruthAudit"/);
  assert.match(source, /scripts\/check-project-truth-indexes\.mjs/);
  assert.match(source, /name: "projectTruthGapDispatcher"/);
  assert.match(source, /scripts\/run-project-truth-gap-dispatcher\.mjs", "--apply"/);
  assert.match(source, /project_truth_gap_routing_needed/);
  assert.match(source, /Project truth gap:/);
  assert.match(source, /Dispatch project truth gap/);
  assert.match(source, /projectTruthGapDispatcher/);
  assert.match(source, /projectTruthAudit/);
  assert.match(source, /Active app truth indexes show unresolved routing gaps/);
  assert.match(dispatcher, /softwarehouse-project-truth-gap-dispatcher:v1/);
  assert.match(dispatcher, /Required autonomous chain:/);
  assert.match(dispatcher, /Deployment & Reliability Engineer/);
  assert.match(dispatcher, /indexedOwnerCandidates/);
  assert.match(dispatcher, /\.\.\.indexedOwnerCandidates, `\$\{gap\.project\} Project Manager`/);
  assert.match(dispatcher, /heartbeat\/invoke/);
  assert.match(dispatcher, /const actorAgentId = process\.env\.PAPERCLIP_AGENT_ID \?\? null/);
  assert.match(dispatcher, /function directWakeBoundaryForAgent/);
  assert.match(dispatcher, /cross_agent_direct_invoke_forbidden/);
  assert.match(dispatcher, /created_todo_issue_for_assignee_without_cross_agent_direct_invoke/);
  assert.match(dispatcher, /findExistingIssueByTitle/);
  assert.match(dispatcher, /findExistingIssueForGap/);
  assert.match(dispatcher, /relatedExistingIssue/);
  assert.match(dispatcher, /public runtime probe/);
  assert.match(dispatcher, /issues\?q=\$\{encodeURIComponent\(title\)\}&limit=25/);
  assert.match(controlBrief, /project_truth_gap_dispatch/);
  assert.match(cycle, /projectTruthGapDispatcher/);
  assert.match(cycle, /supervise_existing_project_truth_run/);
  assert.match(cycle, /project_truth_gap_dispatch_required/);
});

test("softwarehouse setup scripts resolve both current and legacy company names", async () => {
  const scripts = [
    "scripts/configure-active-project-routines.mjs",
    "scripts/configure-softwarehouse-processes.mjs",
    "scripts/configure-softwarehouse-longevity-routines.mjs",
    "scripts/sync-luckysparrow-agent-instructions.mjs",
    "scripts/run-local-repair-lane-starter.mjs",
    "scripts/run-source-control-classification-commenter.mjs",
    "scripts/run-safe-nonproduction-lane-seeder.mjs",
    "scripts/run-autonomy-governor.mjs",
    "scripts/run-access-unblock-task-seeder.mjs",
    "scripts/run-safe-architecture-planning-seeder.mjs",
  ];

  for (const scriptPath of scripts) {
    const source = await readFile(scriptPath, "utf8");
    assert.match(source, /companyNames/);
    assert.match(source, /"LuckySparrow"/);
    assert.match(source, /"LuckySparrow Software House"/);
    assert.match(source, /companyNames\.includes\(candidate\.name\)/);
  }
});

test("softwarehouse instructions preserve V1 to V3 autonomous roadmap", async () => {
  const currentPilot = await readFile("softwarehouse/instructions/shared/00-current-pilot.md", "utf8");
  const operatingManual = await readFile("softwarehouse/company-operating-system.md", "utf8");
  const companyOsConfigurator = await readFile("scripts/configure-softwarehouse-company-os.mjs", "utf8");

  for (const source of [currentPilot, operatingManual, companyOsConfigurator]) {
    assert.match(source, /V1 local Soar \+ Roost completion -> V2\.1 Roost connected to Paperclip -> V2\.2 Paperclip VPS builder -> V3 portfolio expansion/);
    assert.match(source, /Soar and Roost|Soar` and `Roost`|finish `Soar` and `Roost`/);
  }
  assert.match(currentPilot, /Roost must keep moving when safe\s+local work is available/);
  assert.match(operatingManual, /Roost must not be parked when local\s+known-state, source-control, implementation, proof, or documentation work is\s+legal and owner-scoped/);
});

test("access unblock seeder assigns project workspaces instead of execution workspace ids", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /async function primaryWorkspaceForProject/);
  assert.match(source, /request\("GET", `\/api\/projects\/\$\{projectId\}\/workspaces`\)/);
  assert.match(source, /projectWorkspaceId: workspace\?\.id \?\? null/);
  assert.doesNotMatch(source, /executionWorkspaceId: workspace\?\.id/);
});

test("access unblock seeder moves project and project workspace together", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /if \(input\.projectId !== existing\.projectId\) \{/);
  assert.match(source, /patch\.projectId = input\.projectId/);
  assert.match(source, /patch\.projectWorkspaceId = input\.projectWorkspaceId/);
  assert.match(source, /else if \(!existing\.projectWorkspaceId && input\.projectWorkspaceId\)/);
});

test("access unblock seeder does not patch checked-out issues", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /function isIssueLocked\(issue\)/);
  assert.match(source, /return Boolean\(issue\?\.checkoutRunId \|\| issue\?\.executionRunId \|\| issue\?\.executionLockedAt\)/);
  assert.match(source, /function isExpectedImmutableIssueError\(error\)/);
  assert.match(source, /Agent cannot mutate another agent's issue/);
  assert.match(source, /Issue is outside this actor's authorization boundary/);
  assert.match(source, /action: "kept_existing_locked_issue"/);
  assert.match(source, /action: "skipped_immutable_existing_issue"/);
  assert.match(source, /action: "skipped_locked_duplicate_issue"/);
  assert.match(source, /action: "skipped_immutable_duplicate_issue"/);
});

test("local repair lane starter treats cross-boundary patch denial as routed skip", async () => {
  const source = await readFile("scripts/run-local-repair-lane-starter.mjs", "utf8");

  assert.match(source, /function isIssueAuthorizationBoundaryError\(error\)/);
  assert.match(source, /Issue is outside this actor\(\?:'\|\\\\u0027\)s authorization boundary/);
  assert.match(source, /action = "skipped_cross_boundary_issue_mutation"/);
  assert.match(source, /Read back the existing owner-path issue/);
  assert.match(source, /if \(updated && isBacklogWake && updated\.assigneeAgentId\)/);
});

test("control seeders use per-agent WIP guard before wake or resume", async () => {
  const guardedScripts = [
    "scripts/run-blocked-triage-lane-starter.mjs",
    "scripts/run-access-unblock-task-seeder.mjs",
    "scripts/run-gate-freshness-watcher.mjs",
    "scripts/run-local-repair-lane-starter.mjs",
    "scripts/run-project-known-state-harvester.mjs",
    "scripts/run-worker-backlog-decomposition-seeder.mjs",
  ];

  for (const scriptPath of guardedScripts) {
    const source = await readFile(scriptPath, "utf8");
    assert.match(source, /agent-wip-guard\.mjs/, `${scriptPath} must import the per-agent WIP guard`);
    assert.match(source, /fetchAgentWipState/, `${scriptPath} must refresh live runs before waking/resuming`);
    assert.match(source, /agentWipBlockerFor/, `${scriptPath} must check the target assignee WIP state`);
  }
});

test("source-control sidecars target the primary project workspace", async () => {
  const source = await readFile("scripts/run-local-repair-lane-starter.mjs", "utf8");

  assert.match(source, /function defaultProjectWorkspaceId/);
  assert.match(source, /projectWorkspaceId: defaultProjectWorkspaceId\(sidecar\.project\)/);
  assert.match(source, /executionWorkspacePreference: "shared_workspace"/);
  assert.match(source, /executionWorkspaceSettings: \{ mode: "shared_workspace" \}/);
  assert.match(source, /git -C <project path> status --short --branch/);
  assert.match(source, /create_source_control_closure_sidecar/);
});

test("source-control closure janitor reopens invalid clean claims against dirty primary repo", async () => {
  const source = await readFile("scripts/run-source-control-closure-janitor.mjs", "utf8");

  assert.match(source, /reopen_invalid_source_control_closure/);
  assert.match(source, /sourceControlProjects/);
  assert.match(source, /\[Source Control Closure\]/);
  assert.match(source, /hasTerminalCleanClaim/);
  assert.match(source, /dirtyCount/);
  assert.match(source, /executionWorkspacePreference: "shared_workspace"/);
  assert.match(source, /executionWorkspaceSettings: \{ mode: "shared_workspace" \}/);
  assert.match(source, /projectWorkspaceId/);
  assert.match(source, /git -C <project path> status --short --branch/);
  assert.match(source, /resume: false/);
});

test("project truth indexes route app-completion proof gaps instead of treating index files as readiness", async () => {
  const builder = await readFile("scripts/build-project-truth-indexes.mjs", "utf8");
  const dispatcher = await readFile("scripts/run-project-truth-gap-dispatcher.mjs", "utf8");

  assert.match(builder, /function buildAppCompletionGapIndex/);
  assert.match(builder, /function appCompletionGapForItem/);
  assert.match(builder, /needs_browser_review/);
  assert.match(builder, /missing_test_link/);
  assert.match(builder, /missing_doc_link/);
  assert.match(builder, /implemented_needs_proof/);
  assert.match(builder, /kind: "app_completion_gap"/);
  assert.match(builder, /appCompletionGaps/);
  assert.match(builder, /knownAppCompletionRiskItems/);
  assert.match(builder, /indexedAppCompletionGaps/);
  assert.match(builder, /priorityReviewTruncated/);
  assert.match(builder, /totalKnownGaps/);
  assert.match(builder, /missingInputs\.includes/);
  assert.match(builder, /app_completion_risk_index/);
  assert.match(dispatcher, /\[App Completion\]/);
  assert.match(dispatcher, /gap\.kind === "app_completion_gap"/);
  assert.match(dispatcher, /App-completion rule/);
  assert.match(dispatcher, /SOFTWAREHOUSE_PROJECT_TRUTH_DISPATCH_MAX_GAPS \?\? 2/);
  assert.match(dispatcher, /function dispatchableGaps/);
  assert.match(dispatcher, /project\.projectTruth\?\.firstGap/);
  assert.match(dispatcher, /gapsToDispatch/);
  assert.match(dispatcher, /function isProjectTruthIssue/);
  assert.match(dispatcher, /supersededProjectTruthIssues/);
  assert.match(dispatcher, /mark_superseded_project_truth_gap_issue/);
  assert.match(dispatcher, /liveIssueIds/);
  assert.match(dispatcher, /encodeURIComponent\("\[Project Truth\]"\)/);
  assert.match(dispatcher, /supersededMarker/);
  assert.match(dispatcher, /description: existingDescription\.includes\(supersededMarker\)/);
  assert.match(dispatcher, /comments\?order=desc&limit=12/);
  assert.match(dispatcher, /comment\.body/);
  assert.match(dispatcher, /const isRuntimeIssue = String\(issue\.title/);
  assert.match(dispatcher, /kind: runtime_error/);
});

test("project truth dispatcher dedupes exact terminal visible issues", async () => {
  const dispatcher = await readFile("scripts/run-project-truth-gap-dispatcher.mjs", "utf8");

  assert.match(dispatcher, /const exactTitleIssues = issues/);
  assert.match(dispatcher, /issue\.title === title && !issue\.hiddenAt/);
  assert.match(dispatcher, /const openMatch = exactTitleIssues/);
  assert.match(dispatcher, /terminalStatuses\.has\(issue\.status\)/);
  assert.match(dispatcher, /updatedDelta/);
});

test("acceptance evidence lanes outrank architecture backlog wakeups", async () => {
  const accessSeeder = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");
  const architectureSeeder = await readFile("scripts/run-safe-architecture-planning-seeder.mjs", "utf8");
  const architectureMaterializer = await readFile("scripts/run-soar-architecture-backlog-materializer.mjs", "utf8");
  const acceptanceLedger = await readFile("scripts/run-soar-acceptance-ledger.mjs", "utf8");

  assert.match(accessSeeder, /softwarehouse-access-unblock-task-seeder/);
  assert.match(accessSeeder, /heartbeat\/invoke/);
  assert.match(accessSeeder, /wakeStatus = "invoked"/);
  assert.match(accessSeeder, /directWakeBoundaryForAgent/);
  assert.match(accessSeeder, /cross_agent_direct_invoke_forbidden/);
  assert.match(accessSeeder, /agentWipBlockerFor/);

  for (const source of [architectureSeeder, architectureMaterializer]) {
    assert.match(source, /SOAR_ACCEPTANCE_LEDGER_PATH/);
    assert.match(source, /owner_login_verified/);
    assert.match(source, /test_account_verified/);
    assert.match(source, /coolify_resources_reconciled/);
    assert.match(source, /blockingAcceptanceChecks/);
    assert.match(source, /noop_acceptance_ledger_gaps_before_architecture/);
    assert.match(source, /softwarehouse:access-unblock-tasks:apply/);
  }

  assert.match(acceptanceLedger, /protected-test-account-smoke-path/);
  assert.match(acceptanceLedger, /coolify-production-reconciler\.latest\.json/);
  assert.match(acceptanceLedger, /function coolifyResourceStatusCheck/);
  assert.match(acceptanceLedger, /unhealthy\|exited\|failed\|error/);
  assert.match(acceptanceLedger, /Coolify resource inventory found unhealthy resources/);
});

test("app completion index exposes full risk backlog counts when priority review rows are capped", async () => {
  const source = await readFile("scripts/build-app-completion-index.mjs", "utf8");

  assert.match(source, /const priorityReviewLimit = 200/);
  assert.match(source, /const riskItems = items\.filter\(\(item\) => item\.risk !== "ok"\)/);
  assert.match(source, /implementedNeedsProof/);
  assert.match(source, /appCompletionRiskItems/);
  assert.match(source, /priorityReviewTruncated: riskItems\.length > priorityItems\.length/);
});

test("local repair lane starter bounds API requests and degrades read failures", async () => {
  const source = await readFile("scripts/run-local-repair-lane-starter.mjs", "utf8");

  assert.match(source, /SOFTWAREHOUSE_LOCAL_REPAIR_REQUEST_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /SOFTWAREHOUSE_LOCAL_REPAIR_GOVERNOR_TIMEOUT_MS \?\? 30_000/);
  assert.match(source, /timedOut \? "api_timeout" : "api_error"/);
  assert.match(source, /action: "noop_api_unresponsive"/);
  assert.match(source, /ownerActionForApiFailure/);
  assert.match(source, /requestJson\(\{/);
  assert.match(source, /authToken/);
  assert.match(source, /runId/);
  assert.match(source, /refreshIssueByExactTitle/);
  assert.match(source, /issues\?q=\$\{encodeURIComponent\(title\)\}&limit=100/);
  assert.match(source, /findIssueByIdentifier/);
  assert.match(source, /\/api\/issues\/\$\{encodeURIComponent\(identifier\)\}/);
  assert.match(source, /issues\?q=\$\{encodeURIComponent\(identifier\)\}&limit=100/);
  assert.match(source, /apply_outcome_unknown/);
  assert.match(source, /wakeOutcome = "unknown"/);
});

test("control seeder WIP guard preserves parallelism for different agents", async () => {
  const source = await readFile("scripts/lib/agent-wip-guard.mjs", "utf8");

  assert.match(source, /busyAgentIds = new Set/);
  assert.match(source, /state\?\.busyAgentIds\?\.has\(agentId\)/);
  assert.match(source, /live-runs\?limit=50&minCount=0/);
  assert.match(source, /return null;/);
  assert.doesNotMatch(source, /activeRunCount > 0/);
});

test("access unblock seeder refreshes exact title matches before creating work", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /refreshIssueGroupByExactTitle/);
  assert.match(source, /issues\?q=\$\{encodeURIComponent\(title\)\}&limit=100/);
  assert.match(source, /status: wakeBlocker \? "backlog" : "todo"/);
});

test("access unblock seeder skips no-op updates for existing issues", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /function sameJson/);
  assert.match(source, /const patchNeeded =/);
  assert.match(source, /if \(!patchNeeded\) \{/);
  assert.match(source, /action: "kept_existing_issue"/);
});

test("access unblock seeder dedupes semantic Coolify operator lanes", async () => {
  const source = await readFile("scripts/run-access-unblock-task-seeder.mjs", "utf8");

  assert.match(source, /function semanticIssueKey/);
  assert.match(source, /operator:coolify:bind-read-only-production-status-access/);
  assert.match(source, /operator:coolify:confirm-expected-team-workspace/);
  assert.match(source, /ops:soar:reconcile-coolify-resource-inventory/);
  assert.match(source, /issuesBySemanticKey/);
  assert.match(source, /issuesBySemanticKey\.get\(semanticIssueKey\(input\.title\)\)/);
});

test("Coolify reconciler directly confirms configured resource ids", async () => {
  const source = await readFile("scripts/run-coolify-production-reconciler.mjs", "utf8");

  assert.match(source, /const directResourceRoutes = \[/);
  assert.match(source, /COOLIFY_SOAR_POSTGRES_RESOURCE_ID", "database", "\/api\/v1\/databases"/);
  assert.match(source, /COOLIFY_SOAR_REDIS_RESOURCE_ID", "database", "\/api\/v1\/databases"/);
  assert.match(source, /function summarizeDirectResource/);
  assert.match(source, /function uniqueResources/);
  assert.match(source, /summarizeDirectResource\(responses\.find/);
  assert.match(source, /function resolvePaperclipCoolifyEnvFallback/);
  assert.match(source, /shell: process\.platform === "win32" && !pnpmEntrypoint/);
  assert.doesNotMatch(source, /pnpm\.cmd/);
});

test("runtime gate repair binds complete Soar Coolify resource ids", async () => {
  const source = await readFile("scripts/repair-runtime-gate-bindings.mjs", "utf8");

  assert.match(source, /"LUC-30"/);
  assert.match(source, /COOLIFY_SOAR_APP_ID: "coolify_soar_app_id"/);
  assert.match(source, /COOLIFY_SOAR_PROJECT_UUID: "coolify_soar_project_uuid"/);
  assert.match(source, /COOLIFY_SOAR_WORKER_BACKTEST_APP_ID: "coolify_soar_worker_backtest_app_id"/);
  assert.match(source, /COOLIFY_SOAR_WORKER_EXECUTION_APP_ID: "coolify_soar_worker_execution_app_id"/);
  assert.match(source, /COOLIFY_SOAR_WORKER_MARKET_DATA_APP_ID: "coolify_soar_worker_market_data_app_id"/);
  assert.match(source, /COOLIFY_SOAR_WORKER_MARKET_STREAM_APP_ID: "coolify_soar_worker_market_stream_app_id"/);
  assert.match(source, /COOLIFY_SOAR_POSTGRES_RESOURCE_ID: "coolify_soar_postgres_resource_id"/);
  assert.match(source, /COOLIFY_SOAR_REDIS_RESOURCE_ID: "coolify_soar_redis_resource_id"/);
  assert.match(source, /COOLIFY_ROOST_APP_ID: "coolify_roost_app_id"/);
});

test("runtime gate repair binds smoke and safety refs for current delivery gates", async () => {
  const source = await readFile("scripts/repair-runtime-gate-bindings.mjs", "utf8");

  assert.match(source, /"LUC-31"/);
  assert.match(source, /SOAR_PROD_TEST_EMAIL: "soar_prod_test_email"/);
  assert.match(source, /ROOST_PROD_TEST_EMAIL: "roost_prod_test_email"/);
  assert.match(source, /SMOKE_AUTH_EMAIL: "smoke_auth_email"/);
  assert.match(source, /"LUC-32"/);
  assert.match(source, /COOLIFY_API_URL: "coolify_api_url"/);
  assert.match(source, /ROOST_PROD_TEST_API_BASE_URL: "roost_api_base_url"/);
});

test("runtime gate repair can update open non-terminal gates", async () => {
  const source = await readFile("scripts/repair-runtime-gate-bindings.mjs", "utf8");

  assert.match(source, /\["done", "cancelled"\]\.includes\(issue\.status\)/);
  assert.match(source, /reason: "gate_not_open"/);
  assert.doesNotMatch(source, /issue\.status !== "blocked"/);
});

test("runtime binding audits do not misclassify subscription controller coordination as Coolify work", async () => {
  for (const scriptPath of [
    "scripts/audit-luckysparrow-softwarehouse.mjs",
    "scripts/repair-runtime-binding-assignees.mjs",
  ]) {
    const source = await readFile(scriptPath, "utf8");
    assert.match(source, /companyAliases = \[companyName, "LuckySparrow"\]/);
    assert.match(source, /companyAliases\.includes\(candidate\.name\)/);
    assert.match(source, /subscription business readiness controller/);
    assert.doesNotMatch(source, /server health\|runtime/);
    assert.doesNotMatch(source, /"production deploy",\s+"deploy health",\s+"runtime, deployment"/);
    assert.match(source, /coolify resource/);
    assert.match(source, /requires coolify/);
  }
});

test("secret aliases collapse duplicate tracked gate secrets", () => {
  const secretByKey = new Map([
    ["prod_ui_audit_admin_token", {
      key: "prod_ui_audit_admin_token",
      status: "active",
      updatedAt: "2026-05-27T17:36:42.677Z",
    }],
  ]);
  const secrets = uniqueSecretsForKeys(secretByKey, [
    "smoke_auth_token",
    "prod_ui_audit_admin_token",
  ]);

  assert.deepEqual(secrets.map((secret) => secret.key), ["prod_ui_audit_admin_token"]);
});

test("secret aliases resolve supplied Coolify refs into legacy gate names", () => {
  const suppliedKeys = [
    "coolify_read_api_token",
    "coolify_team_id_luckysparrow",
    "coolify_project_id_soar",
    "coolify_project_uuid_soar",
    "coolify_environment_uuid_soar_production",
    "coolify_resource_uuid_soar_web",
    "coolify_resource_uuid_soar_api",
    "coolify_resource_uuid_soar_worker_backtest",
    "coolify_resource_uuid_soar_worker_execution",
    "coolify_resource_uuid_soar_worker_market_data",
    "coolify_resource_uuid_soar_worker_market_stream",
    "coolify_database_uuid_soar_postgresql",
    "coolify_database_uuid_soar_redis",
  ];
  const secretByKey = new Map(suppliedKeys.map((key) => [key, { key }]));

  assert.equal(secretForKey(secretByKey, "coolify_api_token")?.key, "coolify_read_api_token");
  assert.equal(secretForKey(secretByKey, "coolify_soar_team_id")?.key, "coolify_team_id_luckysparrow");
  assert.equal(secretForKey(secretByKey, "coolify_soar_project_id")?.key, "coolify_project_id_soar");
  assert.equal(secretForKey(secretByKey, "coolify_soar_project_uuid")?.key, "coolify_project_uuid_soar");
  assert.equal(secretForKey(secretByKey, "coolify_soar_production_environment")?.key, "coolify_environment_uuid_soar_production");
  assert.equal(secretForKey(secretByKey, "coolify_soar_web_app_id")?.key, "coolify_resource_uuid_soar_web");
  assert.equal(secretForKey(secretByKey, "coolify_soar_api_app_id")?.key, "coolify_resource_uuid_soar_api");
  assert.equal(secretForKey(secretByKey, "coolify_soar_worker_backtest_app_id")?.key, "coolify_resource_uuid_soar_worker_backtest");
  assert.equal(secretForKey(secretByKey, "coolify_soar_worker_execution_app_id")?.key, "coolify_resource_uuid_soar_worker_execution");
  assert.equal(secretForKey(secretByKey, "coolify_soar_worker_market_data_app_id")?.key, "coolify_resource_uuid_soar_worker_market_data");
  assert.equal(secretForKey(secretByKey, "coolify_soar_worker_market_stream_app_id")?.key, "coolify_resource_uuid_soar_worker_market_stream");
  assert.equal(secretForKey(secretByKey, "coolify_soar_postgres_resource_id")?.key, "coolify_database_uuid_soar_postgresql");
  assert.equal(secretForKey(secretByKey, "coolify_soar_redis_resource_id")?.key, "coolify_database_uuid_soar_redis");
});

test("active direct blocker wins over stale blocker attention sample", () => {
  const issue = {
    identifier: "LUC-12",
    blockedBy: [
      {
        identifier: "LUC-30",
        status: "blocked",
      },
    ],
    blockerAttention: {
      sampleBlockerIdentifier: "LUC-23",
    },
  };

  assert.equal(rootBlockerIdentifierFor(issue), "LUC-30");
});

test("gate issue discovery falls back to exact identifier search for roots outside the bulk page", async () => {
  const bulkIssues = [
    { id: "issue-newer", identifier: "LUC-999", title: "Newer issue" },
  ];
  const requests = [];

  const byIdentifier = await resolveIssuesByIdentifier({
    companyId: "company-1",
    identifiers: ["LUC-30", "LUC-31"],
    issues: bulkIssues,
    request: async (method, route) => {
      requests.push({ method, route });
      if (route.startsWith("/api/issues/")) {
        throw new Error("direct lookup unavailable");
      }
      if (route.includes("q=LUC-30")) {
        return { value: [
          { id: "wrong-partial", identifier: "LUC-300", title: "Partial match" },
          { id: "gate-deploy", identifier: "LUC-30", title: "Deployment gate" },
        ] };
      }
      if (route.includes("q=LUC-31")) {
        return [
          { id: "gate-readiness", identifier: "LUC-31", title: "Readiness gate" },
        ];
      }
      return [];
    },
  });

  assert.equal(byIdentifier.get("LUC-30")?.id, "gate-deploy");
  assert.equal(byIdentifier.get("LUC-31")?.id, "gate-readiness");
  assert.deepEqual(requests, [
    { method: "GET", route: "/api/issues/LUC-30" },
    { method: "GET", route: "/api/companies/company-1/issues?q=LUC-30&limit=20" },
    { method: "GET", route: "/api/issues/LUC-31" },
    { method: "GET", route: "/api/companies/company-1/issues?q=LUC-31&limit=20" },
  ]);
});

test("gate issue discovery prefers direct identifier lookup for canonical roots", async () => {
  const requests = [];
  const byIdentifier = await resolveIssuesByIdentifier({
    companyId: "company-1",
    identifiers: ["LUC-30"],
    issues: [],
    request: async (method, route) => {
      requests.push({ method, route });
      return { id: "gate-deploy", companyId: "company-1", identifier: "LUC-30", title: "Deployment gate" };
    },
  });

  assert.equal(byIdentifier.get("LUC-30")?.id, "gate-deploy");
  assert.deepEqual(requests, [
    { method: "GET", route: "/api/issues/LUC-30" },
  ]);
});

test("gate issue discovery skips failed exact searches without aborting later roots", async () => {
  const requests = [];
  const byIdentifier = await resolveIssuesByIdentifier({
    companyId: "company-1",
    identifiers: ["LUC-30", "LUC-31"],
    issues: [],
    request: async (method, route) => {
      requests.push({ method, route });
      if (route.startsWith("/api/issues/")) {
        throw new Error("direct lookup unavailable");
      }
      if (route.includes("q=LUC-30")) {
        throw new Error("search timed out");
      }
      if (route.includes("q=LUC-31")) {
        return [
          { id: "gate-readiness", identifier: "LUC-31", title: "Readiness gate" },
        ];
      }
      return [];
    },
  });

  assert.equal(byIdentifier.has("LUC-30"), false);
  assert.equal(byIdentifier.get("LUC-31")?.id, "gate-readiness");
  assert.deepEqual(requests, [
    { method: "GET", route: "/api/issues/LUC-30" },
    { method: "GET", route: "/api/companies/company-1/issues?q=LUC-30&limit=20" },
    { method: "GET", route: "/api/issues/LUC-31" },
    { method: "GET", route: "/api/companies/company-1/issues?q=LUC-31&limit=20" },
  ]);
});

test("control brief turns stale delivery gates into owner actions", () => {
  const brief = gateBriefFor({
    project: "Soar/Roost",
    rootBlocker: "LUC-31",
    owner: "QA & Verification Engineer",
    latestEvidence: {
      updatedAt: "2026-05-27T01:53:10.873Z",
      summary: "Missing approved smoke account for protected production readiness.",
    },
    operatorPrompt: "Confirm credentials or approve one recheck.",
    approvalDryRunCommand: "node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-31",
    approvalApplyCommand: "node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-31 --apply",
  }, new Date("2026-05-27T18:53:10.873Z").getTime());

  assert.equal(brief.stale, true);
  assert.equal(brief.waitAgeHours, 17);
  assert.match(brief.ownerAction, /Escalate to QA & Verification Engineer/);
  assert.match(staleGateOwnerActionLine(brief), /Stale gate owner action: Soar\/Roost LUC-31/);
});

test("control brief keeps recent delivery gates in monitoring mode", () => {
  const brief = gateBriefFor({
    project: "Soar",
    rootBlocker: "LUC-30",
    owner: "Deployment & Reliability Engineer",
    latestEvidence: {
      updatedAt: "2026-05-27T17:36:39.773Z",
      summary: "- FAIL: `API /workers/ready -> 401`",
    },
  }, new Date("2026-05-27T18:36:39.773Z").getTime());

  assert.equal(brief.stale, false);
  assert.equal(brief.waitAgeHours, 1);
  assert.match(brief.ownerAction, /Keep monitoring LUC-30/);
});

test("delivery permission blocks protected delivery while waiting for gate facts", () => {
  const permission = deliveryPermissionForMode("wait_for_gate_fact", 2);

  assert.equal(permission.protectedDeliveryAllowed, false);
  assert.equal(permission.projectRepoMutationAllowed, false);
  assert.equal(permission.canStartNewLane, false);
  assert.deepEqual(permission.allowedLaneTypes, [
    "control_packet_refresh",
    "stale_gate_owner_escalation",
    "source_control_classification",
    "safe_architecture_planning",
    "infrastructure_gate_diagnosis",
    "paperclip_os_process_improvement",
  ]);
});

test("delivery permission allows local source-control closure without protected delivery", () => {
  const permission = deliveryPermissionForMode("source_control_closure", 0);

  assert.equal(permission.protectedDeliveryAllowed, false);
  assert.equal(permission.projectRepoMutationAllowed, true);
  assert.equal(permission.canStartNewLane, true);
  assert.deepEqual(permission.allowedLaneTypes, [
    "source_control_classification",
    "local_validation",
    "local_commit_closure",
  ]);
  assert.match(permission.reason, /protected gates still block push/i);
});

test("delivery permission allows local repair lanes while protected gates remain blocked", () => {
  const permission = deliveryPermissionForMode("local_repair_lane", 2);

  assert.equal(permission.protectedDeliveryAllowed, false);
  assert.equal(permission.projectRepoMutationAllowed, true);
  assert.equal(permission.canStartNewLane, true);
  assert.deepEqual(permission.allowedLaneTypes, [
    "one_owner_evidence_lane",
    "local_validation",
    "local_commit_closure",
  ]);
  assert.match(permission.reason, /local repair lanes may mutate project repos/i);
});

test("delivery permission allows protected delivery only in ready mode without blocked gates", () => {
  const ready = deliveryPermissionForMode("ready_for_next_lane", 0);
  const stillBlocked = deliveryPermissionForMode("ready_for_next_lane", 1);

  assert.equal(ready.protectedDeliveryAllowed, true);
  assert.equal(ready.projectRepoMutationAllowed, true);
  assert.equal(ready.canStartNewLane, true);
  assert.equal(stillBlocked.protectedDeliveryAllowed, false);
});

test("autonomy disposition distinguishes intentional gate hold from delivery idle", () => {
  assert.equal(autonomyDispositionForMode("wait_for_gate_fact"), "intentional_gate_hold");
  assert.equal(autonomyDispositionForMode("ready_for_next_lane"), "delivery_lane_allowed");
  assert.equal(autonomyDispositionForMode("supervise_live_work"), "live_work_supervision");
  assert.equal(autonomyDispositionForMode("local_repair_lane"), "local_repair_allowed");
});

test("control action classification separates executable lanes from context", () => {
  assert.equal(controlActionTypeFor("Refresh control tick, source-control packet, and unblock packet."), "control_packet_refresh");
  assert.equal(controlActionTypeFor("Stale gate owner action: Soar/Roost LUC-31 has waited 17h."), "stale_gate_owner_escalation");
  assert.equal(controlActionTypeFor("Classify Soar source-control project-docs lane only: review docs."), "source_control_classification");
  assert.equal(controlActionTypeFor("Seed safe architecture planning lane from Soar architecture docs."), "safe_architecture_planning");
  assert.equal(controlActionTypeFor("Seed infrastructure gate diagnosis lane for Soar/Roost LUC-30."), "infrastructure_gate_diagnosis");
  assert.equal(controlActionTypeFor("Gate fact needed: Soar/Roost LUC-30"), "context_or_guardrail");

  const summary = controlActionSummaryFor([
    "Refresh control tick, source-control packet, and unblock packet.",
    "Stale gate owner action: Soar/Roost LUC-31 has waited 17h.",
    "Classify Soar source-control project-docs lane only: review docs.",
    "Seed safe architecture planning lane from Soar architecture docs.",
    "Seed infrastructure gate diagnosis lane for Soar/Roost LUC-30.",
    "Gate fact needed: Soar/Roost LUC-30",
  ], ["control_packet_refresh", "stale_gate_owner_escalation", "source_control_classification", "safe_architecture_planning", "infrastructure_gate_diagnosis"]);

  assert.equal(summary.allowedActionCount, 5);
  assert.equal(summary.contextOrGuardrailCount, 1);
});

test("local repair lane actions are classified as executable work", () => {
  const summary = controlActionSummaryFor([
    "Start or assign the highest-priority runnable issue with one owner, one scope, and one evidence contract.",
    "Require local validation before any commit; do not push, deploy, restart, run protected smoke, or disclose secrets.",
  ], ["one_owner_evidence_lane", "local_validation", "local_commit_closure"]);

  assert.equal(summary.actions[0].type, "one_owner_evidence_lane");
  assert.equal(summary.allowedActionCount, 1);
  assert.equal(summary.contextOrGuardrailCount, 1);
});

test("supervision actions remain allowed while a narrower lane type is active", () => {
  const summary = controlActionSummaryFor([
    "Supervise active runs and do not start duplicate work.",
    "Verify and commit/classify Paperclip OS changes before broad delivery.",
  ], ["paperclip_os_closure"]);

  assert.equal(summary.actions[0].type, "supervision_only");
  assert.equal(summary.actions[0].allowedByDeliveryPermission, true);
  assert.equal(summary.actions[1].allowedByDeliveryPermission, true);
  assert.equal(summary.allowedActionCount, 2);
});
