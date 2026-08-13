import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Info,
  RotateCcw,
  ArrowUpCircle,
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
import { Link, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/appStore";
import { EksQuotaIncreaseDialog } from "@/components/eks/EksQuotaIncreaseDialog";
import { env } from "@/lib/env";

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
  const refreshCurrentUser = useAppStore(
    (s) => s.refreshCurrentUser
  );
  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const navigate = useNavigate();
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
      c.region,
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
    clusters
      .map((c) => c.kubernetes_version)
      .sort()
      .reverse()[0] ?? "—";
  const activeCount = clusters.filter((c) => c.status === "ACTIVE").length;
  // const provisioning = filtered.filter((c) => c.status === "PENDING").length;

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
          
          const returnedRequestId = data?.data?.requestId ?? eks.request_id;
          setActiveRequest(returnedRequestId, "eks-cluster-service");
          navigate("/console");
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
      await Promise.all([
        fetchClusters(),
        refreshCurrentUser(),
      ]);

      alert({
        title: "Refreshed",
        severity: "success",
      });
    } catch {
      alert({
        title: "Failed to Refresh",
        severity: "error",
      });
    }
  };

  return (
    <div>
      <div className="space-y-4 p-6">
        {/* Stats */}
        <div className="flex flex-wrap gap-3">
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
          <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400/10">
                <svg width={15} height={15} viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path stroke="#FACC15" fillRule="evenodd" clipRule="evenodd" d="M12.4871 7.79611L9.80902 10.8533L12.722 14.1973H11.6349L9.01961 11.193V14.2807H8.23529V7.7193H9.01961V10.4211L11.4435 7.79611H12.4871ZM19.2157 13.9851L16.0784 12.132V7.7193C16.0784 7.5819 16.0047 7.45492 15.8839 7.38583L11.3725 4.79601V1.06218L19.2157 5.6239V13.9851ZM19.8075 5.0712L11.18 0.053659C11.0584 -0.0169725 10.909 -0.0177442 10.7859 0.0505715C10.6639 0.119273 10.5882 0.247413 10.5882 0.385975V5.01755C10.5882 5.15457 10.6624 5.28155 10.7827 5.35103L15.2941 7.94085V12.3509C15.2941 12.4864 15.3667 12.6122 15.4847 12.6817L19.4063 14.9974C19.4682 15.0341 19.538 15.0526 19.6078 15.0526C19.6745 15.0526 19.7412 15.036 19.8012 15.0025C19.9243 14.9341 20 14.8056 20 14.6667V5.40352C20 5.26688 19.9271 5.14067 19.8075 5.0712ZM9.97843 21.1751L0.784314 16.3645V5.6239L8.62745 1.06218V4.80566L4.49529 7.39355C4.38235 7.46457 4.31373 7.5873 4.31373 7.7193V14.2807C4.31373 14.4247 4.39529 14.5567 4.52471 14.6231L9.80039 17.3248C9.91373 17.3827 10.0486 17.3831 10.1616 17.3252L15.28 14.7222L18.4298 16.5826L9.97843 21.1751ZM19.4176 16.2653L15.4961 13.9495C15.3792 13.8808 15.2349 13.8762 15.1141 13.938L9.98235 16.5475L5.09804 14.0464V7.9312L9.2302 5.34331C9.34314 5.27229 9.41177 5.14955 9.41177 5.01755V0.385975C9.41177 0.247413 9.33647 0.119273 9.21412 0.0505715C9.09177 -0.0177442 8.94196 -0.0169725 8.82 0.053659L0.192549 5.0712C0.0733333 5.14067 0 5.26688 0 5.40352V16.5965C0 16.7389 0.08 16.8701 0.207843 16.9373L9.79765 21.955C9.8553 21.9851 9.91843 22 9.98157 22C10.0471 22 10.1122 21.9838 10.1714 21.9516L19.4055 16.9342C19.5282 16.8674 19.6051 16.7412 19.6079 16.6034C19.6102 16.4653 19.5376 16.3364 19.4176 16.2653Z"
                    fill="#FACC15"
                  />
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

        {/* Search row */}
        <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
          <CardContent className="py-0 px-0">
            <div className="flex items-center gap-3 p-4 px-6">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, request ID..."
                  className="pl-9 bg-background/50"
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
                    <p>Maximum {MAX_EKS} EKS limit reached.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                  {[
                    "Request ID",
                    "Cluster Name",
                    "Region",
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
                        <td className="px-5 py-4 font-mono text-muted-foreground">                          
                          {v.region?.toLowerCase()}
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
              `${env.eksClusterService}/eks/eks-quota/${currentUser?.id}/request`,
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
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
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
