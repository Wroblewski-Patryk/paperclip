import type { CompanySituation, DashboardSummary } from "@paperclipai/shared";
import { api } from "./client";

export const dashboardApi = {
  summary: (companyId: string) => api.get<DashboardSummary>(`/companies/${companyId}/dashboard`),
  situation: (companyId: string) => api.get<CompanySituation>(`/companies/${companyId}/situation`),
};
