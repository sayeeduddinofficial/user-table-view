import { CheckCircle2 } from "lucide-react";
import { CLUSTER } from "./eksData";

export function ComputeTab() {
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
            {/* <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="outline" size="sm">
              Delete
            </Button>
            <Button variant="outline" size="sm">
              Add
            </Button> */}
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
