import type { DecisionCenterResponse, DecisionCenterSourceType } from "@paperclipai/shared";
import { api } from "./client";

export const decisionsApi = {
  list: (companyId: string) =>
    api.get<DecisionCenterResponse>(`/companies/${companyId}/decisions`),
  defer: (
    companyId: string,
    sourceType: DecisionCenterSourceType,
    sourceId: string,
    data: { deferredUntil: string; note?: string | null },
  ) => api.put(`/companies/${companyId}/decisions/${sourceType}/${sourceId}/defer`, data),
  clearDefer: (companyId: string, sourceType: DecisionCenterSourceType, sourceId: string) =>
    api.delete(`/companies/${companyId}/decisions/${sourceType}/${sourceId}/defer`),
};
