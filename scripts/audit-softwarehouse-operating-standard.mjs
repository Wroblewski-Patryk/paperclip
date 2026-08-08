#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  auditProtectedAccessLaneEntryDocuments,
  protectedAccessLaneEntryDocPaths,
} from "./lib/protected-access-lane-entry-contract.mjs";

const repoRoot = process.cwd();
const defaultCompanyId = "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const companyId = process.env.PAPERCLIP_COMPANY_ID || defaultCompanyId;
const companyIdSource = process.env.PAPERCLIP_COMPANY_ID ? "PAPERCLIP_COMPANY_ID" : "LuckySparrow Software House default";
const repoManagedHome = path.join(repoRoot, ".paperclip", "runtime", "home");
const userHome = path.join(process.env.USERPROFILE || "", ".paperclip");
const home = process.env.PAPERCLIP_HOME || (existsSync(repoManagedHome) ? repoManagedHome : userHome);
const homeSource = process.env.PAPERCLIP_HOME
  ? "PAPERCLIP_HOME"
  : existsSync(repoManagedHome)
    ? "repo_managed_runtime"
    : "user_home_fallback";
const instanceId = process.env.PAPERCLIP_INSTANCE_ID || "default";
const agentRoot = path.join(home, "instances", instanceId, "companies", companyId, "agents");
const rosterPath = path.join(repoRoot, "softwarehouse/agent-roster.json");
const sourceInstructionsRoot = path.join(repoRoot, "softwarehouse/instructions");
const sourceSharedRoot = path.join(sourceInstructionsRoot, "shared");
const sourceRolesRoot = path.join(sourceInstructionsRoot, "roles");

const requiredDocs = [
  "docs/softwarehouse/00-operating-model.md",
  "docs/softwarehouse/01-process-map.md",
  "docs/softwarehouse/02-roles-and-agents.md",
  "docs/softwarehouse/03-delivery-workflow.md",
  "docs/softwarehouse/04-definition-of-ready.md",
  "docs/softwarehouse/05-definition-of-done.md",
  "docs/softwarehouse/06-quality-gates.md",
  "docs/softwarehouse/07-security-standard.md",
  "docs/softwarehouse/08-devops-and-release.md",
  "docs/softwarehouse/09-documentation-standard.md",
  "docs/softwarehouse/10-metrics-and-pdca.md",
  "docs/softwarehouse/11-agent-handoff-rules.md",
  "docs/softwarehouse/12-incident-and-bugfix-process.md",
  "docs/softwarehouse/13-continuous-improvement.md",
  "docs/softwarehouse/17-knowledge-governance.md",
  "docs/softwarehouse/agent-audit.md",
  "docs/softwarehouse/implementation-report.md",
  "docs/softwarehouse/templates/task-template.md",
  "docs/softwarehouse/templates/bug-report-template.md",
  "docs/softwarehouse/templates/feature-spec-template.md",
  "docs/softwarehouse/templates/work-report-template.md",
  "docs/softwarehouse/templates/adr-template.md",
  "docs/softwarehouse/templates/qa-checklist-template.md",
  "docs/softwarehouse/templates/release-checklist-template.md",
  "docs/softwarehouse/templates/agent-role-template.md",
];

const requiredProcessDocs = [
  "softwarehouse/operating-processes.md",
  "softwarehouse/instructions/common-operating-context.md",
  "softwarehouse/instructions/shared/95-operating-processes.md",
];

const requiredDocTerms = [
  "PDCA",
  "APQC",
  "Definition of Ready",
  "Definition of Done",
  "quality gates",
  "handoff",
  "security",
  "release",
  "DORA",
  "ADR",
  "Knowledge governance",
];

const requiredProcessTerms = [
  "company control loop",
  "project no-stall loop",
  "delivery gap loop",
  "agent health and model governance",
  "board janitor",
  "regression evidence loop",
  "release/deploy gate",
  "docs/memory loop",
  "portfolio index refresh",
  "retrospective/template loop",
  "talent/capability loop",
];

const requiredPromptTerms = [
  "PDCA",
  "APQC-style",
  "Definition of Ready",
  "Definition of Done",
  "quality gates",
  "work-report evidence",
];

const requiredRoleTerms = ["Responsibilities", "Done Means"];
const requiredBundleEntryTerms = [
  "do not preload the knowledge bundle",
  "The native run context is the current role/hierarchy/permission authority",
  "files below are references, not bootstrap",
];
const requiredReferenceFiles = [
  "agent-activation-governance.md",
  "company-operating-model.md",
  "cost-token-and-context-efficiency.md",
  "delegation-and-reporting-contract.md",
  "delivery-closure-loop.md",
  "departments-and-naming.md",
  "end-to-end-operating-flow.md",
  "gap-detection-and-learning-packets.md",
  "goal-and-routine-governance.md",
  "hiring-and-agent-governance.md",
  "innovation-to-product-lifecycle.md",
  "learning-and-self-correction.md",
  "owner-direction-and-proposal-loop.md",
  "owner-interface-and-language-policy.md",
  "paperclip-operating-mechanics.md",
  "procedures-and-task-lifecycle.md",
  "product-architecture-source-of-truth.md",
  "resource-and-github-policy.md",
  "secrets-deploy-evidence.md",
  "standards.md",
];
const requiredReferenceTerms = [
  "Current Stage 1 Mission",
  "LUC-25",
  "Paperclip Operation Contract",
  "paperclipCreateIssue",
  "paperclipCheckoutIssue",
  "request_confirmation",
];

function readIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function parseJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeText(text) {
  return String(text ?? "").toLowerCase();
}

const findings = [];
for (const relativePath of requiredDocs) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    findings.push({ severity: "error", type: "missing_doc", path: relativePath });
  }
}

for (const relativePath of requiredProcessDocs) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    findings.push({ severity: "error", type: "missing_process_doc", path: relativePath });
  }
}

const combinedDocs = requiredDocs
  .map((relativePath) => readIfExists(path.join(repoRoot, relativePath)))
  .join("\n");

const combinedProcessDocs = requiredProcessDocs
  .map((relativePath) => readIfExists(path.join(repoRoot, relativePath)))
  .join("\n");

for (const term of requiredDocTerms) {
  if (!combinedDocs.includes(term)) {
    findings.push({ severity: "error", type: "missing_standard_term", term });
  }
}

for (const term of requiredProcessTerms) {
  if (!normalizeText(combinedProcessDocs).includes(normalizeText(term))) {
    findings.push({ severity: "error", type: "missing_process_term", term });
  }
}

const protectedAccessLaneEntryDocuments = Object.fromEntries(
  protectedAccessLaneEntryDocPaths.map((relativePath) => [
    relativePath,
    readIfExists(path.join(repoRoot, relativePath)),
  ]),
);
findings.push(...auditProtectedAccessLaneEntryDocuments(protectedAccessLaneEntryDocuments));

let rosterAgentCount = 0;
let sourceRoleFilesExpected = 0;
let sourceRoleFilesPresent = 0;
let roleMapEntriesCovered = 0;
let rosterAgents = [];
const rosterAgentsByKey = new Map();
const roleMapText = readIfExists(path.join(repoRoot, "docs/softwarehouse/02-roles-and-agents.md"));
const sharedFiles = existsSync(sourceSharedRoot)
  ? (await readdir(sourceSharedRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort()
  : [];

if (!existsSync(rosterPath)) {
  findings.push({ severity: "error", type: "missing_roster", path: "softwarehouse/agent-roster.json" });
} else {
  const roster = parseJsonFile(rosterPath);
  rosterAgents = Array.isArray(roster.agents) ? roster.agents : [];
  rosterAgentCount = rosterAgents.length;

  for (const agent of rosterAgents) {
    if (!agent.key) {
      findings.push({ severity: "error", type: "roster_agent_missing_key", agent });
      continue;
    }
    rosterAgentsByKey.set(agent.key, agent);
    sourceRoleFilesExpected += 1;

    const roleRelativePath = `softwarehouse/instructions/roles/${agent.key}.md`;
    const roleAbsolutePath = path.join(sourceRolesRoot, `${agent.key}.md`);
    const roleText = readIfExists(roleAbsolutePath);
    if (!roleText) {
      findings.push({ severity: "error", type: "missing_source_role_file", agentKey: agent.key, path: roleRelativePath });
    } else {
      sourceRoleFilesPresent += 1;
      const missingRoleTerms = requiredRoleTerms.filter((term) => !roleText.includes(term));
      if (missingRoleTerms.length > 0) {
        findings.push({
          severity: "error",
          type: "source_role_file_missing_contract_terms",
          agentKey: agent.key,
          path: roleRelativePath,
          missingTerms: missingRoleTerms,
        });
      }
    }

    const roleMapNeedles = [agent.name, agent.title, agent.key].filter(Boolean).map(normalizeText);
    if (roleMapNeedles.some((needle) => normalizeText(roleMapText).includes(needle))) {
      roleMapEntriesCovered += 1;
    } else {
      findings.push({
        severity: "error",
        type: "role_map_missing_roster_agent",
        agentKey: agent.key,
        agentName: agent.name,
        path: "docs/softwarehouse/02-roles-and-agents.md",
      });
    }
  }
}

let agentCount = 0;
let agentsWithStandard = 0;
let agentsWithBundleEntry = 0;
let agentsWithRoleMetadata = 0;
if (existsSync(agentRoot)) {
  const agentDirs = (await readdir(agentRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  agentCount = agentDirs.length;
  for (const entry of agentDirs) {
    const instructionsRoot = path.join(agentRoot, entry.name, "instructions");
    const sharedRoot = path.join(instructionsRoot, "shared");
    const rolesRoot = path.join(instructionsRoot, "roles");
    const referencesRoot = path.join(instructionsRoot, "references");
    const bundleEntryText = readIfExists(path.join(instructionsRoot, "AGENTS.md"));
    const metadataText = readIfExists(path.join(instructionsRoot, "metadata.md"));
    const sharedPromptText = [
      readIfExists(path.join(sharedRoot, "50-responsibility-boundaries.md")),
      readIfExists(path.join(sharedRoot, "95-operating-processes.md")),
    ].join("\n");
    const referencePromptText = [
      readIfExists(path.join(referencesRoot, "standards.md")),
      readIfExists(path.join(referencesRoot, "end-to-end-operating-flow.md")),
      readIfExists(path.join(referencesRoot, "paperclip-operating-mechanics.md")),
      readIfExists(path.join(referencesRoot, "procedures-and-task-lifecycle.md")),
    ].join("\n");
    const hasReferenceLayout = existsSync(referencesRoot) && !existsSync(sharedRoot);
    const promptText = hasReferenceLayout ? referencePromptText : sharedPromptText;
    const normalizedPromptText = normalizeText(promptText);
    const missingTerms = requiredPromptTerms.filter((term) => !normalizedPromptText.includes(normalizeText(term)));
    if (missingTerms.length === 0) {
      agentsWithStandard += 1;
    } else {
      findings.push({
        severity: "error",
        type: "agent_prompt_missing_standard",
        agentDirectory: entry.name,
        missingTerms,
      });
    }

    const missingBundleTerms = requiredBundleEntryTerms.filter((term) => !bundleEntryText.includes(term));
    const missingSharedReferences = sharedFiles.filter((fileName) => !bundleEntryText.includes(`shared/${fileName}`));
    const missingReferenceFiles = requiredReferenceFiles.filter((fileName) => !existsSync(path.join(referencesRoot, fileName)));
    const missingReferenceEntryLinks = requiredReferenceFiles.filter((fileName) => !bundleEntryText.includes(`references/${fileName}`));
    const missingReferenceTerms = requiredReferenceTerms.filter((term) => !(bundleEntryText + "\n" + referencePromptText).includes(term));
    const roleReferenceMatch = bundleEntryText.match(/roles\/([a-z0-9-]+\.md)/);
    const roleFileName = roleReferenceMatch?.[1] ?? null;
    const roleKey = roleFileName ? roleFileName.replace(/\.md$/, "") : null;
    const roleFileText = roleFileName ? readIfExists(path.join(rolesRoot, roleFileName)) : "";
    const yamlNameMatch = bundleEntryText.match(/^name:\s*(.+)$/m);
    const inlineAgentName = yamlNameMatch?.[1]?.trim() ?? null;
    const inlineRosterAgent = inlineAgentName ? rosterAgents.find((agent) => agent.name === inlineAgentName) : null;
    const roleFiles = existsSync(rolesRoot)
      ? (await readdir(rolesRoot, { withFileTypes: true }))
          .filter((roleEntry) => roleEntry.isFile() && roleEntry.name.endsWith(".md"))
          .map((roleEntry) => roleEntry.name)
          .sort()
      : [];

    if (hasReferenceLayout) {
      if (
        missingReferenceFiles.length === 0 &&
        missingReferenceEntryLinks.length === 0 &&
        missingReferenceTerms.length === 0 &&
        inlineRosterAgent &&
        !bundleEntryText.includes("## Stage 0 Guard")
      ) {
        agentsWithBundleEntry += 1;
      } else {
        findings.push({
          severity: "error",
          type: "agent_reference_bundle_drift",
          agentDirectory: entry.name,
          missingReferenceFiles,
          missingReferenceEntryLinks,
          missingReferenceTerms,
          staleStage0Guard: bundleEntryText.includes("## Stage 0 Guard"),
          inlineAgentName,
        });
      }
    } else if (
      missingBundleTerms.length === 0 &&
      missingSharedReferences.length === 0 &&
      roleFileName &&
      roleFileText &&
      roleFiles.length === 1 &&
      roleFiles[0] === roleFileName
    ) {
      agentsWithBundleEntry += 1;
    } else {
      findings.push({
        severity: "error",
        type: "agent_bundle_entry_drift",
        agentDirectory: entry.name,
        missingTerms: missingBundleTerms,
        missingSharedReferences,
        missingRoleReference: !roleFileName,
        missingRoleFile: Boolean(roleFileName && !roleFileText),
        roleFiles,
      });
    }

    const metadataKeyMatch = metadataText.match(/Agent key:\s*([^\r\n]+)/);
    const metadataNameMatch = metadataText.match(/Agent name:\s*([^\r\n]+)/);
    const metadataKey = metadataKeyMatch?.[1]?.trim();
    const metadataName = metadataNameMatch?.[1]?.trim();
    const rosterAgent = hasReferenceLayout ? inlineRosterAgent : (roleKey ? rosterAgentsByKey.get(roleKey) : null);
    if (
      hasReferenceLayout
        ? Boolean(inlineRosterAgent)
        : Boolean(roleKey && metadataKey === roleKey && rosterAgent && metadataName === rosterAgent.name)
    ) {
      agentsWithRoleMetadata += 1;
    } else {
      findings.push({
        severity: "error",
        type: "agent_role_metadata_drift",
        agentDirectory: entry.name,
        roleKey,
        metadataKey,
        metadataName,
        expectedName: rosterAgent?.name ?? null,
      });
    }
  }
} else {
  findings.push({ severity: "error", type: "agent_root_missing", path: agentRoot });
}

if (existsSync(agentRoot) && rosterAgentCount > 0 && agentCount < rosterAgentCount) {
  findings.push({
    severity: "error",
    type: "agent_root_incomplete",
    path: agentRoot,
    agentCount,
    rosterAgentCount,
  });
}

const result = {
  ok: findings.every((finding) => finding.severity !== "error"),
  repoRoot,
  companyId,
  companyIdSource,
  homeSource,
  agentRoot,
  requiredDocs: requiredDocs.length,
  requiredProcessDocs: requiredProcessDocs.length,
  requiredProcessTerms: requiredProcessTerms.length,
  protectedAccessLaneEntryDocs: protectedAccessLaneEntryDocPaths.length,
  requiredSharedFiles: sharedFiles.length,
  rosterAgentCount,
  sourceRoleFilesExpected,
  sourceRoleFilesPresent,
  roleMapEntriesCovered,
  agentCount,
  agentsWithStandard,
  agentsWithBundleEntry,
  agentsWithRoleMetadata,
  findings,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok ? 0 : 1;
