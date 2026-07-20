import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Scale,
  Globe,
  Shield,
  Clock3,
  RefreshCw,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { lbApi, type LbItem, type ExistingLbItem, type ProvisioningLbItem } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";
import { useAppStore } from "@/store/appStore";
import { LbTypeChooserDialog } from "./LbTypeChooserDialog";

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
  const [lbs, setLbs] = useState<LbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [provisioningLb, setProvisioningLb] = useState<ProvisioningLbItem | null>(null);
  const [existingLbs, setExistingLbs] = useState<ExistingLbItem[]>([]);
  const [userOwnedLbs, setUserOwnedLbs] = useState<LbItem[]>([]);
  const [checkingProvisioning, setCheckingProvisioning] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fetchLbs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await lbApi.list();
      setLbs((res as any).data ?? []);
    } catch {
      alert({ title: "Failed to load load balancers", severity: "error" });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshUserOwnedLbs = async () => {
    if (!user?.id) {
      setUserOwnedLbs([]);
      return;
    }

    try {
      const res = await lbApi.list();
      setUserOwnedLbs((res as any).data ?? []);
    } catch {
      setUserOwnedLbs([]);
    }
  };

  useEffect(() => { fetchLbs(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    setCheckingProvisioning(true);
    lbApi.checkProvisioning(user.id)
      .then((res) => setProvisioningLb(res.loadBalancer ?? null))
      .catch(() => setProvisioningLb(null))
      .finally(() => setCheckingProvisioning(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUserOwnedLbs([]);
      return;
    }

    let isMounted = true;
    refreshUserOwnedLbs().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const region = lbs[0]?.region ?? "us-east-2";
    if (!user?.id) return;
    setCheckingExisting(true);
    lbApi.checkExisting(region)
      .then((res) => setExistingLbs(res.loadBalancers ?? []))
      .catch(() => setExistingLbs([]))
      .finally(() => setCheckingExisting(false));
  }, [user?.id, lbs[0]?.region]);


  const handleRemove = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Delete load balancer "${name}"?`,
      description: "This will remove it from AWS immediately.",
      icon: "destroy",
    });
    if (!confirmed) return;

    const previousLbs = lbs;
    const previousUserOwnedLbs = userOwnedLbs;
    setLbs((prev) => prev.filter((lb) => lb.id !== id));
    setUserOwnedLbs((prev) => prev.filter((lb) => lb.id !== id));

    try {
      await lbApi.deleteSdk(id);
      await fetchLbs(false);
      await refreshUserOwnedLbs();
      alert({ title: `Load balancer "${name}" deleted`, severity: "success" });
    } catch (err: any) {
      setLbs(previousLbs);
      setUserOwnedLbs(previousUserOwnedLbs);
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

  const rows: LbRow[] = useMemo(() =>
    lbs.map((lb) => ({
      id: lb.id,
      requestId: lb.request_id ?? "-",
      name: lb.name,
      state: lb.status === "active"
        ? "Completed"
        : lb.status.charAt(0).toUpperCase() + lb.status.slice(1),

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



  const filtered = useMemo(() => {
    const g = globalFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (g && !Object.values(r).some((v) => String(v).toLowerCase().includes(g))) return false;
      return true;
    });
  }, [rows, globalFilter]);

  if (loading) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Loading load balancers...</h2>
      </div>
    );
  }

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
  const hasUserCreatedBalancer = !!user?.id && userOwnedLbs.some(lb => lb.user_id === user.id);
  const createDisabledReason = provisioningLb
    ? `"${provisioningLb.name}" is still provisioning. Wait for it to finish before creating another.`
    : hasUserCreatedBalancer
      ? "You already have a load balancer under your name. Use the existing one or delete it before creating a new one."
      : null;
  const isCreateDisabled = !!createDisabledReason;

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) sorted.forEach((r) => next.delete(r.id));
    else sorted.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <Header
        title="Load Balancers"
        subtitle="Application and Network Load Balancers provisioned via Terraform"
        showSearch={false}
      />

      <div className="space-y-4 px-6 pb-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Scale className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value={rows.length}
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

          <StatCard
            icon={<Clock3 className="h-4 w-4 text-amber-400" />}
            iconBg="bg-amber-500/10"
            value={rows.filter((r) => r.state === "Provisioning").length}
            label="Provisioning"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by name, region, or request ID..."
              className="pl-9 bg-card/50 border-border/50"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => fetchLbs()}
          >
            <RefreshCw size={14} />
          </Button>

          <Button
            className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0"
            title={!loading ? createDisabledReason ?? undefined : undefined}
            tooltip={!loading && createDisabledReason ? "Maximum 1 balancer limit reached." : undefined}
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
                        onClick={() => handleRemove(r.id, r.name)}
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
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
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
