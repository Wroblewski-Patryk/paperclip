import type { OrganizationalObservation, OrganizationalObservationKind } from "@paperclipai/shared";
import { api } from "./client";

export const organizationalObservationsApi = {
  list(companyId: string, kind?: OrganizationalObservationKind) {
    const suffix = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return api.get<OrganizationalObservation[]>(`/companies/${companyId}/organizational-observations${suffix}`);
  },
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<OrganizationalObservation>(`/companies/${companyId}/organizational-observations`, data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<OrganizationalObservation>(`/organizational-observations/${id}`, data),
};
