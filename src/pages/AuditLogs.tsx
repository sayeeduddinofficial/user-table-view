import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/common/DataTable";
import { AuditStatCards } from "@/components/audit/AuditStatCards";
import { AuditServiceFilter } from "@/components/audit/AuditServiceFilter";
import { AuditFilterBar } from "@/components/audit/AuditFilterBar";
import { AuditAnalyticsPanel } from "@/components/audit/AuditAnalyticsPanel";
import { AuditExportSheet } from "@/components/audit/AuditExportSheet";
import { auditLogColumns } from "@/components/audit/auditColumns";
import { useAuditLogsPage } from "@/hooks/useAuditLogsPage";

export default function AuditLogs() {
  const {
    search,
    setSearch,
    userId,
    setUserId,
    category,
    setCategory,
    serviceName,
    setServiceName,
    setPage,
    viewMode,
    setViewMode,
    dateRange,
    dateRangeOption,
    logs,
    pagination,
    filterData,
    categoryCounts,
    analytics,
    isLoading,
    handleExport,
    handleDatePresetChange,
    handleCustomDateRange,
  } = useAuditLogsPage();

  return (
    <div>
      <Header
        title="Audit Logs"
        subtitle="Track all user and system activity"
        showSearch={false}
      />

      <div className="p-6 space-y-6">
        <AuditStatCards categoryCounts={categoryCounts} />
      </div>

      <div className="pb-6 pl-6 pr-6">
        <AuditServiceFilter selectedServices={serviceName} onChange={setServiceName} />
      </div>

      <div className="px-6">
        <AuditFilterBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          search={search}
          onSearchChange={setSearch}
          filterData={filterData}
          userId={userId}
          onUserChange={setUserId}
          category={category}
          onCategoryChange={setCategory}
          dateRange={dateRange}
          dateRangeOption={dateRangeOption}
          onPresetChange={handleDatePresetChange}
          onCustomRangeApply={handleCustomDateRange}
          onExport={handleExport}
        />
      </div>

      <div className="p-6">
        {viewMode === "table" ? (
          <DataTable
            columns={auditLogColumns}
            data={logs}
            isLoading={isLoading}
            emptyMessage="No audit logs found"
            pagination={pagination}
            onPageChange={setPage}
            rowKey={(row) => row.id}
          />
        ) : (
          <AuditAnalyticsPanel analytics={analytics} categoryCounts={categoryCounts} />
        )}
      </div>

      {viewMode === "graph" && (
        <AuditExportSheet
          analytics={analytics}
          categoryCounts={categoryCounts}
          filterData={filterData}
          userId={userId}
          category={category}
          dateRange={dateRange}
          dateRangeOption={dateRangeOption}
        />
      )}
    </div>
  );
}
