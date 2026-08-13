import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { PendingTarget } from "./targetGroup.types";

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{value}</p>
    </div>
  );
}

type Props = {
  name: string;
  targetTypeLabel: string;
  protocol: string;
  port: string;
  showProtocolVersion: boolean;
  protocolVersion: string;
  vpcLabel: string;
  ipAddressType: "ipv4" | "ipv6";
  healthCheckProtocol: string;
  showHealthCheckPath: boolean;
  healthCheckPath: string;
  pendingTargets: PendingTarget[];
  isCreating: boolean;
  onCancel: () => void;
  onPrevious: () => void;
  onEditSettings: () => void;
  onEditTargets: () => void;
  onCreate: () => void;
};

const TARGET_COLUMNS: Column<PendingTarget>[] = [
  { key: "instanceId", header: "Instance ID" },
  { key: "name", header: "Name" },
  { key: "port", header: "Port" },
  { key: "zone", header: "Zone" },
];

export function ReviewAndCreateStep({
  name,
  targetTypeLabel,
  protocol,
  port,
  showProtocolVersion,
  protocolVersion,
  vpcLabel,
  ipAddressType,
  healthCheckProtocol,
  showHealthCheckPath,
  healthCheckPath,
  pendingTargets,
  onCancel,
  onPrevious,
  onEditSettings,
  onEditTargets,
  onCreate,
  isCreating = false
}: Props) {

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Review and create</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
          Review your target group configuration before creating
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Step 1: Target group details</h2>
        <Button variant="outline" size="sm" onClick={onEditSettings}>
          Edit
        </Button>
      </div>

      <section className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Target group details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailField label="Name" value={name || "—"} />
          <DetailField label="Target type" value={targetTypeLabel} />
          <DetailField label="Protocol : Port" value={`${protocol} : ${port}`} />
          {showProtocolVersion && <DetailField label="Protocol version" value={protocolVersion} />}
          <DetailField label="VPC" value={vpcLabel} />
          <DetailField label="IP address type" value={ipAddressType === "ipv4" ? "IPv4" : "IPv6"} />
        </div>
      </section>

      <section className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Health check details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailField label="Health check protocol" value={healthCheckProtocol} />
          {showHealthCheckPath && <DetailField label="Health check path" value={healthCheckPath} />}
          <DetailField label="Health check port" value="traffic-port" />
          <DetailField label="Interval" value="30 seconds" />
          <DetailField label="Timeout" value="5 seconds" />
          <DetailField label="Healthy threshold" value="5" />
          <DetailField label="Unhealthy threshold" value="2" />
          <DetailField label="Success codes" value="200" />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Step 2: Register targets</h2>
        <Button variant="outline" size="sm" onClick={onEditTargets}>
          Edit
        </Button>
      </div>

      <section className="glass-panel rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Targets <span className="text-muted-foreground font-normal">({pendingTargets.length})</span>
          </h3>
        </div>
        <DataTable
          columns={TARGET_COLUMNS}
          data={pendingTargets}
          emptyMessage="No targets added"
          rowKey={(t) => t.id}
        />
      </section>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={onCreate} disabled={isCreating} className="min-w-[160px]">
          {isCreating ? "Creating..." : "Create target group"}
        </Button>
      </div>
    </>
  );
}