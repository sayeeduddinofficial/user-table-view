import { Server, Activity, Users, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

interface Props {
  totalResources: number;
  activeResources: number;
  provisioningCount: number;
  avgProvisionTime: string;
  trend?: {
    value: number;
    display: string;
    tooltip: string;
    positive: boolean;
    showTooltip?: boolean;
  };
}

export function DashboardStats({
  totalResources,
  activeResources,
  provisioningCount,
  avgProvisionTime,
  trend,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
     <StatCard
        title="Active Resources"
        value={totalResources}
        subtitle="Across all services & regions"
        icon={Server}
        variant="primary"
        trend={trend}
      />
       <StatCard
        title="Running Operations"
        value={provisioningCount}
        subtitle="Automation in progress"
        variant="warning"
        icon={Activity}
      />
      <StatCard
        title="Active Users"
        value={activeResources}
        subtitle="With active services"
        variant="success"
        icon={Users}
      />     
      <StatCard
        title="Avg. Provision Time"
        value={avgProvisionTime}
        subtitle="Last 7 days"
        icon={Activity}   
      />
    </div>
  );
}