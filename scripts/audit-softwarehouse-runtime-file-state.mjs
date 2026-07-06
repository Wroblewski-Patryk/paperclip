import { access, readFile } from "node:fs/promises";
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
const activeCompanyRoot = path.join(userInstanceRoot, "companies", companyId);
const managedCodexAuthPath = path.join(activeCompanyRoot, "codex-home", "auth.json");

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

function isAbsoluteLocalPath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    path.isAbsolute(value) &&
    !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
  );
}

function pathLooksManagedByPaperclip(value) {
  const normalized = path.resolve(value).toLowerCase();
  return (
    normalized.includes(`${path.sep}.paperclip${path.sep}`) ||
    normalized.includes(`${path.sep}paperclip_softwarehouse${path.sep}`) ||
    normalized.includes(`${path.sep}soar${path.sep}`) ||
    normalized.includes(`${path.sep}roost${path.sep}`)
  );
}

function textLooksLikePlaceholderSecret(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return (
    normalized.includes("REPLACE") ||
    normalized.includes("PLACEHOLDER") ||
    normalized.includes("YOUR_OPENAI_API_KEY") ||
    normalized.includes("INSERT_OPENAI_API_KEY") ||
    normalized.includes("PASTE_OPENAI_API_KEY")
  );
}

function collectPlaceholderSecretKeys(value, prefix = "") {
  const keys = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      keys.push(...collectPlaceholderSecretKeys(item, `${prefix}[${index}]`));
    });
    return keys;
  }
  if (!value || typeof value !== "object") return keys;

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = prefix ? `${prefix}.${key}` : key;
    if (textLooksLikePlaceholderSecret(entry)) {
      keys.push(entryPath);
      continue;
    }
    if (entry && typeof entry === "object") {
      keys.push(...collectPlaceholderSecretKeys(entry, entryPath));
    }
  }
  return keys;
}

function collectPathReferences(value, prefix = "") {
  const refs = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      refs.push(...collectPathReferences(item, `${prefix}[${index}]`));
    });
    return refs;
  }
  if (!value || typeof value !== "object") return refs;

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = prefix ? `${prefix}.${key}` : key;
    if (isAbsoluteLocalPath(entry) && pathLooksManagedByPaperclip(entry)) {
      refs.push({ key: entryPath, path: path.resolve(entry) });
      continue;
    }
    if (entry && typeof entry === "object") {
      refs.push(...collectPathReferences(entry, entryPath));
    }
  }
  return refs;
}

function instructionPaths(agent) {
  const root =
    agent.adapterConfig?.instructionsRootPath ??
    path.join(activeCompanyAgentsRoot, agent.id, "instructions");
  const entry =
    agent.adapterConfig?.instructionsFilePath ??
    path.join(root, agent.adapterConfig?.instructionsEntryFile ?? "AGENTS.md");
  const mirrorRoot = path.join(mirrorCompanyAgentsRoot, agent.id, "instructions");
  const mirrorEntry = path.join(mirrorRoot, "AGENTS.md");
  return {
    activeRoot: path.resolve(root),
    activeEntry: path.resolve(entry),
    mirrorRoot: path.resolve(mirrorRoot),
    mirrorEntry: path.resolve(mirrorEntry),
  };
}

const agents = await request(`/api/companies/${companyId}/agents`);
if (!Array.isArray(agents)) {
  throw new Error("Paperclip agents response did not contain an array");
}

const failures = [];
const warnings = [];
const checkedPathRefs = [];

if (await exists(managedCodexAuthPath)) {
  try {
    const authText = await readFile(managedCodexAuthPath, "utf8");
    const authJson = JSON.parse(authText);
    const placeholderKeys = collectPlaceholderSecretKeys(authJson);
    for (const key of placeholderKeys) {
      failures.push({
        code: "managed_codex_auth_placeholder_secret",
        key,
        path: path.resolve(managedCodexAuthPath),
        message:
          "Managed Codex auth contains a placeholder-looking secret value. Rotate or reseed the auth file before starting agents.",
      });
    }
  } catch (error) {
    warnings.push({
      code: "managed_codex_auth_unreadable",
      path: path.resolve(managedCodexAuthPath),
      message: error instanceof Error ? error.message : String(error),
    });
  }
} else {
  warnings.push({
    code: "managed_codex_auth_missing",
    path: path.resolve(managedCodexAuthPath),
    message:
      "Managed Codex auth file is absent. This is allowed only when agents rely on inherited local Codex auth or API-key mode.",
  });
}

for (const agent of agents) {
  if (agent.status === "terminated") continue;
  const paths = instructionPaths(agent);
  if (!(await exists(paths.activeRoot))) {
    failures.push({
      code: "agent_instructions_root_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.activeRoot,
    });
  }
  if (!(await exists(paths.activeEntry))) {
    failures.push({
      code: "agent_instructions_entry_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.activeEntry,
    });
  }
  if (!(await exists(paths.mirrorRoot))) {
    warnings.push({
      code: "agent_runtime_mirror_root_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.mirrorRoot,
    });
  }
  if (!(await exists(paths.mirrorEntry))) {
    warnings.push({
      code: "agent_runtime_mirror_entry_missing",
      agentId: agent.id,
      agentName: agent.name,
      path: paths.mirrorEntry,
    });
  }

  const refs = [
    ...collectPathReferences(agent.adapterConfig ?? {}, "adapterConfig"),
    ...collectPathReferences(agent.runtimeConfig ?? {}, "runtimeConfig"),
  ];
  for (const ref of refs) {
    const existsNow = await exists(ref.path);
    checkedPathRefs.push({
      agentId: agent.id,
      agentName: agent.name,
      key: ref.key,
      path: ref.path,
      exists: existsNow,
    });
    if (!existsNow) {
      failures.push({
        code: "agent_config_path_missing",
        agentId: agent.id,
        agentName: agent.name,
        key: ref.key,
        path: ref.path,
      });
    }
  }
}

const result = {
  overall: failures.length === 0 ? "pass" : "fail",
  checkedAt: new Date().toISOString(),
  apiBase,
  companyId,
  instance: {
    instanceName,
    userInstanceRoot: path.resolve(userInstanceRoot),
    repoRuntimeMirrorRoot: path.resolve(repoRuntimeMirrorRoot),
  },
  agents: {
    total: agents.filter((agent) => agent.status !== "terminated").length,
    instructionRootsChecked: agents.filter((agent) => agent.status !== "terminated").length,
    missingInstructionFailures: failures.filter((failure) =>
      failure.code.startsWith("agent_instructions_")
    ).length,
    mirrorWarnings: warnings.filter((warning) =>
      warning.code.startsWith("agent_runtime_mirror_")
    ).length,
  },
  pathReferences: {
    checked: checkedPathRefs.length,
    missing: checkedPathRefs.filter((ref) => !ref.exists).length,
  },
  managedCodexAuth: {
    path: path.resolve(managedCodexAuthPath),
    exists: await exists(managedCodexAuthPath),
    placeholderFailures: failures.filter((failure) =>
      failure.code === "managed_codex_auth_placeholder_secret"
    ).length,
  },
  warnings,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
