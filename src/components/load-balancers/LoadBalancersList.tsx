import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Scale,
  Globe,
  Shield,
  RefreshCw,
  Trash2,
  Monitor,
  ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
// import { Checkbox } from "@/components/ui/checkbox";
import { lbApi, type LbItem, type ExistingLbItem, type ProvisioningLbItem } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";
import { useAppStore } from "@/store/appStore";
import { LbTypeChooserDialog } from "./LbTypeChooserDialog";
import { LoadBalancerQuotaIncreaseDialog } from "./LoadBalancerQuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";

type LbRow = {
  id: string;
  requestId: string;
  name: string;
  state: string;
  statusColor: string;
  type: string;
  scheme: string;
  ipType: string;
  vpcId: string;
  vpc: string;
  subnets: string;
  region: string;
  created: string;
  azs: string;
  securityGroups: string;
  dnsName: string;
  arn: string;
  dateCreated: string;
};

export function LoadBalancersList() {
  const nav = useNavigate();
  const { alert, confirm } = useDialog();
  const user = useAppStore((s: any) => s.currentUser);
  const refreshCurrentUser = useAppStore(
    (s) => s.refreshCurrentUser
  );
  useEffect(() => {
    refreshCurrentUser();
  }, []);
  const MAX_LBS = user?.maxLoadBalancers ?? 2;
  const [lbs, setLbs] = useState<LbItem[]>([]);
  const userLbs = lbs.filter((lb: any) =>
    Number(lb.user_id) === Number(user?.id) ||
    Number(lb.userId) === Number(user?.id)
  );
  const userLoadBalancerCount = userLbs.length;
  const albCount = userLbs.filter((lb) => String(lb.type).toLowerCase() === "application").length;
  const nlbCount = userLbs.filter((lb) => String(lb.type).toLowerCase() === "network").length;

const maxPerType = MAX_LBS;
  const [loading, setLoading] = useState(true);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  // const [selected, setSelected] = useState<Set<string>>(new Set());
  const [provisioningAlb, setProvisioningAlb] = useState<ProvisioningLbItem | null>(null);
  const [provisioningNlb, setProvisioningNlb] = useState<ProvisioningLbItem | null>(null);
  const [existingLbs, setExistingLbs] = useState<ExistingLbItem[]>([]);
  // const [userOwnedLbs, setUserOwnedLbs] = useState<LbItem[]>([]);
  const [checkingProvisioning, setCheckingProvisioning] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fetchLbs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await lbApi.list();
      const data = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
          ? res
          : [];
      setLbs(data);
    } catch {
      console.error("Failed to fetch load balancers");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // const refreshUserOwnedLbs = async () => {
  //   if (!user?.id) {
  //     setUserOwnedLbs([]);
  //     return;
  //   }

  //   try {
  //     const res = await lbApi.list();
  //     setUserOwnedLbs((res as any).data ?? []);
  //   } catch {
  //     setUserOwnedLbs([]);
  //   }
  // };

  useEffect(() => { fetchLbs(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    setCheckingProvisioning(true);
    Promise.all([
      lbApi.checkProvisioning(user.id, "application").catch(() => ({ exists: false, loadBalancer: null })),
      lbApi.checkProvisioning(user.id, "network").catch(() => ({ exists: false, loadBalancer: null })),
    ])
      .then(([albRes, nlbRes]) => {
        setProvisioningAlb(albRes.loadBalancer ?? null);
        setProvisioningNlb(nlbRes.loadBalancer ?? null);
      })
      .finally(() => setCheckingProvisioning(false));
  }, [user?.id]);

  useEffect(() => {
    const hasPendingLb = Boolean(
      provisioningAlb || provisioningNlb || lbs.some((lb) => ["pending", "provisioning", "creating"].includes(String(lb.status || "").toLowerCase()))
    );

    if (!user?.id || !hasPendingLb) return;

    const interval = window.setInterval(() => {
      void fetchLbs(false);
      // void refreshUserOwnedLbs();
      Promise.all([
        lbApi.checkProvisioning(user.id, "application").catch(() => ({ exists: false, loadBalancer: null })),
        lbApi.checkProvisioning(user.id, "network").catch(() => ({ exists: false, loadBalancer: null })),
      ])
        .then(([albRes, nlbRes]) => {
          setProvisioningAlb(albRes.loadBalancer ?? null);
          setProvisioningNlb(nlbRes.loadBalancer ?? null);
        });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [user?.id, provisioningAlb, provisioningNlb, lbs]);

  // useEffect(() => {
  //   if (!user?.id) {
  //     setUserOwnedLbs([]);
  //     return;
  //   }

  //   let isMounted = true;
  //   refreshUserOwnedLbs().catch(() => undefined);

  //   return () => {
  //     isMounted = false;
  //   };
  // }, [user?.id]);


  const firstRegion = lbs[0]?.region;
  useEffect(() => {
    if (!user?.id || !firstRegion) return;
    setCheckingExisting(true);
    lbApi.checkExisting(firstRegion)
      .then((res) => setExistingLbs(res.loadBalancers ?? []))
      .catch(() => setExistingLbs([]))
      .finally(() => setCheckingExisting(false));
  }, [user?.id, firstRegion]);


  // const handleRemove = async (id: string, name: string) => {
  //   const confirmed = await confirm({
  //     title: `Delete load balancer "${name}"?`,
  //     description: "This will remove it from AWS immediately.",
  //     icon: "destroy",
  //   });
  //   if (!confirmed) return;

  //   const previousLbs = lbs;
  //   const previousUserOwnedLbs = userOwnedLbs;
  //   setLbs((prev) => prev.filter((lb) => lb.id !== id));
  //   setUserOwnedLbs((prev) => prev.filter((lb) => lb.id !== id));

  //   try {
  //     await lbApi.deleteSdk(id);
  //     await fetchLbs(false);
  //     await refreshUserOwnedLbs();
  //     alert({ title: `Load balancer "${name}" deleted`, severity: "success" });
  //   } catch (err: any) {
  //     setLbs(previousLbs);
  //     setUserOwnedLbs(previousUserOwnedLbs);
  //     alert({
  //       title: `Failed to delete "${name}"`,
  //       description: err?.message ?? "Unknown error",
  //       severity: "error",
  //     });
  //   }
  // };

  const handleRemove = async (id: string, name: string, requestId: string) => {
    const confirmed = await confirm({
      title: `Delete load balancer "${name}"?`,
      description: "This will remove it from AWS immediately.",
      icon: "destroy",
    });
    if (!confirmed) return;

    useAppStore.getState().setActiveRequest(requestId, "lb-cli-terminate-service");
    nav("/console");

    try {
      await lbApi.deleteSdk(id);
    } catch (err: any) {
      useAppStore.getState().setActiveRequest(null);
      alert({
        title: `Failed to delete "${name}"`,
        description: err?.message ?? "Unknown error",
        severity: "error",
      });
    }
  };


  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const lbStatusConfig: Record<string, { color: string }> = {
    pending: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    provisioning: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    creating: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    completed: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    active: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    failed: { color: "bg-red-500/20 text-red-400 border-red-500/30" },
    destroying: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    deleting: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    terminating: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    destroyed: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    deleted: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    terminated: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    retrying: { color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
    retrying_terminate: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };

  const getStatusColor = (status: string) => {
    return lbStatusConfig[status.toLowerCase()]?.color ?? lbStatusConfig.pending.color;
  };

  const lbStateLabel: Record<string, string> = {
    pending: "Pending",
    provisioning: "Provisioning",
    creating: "Creating",
    completed: "Active",
    active: "Active",
    failed: "Failed",
    destroying: "Destroying",
    deleting: "Deleting",
    terminating: "Terminating",
    destroyed: "Destroyed",
    deleted: "Deleted",
    terminated: "Terminated",
    retrying: "Retrying",
    retrying_terminate: "Retrying Terminate",
  };

  const rows: LbRow[] = useMemo(() =>
    lbs.filter((lb) => lb.status === "completed").map((lb) => ({
      id: lb.id,
      requestId: lb.request_id ?? "-",
      name: lb.name,
      state: lbStateLabel[lb.status.toLowerCase()] ?? lb.status,

        statusColor: getStatusColor(lb.status),

        type: lb.type === "application" ? "ALB" : lb.type === "network" ? "NLB" : lb.type.toUpperCase(),
        scheme: lb.scheme,
        ipType: lb.ip_address_type,
        vpcId: lb.vpc_id,
        vpc: lb.vpc_id,
        subnets: lb.subnets.map((s) => s.subnet_id).join(", ") || "-",
        region: lb.region,
        azs: lb.subnets.map((s) => s.availability_zone).join(", ") || "-",
        securityGroups: (lb.security_group_ids ?? []).join(", ") || "-",
        dnsName: "-",
        arn: "-",
        dateCreated: formatDate(lb.created_at),
        created: formatDate(lb.created_at),
      })), [lbs]
  );
  const remainingQuota = Math.max(
    0,
    MAX_LBS - userLoadBalancerCount
  );

  const filtered = useMemo(() => {
    const g = globalFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (g && !Object.values(r).some((v) => String(v).toLowerCase().includes(g))) return false;
      return true;
    });
  }, [rows, globalFilter]);

  // if (isError) {
  //   const message = error instanceof ApiError ? error.message : "Please try again later.";
  //   return (
  //     <div className="text-center py-10">
  //       <h2 className="text-xl font-semibold">Unable to load load balancers</h2>
  //       <p className="text-sm text-muted-foreground">{message}</p>
  //       <button
  //         onClick={() => fetchLbs()}
  //         className="mt-4 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/50"
  //       >
  //         Retry
  //       </button>
  //     </div>
  //   );
  // }

  const sorted = filtered;
  // const TERMINAL_STATUSES = ["failed", "destroyed", "deleted", "terminated"];

  // const activeUserLbs = lbs.filter(
  //   (lb) => lb.user_id === user?.id && !TERMINAL_STATUSES.includes(lb.status)
  // );

  // provisioningLb.type tells us which kind is currently mid-flight
  const quotaReached = userLoadBalancerCount >= MAX_LBS;
const isCreateDisabled = quotaReached;
const albBlocked = !!provisioningAlb || quotaReached || albCount >= maxPerType;
const nlbBlocked = !!provisioningNlb || quotaReached || nlbCount >= maxPerType;

const createDisabledReason = quotaReached
  ? `Load Balancer quota reached (${MAX_LBS}).`
  : undefined;
  // const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  // const toggleAll = () => {
  //   const next = new Set(selected);
  //   if (allSelected) sorted.forEach((r) => next.delete(r.id));
  //   else sorted.forEach((r) => next.add(r.id));
  //   setSelected(next);
  // };
  // const toggleOne = (id: string) => {
  //   const next = new Set(selected);
  //   next.has(id) ? next.delete(id) : next.add(id);
  //   setSelected(next);
  // };

  return (
    <div>
      <Header
        title="Load Balancers"
        subtitle="Network traffic management and distribution resources."
        showSearch={false}
      />

      <div className="space-y-4 p-6">

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            icon={<Scale className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value={rows.filter((r) => r.state === "Active").length}
            label="Total LBs"
          />

          <StatCard
            icon={<Globe className="h-4 w-4 text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            value={rows.filter((r) => r.type === "application" || r.type === "ALB").length}
            label="ALB"
          />

          <StatCard
            icon={<Shield className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            value={rows.filter((r) => r.type === "network" || r.type === "NLB").length}
            label="NLB"
          />

          <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <svg width={16} height={16} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" >
                  <path stroke="#F97316" fillRule="evenodd" clipRule="evenodd" d="M15.8447 16.1875H17.0172V15H15.8447V16.1875ZM12.3753 16.1875H13.5628V15H12.3753V16.1875ZM8.43785 16.1875H9.62532V15H8.43785V16.1875ZM4.98291 16.1875H6.12539V15H4.98291V16.1875ZM8.00035 7.4375H14.0002V4.5H8.00035V7.4375ZM17.5172 14H16.7502V12.3125C16.7502 12.036 16.5262 11.8125 16.2502 11.8125H15.0002V10.125C15.0002 9.8485 14.7762 9.625 14.5002 9.625H11.5003V8.4375H14.5002C14.7762 8.4375 15.0002 8.214 15.0002 7.9375V4C15.0002 3.7235 14.7762 3.5 14.5002 3.5H7.50036C7.22387 3.5 7.00037 3.7235 7.00037 4V7.9375C7.00037 8.214 7.22387 8.4375 7.50036 8.4375H10.5003V9.625H7.50036C7.22387 9.625 7.00037 9.8485 7.00037 10.125V11.8125H5.7504C5.4739 11.8125 5.2504 12.036 5.2504 12.3125V14H4.48242C4.20642 14 3.98243 14.2235 3.98243 14.5V16.6875C3.98243 16.964 4.20642 17.1875 4.48242 17.1875H6.62538C6.90137 17.1875 7.12537 16.964 7.12537 16.6875V14.5C7.12537 14.2235 6.90137 14 6.62538 14H6.25039V12.8125H8.31285V14H7.93786C7.66136 14 7.43786 14.2235 7.43786 14.5V16.6875C7.43786 16.964 7.66136 17.1875 7.93786 17.1875H10.1253C10.4013 17.1875 10.6253 16.964 10.6253 16.6875V14.5C10.6253 14.2235 10.4013 14 10.1253 14H9.31283V12.3125C9.31283 12.036 9.08883 11.8125 8.81284 11.8125H8.00035V10.625H14.0002V11.8125H13.1878C12.9113 11.8125 12.6878 12.036 12.6878 12.3125V14H11.8753C11.5988 14 11.3753 14.2235 11.3753 14.5V16.6875C11.3753 16.964 11.5988 17.1875 11.8753 17.1875H14.0627C14.3387 17.1875 14.5627 16.964 14.5627 16.6875V14.5C14.5627 14.2235 14.3387 14 14.0627 14H13.6878V12.8125H15.7502V14H15.3447C15.0682 14 14.8447 14.2235 14.8447 14.5V16.6875C14.8447 16.964 15.0682 17.1875 15.3447 17.1875H17.5172C17.7932 17.1875 18.0172 16.964 18.0172 16.6875V14.5C18.0172 14.2235 17.7932 14 17.5172 14ZM11.0003 21C5.4859 21 0.999982 16.514 0.999982 11C0.999982 5.486 5.4859 1 11.0003 1C16.5142 1 21 5.486 21 11C21 16.514 16.5142 21 11.0003 21ZM11.0003 0C4.93441 0 0 4.9345 0 11C0 17.0655 4.93441 22 11.0003 22C17.0652 22 22 17.0655 22 11C22 4.9345 17.0652 0 11.0003 0Z" fill="#F97316" />
                </svg>
              </div>

              <div>
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {remainingQuota}
                </p>

                <p className="text-xs text-muted-foreground">
                  Quota Remaining
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-primary text-primary bg-primary/10 text-xs whitespace-nowrap hover:bg-primary hover:text-white"
              onClick={() => setShowQuotaDialog(true)}
            >
              <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
              Request Increase
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
          <CardContent className="py-0 px-0">
            <div className="flex items-center gap-3 p-4 px-6">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search by name, region, or request ID..."
                  className="pl-9 bg-background/50"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full shrink-0"
                onClick={async () => {
                  await Promise.all([
                    fetchLbs(),
                    refreshCurrentUser(),
                  ]);

                  alert({
                    title: "Refreshed",
                    severity: "success",
                  });
                }}
              >
                <RefreshCw size={14} />
              </Button>

              <Button
                className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0"
                title={!loading ? createDisabledReason ?? undefined : undefined}
                tooltip={
                  !loading && createDisabledReason
                    ? createDisabledReason
                    : undefined
                }
                onClick={() => {
                  if (!loading && !isCreateDisabled) {
                    setChooserOpen(true);
                  }
                }}
                disabled={loading || isCreateDisabled}
              >
                <Plus size={14} />
                Create Load Balancer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm min-w-[1200px]">

              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">

                  {/* <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </th> */}

                  {[
                    "Request ID",
                    "LB Name",
                    "Type",
                    "VPC",
                    "Region",
                    "Created",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}

                  <th className="px-5 py-3 text-right font-medium">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-16 text-center text-muted-foreground">
                      No Load Balancers found.
                    </td>
                  </tr>
                )}

                {sorted.map((r) => (

                  <tr
                    key={r.id}
                    className="border-b border-border/40 hover:bg-accent/20"
                  >

                    {/* <td className="px-5 py-4">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleOne(r.id)}
                      />
                    </td> */}

                    <td className="px-5 py-4 font-mono text-muted-foreground text-xs">
                      {r.requestId}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      <button
                        onClick={() => nav(`/aws/load-balancers/${encodeURIComponent(r.id)}`)}
                        className="text-primary hover:underline text-left"
                      >
                        {r.name}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-orange-500 px-2.5 py-1 text-xs font-medium text-white">
                        {r.type}
                      </span>
                    </td>

                    {/* <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-400">
                        {r.scheme}
                      </span>
                    </td> */}

                    {/* <td className="px-5 py-4">
                      {r.ipType}
                    </td> */}

                    <td className="px-5 py-4 font-mono text-muted-foreground">
                      {r.vpc}
                    </td>
                    {/* 
                    <td className="px-5 py-4">
                      {r.subnets}
                    </td> */}

                    <td className="px-5 py-4">
                      {r.region}
                    </td>

                    <td className="px-5 py-4">
                      {r.created}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs capitalize ${r.statusColor}`}
                      >
                        {/* <CheckCircle2 size={12} /> */}
                        {r.state}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">

                      <button
                        onClick={() => handleRemove(r.id, r.name, r.requestId)}
                        disabled={r.state.toLowerCase() === "provisioning"}
                        className={`p-1.5 rounded-md transition-colors ${r.state.toLowerCase() === "provisioning"
                          ? "cursor-not-allowed opacity-50 text-muted-foreground"
                          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          }`}
                        title={
                          r.state.toLowerCase() === "provisioning"
                            ? "Cannot delete while provisioning"
                            : "Delete Load Balancer"
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      <LbTypeChooserDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onSelect={(type) => {
          setChooserOpen(false);
          nav(`/aws/load-balancers/create/${type}`);
        }}
        albDisabled={albBlocked}
        nlbDisabled={nlbBlocked}
      />

      <LoadBalancerQuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxLoadBalancers={MAX_LBS}
        usedLoadBalancers={userLoadBalancerCount}
        requestedquota={requestedQuota}
        setrequestedquota={setRequestedQuota}
        reason={reason}
        setreason={setReason}
        submitquota={submitQuota}
        quotaError={quotaError}
        setQuotaError={setQuotaError}
        touched={touched}
        setTouched={setTouched}
        isMAxREached={false}
        onSubmit={async (approverEmail) => {
          try {
            setSubmitQuota(true);

            const token = localStorage.getItem("token");

            const response = await fetch(
              `${env.lbService}/lb-quota/${user?.id}/request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                },
                body: JSON.stringify({
                  requestedQuota: requestedQuota - MAX_LBS,
                  reason,
                  approverEmail,
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data?.message ||
                data?.error ||
                "Failed to submit LB quota request"
              );
            }

            alert({
              title: "Load Balancer quota request submitted successfully",
              severity: "success",
            });

            setShowQuotaDialog(false);
            setRequestedQuota(0);
            setReason("");
            setTouched(false);
            setQuotaError("");

          } catch (error: any) {
            alert({
              title:
                error?.message ||
                "Failed to submit LB quota request",
              severity: "error",
            });
          } finally {
            setSubmitQuota(false);
          }
        }}
      />

    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
