import { Header } from "@/components/layout/Header";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useParams, Link } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";

type DetailTab = "overview" | "resources" | "compute" | "networking" | "tags";

type EksDetailsProps = {
  eksId?: string;
  embedded?: boolean;
};

// Static demo data based on screenshot
const CLUSTER = {
  name: "test-splunkOps",
  status: "Active",
  kubernetesVersion: "1.36",
  supportPeriod: "Standard support until August 2, 2027",
  provider: "EKS",
  clusterHealth: 0,
  upgradeInsights: 4,
  nodeHealthIssues: 0,
  capabilityIssues: 0,
  apiServerEndpoint:
    "https://5751F2D02A5B86E53A75C97B036DC17B.yl4.us-east-2.eks.amazonaws.com",
  oidcProviderUrl:
    "https://oidc.eks.us-east-2.amazonaws.com/id/5751F2D02A5B86E53A75C97B036DC17B",
  created: "23 minutes ago",
  certificateAuthority:
    "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJRTRRcU5vbGdmMGN3RFFZSktvWklodmNOQVFFTEJRQXcKVXlZ0F3SUJBZ0lJRTRRcU5vbGdmMGN3RFFZSktvWklodmNOQVFFTEJRQXcK",
  clusterIamRoleArn: "arn:aws:iam::566889948003:role/SplunkOps-EKS-Role",
  clusterArn: "arn:aws:eks:us-east-2:566889948003:cluster/test-splunkOps",
  platformVersion: "eks.7",
  nodeIamRole: "arn:aws:iam::566889948003:role/SplunkOps-EKS-Node-Role",
  vpcId: "vpc-0abc12345def67890",
  subnets: [
    {
      id: "subnet-0a1b2c3d4e5f60001",
      az: "us-east-2a",
      type: "public",
      cidr: "10.0.1.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60002",
      az: "us-east-2b",
      type: "public",
      cidr: "10.0.2.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60003",
      az: "us-east-2a",
      type: "private",
      cidr: "10.0.11.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60004",
      az: "us-east-2b",
      type: "private",
      cidr: "10.0.12.0/24",
    },
  ],
  securityGroups: ["sg-0abcdef1234567890"],
  serviceIpv4Cidr: "172.20.0.0/16",
  clusterEndpointAccess: "Public and private",
  clusterIpAddressFamily: "IPv4",
  additionalSecurityGroups: ["sg-0fb7a721c37f43269", "sg-0abcdef1234567891"],
  egressMode: "WS managed",
  publicAccessSourceAllowList: ["0.0.0.0/0"],
  nodeGroups: [
    {
      name: "splunkops-ng-1",
      status: "Active",
      instanceType: "t3.large",
      desired: 2,
      min: 1,
      max: 4,
      capacity: "ON_DEMAND",
    },
    {
      name: "splunkops-ng-2",
      status: "Active",
      instanceType: "t3.medium",
      desired: 3,
      min: 2,
      max: 6,
      capacity: "SPOT",
    },
  ],
  tags: {
    Owner: "nanag@outlook.com",
    Project: "SplunkOps",
    Environment: "dev",
  },
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
      alert({
        title: "Refreshed",
        severity: "success",
      });
    } catch (error) {
      alert({
        title: `Failed to Refresh`,
        severity: "error",
      });
    } 
  }

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm break-all">{value ?? "—"}</div>
    </div>
  );
}

function CopyText({ text }: { text: string }) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <Copy
        size={12}
        className="text-muted-foreground cursor-pointer mt-1 shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast.success("Copied");
        }}
      />
      <span className="break-all">{text}</span>
    </span>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <Field
            label="API server endpoint"
            value={<CopyText text={CLUSTER.apiServerEndpoint} />}
          />
          <Field
            label="OpenID Connect provider URL"
            value={<CopyText text={CLUSTER.oidcProviderUrl} />}
          />
          <Field label="Created" value={<CopyText text={CLUSTER.created} />} />
          <Field
            label="Certificate authority"
            value={
              <textarea
                readOnly
                value={CLUSTER.certificateAuthority}
                className="w-full h-20 text-xs font-mono bg-muted/40 border border-border rounded p-2 resize-none"
              />
            }
          />
          <Field
            label="Cluster IAM role ARN"
            value={
              <span className="inline-flex items-start gap-1.5">
                <CopyText text={CLUSTER.clusterIamRoleArn} />
                <a
                  className="text-primary hover:underline whitespace-nowrap"
                  href="#"
                >
                  View in IAM
                </a>
              </span>
            }
          />
          <div className="space-y-5">
            <Field
              label="Cluster ARN"
              value={<CopyText text={CLUSTER.clusterArn} />}
            />
            <Field label="Platform version" value={CLUSTER.platformVersion} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">EKS Auto Mode</h2>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          EKS automates routine cluster tasks for compute, storage, and
          networking to meet application compute needs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <Field label="EKS Auto Mode" value="Enabled" />
          <Field
            label="Node IAM role"
            value={
              <span className="inline-flex items-start gap-1.5">
                <CopyText text={CLUSTER.nodeIamRole} />
                <a
                  className="text-primary hover:underline whitespace-nowrap"
                  href="#"
                >
                  View in IAM
                </a>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

const RESOURCE_GROUPS: {
  group: string;
  items: { name: string; columns: string[]; rows: (string | number)[][] }[];
}[] = [
  {
    group: "Workloads",
    items: [
      { name: "ControllerRevision", columns: ["Name", "Created"], rows: [] },
      {
        name: "CronJobs",
        columns: [
          "Name",
          "Namespace",
          "Schedule",
          "Suspend",
          "Active",
          "Last schedule",
        ],
        rows: [],
      },
      {
        name: "DaemonSets",
        columns: [
          "Name",
          "Namespace",
          "Desired",
          "Current",
          "Ready",
          "Up-to-date",
        ],
        rows: [
          ["aws-node", "kube-system", 2, 2, 2, 2],
          ["kube-proxy", "kube-system", 2, 2, 2, 2],
        ],
      },
      {
        name: "Deployments",
        columns: [
          "Name",
          "Namespace",
          "Ready",
          "Up-to-date",
          "Available",
          "Age",
        ],
        rows: [["coredns", "kube-system", "2/2", 2, 2, "23m"]],
      },
      {
        name: "HorizontalPodAutoscalers",
        columns: ["Name", "Namespace", "Reference", "Targets", "Min", "Max"],
        rows: [],
      },
      {
        name: "Jobs",
        columns: ["Name", "Namespace", "Completions", "Duration", "Age"],
        rows: [],
      },
      {
        name: "Pods",
        columns: ["Name", "Namespace", "Ready", "Status", "Restarts", "Age"],
        rows: [
          ["coredns-abc", "kube-system", "1/1", "Running", 0, "23m"],
          ["coredns-def", "kube-system", "1/1", "Running", 0, "23m"],
          ["aws-node-xyz", "kube-system", "1/1", "Running", 0, "23m"],
        ],
      },
      {
        name: "PodTemplates",
        columns: ["Name", "Namespace", "Containers"],
        rows: [],
      },
      {
        name: "ReplicaSets",
        columns: ["Name", "Namespace", "Desired", "Current", "Ready", "Age"],
        rows: [["coredns-6d4b75cb6d", "kube-system", 2, 2, 2, "23m"]],
      },
      {
        name: "ReplicationController",
        columns: ["Name", "Namespace", "Desired", "Current", "Ready"],
        rows: [],
      },
      {
        name: "StatefulSets",
        columns: ["Name", "Namespace", "Ready", "Age"],
        rows: [],
      },
    ],
  },
  {
    group: "Cluster",
    items: [
      {
        name: "APIServices",
        columns: ["Name", "Service", "Available", "Age"],
        rows: [],
      },
      { name: "Binding", columns: ["Name", "Namespace"], rows: [] },
      {
        name: "ComponentStatus",
        columns: ["Name", "Status", "Message"],
        rows: [],
      },
      {
        name: "FlowSchemas",
        columns: ["Name", "PriorityLevel", "MatchingPrecedence"],
        rows: [],
      },
      {
        name: "Leases",
        columns: ["Name", "Namespace", "Holder", "Age"],
        rows: [],
      },
      {
        name: "Namespaces",
        columns: ["Name", "Status", "Age"],
        rows: [
          ["default", "Active", "23m"],
          ["kube-system", "Active", "23m"],
          ["kube-public", "Active", "23m"],
          ["kube-node-lease", "Active", "23m"],
        ],
      },
      {
        name: "Nodes",
        columns: ["Name", "Status", "Roles", "Version", "Age"],
        rows: [
          ["ip-10-0-1-12", "Ready", "worker", "v1.36.0", "23m"],
          ["ip-10-0-2-34", "Ready", "worker", "v1.36.0", "23m"],
        ],
      },
      {
        name: "PriorityClasses",
        columns: ["Name", "Value", "Global default", "Age"],
        rows: [],
      },
      {
        name: "PriorityLevelConfigurations",
        columns: ["Name", "Type", "AssuredConcurrencyShares"],
        rows: [],
      },
      { name: "RuntimeClasses", columns: ["Name", "Handler", "Age"], rows: [] },
    ],
  },
  {
    group: "Service and networking",
    items: [
      {
        name: "Endpoints",
        columns: ["Name", "Namespace", "Endpoints", "Age"],
        rows: [["kubernetes", "default", "10.0.1.12:443", "23m"]],
      },
      {
        name: "EndpointSlices",
        columns: ["Name", "Namespace", "AddressType", "Ports"],
        rows: [],
      },
      {
        name: "IngressClasses",
        columns: ["Name", "Controller", "Age"],
        rows: [],
      },
      {
        name: "Ingresses",
        columns: ["Name", "Namespace", "Class", "Hosts", "Address"],
        rows: [],
      },
      { name: "IPAddresses", columns: ["Name", "ParentRef"], rows: [] },
      {
        name: "NetworkPolicies",
        columns: ["Name", "Namespace", "PodSelector", "Age"],
        rows: [],
      },
      { name: "ServiceCIDRs", columns: ["Name", "CIDRs", "Age"], rows: [] },
      {
        name: "Services",
        columns: [
          "Name",
          "Namespace",
          "Type",
          "Cluster IP",
          "External IP",
          "Ports",
        ],
        rows: [
          ["kubernetes", "default", "ClusterIP", "172.20.0.1", "—", "443/TCP"],
          [
            "kube-dns",
            "kube-system",
            "ClusterIP",
            "172.20.0.10",
            "—",
            "53/UDP,53/TCP",
          ],
        ],
      },
    ],
  },
  {
    group: "Config and secrets",
    items: [
      {
        name: "ConfigMaps",
        columns: ["Name", "Namespace", "Data", "Age"],
        rows: [
          ["coredns", "kube-system", 1, "23m"],
          ["kube-proxy", "kube-system", 2, "23m"],
        ],
      },
      {
        name: "Secrets",
        columns: ["Name", "Namespace", "Type", "Data", "Age"],
        rows: [
          [
            "default-token",
            "default",
            "kubernetes.io/service-account-token",
            3,
            "23m",
          ],
        ],
      },
    ],
  },
  {
    group: "Storage",
    items: [
      {
        name: "CSIDrivers",
        columns: ["Name", "Attach required", "Age"],
        rows: [],
      },
      { name: "CSINodes", columns: ["Name", "Drivers", "Age"], rows: [] },
      {
        name: "CSIStorageCapacities",
        columns: ["Name", "StorageClass", "Capacity"],
        rows: [],
      },
      { name: "DeviceClasses", columns: ["Name", "Age"], rows: [] },
      {
        name: "PersistentVolumeClaims",
        columns: ["Name", "Namespace", "Status", "Volume", "Capacity"],
        rows: [],
      },
      {
        name: "PersistentVolumes",
        columns: ["Name", "Capacity", "Access modes", "Status", "Claim"],
        rows: [],
      },
      {
        name: "ResourceClaims",
        columns: ["Name", "Namespace", "State"],
        rows: [],
      },
      {
        name: "ResourceClaimTemplates",
        columns: ["Name", "Namespace"],
        rows: [],
      },
      { name: "ResourceSlices", columns: ["Name", "Node"], rows: [] },
      {
        name: "StorageClasses",
        columns: ["Name", "Provisioner", "ReclaimPolicy", "Age"],
        rows: [["gp2", "kubernetes.io/aws-ebs", "Delete", "23m"]],
      },
      {
        name: "VolumeAttachment",
        columns: ["Name", "Attacher", "PV", "Node", "Attached"],
        rows: [],
      },
      {
        name: "VolumeAttributesClasses",
        columns: ["Name", "DriverName"],
        rows: [],
      },
    ],
  },
  {
    group: "Authentication",
    items: [
      {
        name: "CertificateSigningRequest",
        columns: ["Name", "Age", "Requestor", "Condition"],
        rows: [],
      },
      {
        name: "ServiceAccounts",
        columns: ["Name", "Namespace", "Secrets", "Age"],
        rows: [["default", "default", 0, "23m"]],
      },
    ],
  },
  {
    group: "Authorization",
    items: [
      {
        name: "ClusterRoleBindings",
        columns: ["Name", "Role", "Age"],
        rows: [["cluster-admin", "ClusterRole/cluster-admin", "23m"]],
      },
      {
        name: "ClusterRoles",
        columns: ["Name", "Age"],
        rows: [
          ["cluster-admin", "23m"],
          ["admin", "23m"],
          ["edit", "23m"],
          ["view", "23m"],
        ],
      },
      {
        name: "RoleBindings",
        columns: ["Name", "Namespace", "Role", "Age"],
        rows: [],
      },
      { name: "Roles", columns: ["Name", "Namespace", "Age"], rows: [] },
    ],
  },
  {
    group: "Policy",
    items: [
      { name: "LimitRanges", columns: ["Name", "Namespace", "Age"], rows: [] },
      {
        name: "PodDisruptionBudgets",
        columns: ["Name", "Namespace", "Min available", "Max unavailable"],
        rows: [],
      },
      {
        name: "ResourceQuotas",
        columns: ["Name", "Namespace", "Age"],
        rows: [],
      },
    ],
  },
  {
    group: "Extensions",
    items: [
      {
        name: "CustomResourceDefinitions",
        columns: ["Name", "Group", "Version", "Age"],
        rows: [],
      },
      { name: "MutatingAdmissionPolicy", columns: ["Name", "Age"], rows: [] },
      {
        name: "MutatingAdmissionPolicyBinding",
        columns: ["Name", "PolicyName"],
        rows: [],
      },
      {
        name: "MutatingWebhookConfigurations",
        columns: ["Name", "Webhooks", "Age"],
        rows: [],
      },
      {
        name: "ValidatingAdmissionPolicies",
        columns: ["Name", "Age"],
        rows: [],
      },
      {
        name: "ValidatingAdmissionPolicyBindings",
        columns: ["Name", "PolicyName"],
        rows: [],
      },
      {
        name: "ValidatingWebhookConfigurations",
        columns: ["Name", "Webhooks", "Age"],
        rows: [],
      },
    ],
  },
];

function ResourcesTab() {
  const [selected, setSelected] = useState<string>("ControllerRevision");
  const current = RESOURCE_GROUPS.flatMap((g) => g.items).find(
    (i) => i.name === selected,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* Left: resource types list */}
      <div className="bg-card border border-border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-sm font-semibold mb-3">Resource types</h3>
        <div className="space-y-4">
          {RESOURCE_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="text-xs font-semibold text-foreground mb-1.5">
                {g.group}
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.name}>
                    <button
                      onClick={() => setSelected(it.name)}
                      className={`text-left text-sm w-full px-2 py-1 rounded transition-colors ${
                        selected === it.name
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-primary/90 hover:bg-accent/40"
                      }`}
                    >
                      {it.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Right: table for selected resource */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            {current?.name}{" "}
            <span className="text-muted-foreground font-normal">
              ({current?.rows.length ?? 0})
            </span>
          </h2>
          <Button variant="outline" size="sm">
            View details
          </Button>
        </div>
        <ResourceTable
          columns={current?.columns ?? []}
          rows={current?.rows ?? []}
          emptyLabel={current?.name ?? ""}
        />
      </div>
    </div>
  );
}

function ResourceTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[];
  rows: (string | number)[][];
  emptyLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            {columns.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="text-sm font-medium">
                  No {emptyLabel.toLowerCase()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  This cluster does not have any {emptyLabel.toLowerCase()}, or
                  you don't have permission to view them.
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 ${j === 0 ? "font-mono text-primary" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ComputeTab() {
  return (
    <div className="space-y-4">
      {/* Nodes */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">
            Nodes <span className="text-muted-foreground font-normal">(0)</span>
          </h2>
        </div>
        <input
          type="text"
          placeholder="Filter Nodes by property or value"
          className="w-full text-sm bg-muted/30 border border-border rounded px-3 py-2 mb-3"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                {[
                  "Node name",
                  "Instance type",
                  "Compute",
                  "Managed by",
                  "Created",
                  "Status",
                  "CPU usage",
                  "Memory usage",
                  "Ephemeral storage usage",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <div className="font-medium text-foreground">No Nodes</div>
                  <div className="text-xs mt-1">
                    This cluster does not have any Nodes, or you don't have
                    permission to view them.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Node configuration heading */}
      <div>
        <h2 className="text-base font-semibold">Node configuration</h2>
        <p className="text-xs text-muted-foreground">
          View and manage the sources of your nodes.
        </p>
      </div>

      {/* Node pools */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">
            Node pools{" "}
            <span className="text-muted-foreground font-normal">(0)</span>
          </h2>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Node pools define compute capacity for your Auto Mode cluster.
          Built-in node pools are managed by AWS, while custom node pools
          provide additional configuration options.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                {[
                  "Name",
                  "Type",
                  "Status",
                  "Node class",
                  "Weight",
                  "CPU limit",
                  "Memory limit",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <div className="font-medium text-foreground">
                    This cluster does not have any node pools.
                  </div>
                  <div className="text-xs mt-1">
                    Add self managed node pools for use with Auto Mode using the
                    Kubernetes API.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* EKS node classes */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-2">
          EKS node classes{" "}
          <span className="text-muted-foreground font-normal">(0)</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          EKS node class defines the configuration for EC2 instances used by
          node pools. EKS node classes are managed by AWS, while custom node
          classes provide additional configuration options.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                {["Name", "Status", "Node IAM role"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <div className="font-medium text-foreground">
                    This cluster does not have any node classes.
                  </div>
                  <div className="text-xs mt-1">
                    Add node classes for use with Auto Mode using the Kubernetes
                    API.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Node groups */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">
            Node groups{" "}
            <span className="text-muted-foreground font-normal">
              ({CLUSTER.nodeGroups.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="outline" size="sm">
              Delete
            </Button>
            <Button variant="outline" size="sm">
              Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Node groups implement basic compute scaling through EC2 Auto Scaling
          groups.
        </p>
        <input
          type="text"
          placeholder="Filter node groups by property or value"
          className="w-full text-sm bg-muted/30 border border-border rounded px-3 py-2 mb-3"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                {[
                  "Group name",
                  "Desired size",
                  "AMI release version",
                  "Launch template",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLUSTER.nodeGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <div className="font-medium text-foreground">
                      No node groups
                    </div>
                    <div className="text-xs mt-1">
                      This cluster does not have any node groups. When cluster
                      creation is complete, you can add node groups.
                    </div>
                  </td>
                </tr>
              ) : (
                CLUSTER.nodeGroups.map((n) => (
                  <tr
                    key={n.name}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-primary">
                      {n.name}
                    </td>
                    <td className="px-4 py-3">{n.desired}</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <CheckCircle2 size={12} /> {n.status}
                      </span>
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

function NetworkingTab() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Networking</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <Field
            label="VPC"
            value={<span className="text-primary">{CLUSTER.vpcId}</span>}
          />
          <Field
            label="Cluster security group"
            value={CLUSTER.securityGroups.join(", ")}
          />
          <Field
            label="API server endpoint access"
            value={CLUSTER.clusterEndpointAccess}
          />
          <Field
            label="Cluster IP address family"
            value={
              <span className="text-primary">
                {CLUSTER.clusterIpAddressFamily}
              </span>
            }
          />
          <Field
            label="Additional security groups"
            value={
              <span className="text-primary">
                {CLUSTER.additionalSecurityGroups.join(", ")}
              </span>
            }
          />
          <Field
            label="Egress mode"
            value={<span className="text-primary">{CLUSTER.egressMode}</span>}
          />
          <Field
            label="Service IPv4 range"
            value={
              <span className="text-primary">{CLUSTER.serviceIpv4Cidr}</span>
            }
          />
          <Field
            label="Public access source allowlist"
            value={CLUSTER.publicAccessSourceAllowList.join(", ")}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Subnets</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                {["Subnet ID", "Availability Zone", "Type", "CIDR"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLUSTER.subnets.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-primary">{s.id}</td>
                  <td className="px-4 py-3">{s.az}</td>
                  <td className="px-4 py-3 capitalize">{s.type}</td>
                  <td className="px-4 py-3 font-mono">{s.cidr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TagsTab() {
  const tags = Object.entries(CLUSTER.tags);
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-4">Tags ({tags.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="px-4 py-2 text-left font-medium">Key</th>
              <th className="px-4 py-2 text-left font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {tags.map(([k, v]) => (
              <tr key={k} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3 font-mono">{k}</td>
                <td className="px-4 py-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EksDetails;
