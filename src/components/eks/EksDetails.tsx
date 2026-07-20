import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import { DetailTab } from "./eksData";
import { Field } from "./eksShared";
import { OverviewTab } from "./OverviewTab";
import { ResourcesTab } from "./ResourcesTab";
import { ComputeTab } from "./ComputeTab";
import { NetworkingTab } from "./NetworkingTab";
import { TagsTab } from "./TagsTab";

const API_BASE = import.meta.env.VITE_EKS_CLUSTER_SERVICE_URL;

export interface EksClusterDetail {
  id: number;
  request_id: string;
  cluster_name: string;
  region: string;
  kubernetes_version: string;
  cluster_iam_role_arn: string | null;
  node_iam_role_arn: string | null;
  vpc_id: string | null;
  vpc_name: string | null;
  subnet_ids: string[] | null;
  status: string;
  cluster_arn: string | null;
  endpoint: string | null;
  created_at: string;
  certificate_authority: string | null;
  oidc_issuer: string | null;
  platform_version: string | null;
support_type: string | null;
support_until: string | null;
  cluster_ip_family: string | null;
  cluster_security_group_id: string | null;
  additional_security_group_ids: string[] | null;
  egress_mode: string | null;
service_ipv4_cidr: string | null;
cluster_type: string | null;
  public_access_cidrs: string[] | null;
  node_pools: unknown[] | null;
  node_classes: unknown[] | null;
  cluster_health: unknown | null;
  node_health: unknown | null;
  upgrade_insights: unknown | null;
  capability_issues: unknown | null;
  node_groups: unknown[];
  nodes: unknown[];
}

type EksDetailsProps = {
  eksId?: string;
  embedded?: boolean;
};

export function EksDetails({
  eksId: propId,
  embedded = false,
}: EksDetailsProps) {
  const { eksId: routeId } = useParams<{ eksId: string }>();
  const eksId = propId ?? routeId ?? "";
  const [tab, setTab] = useState<DetailTab>("overview");
  const clusterName = eksId;
  const [cluster, setCluster] = useState<EksClusterDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: "Resources" },
    { key: "compute", label: "Compute" },
    { key: "networking", label: "Networking" },
    // { key: "tags", label: "Tags" },
  ];

  const { alert } = useDialog();

const fetchDetails = async () => {
  if (!eksId) return;
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/eks/${eksId}/details`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok || data?.status !== "SUCCESS") {
      alert({ title: data?.message || "Failed to load cluster details", severity: "error" });
      return;
    }
    setCluster(data.data);
  } catch {
    alert({ title: "Failed to load cluster details", severity: "error" });
  } finally {
    setLoading(false);
  }
};

useEffect(() => { fetchDetails(); }, [eksId]);

const handleRefresh = async () => {
  await fetchDetails();
  alert({ title: "Refreshed", severity: "success" });
};

const clusterNames = cluster?.cluster_name ?? eksId;
const statusColor =
  cluster?.status === "ACTIVE" ? "text-success" :
  cluster?.status === "PENDING" ? "text-blue-400" :
  cluster?.status === "FAILED" ? "text-destructive" : "text-muted-foreground";


  return (
    <div className="space-y-4">
      {!embedded && (
        <Header
          title={`EKS ${clusterNames}`}
          subtitle={`Details for ${eksId}`}
        />
      )}

      <div className="space-y-4 p-6">
        {!embedded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/aws/eks" className="text-primary hover:underline">
              EKS Clusters
            </Link>
            <ChevronRight size={14} />
            <span className={statusColor}>
              {cluster?.status ?? "—"}
            </span>
          </div>
        )}

        {/* Title + actions row */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{clusterNames}</h1>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => handleRefresh()}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading cluster details…</div>}

        {/* Cluster info card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">Cluster info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 text-sm">
            <Field
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 size={14} /> {cluster?.status ?? "—"}
                </span>
              }
            />
            <Field
              label="Kubernetes version"
              value={cluster?.kubernetes_version ?? "—"}
            />
           <Field
  label="Support period"
  value={
    <span className="text-white">
      {cluster?.support_type
        ? cluster.support_type.charAt(0).toUpperCase() + cluster.support_type.slice(1).toLowerCase()
        : "—"}
      {cluster?.support_until
        ? ` until ${new Date(cluster.support_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
        : ""}
    </span>
  }
/>

            <Field label="Provider" value={"EKS"} />
            <Field
              label="Cluster health"
              value={
                <span className="text-success text-lg font-semibold">
                  {cluster?.cluster_health != null ? String(cluster.cluster_health) : "—"}
                </span>
              }
            />
            <Field
              label="Upgrade insights"
              value={
                <span className="text-success text-lg font-semibold">
                  {cluster?.upgrade_insights != null ? String(cluster.upgrade_insights) : "—"}
                </span>
              }
            />
            <Field
              label="Node health issues"
              value={
                <span className="text-success text-lg font-semibold">
                  {cluster?.node_health != null ? String(cluster.node_health) : "—"}
                </span>
              }
            />
            <Field
              label="Capability issues"
              value={
                <span className="text-success text-lg font-semibold">
                  {cluster?.capability_issues != null ? String(cluster.capability_issues) : "—"}
                </span>
              }
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-6 text-sm px-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2.5 -mb-px border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
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
