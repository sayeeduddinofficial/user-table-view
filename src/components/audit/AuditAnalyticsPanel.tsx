import type { AuditAnalyticsResponse } from "@/types/api";
import { ActivityTimelineChart } from "./ActivityTimelineChart";
import { CategorySplitChart } from "./CategorySplitChart";
import { TopUsersChart } from "./TopUsersChart";
import { VMLifecycleChart } from "./VMLifecycleChart";
import { RequestManagementChart } from "./RequestManagementChart";
import { HourlyActivityChart } from "./HourlyActivityChart";
import { EMPTY_REQUEST_MANAGEMENT, EMPTY_VM_LIFECYCLE } from "./auditConstants";

interface AuditAnalyticsPanelProps {
  analytics?: AuditAnalyticsResponse;
  categoryCounts: Record<string, number>;
}

export function AuditAnalyticsPanel({ analytics, categoryCounts }: AuditAnalyticsPanelProps) {
  return (
    <div className="space-y-6">
      <ActivityTimelineChart data={analytics?.activityTimeline ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategorySplitChart data={categoryCounts} />
        <TopUsersChart data={analytics?.topUsers ?? []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VMLifecycleChart data={analytics?.vmLifecycle ?? EMPTY_VM_LIFECYCLE} />
        <RequestManagementChart
          data={analytics?.requestManagement ?? EMPTY_REQUEST_MANAGEMENT}
        />
      </div>

      <HourlyActivityChart data={analytics?.hourlyActivity ?? []} />
    </div>
  );
}