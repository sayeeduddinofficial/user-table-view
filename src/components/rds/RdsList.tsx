import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, RefreshCw, Trash2, Database, Server,
  Camera, Bell, Minus, CheckCircle2,
  AlertCircle, Clock, Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useDialog } from "@/components/ui/dialog-context";
import { useRdsClusters, useDeleteRdsCluster } from "@/hooks/useRds";
import { deleteRdsCluster, type RdsClusterApi } from "@/services/rdsService";
import { useAppStore } from "@/store/appStore";
import { RdsQuotaIncreaseDialog } from "@/components/rds/RdsQuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useResourceAvailability } from "@/hooks/useResourceAvailability";

export type RdsEngine = "Aurora MySQL" | "Aurora PostgreSQL" | "MySQL" | "PostgreSQL" | "MariaDB" | "Oracle" | "SQL Server";
export type RdsRole = "Regional cluster" | "Writer instance" | "Reader instance" | "Standalone";
export type RdsStatus = "Available" | "Creating" | "Deleting" | "Stopped" | "Modifying";

export type RdsRow = {
  id: string;
  requestId: string;
  dbIdentifier: string;
  status: RdsStatus;
  role: RdsRole;
  engine: RdsEngine;
  engineVersion: string;
  upgradeRollout: string;
  region: string;
  size: string;
  created: string;
  isCluster: boolean;
  clusterId?: string;
};

const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

function normaliseEngine(engine: string): RdsEngine {
  const e = engine.toLowerCase();
  if (e.includes("aurora") && e.includes("mysql")) return "Aurora MySQL";
  if (e.includes("aurora") && e.includes("postgres")) return "Aurora PostgreSQL";
  if (e.includes("mysql")) return "MySQL";
  if (e.includes("postgres")) return "PostgreSQL";
  if (e.includes("mariadb")) return "MariaDB";
  if (e.includes("oracle")) return "Oracle";
  if (e.includes("sqlserver") || e.includes("sql server")) return "SQL Server";
  return "PostgreSQL";
}

function normaliseStatus(status: string): RdsStatus {
  const s = status.toLowerCase();
  if (s === "available") return "Available";
  if (s === "creating" || s === "provisioning") return "Creating";
  if (s === "deleting" || s === "destroying") return "Deleting";
  if (s === "stopped") return "Stopped";
  if (s === "modifying") return "Modifying";
  if (s === "deleted" || s === "destroyed" || s === "failed") return "Deleting";
  return "Available";
}

function clusterToRows(cluster: RdsClusterApi): RdsRow[] {
  const clusterRow: RdsRow = {
    id: cluster.request_id,
    requestId: cluster.request_id,
    dbIdentifier: cluster.cluster_identifier,
    status: normaliseStatus(cluster.cluster_status),
    role: "Regional cluster",
    engine: normaliseEngine(cluster.engine),
    engineVersion: cluster.engine_version,
    upgradeRollout: cluster.upgrade_rollout_order ?? "—",
    region: cluster.region,
    size: `${cluster.instances.length} ${cluster.instances.length === 1 ? "Instance" : "Instances"}`,
    created: cluster.cluster_created_at ? formatDate(new Date(cluster.cluster_created_at)) : "—",
    isCluster: true,
  };

  const instanceRows: RdsRow[] = cluster.instances.map((inst) => ({
    id: `${cluster.request_id}__${inst.instance_identifier}`,
    requestId: cluster.request_id,
    dbIdentifier: inst.instance_identifier,
    status: normaliseStatus(inst.status),
    role: inst.instance_role === "WRITER" ? "Writer instance" : "Reader instance",
    engine: normaliseEngine(cluster.engine),
    engineVersion: inst.engine_version ?? cluster.engine_version,
    upgradeRollout: inst.upgrade_rollout_order ?? "—",
    region: inst.availability_zone ?? cluster.region,
    size: inst.instance_class,
    created: inst.created_at ? formatDate(new Date(inst.created_at)) : "—",
    isCluster: false,
    clusterId: cluster.request_id,
  }));

  return [clusterRow, ...instanceRows];
}

function StatusBadge({ status }: { status: RdsStatus }) {
  const map: Record<RdsStatus, { cls: string; icon: ReactNode }> = {
    Available: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={11} /> },
    Creating: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Clock size={11} /> },
    Deleting: { cls: "bg-red-500/10 text-red-400 border-red-500/20", icon: <AlertCircle size={11} /> },
    Stopped: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <AlertCircle size={11} /> },
    Modifying: { cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <Clock size={11} /> },
  };
  const { cls, icon } = map[status] ?? map.Available;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {icon} {status}
    </span>
  );
}

function RoleBadge({ role }: { role: RdsRole }) {
  const map: Record<RdsRole, string> = {
    "Regional cluster": "bg-primary/10 text-primary border-primary/20",
    "Writer instance": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Reader instance": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "Standalone": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${map[role]}`}>
      {role}
    </span>
  );
}

function StatCard({ icon, iconBg, value, label }: { icon: ReactNode; iconBg: string; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function RdsList() {
  const nav = useNavigate();
  const { confirm, alert } = useDialog();
  const { clusters: apiClusters, loading, refresh } = useRdsClusters();

  const rows: RdsRow[] = useMemo(
    () => apiClusters.flatMap(clusterToRows),
    [apiClusters]
  );
  const currentUser = useAppStore((s) => s.currentUser);
  const MAX_RDS = currentUser?.maxRdsClusters ?? 0;
  const userClusterCount = apiClusters.filter(
    (cluster: any) =>
      Number(cluster.user_id) === Number(currentUser?.id) ||
      Number(cluster.userId) === Number(currentUser?.id)
  ).length;
  const [query, setQuery] = useState("");
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { available } = useResourceAvailability();
  const hasActiveRds = available?.rds?.reached ?? false;
  console.log(hasActiveRds);


  const clusters = rows.filter((r) => r.isCluster);
  const standalones = rows.filter((r) => !r.isCluster && !r.clusterId);
  const instancesOf = (cid: string) => rows.filter((r) => r.clusterId === cid);

  const q = query.trim().toLowerCase();
  const matchRow = (r: RdsRow) =>
    !q || [r.dbIdentifier, r.engine, r.region, r.status].some((v) => v?.toLowerCase().includes(q));

  const filteredClusters = useMemo(() => clusters.filter(matchRow), [clusters, q]);
  const filteredStandalones = useMemo(() => standalones.filter(matchRow), [standalones, q]);

  const { setActiveRequest } = useAppStore();
  const { remove: removeCluster, isDeleting: isDeletingCluster } = useDeleteRdsCluster();

  const toggleExpand = (id: string) =>
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });


  const handleDelete = async (row: RdsRow) => {
    const ok = await confirm({
      icon: "destroy",
      title: `Delete ${row.isCluster ? "cluster" : "instance"}?`,
      description: `"${row.dbIdentifier}" will be permanently deleted. This action cannot be undone.`,
    });
    if (!ok) return;

    try {
      if (row.isCluster) {
        await removeCluster(row.requestId);

      } else {
        // instance id is "${requestId}__${instanceIdentifier}" — extract instanceIdentifier
        // const instanceIdentifier = row.dbIdentifier;
        // await removeInstance(row.requestId, instanceIdentifier);
      }
  
    setActiveRequest(row.requestId, 'rds-service');
    nav('/console');
    toast.success(`${row.dbIdentifier} deletion initiated`);
    // await refresh();
  } catch {
    toast.error(`Failed to delete ${row.dbIdentifier}`);
  }
};

  const COLS = ["Request ID", "DB Identifier", "Status", "Role", "Engine", "Upgrade Rollout", "Region", "Size", "Created", "Actions"];

  const renderRow = (row: RdsRow, depth = 0, isLast = false) => {
    const instances = row.isCluster ? instancesOf(row.id) : [];
    const isOpen = expanded.has(row.id);
    const isInstance = depth > 0;
    const isOpenCluster = row.isCluster && isOpen && instances.length > 0;

    return (
      <>
        <tr
          key={row.id}
          className={`transition-colors hover:bg-accent/20 ${isOpenCluster ? "" : (isInstance && !isLast) ? "" : "border-b border-border/40 last:border-0"
            }`}
        >

          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.requestId}</td>
          <td className="px-5 py-3.5 relative">
            {row.isCluster && isOpen && instances.length > 0 && (
              <div className="absolute left-[27px] top-[calc(50%+8px)] bottom-0 w-[1.5px] bg-slate-500" />
            )}
            {isInstance && (
              <>
                <div
                  className={`absolute left-[27px] w-[1.5px] bg-slate-500 ${isLast ? "top-0 h-1/2" : "inset-y-0"
                    }`}
                />
                <div className="absolute left-[27px] top-1/2 -translate-y-[0.75px] w-4 h-[2px] bg-slate-500" />
              </>
            )}

            <div className="flex items-center gap-2">
              {!isInstance ? (
                <>
                  {row.isCluster && instances.length > 0 ? (
                    <button
                      onClick={() => toggleExpand(row.id)}
                      className="flex items-center justify-center w-4 h-4 border-[1.5px] border-slate-400 text-slate-400 hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={isOpen ? "Collapse cluster" : "Expand cluster"}
                    >
                      {isOpen ? <Minus size={12} /> : <Plus size={12} />}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}

                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                    <Database size={14} className="text-primary" />
                  </div>
                  <button
                    onClick={() => nav(`/aws/rds/${row.requestId}/instances/${row.dbIdentifier}`)}
                    className="font-medium text-sm hover:underline cursor-pointer text-primary"
                  >
                    {row.dbIdentifier}
                  </button>
                  {row.isCluster && instances.length > 0 && !isOpen && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border/40">
                      {instances.length} {instances.length === 1 ? "instance" : "instances"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-5 shrink-0" />
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                    <Database size={14} className="text-primary" />
                  </div>
                  <button
                    onClick={() => nav(`/aws/rds/${row.clusterId}/instances/${row.dbIdentifier}`)}
                    className="font-medium text-sm hover:underline cursor-pointer text-primary"
                  >
                    {row.dbIdentifier}
                  </button>
                </>
              )}
            </div>
          </td>
          <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
          <td className="px-5 py-3.5"><RoleBadge role={row.role} /></td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">
            <div className="font-medium text-foreground text-xs">{row.engine}</div>
            <div className="text-xs text-muted-foreground">{row.engineVersion}</div>
          </td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.upgradeRollout}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.region}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.size}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.created}</td>

          <td className="px-5 py-3.5 text-right">
            {!isInstance && (
              <button
                onClick={() => handleDelete(row)}
                disabled={isDeletingCluster || row.status === "Deleting"}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
              </button>
            )}
          </td>
        </tr>

        {row.isCluster && isOpen && instances.map((inst, idx) =>
          renderRow(inst, 1, idx === instances.length - 1)
        )}
      </>
    );
  };

  const dbClusters = clusters.length;
  const dbInstances = rows.filter((r) => !r.isCluster).length;
  const remainingQuota = Math.max(
    0,
    MAX_RDS - userClusterCount
  );

  const quotaReached =
    userClusterCount >= MAX_RDS;
  const snapshots = 3;
  const recentEvents = 7;

  return (
    <div className="space-y-4">
      <Header
        title="Amazon RDS"
        subtitle="Managed relational database service — clusters, instances, and snapshots"
        showSearch={false}
      />

      <div className="space-y-4 px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Database className="h-4 w-4 text-primary" />} iconBg="bg-primary/10" value={dbClusters} label="DB Clusters" />
          <StatCard icon={<Server className="h-4 w-4 text-cyan-400" />} iconBg="bg-cyan-500/10" value={dbInstances} label="DB Instances" />
          <StatCard icon={<Camera className="h-4 w-4 text-emerald-400" />} iconBg="bg-emerald-500/10" value={snapshots} label="Snapshots" />
          <StatCard icon={<Bell className="h-4 w-4 text-amber-400" />} iconBg="bg-amber-500/10" value={recentEvents} label="Recent Events" />
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by identifier, region..."
              className="pl-9 bg-card/50 border-border/50"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            disabled={quotaReached}
            className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => nav("/aws/rds/create")}
          >
            <Plus size={14} /> Create RDS
          </Button>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                  {COLS.map((h) => (
                    <th key={h} className={`px-5 py-3 text-left font-medium whitespace-nowrap ${h === "Actions" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">
                      Loading RDS resources...
                    </td>
                  </tr>
                ) : filteredClusters.length === 0 && filteredStandalones.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">
                      No RDS resources found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredClusters.map((c) => renderRow(c, 0))}
                    {filteredStandalones.map((s) => renderRow(s, 0))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <RdsQuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxRds={MAX_RDS}
        usedRds={userClusterCount}
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
              `${env.vmRequest}/api/rds-quota/${currentUser?.id}/request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                },
                body: JSON.stringify({
                  requestedQuota: requestedQuota - MAX_RDS,
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
                "Failed to submit RDS quota request"
              );
            }

            alert({
              title: "RDS quota request submitted successfully",
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
                "Failed to submit RDS quota request",
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
