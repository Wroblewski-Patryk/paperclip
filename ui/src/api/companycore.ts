import { api } from "./client";

export type CompanyCoreBridgeStatus = "configured" | "not_configured" | "connected" | "degraded";

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

export const companyCoreApi = {
  connection: (companyId: string) =>
    api.get<CompanyCoreConnectionSummary>(`/companies/${companyId}/knowledge/connection`),
  overview: (companyId: string) =>
    api.get<CompanyCoreKnowledgeOverview>(`/companies/${companyId}/knowledge/overview`),
  health: (companyId: string) =>
    api.get<CompanyCoreConnectionSummary>(`/companies/${companyId}/tools/companycore/health`),
  manifest: (companyId: string) =>
    api.get<CompanyCoreManifestSummary>(`/companies/${companyId}/tools/companycore/manifest`),
};
