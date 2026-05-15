import { api } from "./client";

export type CompanyCoreBridgeStatus = "configured" | "not_configured" | "connected" | "degraded";
export type CompanyCoreCommandMode =
  | "read_only"
  | "draft_only"
  | "approval_required"
  | "supervised_operator";

export interface CompanyCoreSettingsSurface {
  enabled: boolean;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  profileId: string | null;
  capabilities: string[];
}

export interface CompanyCoreSettings {
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

export interface CompanyCoreSettingsPatchSurface {
  enabled?: boolean;
  apiKey?: string | null;
  profileId?: string | null;
  capabilities?: string[];
}

export interface CompanyCoreSettingsPatch {
  baseUrl?: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
  knowledge?: CompanyCoreSettingsPatchSurface;
  tools?: CompanyCoreSettingsPatchSurface & {
    commandMode?: CompanyCoreCommandMode;
  };
}

export interface CompanyCoreConnectionSummary {
  provider: "companycore";
  configured: boolean;
  status: CompanyCoreBridgeStatus;
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

export interface CompanyCoreKnowledgeOverview {
  provider: "companycore";
  connection: CompanyCoreConnectionSummary;
  toolCount: number;
  approvalToolCount: number;
  readToolCount: number;
  writeToolCount: number;
  destructiveToolCount: number;
}

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

export interface CompanyCoreManifestSummary {
  provider: "companycore";
  configured: boolean;
  status: CompanyCoreBridgeStatus;
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

export interface CompanyCoreKnowledgeMap {
  provider: "companycore";
  status: CompanyCoreBridgeStatus;
  source: "CompanyCore";
  summary: {
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
  };
  nodes: CompanyCoreKnowledgeMapNode[];
  edges: CompanyCoreKnowledgeMapEdge[];
  errors: Array<{
    surface: string;
    message: string;
  }>;
}

export const companyCoreApi = {
  settings: (companyId: string) =>
    api.get<CompanyCoreSettings>(`/companies/${companyId}/companycore/settings`),
  updateSettings: (companyId: string, patch: CompanyCoreSettingsPatch) =>
    api.patch<CompanyCoreSettings>(`/companies/${companyId}/companycore/settings`, patch),
  connection: (companyId: string) =>
    api.get<CompanyCoreConnectionSummary>(`/companies/${companyId}/knowledge/connection`),
  overview: (companyId: string) =>
    api.get<CompanyCoreKnowledgeOverview>(`/companies/${companyId}/knowledge/overview`),
  map: (companyId: string) =>
    api.get<CompanyCoreKnowledgeMap>(`/companies/${companyId}/knowledge/map`),
  health: (companyId: string) =>
    api.get<CompanyCoreConnectionSummary>(`/companies/${companyId}/tools/companycore/health`),
  manifest: (companyId: string) =>
    api.get<CompanyCoreManifestSummary>(`/companies/${companyId}/tools/companycore/manifest`),
};
