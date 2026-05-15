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

function cleanBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function getConfig(): CompanyCoreBridgeConfig {
  const apiKey = process.env.COMPANYCORE_API_KEY?.trim() || null;
  return {
    baseUrl: cleanBaseUrl(process.env.COMPANYCORE_BASE_URL),
    apiKeyConfigured: Boolean(apiKey),
    apiKey,
  };
}

function notConfiguredConnection(): CompanyCoreConnectionSummary {
  return {
    provider: "companycore",
    configured: false,
    status: "not_configured",
    baseUrl: null,
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
      message: "Set COMPANYCORE_BASE_URL and COMPANYCORE_API_KEY to enable the CompanyCore bridge.",
    },
  };
}

function notConfiguredManifest(): CompanyCoreManifestSummary {
  return {
    provider: "companycore",
    configured: false,
    status: "not_configured",
    baseUrl: null,
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
      message: "Set COMPANYCORE_BASE_URL and COMPANYCORE_API_KEY to discover CompanyCore MCP tools.",
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

export function companyCoreBridgeService() {
  return {
    async connection(): Promise<CompanyCoreConnectionSummary> {
      const config = getConfig();
      if (!config.baseUrl || !config.apiKeyConfigured) return notConfiguredConnection();
      try {
        const data = await requestCompanyCore<unknown>(config, "/v1/connection");
        return summarizeConnection(data, config);
      } catch (error) {
        return {
          ...notConfiguredConnection(),
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

    async manifest(): Promise<CompanyCoreManifestSummary> {
      const config = getConfig();
      if (!config.baseUrl || !config.apiKeyConfigured) return notConfiguredManifest();
      try {
        const data = await requestCompanyCore<unknown>(config, "/v1/mcp/manifest");
        return summarizeManifest(data, config);
      } catch (error) {
        return {
          ...notConfiguredManifest(),
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
