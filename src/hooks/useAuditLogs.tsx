import { useQuery } from "@tanstack/react-query";
import {
  fetchAuditLogs,
  fetchAuditFilters,
  fetchAuditCategoryCounts,
  fetchAuditAnalytics,
  downloadAuditLogsCSV,
} from "@/services/notificationApi";
import type { AuditLogsQueryParams } from "@/types/api";

type AuditFilterParams = Omit<AuditLogsQueryParams, "page" | "search">;
// ─── Hooks ────────────────────────────────────────────────────────────────────
export const useAuditLogs = (params: AuditLogsQueryParams) => {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    refetchInterval: 10000,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
  });
};

export const useAuditFilters = () => {
  return useQuery({
    queryKey: ["audit-filters"],
    queryFn: fetchAuditFilters,
    staleTime: 0,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
};

export const useAuditCategoryCounts = (params: AuditFilterParams) => {
  return useQuery({
    queryKey: ["audit-category-counts", params],
    queryFn: () => fetchAuditCategoryCounts(params),
    refetchInterval: 10000,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
  });
};

export const AuditLogsCSV = (params: AuditFilterParams): Promise<void> =>
  downloadAuditLogsCSV(params);

export const useAuditAnalytics = (params: AuditFilterParams) => {
  return useQuery({
    queryKey: ["audit-analytics", params],
    queryFn: () => fetchAuditAnalytics(params),
    refetchInterval: 30000,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
};
