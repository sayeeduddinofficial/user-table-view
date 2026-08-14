/**
 * useAuditLogsPage.ts
 * Owns all Audit Logs page state, queries and export handlers.
 */

import { useEffect, useMemo, useState } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import {
  useAuditLogs,
  useAuditFilters,
  useAuditCategoryCounts,
  useAuditAnalytics,
  AuditLogsCSV,
} from "@/hooks/useAuditLogs";
import { exportGraphsAsPNG, exportGraphsAsPDF } from "@/utils/exportGraphs";
import {
  DEFAULT_AUDIT_PAGINATION,
  DEFAULT_DATE_RANGE_OPTION,
} from "@/components/audit/auditConstants";
import { toApiDate } from "@/components/audit/auditUtils";

export const AUDIT_GRAPHS_CONTAINER_ID = "audit-graphs-container";

export type AuditViewMode = "table" | "graph";

export interface AuditDateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export const useAuditLogsPage = () => {
  const { alert } = useDialog();

  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [serviceName, setServiceName] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<AuditViewMode>("table");
  const [dateRange, setDateRange] = useState<AuditDateRange>({
    from: undefined,
    to: undefined,
  });
  const [dateRangeOption, setDateRangeOption] = useState<string>(
    DEFAULT_DATE_RANGE_OPTION,
  );

  const filterParams = useMemo(
    () => ({
      userId,
      category,
      serviceName,
      dateRangeOption:
        dateRangeOption !== "custom" ? dateRangeOption : undefined,
      startDate: toApiDate(dateRange.from),
      endDate: toApiDate(dateRange.to),
    }),
    [userId, category, serviceName, dateRangeOption, dateRange.from, dateRange.to],
  );

  const { data: logsData, isLoading } = useAuditLogs({ ...filterParams, search, page });
  const { data: filters } = useAuditFilters();
  const { data: categoryCounts } = useAuditCategoryCounts(filterParams);
  const { data: analytics } = useAuditAnalytics(filterParams);

  // Reset pagination shortly after the search term changes.
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const runExport = async (
    action: () => Promise<void>,
    successTitle: string,
    errorTitle: string,
  ) => {
    try {
      await action();
      alert({ title: successTitle, severity: "success" });
    } catch (error) {
      alert({ title: errorTitle, severity: "error" });
      console.error(`${errorTitle}:`, error);
    }
  };

  const handleExport = (formatType: "csv" | "png" | "pdf") => {
    if (formatType === "csv") {
      return runExport(
        () => AuditLogsCSV(filterParams),
        "Download Completed",
        "Failed to export CSV",
      );
    }

    if (formatType === "png") {
      return runExport(
        () => exportGraphsAsPNG(AUDIT_GRAPHS_CONTAINER_ID),
        "PNG Downloaded",
        "Failed to export PNG",
      );
    }

    return runExport(
      () => exportGraphsAsPDF(AUDIT_GRAPHS_CONTAINER_ID),
      "PDF Downloaded",
      "Failed to export PDF",
    );
  };

  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const handleDatePresetChange = (option: string) => {
    if (option === "custom") return;
    setDateRangeOption(option);
    setDateRange({ from: undefined, to: undefined });
    setPage(1);
  };

  const handleCustomDateRange = (range: AuditDateRange) => {
    setDateRange(range);
    setDateRangeOption("custom");
    setPage(1);
  };

  return {
    // state
    search,
    setSearch,
    userId,
    setUserId: handleFilterChange(setUserId),
    category,
    setCategory: handleFilterChange(setCategory),
    serviceName,
    setServiceName: handleFilterChange(setServiceName),
    page,
    setPage,
    viewMode,
    setViewMode,
    dateRange,
    dateRangeOption,
    // data
    logs: logsData?.data ?? [],
    pagination: logsData?.pagination ?? DEFAULT_AUDIT_PAGINATION,
    filterData: filters ?? { users: [], categories: [] },
    categoryCounts: categoryCounts ?? {},
    analytics,
    isLoading,
    // handlers
    handleExport,
    handleDatePresetChange,
    handleCustomDateRange,
  };
};