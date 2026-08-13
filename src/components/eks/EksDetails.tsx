import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Plug, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog-context";
import { getEksClusterDetails } from "@/services/eksClusterService";
import { ComputeTab } from "./ComputeTab";
import { NetworkingTab } from "./NetworkingTab";
import { OverviewTab } from "./OverviewTab";
import { ResourcesTab } from "./ResourcesTab";
import { TagsTab } from "./TagsTab";
import { EMPTY_VALUE, Field, StatusText } from "./eksShared";
import { formatMetric, formatSupportPeriod } from "./eksUtils";
import { EksConnectDialog } from "./EksConnectDialog";
import type { DetailTab, EksClusterDetail } from "./eksTypes";

export type { EksClusterDetail } from "./eksTypes";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "resources", label: "Resources" },
  { key: "compute", label: "Compute" },
  { key: "networking", label: "Networking" },
];

const HEALTH_METRICS: { label: string; key: keyof EksClusterDetail }[] = [
  { label: "Cluster health", key: "cluster_health" },
  { label: "Upgrade insights", key: "upgrade_insights" },
  { label: "Node health issues", key: "node_health" },
  { label: "Capability issues", key: "capability_issues" },
];

interface EksDetailsProps {
  eksId?: string;
  embedded?: boolean;
}

export function EksDetails({ eksId: propId, embedded = false }: EksDetailsProps) {
  const { eksId: routeId } = useParams<{ eksId: string }>();
  const clusterName = propId ?? routeId ?? "";

  const [tab, setTab] = useState<DetailTab>("overview");
  const [cluster, setCluster] = useState<EksClusterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const { alert } = useDialog();

  const fetchDetails = useCallback(async () => {
    if (!clusterName) return false;

    setLoading(true);
    try {
      setCluster(await getEksClusterDetails(clusterName));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load cluster details";
      alert({ title: message, severity: "error" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [alert, clusterName]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const handleRefresh = async () => {
    if (await fetchDetails()) {
      alert({ title: "Refreshed", severity: "success" });
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <Header
          title="EKS Clusters"
          subtitle="Managed Kubernetes clusters for containerized applications."
        />
      )}

      <div className="space-y-4 px-6 pb-6 pt-2">
        {!embedded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/aws/eks" className="text-primary hover:underline">
              EKS Clusters
            </Link>
            <ChevronRight size={14} />
            <span>{cluster?.cluster_name ?? EMPTY_VALUE}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {cluster?.cluster_name ?? clusterName}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh cluster details"
            >
              <RefreshCw size={14} />
            </Button>
            <Button
              className="shrink-0"
              disabled={!cluster}
              onClick={() => setConnectOpen(true)}
            >
              <Plug size={14} className="mr-1.5" />
              Connect
            </Button>
          </div>
        </div>

        {cluster && (
          <EksConnectDialog
            open={connectOpen}
            onOpenChange={setConnectOpen}
            clusterName={cluster.cluster_name}
            region={cluster.region ?? ""}
            kubernetesVersion={cluster.kubernetes_version}
          />
        )}

        {loading && (
          <div className="text-sm text-muted-foreground">
            Loading cluster details…
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">Cluster info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 text-sm">
            <Field label="Status" value={<StatusText status={cluster?.status} />} />
            <Field
              label="Kubernetes version"
              value={cluster?.kubernetes_version ?? EMPTY_VALUE}
            />
            <Field
              label="Support period"
              value={formatSupportPeriod(cluster?.support_type, cluster?.support_until)}
            />
            <Field label="Provider" value="EKS" />
            {HEALTH_METRICS.map(({ label, key }) => (
              <Field
                key={key}
                label={label}
                value={
                  <span className="text-success text-lg font-semibold">
                    {formatMetric(cluster?.[key])}
                  </span>
                }
              />
            ))}
          </div>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-6 text-sm px-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`pb-2.5 -mb-px border-b-2 transition-colors ${
                  tab === key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && <OverviewTab cluster={cluster} />}
        {tab === "resources" && <ResourcesTab clusterName={clusterName} />}
        {tab === "compute" && <ComputeTab cluster={cluster} />}
        {tab === "networking" && <NetworkingTab cluster={cluster} />}
        {tab === "tags" && <TagsTab />}
      </div>
    </div>
  );
}

export default EksDetails;