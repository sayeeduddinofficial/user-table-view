import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Monitor,
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Info,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/components/ui/dialog-context";
import { getClientIp } from "@/utils/getClientIP";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/appStore";
import { EksQuotaIncreaseDialog } from "@/components/eks/EksQuotaIncreaseDialog";
import { env } from "@/lib/env";
// const STATIC_CLUSTERS = [
//   {
//     id: "EKS-REQ-1001",
//     name: "dev-eks-cluster",
//     status: "Active",
//     version: "1.33",
//     createdDate: "2026-07-01T10:30:00",
//     justification: "Development workloads",
//   },
//   {
//     id: "EKS-REQ-1002",
//     name: "qa-eks-cluster",
//     status: "Provisioning",
//     version: "1.32",
//     createdDate: "2026-07-04T14:20:00",
//     justification: "QA testing",
//   },
//   {
//     id: "EKS-REQ-1003",
//     name: "prod-eks-cluster",
//     status: "Active",
//     version: "1.31",
//     createdDate: "2026-06-28T09:15:00",
//     justification: "Production workloads",
//   },
// ];

const API_BASE = import.meta.env.VITE_EKS_CLUSTER_SERVICE_URL;

interface EksCluster {
  id: number;
  request_id: string;
  cluster_name: string;
  region: string;
  kubernetes_version: string;
  status: string;
  business_justification: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  created_by: number;
}

export function EksList() {
  const [query, setQuery] = useState("");
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);
  const [clusters, setClusters] = useState<EksCluster[]>([]);
  const [workerNodes, setWorkerNodes] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [selected] = useState<string[]>([]);
  const { alert } = useDialog();

  const currentUser = useAppStore((s) => s.currentUser);
  const MAX_EKS = currentUser?.maxEksClusters ?? 0;

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/eks/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || data?.status !== "SUCCESS") {
        alert({
          title: data?.message || "Failed to load EKS clusters",
          severity: "error",
        });
        return;
      }
      setClusters(data.data.clusters);
      setWorkerNodes(data.data.workerNodes);
    } catch (err) {
      alert({ title: "Failed to load EKS clusters", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  console.log("Fetched clusters:", clusters);

  const userClusterCount = clusters.filter(
    (c) =>
      String(c.created_by) === String(currentUser?.id) &&
      ["PENDING", "PROVISIONING", "ACTIVE", "TERMINATING"].includes(c.status)
  ).length;

  const quotaReached = userClusterCount >= MAX_EKS;

  const filtered = clusters.filter((c) =>
    [
      c.request_id,
      c.cluster_name,
      c.status,
      c.kubernetes_version,
      c.business_justification,
      c.region,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const remainingQuota = Math.max(0, MAX_EKS - userClusterCount);
  const latestVersion =
    filtered
      .map((c) => c.kubernetes_version)
      .sort()
      .reverse()[0] ?? "—";
  const activeCount = filtered.filter((c) => c.status === "ACTIVE").length;
  const provisioning = filtered.filter((c) => c.status === "PENDING").length;

  const [dialog, setDialog] = useState<{
    icon?: "destroy" | "retry" | "info";
    title: string;
    description?: string;
    onConfirm?: () => void;
  } | null>(null);

  const handleDeleteRow = (eks: EksCluster) => {
    setDialog({
      icon: "destroy",
      title: `Terminate ${eks.cluster_name || eks.request_id}?`,
      description:
        "This will initiate termination of the EKS cluster. This action cannot be undone.",

      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          const res = await fetch(`${API_BASE}/eks/${eks.request_id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? {
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                }
                : {}),
            },
          });

          const data = await res.json();

          if (!res.ok || data?.status !== "SUCCESS") {
            throw new Error(
              data?.message ||
              data?.data?.message ||
              "Failed to terminate EKS cluster",
            );
          }

          alert({
            title: data?.data?.message || "EKS cluster termination initiated",
            description: data?.data?.requestId
              ? `Request ID: ${data.data.requestId}`
              : eks.request_id,
            severity: "success",
          });

          // Refresh the list to get the latest TERMINATING status
          await fetchClusters();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to terminate EKS cluster";

          alert({
            title: message,
            severity: "error",
          });
        }
      },
    });
  };

  const handleClose = (confirmed: boolean) => {
    if (confirmed) {
      dialog?.onConfirm?.();
    }
    setDialog(null);
  };

  const handleRefresh = async () => {
    try {
      await fetchClusters();
      alert({ title: "Refreshed", severity: "success" });
    } catch (error) {
      alert({ title: `Failed to Refresh`, severity: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Network className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value={activeCount}
            label="Total Clusters"
          />
          <StatCard
            icon={<Layers className="h-4 w-4 text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            value={workerNodes}
            label="Worker Nodes"
          />
          <StatCard
            icon={<Globe className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            value={latestVersion}
            label="K8s version"
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
              placeholder="Search by name, request ID..."
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                {quotaReached ? (
                  <Button
                    disabled
                    className="bg-primary/50 text-white gap-1.5 shrink-0 cursor-not-allowed opacity-60"
                  >
                    <Plus size={14} /> Create Cluster
                  </Button>
                ) : (
                  <Link to="/aws/eks/create">
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0">
                      <Plus size={14} /> Create Cluster
                    </Button>
                  </Link>
                )}
              </span>
            </TooltipTrigger>
            {quotaReached && (
              <TooltipContent side="top">
                <p>Maximum 1 EKS limit reached.</p>
              </TooltipContent>
            )}
          </Tooltip>

        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                  {[
                    "Request ID",
                    "Cluster Name",
                    "Status",
                    "Kubernetes Version",
                    "Created Date",
                    "Business Justification",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-muted-foreground text-sm"
                    >
                      Loading clusters…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-muted-foreground text-sm"
                    >
                      No clusters found. Click{" "}
                      <span className="text-foreground">Create Cluster</span> to
                      provision your first one.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((v) => {
                    const statusStyles: Record<string, string> = {
                      ACTIVE:
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                      PENDING:
                        "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      TERMINATING:
                        "bg-orange-500/10 text-orange-400 border-orange-500/20",
                      TERMINATED:
                        "bg-muted text-muted-foreground border-border/50",
                      FAILED:
                        "bg-destructive/10 text-destructive border-destructive/20",
                    };

                    const statusLabel: Record<string, string> = {
                      PENDING: "Provisioning",
                    };

                    const style =
                      statusStyles[v.status] ??
                      "bg-muted text-muted-foreground border-border/50";

                    return (
                      <tr
                        key={v.id}
                        data-state={
                          selected.includes(v.request_id)
                            ? "selected"
                            : undefined
                        }
                        className="border-b border-border/40 last:border-0 hover:bg-accent/20 data-[state=selected]:bg-accent/30 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono text-muted-foreground">
                          {v.request_id}
                        </td>
                        <td className="px-5 py-4">
                          {v.status === "ACTIVE" ? (
                            <Link
                              to={`/aws/eks/${v.cluster_name}`}
                              className="font-mono text-primary hover:underline"
                            >
                              {v.cluster_name}
                            </Link>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-muted-foreground cursor-not-allowed">
                                  {v.cluster_name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Cluster details are available only when the cluster is ACTIVE.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border capitalize ${style}`}
                          >
                            <CheckCircle2 size={12} />
                            {statusLabel[v.status] ??
                              v.status?.toLowerCase() ??
                              "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-muted-foreground">
                          {v.kubernetes_version ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {v.created_at
                            ? new Date(v.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {v.business_justification ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {(() => {
                            const deleteDisabled = ["PENDING", "PROVISIONING", "TERMINATING"].includes(v.status);
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <button
                                      onClick={() => !deleteDisabled && handleDeleteRow(v)}
                                      disabled={deleteDisabled}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                      aria-label="Delete EKS"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>
                                    {deleteDisabled
                                      ? "Cluster is terminating"
                                      : "Terminate cluster"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {selected.length === 1 && (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
            EKS Cluster Details (Coming Soon)
          </div>
        )}
      </div>
      <Dialog open={!!dialog} onOpenChange={() => handleClose(false)}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 bg-background border">
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

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => handleClose(true)}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <EksQuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxEksClusters={MAX_EKS}
        usedEksClusters={userClusterCount}
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
              `${env.vmRequest}/api/eks-quota/${currentUser?.id}/request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                },
                body: JSON.stringify({
                  requestedQuota: requestedQuota - MAX_EKS,
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
                "Failed to submit EKS quota request"
              );
            }

            alert({
              title: "EKS quota request submitted successfully",
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
                "Failed to submit EKS quota request",
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
