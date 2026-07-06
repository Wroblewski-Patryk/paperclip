import { access, readdir, readFile } from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId =
  process.env.PAPERCLIP_COMPANY_ID ??
  "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const instanceName = process.env.PAPERCLIP_INSTANCE_NAME ?? "default";
const userInstanceRoot =
  process.env.PAPERCLIP_INSTANCE_ROOT ??
  path.join(os.homedir(), ".paperclip", "instances", instanceName);
const repoRuntimeMirrorRoot =
  process.env.PAPERCLIP_RUNTIME_MIRROR_ROOT ??
  path.join(repoRoot, ".paperclip", "runtime", "home", "instances", instanceName);

const activeCompanyAgentsRoot = path.join(userInstanceRoot, "companies", companyId, "agents");
const mirrorCompanyAgentsRoot = path.join(repoRuntimeMirrorRoot, "companies", companyId, "agents");

const minMarkdownFiles = Number(process.env.SOFTWAREHOUSE_AGENT_INSTRUCTION_MIN_MD_FILES ?? 8);
const minInstructionBytes = Number(process.env.SOFTWAREHOUSE_AGENT_INSTRUCTION_MIN_BYTES ?? 8_000);

const signalChecks = [
  {
    key: "persona",
    pattern: /persona|personality|identity|working profile|voice|tone|role scope|osobowo|tożsamość/i,
  },
  {
    key: "scope",
    pattern: /scope|boundary|out.of.scope|workspace|Soar|Roost|allowed root|granice|zakres/i,
  },
  {
    key: "evidence",
    pattern: /evidence|artifact|work product|definition of done|verification|smoke|dowod|dowód/i,
  },
  {
    key: "safety",
    pattern: /secret|security|privacy|approval|destructive|safety|bezpiec|sekret/i,
  },
  {
    key: "model",
    pattern: /model|router|quota|limit|lane|gpt|codex|cost/i,
  },
  {
    key: "hierarchy",
    pattern: /reports|manager|org|hierarchy|parent|child|delegat|reporting|przełoż/i,
  },
];

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function request(route) {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${route}`, {
    headers: { "content-type": "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`GET ${route} failed with ${response.status}: ${text}`);
  }
  return data?.value ?? data;
}

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function rel(targetPath, root) {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function expectedInstructionPaths(agent) {
  const activeRoot =
    agent.adapterConfig?.instructionsRootPath ??
    path.join(activeCompanyAgentsRoot, agent.id, "instructions");
  const activeEntry =
    agent.adapterConfig?.instructionsFilePath ??
    path.join(activeRoot, agent.adapterConfig?.instructionsEntryFile ?? "AGENTS.md");
  const mirrorRoot = path.join(mirrorCompanyAgentsRoot, agent.id, "instructions");
  const mirrorEntry = path.join(mirrorRoot, "AGENTS.md");
  return {
    activeRoot: path.resolve(activeRoot),
    activeEntry: path.resolve(activeEntry),
    mirrorRoot: path.resolve(mirrorRoot),
    mirrorEntry: path.resolve(mirrorEntry),
  };
}

function extractFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? "";
}

function roleNameFragment(agent) {
  const name = String(agent.name ?? "").split("(")[0]?.trim();
  return name && name.length >= 3 ? name.toLowerCase() : "";
}

const agents = await request(`/api/companies/${companyId}/agents`);
if (!Array.isArray(agents)) {
  throw new Error("Paperclip agents response did not contain an array");
}

const activeAgents = agents.filter((agent) => agent.status !== "terminated");
const failures = [];
const warnings = [];
const rows = [];
const hashToAgentNames = new Map();

for (const agent of activeAgents) {
  const paths = expectedInstructionPaths(agent);
  const activeRootExists = await exists(paths.activeRoot);
  const activeEntryExists = await exists(paths.activeEntry);
  const mirrorRootExists = await exists(paths.mirrorRoot);
  const mirrorEntryExists = await exists(paths.mirrorEntry);

  if (!activeRootExists) {
    failures.push({
      code: "agent_instruction_root_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.activeRoot,
    });
    rows.push({
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      activeRoot: paths.activeRoot,
      exists: false,
    });
    continue;
  }

  if (!activeEntryExists) {
    failures.push({
      code: "agent_instruction_entry_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.activeEntry,
    });
  }

  if (!mirrorRootExists || !mirrorEntryExists) {
    warnings.push({
      code: "agent_instruction_mirror_missing",
      agentId: agent.id,
      agentName: agent.name,
      rootExists: mirrorRootExists,
      entryExists: mirrorEntryExists,
      path: paths.mirrorRoot,
    });
  }

  const markdownFiles = (await walkFiles(paths.activeRoot))
    .filter((filePath) => filePath.toLowerCase().endsWith(".md"))
    .sort((a, b) => rel(a, paths.activeRoot).localeCompare(rel(b, paths.activeRoot)));
  const fileTexts = await Promise.all(
    markdownFiles.map(async (filePath) => ({
      filePath,
      relativePath: rel(filePath, paths.activeRoot),
      text: await readFile(filePath, "utf8"),
    })),
  );
  const bundleText = fileTexts
    .map((file) => `--- ${file.relativePath} ---\n${file.text}`)
    .join("\n\n");
  const entryText = activeEntryExists ? await readFile(paths.activeEntry, "utf8") : "";
  const bundleHash = hashText(bundleText);
  const frontMatter = extractFrontMatter(entryText);
  const relativeFiles = fileTexts.map((file) => file.relativePath);

  hashToAgentNames.set(bundleHash, [
    ...(hashToAgentNames.get(bundleHash) ?? []),
    agent.name,
  ]);

  const missingSignals = signalChecks
    .filter((check) => !check.pattern.test(bundleText) && !relativeFiles.some((file) => check.pattern.test(file)))
    .map((check) => check.key);
  const nameFragment = roleNameFragment(agent);
  const frontMatterHasName = nameFragment ? frontMatter.toLowerCase().includes(nameFragment) : false;

  if (markdownFiles.length < minMarkdownFiles) {
    failures.push({
      code: "agent_instruction_bundle_too_small",
      agentId: agent.id,
      agentName: agent.name,
      fileCount: markdownFiles.length,
      minimum: minMarkdownFiles,
    });
  }
  if (Buffer.byteLength(bundleText, "utf8") < minInstructionBytes) {
    failures.push({
      code: "agent_instruction_bundle_too_short",
      agentId: agent.id,
      agentName: agent.name,
      bytes: Buffer.byteLength(bundleText, "utf8"),
      minimum: minInstructionBytes,
    });
  }
  for (const signal of missingSignals) {
    failures.push({
      code: "agent_instruction_signal_missing",
      signal,
      agentId: agent.id,
      agentName: agent.name,
    });
  }
  if (!frontMatterHasName) {
    warnings.push({
      code: "agent_instruction_frontmatter_name_not_role_specific",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.activeEntry,
    });
  }

  rows.push({
    agentId: agent.id,
    agentName: agent.name,
    status: agent.status,
    activeRoot: paths.activeRoot,
    mirrorRoot: paths.mirrorRoot,
    exists: true,
    bundleHash,
    markdownFileCount: markdownFiles.length,
    bytes: Buffer.byteLength(bundleText, "utf8"),
    missingSignals,
    frontMatterHasName,
    files: relativeFiles,
  });
}

for (const [bundleHash, names] of hashToAgentNames.entries()) {
  if (names.length > 1) {
    failures.push({
      code: "agent_instruction_bundle_duplicate",
      bundleHash,
      agentNames: names,
    });
  }
}

const result = {
  overall: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  apiBase,
  companyId,
  thresholds: {
    minMarkdownFiles,
    minInstructionBytes,
  },
  roots: {
    activeCompanyAgentsRoot: path.resolve(activeCompanyAgentsRoot),
    mirrorCompanyAgentsRoot: path.resolve(mirrorCompanyAgentsRoot),
  },
  agents: {
    total: activeAgents.length,
    audited: rows.length,
    uniqueInstructionBundles: hashToAgentNames.size,
    missingInstructionRoots: failures.filter((failure) => failure.code === "agent_instruction_root_missing").length,
    duplicateInstructionBundles: failures.filter((failure) => failure.code === "agent_instruction_bundle_duplicate").length,
    minimumMarkdownFileCount: Math.min(...rows.filter((row) => row.exists).map((row) => row.markdownFileCount)),
    minimumBundleBytes: Math.min(...rows.filter((row) => row.exists).map((row) => row.bytes)),
  },
  signalCoverage: Object.fromEntries(
    signalChecks.map((check) => [
      check.key,
      rows.filter((row) => row.exists && !row.missingSignals.includes(check.key)).length,
    ]),
  ),
  warnings,
  failures,
  rows,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
