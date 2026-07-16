import { CLUSTER } from "./eksData";

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm font-semibold text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export function NetworkingTab() {
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
            <a
              href={`/aws/vpcs/${CLUSTER.vpcId}`}
              className="inline-flex items-center gap-1 text-primary hover:underline break-all"
            >
              <span>{CLUSTER.vpcId}</span>
              {/* <ExternalLink size={11} className="shrink-0" /> */}
            </a>
          </div>
          <div>
            <InfoLabel>Cluster IP address family</InfoLabel>
            <div>{CLUSTER.clusterIpAddressFamily}</div>
          </div>
          <div>
            <InfoLabel>Service IPv4 range</InfoLabel>
            <div>{CLUSTER.serviceIpv4Cidr}</div>
          </div>
        </div>

        {/* Column 2: Subnets */}
        <div>
          <InfoLabel>Subnets</InfoLabel>
          <ul className="space-y-1">
            {CLUSTER.subnets.map((s) => (
              <li key={s.id}>{s.id}</li>
            ))}
          </ul>
        </div>

        {/* Column 3 */}
        <div className="space-y-5">
          <div>
            <InfoLabel>Cluster security group</InfoLabel>
            <ul className="space-y-1">
              {CLUSTER.securityGroups.map((sg) => (
                <li key={sg}>
                  <span>{sg}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <InfoLabel>Additional security groups</InfoLabel>
            <ul className="space-y-1">
              {CLUSTER.additionalSecurityGroups.map((sg) => (
                <li key={sg}>
                  <span>{sg}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 4 */}
        <div className="space-y-5">
          <div>
            <InfoLabel>API server endpoint access</InfoLabel>
            <div>{CLUSTER.clusterEndpointAccess}</div>
          </div>
          <div>
            <InfoLabel>Egress mode</InfoLabel>
            <div>{CLUSTER.egressMode}</div>
          </div>
          <div>
            <InfoLabel>Public access source allowlist</InfoLabel>
            <div>
              {CLUSTER.publicAccessSourceAllowList.join(", ")}{" "}
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
