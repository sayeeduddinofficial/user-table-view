import { Header } from "@/components/layout/Header";
import { useEffect, useRef, useState } from "react";
import { ConnectorOverlay, type Connection } from "./ConnectorOverlay";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MinusCircle,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, Link } from "react-router-dom";
import { fetchVpcDetailsApi, ApiError, type VpcDetailRaw } from "@/services/vpcService";
import { useDialog } from "@/components/ui/dialog-context";

type DetailTab = "details" | "resource" | "cidrs" | "flow" | "tags" | "integrations";

type VpcDetailsProps = {
  vpcId?: string;
  embedded?: boolean;
};

export function VpcDetails({
  vpcId: propVpcId,
  embedded = false,
}: VpcDetailsProps) {
  const { vpcId: routeVpcId } = useParams<{ vpcId: string }>();
  const vpcId = propVpcId ?? routeVpcId;

  const [detail, setDetail] = useState<VpcDetailRaw | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to "details" if embedded, otherwise default to "resource" map
  const [tab, setTab] = useState<DetailTab>(embedded ? "details" : "resource");
  const { alert } = useDialog();

  useEffect(() => {
    if (!vpcId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVpcDetailsApi(vpcId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load VPC details";
        setError(msg);        
        alert({
          title: msg,
          severity: "error",
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vpcId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading VPC details...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold">VPC not found</h1>
        <p className="text-muted-foreground mt-2">{error ?? "The VPC you're looking for doesn't exist."}</p>
      </div>
    );
  }

  // Adapt API detail shape to the existing sub-component interface.
  const vpc: any = {
    id: detail.aws_vpc_id ?? detail.request_id,
    name: detail.resource_name,
    cidr: detail.cidr_block ?? detail.metadata_json?.vpc_cidr ?? "10.0.0.0/16",
    region: detail.region,
    status: detail.status,
    ownerId: String(detail.owner_id ?? ""),
    tenancy: detail.instance_tenancy ?? detail.metadata_json?.instance_tenancy ?? "default",
    enableIpv6: detail.enable_ipv6 ?? false,
    subnets: detail.subnets ?? [],
    routeTables: detail.route_tables ?? [],
    natGateways: detail.nat_gateways ?? [],
    metadata: detail.metadata_json ?? {},
    requestId: detail.request_id,
    enableDnsHostnames: detail.enable_dns_hostnames ?? false,
    dhcpOptionsId: detail.dhcp_options_id,
    defaultRouteTableId: detail.default_route_table_id,
    mainNetworkAcl: detail.main_network_acl_id,
    vpcEncryption: detail.vpc_encryption,
  };

  const cidr = vpc.cidr as string;
  const ownerId = vpc.ownerId as string;

  // Dynamic tab routing: inject "Details" tab sequentially if embedded
  const tabs: { key: DetailTab; label: string }[] = [];
  if (embedded) {
    tabs.push({ key: "details", label: "Details" });
  }
  tabs.push(
    { key: "resource", label: "Resource map" },
    { key: "cidrs", label: "CIDRs" },
    { key: "tags", label: "Tags" },
  );

  return (
    <div className="space-y-4">
      {!embedded && (
        <Header
          title={`VPC ${vpc.name}`}
          subtitle={`Details for ${vpc.id}`}
        />
      )}
      
      <div className="space-y-4 p-6">
        {/* Breadcrumb */}
        {!embedded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/aws/vpcs" className="text-primary hover:underline">VPCs</Link>
            <ChevronRight size={14} />
            <span>{vpc.name}</span>
          </div>
        )}

        {/* Header Title Row */}
        {!embedded && (
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {vpc.id} / {vpc.name}
            </h1>
          </div>
        )}

        {/* Primary standalone page grid: hidden if embedded */}
        {!embedded && (
          <div className="bg-card border border-border rounded-lg p-5">
            <DetailsGrid vpc={vpc} cidr={cidr} ownerId={ownerId} />
          </div>
        )}

        {/* Tabs Navigation */}
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

        {/* Tab Panel Framework Content */}
        {tab === "details" && embedded && (
          <div className="bg-card border border-border rounded-lg p-5">
            <DetailsGrid vpc={vpc} cidr={cidr} ownerId={ownerId} />
          </div>
        )}
        {tab === "resource" && <ResourceMapTab vpc={vpc} />}
        {tab === "cidrs" && <CidrsTab cidr={cidr} />}
        {tab === "flow" && <FlowLogsTab vpcId={vpc.id} />}
        {tab === "tags" && <TagsTab name={vpc.name} tags={vpc.metadata?.tags ?? {}} />}
        {tab === "integrations" && <IntegrationsTab ownerId={ownerId} />}

      </div>
    </div>
  );
}

/* ---------- SHARED INTERNAL SUB-LAYOUTS ---------- */

function DetailsGrid({ vpc, cidr, ownerId }: { vpc: any; cidr: string; ownerId: string }) {

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 text-sm">
      <Field label="VPC ID" value={
        <span className="inline-flex items-center gap-1.5">
          <Copy size={12} className="text-muted-foreground cursor-pointer" onClick={() => { navigator.clipboard.writeText(vpc.id); toast.success("Copied"); }} />
          {vpc.id}
        </span>
      } />
      <Field label="Status" value={
        <span className="inline-flex items-center gap-1.5 text-success">
          <CheckCircle2 size={14} /> {vpc.status}
        </span>
      } />
      <Field label="Block Public Access" value={
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MinusCircle size={14} /> {vpc.publicAccess ?? "Off"}
        </span>
      } />
      <Field label="DNS hostnames" value={vpc.enableDnsHostnames ? "Enabled" : "Disabled"} />

      <Field label="DNS resolution" value={vpc.enableDnsResolution ? "Disabled" : "Enabled"} />
      <Field label="Tenancy" value={vpc.tenancy ?? "default"} />
      <Field label="DHCP option set" value={vpc.dhcpOptionsId ?? "–"} />
      <Field label="Main route table" value={vpc.defaultRouteTableId ?? "–"} />

      <Field label="Main network ACL" value={vpc.mainNetworkAcl ?? "–"} />
      <Field label="Default VPC" value={(vpc.meta?.isDefault ?? vpc.isDefault) ? "Yes" : "No"} />
      <Field label="IPv4 CIDR" value={cidr} />
      <Field label="IPv6 pool" value={vpc.ipv6Pool ?? "–"} />

      <Field label="IPv6 CIDR" value="–" />
      <Field label="Network Address Usage metrics" value="Disabled" />
      <Field label="Route 53 Resolver DNS Firewall rule groups" value={
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <XCircle size={14} /> Failed to load rule groups
        </span>
      } />
      <Field label="Owner ID" value={
        <span className="inline-flex items-center gap-1.5">
          <Copy size={12} className="text-muted-foreground cursor-pointer" onClick={() => { navigator.clipboard.writeText(ownerId); toast.success("Copied"); }} />
          {ownerId}
        </span>
      } />

      <Field label="Encryption control ID" value={vpc.vpcEncryption ?? "–"} />
      <Field label="Encryption control mode" value="–" />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}

function ResourceMapTab({ vpc }: { vpc: any }) {
  const rawSubnets: any[] = Array.isArray(vpc.subnets) ? vpc.subnets : [];
  const rawRouteTables: any[] = Array.isArray(vpc.routeTables) ? vpc.routeTables : [];
  const rawNats: any[] = Array.isArray(vpc.natGateways) ? vpc.natGateways : [];

  // Unique AZs, sorted for deterministic badge order
  const azs = Array.from(new Set(rawSubnets.map((s) => s.availability_zone))).sort();
  const azLetter = (az: string) => (az ? az.slice(-1).toUpperCase() : "?");

  const subnets = rawSubnets.map((s, i) => ({
    key: `subnet-${s.aws_subnet_id ?? i}`,
    az: s.availability_zone,
    badge: azLetter(s.availability_zone),
    name: `${vpc.name}-${s.subnet_type}-${s.aws_subnet_id ?? i}`,
    cidr: s.cidr,
    type: s.subnet_type as "public" | "private",
  }));

  const publicRt = rawRouteTables.find((r) => r.route_table_type === "public");
  const privateRts = rawRouteTables.filter((r) => r.route_table_type === "private");

  const routeTables = [
    ...(publicRt
      ? [{
          key: `rt-${publicRt.aws_route_table_id}`,
          id: publicRt.aws_route_table_id,
          label: `${vpc.name}-public-rt`,
          type: "public" as const,
          az: null as string | null,
        }]
      : []),
    ...privateRts.map((r, i) => ({
      key: `rt-${r.aws_route_table_id}`,
      id: r.aws_route_table_id,
      label: `${vpc.name}-private-rt-${azs[i] ?? i + 1}`,
      type: "private" as const,
      az: azs[i] ?? null,
    })),
  ];

  const nats = rawNats.map((n, i) => ({
    key: `nat-${n.aws_nat_gateway_id ?? i}`,
    id: n.aws_nat_gateway_id,
    label: `${vpc.name}-nat-${azs[i] ?? i + 1}`,
    eip: n.elastic_ip,
    az: azs[i] ?? null,
  }));

  // Optional IGW pill if any public subnet exists
  const hasPublic = subnets.some((s) => s.type === "public");

  const [showDetails, setShowDetails] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setBoxRef = (key: string) => (el: HTMLDivElement | null) => {
    boxRefs.current[key] = el;
  };

  // Build connections
  const connections: Connection[] = [];
  for (const s of subnets) {
    connections.push({ from: "vpc", to: s.key });
  }
  // Subnet -> Route table
  for (const s of subnets) {
    if (s.type === "public" && publicRt) {
      connections.push({ from: s.key, to: `rt-${publicRt.aws_route_table_id}`, keys: ["igw"] });
    } else if (s.type === "private") {
      // Map by AZ index within private subnets
      const rt = routeTables.find((r) => r.type === "private" && r.az === s.az) ?? routeTables.find((r) => r.type === "private");
      if (rt) connections.push({ from: s.key, to: rt.key, keys: nats.map((n) => n.key) });
    }
  }
  // Public RT -> IGW
  if (publicRt && hasPublic) {
    connections.push({ from: `rt-${publicRt.aws_route_table_id}`, to: "igw", keys: subnets.filter((s) => s.type === "public").map((s) => s.key) });
  }
  // Private RT -> NAT (by AZ if available, else round-robin/all-to-one)
  for (const rt of routeTables.filter((r) => r.type === "private")) {
    const nat = (rt.az && nats.find((n) => n.az === rt.az)) || nats[0];
    if (nat) connections.push({ from: rt.key, to: nat.key, keys: [rt.key] });
  }

  const relatedSubnetsFor = (key: string): string[] => {
    // Given a route table or nat key, find related subnets
    if (key.startsWith("rt-")) {
      const rt = routeTables.find((r) => r.key === key);
      if (!rt) return [];
      return subnets.filter((s) => (rt.type === "public" ? s.type === "public" : s.type === "private" && (!rt.az || s.az === rt.az))).map((s) => s.key);
    }
    if (key.startsWith("nat-")) {
      const nat = nats.find((n) => n.key === key);
      if (!nat) return [];
      return subnets.filter((s) => s.type === "private" && (!nat.az || s.az === nat.az)).map((s) => s.key);
    }
    if (key === "igw") return subnets.filter((s) => s.type === "public").map((s) => s.key);
    return [];
  };

  const isHL = (key: string): boolean => {
    if (!hovered) return false;
    if (hovered === key) return true;
    if (key === "vpc") return hovered !== "vpc";
    // Direct connection sets
    if (hovered.startsWith("subnet-")) {
      const s = subnets.find((x) => x.key === hovered);
      if (!s) return false;
      if (s.type === "public") {
        if (publicRt && key === `rt-${publicRt.aws_route_table_id}`) return true;
        if (key === "igw") return true;
      } else {
        const rt = routeTables.find((r) => r.type === "private" && r.az === s.az) ?? routeTables.find((r) => r.type === "private");
        if (rt && key === rt.key) return true;
        const nat = nats.find((n) => n.az === s.az) ?? nats[0];
        if (nat && key === nat.key) return true;
      }
    }
    if (hovered.startsWith("rt-") || hovered === "igw" || hovered.startsWith("nat-")) {
      if (relatedSubnetsFor(hovered).includes(key)) return true;
      if (hovered.startsWith("rt-")) {
        const rt = routeTables.find((r) => r.key === hovered);
        if (rt?.type === "public" && key === "igw") return true;
        if (rt?.type === "private") {
          const nat = (rt.az && nats.find((n) => n.az === rt.az)) || nats[0];
          if (nat && key === nat.key) return true;
        }
      }
      if (hovered.startsWith("nat-")) {
        const nat = nats.find((n) => n.key === hovered);
        const rt = routeTables.find((r) => r.type === "private" && r.az === nat?.az) ?? routeTables.find((r) => r.type === "private");
        if (rt && key === rt.key) return true;
      }
      if (hovered === "igw" && publicRt && key === `rt-${publicRt.aws_route_table_id}`) return true;
    }
    return false;
  };

  const netConnCount = nats.length + (hasPublic ? 1 : 0);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Resource map</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showDetails ? "bg-primary" : "bg-muted-foreground/30"}`}
            onClick={() => setShowDetails((s) => !s)}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showDetails ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </span>
          Show all details
        </label>
      </div>
      <div ref={mapRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        <ResourceColumn title="VPC" subtitle="Your AWS virtual network">
          <ResourcePill
            innerRef={setBoxRef("vpc")}
            label={vpc.name}
            highlighted={hovered === "vpc" || (!!hovered && hovered !== "vpc")}
            primary={hovered === "vpc"}
            onHover={(v) => setHovered(v ? "vpc" : null)}
            detail={showDetails ? <>
              <div className="text-[11px] text-amber-600 dark:text-amber-500">{vpc.cidr}</div>
              <div className="text-[11px] text-muted-foreground">{vpc.enableIpv6 ? "IPv6 enabled" : "No IPv6"}</div>
            </> : null}
          />
        </ResourceColumn>

        <ResourceColumn title={`Subnets (${subnets.length})`} subtitle="Subnets within this VPC">
          {azs.map((az) => (
            <div key={az} className="mb-3">
              <div className="text-[11px] font-semibold text-foreground/80 mb-1">{az}</div>
              {subnets.filter((s) => s.az === az).map((s) => (
                <ResourcePill
                  key={s.key}
                  innerRef={setBoxRef(s.key)}
                  label={s.name}
                  badge={s.badge}
                  highlighted={isHL(s.key)}
                  primary={hovered === s.key}
                  onHover={(v) => setHovered(v ? s.key : null)}
                  detail={showDetails ? <>
                    <div className="text-[11px] text-amber-600 dark:text-amber-500">{s.cidr}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{s.type}</div>
                  </> : null}
                />
              ))}
            </div>
          ))}
        </ResourceColumn>

        <ResourceColumn title={`Route tables (${routeTables.length})`} subtitle="Route network traffic to resources">
          {routeTables.map((rt) => (
            <ResourcePill
              key={rt.key}
              innerRef={setBoxRef(rt.key)}
              label={rt.label}
              highlighted={isHL(rt.key)}
              primary={hovered === rt.key}
              onHover={(v) => setHovered(v ? rt.key : null)}
              detail={showDetails ? <>
                <div className="text-[11px] text-muted-foreground capitalize">{rt.id}</div>
                <div className="text-[11px] text-muted-foreground">{rt.type}</div>
              </> : null}
            />
          ))}
        </ResourceColumn>

        <ResourceColumn title={`Network Connections (${netConnCount})`} subtitle="Connections to other networks">
          {hasPublic && (
            <ResourcePill
              innerRef={setBoxRef("igw")}
              label={`${vpc.name}-igw`}
              highlighted={isHL("igw")}
              primary={hovered === "igw"}
              onHover={(v) => setHovered(v ? "igw" : null)}
              detail={showDetails ? <>
                <div className="text-[11px] text-muted-foreground">Internet routes to {subnets.filter((s) => s.type === "public").length} public subnets</div>
              </> : null}
            />
          )}
          {nats.map((n) => (
            <ResourcePill
              key={n.key}
              innerRef={setBoxRef(n.key)}
              label={n.label}
              highlighted={isHL(n.key)}
              primary={hovered === n.key}
              onHover={(v) => setHovered(v ? n.key : null)}
              detail={showDetails ? <>
                <div className="text-[11px] text-muted-foreground">EIP {n.eip}</div>
                <div className="text-[11px] text-muted-foreground">{n.id}</div>
              </> : null}
            />
          ))}
        </ResourceColumn>

        <ConnectorOverlay
          containerRef={mapRef}
          boxRefs={boxRefs}
          hovered={hovered}
          connections={connections}
          deps={[subnets.length, routeTables.length, nats.length]}
        />
      </div>
    </div>
  );
}


function ResourceColumn({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/20 border border-border/60 rounded-md p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mb-3">{subtitle}</div>
      {children}
    </div>
  );
}

function ResourcePill({
  label,
  badge,
  detail,
  highlighted,
  primary,
  onHover,
  innerRef,
}: {
  label: string;
  badge?: string;
  detail?: React.ReactNode;
  highlighted?: boolean;
  primary?: boolean;
  onHover?: (v: boolean) => void;
  innerRef?: (el: HTMLDivElement | null) => void;
}) {
  const ring = highlighted
    ? primary
      ? "border-orange-500 bg-orange-500 text-white ring-2 ring-orange-500/40"
      : "border-orange-500 bg-card ring-2 ring-orange-500/40"
    : "border-border bg-card";
  return (
    <div className="mb-2 relative z-10">
      <div
        ref={innerRef}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        className={`rounded-md px-2.5 py-1.5 text-xs flex items-center gap-2 border transition-colors cursor-pointer ${ring}`}
      >
        {badge && (
          <span className={`h-4 w-4 shrink-0 rounded-full inline-flex items-center justify-center text-[10px] font-semibold ${primary && highlighted ? "bg-white/20 text-white" : "bg-success/15 text-success"}`}>
            {badge}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>
      {detail && <div className="mt-1 ml-0.5 space-y-0.5">{detail}</div>}
    </div>
  );
}

function CidrsTab({ cidr }: { cidr: string }) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">IPv4 CIDRs</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.info("Edit CIDRs")}>Edit CIDRs</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="px-5 py-2.5 text-left font-medium">Address family</th>
            <th className="px-5 py-2.5 text-left font-medium">CIDR</th>
            <th className="px-5 py-2.5 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border last:border-0">
            <td className="px-5 py-3">IPv4</td>
            <td className="px-5 py-3">{cidr}</td>
            <td className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 size={14} /> Associated
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FlowLogsTab({ vpcId }: { vpcId: string }) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Flow logs</h2>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-full border border-border hover:bg-accent/40" onClick={() => toast.info("Refreshed")}>
            <RefreshCw size={14} />
          </button>
          <Button variant="outline" size="sm" className="gap-1">Actions <ChevronDown size={14} /></Button>
          <Link to={`/aws/vpcs/flowlog/create?vpcId=${vpcId}`}>
            <Button size="sm" className="bg-primary text-white hover:bg-primary/90">Create flow log</Button>
          </Link>
        </div>
      </div>
      <div className="px-5 py-3 border-b border-border">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-input/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            {["Name", "Flow log ID", "Traffic type", "Destination type", "Destination name", "IAM role"].map((h) => (
              <th key={h} className="px-5 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
              No flow logs found
            </td>
          </tr>
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-1 px-5 py-2 text-muted-foreground">
        <button className="p-1 rounded hover:bg-accent/40 disabled:opacity-40" disabled><ChevronLeft size={14} /></button>
        <span className="text-xs px-1">1</span>
        <button className="p-1 rounded hover:bg-accent/40 disabled:opacity-40" disabled><ChevronRight size={14} /></button>
        <button className="p-1 rounded hover:bg-accent/40"><SettingsIcon size={14} /></button>
      </div>
    </div>
  );
}

function TagsTab({ name, tags }: { name: string; tags: Record<string, string> }) {
  const [q, setQ] = useState("");
  const entries: [string, string][] = [
    ["Name", name],
    ...Object.entries(tags ?? {}),
  ];
  const filtered = entries.filter(
    ([k, v]) => !q || k.toLowerCase().includes(q.toLowerCase()) || String(v).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Tags ({entries.length})</h2>
        <Button variant="outline" size="sm" onClick={() => toast.info("Manage tags")}>Manage tags</Button>
      </div>
      <div className="px-5 py-3 border-b border-border">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tags"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-input/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="px-5 py-2.5 text-left font-medium">Key</th>
            <th className="px-5 py-2.5 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={2} className="px-5 py-10 text-center text-sm text-muted-foreground">No tags</td>
            </tr>
          )}
          {filtered.map(([k, v]) => (
            <tr key={k} className="border-b border-border last:border-0">
              <td className="px-5 py-3">{k}</td>
              <td className="px-5 py-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function IntegrationsTab({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold">
          <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
          CloudWatch Internet Monitor (0)
        </button>
        <Button variant="outline" size="sm" onClick={() => toast.info("Learn more")}>Learn more</Button>
      </div>
      {open && (
        <>
          <p className="text-xs text-muted-foreground mt-2 ml-6">
            Add this resource to a new (or existing) monitor to help you quickly visualize internet performance and
            availability issues, and pinpoint affected locations and internet service providers.
          </p>
          <div className="mt-4 border border-destructive/40 bg-destructive/5 rounded-md px-4 py-3 flex items-start gap-2 text-xs">
            <XCircle size={14} className="text-destructive mt-0.5" />
            <span>
              User: arn:aws:iam::{ownerId}:user/splunk-dev is not authorized to perform: internetmonitor:ListMonitors
              on resource: arn:aws:internetmonitor:us-east-2:{ownerId}:monitor/* because no identity-based policy
              allows the internetmonitor:ListMonitors action
            </span>
          </div>
        </>
      )}
    </div>
  );
}