import type { AgentAvailability, CompanySituation, DashboardSummary } from "@paperclipai/shared";
import { api } from "./client";

export const dashboardApi = {
  summary: (companyId: string) => api.get<DashboardSummary>(`/companies/${companyId}/dashboard`),
  situation: (companyId: string) => api.get<CompanySituation>(`/companies/${companyId}/situation`),
  agentAvailability: (companyId: string) =>
    api.get<AgentAvailability>(`/companies/${companyId}/agent-availability`),
  setAgentAvailability: (companyId: string, enabled: boolean, idempotencyKey: string) =>
    api.put<AgentAvailability>(`/companies/${companyId}/agent-availability`, {
      enabled,
      idempotencyKey,
    }),
};
