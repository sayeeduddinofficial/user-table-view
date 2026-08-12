/**
 * LbNetworkMappingSection.tsx
 * "Network Mapping" section of the Load Balancer create flow:
 * VPC selection, IPv6 source NAT (NLB dualstack) and Availability Zone/subnet mapping.
 */

import { XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AzItem, SubnetItem, VpcItem } from "@/services/lbApi";
import { Field, Section } from "../lbCreateShared";

interface LbNetworkMappingSectionProps {
  isAlb: boolean;
  vpc: string;
  setVpc: (value: string) => void;
  filteredVpcList: VpcItem[];
  loadingRegion: boolean;
  submitted: boolean;
  vpcError: boolean;
  ipType: string;
  ipv6SourceNat: "off" | "on";
  setIpv6SourceNat: (value: "off" | "on") => void;
  allAzs: AzItem[];
  azs: string[];
  toggleAz: (az: string) => void;
  azSubnets: Record<string, { subnet: string; ipv4: string; eip?: string }>;
  getAzSubnetEntry: (entry?: { subnet?: string; ipv4?: string; eip?: string }) => { subnet: string; ipv4: string; eip?: string };
  updateAzSubnet: (az: string, changes: Partial<{ subnet: string; ipv4: string; eip?: string }>) => void;
  subnetMap: Record<string, SubnetItem[]>;
  subnetError: boolean;
}

export function LbNetworkMappingSection({
  isAlb,
  vpc,
  setVpc,
  filteredVpcList,
  loadingRegion,
  submitted,
  vpcError,
  ipType,
  ipv6SourceNat,
  setIpv6SourceNat,
  allAzs,
  azs,
  toggleAz,
  azSubnets,
  getAzSubnetEntry,
  updateAzSubnet,
  subnetMap,
  subnetError,
}: LbNetworkMappingSectionProps) {
  return (
    <Section id="network-mapping" title="Network Mapping">
      <Field label="VPC">
        <div className="flex gap-2 md:gap-2">
          <div className="flex-1">
            <Select
              value={vpc || undefined}
              onValueChange={(value) => setVpc(value)}
              disabled={loadingRegion}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingRegion ? "Loading VPCs..." : "Select a VPC"} />
              </SelectTrigger>
              <SelectContent>
                {filteredVpcList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.id} ({v.name}) — {v.cidr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {submitted && vpcError && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
            <XCircle size={12} /> VPC is required.
          </p>
        )}
        {!isAlb && ipType === "dualstack" && (
          <Field label="Enable prefix for IPv6 source NAT">
            <p className="text-xs text-muted-foreground mb-3">
              Allows NLB to translate IPv4 traffic to IPv6 using a /80 IPv6 prefix
              from each subnet. Required when load balancing IPv4 targets behind an
              IPv6 listener.
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {[
                {
                  value: "off",
                  title: "Off (no source NAT)",
                  bullets: [
                    "No source NAT will occur.",
                    "IPv6 listener cannot route to IPv4 targets.",
                    "No IPv6 UDP load balancer support.",
                  ],
                },
                {
                  value: "on",
                  title: "On (source NAT prefixes per subnet)",
                  bullets: [
                    "Assigns a /80 IPv6 source NAT prefix per subnet.",
                    "Allows IPv6 listeners to route to IPv4 targets.",
                    "Required for IPv6 UDP load balancing scenarios.",
                  ],
                },
              ].map((opt) => {
                const selected = ipv6SourceNat === opt.value;

                return (
                  <label
                    key={opt.value}
                    className={`
                        relative cursor-pointer rounded-lg border p-4 transition-all
                        ${selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }
                      `}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={selected}
                        onChange={() =>
                          setIpv6SourceNat(opt.value as "off" | "on")
                        }
                        className="mt-1 accent-primary"
                      />

                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {opt.title}
                        </div>

                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {opt.bullets.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {ipv6SourceNat === "on" && (
              <div className="mt-3 rounded-md border border-border bg-card/40 p-3 text-xs text-muted-foreground">
                A /80 IPv6 source NAT prefix will be allocated per subnet you select
                below. You can override the auto-assigned prefix in the subnet mapping
                panel after picking subnets.
              </div>
            )}
          </Field>
        )}
      </Field>

      <Field label="Availability Zones and Subnets">
        <div className="space-y-2">
          {loadingRegion && <p className="text-xs text-muted-foreground">Loading availability zones...</p>}
          {!loadingRegion && allAzs.length === 0 && <p className="text-xs text-muted-foreground">Select a region to load availability zones.</p>}
          {allAzs.map((az) => {
            const k = az.name;
            const checked = azs.includes(k);
            const detail = getAzSubnetEntry(azSubnets[k]);
            const subnetsForAz = subnetMap[k] ?? [];
            return (
              <div key={k} className="border border-border/60 rounded-md">
                <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2">
                  <input type="checkbox" checked={checked} onChange={() => toggleAz(k)} className="accent-primary" />
                  <span>{az.name} ({az.zoneId})</span>
                </label>
                {checked && (
                  <div className={`px-3 pb-3 pl-9 border-t border-border/60 pt-3 ${isAlb ? "" : "space-y-3"}`}>
                    <div>
                      <div className="text-xs font-medium mb-1">Subnet</div>
                      <Select
                        value={detail.subnet || undefined}
                        onValueChange={(value) => updateAzSubnet(k, { subnet: value })}
                        disabled={!vpc}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={!vpc ? "Select a VPC" : "Select a subnet"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subnetsForAz.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.id} ({s.name}) — {s.cidr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!isAlb && (
                      <div>
                        <div className="text-sm">IPv4 Address</div>
                        <div className="text-xs text-muted-foreground mb-2">The front-end IPv4 address of the load balancer in the selected Availability Zone.</div>
                        <div className="space-y-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {submitted && subnetError && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <XCircle size={12} /> {azs.length < 2 ? "Select at least 2 Availability Zones." : "Each selected Availability Zone must have a subnet chosen."}
            </p>
          )}
        </div>
      </Field>
    </Section>
  );
}
