import type { EksClusterDetail } from "./EksDetails";

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm font-semibold text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export function NetworkingTab({ cluster }: { cluster: EksClusterDetail | null }) {
  const subnets = cluster?.subnet_ids ?? [];
const securityGroups = cluster?.cluster_security_group_id ? [cluster.cluster_security_group_id] : [];
const additionalSGs = cluster?.additional_security_group_ids ?? [];
const publicCidrs = cluster?.public_access_cidrs ?? [];


  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">Networking</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6 text-sm">
        {/* Column 1 */}
        <div className="space-y-5">
          <div>
            <InfoLabel>VPC</InfoLabel>
            <div>{cluster?.vpc_id ?? "—"}</div>
          </div>
          <div>
            <InfoLabel>Cluster IP address family</InfoLabel>
            <div>{cluster?.cluster_ip_family ?? "—"}</div>
          </div>
          <div>
            <InfoLabel>Service IPv4 range</InfoLabel>
            <div>{cluster?.service_ipv4_cidr ?? "—"}</div>
          </div>
        </div>

        {/* Column 2: Subnets */}
        <div>
          <InfoLabel>Subnets</InfoLabel>
          <ul className="space-y-1">
            {subnets.length > 0 ? subnets.map((s) => <li key={s}>{s}</li>) : "—"}
          </ul>
        </div>

        {/* Column 3 */}
        <div className="space-y-5">
          <div>
            <InfoLabel>Cluster security group</InfoLabel>
            <ul className="space-y-1">
              {securityGroups.length > 0 ? securityGroups.map((sg) => <li key={sg}>{sg}</li>) : "—"}
            </ul>
          </div>
          <div>
            <InfoLabel>Additional security groups</InfoLabel>
            <ul className="space-y-1">
              {additionalSGs.length > 0 ? additionalSGs.map((sg) => <li key={sg}>{sg}</li>) : "—"}
            </ul>
          </div>
        </div>

        {/* Column 4 */}
        <div className="space-y-5">
          <div>
            <InfoLabel>API server endpoint access</InfoLabel>
            <div>Public and private</div>
          </div>
          <div>
            <InfoLabel>Egress mode</InfoLabel>
            <div>{cluster?.egress_mode ?? "—"}</div>
          </div>
          <div>
            <InfoLabel>Public access source allowlist</InfoLabel>
            <div>
              {publicCidrs.length > 0 ? publicCidrs.join(", ") : "—"}
              <span className="text-muted-foreground">
                (open to all traffic)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
