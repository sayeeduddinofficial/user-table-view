import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import { Database, Clock3, Lock, RefreshCw, Search, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/common/Loader";
import { S3Bucket, encryptionLabel, regionLabel } from "@/utils/s3.utils";
import { CopyIconButton } from "@/components/s3/shared";
import { useAppStore } from "@/store/appStore";

function formatDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function BucketsTable({
  buckets, loading, onDelete, onRefresh,
}: {
  buckets: S3Bucket[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<boolean>;
}) {
  const navigate = useNavigate();
  const { alert } = useDialog();
  const currentUser = useAppStore((s) => s.currentUser);
  const hasActiveBucket = !!currentUser && buckets.some((b) => Number(b.userId) === Number(currentUser.id));
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const MIN_SPIN_MS = 500;

  const handleRefresh = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const ok = await onRefresh();
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed));
      }
      alert({
        title: ok ? "Refreshed" : "Failed to Refresh",
        severity: ok ? "success" : "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = buckets.filter((b) =>
    search
      ? b.name.toLowerCase().includes(search.toLowerCase()) ||
        regionLabel(b.region).toLowerCase().includes(search.toLowerCase()) ||
        b.id.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const stats = {
    total: buckets.length,
    encrypted: buckets.filter((b) => !!b.meta.encryption).length,
    versioned: buckets.filter((b) => b.meta.versioning).length,
    pending: buckets.filter((b) => {
      const status = b.meta.status?.toUpperCase();
      return status === "PENDING" || status === "PROVISIONING";
    }).length,
  };

  const statusBadge = (r: S3Bucket) => {
    const status = r.meta.status?.toUpperCase();
    if (status === "FAILED") {
      return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Failed</Badge>;
    }
    if (status === "PENDING" || status === "PROVISIONING") {
      return <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30">Provisioning</Badge>;
    }

    return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Completed</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Database size={18} />} value={stats.total} label="Total Buckets" color="text-primary bg-primary/10" />
        <StatCard icon={<Lock size={18} />} value={stats.encrypted} label="Encrypted" color="text-success bg-success/10" />
        <StatCard icon={<History size={18} />} value={stats.versioned} label="Versioned" color="text-cyan-400 bg-cyan-400/10" />
        <StatCard icon={<Clock3 size={18} />} value={stats.pending} label="Provisioning" color="text-amber-400 bg-amber-400/10" />
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, region, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="h-9 w-9 p-0"
          tooltip="Refresh"
        >
          <RefreshCw size={14} className={refreshing || loading ? "animate-spin" : ""} />
        </Button>
        <Button
          onClick={() => navigate("/aws/s3/create")}
          disabled={hasActiveBucket}
          tooltip={hasActiveBucket ? "Maximum 1 bucket limit reached." : undefined}
        >
          + Create Bucket
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                {[
                  "Request ID",
                  "Bucket Name",
                  "Type",
                  "Encryption",
                  "Versioning",
                  "Public Access",
                  "Region",
                  "Creation Date",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || refreshing ? (
                <tr>
                  <td colSpan={11}>
                    <Loader label="Loading buckets..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center text-muted-foreground text-sm">
                    No buckets yet. Click <span className="text-foreground">Create Bucket</span> to provision your first one.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-muted-foreground whitespace-nowrap">{r.id}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/aws/s3/buckets/${encodeURIComponent(r.name)}?region=${encodeURIComponent(r.region)}&tab=objects`)}
                      className="text-primary hover:underline text-sm font-mono"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="bg-orange-500/15 text-orange-400 border-orange-500/30">
                      {r.meta.bucketType === "directory" ? "Directory" : "General"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{encryptionLabel(r.meta.encryption)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {r.meta.versioning ? (
                      <Badge variant="outline" className="bg-success/15 text-success border-success/30">Enable</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border">Disable</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{r.meta.publicAccess ? "Allowed" : "Blocked"}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{regionLabel(r.region)}</td>
                
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">{statusBadge(r)}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <CopyIconButton
                        value={`arn:aws:s3:::${r.name}`}
                        label="Copy ARN"
                        alertTitle="ARN copied"
                        className="h-auto w-auto p-1.5 text-muted-foreground hover:text-foreground"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(r.id)}
                        className="h-auto w-auto p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        tooltip="Delete Bucket"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
