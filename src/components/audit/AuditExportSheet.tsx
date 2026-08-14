import type { AuditAnalyticsResponse, AuditFiltersResponse } from "@/types/api";
import { AuditDateRange, AUDIT_GRAPHS_CONTAINER_ID } from "@/hooks/useAuditLogsPage";
import { AuditAnalyticsPanel } from "./AuditAnalyticsPanel";
import { getDateRangeDisplay } from "./auditUtils";

interface AuditExportSheetProps {
  analytics?: AuditAnalyticsResponse;
  categoryCounts: Record<string, number>;
  filterData: AuditFiltersResponse;
  userId: string[];
  category: string[];
  dateRange: AuditDateRange;
  dateRangeOption: string;
}

/** Off-screen render of the graph view used as the source for PNG/PDF exports. */
export function AuditExportSheet({
  analytics,
  categoryCounts,
  filterData,
  userId,
  category,
  dateRange,
  dateRangeOption,
}: AuditExportSheetProps) {
  const selectedUsers = userId.length
    ? userId
        .map(
          (id) =>
            filterData.users.find((user) => String(user.user_id) === id)?.user_name,
        )
        .filter(Boolean)
        .join(", ")
    : "All Users";

  return (
    <div style={{ position: "fixed", left: "-9999px", top: 0, width: "1200px" }}>
      <div id={AUDIT_GRAPHS_CONTAINER_ID} className="bg-background p-6 space-y-6">
        <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
          <h2 className="text-lg font-bold text-foreground mb-2">Audit Logs Export</h2>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Date Range: </span>
              <span className="text-foreground font-medium">
                {getDateRangeDisplay(dateRangeOption, dateRange)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Users: </span>
              <span className="text-foreground font-medium">{selectedUsers}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Categories: </span>
              <span className="text-foreground font-medium">
                {category.length > 0 ? category.join(", ") : "All Categories"}
              </span>
            </div>
          </div>
        </div>

        <AuditAnalyticsPanel analytics={analytics} categoryCounts={categoryCounts} />
      </div>
    </div>
  );
}