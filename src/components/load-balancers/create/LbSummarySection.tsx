/**
 * LbSummarySection.tsx
 * "Review" summary section of the Load Balancer create flow.
 */

import type { ListenerConfig } from "../lbCreate.types";
import { Section, SumCol } from "../lbCreateShared";

interface LbSummarySectionProps {
  name: string;
  scheme: "internet-facing" | "internal";
  ipType: string;
  vpc: string;
  azs: string[];
  sgs: string[];
  primaryListener: ListenerConfig;
  listeners: ListenerConfig[];
  scrollToSection: (id: string, focusName?: boolean) => void;
}

export function LbSummarySection({
  name,
  scheme,
  ipType,
  vpc,
  azs,
  sgs,
  primaryListener,
  listeners,
  scrollToSection,
}: LbSummarySectionProps) {
  return (
    <Section id="review" title="Review">
      <p className="text-xs text-muted-foreground mb-4">
        Review the load balancer configurations and make changes if needed. After you finish reviewing the configurations, choose <span className="font-medium text-foreground">Create load balancer</span>.
      </p>
      <div className="border border-border rounded-md p-4 bg-card/40">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold">Summary</div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Review and confirm your configurations.
        </p>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <SumCol title="Basic configuration" editable onEdit={() => scrollToSection("basic-configuration", true)}>
            <div>Name: <a className="text-primary">{name || "—"}</a></div>
            <div>Scheme: {scheme}</div>
            <div>IP address type: {ipType}</div>
          </SumCol>
          <SumCol title="Network mapping" editable onEdit={() => scrollToSection("network-mapping")}>
            <div>VPC: <span className="text-primary">{vpc.split(" ")[0]}</span></div>
            <div>Public IPv4 IPAM pool: -</div>
            <div>Availability Zones and subnets: {azs.length ? azs.join(", ") : "-"}</div>
          </SumCol>
          <SumCol title="Security groups" editable onEdit={() => scrollToSection("security-groups")}>
            {sgs.map((g) => (
              <div key={g}>
                <a className="text-primary">{g.match(/sg-[a-z0-9]+/)?.[0] ?? "sg-xxxxx"}</a>
              </div>
            ))}
          </SumCol>
          <SumCol title="Listeners and routing" editable onEdit={() => scrollToSection("listeners-routing")}>
            <div>{primaryListener.protocol}:{primaryListener.port} | {primaryListener.action === "forward" ? "Forward to target group" : primaryListener.action === "redirect" ? "Redirect to URL" : "Return fixed response"}</div>
            {listeners.length > 1 && <div>{listeners.length - 1} additional listener{listeners.length > 2 ? "s" : ""}</div>}
          </SumCol>
        </div>
      </div>
    </Section>
  );
}
