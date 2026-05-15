import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companyCoreSettings } from "@paperclipai/db";
import type { CompanyCoreCommandMode, PatchCompanyCoreSettings } from "@paperclipai/shared";
import { unprocessable } from "../errors.js";

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
  };
}
