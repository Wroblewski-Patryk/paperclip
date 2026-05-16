import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, companyCoreSettings } from "@paperclipai/db";
import type { CompanyCoreCommandMode, PatchCompanyCoreSettings } from "@paperclipai/shared";
import { notFound, unprocessable } from "../errors.js";

const DEFAULT_TIMEOUT_MS = 15_000;

type CompanyCoreEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type CompanyCoreConnectionStatus =
  | "configured"
  | "not_configured"
  | "connected"
  | "degraded";

export interface CompanyCoreToolEntry {
  name: string;
  title?: string;
  description?: string;
  method?: string;
  path?: string;
  capability?: string;
  riskLevel?: string;
  requiresApproval?: boolean;
}

export interface CompanyCoreConnectionSummary {
  provider: "companycore";
  configured: boolean;
  status: CompanyCoreConnectionStatus;
  baseUrl: string | null;
  workspace: {
    id: string | null;
    name: string | null;
  };
  apiVersion: string | null;
  schemaVersion: string | null;
  scopeMode: string | null;
  capabilities: string[];
  operatingModel: {
    hierarchy: string | null;
    areaCount: number;
    tableCount: number;
    systemTables: string[];
  };
  integrations: Record<string, unknown>;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface CompanyCoreManifestSummary {
  provider: "companycore";
  configured: boolean;
  status: CompanyCoreConnectionStatus;
  baseUrl: string | null;
  schemaVersion: string | null;
  service: string | null;
  auth: {
    type: string | null;
    workspaceScoped: boolean | null;
    capabilityScoped: boolean | null;
  };
  guardrails: string[];
  tools: CompanyCoreToolEntry[];
  error: {
    code: string;
    message: string;
  } | null;
}

export type CompanyCoreKnowledgeNodeType =
  | "workspace"
  | "domain"
  | "area"
  | "table"
  | "record"
  | "capability";

export interface CompanyCoreKnowledgeMapNode {
  id: string;
  type: CompanyCoreKnowledgeNodeType;
  label: string;
  subtitle: string | null;
  source: "CompanyCore";
  syncedWith: string[];
  count: number | null;
  status: string | null;
  updatedAt: string | null;
  agentAccess: {
    read: boolean;
    write: boolean;
    approvalRequired: boolean;
    capabilities: string[];
  };
  metadata: Record<string, unknown>;
}

export interface CompanyCoreKnowledgeMapEdge {
  id: string;
  source: string;
  target: string;
  label: string | null;
}

export interface CompanyCoreKnowledgeMapSummary {
  workspaceName: string | null;
  areaCount: number;
  tableCount: number;
  taskCount: number;
  fileCount: number;
  noteCount: number;
  decisionCount: number;
  projectCount: number;
  toolCount: number;
  readCapabilityCount: number;
  writeCapabilityCount: number;
  syncedWith: string[];
  generatedAt: string;
}

export interface CompanyCoreKnowledgeMap {
  provider: "companycore";
  status: CompanyCoreConnectionStatus;
  source: "CompanyCore";
  summary: CompanyCoreKnowledgeMapSummary;
  nodes: CompanyCoreKnowledgeMapNode[];
  edges: CompanyCoreKnowledgeMapEdge[];
  errors: Array<{
    surface: string;
    message: string;
  }>;
}

export interface CompanyCoreAgentKnowledgeContext {
  provider: "companycore";
  status: CompanyCoreConnectionStatus;
  source: "CompanyCore";
  agent: {
    id: string;
    name: string;
    role: string;
    title: string | null;
    departmentKey: string | null;
    departmentLabel: string | null;
    knowledgeAgentLabel: string | null;
  };
  scope: {
    mode: "department";
    guidance: string[];
    peerDepartments: Array<{
      departmentKey: string;
      departmentLabel: string;
      knowledgeAgentLabel: string;
      agentId: string | null;
      agentName: string | null;
    }>;
  };
  summary: CompanyCoreKnowledgeMapSummary & {
    scopedNodeCount: number;
  };
  nodes: CompanyCoreKnowledgeMapNode[];
  edges: CompanyCoreKnowledgeMapEdge[];
  errors: Array<{
    surface: string;
    message: string;
  }>;
}

interface CompanyCoreBridgeConfig {
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  apiKey: string | null;
}

type CompanyCoreSurface = "knowledge" | "tools";

interface CompanyCoreSettingsSurface {
  enabled: boolean;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  profileId: string | null;
  capabilities: string[];
}

export interface CompanyCoreSettingsSummary {
  provider: "companycore";
  baseUrl: string | null;
  workspace: {
    id: string | null;
    name: string | null;
  };
  knowledge: CompanyCoreSettingsSurface;
  tools: CompanyCoreSettingsSurface & {
    commandMode: CompanyCoreCommandMode;
  };
  updatedAt: string | null;
}

function cleanBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function getEnvConfig(): CompanyCoreBridgeConfig {
  const apiKey = process.env.COMPANYCORE_API_KEY?.trim() || null;
  return {
    baseUrl: cleanBaseUrl(process.env.COMPANYCORE_BASE_URL),
    apiKeyConfigured: Boolean(apiKey),
    apiKey,
  };
}

function notConfiguredConnection(config?: CompanyCoreBridgeConfig): CompanyCoreConnectionSummary {
  return {
    provider: "companycore",
    configured: false,
    status: "not_configured",
    baseUrl: config?.baseUrl ?? null,
    workspace: { id: null, name: null },
    apiVersion: null,
    schemaVersion: null,
    scopeMode: null,
    capabilities: [],
    operatingModel: {
      hierarchy: null,
      areaCount: 0,
      tableCount: 0,
      systemTables: [],
    },
    integrations: {},
    error: {
      code: "companycore_not_configured",
      message: "Configure CompanyCore in Company Settings to enable the bridge.",
    },
  };
}

function notConfiguredManifest(config?: CompanyCoreBridgeConfig): CompanyCoreManifestSummary {
  return {
    provider: "companycore",
    configured: false,
    status: "not_configured",
    baseUrl: config?.baseUrl ?? null,
    schemaVersion: null,
    service: null,
    auth: {
      type: null,
      workspaceScoped: null,
      capabilityScoped: null,
    },
    guardrails: [
      "Paperclip agents should use CompanyCore as the bridge to Drive, ClickUp, and company records.",
    ],
    tools: [],
    error: {
      code: "companycore_not_configured",
      message: "Configure CompanyCore Tools in Company Settings to discover MCP tools.",
    },
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function normalizeError(code: string, message: string) {
  return { code, message };
}

async function requestCompanyCore<T>(config: CompanyCoreBridgeConfig, path: string): Promise<T> {
  if (!config.baseUrl || !config.apiKey) {
    throw unprocessable("CompanyCore bridge is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: {
        "Accept": "application/json",
        "X-API-Key": config.apiKey,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null) as CompanyCoreEnvelope<T> | T | null;
    if (!response.ok) {
      const envelope = body as CompanyCoreEnvelope<T> | null;
      const code = envelope?.error?.code ?? `companycore_http_${response.status}`;
      const message = envelope?.error?.message ?? "CompanyCore request failed.";
      throw unprocessable(message, { code, status: response.status });
    }
    if (body && typeof body === "object" && "data" in body) {
      return (body as CompanyCoreEnvelope<T>).data as T;
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

async function requestCompanyCoreOptional<T>(
  config: CompanyCoreBridgeConfig,
  path: string,
): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await requestCompanyCore<T>(config, path), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "CompanyCore request failed.",
    };
  }
}

function redactApiKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 12) return "configured";
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

function normalizeCapabilities(value: unknown): string[] {
  return asStringArray(value).map((item) => item.trim()).filter(Boolean);
}

function normalizeCommandMode(value: string | null | undefined): CompanyCoreCommandMode {
  if (
    value === "read_only" ||
    value === "draft_only" ||
    value === "approval_required" ||
    value === "supervised_operator"
  ) {
    return value;
  }
  return "approval_required";
}

function envSurfaceSettings(): CompanyCoreSettingsSurface {
  const apiKey = process.env.COMPANYCORE_API_KEY?.trim() || null;
  return {
    enabled: Boolean(apiKey),
    apiKeyConfigured: Boolean(apiKey),
    apiKeyPreview: redactApiKey(apiKey),
    profileId: null,
    capabilities: [],
  };
}

function summarizeConnection(data: unknown, config: CompanyCoreBridgeConfig): CompanyCoreConnectionSummary {
  const record = asRecord(data);
  const workspace = asRecord(record.workspace);
  const operatingModel = asRecord(record.operatingModel);
  const areas = Array.isArray(operatingModel.areas) ? operatingModel.areas : [];
  const tableCount = areas.reduce((sum, area) => {
    const tables = asRecord(area).tables;
    return sum + (Array.isArray(tables) ? tables.length : 0);
  }, 0);

  return {
    provider: "companycore",
    configured: true,
    status: "connected",
    baseUrl: config.baseUrl,
    workspace: {
      id: asString(workspace.id),
      name: asString(workspace.name),
    },
    apiVersion: asString(record.apiVersion),
    schemaVersion: asString(asRecord(record.adapterManifest).schemaVersion),
    scopeMode: asString(record.scopeMode),
    capabilities: asStringArray(record.capabilities),
    operatingModel: {
      hierarchy: asString(operatingModel.hierarchy),
      areaCount: areas.length,
      tableCount,
      systemTables: asStringArray(operatingModel.systemTables),
    },
    integrations: asRecord(record.integrations),
    error: null,
  };
}

function summarizeManifest(data: unknown, config: CompanyCoreBridgeConfig): CompanyCoreManifestSummary {
  const record = asRecord(data);
  const auth = asRecord(record.auth);
  const tools = Array.isArray(record.tools)
    ? record.tools.map((tool) => {
      const row = asRecord(tool);
      return {
        name: asString(row.name) ?? "unknown_tool",
        title: asString(row.title) ?? undefined,
        description: asString(row.description) ?? undefined,
        method: asString(row.method) ?? undefined,
        path: asString(row.path) ?? undefined,
        capability: asString(row.capability) ?? undefined,
        riskLevel: asString(row.riskLevel) ?? undefined,
        requiresApproval: typeof row.requiresApproval === "boolean" ? row.requiresApproval : undefined,
      };
    })
    : [];

  return {
    provider: "companycore",
    configured: true,
    status: "connected",
    baseUrl: config.baseUrl,
    schemaVersion: asString(record.schemaVersion),
    service: asString(record.service),
    auth: {
      type: asString(auth.type),
      workspaceScoped: typeof auth.workspaceScoped === "boolean" ? auth.workspaceScoped : null,
      capabilityScoped: typeof auth.capabilityScoped === "boolean" ? auth.capabilityScoped : null,
    },
    guardrails: asStringArray(record.guardrails),
    tools,
    error: null,
  };
}

function titleFromCapability(capability: string): string {
  return capability
    .split(":")
    .map((part) => part.replaceAll("-", " "))
    .join(" / ");
}

function labelFromRecord(record: Record<string, unknown>, fallback: string): string {
  return (
    asString(record.title) ??
    asString(record.name) ??
    asString(record.label) ??
    asString(record.path) ??
    asString(record.fileName) ??
    asString(record.taskName) ??
    asString(record.id) ??
    fallback
  );
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const direct = asString(value);
    if (direct) return direct;
  }
  return null;
}

function normalizeSyncedWith(value: unknown): string[] {
  const provider = asString(value);
  if (!provider || provider === "companycore" || provider === "internal") return [];
  if (provider === "google_drive") return ["Google Drive"];
  if (provider === "clickup") return ["ClickUp"];
  return [provider.replaceAll("_", " ")];
}

const DEPARTMENT_LABELS: Record<string, string> = {
  "00": "00. Glowny",
  "01": "01. Strategia",
  "02": "02. Produkt",
  "03": "03. Sprzedaz",
  "04": "04. Operacje",
  "05": "05. Relacje",
  "06": "06. Kadry",
  "07": "07. Finanse",
  "08": "08. Zasoby",
  "09": "09. Technologia",
  "10": "10. Prawo",
  "11": "11. Innowacje",
  "12": "12. Zarzadzanie",
};

const DEPARTMENT_AGENT_LABELS: Record<string, string> = {
  "00": "00 AIA",
  "01": "01 CSO",
  "02": "02 CPO",
  "03": "03 CRO",
  "04": "04 COO",
  "05": "05 CCO",
  "06": "06 CHRO",
  "07": "07 CFO",
  "08": "08 CAO",
  "09": "09 CTO",
  "10": "10 CLO",
  "11": "11 CINO",
  "12": "12 CEO",
};

const ROLE_DEPARTMENT_KEYS: Record<string, string> = {
  ceo: "12",
  cto: "09",
  cfo: "07",
  cmo: "05",
  pm: "02",
  designer: "02",
  engineer: "09",
  devops: "04",
  security: "10",
  qa: "02",
  researcher: "11",
};

const AGENT_CODE_DEPARTMENT_KEYS: Record<string, string> = {
  AIA: "00",
  CSO: "01",
  CPO: "02",
  CRO: "03",
  COO: "04",
  CCO: "05",
  CHRO: "06",
  CFO: "07",
  CAO: "08",
  CTO: "09",
  CLO: "10",
  CINO: "11",
  CEO: "12",
};

function metadataString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function departmentSearchValuesForNode(node: CompanyCoreKnowledgeMapNode) {
  const metadata = node.metadata;
  const structuredValues = [
    metadataString(metadata, "path") ?? "",
    metadataString(metadata, "folderPath") ?? "",
    metadataString(metadata, "folderName") ?? "",
    metadataString(metadata, "listName") ?? "",
    metadataString(metadata, "areaName") ?? "",
    metadataString(metadata, "tableName") ?? "",
  ];
  if (node.type !== "record") return [node.label, node.subtitle ?? "", ...structuredValues];
  return [...structuredValues, node.subtitle ?? ""];
}

function departmentKeyForKnowledgeNode(node: CompanyCoreKnowledgeMapNode): string | null {
  for (const value of departmentSearchValuesForNode(node)) {
    const match = value.match(/\b(0[0-9]|1[0-2])\s*[.\-]\s*[^/|]+/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function departmentKeyForAgent(agent: Pick<typeof agents.$inferSelect, "name" | "role" | "title" | "capabilities" | "metadata">): string | null {
  const metadata = asRecord(agent.metadata);
  const candidates = [
    agent.name,
    agent.title,
    agent.capabilities,
    metadataString(metadata, "departmentKey"),
    metadataString(metadata, "department"),
    metadataString(metadata, "knowledgeDepartment"),
    DEPARTMENT_AGENT_LABELS[ROLE_DEPARTMENT_KEYS[agent.role] ?? ""],
  ].filter((value): value is string => Boolean(value));
  for (const value of candidates) {
    const match = value.match(/\b(0[0-9]|1[0-2])(?:\s*[.\-]|\s+)/);
    if (match?.[1]) return match[1];
    const codeMatch = value.match(/\b(AIA|CSO|CPO|CRO|COO|CCO|CHRO|CFO|CAO|CTO|CLO|CINO|CEO)\b/i);
    if (codeMatch?.[1]) return AGENT_CODE_DEPARTMENT_KEYS[codeMatch[1].toUpperCase()] ?? null;
  }
  return ROLE_DEPARTMENT_KEYS[agent.role] ?? null;
}

function departmentLabel(key: string | null): string | null {
  if (!key) return null;
  return DEPARTMENT_LABELS[key] ?? `${key}. Department`;
}

function knowledgeAgentLabel(key: string | null): string | null {
  if (!key) return null;
  return DEPARTMENT_AGENT_LABELS[key] ?? `${key} agent`;
}

function scopedKnowledgeNodes(map: CompanyCoreKnowledgeMap, departmentKey: string | null): CompanyCoreKnowledgeMapNode[] {
  if (!departmentKey) return [];
  const selectedIds = new Set(
    map.nodes
      .filter((node) => departmentKeyForKnowledgeNode(node) === departmentKey)
      .map((node) => node.id),
  );
  if (selectedIds.size === 0) return [];
  selectedIds.add("companycore");

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of map.edges) {
      if (selectedIds.has(edge.target) && !selectedIds.has(edge.source)) {
        selectedIds.add(edge.source);
        changed = true;
      }
    }
  }
  return map.nodes.filter((node) => selectedIds.has(node.id));
}

function scopedKnowledgeEdges(map: CompanyCoreKnowledgeMap, nodes: CompanyCoreKnowledgeMapNode[]): CompanyCoreKnowledgeMapEdge[] {
  const ids = new Set(nodes.map((node) => node.id));
  return map.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
}

function toolAccessForDomain(
  tools: CompanyCoreToolEntry[],
  capabilityPrefixes: string[],
) {
  const matchingTools = tools.filter((tool) => {
    const capability = tool.capability ?? "";
    return capabilityPrefixes.some((prefix) => capability.startsWith(prefix));
  });
  const capabilities = Array.from(new Set(matchingTools.map((tool) => tool.capability).filter(Boolean))) as string[];
  return {
    read: capabilities.some((capability) => capability.endsWith(":read")),
    write: capabilities.some((capability) => capability.includes(":write")),
    approvalRequired: matchingTools.some((tool) => tool.requiresApproval),
    capabilities,
  };
}

function pushNode(
  nodes: CompanyCoreKnowledgeMapNode[],
  node: CompanyCoreKnowledgeMapNode,
) {
  if (nodes.some((existing) => existing.id === node.id)) return;
  nodes.push(node);
}

function pushEdge(
  edges: CompanyCoreKnowledgeMapEdge[],
  edge: CompanyCoreKnowledgeMapEdge,
) {
  if (edges.some((existing) => existing.id === edge.id)) return;
  edges.push(edge);
}

function buildKnowledgeMap(input: {
  connectionData: unknown;
  manifestData: unknown;
  tablesData: unknown;
  mappingsData: unknown;
  companyOsData: unknown;
  tasksData: unknown;
  filesData: unknown;
  notesData: unknown;
  decisionsData: unknown;
  projectsData: unknown;
  errors: Array<{ surface: string; message: string }>;
}): CompanyCoreKnowledgeMap {
  const connection = asRecord(input.connectionData);
  const workspace = asRecord(connection.workspace);
  const operatingModel = asRecord(connection.operatingModel);
  const manifest = summarizeManifest(input.manifestData, { baseUrl: null, apiKey: null, apiKeyConfigured: true });
  const tools = manifest.tools;
  const areas = asArray(operatingModel.areas);
  const tables = asArray(input.tablesData);
  const mappings = asArray(input.mappingsData);
  const tasks = asArray(input.tasksData);
  const files = asArray(input.filesData);
  const notes = asArray(input.notesData);
  const decisions = asArray(input.decisionsData);
  const projects = asArray(input.projectsData);
  const nodes: CompanyCoreKnowledgeMapNode[] = [];
  const edges: CompanyCoreKnowledgeMapEdge[] = [];
  const syncedWith = new Set<string>();
  const mappingProviderByTableId = new Map<string, string[]>();
  const areaNameById = new Map<string, string>();
  const fileNameByExternalId = new Map<string, string>();
  const fileInfoByExternalId = new Map<string, { name: string; parentExternalId: string | null; isFolder: boolean }>();

  for (const mapping of mappings) {
    const record = asRecord(mapping);
    const tableId = asString(record.tableId);
    const provider = normalizeSyncedWith(record.provider);
    if (!tableId || provider.length === 0) continue;
    mappingProviderByTableId.set(tableId, [
      ...(mappingProviderByTableId.get(tableId) ?? []),
      ...provider,
    ]);
  }

  const workspaceName = asString(workspace.name) ?? "CompanyCore";
  pushNode(nodes, {
    id: "companycore",
    type: "workspace",
    label: workspaceName,
    subtitle: "Source: CompanyCore",
    source: "CompanyCore",
    syncedWith: [],
    count: null,
    status: asString(connection.status) ?? "connected",
    updatedAt: null,
    agentAccess: {
      read: true,
      write: tools.some((tool) => tool.capability?.includes(":write")),
      approvalRequired: tools.some((tool) => tool.requiresApproval),
      capabilities: Array.from(new Set(tools.map((tool) => tool.capability).filter(Boolean))) as string[],
    },
    metadata: {
      workspaceId: asString(workspace.id),
      apiVersion: asString(connection.apiVersion),
      schemaVersion: manifest.schemaVersion,
    },
  });

  const domains = [
    {
      id: "domain-tasks",
      label: "Tasks",
      subtitle: "CompanyCore tasks and workflow records",
      count: tasks.length,
      prefixes: ["tasks:", "task-lists:"],
      syncedWith: Array.from(new Set(tasks.flatMap((item) => normalizeSyncedWith(asRecord(item).source)))),
    },
    {
      id: "domain-files",
      label: "Files",
      subtitle: "CompanyCore files indexed from knowledge roots",
      count: files.length,
      prefixes: ["google-drive:files:", "google-drive:docs:", "google-drive:sheets:"],
      syncedWith: Array.from(new Set(files.flatMap((item) => normalizeSyncedWith(asRecord(item).provider)))),
    },
    {
      id: "domain-projects",
      label: "Projects",
      subtitle: "CompanyCore project records",
      count: projects.length,
      prefixes: ["projects:"],
      syncedWith: Array.from(new Set(projects.flatMap((item) => normalizeSyncedWith(asRecord(item).source)))),
    },
    {
      id: "domain-notes",
      label: "Notes",
      subtitle: "CompanyCore notes and captured context",
      count: notes.length,
      prefixes: ["notes:"],
      syncedWith: Array.from(new Set(notes.flatMap((item) => normalizeSyncedWith(asRecord(item).source)))),
    },
    {
      id: "domain-decisions",
      label: "Decisions",
      subtitle: "CompanyCore decisions and decision logs",
      count: decisions.length,
      prefixes: ["decisions:", "company-os:"],
      syncedWith: Array.from(new Set(decisions.flatMap((item) => normalizeSyncedWith(asRecord(item).source)))),
    },
    {
      id: "domain-tables",
      label: "Operating tables",
      subtitle: "CompanyCore operating model tables",
      count: tables.length,
      prefixes: ["operating-model:", "company-os:"],
      syncedWith: Array.from(new Set(tables.flatMap((item) => {
        const row = asRecord(item);
        return [
          ...normalizeSyncedWith(row.source),
          ...(mappingProviderByTableId.get(asString(row.id) ?? "") ?? []),
        ];
      }))),
    },
  ];

  for (const domain of domains) {
    for (const provider of domain.syncedWith) syncedWith.add(provider);
    pushNode(nodes, {
      id: domain.id,
      type: "domain",
      label: domain.label,
      subtitle: domain.subtitle,
      source: "CompanyCore",
      syncedWith: domain.syncedWith,
      count: domain.count,
      status: domain.count > 0 ? "available" : "empty",
      updatedAt: null,
      agentAccess: toolAccessForDomain(tools, domain.prefixes),
      metadata: {},
    });
    pushEdge(edges, {
      id: `companycore-${domain.id}`,
      source: "companycore",
      target: domain.id,
      label: "exposes",
    });
  }

  for (const area of areas) {
    const record = asRecord(area);
    const areaId = asString(record.id) ?? `area-${nodes.length}`;
    const areaNodeId = `area-${areaId}`;
    const areaTables = asArray(record.tables);
    areaNameById.set(areaId, labelFromRecord(record, "Operating area"));
    pushNode(nodes, {
      id: areaNodeId,
      type: "area",
      label: labelFromRecord(record, "Operating area"),
      subtitle: "Operating area",
      source: "CompanyCore",
      syncedWith: [],
      count: areaTables.length,
      status: areaTables.length > 0 ? "mapped" : "empty",
      updatedAt: asString(record.updatedAt),
      agentAccess: toolAccessForDomain(tools, ["operating-model:", "company-os:"]),
      metadata: { areaId },
    });
    pushEdge(edges, {
      id: `domain-tables-${areaNodeId}`,
      source: "domain-tables",
      target: areaNodeId,
      label: "contains",
    });
  }

  for (const file of files) {
    const record = asRecord(file);
    const rawMetadata = asRecord(record.rawMetadata);
    const externalId = asString(record.externalId) ?? asString(asRecord(record.rawMetadata).id);
    const name = labelFromRecord(record, "CompanyCore file");
    if (externalId) fileNameByExternalId.set(externalId, name);
    if (externalId) {
      fileInfoByExternalId.set(externalId, {
        name,
        parentExternalId: asString(record.parentExternalId) ?? asStringArray(rawMetadata.parents)[0] ?? null,
        isFolder: typeof record.isFolder === "boolean"
          ? record.isFolder
          : asString(record.mimeType) === "application/vnd.google-apps.folder",
      });
    }
  }

  const resolveFileAncestorLabels = (parentExternalId: string | null) => {
    const labels: string[] = [];
    const seen = new Set<string>();
    let currentId = parentExternalId;
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const info = fileInfoByExternalId.get(currentId);
      if (!info) break;
      labels.unshift(info.name);
      currentId = info.parentExternalId;
    }
    return labels;
  };

  for (const table of tables) {
    const record = asRecord(table);
    const tableId = asString(record.id) ?? `table-${nodes.length}`;
    const areaId = asString(record.areaId);
    const tableSyncedWith = Array.from(new Set([
      ...normalizeSyncedWith(record.source),
      ...(mappingProviderByTableId.get(tableId) ?? []),
    ]));
    for (const provider of tableSyncedWith) syncedWith.add(provider);
    pushNode(nodes, {
      id: `table-${tableId}`,
      type: "table",
      label: labelFromRecord(record, "CompanyCore table"),
      subtitle: asString(record.description) ?? asString(record.apiSlug) ?? "CompanyCore table",
      source: "CompanyCore",
      syncedWith: tableSyncedWith,
      count: null,
      status: asString(record.syncPolicy) ?? "available",
      updatedAt: asString(record.updatedAt),
      agentAccess: toolAccessForDomain(tools, ["operating-model:", "company-os:"]),
      metadata: {
        apiSlug: asString(record.apiSlug),
        tableName: asString(record.tableName),
        folder: asString(asRecord(record.folder).name),
      },
    });
    pushEdge(edges, {
      id: `${areaId ? `area-${areaId}` : "domain-tables"}-table-${tableId}`,
      source: areaId ? `area-${areaId}` : "domain-tables",
      target: `table-${tableId}`,
      label: "table",
    });
  }

  const recordGroups = [
    { source: "domain-tasks", items: tasks, type: "task", prefixes: ["tasks:"], syncedBy: "source" },
    { source: "domain-files", items: files, type: "file", prefixes: ["google-drive:files:"], syncedBy: "provider" },
    { source: "domain-projects", items: projects, type: "project", prefixes: ["projects:"], syncedBy: "source" },
    { source: "domain-notes", items: notes, type: "note", prefixes: ["notes:"], syncedBy: "source" },
    { source: "domain-decisions", items: decisions, type: "decision", prefixes: ["decisions:"], syncedBy: "source" },
  ];

  for (const group of recordGroups) {
    for (const item of group.items) {
      const record = asRecord(item);
      const id = asString(record.id) ?? `${group.type}-${nodes.length}`;
      const synced = normalizeSyncedWith(record[group.syncedBy]);
      for (const provider of synced) syncedWith.add(provider);
      const folder = asRecord(record.folder);
      const rawMetadata = asRecord(record.rawMetadata);
      const list = asRecord(record.list);
      const taskList = asRecord(record.taskList);
      const space = asRecord(record.space);
      const assignee = asRecord(record.assignee);
      const operatingAreaId = asString(record.operatingAreaId);
      const parentExternalId = asString(record.parentExternalId) ?? asStringArray(rawMetadata.parents)[0] ?? null;
      const externalId = firstString(record.externalId, rawMetadata.id);
      const isFolder = typeof record.isFolder === "boolean"
        ? record.isFolder
        : asString(record.mimeType) === "application/vnd.google-apps.folder";
      const fileAncestorLabels = group.type === "file" ? resolveFileAncestorLabels(parentExternalId) : [];
      const computedFolderPath = fileAncestorLabels.length > 0 ? fileAncestorLabels.join("/") : null;
      const computedFilePath = group.type === "file"
        ? [...fileAncestorLabels, labelFromRecord(record, "CompanyCore file")].join("/")
        : null;
      pushNode(nodes, {
        id: `${group.type}-${id}`,
        type: "record",
        label: labelFromRecord(record, `CompanyCore ${group.type}`),
        subtitle: firstString(
          record.path,
          record.folderPath,
          record.listName,
          taskList.name,
          list.name,
          parentExternalId ? fileNameByExternalId.get(parentExternalId) : null,
          folder.name,
          space.name,
          group.type,
        ),
        source: "CompanyCore",
        syncedWith: synced,
        count: null,
        status: asString(record.status) ?? asString(record.syncStatus) ?? asString(record.scanStatus),
        updatedAt: asString(record.updatedAt) ?? asString(record.lastSyncedAt) ?? asString(record.modifiedTime),
        agentAccess: toolAccessForDomain(tools, group.prefixes),
        metadata: {
          kind: group.type,
          path: firstString(record.path, record.fullPath, record.drivePath, computedFilePath),
          folderPath: firstString(record.folderPath, record.parentPath, record.driveFolderPath, computedFolderPath),
          folderName: firstString(
            record.folderName,
            folder.name,
            parentExternalId ? fileNameByExternalId.get(parentExternalId) : null,
          ),
          listName: firstString(record.listName, taskList.name, record.taskList, list.name),
          spaceName: firstString(record.spaceName, space.name),
          areaName: firstString(
            record.areaName,
            operatingAreaId ? areaNameById.get(operatingAreaId) : null,
            record.area,
            record.department,
            record.domain,
          ),
          webUrl: firstString(
            record.webUrl,
            record.webViewLink,
            record.webContentLink,
            record.url,
            record.alternateLink,
            record.externalUrl,
          ),
          externalId,
          parentExternalId,
          isFolder,
          priority: asString(record.priority),
          dueDate: asString(record.dueDate),
          mimeType: asString(record.mimeType),
          size: typeof record.size === "number" ? record.size : null,
          projectId: asString(record.projectId),
          assignee: firstString(record.assigneeName, assignee.name, assignee.email),
        },
      });
      pushEdge(edges, {
        id: `${group.source}-${group.type}-${id}`,
        source: group.source,
        target: `${group.type}-${id}`,
        label: "sample",
      });
    }
  }

  const capabilityGroups = new Map<string, CompanyCoreToolEntry[]>();
  for (const tool of tools) {
    const capability = tool.capability;
    if (!capability) continue;
    const group = capability.split(":")[0] ?? capability;
    capabilityGroups.set(group, [...(capabilityGroups.get(group) ?? []), tool]);
  }

  for (const [group, groupTools] of Array.from(capabilityGroups.entries()).slice(0, 24)) {
    const capabilities = Array.from(new Set(groupTools.map((tool) => tool.capability).filter(Boolean))) as string[];
    pushNode(nodes, {
      id: `capability-${group}`,
      type: "capability",
      label: titleFromCapability(group),
      subtitle: `${groupTools.length} CompanyCore tools`,
      source: "CompanyCore",
      syncedWith: [],
      count: groupTools.length,
      status: groupTools.some((tool) => tool.riskLevel === "destructive")
        ? "destructive"
        : groupTools.some((tool) => tool.riskLevel === "write")
          ? "write"
          : "read",
      updatedAt: null,
      agentAccess: {
        read: capabilities.some((capability) => capability.endsWith(":read")),
        write: capabilities.some((capability) => capability.includes(":write")),
        approvalRequired: groupTools.some((tool) => tool.requiresApproval),
        capabilities,
      },
      metadata: {
        tools: groupTools.slice(0, 8).map((tool) => tool.name),
      },
    });
    pushEdge(edges, {
      id: `companycore-capability-${group}`,
      source: "companycore",
      target: `capability-${group}`,
      label: "capability",
    });
  }

  const readCapabilityCount = tools.filter((tool) => tool.capability?.endsWith(":read")).length;
  const writeCapabilityCount = tools.filter((tool) => tool.capability?.includes(":write")).length;

  return {
    provider: "companycore",
    status: input.errors.length === 0 ? "connected" : "degraded",
    source: "CompanyCore",
    summary: {
      workspaceName,
      areaCount: areas.length,
      tableCount: tables.length,
      taskCount: tasks.length,
      fileCount: files.length,
      noteCount: notes.length,
      decisionCount: decisions.length,
      projectCount: projects.length,
      toolCount: tools.length,
      readCapabilityCount,
      writeCapabilityCount,
      syncedWith: Array.from(syncedWith).sort(),
      generatedAt: new Date().toISOString(),
    },
    nodes,
    edges,
    errors: input.errors,
  };
}

export function companyCoreBridgeService(db?: Db) {
  async function getStoredSettings(companyId: string) {
    if (!db) return null;
    const [row] = await db
      .select()
      .from(companyCoreSettings)
      .where(eq(companyCoreSettings.companyId, companyId))
      .limit(1);
    return row ?? null;
  }

  async function resolveConfig(
    companyId: string,
    surface: CompanyCoreSurface,
  ): Promise<CompanyCoreBridgeConfig> {
    const env = getEnvConfig();
    const row = await getStoredSettings(companyId);
    if (!row) return env;

    const enabled = surface === "knowledge" ? row.knowledgeEnabled : row.toolsEnabled;
    const apiKey = surface === "knowledge" ? row.knowledgeApiKey : row.toolsApiKey;
    const cleanedApiKey = enabled ? apiKey?.trim() || null : null;
    return {
      baseUrl: cleanBaseUrl(row.baseUrl ?? undefined) ?? env.baseUrl,
      apiKey: cleanedApiKey,
      apiKeyConfigured: Boolean(cleanedApiKey),
    };
  }

  function summarizeSettings(row: Awaited<ReturnType<typeof getStoredSettings>>): CompanyCoreSettingsSummary {
    const env = getEnvConfig();
    if (!row) {
      const envSurface = envSurfaceSettings();
      return {
        provider: "companycore",
        baseUrl: env.baseUrl,
        workspace: { id: null, name: null },
        knowledge: envSurface,
        tools: {
          ...envSurface,
          commandMode: "approval_required",
        },
        updatedAt: null,
      };
    }

    return {
      provider: "companycore",
      baseUrl: cleanBaseUrl(row.baseUrl ?? undefined) ?? env.baseUrl,
      workspace: {
        id: row.workspaceId ?? null,
        name: row.workspaceName ?? null,
      },
      knowledge: {
        enabled: row.knowledgeEnabled,
        apiKeyConfigured: Boolean(row.knowledgeApiKey?.trim()),
        apiKeyPreview: redactApiKey(row.knowledgeApiKey),
        profileId: row.knowledgeProfileId ?? null,
        capabilities: normalizeCapabilities(row.knowledgeCapabilities),
      },
      tools: {
        enabled: row.toolsEnabled,
        apiKeyConfigured: Boolean(row.toolsApiKey?.trim()),
        apiKeyPreview: redactApiKey(row.toolsApiKey),
        profileId: row.toolsProfileId ?? null,
        capabilities: normalizeCapabilities(row.toolsCapabilities),
        commandMode: normalizeCommandMode(row.toolsCommandMode),
      },
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  return {
    async settings(companyId: string): Promise<CompanyCoreSettingsSummary> {
      const row = await getStoredSettings(companyId);
      return summarizeSettings(row);
    },

    async updateSettings(
      companyId: string,
      patch: PatchCompanyCoreSettings,
    ): Promise<CompanyCoreSettingsSummary> {
      if (!db) {
        throw unprocessable("CompanyCore settings storage is not available");
      }
      const existing = await getStoredSettings(companyId);
      const now = new Date();
      const next = {
        companyId,
        baseUrl: patch.baseUrl !== undefined
          ? cleanBaseUrl(patch.baseUrl ?? undefined)
          : existing?.baseUrl ?? null,
        workspaceId: patch.workspaceId !== undefined
          ? patch.workspaceId
          : existing?.workspaceId ?? null,
        workspaceName: patch.workspaceName !== undefined
          ? patch.workspaceName
          : existing?.workspaceName ?? null,
        knowledgeEnabled: patch.knowledge?.enabled ?? existing?.knowledgeEnabled ?? false,
        knowledgeApiKey: patch.knowledge && "apiKey" in patch.knowledge
          ? patch.knowledge.apiKey
          : existing?.knowledgeApiKey ?? null,
        knowledgeProfileId: patch.knowledge && "profileId" in patch.knowledge
          ? patch.knowledge.profileId
          : existing?.knowledgeProfileId ?? null,
        knowledgeCapabilities: patch.knowledge?.capabilities ?? existing?.knowledgeCapabilities ?? [],
        toolsEnabled: patch.tools?.enabled ?? existing?.toolsEnabled ?? false,
        toolsApiKey: patch.tools && "apiKey" in patch.tools
          ? patch.tools.apiKey
          : existing?.toolsApiKey ?? null,
        toolsProfileId: patch.tools && "profileId" in patch.tools
          ? patch.tools.profileId
          : existing?.toolsProfileId ?? null,
        toolsCommandMode: patch.tools?.commandMode ?? existing?.toolsCommandMode ?? "approval_required",
        toolsCapabilities: patch.tools?.capabilities ?? existing?.toolsCapabilities ?? [],
        updatedAt: now,
      };

      await db
        .insert(companyCoreSettings)
        .values({
          ...next,
          createdAt: existing?.createdAt ?? now,
        })
        .onConflictDoUpdate({
          target: companyCoreSettings.companyId,
          set: next,
        });

      return summarizeSettings(await getStoredSettings(companyId));
    },

    async connection(
      companyId: string,
      surface: CompanyCoreSurface = "knowledge",
    ): Promise<CompanyCoreConnectionSummary> {
      const config = await resolveConfig(companyId, surface);
      if (!config.baseUrl || !config.apiKeyConfigured) return notConfiguredConnection(config);
      try {
        const data = await requestCompanyCore<unknown>(config, "/v1/connection");
        return summarizeConnection(data, config);
      } catch (error) {
        return {
          ...notConfiguredConnection(config),
          configured: true,
          status: "degraded",
          baseUrl: config.baseUrl,
          error: normalizeError(
            "companycore_connection_failed",
            error instanceof Error ? error.message : "CompanyCore connection failed.",
          ),
        };
      }
    },

    async manifest(companyId: string): Promise<CompanyCoreManifestSummary> {
      const config = await resolveConfig(companyId, "tools");
      if (!config.baseUrl || !config.apiKeyConfigured) return notConfiguredManifest(config);
      try {
        const data = await requestCompanyCore<unknown>(config, "/v1/mcp/manifest");
        return summarizeManifest(data, config);
      } catch (error) {
        return {
          ...notConfiguredManifest(config),
          configured: true,
          status: "degraded",
          baseUrl: config.baseUrl,
          error: normalizeError(
            "companycore_manifest_failed",
            error instanceof Error ? error.message : "CompanyCore manifest discovery failed.",
          ),
        };
      }
    },

    async knowledgeMap(companyId: string): Promise<CompanyCoreKnowledgeMap> {
      const knowledgeConfig = await resolveConfig(companyId, "knowledge");
      const toolsConfig = await resolveConfig(companyId, "tools");
      if (!knowledgeConfig.baseUrl || !knowledgeConfig.apiKeyConfigured) {
        return buildKnowledgeMap({
          connectionData: {},
          manifestData: {},
          tablesData: [],
          mappingsData: [],
          companyOsData: {},
          tasksData: [],
          filesData: [],
          notesData: [],
          decisionsData: [],
          projectsData: [],
          errors: [{ surface: "connection", message: "CompanyCore Knowledge is not configured." }],
        });
      }
      const dataConfig = toolsConfig.baseUrl && toolsConfig.apiKeyConfigured ? toolsConfig : knowledgeConfig;
      const [
        connectionResult,
        manifestResult,
        tablesResult,
        mappingsResult,
        companyOsResult,
        tasksResult,
        filesResult,
        notesResult,
        decisionsResult,
        projectsResult,
      ] = await Promise.all([
        requestCompanyCoreOptional<unknown>(knowledgeConfig, "/v1/connection"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/mcp/manifest"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/operating-model/tables"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/operating-model/external-mappings"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/company-os"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/tasks"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/google-drive/files"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/notes"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/decisions"),
        requestCompanyCoreOptional<unknown>(dataConfig, "/v1/projects"),
      ]);
      const errors = [
        ["connection", connectionResult],
        ["manifest", manifestResult],
        ["tables", tablesResult],
        ["external mappings", mappingsResult],
        ["company os", companyOsResult],
        ["tasks", tasksResult],
        ["files", filesResult],
        ["notes", notesResult],
        ["decisions", decisionsResult],
        ["projects", projectsResult],
      ].flatMap(([surface, result]) => {
        const typed = result as { error: string | null };
        return typed.error ? [{ surface: surface as string, message: typed.error }] : [];
      });

      return buildKnowledgeMap({
        connectionData: connectionResult.data ?? {},
        manifestData: manifestResult.data ?? {},
        tablesData: tablesResult.data ?? [],
        mappingsData: mappingsResult.data ?? [],
        companyOsData: companyOsResult.data ?? {},
        tasksData: tasksResult.data ?? [],
        filesData: filesResult.data ?? [],
        notesData: notesResult.data ?? [],
        decisionsData: decisionsResult.data ?? [],
        projectsData: projectsResult.data ?? [],
        errors,
      });
    },

    async agentKnowledge(
      companyId: string,
      agentId: string,
    ): Promise<CompanyCoreAgentKnowledgeContext> {
      if (!db) {
        throw unprocessable("CompanyCore agent knowledge requires database access");
      }
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)))
        .limit(1);
      if (!agent) throw notFound("Agent not found");

      const map = await this.knowledgeMap(companyId);
      const departmentKey = departmentKeyForAgent(agent);
      const nodes = scopedKnowledgeNodes(map, departmentKey);
      const peerRows = await db
        .select({
          id: agents.id,
          name: agents.name,
          role: agents.role,
          title: agents.title,
          capabilities: agents.capabilities,
          metadata: agents.metadata,
        })
        .from(agents)
        .where(eq(agents.companyId, companyId));
      const peersByDepartment = new Map<string, { id: string; name: string }>();
      for (const peer of peerRows) {
        const key = departmentKeyForAgent(peer);
        if (!key || peersByDepartment.has(key)) continue;
        peersByDepartment.set(key, { id: peer.id, name: peer.name });
      }

      return {
        provider: "companycore",
        status: map.status,
        source: "CompanyCore",
        agent: {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          title: agent.title,
          departmentKey,
          departmentLabel: departmentLabel(departmentKey),
          knowledgeAgentLabel: knowledgeAgentLabel(departmentKey),
        },
        scope: {
          mode: "department",
          guidance: [
            "Use this endpoint as your primary CompanyCore knowledge resource before asking for broader context.",
            "Treat returned nodes as your department-scoped knowledge inventory, not the full company memory.",
            "When work needs knowledge from another department, create or comment on a Paperclip issue for that department's agent instead of importing all external context into your own working memory.",
            "Use CompanyCore as the source of truth; Drive and ClickUp are synchronized systems behind CompanyCore.",
          ],
          peerDepartments: Object.keys(DEPARTMENT_LABELS).map((key) => {
            const peer = peersByDepartment.get(key) ?? null;
            return {
              departmentKey: key,
              departmentLabel: departmentLabel(key) ?? `${key}. Department`,
              knowledgeAgentLabel: knowledgeAgentLabel(key) ?? `${key} agent`,
              agentId: peer?.id ?? null,
              agentName: peer?.name ?? null,
            };
          }),
        },
        summary: {
          ...map.summary,
          scopedNodeCount: nodes.length,
        },
        nodes,
        edges: scopedKnowledgeEdges(map, nodes),
        errors: map.errors,
      };
    },
  };
}
