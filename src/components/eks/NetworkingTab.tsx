import { EMPTY_VALUE, InfoLabel } from "./eksShared";
import type { EksClusterDetail } from "./eksTypes";

const OPEN_TO_ALL_CIDR = "0.0.0.0/0";

function ValueList({ values }: { values: string[] }) {
  if (values.length === 0) return <div>{EMPTY_VALUE}</div>;

  return (
    <ul className="space-y-1">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

export function NetworkingTab({ cluster }: { cluster: EksClusterDetail | null }) {
  const subnets = cluster?.subnet_ids ?? [];
  const securityGroups = cluster?.cluster_security_group_id
    ? [cluster.cluster_security_group_id]
    : [];
  const additionalSecurityGroups = cluster?.additional_security_group_ids ?? [];
  const publicCidrs = cluster?.public_access_cidrs ?? [];
  const isOpenToAllTraffic = publicCidrs.includes(OPEN_TO_ALL_CIDR);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">Networking</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6 text-sm">
        <div className="space-y-5">
          <div>
            <InfoLabel>VPC</InfoLabel>
            <div>{cluster?.vpc_id ?? EMPTY_VALUE}</div>
          </div>
          <div>
            <InfoLabel>Cluster IP address family</InfoLabel>
            <div>{cluster?.cluster_ip_family ?? EMPTY_VALUE}</div>
          </div>
          <div>
            <InfoLabel>Service IPv4 range</InfoLabel>
            <div>{cluster?.service_ipv4_cidr ?? EMPTY_VALUE}</div>
          </div>
        </div>

        <div>
          <InfoLabel>Subnets</InfoLabel>
          <ValueList values={subnets} />
        </div>

        <div className="space-y-5">
          <div>
            <InfoLabel>Cluster security group</InfoLabel>
            <ValueList values={securityGroups} />
          </div>
          <div>
            <InfoLabel>Additional security groups</InfoLabel>
            <ValueList values={additionalSecurityGroups} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <InfoLabel>API server endpoint access</InfoLabel>
            <div>Public and private</div>
          </div>
          <div>
            <InfoLabel>Egress mode</InfoLabel>
            <div>{cluster?.egress_mode ?? EMPTY_VALUE}</div>
          </div>
          <div>
            <InfoLabel>Public access source allowlist</InfoLabel>
            <div>
              {publicCidrs.length > 0 ? publicCidrs.join(", ") : EMPTY_VALUE}
              {isOpenToAllTraffic && (
                <span className="text-muted-foreground"> (open to all traffic)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}