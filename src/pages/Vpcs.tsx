import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
  Monitor
} from "lucide-react";
import { useVpcList } from "@/hooks/useVpcList";
import { useAppStore } from "@/store/appStore";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { vpcApi } from "@/components/vpc/vpcApi";
import { VpcDetailsPanel } from "@/components/vpc/VpcDetailsPanel";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, RotateCcw } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";
import { deleteVpcApi } from "@/services/vpcService";
import { useNavigate } from "react-router-dom";import { VpcQuotaIncreaseDialog } from "@/components/vpc/VpcQuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";

/**
 * VPCs main page. State lives in {@link useVpcList}, mutations go through
 * {@link vpcApi}, and create flows open as standalone routes.
 */
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

export default function Vpcs() {
  const { query, setQuery, filtered, selected, allChecked, toggleAll, toggleOne, refresh, loading, clearSelection, hasPending, pendingCount } = useVpcList();
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const MAX_VPCS = currentUser?.maxVpcs ?? 1;

  const userVpcCount = filtered.filter(
    (v: any) =>
      Number(v.userId) === Number(currentUser?.id) ||
      Number(v.user_id) === Number(currentUser?.id)
  ).length;

  const totalVpcs = userVpcCount + pendingCount;
  const hasReachedQuota = totalVpcs >= MAX_VPCS;

  const remainingQuota = Math.max(
    0,
    MAX_VPCS - totalVpcs
  );
  const activeSubnets = filtered.reduce(
    (total, v) => total + (v.subnetCount ?? 0),
    0,
  );
  const withNat = filtered.reduce(
    (total, v) => total + (v.natGateways ?? 0),
    0,
  );
  const provisioning = filtered.filter((v: any) => v.status === "provisioning").length + pendingCount;

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

// const handleDeleteRow = (vpc: any) => {
//   setDeletingVpcId(vpc.id);
//   setDialog({
//     icon: "destroy",
//     title: `Delete ${vpc.name || vpc.id}?`,
//     onConfirm: async () => {
//       setDeletingVpcId(vpc.id);
//       try {
//         await deleteVpcApi(vpc.awsVpcId);  // waits until AWS deletion is done
//         setActiveRequest(vpc.id, "vpc-terminate-service"); 
//         useAppStore.getState().deleteVpc(vpc.id);  // remove from store
//         alert({ title: `VPC deleted successfully`, severity: "success" });
//       } catch (error) {
//         alert({ title: `Failed to delete VPC ${vpc.name || vpc.id}`, severity: "error" });
//       } finally {
//         setDeletingVpcId(null);  // clear deleting state
//       }
//     },
//   });
// };

const handleDeleteRow = (vpc: any) => {
  setDialog({
    icon: "destroy",
    title: `Delete ${vpc.name || vpc.id}?`,
    onConfirm: async () => {
      setDeletingVpcId(vpc.id);
      // ✅ Set active request BEFORE calling delete so LiveConsole starts streaming immediately
      setActiveRequest(vpc.id, "vpc-terminate-service");
      navigate("/console");
      try {
        await deleteVpcApi(vpc.awsVpcId);
        // ✅ Remove from store only after deletion is confirmed
        useAppStore.getState().deleteVpc(vpc.id);
        // alert({ title: `VPC deletion submitted`, severity: "success" });
      } catch (error) {
        // ✅ Clear active request if delete failed
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
    await refresh();
    try {
      alert({
        title: "Refreshed",
        severity: "success",
      });
    } catch (error) {
      alert({
        title: `Failed to Refresh`,
        severity: "error",
      });
    }
  }

  return (
    <div className="space-y-4">
      <Header
        title="VPCs"
        subtitle="Virtual private clouds provisioned via Terraform"
        showSearch={false}
      />

      <div className="space-y-4 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Network className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value={totalVpcs}
            label="Total VPCs"
          />
          <StatCard
            icon={<Layers className="h-4 w-4 text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            value={activeSubnets}
            label="Active Subnets"
          />
          <StatCard
            icon={<Globe className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            value={withNat}
            label="With NAT"
          />
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Monitor className="h-4 w-4 text-primary" />
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
              size="sm"
              variant="outline"
              onClick={() => setShowQuotaDialog(true)}
            >
              Request Increase
            </Button>
          </div>
        </div>

        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, region, or request ID..."
              className="pl-9 bg-card/50 border-border/50"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => handleRefresh()}
            aria-label="Refresh"
          >
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
                  <p>
                    VPC quota reached ({MAX_VPCS}). Request a quota increase.
                  </p>
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

        {/* Table */}
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
                    {/* <th className="px-5 py-3 w-10">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={() => toggleAll()}
                        aria-label="Select all"
                      />
                    </th> */}
                    {["Request ID", "Name", "State", "IPv4 CIDR", "Tenancy", "Availability Zones", "Subnets", "Natgateway", "Region", "Created Date"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left font-medium whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ),
                    )}
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-5 py-16 text-center text-muted-foreground text-sm"
                      >
                        No VPCs found. Click{" "}
                        <span className="text-foreground">Create VPC</span> to
                        provision your first one.
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
                      <tr
                        key={v.id}
                        data-state={selected.includes(v.id) ? "selected" : undefined}
                        className="border-b border-border/40 last:border-0 hover:bg-accent/20 data-[state=selected]:bg-accent/30 transition-colors"
                      >
                        {/* <td className="px-5 py-4">
                          <Checkbox
                            checked={selected.includes(v.id)}
                            onCheckedChange={() => toggleOne(v.id)}
                            aria-label={`Select ${v.name || v.id}`}
                          />
                        </td> */}
                      <td className="px-5 py-4 font-mono text-muted-foreground">
                        {v.id}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/aws/vpcs/${v.id}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {v.name || v.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={statusBadgeClass}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-muted-foreground">
                        {v?.cidr ?? "—"}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {v?.tenancy ?? v?.meta?.tenancy ?? "default"}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {getAvailabilityZonesCount(v)}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {v?.subnetCount ?? v?.meta?.subnetCount ?? 0}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {v?.natGateways ?? v?.meta?.natGateways ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        {v?.region ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatCreatedDate(v?.createdDate)}
                      </td>
                      {/* <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRow(v)}
                          disabled={deletingVpcId === v.id || v?.status === 'deleting'}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed"
                          aria-label="Delete VPC"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td> */}

                  <td className="px-5 py-4 text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <button
                            onClick={() => handleDeleteRow(v)}
                            disabled={deletingVpcId === v.id || v?.status === 'deleting'}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:pointer-events-none"
                            aria-label="Delete VPC"
                          >
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>
                          {deletingVpcId === v.id || v?.status === 'deleting'
                            ? 'Termination in progress...'
                            : `Terminate VPC`}
                        </p>
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
      </div>
      <Dialog open={!!dialog} onOpenChange={() => handleClose(false)}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 bg-background border">

          {/* Top gradient header */}
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-6 flex justify-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 ring-4 ring-primary/5">
              {dialog?.icon === "destroy" && (
                <Trash2 className="h-6 w-6 text-destructive" />
              )}

              {dialog?.icon === "retry" && (
                <RotateCcw className="h-6 w-6 text-primary" />
              )}

              {dialog?.icon === "info" && (
                <Info className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center space-y-4">

            <DialogTitle className="text-lg font-semibold">
              Confirmation
            </DialogTitle>

            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium text-foreground">
                  {dialog?.title}
                </div>

                {dialog?.description && (
                  <div className="text-sm text-muted-foreground">
                    {dialog.description}
                  </div>
                )}
              </div>
            </DialogDescription>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>

              <Button
                className="flex-1"
                onClick={() => handleClose(true)}
              >
                OK
              </Button>

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

            const response = await fetch(
              `${env.vmRequest}/api/vpc-quota/${currentUser?.id}/request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                },
                body: JSON.stringify({
                  requestedQuota: requestedQuota - MAX_VPCS,
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
                "Failed to submit VPC quota request"
              );
            }

            alert({
              title: "VPC quota request submitted successfully",
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
                "Failed to submit VPC quota request",
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
  icon: React.ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}