import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Search, RefreshCw } from "lucide-react";
import { lbApi, type LbItem } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";

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

  const lbTypeLabel = lb.type === "application" ? "Application" : lb.type === "network" ? "Network" : lb.type;
  const statusClassName = {
    pending: "text-gray-400",
    provisioning: "text-blue-400",
    creating: "text-blue-400",
    completed: "text-emerald-400",
    active: "text-emerald-400",
    failed: "text-red-400",
    destroying: "text-orange-400",
    deleting: "text-orange-400",
    terminating: "text-orange-400",
    destroyed: "text-gray-400",
    deleted: "text-gray-400",
    terminated: "text-gray-400",
    retrying: "text-indigo-400",
    retrying_terminate: "text-purple-400",
  }[lb.status?.toLowerCase() ?? "pending"] ?? "text-gray-400";

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

        <div className="border rounded-lg bg-card">
          <div className="m-2 border-b">
            <h2 className="font-semibold text-lg">Details</h2>
          </div>
          <div className="grid md:grid-cols-5 gap-8 p-8 text-sm">
            <div>
              <p className="text-muted-foreground">Load balancer type</p>
              <p>{lbTypeLabel}</p>
              <p className="mt-5 text-muted-foreground">Scheme</p>
              <p>{lb.scheme}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={`${statusClassName} font-medium`}>
                {['completed', 'active'].includes(lb.status?.toLowerCase())
                  ? 'Active'
                  : lb.status.charAt(0).toUpperCase() + lb.status.slice(1)}
              </p>
              <p className="mt-5 text-muted-foreground">IP address type</p>
              <p>{lb.ip_address_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">VPC</p>
              <p>{lb.vpc_id}</p>
              <p className="mt-5 text-muted-foreground">Availability Zones</p>
              <div className="space-y-1">
                {lb.subnets.map((s) => (
                  <div key={s.id}>{s.availability_zone}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Region</p>
              <p>{lb.region}</p>
              <p className="mt-5 text-muted-foreground">Created</p>
              <p>{new Date(lb.created_at).toUTCString().replace("GMT", "UTC")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Request</p>
              <p className="font-mono text-xs break-all">{lb.request_id || "-"}</p>
              {lb.request_id ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/console?request=${encodeURIComponent(lb.request_id)}&service=lb-service`)}
                >
                  View request
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid md:grid-cols-2 border-t">
            <div className="p-5 border-r">
              <p className="text-muted-foreground text-sm">Security Groups</p>
              <p className="text-sm mt-1">{(lb.security_group_ids ?? []).join(", ") || "-"}</p>
            </div>
            <div className="p-5">
              <p className="text-muted-foreground text-sm">Justification</p>
              <p className="text-sm mt-1">{lb.justification || "-"}</p>
            </div>
          </div>
        </div>

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

function ListenersTab({ listeners }: { listeners: LbItem["listeners"] }) {
  return (
    <div className="border rounded-lg bg-card">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold">Listeners and rules</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="p-3 text-left">Protocol:Port</th>
            <th className="p-3 text-left">Action type</th>
            <th className="p-3 text-left">Action config</th>
          </tr>
        </thead>
        <tbody>
          {listeners.length === 0 && (
            <tr><td colSpan={3} className="p-3 text-muted-foreground">No listeners configured.</td></tr>
          )}
          {listeners.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="p-3">{l.protocol}:{l.port}</td>
              <td className="p-3">{l.action_type}</td>
              <td className="p-3 font-mono text-xs">{JSON.stringify(l.action_config)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NetworkTab({ subnets }: { subnets: LbItem["subnets"] }) {
  return (
    <div className="border rounded-lg p-5 bg-card">
      <h2 className="font-semibold text-lg mb-5">Availability Zones and subnets</h2>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Zone</th>
            <th className="p-3 text-left">Subnet</th>
            <th className="p-3 text-left">Private IPv4</th>
            <th className="p-3 text-left">IP assignment</th>
          </tr>
        </thead>
        <tbody>
          {subnets.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-3">{s.availability_zone}</td>
              <td className="p-3">{s.subnet_id}</td>
              <td className="p-3">{s.private_ipv4_address || "-"}</td>
              <td className="p-3">{s.ip_assignment_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourceTab({ listeners }: { listeners: LbItem["listeners"] }) {
  return (
    <div className="overflow-auto">
      <div className="flex gap-6 min-w-[600px]">
        <div className="border rounded-lg p-5 w-64">
          <h3 className="font-semibold mb-3">Listeners</h3>
          {listeners.map((l) => <p key={l.id}>{l.protocol}:{l.port}</p>)}
        </div>
        <div className="border rounded-lg p-5 w-64">
          <h3 className="font-semibold mb-3">Actions</h3>
          {listeners.map((l) => <p key={l.id}>{l.action_type}</p>)}
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ securityGroupIds }: { securityGroupIds: string[] }) {
  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Security groups</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Security Group ID</th>
          </tr>
        </thead>
        <tbody>
          {(securityGroupIds ?? []).length === 0 && (
            <tr><td className="p-3 text-muted-foreground">No security groups.</td></tr>
          )}
          {(securityGroupIds ?? []).map((sg) => (
            <tr key={sg} className="border-b">
              <td className="p-3 font-mono">{sg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TagsTab({ tags }: { tags: LbItem["lb_tags"] }) {
  const [search, setSearch] = useState("");
  const filtered = tags.filter(
    (t) => t.key.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Tags</h2>
      </div>
      <div className="p-4 border-b">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search tags"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Key</th>
            <th className="p-3 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={2} className="p-3 text-muted-foreground">No tags.</td></tr>
          )}
          {filtered.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-3">{t.key}</td>
              <td className="p-3">{t.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LoadBalancerDetails;
