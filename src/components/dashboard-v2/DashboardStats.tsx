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
        title="Total Resources"
        value={totalResources}
        subtitle="Across all services"
      />
      <StatCard
        title="Active"
        value={activeResources}
        subtitle="Healthy & running"
        variant="success"
        trend={trend}
      />
      <StatCard
        title="Provisioning"
        value={provisioningCount}
        subtitle="Terraform in progress"
        variant="warning"
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