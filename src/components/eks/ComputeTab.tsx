import { EksTable, EMPTY_VALUE, StatusText, type EksTableColumn } from "./eksShared";
import { findCondition, isConditionReady } from "./eksUtils";
import type {
  EksClusterDetail,
  EksNode,
  EksNodeClass,
  EksNodeGroup,
  EksNodePool,
} from "./eksTypes";

const NODE_COLUMNS: EksTableColumn<EksNode>[] = [
  { header: "Node name", mono: true, cell: (n) => n.node_name ?? EMPTY_VALUE },
  { header: "Instance type", cell: (n) => n.instance_type ?? EMPTY_VALUE },
  { header: "Compute", cell: (n) => n.compute_type ?? EMPTY_VALUE },
  { header: "Managed by", cell: (n) => n.managed_by ?? EMPTY_VALUE },
  { header: "Status", cell: (n) => <StatusText status={n.status} /> },
];

function ConditionStatus({ ready, reason }: { ready: boolean; reason?: string }) {
  if (ready) return <StatusText status="Ready" />;
  return <span className="text-muted-foreground">{reason ?? EMPTY_VALUE}</span>;
}

const NODE_POOL_COLUMNS: EksTableColumn<EksNodePool>[] = [
  { header: "Name", mono: true, cell: (p) => p.metadata?.name ?? EMPTY_VALUE },
  { header: "Type", cell: () => "Built-in" },
  {
    header: "Status",
    cell: (p) => {
      const condition = findCondition(p.status?.conditions, "Ready");
      return (
        <ConditionStatus ready={isConditionReady(condition)} reason={condition?.reason} />
      );
    },
  },
  {
    header: "Node class",
    cell: (p) => p.spec?.template?.spec?.nodeClassRef?.name ?? EMPTY_VALUE,
  },
  { header: "Weight", muted: true, cell: () => EMPTY_VALUE },
  { header: "CPU limit", muted: true, cell: (p) => p.status?.resources?.cpu ?? EMPTY_VALUE },
  {
    header: "Memory limit",
    muted: true,
    cell: (p) => p.status?.resources?.memory ?? EMPTY_VALUE,
  },
];

const NODE_CLASS_COLUMNS: EksTableColumn<EksNodeClass>[] = [
  { header: "Name", mono: true, cell: (nc) => nc.metadata?.name ?? EMPTY_VALUE },
  {
    header: "Status",
    cell: (nc) => {
      const condition = findCondition(nc.status?.conditions, "Ready");
      return (
        <ConditionStatus ready={isConditionReady(condition)} reason={condition?.reason} />
      );
    },
  },
  { header: "Node IAM role", muted: true, cell: (nc) => nc.spec?.role ?? EMPTY_VALUE },
];

const NODE_GROUP_COLUMNS: EksTableColumn<EksNodeGroup>[] = [
  { header: "Group name", mono: true, cell: (g) => g.name ?? EMPTY_VALUE },
  { header: "Desired size", cell: (g) => g.desired ?? EMPTY_VALUE },
  { header: "AMI release version", muted: true, cell: () => EMPTY_VALUE },
  { header: "Launch template", muted: true, cell: () => EMPTY_VALUE },
  { header: "Status", cell: (g) => <StatusText status={g.status} /> },
];

function SectionCard({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-2">
        {title}{" "}
        <span className="text-muted-foreground font-normal">({count})</span>
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}
      {children}
    </div>
  );
}

export function ComputeTab({ cluster }: { cluster: EksClusterDetail | null }) {
  const nodes = cluster?.nodes ?? [];
  const nodeGroups = cluster?.node_groups ?? [];
  const nodePools = cluster?.node_pools ?? [];
  const nodeClasses = cluster?.node_classes ?? [];

  return (
    <div className="space-y-4">
      <SectionCard title="Nodes" count={nodes.length}>
        <EksTable
          columns={NODE_COLUMNS}
          rows={nodes}
          rowKey={(node, index) => node.node_name ?? `node-${index}`}
          emptyTitle="No Nodes"
          emptyDescription="This cluster does not have any Nodes, or you don't have permission to view them."
        />
      </SectionCard>

      <div>
        <h2 className="text-base font-semibold">Node configuration</h2>
        <p className="text-xs text-muted-foreground">
          View and manage the sources of your nodes.
        </p>
      </div>

      <SectionCard
        title="Node pools"
        count={nodePools.length}
        description="Node pools define compute capacity for your Auto Mode cluster. Built-in node pools are managed by AWS, while custom node pools provide additional configuration options."
      >
        <EksTable
          columns={NODE_POOL_COLUMNS}
          rows={nodePools}
          rowKey={(pool, index) => pool.metadata?.name ?? `node-pool-${index}`}
          emptyTitle="This cluster does not have any node pools."
          emptyDescription="Add self managed node pools for use with Auto Mode using the Kubernetes API."
        />
      </SectionCard>

      <SectionCard
        title="EKS node classes"
        count={nodeClasses.length}
        description="EKS node class defines the configuration for EC2 instances used by node pools. EKS node classes are managed by AWS, while custom node classes provide additional configuration options."
      >
        <EksTable
          columns={NODE_CLASS_COLUMNS}
          rows={nodeClasses}
          rowKey={(nodeClass, index) => nodeClass.metadata?.name ?? `node-class-${index}`}
          emptyTitle="This cluster does not have any node classes."
          emptyDescription="Add node classes for use with Auto Mode using the Kubernetes API."
        />
      </SectionCard>

      <SectionCard
        title="Node groups"
        count={nodeGroups.length}
        description="Node groups implement basic compute scaling through EC2 Auto Scaling groups."
      >
        <EksTable
          columns={NODE_GROUP_COLUMNS}
          rows={nodeGroups}
          rowKey={(group, index) => group.name ?? `node-group-${index}`}
          emptyTitle="No node groups"
          emptyDescription="This cluster does not have any node groups. When cluster creation is complete, you can add node groups."
        />
      </SectionCard>
    </div>
  );
}