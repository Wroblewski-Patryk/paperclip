import { useQuery } from "@tanstack/react-query";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";

export const COMPANY_LIVE_RUNS_REFETCH_INTERVAL_MS = 5_000;

export function useCompanyLiveRuns(companyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.liveRuns(companyId ?? "__no-company__"),
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId!),
    enabled: Boolean(companyId),
    refetchInterval: COMPANY_LIVE_RUNS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });
}
