import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams, Link, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { lbApi, type LbItem } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";
import { LbDetailsCard } from "./detail/LbDetailsCard";
import { ListenersTab } from "./detail/ListenersTab";
import { NetworkTab } from "./detail/NetworkTab";
import { ResourceTab } from "./detail/ResourceTab";
import { SecurityTab } from "./detail/SecurityTab";
import { TagsTab } from "./detail/TagsTab";

type LbTab = "listeners" | "network" | "resource" | "security" | "tags";

export function LoadBalancerDetails({
  lbId: propId,
  embedded = false,
}: {
  lbId?: string;
  embedded?: boolean;
}) {
  const { lbId: routeId } = useParams<{ lbId: string }>();
  const lbId = propId ?? routeId;
  const navigate = useNavigate();
  const { alert } = useDialog();

  const [lb, setLb] = useState<LbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LbTab>("listeners");

  useEffect(() => {
    if (!lbId) return;
    lbApi.getById(lbId)
      .then((res) => setLb((res as any).data))
      .catch(() => alert({ title: "Failed to load load balancer", severity: "error" }))
      .finally(() => setLoading(false));
  }, [lbId]);

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading...</div>;
  }

  if (!lb) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Load Balancer not found</h1>
      </div>
    );
  }

  const tabs = [
    { key: "listeners", label: "Listeners and rules" },
    { key: "network", label: "Network mapping" },
    { key: "resource", label: "Resource map" },
    { key: "security", label: "Security" },
    /* { key: "tags", label: "Tags" }, */
  ];

  return (
    <div className="space-y-4">
      {!embedded && (
        <Header 
          title="Load Balancers"
          subtitle="Network traffic management and distribution resources." />
      )}

      <div className="space-y-5 px-6 pb-6 pt-2">
        {!embedded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/aws/load-balancers" className="text-primary hover:underline">
              Load Balancers
            </Link>
            <span>/</span>
            <span>{lb.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{lb.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon"
              onClick={() => {
                setLoading(true);
                lbApi.getById(lbId!)
                  .then((res) => setLb((res as any).data))
                  .catch(() => alert({ title: "Failed to refresh", severity: "error" }))
                  .finally(() => setLoading(false));
              }}
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={() => alert({ title: "Actions", description: "Additional load balancer actions will be available soon.", severity: "warning" })}
            >
              Actions
            </Button>
          </div>
        </div>

        <LbDetailsCard
          lb={lb}
          onViewRequest={() => navigate(`/console?request=${encodeURIComponent(lb.request_id)}&service=lb-service`)}
        />

        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as LbTab)}
                className={`px-5 py-3 text-sm whitespace-nowrap border-b-2 ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600 font-medium"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "listeners" && <ListenersTab listeners={lb.listeners} />}
        {tab === "network" && <NetworkTab subnets={lb.subnets} />}
        {tab === "resource" && <ResourceTab listeners={lb.listeners} />}
        {tab === "security" && <SecurityTab securityGroupIds={lb.security_group_ids} />}
        {tab === "tags" && <TagsTab tags={lb.lb_tags} />}
      </div>
    </div>
  );
}

export default LoadBalancerDetails;