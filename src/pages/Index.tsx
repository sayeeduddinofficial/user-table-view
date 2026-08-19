import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ServiceQuotasCard } from "@/components/dashboard/ServiceQuotasCard";
import { RecentRequests } from "@/components/dashboard/RecentRequests";
import { useDashboardOverview, useServiceQuotas } from "@/hooks/useDashboard";

const Index = () => {
  const { data: overview } = useDashboardOverview();
  const { data: serviceQuotas = [], isLoading: quotasLoading } = useServiceQuotas();

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Overview of your Splunk infrastructure"
        showNewRequest
      />

      <div className="p-6 space-y-6">
        <DashboardStats
          totalResources={overview?.totalResources ?? 0}
          activeResources={overview?.activeResources ?? 0}
          provisioningCount={overview?.provisioningResources ?? 0}
          avgProvisionTime={overview?.averageProvisionTime?.formatted ?? "0m 0s"}
          trend={overview?.resourceTrend}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <RecentRequests />
          </div>

          <div className="xl:col-span-4">
            <ServiceQuotasCard quotas={serviceQuotas} isLoading={quotasLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
