import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard-v2/DashboardStats";
import { RESOURCE_ICONS } from "@/components/dashboard-v2/DashboardResourceOverview";
import { DashboardQuota } from "@/components/dashboard-v2/DashboardQuota";
import { ServiceQuotasCard } from "@/components/dashboard-v2/ServiceQuotasCard";
import { RecentRequests } from "@/components/dashboard/RecentRequests";
import {
  useDashboardOverview,
  useCurrentUser,
  useServiceQuotas,
} from "@/hooks/useDashboard";

const Index = () => {
  const { data: overview } = useDashboardOverview();
  const { data: liveUser } = useCurrentUser();
  const { data: serviceQuotas, isLoading: quotasLoading } = useServiceQuotas();


  const resourceItems =
    (overview?.resourcesByService ?? []).map((item) => ({
      label: item.label,
      count: item.count,
      icon:
        {
          ec2: RESOURCE_ICONS.Server,
          vpc: RESOURCE_ICONS.Network,
          lb: RESOURCE_ICONS.GitBranch,
          s3: RESOURCE_ICONS.Database,
          rds: RESOURCE_ICONS.HardDrive,
          route53: RESOURCE_ICONS.Globe,
          eks: RESOURCE_ICONS.Boxes,
        }[item.service] ??
        RESOURCE_ICONS.Server,
    }));



  const quotaCurrent =
    overview?.quotaUsage?.current ??
    ((liveUser?.activeVMs ?? 0) +
    (liveUser?.provisioningVMs ?? 0));

  const quotaMax =
    overview?.quotaUsage?.max ??
    liveUser?.maxVMs ??
    0;

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Overview of your Splunk infrastructure"
        showNewRequest={true}
      />

      <div className="p-6 space-y-6">
        <DashboardStats
          totalResources={
            overview?.totalResources ?? 0
          }
          activeResources={
            overview?.activeResources ?? 0
          }
          provisioningCount={
            overview?.provisioningResources ?? 0
          }
          avgProvisionTime={
            overview?.averageProvisionTime?.formatted ??
            "0m 0s"
          }
          trend={overview?.resourceTrend}
        />

        {/* <DashboardQuota
          current={quotaCurrent}
          max={quotaMax}
        /> */}

        
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <RecentRequests />
          </div>

          <div className="xl:col-span-4">
            <ServiceQuotasCard
              quotas={serviceQuotas || []}
              isLoading={quotasLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
 