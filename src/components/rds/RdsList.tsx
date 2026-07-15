import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, RefreshCw, Trash2, Database, Server,
  Camera, Bell, Minus, CheckCircle2,
  AlertCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useResources } from "@/lib/lbLocalStore";
import { useDialog } from "@/components/ui/dialog-context";

export type RdsEngine = "Aurora MySQL" | "Aurora PostgreSQL" | "MySQL" | "PostgreSQL" | "MariaDB" | "Oracle" | "SQL Server";
export type RdsRole = "Regional cluster" | "Writer instance" | "Reader instance" | "Standalone";
export type RdsStatus = "Available" | "Creating" | "Deleting" | "Stopped" | "Modifying";

export type RdsRow = {
  id: string;
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

const SEED: RdsRow[] = [
  {
    id: "cluster-1",
    dbIdentifier: "splunkops-aurora-cluster",
    status: "Available",
    role: "Regional cluster",
    engine: "Aurora PostgreSQL",
    engineVersion: "15.4",
    upgradeRollout: "SECOND",
    region: "us-east-2",
    size: "2 Instances",
    created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toLocaleDateString(),
    isCluster: true,
  },
  {
    id: "instance-1",
    dbIdentifier: "splunkops-aurora-cluster-instance-1",
    status: "Available",
    role: "Writer instance",
    engine: "Aurora PostgreSQL",
    engineVersion: "15.4",
    upgradeRollout: "SECOND",
    region: "us-east-2a",
    size: "db.r6g.large",
    created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toLocaleDateString(),
    isCluster: false,
    clusterId: "cluster-1",
  },
  {
    id: "instance-2",
    dbIdentifier: "splunkops-aurora-cluster-instance-2",
    status: "Available",
    role: "Reader instance",
    engine: "Aurora PostgreSQL",
    engineVersion: "15.4",
    upgradeRollout: "SECOND",
    region: "us-east-2b",
    size: "db.r6g.large",
    created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toLocaleDateString(),
    isCluster: false,
    clusterId: "cluster-1",
  },
  {
    id: "standalone-1",
    dbIdentifier: "splunkops-mysql-db",
    status: "Available",
    role: "Standalone",
    engine: "MySQL",
    engineVersion: "8.0.35",
    upgradeRollout: "—",
    region: "us-east-1",
    size: "db.t3.medium",
    created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toLocaleDateString(),
    isCluster: false,
  },
];

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
  const { resources, add, remove } = useResources("rds");
  const { confirm, alert } = useDialog();

  useEffect(() => {
    if (resources.length === 0) {
      SEED.forEach((r) =>
        add({ id: r.id, name: r.dbIdentifier, region: r.region, createdAt: new Date().toISOString(), status: r.status.toLowerCase(), meta: r })
      );
    }
  }, [resources.length, add]);

  const rows: RdsRow[] = useMemo(() => resources.map((r) => r.meta as RdsRow), [resources]);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["cluster-1"]));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const clusters = rows.filter((r) => r.isCluster);
  const standalones = rows.filter((r) => !r.isCluster && !r.clusterId);
  const instancesOf = (cid: string) => rows.filter((r) => r.clusterId === cid);

  const q = query.trim().toLowerCase();
  const matchRow = (r: RdsRow) =>
    !q || [r.dbIdentifier, r.engine, r.region, r.status].some((v) => v?.toLowerCase().includes(q));

  const filteredClusters = useMemo(() => clusters.filter(matchRow), [clusters, q]);
  const filteredStandalones = useMemo(() => standalones.filter(matchRow), [standalones, q]);

  const toggleExpand = (id: string) =>
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelect = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async (row: RdsRow) => {
    if (row.isCluster && instancesOf(row.id).length > 0) {
      alert({
        title: `"${row.dbIdentifier}" still has instances. Delete all instances first before deleting the cluster.`,
        severity: "warning",
      });
      return;
    }
    const ok = await confirm({
      icon: "destroy",
      title: `Delete ${row.isCluster ? "cluster" : "instance"}?`,
      description: `"${row.dbIdentifier}" will be permanently deleted. This action cannot be undone.`,
    });
    if (ok) { remove(row.id); toast.success(`${row.dbIdentifier} deleted`); }
  };

  const COLS = ["DB Identifier", "Status", "Role", "Engine", "Upgrade Rollout", "Region", "Size", "Created", "Actions"];

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
          <td className="px-5 py-3.5">
            <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
          </td>

          <td className="px-5 py-3.5 relative">
            {/* Parent rail stub — from toggle center down to row bottom, only when expanded */}
            {row.isCluster && isOpen && instances.length > 0 && (
              <div className="absolute left-[27px] top-[calc(50%+8px)] bottom-0 w-[1.5px] bg-slate-500" />
            )}
            {/* Instance rail — absolute on the td so it spans full row height incl. padding */}
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
                    onClick={() => nav(`/aws/rds/${row.id}`)}
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
                    onClick={() => nav(`/aws/rds/${row.id}`)}
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
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title={row.isCluster && instances.length > 0 ? "Delete all instances first" : "Delete"}
            >
              <Trash2 size={15} />
            </button>
          </td>
        </tr>

        {row.isCluster && isOpen && instances.map((inst, idx) =>
          renderRow(inst, 1, idx === instances.length - 1)
        )}
      </>
    );
  };

  const dbClusters = rows.filter((r) => r.isCluster).length;
  const dbInstances = rows.filter((r) => !r.isCluster).length;
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
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by identifier, engine, region..."
              className="pl-9 bg-card/50 border-border/50"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => toast.info("Refreshing RDS resources...")}>
            <RefreshCw size={14} />
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0" onClick={() => nav("/aws/rds/create")}>
            <Plus size={14} /> Create RDS
          </Button>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                  <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      onCheckedChange={() => {
                        const allSel = rows.every((r) => selected.has(r.id));
                        setSelected(allSel ? new Set() : new Set(rows.map((r) => r.id)));
                      }}
                    />
                  </th>
                  {COLS.map((h) => (
                    <th key={h} className={`px-5 py-3 text-left font-medium whitespace-nowrap ${h === "Actions" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClusters.length === 0 && filteredStandalones.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">
                      No RDS resources found.
                    </td>
                  </tr>
                )}
                {filteredClusters.map((c) => renderRow(c, 0))}
                {filteredStandalones.map((s) => renderRow(s, 0))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
