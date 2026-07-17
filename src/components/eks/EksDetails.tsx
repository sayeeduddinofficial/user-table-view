import { Header } from "@/components/layout/Header";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import { CLUSTER, DetailTab } from "./eksData";
import { Field } from "./eksShared";
import { OverviewTab } from "./OverviewTab";
import { ResourcesTab } from "./ResourcesTab";
import { ComputeTab } from "./ComputeTab";
import { NetworkingTab } from "./NetworkingTab";
import { TagsTab } from "./TagsTab";

type EksDetailsProps = {
  eksId?: string;
  embedded?: boolean;
};

export function EksDetails({
  eksId: propId,
  embedded = false,
}: EksDetailsProps) {
  const { eksId: routeId } = useParams<{ eksId: string }>();
  const eksId = propId ?? routeId ?? CLUSTER.name;
  const [tab, setTab] = useState<DetailTab>("overview");

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: "Resources" },
    { key: "compute", label: "Compute" },
    { key: "networking", label: "Networking" },
    // { key: "tags", label: "Tags" },
  ];

  const { alert } = useDialog();

  const handleRefresh = async () => {
    try {
      alert({ title: "Refreshed", severity: "success" });
    } catch (error) {
      alert({ title: `Failed to Refresh`, severity: "error" });
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <Header
          title={`EKS ${CLUSTER.name}`}
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
            <span>{CLUSTER.name}</span>
          </div>
        )}

        {/* Title + actions row */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{CLUSTER.name}</h1>
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

        {/* Cluster info card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">Cluster info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 text-sm">
            <Field
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 size={14} /> {CLUSTER.status}
                </span>
              }
            />
            <Field
              label="Kubernetes version"
              value={CLUSTER.kubernetesVersion}
            />
            <Field
              label="Support period"
              value={
                <span className="text-primary">{CLUSTER.supportPeriod}</span>
              }
            />
            <Field label="Provider" value={CLUSTER.provider} />
            <Field
              label="Cluster health"
              value={
                <span className="text-success text-lg font-semibold">
                  {CLUSTER.clusterHealth}
                </span>
              }
            />
            <Field
              label="Upgrade insights"
              value={
                <span className="text-success text-lg font-semibold">
                  {CLUSTER.upgradeInsights}
                </span>
              }
            />
            <Field
              label="Node health issues"
              value={
                <span className="text-success text-lg font-semibold">
                  {CLUSTER.nodeHealthIssues}
                </span>
              }
            />
            <Field
              label="Capability issues"
              value={
                <span className="text-success text-lg font-semibold">
                  {CLUSTER.capabilityIssues}
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

        {tab === "overview" && <OverviewTab />}
        {tab === "resources" && <ResourcesTab />}
        {tab === "compute" && <ComputeTab />}
        {tab === "networking" && <NetworkingTab />}
        {tab === "tags" && <TagsTab />}
      </div>
    </div>
  );
}

export default EksDetails;
