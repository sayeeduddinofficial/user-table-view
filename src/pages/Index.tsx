// import { Header } from "@/components/layout/Header";
// import { StatCard } from "@/components/dashboard/StatCard";
// import { QuotaCard } from "@/components/dashboard/QuotaCard";
// import { RecentRequests } from "@/components/dashboard/RecentRequests";
// import { RoleDistribution } from "@/components/dashboard/RoleDistribution";
// import { Server, Activity, Users, Clock } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import { env } from "@/lib/env";
// import axios from "axios";
// import { DashboardStats } from "@/components/dashboard-v2/DashboardStats";
// import { DashboardQuota } from "@/components/dashboard-v2/DashboardQuota";
// import {DashboardResourceOverview, RESOURCE_ICONS} from "@/components/dashboard-v2/DashboardResourceOverview";
// import { DashboardRecentActivity } from "@/components/dashboard-v2/DashboardRecentActivity";

// const Index = () => {
//   const API_BASE = env.vmRequest;
//   const API_AUTH_BASE = env.auth;
//   // async function getAccessToken() {
//   //   return localStorage.getItem("token");
//   // }

//   const fetchAWSCounts = async () => {
//     const res = await axios.get(`${API_BASE}/api/vms/summary/db`);
//     return res.data.data;
//   };

//   const fetchAverageProvisionTime = async () => {
//     const res = await axios.get(`${API_BASE}/api/dashboard/average-provision-time`);
//     return res.data.status === "SUCCESS" ? res.data.data : res.data;
//   };

//   const { data: avgProvisionData } = useQuery({
//     queryKey: ["average-provision-time"],
//     queryFn: fetchAverageProvisionTime,
//     refetchInterval: 30000, // refresh every 30s
//     staleTime: 1000 * 60,
//     gcTime: 1000 * 60 * 5,
//   });

//   const fetchAWSActiveUsers = async () => {
//     const res = await axios.get(`${API_BASE}/api/dashboard/dashboard/summary/users`);
//     const data = res.data.status === "SUCCESS" ? res.data.data : res.data;
//     return data.count;
//   };

//   const fetchProcessingRequestsCount = async () => {
//     const res = await axios.get(`${API_BASE}/api/dashboard/dashboard/summary/processing-requests`);
//     const data = res.data.status === "SUCCESS" ? res.data.data : res.data;
//     return data.processingCount;
//   };

//   const { data: summary } = useQuery({
//     queryKey: ["db-summary"],
//     queryFn: fetchAWSCounts,
//     refetchInterval: 15000,
//     staleTime: 1000 * 60,
//     gcTime: 1000 * 60 * 5,
//   });

//   const { data: activeUsersCount } = useQuery({
//     queryKey: ["aws-active-users"],
//     queryFn: fetchAWSActiveUsers,
//     refetchInterval: 30000, 
//     staleTime: 1000 * 60 * 5,
//     gcTime: 1000 * 60 * 10,
//   });

//   const { data: processingRequestsCount } = useQuery({
//     queryKey: ["processing-requests-count"],
//     queryFn: fetchProcessingRequestsCount,
//     refetchInterval: 15000, 
//     staleTime: 1000 * 60,
//     gcTime: 1000 * 60 * 5,
//   });
//   const fetchCurrentUser = async () => {
//     const res = await axios.get(`${API_AUTH_BASE}/api/auth/me`);
//     return res.data.data.user;
//   };
//   const { data: liveUser } = useQuery({
//     queryKey: ["current-user"],
//     queryFn: fetchCurrentUser,
//     refetchInterval: 15000, 
//     staleTime: 0,
//     enabled: !!localStorage.getItem("token"),
//   });
//   const activeVMs = liveUser?.activeVMs ?? 0;
//   const provisioningVMs = liveUser?.provisioningVMs ?? 0;

//   const usedVMs = activeVMs + provisioningVMs;

//   console.log(summary, "summary data");

//   const trend:
//     | {
//       value: number;
//       display: string;
//       tooltip: string;
//       positive: boolean;
//       showTooltip?: boolean;
//     }
//     | undefined = (() => {
//       if (
//         summary?.avgToday === undefined ||
//         summary?.avgYesterday === undefined
//       ) {
//         return undefined;
//       }
//       const avgToday = summary.avgToday;
//       const avgYesterday = summary.avgYesterday;

//       if (avgYesterday === 0) {
//         if (avgToday === 0) {
//           return {
//             value: 0,
//             display: "0%",
//             tooltip: "0%",
//             positive: true
//           };
//         }

//         return {
//           value: 100,
//           display: "New",
//           tooltip: "New activity compared to last week",
//           positive: true
//         };
//       }

//       const rawPercent = ((avgToday - avgYesterday) / avgYesterday) * 100;

//       const positive = rawPercent >= 0;
//       const absPercent = Math.abs(rawPercent);
//       const overHundred = absPercent > 100;
//       return {
//         value: absPercent,
//         display: overHundred ? "100%+" : `${absPercent.toFixed(2)}%`,
//         tooltip: `${absPercent.toFixed(2)}%`,
//         positive,
//         showTooltip: overHundred
//       };
//     })();
//   const valueForActiveVms =
//     summary?.running !== undefined && summary?.stopped !== undefined
//       ? summary.running + summary.stopped
//       : null;
//   console.log(trend, "trend");
//   return (
//     <div className="min-h-screen">
//       <Header
//         title="Dashboard"
//         subtitle="Overview of your Splunk infrastructure"
//         showNewRequest={true}
//       />

//      <div className="p-6 space-y-6">
//         <DashboardStats
//           totalResources={valueForActiveVms ?? 2}
//           activeResources={activeUsersCount ?? 6}
//           provisioningCount={processingRequestsCount ?? 5}
//           avgProvisionTime={avgProvisionData?.formatted ?? "1m 42s"}
//           trend={trend}
//         />

//         <DashboardQuota
//           current={usedVMs}
//           max={liveUser?.maxVMs ?? 0}
//         />

//  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
//   <div className="xl:col-span-6">
//     <DashboardResourceOverview
//       resources={[
//         {
//           label: "EC2 Instances",
//           count: 2,
//           icon: RESOURCE_ICONS.Server,
//         },
//         {
//           label: "S3 Buckets",
//           count: 1,
//           icon: RESOURCE_ICONS.Network,
//         },
//         {
//           label: "VPCs",
//           count: 1,
//           icon: RESOURCE_ICONS.Network,
//         },
//         {
//           label: "Route 53 Zones",
//           count: 1,
//           icon: RESOURCE_ICONS.Globe,
//         },
//         {
//           label: "Load Balancers",
//           count: 1,
//           icon: RESOURCE_ICONS.GitBranch,
//         },
//       ]}
//     />
//   </div>

//   <div className="xl:col-span-6">
//     <DashboardRecentActivity
//       activities={[
//         {
//           id: "1",
//           title: "SSH Key Generated EC2 splunkops-key",
//           user: "Prudent Admin",
//           timestamp: "7/17/2026, 1:24 PM",
//         },
//         {
//           id: "2",
//           title: "Cluster Setup Started",
//           user: "Prudent Admin",
//           timestamp: "7/16/2026, 6:20 PM",
//         },
//         {
//           id: "3",
//           title: "SSH Test Passed",
//           user: "Prudent Admin",
//           timestamp: "7/16/2026, 6:14 PM",
//         },
//       ]}
//     />
//   </div>
// </div>
//     </div>
//         </div>
//       );
// };

// export default Index;



import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard-v2/DashboardStats";
import {DashboardResourceOverview, RESOURCE_ICONS
} from "@/components/dashboard-v2/DashboardResourceOverview";
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
 