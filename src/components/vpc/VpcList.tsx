import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
  ArrowUpCircle,
} from "lucide-react";
import { useVpcList } from "@/hooks/useVpcList";
import { useAppStore } from "@/store/appStore";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { VpcDetailsPanel } from "@/components/vpc/VpcDetailsPanel";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, RotateCcw } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";
import { deleteVpcApi } from "@/services/vpcService";
import { useNavigate } from "react-router-dom";
import { VpcQuotaIncreaseDialog } from "@/components/vpc/VpcQuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";
import { useQueryClient } from "@tanstack/react-query";

function getAvailabilityZonesCount(v: any) {
  if (typeof v?.zones === "number") return v.zones;
  if (Array.isArray(v?.zones)) return v.zones.length;
  if (Array.isArray(v?.availability_zones)) return v.availability_zones.length;
  if (Array.isArray(v?.raw?.availability_zones)) return v.raw.availability_zones.length;
  if (Array.isArray(v?.meta?.availability_zones)) return v.meta.availability_zones.length;
  if (typeof v?.meta?.availabilityZones === "number") return v.meta.availabilityZones;
  if (typeof v?.meta?.zoneCount === "number") return v.meta.zoneCount;
  return 0;
}

function formatCreatedDate(dateString: string | undefined | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function VpcList() {
  const { query, setQuery, filtered, selected, refresh, loading, pendingCount, allVpcs } = useVpcList();
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const updateVpc = useAppStore((s) => s.updateVpc);
  const queryClient = useQueryClient();
  const MAX_VPCS = currentUser?.maxVpcs ?? 1;
  const refreshCurrentUser = useAppStore((s) => s.refreshCurrentUser);

  useEffect(() => {
    refreshCurrentUser();
  }, []);

  const userVpcCount = allVpcs.filter(
    (v: any) =>
      Number(v.userId) === Number(currentUser?.id) ||
      Number(v.user_id) === Number(currentUser?.id)
  ).length;

  const totalVpcs = userVpcCount + pendingCount;
  const activeVpcs = allVpcs.filter((v: any) => v.status === "available").length;
  const hasReachedQuota = totalVpcs >= MAX_VPCS;

  const remainingQuota = Math.max(0, MAX_VPCS - totalVpcs);
  const activeSubnets = allVpcs.reduce((total, v) => total + (v.subnetCount ?? 0), 0);
  const withNat = allVpcs.reduce((total, v) => total + (v.natGateways ?? 0), 0);

  const [dialog, setDialog] = useState<{
    icon?: "destroy" | "retry" | "info";
    title: string;
    description?: string;
    onConfirm?: () => void;
  } | null>(null);
  const [deletingVpcId, setDeletingVpcId] = useState<string | null>(null);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);

  const handleDeleteRow = (vpc: any) => {
    setDialog({
      icon: "destroy",
      title: `Delete ${vpc.name || vpc.id}?`,
      onConfirm: async () => {
        setDeletingVpcId(vpc.id);
        updateVpc(vpc.id, { status: "deleting" });
        setActiveRequest(vpc.id, "vpc-terminate-service");
        navigate("/console");
        try {
          await deleteVpcApi(vpc.awsVpcId);
          queryClient.invalidateQueries({ queryKey: ["activeRequests"] });
          queryClient.invalidateQueries({ queryKey: ["requestDetails", vpc.id] });
        } catch (error) {
          updateVpc(vpc.id, { status: "available" });
          setActiveRequest(null);
          alert({ title: `Failed to delete VPC ${vpc.name || vpc.id}`, severity: "error" });
        } finally {
          setDeletingVpcId(null);
        }
      },
    });
  };

  const handleClose = (confirmed: boolean) => {
    if (confirmed) {
      dialog?.onConfirm?.();
    } else {
      setDeletingVpcId(null);
    }
    setDialog(null);
  };

  const { alert } = useDialog();

  const handleRefresh = async () => {
    try {
      await Promise.all([refresh(), refreshCurrentUser()]);
      alert({ title: "Refreshed", severity: "success" });
    } catch {
      alert({ title: "Failed to Refresh", severity: "error" });
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap gap-3">
        <StatCard icon={<Network className="h-4 w-4 text-primary" />} iconBg="bg-primary/10" value={activeVpcs} label="Total VPCs" />
        <StatCard icon={<Layers className="h-4 w-4 text-cyan-400" />} iconBg="bg-cyan-500/10" value={activeSubnets} label="Active Subnets" />
        <StatCard icon={<Globe className="h-4 w-4 text-emerald-400" />} iconBg="bg-emerald-500/10" value={withNat} label="With NAT" />
        <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <svg width={18} height={18} viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path stroke="#8B5CF6" fillRule="evenodd" clipRule="evenodd" d="M19 11.4873L17.2495 10.7529V17.9372C18.953 17.5722 18.999 15.5884 19 15.4959V11.4873ZM16.2495 17.9597V10.7529L14.5 11.4873V15.5004C14.504 15.7314 14.5915 17.6677 16.2495 17.9597ZM16.556 9.54001C16.679 9.48752 16.819 9.48802 16.943 9.53951L19.6936 10.6939C19.8796 10.7719 20 10.9534 20 11.1549V15.5004C19.989 16.7138 19.281 19.0002 16.685 19.0002C14.1965 19.0002 13.513 16.7143 13.5 15.5059V11.1549C13.5 10.9534 13.6205 10.7719 13.8065 10.6939L16.556 9.54001ZM21 9.89498L16.746 8.04515L12.4999 9.83298V15.011C12.4995 15.0435 12.4815 17.5028 13.9035 18.9452C14.5935 19.6451 15.5295 20.0001 16.685 20.0001C20.904 20.0001 20.998 15.211 21 15.0075V9.89498ZM22 9.56701V15.011C21.9864 17.0848 20.858 21 16.685 21C15.249 21 14.0725 20.543 13.1865 19.6421C11.4705 17.8967 11.498 15.12 11.5 15.0025V9.50102C11.5 9.30003 11.6205 9.11805 11.806 9.04006L16.5555 7.04025C16.6815 6.98726 16.8235 6.98825 16.9485 7.04275L21.699 9.10855C21.882 9.18805 22 9.36803 22 9.56701ZM4.5 13.5006H10V14.5005H4.5C2.108 14.5005 0.1355 12.7402 0.01 10.4929C0.00100004 10.4054 0 10.2984 0 10.1914C0 7.5422 1.827 6.5183 2.9595 6.13834C2.951 6.03085 2.9455 5.92086 2.9455 5.81237C2.9455 3.51909 4.329 1.35029 6.3105 0.539369C8.79 -0.475032 11.6175 -0.0315743 13.3475 1.64226C13.859 2.14072 14.302 2.79765 14.6715 3.60258C15.1495 3.21061 15.696 3.00163 16.2615 3.00163C17.617 3.00163 19.1406 4.14753 19.45 6.03035C20.5346 6.17133 21.468 6.81877 21.948 7.79018L21.052 8.23364C20.67 7.46171 19.903 7.00125 19 7.00125C18.7355 7.00125 18.5165 6.79477 18.501 6.5308C18.4035 4.88046 17.1375 4.00154 16.2615 4.00154C15.775 4.00154 15.291 4.28651 14.8985 4.80346C14.7875 4.94895 14.6085 5.02444 14.426 4.99595C14.245 4.96845 14.0935 4.84496 14.031 4.67348C13.6635 3.67257 13.199 2.89415 12.651 2.3597C11.2035 0.95833 8.807 0.597864 6.6895 1.46478C4.8875 2.20221 3.9455 4.21002 3.9455 5.81237C3.9455 6.01235 3.9735 6.25083 3.9965 6.44231C4.0265 6.69228 3.865 6.92576 3.62 6.98675C2.6415 7.22873 1 7.96766 1 10.1914C1 10.2664 0.999 10.3414 1.0065 10.4169C1.1045 12.1548 2.638 13.5006 4.5 13.5006Z" fill="#8B5CF6" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{remainingQuota}</p>
              <p className="text-xs text-muted-foreground">Quota Remaining</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="ml-auto border-primary text-primary bg-primary/10 text-xs whitespace-nowrap hover:bg-primary hover:text-white" onClick={() => setShowQuotaDialog(true)}>
            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
            Request Increase
          </Button>
        </div>
      </div>

      <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
        <CardContent className="py-0 px-0">
          <div className="flex items-center gap-3 p-4 px-6">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, region, or request ID..." className="pl-9 bg-background/50" />
            </div>
            <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => handleRefresh()} aria-label="Refresh">
              <RefreshCw size={14} />
            </Button>
            <TooltipProvider>
              {hasReachedQuota ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled className="bg-primary text-white gap-1.5 shrink-0 opacity-80">
                        <Plus size={14} /> Create VPC
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>VPC quota reached ({MAX_VPCS}). Request a quota increase.</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link to="/aws/vpcs/create">
                  <Button className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0">
                    <Plus size={14} /> Create VPC
                  </Button>
                </Link>
              )}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                  {[
                    "Request ID",
                    "Name",
                    "IPv4 CIDR",
                    "Tenancy",
                    "Availability Zones",
                    "Subnets",
                    "Natgateway",
                    "Region",
                    "Created Date",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      No VPCs found. Click <span className="text-foreground">Create VPC</span> to provision your first one.
                    </td>
                  </tr>
                )}
                {filtered.map((v: any) => {
                  const isDeleting = deletingVpcId === v.id || v.status === "deleting";
                  const statusBadgeClass = isDeleting
                    ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive border border-destructive/20 capitalize"
                    : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize";
                  const statusLabel = isDeleting ? "Deleting" : v.status ?? "—";
                  return (
                    <tr key={v.id} data-state={selected.includes(v.id) ? "selected" : undefined} className="border-b border-border/40 last:border-0 hover:bg-accent/20 data-[state=selected]:bg-accent/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-muted-foreground">{v.id}</td>
                      <td className="px-5 py-4">
                        <Link to={`/aws/vpcs/${v.id}`} className="font-mono text-primary hover:underline">{v.name || v.id}</Link>
                      </td>
                      {/* <td className="px-5 py-4">
                        <span className={statusBadgeClass}>{statusLabel}</span>
                      </td> */}
                      <td className="px-5 py-4 font-mono text-muted-foreground">{v?.cidr ?? "—"}</td>
                      <td className="px-5 py-4 capitalize">{v?.tenancy ?? v?.meta?.tenancy ?? "default"}</td>
                      <td className="px-5 py-4 capitalize">{getAvailabilityZonesCount(v)}</td>
                      <td className="px-5 py-4 capitalize">{v?.subnetCount ?? v?.meta?.subnetCount ?? 0}</td>
                      <td className="px-5 py-4 capitalize">{v?.natGateways ?? v?.meta?.natGateways ?? 0}</td>
                      <td className="px-5 py-4">{v?.region ?? "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{formatCreatedDate(v?.createdDate)}</td>
                      <td className="px-5 py-4 text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <button onClick={() => handleDeleteRow(v)} disabled={deletingVpcId === v.id || v?.status === "deleting"} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:pointer-events-none" aria-label="Delete VPC">
                                  <Trash2 size={15} />
                                </button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>{deletingVpcId === v.id || v?.status === "deleting" ? "Termination in progress..." : "Terminate VPC"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected.length === 1 && <VpcDetailsPanel vpcId={selected[0]} />}

      <Dialog open={!!dialog} onOpenChange={() => handleClose(false)}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 bg-background border">
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-6 flex justify-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 ring-4 ring-primary/5">
              {dialog?.icon === "destroy" && <Trash2 className="h-6 w-6 text-destructive" />}
              {dialog?.icon === "retry" && <RotateCcw className="h-6 w-6 text-primary" />}
              {dialog?.icon === "info" && <Info className="h-6 w-6 text-primary" />}
            </div>
          </div>
          <div className="px-6 pb-6 text-center space-y-4">
            <DialogTitle className="text-lg font-semibold">Confirmation</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium text-foreground">{dialog?.title}</div>
                {dialog?.description && <div className="text-sm text-muted-foreground">{dialog.description}</div>}
              </div>
            </DialogDescription>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleClose(true)}>OK</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VpcQuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxVpcs={MAX_VPCS}
        usedVpcs={totalVpcs}
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
            const response = await fetch(`${env.vpcService}/vpc-quota/${currentUser?.id}/request`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "x-client-ip": (await getClientIp()) || "",
              },
              body: JSON.stringify({ requestedQuota: requestedQuota - MAX_VPCS, reason, approverEmail }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data?.message || data?.error || "Failed to submit VPC quota request");
            }
            alert({ title: "VPC quota request submitted successfully", severity: "success" });
            setShowQuotaDialog(false);
            setRequestedQuota(0);
            setReason("");
            setTouched(false);
            setQuotaError("");
          } catch (error: any) {
            alert({ title: error?.message || "Failed to submit VPC quota request", severity: "error" });
          } finally {
            setSubmitQuota(false);
          }
        }}
      />
    </div>
  );
}

function StatCard({ icon, iconBg, value, label }: { icon: React.ReactNode; iconBg: string; value: number | string; label: string }) {
  return (
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
