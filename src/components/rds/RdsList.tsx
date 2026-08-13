import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, RefreshCw, Trash2, Database, Server, Minus, ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/components/ui/dialog-context";
import { useRdsClusters, useDeleteRdsCluster } from "@/hooks/useRds";
import { requestRdsQuotaIncrease } from "@/services/rdsService";
import { useAppStore } from "@/store/appStore";
import { RdsQuotaIncreaseDialog } from "@/components/rds/RdsQuotaIncreaseDialog";
import { AuroraIcon } from "@/components/icons/aws-icons";
import type { RdsRow } from "@/components/rds/rdsTypes";
import { clusterToRows, isProvisioningStatus } from "@/components/rds/rdsUtils";
import { RoleBadge, StatCard, StatusBadge } from "@/components/rds/rdsShared";


export function RdsList() {
  const nav = useNavigate();
  const { confirm, alert } = useDialog();
  const { clusters: apiClusters, loading, refresh } = useRdsClusters();

  const rows: RdsRow[] = useMemo(
    () => apiClusters.flatMap(clusterToRows),
    [apiClusters]
  );
  const currentUser = useAppStore((s) => s.currentUser);
  const refreshCurrentUser = useAppStore(
    (s) => s.refreshCurrentUser
  );
  useEffect(() => {
    refreshCurrentUser();
  }, []);
  const MAX_RDS = currentUser?.maxRdsClusters ?? 0;
  const isOwnedByCurrentUser = (cluster: { user_id?: unknown; userId?: unknown }) =>
    Number(cluster.user_id) === Number(currentUser?.id) ||
    Number(cluster.userId) === Number(currentUser?.id);

  const userClusterCount = apiClusters.filter(isOwnedByCurrentUser).length;
  const userStatusProvisioning = apiClusters.filter(
    (cluster) => isOwnedByCurrentUser(cluster) && isProvisioningStatus(cluster.cluster_status)
  ).length;

  const [query, setQuery] = useState("");
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());


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
      }

      setActiveRequest(row.requestId, "rds-service");
      nav("/console");
    } catch {
      alert({ title: `Failed to delete ${row.dbIdentifier}`, severity: "error" });
    }
  };


  const COLS = ["Request ID", "DB Identifier", "Status", "Role", "Engine", "Upgrade Rollout", "Region", "Size", "Created", "Actions"];

  const renderRow = (row: RdsRow, depth = 0, isLast = false): ReactElement => {
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
                disabled={isDeletingCluster || row.status === "Terminating"}
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

  const quotaReached = userClusterCount >= MAX_RDS || userStatusProvisioning > 0;


  return (
    <div>
      <Header
        title="Amazon RDS"
        subtitle="Managed relational database service — clusters, instances"
        showSearch={false}
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          <StatCard icon={<Database className="h-4 w-4 text-primary" />} iconBg="bg-primary/10" value={dbClusters} label="DB Clusters" />
          <StatCard icon={<Server className="h-4 w-4 text-cyan-400" />} iconBg="bg-cyan-500/10" value={dbInstances} label="DB Instances" />
          <StatCard icon={<AuroraIcon className="h-4 w-4 text-amber-400" />} iconBg="bg-amber-500/10" value={17.4} label="PSQL Version" />
          <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <svg width={16} height={16} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path stroke="#06B6D4" fillRule="evenodd" clipRule="evenodd" d="M1.34121 0.785714L4.99204 4.43654L4.43654 4.99204L0.785714 1.34121V4.32143H0V0.392857C0 0.176 0.175607 0 0.392857 0H4.32143V0.785714H1.34121ZM22 0.392857V4.32143H21.2143V1.34121L17.5635 4.99204L17.008 4.43654L20.6588 0.785714H17.6786V0H21.6071C21.8243 0 22 0.176 22 0.392857ZM21.2143 17.6786H22V21.6071C22 21.824 21.8243 22 21.6071 22H17.6786V21.2143H20.6588L17.008 17.5635L17.5635 17.008L21.2143 20.6588V17.6786ZM21.0179 10.6908C21.0179 9.38693 19.5124 8.09875 16.9911 7.24507L17.2429 6.501C20.141 7.48196 21.8036 9.009 21.8036 10.6908C21.8036 12.373 20.141 13.9005 17.2425 14.881L16.9907 14.1366C19.5124 13.2833 21.0179 11.9955 21.0179 10.6908ZM1.00414 10.6908C1.00414 11.9401 2.41332 13.1941 4.774 14.0458L4.50725 14.7848C1.78161 13.8015 0.218428 12.3094 0.218428 10.6908C0.218428 9.07264 1.78161 7.58057 4.50725 6.59686L4.774 7.33582C2.41332 8.18793 1.00414 9.44193 1.00414 10.6908ZM4.99204 17.5635L1.34121 21.2143H4.32143V22H0.392857C0.175607 22 0 21.824 0 21.6071V17.6786H0.785714V20.6588L4.43654 17.008L4.99204 17.5635ZM11 7.57664C8.19264 7.57664 6.67857 6.85143 6.67857 6.55521C6.67857 6.25861 8.19264 5.53379 11 5.53379C13.807 5.53379 15.3214 6.25861 15.3214 6.55521C15.3214 6.85143 13.807 7.57664 11 7.57664ZM11.0114 10.6193C8.32346 10.6193 6.67857 9.88507 6.67857 9.48554V7.57586C7.64618 8.10975 9.36257 8.36236 11 8.36236C12.6374 8.36236 14.3538 8.10975 15.3214 7.57586V9.48554C15.3214 9.88546 13.6852 10.6193 11.0114 10.6193ZM11.0114 13.6192C8.32346 13.6192 6.67857 12.8849 6.67857 12.4854V10.5529C7.63361 11.1143 9.32721 11.405 11.0114 11.405C12.6861 11.405 14.3699 11.1147 15.3214 10.5549V12.4854C15.3214 12.8853 13.6852 13.6192 11.0114 13.6192ZM11 16.3106C8.20404 16.3106 6.67857 15.5591 6.67857 15.1729V13.5528C7.63361 14.1142 9.32721 14.4049 11.0114 14.4049C12.6861 14.4049 14.3699 14.115 15.3214 13.5548V15.1729C15.3214 15.5591 13.796 16.3106 11 16.3106ZM11 4.74807C8.54032 4.74807 5.89286 5.31339 5.89286 6.55521V15.1729C5.89286 16.4356 8.46214 17.0964 11 17.0964C13.5379 17.0964 16.1071 16.4356 16.1071 15.1729V6.55521C16.1071 5.31339 13.4597 4.74807 11 4.74807Z" fill="#06B6D4" />
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

        <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
          <CardContent className="py-0 px-0">
            <div className="flex items-center gap-3 p-4 px-6">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by identifier, region..."
                  className="pl-9 bg-background/50"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full shrink-0"
                onClick={async () => {
                  await Promise.all([
                    refresh(),
                    refreshCurrentUser(),
                  ]);

                  alert({
                    title: "Refreshed",
                    severity: "success",
                  });
                }}
                disabled={loading}
              >
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
          </CardContent>
        </Card>

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

            await requestRdsQuotaIncrease(currentUser?.id, {
              requestedQuota: requestedQuota - MAX_RDS,
              reason,
              approverEmail,
            });

            alert({
              title: "RDS quota request submitted successfully",
              severity: "success",
            });

            setShowQuotaDialog(false);
            setRequestedQuota(0);
            setReason("");
            setTouched(false);
            setQuotaError("");
          } catch (error) {
            alert({
              title: error instanceof Error ? error.message : "Failed to submit RDS quota request",
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