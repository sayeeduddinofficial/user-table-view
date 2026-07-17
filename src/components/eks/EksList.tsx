import { Link } from "react-router-dom";
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
  Info,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/components/ui/dialog-context";

const STATIC_CLUSTERS = [
  {
    id: "EKS-REQ-1001",
    name: "dev-eks-cluster",
    status: "Active",
    version: "1.33",
    createdDate: "2026-07-01T10:30:00",
    justification: "Development workloads",
  },
  {
    id: "EKS-REQ-1002",
    name: "qa-eks-cluster",
    status: "Provisioning",
    version: "1.32",
    createdDate: "2026-07-04T14:20:00",
    justification: "QA testing",
  },
  {
    id: "EKS-REQ-1003",
    name: "prod-eks-cluster",
    status: "Active",
    version: "1.31",
    createdDate: "2026-06-28T09:15:00",
    justification: "Production workloads",
  },
];

export function EksList() {
  const [query, setQuery] = useState("");
  const [clusters] = useState(STATIC_CLUSTERS);
  const [selected] = useState<string[]>([]);
  const { alert } = useDialog();

  const filtered = clusters.filter((c) =>
    [c.id, c.name, c.status, c.version, c.justification]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const totalClusters = filtered.length;
  const workerNodes = 12;
  const latestVersion = "1.33";
  const provisioning = filtered.filter(
    (c) => c.status === "Provisioning",
  ).length;

  const [dialog, setDialog] = useState<{
    icon?: "destroy" | "retry" | "info";
    title: string;
    description?: string;
    onConfirm?: () => void;
  } | null>(null);

  const handleDeleteRow = (eks: any) => {
    setDialog({
      icon: "destroy",
      title: `Delete ${eks.name || eks.id}?`,
      onConfirm: async () => {
        try {
          console.log("Delete", eks.name);
          alert({
            title: `Deleted EKS Cluster ${eks.name || eks.id}`,
            severity: "success",
          });
        } catch (error) {
          alert({
            title: `Failed to delete EKS Cluster ${eks.name || eks.id}`,
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
            value={totalClusters}
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
          <StatCard
            icon={<Clock className="h-4 w-4 text-amber-400" />}
            iconBg="bg-amber-500/10"
            value={provisioning}
            label="Provisioning"
          />
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
          <Link to="/aws/eks/create">
            <Button className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0">
              <Plus size={14} /> Create Cluster
            </Button>
          </Link>
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
                {filtered.length === 0 && (
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
                {filtered.map((v: any) => (
                  <tr
                    key={v.id}
                    data-state={
                      selected.includes(v.id) ? "selected" : undefined
                    }
                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 data-[state=selected]:bg-accent/30 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-muted-foreground">
                      {v.id}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/aws/eks/${v.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {v.name || v.id}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {v.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-muted-foreground">
                      {v?.version ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {v?.createdDate
                        ? new Date(v.createdDate).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-5 py-4">{v?.justification ?? "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRow(v)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete EKS"
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
