import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuotaCard } from "@/components/dashboard/QuotaCard";
import { RecentRequests } from "@/components/dashboard/RecentRequests";
import { RoleDistribution } from "@/components/dashboard/RoleDistribution";
import { Server, Activity, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { env } from "@/lib/env";
import axios from "axios";

const Index = () => {
  const API_BASE = env.vmRequest;
  const API_AUTH_BASE = env.auth;
  // async function getAccessToken() {
  //   return localStorage.getItem("token");
  // }

  const fetchAWSCounts = async () => {
    const res = await axios.get(`${API_BASE}/api/vms/summary/db`);
    return res.data.data;
  };

  const fetchAverageProvisionTime = async () => {
    const res = await axios.get(`${API_BASE}/api/dashboard/average-provision-time`);
    return res.data.status === "SUCCESS" ? res.data.data : res.data;
  };

  const { data: avgProvisionData } = useQuery({
    queryKey: ["average-provision-time"],
    queryFn: fetchAverageProvisionTime,
    refetchInterval: 30000, // refresh every 30s
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  const fetchAWSActiveUsers = async () => {
    const res = await axios.get(`${API_BASE}/api/dashboard/dashboard/summary/users`);
    const data = res.data.status === "SUCCESS" ? res.data.data : res.data;
    return data.count;
  };

  const fetchProcessingRequestsCount = async () => {
    const res = await axios.get(`${API_BASE}/api/dashboard/dashboard/summary/processing-requests`);
    const data = res.data.status === "SUCCESS" ? res.data.data : res.data;
    return data.processingCount;
  };

  const { data: summary } = useQuery({
    queryKey: ["db-summary"],
    queryFn: fetchAWSCounts,
    refetchInterval: 15000,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  const { data: activeUsersCount } = useQuery({
    queryKey: ["aws-active-users"],
    queryFn: fetchAWSActiveUsers,
    refetchInterval: 30000, // users don't change as often as VMs
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: processingRequestsCount } = useQuery({
    queryKey: ["processing-requests-count"],
    queryFn: fetchProcessingRequestsCount,
    refetchInterval: 15000, // same as VM summary (since status changes often)
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });
  const fetchCurrentUser = async () => {
    const res = await axios.get(`${API_AUTH_BASE}/api/auth/me`);
    return res.data.data.user;
  };
  const { data: liveUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    refetchInterval: 15000, // every 15 sec
    staleTime: 0,
    enabled: !!localStorage.getItem("token"),
  });
  const activeVMs = liveUser?.activeVMs ?? 0;
  const provisioningVMs = liveUser?.provisioningVMs ?? 0;

  const usedVMs = activeVMs + provisioningVMs;

  console.log(summary, "summary data");

  const trend:
    | {
      value: number;
      display: string;
      tooltip: string;
      positive: boolean;
      showTooltip?: boolean;
    }
    | undefined = (() => {
      if (
        summary?.avgToday === undefined ||
        summary?.avgYesterday === undefined
      ) {
        return undefined;
      }
      const avgToday = summary.avgToday;
      const avgYesterday = summary.avgYesterday;

      if (avgYesterday === 0) {
        if (avgToday === 0) {
          return {
            value: 0,
            display: "0%",
            tooltip: "0%",
            positive: true
          };
        }

        return {
          value: 100,
          display: "New",
          tooltip: "New activity compared to last week",
          positive: true
        };
      }

      const rawPercent = ((avgToday - avgYesterday) / avgYesterday) * 100;

      const positive = rawPercent >= 0;
      const absPercent = Math.abs(rawPercent);
      const overHundred = absPercent > 100;
      return {
        value: absPercent,
        display: overHundred ? "100%+" : `${absPercent.toFixed(2)}%`,
        tooltip: `${absPercent.toFixed(2)}%`,
        positive,
        showTooltip: overHundred
      };
    })();
  const valueForActiveVms =
    summary?.running !== undefined && summary?.stopped !== undefined
      ? summary.running + summary.stopped
      : null;
  console.log(trend, "trend");
  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Overview of your Splunk infrastructure"
        showNewRequest={true}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active VMs"
            value={ valueForActiveVms ?? "--"}
            subtitle="Across all regions"
            icon={Server}
            variant="primary"
            trend={trend}
          />
          <StatCard
            title="Running Operations"
            value={processingRequestsCount}
            subtitle="Terraform in progress"
            icon={Activity}
            variant="warning"
          />
          <StatCard
            title="Active Users"
            value={activeUsersCount ?? "--"}
            subtitle="With VM access"
            icon={Users}
            variant="success"
          />
          <StatCard
            title="Avg. VM Request Duration"
            value={avgProvisionData?.formatted ?? "--"}
            subtitle={`Last 7 days`}
            icon={Clock}
          />
        </div>

        {/* Quota Card */}
        <QuotaCard
          current={usedVMs}
          max={liveUser?.maxVMs ?? 0}
          label="Your VM Quota"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentRequests />
          </div>
          <div>
            <RoleDistribution />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
 