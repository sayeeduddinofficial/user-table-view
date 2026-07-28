import { useEffect, useMemo, useState } from "react";
import { RESOURCE_GROUPS } from "./eksData";
import { ResourceTable } from "./eksShared";
import { getClusterResources, type EksResourceRow } from "@/services/eksClusterService";

const KEY_LABELS: Record<string, string> = {
  name: "Name",
  namespace: "Namespace",
  status: "Status",
  created_at: "Created",
  api_version: "API Version",
  replicas: "Replicas",
  ready_replicas: "Ready Replicas",
  available_replicas: "Available Replicas",
  service_type: "Service Type",
  cluster_ip: "Cluster IP",
  instance_type: "Instance Type",
  cpu_usage: "CPU Usage",
  memory_usage: "Memory Usage",
  desired: "Desired",
  ready: "Ready",
  podcount: "Pod count",
  succeeded: "Succeeded",
  failed: "Failed",
  active: "Active",
  schedule: "Schedule",
  suspend: "Suspend",
  ingress_class: "Ingress Class",
  address: "Address",
  type: "Type",
  controller: "Controller",
  revision: "Revision",
  last_schedule: "Last Schedule",
  reference: "Reference",
  min_pods: "Min Pods",
  max_pods: "Max Pods",
  completions: "Completions",
  duration: "Duration",
  restarts: "Restarts",
  node: "Node",
  pod_ip: "Pod IP",
  current: "Current",
  service: "Service",
  available: "Available",
  priority_level: "Priority Level",
  matching_precedence: "Matching Precedence",
  holder: "Holder",
  roles: "Roles",
  value: "Value",
  global_default: "Global Default",
  handler: "Handler",
  endpoints: "Endpoints",
  address_type: "Address Type",
  external_ip: "External IP",
  ports: "Ports",
  storage_class: "Storage Class",
  capacity: "Capacity",
  access_modes: "Access Modes",
  claim: "Claim",
  node_name: "Node Name",
  provisioner: "Provisioner",
  reclaim_policy: "Reclaim Policy",
  attacher: "Attacher",
  driver_name: "Driver Name",
  signer_name: "Signer Name",
  requestor: "Requestor",
  condition: "Condition",
  secrets: "Secrets",
  role: "Role",
  min_available: "Min Available",
  max_unavailable: "Max Unavailable",
  allowed_disruptions: "Allowed Disruptions",
  group: "Group",
  version: "Version",
  kind: "Kind",
  scope: "Scope",
  cidrs: "CIDRs",
  message: "Message",
};

// Column sets shared by multiple resource types.
const DEFAULT_COLUMNS = ["name", "created_at"];
const WORKLOAD_COLUMNS = ["name", "namespace", "type", "created_at", "podcount", "status"];

const WORKLOAD_COLUMN_IDS = new Set([
  "daemonSets",
  "deployments",
  "jobs",
  "replicaSets",
  "statefulSets",
]);

// Per-type overrides for anything that isn't DEFAULT_COLUMNS or WORKLOAD_COLUMNS.
const CUSTOM_COLUMNS: Record<string, string[]> = {
  pods: ["name", "created_at", "status"],
  nodes: ["name", "instance_type", "created_at", "status"],
};

// Fixed column layout per resource type, so headers stay consistent even
// when there is no data yet. Add/override entries in CUSTOM_COLUMNS above.
const FIXED_COLUMNS: Record<string, string[]> = Object.fromEntries(
  RESOURCE_GROUPS.flatMap((g) => g.items).map(({ id }) => [
    id,
    CUSTOM_COLUMNS[id] ?? (WORKLOAD_COLUMN_IDS.has(id) ? WORKLOAD_COLUMNS : DEFAULT_COLUMNS),
  ]),
);

function labelFor(key: string): string {
  return (
    KEY_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "created_at") {
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

function getOrderedKeys(row: EksResourceRow): string[] {
  const keys = Object.keys(row);
  const front = ["name", "namespace"].filter((k) => keys.includes(k));
  const back = ["created_at"].filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !front.includes(k) && !back.includes(k));
  return [...front, ...rest, ...back];
}

export function ResourcesTab({ clusterName }: { clusterName?: string }) {
  const [selected, setSelected] = useState("controllerRevision");
  const [rows, setRows] = useState<EksResourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentItem = useMemo(
    () =>
      RESOURCE_GROUPS.flatMap((g) => g.items).find((x) => x.id === selected),
    [selected],
  );

  useEffect(() => {
    if (!clusterName) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getClusterResources(clusterName, selected)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError("Failed to load resources");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterName, selected]);

  const orderedKeys =
    FIXED_COLUMNS[selected] ??
    (rows.length > 0 ? getOrderedKeys(rows[0]) : ["name", "created_at"]);
  const columns = orderedKeys.map(labelFor);
  const tableRows = rows.map((row) => orderedKeys.map((k) => formatValue(k, row[k])));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <div className="bg-card border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
        <h3 className="font-semibold mb-3">Resource Types</h3>

        {RESOURCE_GROUPS.map((group) => (
          <div key={group.group} className="mb-4">
            <div className="text-xs font-semibold mb-2">{group.group}</div>

            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`block w-full text-left px-2 py-1 rounded text-sm ${
                  selected === item.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-lg p-5">
        <h2 className="font-semibold mb-4">
          {currentItem?.name} ({rows.length})
        </h2>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <ResourceTable
            columns={columns}
            rows={tableRows}
            emptyLabel={currentItem?.name ?? ""}
          />
        )}
      </div>
    </div>
  );
}
