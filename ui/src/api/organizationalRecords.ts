import type { OrganizationalRecord, OrganizationalRecordKind } from "@paperclipai/shared";
import { api } from "./client";

export interface OrganizationalRecordFilters {
  kind?: OrganizationalRecordKind;
  attention?: boolean;
}

export const organizationalRecordsApi = {
  list(companyId: string, filters: OrganizationalRecordFilters = {}) {
    const query = new URLSearchParams();
    if (filters.kind) query.set("kind", filters.kind);
    if (filters.attention !== undefined) query.set("attention", String(filters.attention));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return api.get<OrganizationalRecord[]>(`/companies/${companyId}/organizational-records${suffix}`);
  },
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<OrganizationalRecord>(`/companies/${companyId}/organizational-records`, data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<OrganizationalRecord>(`/organizational-records/${id}`, data),
};
