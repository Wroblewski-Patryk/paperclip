import { api } from "./client";
import type { SoftwarehouseIssueTemplateCatalogResponse } from "@paperclipai/shared";

export interface SoftwarehouseDoc {
  key: string;
  title: string;
  path: string;
  exists: boolean;
  updatedAt: string | null;
  excerpt: string | null;
}

export interface SoftwarehouseFileStatus {
  path: string;
  exists: boolean;
  updatedAt: string | null;
  size: number | null;
}

export interface SoftwarehouseKnowledge {
  generatedAt: string;
  portfolioIndex: SoftwarehouseDoc;
  controlDocs: SoftwarehouseDoc[];
  graphFiles: SoftwarehouseFileStatus[];
  statusDocs: SoftwarehouseDoc[];
}

export interface SoftwarehouseTools {
  generatedAt: string;
  commandCatalog: {
    path: string;
    rows: Array<Record<string, string>>;
    safetyClasses: Record<string, number>;
    ownerCounts: Record<string, number>;
  };
  runtimeLedger: {
    path: string;
    rows: Array<Record<string, string>>;
    unknownVerifications: number;
    secretEntries: number;
  };
  toolingContract: SoftwarehouseDoc;
}

export interface SoftwarehouseBacklog {
  generatedAt: string;
  featureBacklog: SoftwarehouseDoc;
  unificationPlan: SoftwarehouseDoc;
  appFeatureCandidates: Array<{
    title: string;
    status: "local_first" | "deferred";
    note: string;
  }>;
}

export const softwarehouseApi = {
  knowledge: (companyId: string) =>
    api.get<SoftwarehouseKnowledge>(`/companies/${companyId}/softwarehouse/knowledge`),
  tools: (companyId: string) =>
    api.get<SoftwarehouseTools>(`/companies/${companyId}/softwarehouse/tools`),
  backlog: (companyId: string) =>
    api.get<SoftwarehouseBacklog>(`/companies/${companyId}/softwarehouse/backlog`),
  issueTemplates: (companyId: string) =>
    api.get<SoftwarehouseIssueTemplateCatalogResponse>(`/companies/${companyId}/softwarehouse/issue-templates`),
};
