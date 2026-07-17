import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { Info, X, ChevronRight, ChevronDown, FileText, Loader2, Layers, XCircle } from "lucide-react";
import { ConnectorOverlay, type Connection } from "./ConnectorOverlay";
import { provisionVpcApi, ApiError, type CreateVpcPayload } from "@/services/vpcService";
import { setPendingVpc } from "@/utils/pendingVpc";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "../layout/Header";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { fetchVpcListApi } from "@/services/vpcService";


type ResourcesMode = "vpc-only" | "vpc-and-more";
type Ipv4Mode = "manual" | "ipam";
type Ipv6Mode = "none" | "ipam" | "amazon" | "owned";
type EncryptionMode = "none" | "monitor" | "enforce";
type NatMode = "none" | "regional" | "zonal";
type NatUpdatedMode = "in1az" | "oneperaz";
type EndpointsMode = "none" | "s3";

const REGION_AZS = {
  "US East (Ohio)": {
    azs: ["us-east-2a", "us-east-2b", "us-east-2c"],
    options: [
      { v: "use2-az1", label: "use2-az1 (us-east-2a)" },
      { v: "use2-az2", label: "use2-az2 (us-east-2b)" },
      { v: "use2-az3", label: "use2-az3 (us-east-2c)" },
    ],
  },

  "US East (N. Virginia)": {
    azs: [
      "us-east-1a",
      "us-east-1b",
      "us-east-1c",
      "us-east-1d",
      "us-east-1e",
      "us-east-1f",
    ],
    options: [
      { v: "use1-az1", label: "use1-az1 (us-east-1a)" },
      { v: "use1-az2", label: "use1-az2 (us-east-1b)" },
      { v: "use1-az3", label: "use1-az3 (us-east-1c)" },
      { v: "use1-az4", label: "use1-az4 (us-east-1d)" },
      { v: "use1-az5", label: "use1-az5 (us-east-1e)" },
      { v: "use1-az6", label: "use1-az6 (us-east-1f)" },
    ],
  },
};
const REGIONS = [
  { value: "US East (Ohio)", label: "US East (Ohio)" },
  { value: "US East (N. Virginia)", label: "US East (N. Virginia)" },
];

export function CreateVpc({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const close = () => (onClose ? onClose() : navigate("/aws/vpcs"));
  const asModal = !!onClose;
  const addVpc = useAppStore((s) => s.addVpc);
  const { alert } = useDialog();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);

  // shared
  const [region, setRegion] = useState("US East (Ohio)");

  const regionConfig = REGION_AZS[region as keyof typeof REGION_AZS];
  const AZ_OPTIONS = regionConfig.options;
  const [mode, setMode] = useState<ResourcesMode>("vpc-only");
  const [ipv4Mode, setIpv4Mode] = useState<Ipv4Mode>("manual");
  const [ipv4Cidr, setIpv4Cidr] = useState("10.0.0.0/16");
  const [ipv4IpamPool, setIpv4IpamPool] = useState("");
  const [ipv4IpamNetmask, setIpv4IpamNetmask] = useState("");
  const [ipv6Mode, setIpv6Mode] = useState<Ipv6Mode>("none");
  const [ipv6IpamPool, setIpv6IpamPool] = useState("");
  const [ipv6OwnedPool, setIpv6OwnedPool] = useState("");
  const [tenancy, setTenancy] = useState("Default");
  const [encryption, setEncryption] = useState<EncryptionMode>("none");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);
  const exclusionsRef = useRef<HTMLDivElement>(null);

  // vpc-only
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  // vpc-and-more
  const [autoGen, setAutoGen] = useState(true);
  const [autoName, setAutoName] = useState("project");
  const [encOpen, setEncOpen] = useState(false);
  const [azCount, setAzCount] = useState(2);
  const [azOpen, setAzOpen] = useState(false);
  const [azSel, setAzSel] = useState<string[]>(["use2-az1", "use2-az2", "use2-az3"]);
  const [publicCount, setPublicCount] = useState(2);
  const [privateCount, setPrivateCount] = useState(2);
  const [cidrOpen, setCidrOpen] = useState(false);
  const [nat, setNat] = useState<NatMode>("none");
  const [natUpdated, setNatUpdated] = useState<NatUpdatedMode>("in1az");
  const [endpoints, setEndpoints] = useState<EndpointsMode>("none");
  const [showPreviewToggle, setShowPreviewToggle] = useState<boolean>(false);
  const [dnsHost, setDnsHost] = useState(true);
  const [dnsRes, setDnsRes] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tags, setTags] = useState<{ key: string; value: string }[]>([]);
  const [customSubnetCidrs, setCustomSubnetCidrs] = useState<Record<string, string>>({});
  const [businessJustification, setBusinessJustification] = useState("");
  const [businessJustificationError, setBusinessJustificationError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [hasActiveVpc, setHasActiveVpc] = useState(false);
  const [existingVpcs, setExistingVpcs] = useState<Array<{ name: string; region: string }>>([]);
  const currentUser = useAppStore((s) => s.currentUser);

useEffect(() => {
  if (!currentUser) return;
  fetchVpcListApi()
    .then((list) => {
      const mine = list.filter((v) => Number(v.userId) === Number(currentUser.id));
      setHasActiveVpc(mine.length > 0);
      setExistingVpcs(list.map((v: any) => ({ name: String(v.name ?? "").trim(), region: String(v.region ?? "").trim() })));
    })
    .catch(() => {});
}, [currentUser]);


  useEffect(() => {
    setAzSel((prev) => {
      const next = [...prev];
      while (next.length < azCount) {
        next.push(`use2-az${next.length + 1}`);
      }
      return next.slice(0, azCount);
    });
  }, [azCount]);

  useEffect(() => {
    setAzSel(
      regionConfig.options
      .slice(0, azCount)
      .map((o) => {
        const match = o.label.match(/\(([^)]+)\)/);
        return match ? match[1] : o.v;
      })
    );
  }, [region, azCount]);

  useEffect(() => {
    if (!exclusionsOpen) return;
    const onDown = (e: MouseEvent) => {
      // Closes the menu if the click falls outside of any active exclusion selector wrapper
      const target = e.target as HTMLElement;
      if (!target.closest(".exclusions-dropdown-container")) {
        setExclusionsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExclusionsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [exclusionsOpen]);

  const EXCLUSION_OPTIONS = [
    "Internet gateway",
    "Egress-only internet gateway",
    "NAT gateway",
    "Virtual private gateway",
    "VPC peering",
    "Lambda",
    "VPC Lattice",
    "Elastic File System",
  ];

  const getCidrPrefix = (cidr: string) => {
    const m = cidr.trim().match(/\/(\d+)$/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  };

  const isCidrPrefixValid = (cidr: string) => {
    const n = getCidrPrefix(cidr);
    return n !== null && n >= 16 && n <= 28;
  };

  // Public subnet options restricted to 0 or total AZ pool count
  const publicOptions = useMemo(
    () => [0, azCount],
    [azCount]
  );
  // Private subnets scaled strictly as multipliers of the AZ count (0, 1x, or 2x)
  const privateOptions = useMemo(
    () => [0, azCount],
    [azCount]
  );

  // Automatically adjust subnet counts when the AZ layout environment changes
  useEffect(() => {
    setPublicCount(azCount);
    setPrivateCount(azCount);
  }, [azCount]);

  const activeAzs = azSel.map((selected) => {
    const option = AZ_OPTIONS.find((o) => o.v === selected);
    if (!option) return selected;
    const match = option.label.match(/\(([^)]+)\)/);
    return match ? match[1] : selected;
  });
  const baseName = autoGen ? autoName || "project" : autoName || "project";

  // Generate customized subnet listing sorted sequentially by AZ and type
  const subnetCidrs = useMemo(() => {
    const list: { label: string; cidr: string; kind: "public" | "private" }[] = [];
    let subnetIndex = 0;

    // First generate all requested public blocks across your active zones
    if (publicCount > 0) {
      for (let i = 0; i < azCount; i++) {
        const az = activeAzs[i];
        list.push({
          label: `Public subnet CIDR block in ${az}`,
          cidr: `10.0.${subnetIndex * 32}.0/24`,
          kind: "public"
        });
        subnetIndex++;
      }
    }

    // Next generate sequential private blocks across active zones based on multipliers
    if (privateCount > 0) {
      const loopsPerAz = privateCount / azCount;
      for (let l = 0; l < loopsPerAz; l++) {
        for (let i = 0; i < azCount; i++) {
          const az = activeAzs[i];
          list.push({
            label: `Private subnet CIDR block in ${az}`,
            cidr: `10.0.${subnetIndex * 32}.0/24`,
            kind: "private"
          });
          subnetIndex++;
        }
      }
    }
    return list;
  }, [publicCount, privateCount, azCount, activeAzs]);

  const ipv4CidrError = !isCidrPrefixValid(ipv4Cidr);

  
 const REGION_CODE: Record<string, string> = {
  "US East (Ohio)": "us-east-2",
  "US East (N. Virginia)": "us-east-1",
};

  const buildTagsObject = (): Record<string, string> => {
    const obj: Record<string, string> = {};
    for (const t of tags) {
      const k = (t.key || "").trim();
      const v = (t.value || "").trim();
      if (k) obj[k] = v;
    }
    return obj;
  };

  const buildPayload = (): CreateVpcPayload => {
    const regionCode = REGION_CODE[region] ?? "us-east-1";
    const vpcName =
      mode === "vpc-only"
        ? (name || "").trim() || `vpc-${Date.now().toString(36)}`
        : `${baseName}-vpc`;

    const base = {
      vpc_name: vpcName,
      vpc_cidr: ipv4Cidr || "10.0.0.0/16",
      region: regionCode,
      instance_tenancy: (tenancy || "default").toLowerCase(),
      enable_ipv6: ipv6Mode !== "none",
      vpc_encryption: encryption,
      enable_dns_hostnames: dnsHost,
      enable_dns_support: dnsRes,
      justification: businessJustification.trim(),
      tags: buildTagsObject(),
    };

    if (mode === "vpc-only") {
      return { vpc_resource_type: "vpc_only", ...base };
    }

    const publicCidrs: string[] = [];
    const privateCidrs: string[] = [];
    for (const s of subnetCidrs) {
      const c = customSubnetCidrs[s.label] ?? s.cidr;
      if (s.kind === "public") publicCidrs.push(c);
      else privateCidrs.push(c);
    }

    return {
      vpc_resource_type: "vpc_and_more",
      ...base,
      availability_zones: azSel.slice(0, azCount),
      public_subnet_cidrs: publicCidrs,
      private_subnet_cidrs: privateCidrs,
      nat_gateway_type: nat,
      nat_gateway_count_type: natUpdated === "in1az" ? "in_1_az" : "1_per_az",
      vpc_endpoint_type: endpoints,
    };
  };

  const NAME_REGEX = /^[A-Za-z0-9-]+$/;

  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Name is required.";
    }
    if (!NAME_REGEX.test(trimmed)) {
      return "Only letters, numbers and hyphens (-) are allowed.";
    }
    return "";
  };

  const validateBusinessJustification = (value: string) => {
    if (value.trim().length < 20) {
      return `Minimum 20 characters required (${value.trim().length}/20).`;
    }
    return "";
  };

  const validateBeforeConfirm = (): boolean => {
    let valid = true;
    // Name validation
    const currentName =
  mode === "vpc-only"
    ? name
    : autoName;

const nameValidation = validateName(currentName);

setNameError(nameValidation);

if (nameValidation) {
  valid = false;
}

// Uniqueness: VPC name must be unique within the same region (across both modes).
if (valid && !nameValidation) {
  const proposedName = (mode === "vpc-only" ? name : `${autoName}-vpc`).trim().toLowerCase();
  const regionCode = (REGION_CODE[region] ?? region).toLowerCase();
  const dup = existingVpcs.some(
    (v) => v.name.toLowerCase() === proposedName && v.region.toLowerCase() === regionCode
  );
  if (dup) {
    setNameError(`A VPC with name "${proposedName}" already exists in ${region}. Names must be unique per region.`);
    valid = false;
  }
}


    // Business Justification validation
    const justificationValidation =
      validateBusinessJustification(businessJustification);
      setBusinessJustificationError(justificationValidation);
      if (justificationValidation) {
        valid = false;
      }

    // CIDR validation
    if (!isCidrPrefixValid(ipv4Cidr)) {
      alert({
        title: "Invalid IPv4 CIDR block",
        description: "CIDR prefix must be between /16 and /28.",
        severity: "error",
      });
      valid = false;
    }
    if (mode === "vpc-and-more") {
      const err = validateName(autoName);
      setNameError(err);
      if (err) {
        return false;
      }
    }
    return valid;
  };

const create = async () => {
  if (isSubmitting) return;
  if (!validateBeforeConfirm()) return;

  const payload = buildPayload();
  try {
    setIsSubmitting(true);
    const response = await provisionVpcApi(payload);
    console.log("Provision VPC API response:", response);
    const requestId = response?.data?.requestId ?? response?.data?.request_id;

    addVpc({
      id: `vpc-${Date.now().toString(36)}`,
      name: payload.vpc_name,
      region: payload.region,
      status: "Provisioning",
      cidr: payload.vpc_cidr,
    });
    alert({
      title: "Request submitted successfully",
      description: payload.vpc_name,
      severity: "success",
    });

    if (requestId) {
      if (currentUser?.id) setPendingVpc(currentUser.id, requestId);
      setActiveRequest(requestId, "vpc-service");
      const consoleSearch = new URLSearchParams({
        request: requestId,
        service: "vpc-service",
      }).toString();
      navigate(`/console?${consoleSearch}`, { replace: true });
    } else {
      close();
    }
  } catch (err) {
     const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
      ? err.message
      : "Failed to create VPC";

  const isConflict = err instanceof ApiError && err.status === 409;

  alert({
    title: isConflict ? "VPC Already Exists" : "Failed to submit VPC request",
    description: message,
    severity: "error",
  });
    
  } finally {
    setIsSubmitting(false);
  }
};


  const DetailCard = ({
    label,
    value,
    className = "",
  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={`rounded-lg border border-slate-800 bg-slate-900 p-4 ${className}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white break-words">
        {value || "-"}
      </div>
    </div>
  );

  const selectedAzLabels = azSel
  .slice(0, azCount)
  .map((value) => {
    const option = AZ_OPTIONS.find((o) => o.v === value);
    return option ? option.label : value;
  })
  .join(", ");

  return (
    <>
      {!asModal && (
        <div>
          <Header
            title="Create VPC"
            subtitle="A VPC is an isolated portion of the AWS Cloud populated by AWS resources..."
            showSearch={false}
          />

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-6">
            <Link to="/aws/vpcs" className="hover:text-foreground">
              VPCs
            </Link>
            <ChevronRight size={14} />
            <span className="text-foreground">Create VPC</span>
          </div>
        </div>
      )}

      {/* Update the outer layout grid boundary check to depend on BOTH mode and state toggle */}
      <div
        className={
          mode === "vpc-and-more" && showPreviewToggle
            ? "max-w-[1400px] mx-auto px-6"
            : "max-w-5xl mx-auto"
        }
      >
        {/* 2-column grid wrapper (only when preview is on for vpc-and-more) */}
        <div className={(mode === "vpc-and-more" && showPreviewToggle) ? "grid grid-cols-[460px_1fr] gap-6 items-start" : ""}>
          <section className="glass-panel rounded-xl p-6">       
        
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        VPC Settings
                      </h2>
              
              {mode === "vpc-and-more" && (
                <div className="flex items-center gap-3 bg-muted/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                  <span>Show Preview</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showPreviewToggle}
                    onClick={() => setShowPreviewToggle(!showPreviewToggle)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                      showPreviewToggle
                        ? "bg-primary"
                        : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-md transition-transform duration-200 ${
                        showPreviewToggle
                          ? "translate-x-4.5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          <div className="space-y-3">
          <Label>AWS Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>

              <SelectContent>
                {REGIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          <div className="space-y-3 mt-3">
            <Field label="Resources to create" hint="Create only the VPC resource or the VPC and other networking resources." info>
              <div className="grid grid-cols-2 gap-3">
                <SelectCard
                  selected={mode === "vpc-only"}
                  onClick={() => setMode("vpc-only")}
                  label="VPC only"
                />
                <SelectCard
                  selected={mode === "vpc-and-more"}
                  onClick={() => setMode("vpc-and-more")}
                  label="VPC and more"
                />
              </div>
            </Field>
             </div>

            {mode === "vpc-only" ? (
              <VpcOnlyFields
                region={region}
                setRegion={setRegion}
                name={name}
                setName={setName}
                nameError={nameError}
                setNameError={setNameError}
                validateName={validateName}
                ipv4Mode={ipv4Mode}
                setIpv4Mode={setIpv4Mode}
                ipv4Cidr={ipv4Cidr}
                setIpv4Cidr={setIpv4Cidr}
                ipv4CidrError={ipv4CidrError}
                ipv4IpamPool={ipv4IpamPool}
                setIpv4IpamPool={setIpv4IpamPool}
                ipv4IpamNetmask={ipv4IpamNetmask}
                setIpv4IpamNetmask={setIpv4IpamNetmask}
                ipv6Mode={ipv6Mode}
                setIpv6Mode={setIpv6Mode}
                ipv6IpamPool={ipv6IpamPool}
                setIpv6IpamPool={setIpv6IpamPool}
                ipv6OwnedPool={ipv6OwnedPool}
                setIpv6OwnedPool={setIpv6OwnedPool}
                tenancy={tenancy}
                setTenancy={setTenancy}
                encryption={encryption}
                setEncryption={setEncryption}
                exclusions={exclusions}
                setExclusions={setExclusions}
                exclusionsOpen={exclusionsOpen}
                setExclusionsOpen={setExclusionsOpen}
                exclusionsRef={exclusionsRef}
                EXCLUSION_OPTIONS={EXCLUSION_OPTIONS}
              />
            ) : (
              <>
                <div className="space-y-3">
                  <Label htmlFor="auto-name">Name Tag Auto-Generation</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-generate"
                      checked={autoGen}
                      onCheckedChange={(checked) => {
  const enabled = checked === true;

  setAutoGen(enabled);

  // Clear the field whenever the mode changes
  setAutoName("");

  // Clear any existing validation message
  setNameError("");
}}
                    />
                    <Label
                      htmlFor="auto-generate"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Auto-generate
                    </Label>
                  </div>

                  <Input
  id="auto-name"
  placeholder="Enter Name tag"
  value={autoName}
  onChange={(e) => {
    const value = e.target.value;

    setAutoName(value);

    if (nameError) {
      setNameError(validateName(value));
    }
  }}
  onBlur={() => setNameError(validateName(autoName))}
  className={`bg-muted/50 ${
    nameError ? "border-red-500" : ""
  }`}
/>

                  {nameError ? (
                    <p className="text-xs text-red-500">
                      {nameError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enter a value for the Name tag. This value will be used to auto-generate
                    Name tags for all resources in the VPC.
                    </p>
                  )}                  
                </div>
               

                {/* <Field label="IPv4 CIDR block" info hint="Determine the starting IP and the size of your VPC using CIDR notation.">
                  <div className="relative">
                    <input
                      value={ipv4Cidr}
                      readOnly
                      onChange={(e) => setIpv4Cidr(e.target.value)}
                      placeholder="10.0.0.0/16"
                      className={`w-full bg-input/40 border rounded-md px-3 py-2 pr-20 text-sm font-mono ${
                        ipv4CidrError
                          ? "border-destructive focus:border-destructive"
                          : "border-border"
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {cidrSize(ipv4Cidr)} IPs
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">CIDR block size must be between /16 and /28.</div>
                  {ipv4CidrError && <div className="text-xs text-destructive mt-1">CIDR prefix must be between /16 and /28.</div>}
                </Field> */}
                <div className="space-y-3 mt-3">
                <Label htmlFor="ipv4-cidr-block">IPv4 CIDR Block</Label>

                <div className="relative">
                  <Input
                    id="ipv4-cidr-block"
                    value={ipv4Cidr}
                    readOnly
                    onChange={(e) => setIpv4Cidr(e.target.value)}
                    placeholder="10.0.0.0/16"
                    spellCheck={false}
                    className={`bg-muted/50 pr-20 font-mono ${
                      ipv4CidrError && "border-destructive focus-visible:ring-destructive"
                    }`}
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {cidrSize(ipv4Cidr)} IPs
                  </span>
                </div>

                {ipv4CidrError ? (
                  <p className="text-xs text-destructive">
                    CIDR prefix must be between /16 and /28.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Determine the starting IP and the size of your VPC using CIDR notation.
                    CIDR block size must be {" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/16</code>{" "}
                  </p>
                )}
              </div>

                {/* <Field label="IPv6 CIDR block" info>
                  <RadioRow
                    name="ipv6vm"
                    value={ipv6Mode}
                    onChange={(v) => setIpv6Mode(v as Ipv6Mode)}
                    options={[
                      { value: "none", label: "No IPv6 CIDR block" },
                      { value: "amazon", label: "Amazon-provided IPv6 CIDR block" },
                    ]}
                  />
                </Field> */}

                <div className="space-y-3 mt-3">
              <Label htmlFor="tenancy">Tenancy</Label>

              <Select value={tenancy} onValueChange={setTenancy}>
                <SelectTrigger id="tenancy" className="bg-muted/50">
                  <SelectValue placeholder="Select tenancy" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Default">Default</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Specifies the tenancy option for instances launched into this VPC.
              </p>
            </div>

                <Collapsible
                  open={encOpen}
                  setOpen={setEncOpen}
                  label="Encryption settings"
                  optional
                >
                  <RadioRow
                    name="encvm"
                    value={encryption}
                    onChange={(v) => setEncryption(v as EncryptionMode)}
                    options={[
                      { value: "none", label: "None" },
                      {
                        value: "monitor",
                        label: "Monitor mode",
                        disabled: true,
                      },
                      {
                        value: "enforce",
                        label: "Enforce mode",
                        disabled: true,
                      },
                    ]}
                  />

                  {/* Exclusions dropdown section displayed explicitly when Enforce Mode is active */}
                  {encryption === "enforce" && (
                    <div className="mt-4 pt-2 border-t border-border/40 JSON-target exclusions-dropdown-container">
                      <Field label="VPC encryption exclusions" optional info>
                        <div className="text-xs text-muted-foreground mb-2">
                          Select what you'd like to be excluded from encryption
                          requirements.
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setExclusionsOpen((o: boolean) => !o)
                            }
                            className="w-full flex items-center justify-between bg-input/40 border border-border rounded-md px-3 py-2 text-sm text-left"
                          >
                            <span
                              className={
                                exclusions.length === 0
                                  ? "italic text-muted-foreground"
                                  : ""
                              }
                            >
                              {exclusions.length === 0
                                ? "Select one or more"
                                : `${exclusions.length} selected`}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              ▼
                            </span>
                          </button>

                          {exclusionsOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-auto">
                              <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/30 border-b border-border font-medium">
                                <input
                                  type="checkbox"
                                  checked={
                                    exclusions.length ===
                                    EXCLUSION_OPTIONS.length
                                  }
                                  ref={(el: HTMLInputElement | null) => {
                                    if (el)
                                      el.indeterminate =
                                        exclusions.length > 0 &&
                                        exclusions.length <
                                          EXCLUSION_OPTIONS.length;
                                  }}
                                  onChange={() =>
                                    setExclusions(
                                      exclusions.length ===
                                        EXCLUSION_OPTIONS.length
                                        ? []
                                        : [...EXCLUSION_OPTIONS],
                                    )
                                  }
                                  className="h-4 w-4 accent-primary rounded"
                                />
                                Select all
                              </label>
                              {EXCLUSION_OPTIONS.map((opt: string) => {
                                const checked = exclusions.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/30"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        setExclusions(
                                          checked
                                            ? exclusions.filter(
                                                (x: string) => x !== opt,
                                              )
                                            : [...exclusions, opt],
                                        )
                                      }
                                      className="h-4 w-4 accent-primary rounded"
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Badges container for displaying selections below the selection field */}
                        {exclusions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {exclusions.map((opt: string) => (
                              <span
                                key={opt}
                                className="inline-flex items-center gap-2 bg-primary/5 border border-primary/40 text-primary rounded-md px-2 py-1 text-xs font-medium"
                              >
                                {opt}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExclusions(
                                      exclusions.filter(
                                        (x: string) => x !== opt,
                                      ),
                                    )
                                  }
                                  className="hover:text-destructive text-muted-foreground transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </Field>
                    </div>
                  )}
                </Collapsible>

                <Divider />

                <Field
                  label="Number of Availability Zones (AZs)"
                  info
                  hint="Choose the number of AZs in which to provision subnets. We recommend at least two AZs for high availability."
                >
                  <Segmented
                    value={azCount}
                    options={[1, 2, 3]}
                    onChange={setAzCount}
                  />
                </Field>

                <Collapsible
                  open={azOpen}
                  setOpen={setAzOpen}
                  label="Customize AZs"
                >
                  {Array.from({ length: azCount }).map((_, i) => (
                    <div className="mb-3" key={i}>
                      <div className="text-sm font-medium mb-1">
                        {["First", "Second", "Third"][i]} availability zone
                      </div>
                      <select
                        value={azSel[i]}
                        onChange={(e) => {
                          const next = [...azSel];
                          next[i] = e.target.value;
                          setAzSel(next);
                        }}
                        className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                      >
                        {AZ_OPTIONS.map((o) => {
                          const match = o.label.match(/\(([^)]+)\)/);
                          const awsAz = match ? match[1] : o.v;

                          return (
                            <option key={o.v} value={awsAz}>
                              {o.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </Collapsible>

                <Field
                  label="Number of public subnets"
                  info
                  hint="The number of public subnets to add to your VPC. Use public subnets for web applications that need to be publicly accessible over the internet."
                >
                  <Segmented
                    value={publicCount}
                    options={publicOptions}
                    onChange={setPublicCount}
                  />
                </Field>

                <Field
                  label="Number of private subnets"
                  info
                  hint="The number of private subnets to add to your VPC. Use private subnets to secure backend resources that don't need public access."
                >
                  <Segmented
                    value={privateCount}
                    options={privateOptions}
                    onChange={setPrivateCount}
                  />
                </Field>

                {/* Only display the subnets customizer if there's at least one subnet to configure */}
                {(publicCount > 0 || privateCount > 0) && (
                  <Collapsible
                    open={cidrOpen}
                    setOpen={setCidrOpen}
                    label="Customize subnets CIDR blocks"
                  >
                    {subnetCidrs.map((s, i) => {
                      const value = customSubnetCidrs[s.label] ?? s.cidr;
                      const error = !isCidrPrefixValid(value);
                      return (
                        // <div className="mb-3" key={i}>
                        //   <div className="text-sm font-medium mb-1">{s.label}</div>
                        //   <div className="relative">
                        //     <input
                        //       value={value}
                        //       readOnly
                        //       onChange={(e) => setCustomSubnetCidrs((prev) => ({ ...prev, [s.label]: e.target.value }))}
                        //       className={`w-full bg-input/40 border rounded-md px-3 py-2 pr-16 text-sm font-mono ${
                        //         error ? "border-destructive focus:border-destructive" : "border-border"
                        //       }`}
                        //     />
                        //     <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{cidrSize(value)} IPs</span>
                        //   </div>
                        //   {error && <div className="text-xs text-destructive mt-1">CIDR prefix must be between /16 and /28.</div>}
                        // </div>
                        <div className="space-y-3 mb-4" key={i}>
                        <Label htmlFor={`subnet-${i}`}>{s.label}</Label>

                        <div className="relative">
                          <Input
                            id={`subnet-${i}`}
                            value={value}
                            readOnly
                            onChange={(e) =>
                              setCustomSubnetCidrs((prev) => ({
                                ...prev,
                                [s.label]: e.target.value,
                              }))
                            }
                            spellCheck={false}
                            className={`bg-muted/50 pr-16 font-mono ${
                              error && "border-destructive focus-visible:ring-destructive"
                            }`}
                          />

                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {cidrSize(value)} IPs
                          </span>
                        </div>

                        {error ? (
                          <p className="text-xs text-destructive">
                            CIDR prefix must be between /16 and /28.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Configure the CIDR block for this subnet.
                          </p>
                        )}
                      </div>
                      );
                    })}
                  </Collapsible>
                )}

                <Divider />

                <Field
                  label="NAT gateways ($) - updated"
                  info
                  hint="NAT gateway allows private resources to access the internet..."
                >
                  <Segmented<NatMode>
                    value={nat}
                    options={["none", "zonal"]}
                    labels={{ none: "None", zonal: "Zonal" }}
                    onChange={setNat}
                  />
                  <div className="mt-3 bg-primary/5 border border-primary/30 rounded-md p-3 text-xs relative">
                    <div className="font-medium flex items-center gap-2">
                      <Info size={14} className="text-primary" /> Introducing
                      regional NAT gateway
                    </div>
                    <div className="text-muted-foreground mt-1">
                      AWS now offers a multi-AZ NAT Gateway...
                    </div>
                  </div>
                </Field>

                {nat === "zonal" && (
                  <Field
                    label="NAT gateways ($)"
                    info
                    hint="Choose the number of Availability Zones (AZs) in which to create NAT gateways. Note that there is a charge for each NAT gateway"
                  >
                    <Segmented<NatUpdatedMode>
                      value={natUpdated}
                      options={["in1az", "oneperaz"]}
                      labels={{ in1az: "In 1 AZ", oneperaz: "1 per AZ" }}
                      onChange={setNatUpdated}
                    />
                  </Field>
                )}

                <Field
                  label="VPC endpoints"
                  info
                  hint="Endpoints can help reduce NAT gateway charges and improve security by accessing S3 directly from the VPC. By default, full access policy is used. You can customize this policy at any time."
                >
                  <Segmented<EndpointsMode>
                    value={endpoints}
                    options={["none", "s3"]}
                    labels={{ none: "None", s3: "S3 Gateway" }}
                    disabledOptions={["s3"]} // <-- This keeps S3 visible but unclickable
                    onChange={setEndpoints}
                  />
                </Field>

                <Field label="DNS options" info>
                  <label className="flex items-center gap-2 text-sm mb-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dnsHost}
                      onChange={(e) => setDnsHost(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Enable DNS hostnames
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dnsRes}
                      onChange={(e) => setDnsRes(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Enable DNS resolution
                  </label>
                </Field>

                {/* <Collapsible open={tagsOpen} setOpen={setTagsOpen} label="Additional tags">
                  <div className="text-xs text-muted-foreground mb-3">
                    Add tags to the VPC and all resources within the VPC. Do not
                    set the Name tag here. Set the Name tag under Name tag
                    auto-generation above or directly in the visualizer.
                  </div>
                  {tags.map((t, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_40px] gap-2 mb-2"
                    >
                      <input
                        value={t.key}
                        placeholder="Key"
                        onChange={(e) =>
                          setTags(
                            tags.map((x, j) =>
                              j === i ? { ...x, key: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <input
                        value={t.value}
                        placeholder="Value"
                        onChange={(e) =>
                          setTags(
                            tags.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => setTags(tags.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive grid place-items-center border border-border rounded-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTags([...tags, { key: "", value: "" }])}
                    className="text-primary border-primary hover:bg-primary/5 rounded-full px-4"
                  >
                    Add new tag
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">You can add {50 - tags.length} more tags.</div>
                </Collapsible> */}
              </>
            )}
          </section>

          {/* New dedicated non-collapsible Tags card section exclusively for VPC-Only mode */}
          {/* {mode === "vpc-only" && (
            <section className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-1">Tags</h2>
              <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
                A tag is a label that you assign to an AWS resource. Each tag
                consists of a key and an optional value. You can use tags to
                search and filter your resources or track your AWS costs.
              </div>

              {tags.length === 0 ? (
                <div className="text-sm text-muted-foreground mb-4">
                  No tags associated with the resource
                </div>
              ) : (
                <div className="mb-4">
                  {tags.map((t, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_40px] gap-2 mb-2"
                    >
                      <input
                        value={t.key}
                        placeholder="Key"
                        onChange={(e) =>
                          setTags(
                            tags.map((x, j) =>
                              j === i ? { ...x, key: e.target.value } : x,
                            ),
                          )
                        }
                        className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <input
                        value={t.value}
                        placeholder="Value"
                        onChange={(e) =>
                          setTags(
                            tags.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                        className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => setTags(tags.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive grid place-items-center border border-border rounded-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTags([...tags, { key: "", value: "" }])}
                className="text-primary border-primary hover:bg-primary/5 rounded-full px-4"
              >
                Add tag
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                You can add {50 - tags.length} more tags.
              </div>
            </section>
          )}         */}

          {/* Right column - preview (only in 2-column mode) */}
          {mode === "vpc-and-more" && showPreviewToggle && (
            <section className="bg-card border border-border rounded-lg p-6 mb-6 sticky top-4 overflow-x-auto max-w-full pb-4">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              <PreviewPanel
                baseName={baseName}
                azs={activeAzs}
                publicCount={publicCount}
                privateCount={privateCount}
                nat={nat}
                natUpdated={natUpdated}
                autoGen={autoGen}
                mode={mode}
                endpoints={endpoints}
                ipv4Cidr={ipv4Cidr}
                subnetCidrs={subnetCidrs}
                customSubnetCidrs={customSubnetCidrs}
              />
            </section>
          )}
        </div>

        {/* Business Justification - always full width at bottom */}
        <section className="glass-panel rounded-xl p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Business Justification</h2>
        </div>

          <div className="relative">
            <Textarea
              className={`resize-none ${
                  businessJustificationError ? "border-red-500" : ""
              }`}
              placeholder="Provide a brief justification for this VPC request."
              value={businessJustification}
              onChange={(e) => {
                const value = e.target.value;
                setBusinessJustification(value);
                if (businessJustificationError) {
                  setBusinessJustificationError(
                    validateBusinessJustification(value)
                  );
                }
              }}
              onBlur={() =>
                setBusinessJustificationError(
                  validateBusinessJustification(businessJustification)
                )
              }
              rows={3}
              maxLength={250}
            />

            {businessJustificationError && (
              <div className="mt-1 text-xs text-red-500">
                Business justification must contain at least 20 characters.
              </div>
            )}

            <div className="mt-2 text-right text-xs text-slate-400">
              {businessJustification.length}/250
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pb-8 mt-4">
          <button onClick={close} className="text-sm text-primary hover:underline px-3 py-2">Cancel</button>
           <Button
            onClick={() => { if (validateBeforeConfirm()) setShowConfirm(true); }}
            disabled={
              (mode === "vpc-only"
                ? !name.trim()
                : autoGen && !autoName.trim()) ||
              businessJustification.trim().length < 20
            }
          >Create VPC</Button>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-3xl bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Confirm VPC Creation</DialogTitle>

            <DialogDescription>
              Please review the details before creating your VPC.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <DetailCard
              label="VPC Name"
              value={mode === "vpc-only" ? name : `${baseName}-vpc`}
            />
            <DetailCard label="AWS Region" value={region} />
            <DetailCard label="Tenancy" value={tenancy} />
            <DetailCard label="IPv4 CIDR" value={ipv4Cidr} />
            <DetailCard label="Resources" value={mode} />

            {mode === "vpc-and-more" && (
              <>
                <DetailCard
                  label="Availability Zones"
                  value={selectedAzLabels}
                />
                <DetailCard label="Public Subnets" value={publicCount} />
                <DetailCard label="Private Subnets" value={privateCount} />
                <DetailCard
                  label="NAT Gateway"
                  value={nat === "none" ? "Disabled" : nat}
                />
              </>
            )}

            <DetailCard
              label="DNS Resolution"
              value={dnsRes ? "Enabled" : "Disabled"}
            />
            <DetailCard
              label="DNS Hostnames"
              value={dnsHost ? "Enabled" : "Disabled"}
            />
            <DetailCard label="Encryption" value={encryption} />

            <DetailCard
              label="Business Justification"
              value={businessJustification}
              className="col-span-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Go Back & Edit
            </Button>

            <Button onClick={create} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm & Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cidrSize(cidr: string) {
  const m = cidr.match(/\/(\d+)$/);
  if (!m) return "—";
  const n = parseInt(m[1], 10);
  if (isNaN(n) || n < 0 || n > 32) return "—";
  return (2 ** (32 - n)).toLocaleString();
}

/* ---------- VPC-only sub-form (extracted to keep parent readable) ---------- */
function VpcOnlyFields(p: any) {
  const {
    name, setName, nameError, setNameError, validateName,
    ipv4Mode, setIpv4Mode, ipv4Cidr, setIpv4Cidr,ipv4CidrError,
    ipv4IpamPool, setIpv4IpamPool, ipv4IpamNetmask, setIpv4IpamNetmask,
    ipv6Mode, setIpv6Mode, ipv6IpamPool, setIpv6IpamPool,
    ipv6OwnedPool, setIpv6OwnedPool,
    tenancy, setTenancy, encryption, setEncryption,
    exclusions, setExclusions, exclusionsOpen, setExclusionsOpen, exclusionsRef,
    EXCLUSION_OPTIONS,
  } = p;
  return (
    <>
      <div className="space-y-3 mb-3">
          <Label htmlFor="name-tag">Name Tag</Label>

          <Input
            id="name-tag"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(validateName(e.target.value));
            }}
            onBlur={() => setNameError(validateName(name))}
            placeholder="my-vpc-01"
            className={`bg-muted/50 ${
              nameError ? "border-destructive" : ""
            }`}
            maxLength={80}
            spellCheck={false}
          />
          {nameError ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-500"><XCircle size={14} className="mt-0.5 shrink-0" />
              <p className="text-xs text-red-500">{nameError}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Creates a tag with a key of <code className="rounded bg-muted px-1 py-0.5 text-[11px]">Name</code> and the value you specify.
            </p>
          )}
        </div>

      <Field label="IPv4 CIDR block" info>
        <RadioRow name="ipv4" value={ipv4Mode} onChange={(v: string) => setIpv4Mode(v)}
          options={[
            { value: "manual", label: "IPv4 CIDR manual input" },
            { value: "ipam", label: "IPAM-allocated IPv4 CIDR block", disabled: true },
          ]} />
      </Field>

      {ipv4Mode === "manual" && (
        // <Field label="IPv4 CIDR" hint="CIDR block size must be between /16 and /28.">
        //   <input value={ipv4Cidr} readOnly onChange={(e) => setIpv4Cidr(e.target.value)} placeholder="10.0.0.0/24"
        //     className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm font-mono ${
        //       ipv4CidrError ? "border-destructive focus:border-destructive" : "border-border"
        //     }`} />
        //   {ipv4CidrError && (
        //     <div className="text-xs text-destructive mt-1">CIDR prefix must be between /16 and /28.</div>
        //   )}
        // </Field>
        <div className="space-y-3 mb-3">
            <Label htmlFor="ipv4-cidr">IPv4 CIDR</Label>

            <Input
              id="ipv4-cidr"
              value={ipv4Cidr}
              readOnly
              onChange={(e) => setIpv4Cidr(e.target.value)}
              placeholder="10.0.0.0/24"
              className={`bg-muted/50 font-mono ${
                ipv4CidrError && "border-destructive focus-visible:ring-destructive"
              }`}
              spellCheck={false}
            />

            {ipv4CidrError ? (
              <p className="text-xs text-destructive">
                CIDR prefix must be between /16 and /28.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                CIDR block size must be <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/16</code>
              </p>
            )}
          </div>
      )}

      {ipv4Mode === "ipam" && (
        <>
          <Field label="IPAM pool" info hint="Choose an IPv4 IPAM pool from which to allocate this VPC's CIDR.">
            <select value={ipv4IpamPool} onChange={(e) => setIpv4IpamPool(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Select an IPAM pool</option>
              <option value="ipam-pool-0a1b2c3d">ipam-pool-0a1b2c3d (10.0.0.0/8)</option>
              <option value="ipam-pool-1e2f3g4h">ipam-pool-1e2f3g4h (172.16.0.0/12)</option>
            </select>
          </Field>
          <Field label="Netmask length" info>
            <select value={ipv4IpamNetmask} onChange={(e) => setIpv4IpamNetmask(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Select a netmask length</option>
              {Array.from({ length: 13 }, (_, i) => 16 + i).map((n) => (
                <option key={n} value={`/${n}`}>{`/${n}`}</option>
              ))}
            </select>
          </Field>
        </>
      )}

      <Field label="IPv6 CIDR block" info>
        <RadioRow name="ipv6" value={ipv6Mode} onChange={(v: string) => setIpv6Mode(v)}
          options={[
            { value: "none", label: "No IPv6 CIDR block" },
            { value: "ipam", label: "IPAM-allocated IPv6 CIDR block", disabled: true },
            { value: "amazon", label: "Amazon-provided IPv6 CIDR block", disabled: true },
            { value: "owned", label: "IPv6 CIDR owned by me", disabled: true },
          ]} />
      </Field>

      {ipv6Mode === "ipam" && (
        <>
          <Field label="IPv6 IPAM pool" info>
            <select value={ipv6IpamPool} onChange={(e) => setIpv6IpamPool(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Choose an IPAM pool</option>
              <option value="ipam-pool-ipv6-0a1b2c3d">ipam-pool-ipv6-0a1b2c3d</option>
              <option value="ipam-pool-ipv6-1e2f3g4h">ipam-pool-ipv6-1e2f3g4h</option>
            </select>
          </Field>
          <Field label="Pool CIDRs"><div className="text-sm text-muted-foreground">—</div></Field>
        </>
      )}

      {ipv6Mode === "owned" && (
        <>
          <Field label="Pool" info>
            <select value={ipv6OwnedPool} onChange={(e) => setIpv6OwnedPool(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Choose an IPv6 pool</option>
              <option value="ipv6pool-ec2-0a1b2c3d">ipv6pool-ec2-0a1b2c3d</option>
              <option value="ipv6pool-ec2-1e2f3g4h">ipv6pool-ec2-1e2f3g4h</option>
            </select>
          </Field>
          <Field label="Pool CIDRs"><div className="text-sm text-muted-foreground">—</div></Field>
        </>
      )}

      {/* <Field label="Tenancy" info>
        <select value={tenancy} onChange={(e) => setTenancy(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
          <option>Default</option>
        </select>
      </Field> */}
      <div className="space-y-3 mb-3">
          <Label htmlFor="tenancy">Tenancy</Label>

          <Select value={tenancy} onValueChange={setTenancy}>
            <SelectTrigger id="tenancy" className="bg-muted/50">
              <SelectValue placeholder="Select Tenancy" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="Default">Default</SelectItem>
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            Specifies the tenancy option for instances launched into this VPC.
        </p>
      </div>

      <Field label="VPC encryption control ($)" info>
        <div className="text-xs text-muted-foreground mt-1 mb-2">Monitor mode provides visibility into encryption status without blocking traffic. Enforce mode prevents unencrypted traffic.</div>
        <div className="grid grid-cols-3 gap-3">
          <SelectCard selected={encryption === "none"} onClick={() => setEncryption("none")} label="None" />
          <SelectCard selected={encryption === "monitor"} onClick={() => setEncryption("monitor")} disabled label="Monitor mode"
            description="See which resources in your VPC are unencrypted but allow the creation of unencrypted resources." />
          <SelectCard selected={encryption === "enforce"} onClick={() => setEncryption("enforce")} disabled label="Enforce mode"
            description="Requires all resources, except exclusions, in your VPC to be encryption-capable and blocks creation of unencrypted resources." />
        </div>
      </Field>

      {encryption === "enforce" && (
        <Field label="VPC encryption exclusions" optional info>
          <div className="text-xs text-muted-foreground mb-2">Select what you'd like to be excluded from encryption requirements.
        </div>
          <div className="relative exclusions-dropdown-container" ref={exclusionsRef}>
            <button type="button" onClick={() => setExclusionsOpen((o: boolean) => !o)}
              className="w-full flex items-center justify-between bg-input/40 border border-border rounded-md px-3 py-2 text-sm text-left">
              <span className={exclusions.length === 0 ? "italic text-muted-foreground" : ""}>
                {exclusions.length === 0 ? "Select one or more" : `${exclusions.length} selected`}
              </span>
              <span className="text-muted-foreground">▾</span>
            </button>
            {exclusionsOpen && (
              <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-auto">
                <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/30 border-b border-border font-medium">
                  <input type="checkbox"
                    checked={exclusions.length === EXCLUSION_OPTIONS.length}
                    ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = exclusions.length > 0 && exclusions.length < EXCLUSION_OPTIONS.length; }}
                    onChange={() => setExclusions(exclusions.length === EXCLUSION_OPTIONS.length ? [] : [...EXCLUSION_OPTIONS])}
                    className="h-4 w-4 accent-primary" />
                  Select all
                </label>
                {EXCLUSION_OPTIONS.map((opt: string) => {
                  const checked = exclusions.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/30">
                      <input type="checkbox" checked={checked}
                        onChange={() => setExclusions(checked ? exclusions.filter((x: string) => x !== opt) : [...exclusions, opt])}
                        className="h-4 w-4 accent-primary" />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {exclusions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {exclusions.map((opt: string) => (
                <span key={opt} className="inline-flex items-center gap-2 border border-primary/60 text-primary rounded-md px-2 py-1 text-xs">
                  {opt}
                  <button type="button" onClick={() => setExclusions(exclusions.filter((x: string) => x !== opt))} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      )}
    </>
  );
}

/* ---------- Preview panel ---------- */
function PreviewPanel({
  baseName,
  azs,
  publicCount,
  privateCount,
  nat,
  natUpdated,
  autoGen,
  mode,
  endpoints,
  ipv4Cidr,
  subnetCidrs,
  customSubnetCidrs,
}: {
  baseName: string;
  azs: string[];
  publicCount: number;
  privateCount: number;
  nat: NatMode;
  natUpdated: NatUpdatedMode;
  autoGen: boolean;
  mode: ResourcesMode;
  endpoints: EndpointsMode;
  ipv4Cidr: string;
  subnetCidrs: { label: string; cidr: string; kind: "public" | "private" }[];
  customSubnetCidrs: Record<string, string>;
}) {
  const [hoveredItem, setHoveredItem] = useState<string>("none");
  const diagramRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setBoxRef = (key: string) => (el: HTMLDivElement | null) => {
    boxRefs.current[key] = el;
  };

  const isVpcOnly = mode === "vpc-only";

  // Build a key→cidr map: order matches parent's subnetCidrs (publics first, then privates).
  const subnetCidrByKey: Record<string, string> = {};
  subnetCidrs.forEach((s, i) => {
    const value = customSubnetCidrs[s.label] ?? s.cidr;
    const key = i < publicCount ? `public-${i}` : `private-${i - publicCount}`;
    subnetCidrByKey[key] = value;
  });

  const natCount = !isVpcOnly && nat === "zonal"
    ? (natUpdated === "in1az" ? 1 : azs.length)
    : 0;

  const totalSubnets = isVpcOnly ? 0 : (publicCount + privateCount);
  const routeTablesCount = isVpcOnly ? 0 : ((publicCount > 0 ? 1 : 0) + privateCount);
  const networkConnectionsCount = isVpcOnly
    ? 1
    : (publicCount > 0 ? 1 : 0) + (endpoints === "s3" ? 1 : 0) + natCount;

  const [vpcCustomName, setVpcCustomName] = useState("");
  const [subCustomNames, setSubCustomNames] = useState<Record<string, string>>({});
  const [rtbCustomNames, setRtbCustomNames] = useState<Record<string, string>>({});
  const [netCustomNames, setNetCustomNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (autoGen) {
      setVpcCustomName("");
      setSubCustomNames({});
      setRtbCustomNames({});
      setNetCustomNames({});
    }
  }, [autoGen, baseName]);

  // Build the layout array with reliable tracking indices
  const azLayouts = isVpcOnly ? [] : azs.map((az, azIdx) => {
    const subnetsInThisAz: { kind: "public" | "private"; label: string; key: string; rtbKey: string }[] = [];
    
    if (azIdx < publicCount) {
      const defaultLabel = `${baseName}-subnet-public${azIdx + 1}`;
      const subKey = `public-${azIdx}`;
      subnetsInThisAz.push({ 
        kind: "public", 
        label: autoGen ? defaultLabel : (subCustomNames[subKey] || `Public subnet ${azIdx + 1}`),
        key: subKey,
        rtbKey: "rtb-public"
      });
    }
    
    const perAzPrivate = Math.ceil(privateCount / Math.max(1, azs.length));
    for (let p = 0; p < perAzPrivate; p++) {
      const currentPrivateIdx = azIdx + 1 + p * azs.length;
      if (currentPrivateIdx <= privateCount) {
        const defaultLabel = `${baseName}-subnet-private${currentPrivateIdx}`;
        const subKey = `private-${currentPrivateIdx - 1}`; // 0-indexed key for unique subnet identification
        subnetsInThisAz.push({ 
          kind: "private", 
          label: autoGen ? defaultLabel : (subCustomNames[subKey] || `Private subnet ${currentPrivateIdx}`),
          key: subKey,
          rtbKey: `rtb-private-${currentPrivateIdx - 1}` // Maps explicitly to 1 matching route table index
        });
      }
    }

    return { az, items: subnetsInThisAz };
  });

  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-5 overflow-x-auto select-none">
      <div className="min-w-[900px] border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-950 p-6 shadow-sm space-y-8">
        
        {/* DIAGRAM FLOW GRID AREA */}
        <div ref={diagramRef} className="grid grid-cols-[1fr_1.3fr_1.1fr_1.1fr] gap-6 items-start relative">
          
          {/* COLUMN 1: VPC RESOURCE BOX */}
          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              VPC (1)
            </div>
            <div 
              ref={setBoxRef("vpc")}
              onMouseEnter={() => setHoveredItem("all")}
              onMouseLeave={() => setHoveredItem("none")}
              className={`border-2 rounded-lg p-4 pt-7 relative shadow-sm min-h-[100px] cursor-pointer transition-all duration-200 ${
                hoveredItem !== "none"
                  ? "border-blue-500 bg-blue-50/10 dark:bg-blue-500/5 ring-4 ring-blue-500/10 opacity-100 scale-[1.01]"
                  : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="absolute top-2 left-3 text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[92%]">
                {vpcCustomName || `${baseName}-vpc`}
              </div>
              <div className="text-xs text-neutral-500 font-mono">{ipv4Cidr || "10.0.0.0/16"}</div>
            </div>
          </div>

          {/* COLUMN 2: SUBNETS */}
          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Subnets ({totalSubnets})
            </div>

            {totalSubnets === 0 ? (
              <div className="text-xs text-neutral-400 italic p-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/50">
                No subnets generated
              </div>
            ) : (
              <div className="space-y-4">
                {azLayouts.map((azBox) => {
                  if (azBox.items.length === 0) return null;
                  return (
                    <div
                      key={azBox.az}
                      className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-3 pt-6 relative bg-neutral-50 dark:bg-neutral-900/30"
                    >
                      <div className="absolute top-1.5 left-3 text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                        AZ: {azBox.az}
                      </div>
                      
                      <div className="space-y-2.5">
                        {azBox.items.map((sub, sIdx) => {
                          const isPublic = sub.kind === "public";
                          
                          // Active logic: checks if item itself or its exact matching route table pair is active
                          const isCardActive =
                            hoveredItem === "all" ||
                            hoveredItem === sub.key ||
                            hoveredItem === sub.rtbKey ||
                            (isPublic && hoveredItem === "igw") ||
                            (!isPublic && hoveredItem === "vpce") ||
                            (!isPublic && nat === "zonal" && (() => {
                              const m = sub.key.match(/^private-(\d+)$/);
                              if (!m) return false;
                              const idx = parseInt(m[1], 10);
                              const natIdx = natUpdated === "in1az" ? 0 : (idx % Math.max(1, azs.length));
                              return hoveredItem === `nat-${natIdx}`;
                            })());

                          return (
                            <div
                              key={sIdx}
                              ref={setBoxRef(sub.key)}
                              onMouseEnter={() => setHoveredItem(sub.key)}
                              onMouseLeave={() => setHoveredItem("none")}
                              className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                                isPublic
                                  ? isCardActive
                                    ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 opacity-100 scale-[1.01]"
                                    : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                                  : isCardActive
                                    ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                                    : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                              }`}
                            >
                              <div className={`absolute top-1 left-2.5 text-[9px] font-mono font-bold tracking-wide ${
                                isCardActive 
                                  ? isPublic ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                  : "text-neutral-400"
                              }`}>
                                {sub.label}
                              </div>
                              <div className="text-xs text-neutral-400 font-mono">{subnetCidrByKey[sub.key] || "10.0.X.0/24"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 3: ROUTE TABLES */}
          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Route Tables ({routeTablesCount})
            </div>

            {routeTablesCount === 0 ? (
              <div className="text-xs text-neutral-400 italic p-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/50">
                No custom route tables
              </div>
            ) : (
              <div className="space-y-3">
                {/* Public Route Table */}
                {!isVpcOnly && publicCount > 0 && (
                  <div
                    ref={setBoxRef("rtb-public")}
                    onMouseEnter={() => setHoveredItem("rtb-public")}
                    onMouseLeave={() => setHoveredItem("none")}
                    className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                      hoveredItem === "all" || hoveredItem === "rtb-public" || hoveredItem === "igw" || (hoveredItem.startsWith("public-"))
                        ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 opacity-100 scale-[1.01]"
                        : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                      {rtbCustomNames["public"] || `${baseName}-rtb-public`}
                    </div>
                    <div className="text-xs text-neutral-500 font-medium">1 local, 1 IGW route</div>
                  </div>
                )}

                {/* Private Route Tables */}
                {!isVpcOnly && Array.from({ length: privateCount }).map((_, i) => {
                  const currentRtbKey = `rtb-private-${i}`;
                  const matchingSubnetKey = `private-${i}`;
                  
                  const isRtbActive =
                    hoveredItem === "all" ||
                    hoveredItem === currentRtbKey ||
                    hoveredItem === matchingSubnetKey ||
                    hoveredItem === "vpce" ||
                    (nat === "zonal" && (() => {
                      const natIdx = natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
                      return hoveredItem === `nat-${natIdx}`;
                    })());

                  return (
                    <div
                      key={i}
                      ref={setBoxRef(currentRtbKey)}
                      onMouseEnter={() => setHoveredItem(currentRtbKey)}
                      onMouseLeave={() => setHoveredItem("none")}
                      className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                        isRtbActive
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                          : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                      }`}
                    >
                      <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400 truncate max-w-[92%]">
                        {rtbCustomNames[`private-${i}`] || `${baseName}-rtb-private${i + 1}`}
                      </div>
                      <div className="text-xs text-neutral-500 font-medium">
                        {nat !== "none" ? "1 local, 1 NAT route" : "1 local route"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 4: NETWORK CONNECTIONS */}
          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Network Connections ({networkConnectionsCount})
            </div>

            <div className="space-y-3">
              {/* Internet Gateway */}
              {!isVpcOnly && publicCount > 0 && (
                <div
                  ref={setBoxRef("igw")}
                  onMouseEnter={() => setHoveredItem("igw")}
                  onMouseLeave={() => setHoveredItem("none")}
                  className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                    hoveredItem === "all" || hoveredItem === "igw" || hoveredItem === "rtb-public" || hoveredItem.startsWith("public-")
                      ? "border-purple-600 bg-purple-50 text-purple-700 dark:text-purple-400 opacity-100 scale-[1.01]"
                      : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                    {netCustomNames["igw"] || `${baseName}-igw`}
                  </div>
                  <div className="text-xs font-semibold">Internet Gateway</div>
                </div>
              )}

              {/* Wrap the S3 Gateway box with a condition so it only displays if enabled */}
              {endpoints === "s3" && (
                <div
                  ref={setBoxRef("vpce")}
                  onMouseEnter={() => setHoveredItem("vpce")}
                  onMouseLeave={() => setHoveredItem("none")}
                  className={`border rounded-lg p-3 pt-5 relative bg-white transition-all duration-150 shadow-sm cursor-pointer ${
                    hoveredItem === "all" || hoveredItem === "vpce" || hoveredItem.startsWith("rtb-private-") || hoveredItem.startsWith("private-")
                      ? "border-neutral-700 text-neutral-800 dark:text-neutral-200 opacity-100 scale-[1.01]"
                      : "border-neutral-300 dark:border-neutral-700 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                    {netCustomNames["vpce"] || "S3 Gateway Endpoint"}
                  </div>
                  <div className="text-xs font-medium text-neutral-500">VPC endpoint</div>
                </div>
              )}

              {/* NAT gateways */}
              {!isVpcOnly && nat === "zonal" && Array.from({ length: natCount }).map((_, i) => {
                const natKey = `nat-${i}`;
                const azLabel = azs[i] ?? azs[0];
                const natName = `${baseName}-nat-public${i + 1}-${azLabel}`;
                const isActive =
                  hoveredItem === "all" ||
                  hoveredItem === natKey ||
                  (natUpdated === "in1az" && (hoveredItem.startsWith("rtb-private-") || hoveredItem.startsWith("private-"))) ||
                  (natUpdated === "oneperaz" && (() => {
                    // active when hovering any private rtb/subnet whose AZ index === i
                    const m = hoveredItem.match(/^(?:rtb-)?private-(\d+)$/);
                    if (!m) return false;
                    const idx = parseInt(m[1], 10);
                    return idx % Math.max(1, azs.length) === i;
                  })());
                return (
                  <div
                    key={natKey}
                    ref={setBoxRef(natKey)}
                    onMouseEnter={() => setHoveredItem(natKey)}
                    onMouseLeave={() => setHoveredItem("none")}
                    className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                      isActive
                        ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                        : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400 truncate max-w-[92%]">
                      {natName}
                    </div>
                    <div className="text-xs font-medium text-neutral-500">NAT Gateway</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connector lines overlay */}
          <ConnectorOverlay
            containerRef={diagramRef}
            boxRefs={boxRefs}
            hovered={hoveredItem === "none" ? null : hoveredItem}
            connections={(() => {
              const conns: Connection[] = [];
              const allSubs = azLayouts.flatMap((a) => a.items);
              const natIdxFor = (i: number) =>
                natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
              for (const s of allSubs) {
                const extraKeys: string[] = [];
                if (s.kind === "public") extraKeys.push("igw", "rtb-public");
                else {
                  const m = s.key.match(/^private-(\d+)$/);
                  if (m) {
                    const idx = parseInt(m[1], 10);
                    if (endpoints === "s3") extraKeys.push("vpce");
                    if (nat === "zonal" && natCount > 0) extraKeys.push(`nat-${natIdxFor(idx)}`);
                  }
                }
                conns.push({ from: "vpc", to: s.key, keys: ["all", s.key, s.rtbKey, ...extraKeys] });
                conns.push({
                  from: s.key,
                  to: s.rtbKey,
                  keys: ["all", s.key, s.rtbKey, ...extraKeys],
                });
              }
              if (!isVpcOnly && publicCount > 0) {
                conns.push({
                  from: "rtb-public",
                  to: "igw",
                  keys: ["all", "rtb-public", "igw", ...allSubs.filter((s) => s.kind === "public").map((s) => s.key)],
                });
              }
              if (endpoints === "s3") {
                for (let i = 0; i < privateCount; i++) {
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: "vpce",
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, "vpce"],
                  });
                }
              }
              if (!isVpcOnly && nat === "zonal" && natCount > 0) {
                for (let i = 0; i < privateCount; i++) {
                  const natIdx = natIdxFor(i);
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: `nat-${natIdx}`,
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, `nat-${natIdx}`],
                  });
                }
              }
              return conns;
            })()}
            deps={[azLayouts.length, publicCount, privateCount, endpoints, isVpcOnly, autoGen, nat, natUpdated, natCount]}
          />

          {/* Connector lines overlay */}
          <ConnectorOverlay
            containerRef={diagramRef}
            boxRefs={boxRefs}
            hovered={hoveredItem === "none" ? null : hoveredItem}
            connections={(() => {
              const conns: Connection[] = [];
              const allSubs = azLayouts.flatMap((a) => a.items);
              const natIdxFor = (i: number) =>
                natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
              for (const s of allSubs) {
                const extraKeys: string[] = [];
                if (s.kind === "public") extraKeys.push("igw", "rtb-public");
                else {
                  const m = s.key.match(/^private-(\d+)$/);
                  if (m) {
                    const idx = parseInt(m[1], 10);
                    if (endpoints === "s3") extraKeys.push("vpce");
                    if (nat === "zonal" && natCount > 0) extraKeys.push(`nat-${natIdxFor(idx)}`);
                  }
                }
                conns.push({ from: "vpc", to: s.key, keys: ["all", s.key, s.rtbKey, ...extraKeys] });
                conns.push({
                  from: s.key,
                  to: s.rtbKey,
                  keys: ["all", s.key, s.rtbKey, ...extraKeys],
                });
              }
              if (!isVpcOnly && publicCount > 0) {
                conns.push({
                  from: "rtb-public",
                  to: "igw",
                  keys: ["all", "rtb-public", "igw", ...allSubs.filter((s) => s.kind === "public").map((s) => s.key)],
                });
              }
              if (endpoints === "s3") {
                for (let i = 0; i < privateCount; i++) {
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: "vpce",
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, "vpce"],
                  });
                }
              }
              if (!isVpcOnly && nat === "zonal" && natCount > 0) {
                for (let i = 0; i < privateCount; i++) {
                  const natIdx = natIdxFor(i);
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: `nat-${natIdx}`,
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, `nat-${natIdx}`],
                  });
                }
              }
              return conns;
            })()}
            deps={[azLayouts.length, publicCount, privateCount, endpoints, isVpcOnly, autoGen, nat, natUpdated, natCount]}
          />

        </div>

        {/* INPUT LAYOUT GROUP */}
        {!autoGen && (
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-4 gap-6">
            
            {/* VPC INPUT */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider">VPC Name</label>
              <input
                type="text"
                value={vpcCustomName}
                placeholder={`${baseName}-vpc`}
                onChange={(e) => setVpcCustomName(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-2 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
              />
            </div>

            {/* SUBNET INPUTS */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Subnet Names</label>
              {azLayouts.flatMap(azBox => azBox.items).map((sub) => (
                <div key={sub.key} className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    {sub.key.startsWith("public") ? "Public" : "Private"} Subnet
                  </span>
                  <input
                    type="text"
                    value={subCustomNames[sub.key] || ""}
                    placeholder={sub.label}
                    onChange={(e) => setSubCustomNames(prev => ({ ...prev, [sub.key]: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              ))}
            </div>

            {/* ROUTE TABLE INPUTS */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Route Tables</label>
              {!isVpcOnly && publicCount > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">Public Route Table</span>
                  <input
                    type="text"
                    value={rtbCustomNames["public"] || ""}
                    placeholder="rtb-public"
                    onChange={(e) => setRtbCustomNames(prev => ({ ...prev, public: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              )}
              {!isVpcOnly && Array.from({ length: privateCount }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">{`Private RT ${i + 1}`}</span>
                  <input
                    type="text"
                    value={rtbCustomNames[`private-${i}`] || ""}
                    placeholder={`rtb-private-${i + 1}`}
                    onChange={(e) => setRtbCustomNames(prev => ({ ...prev, [`private-${i}`]: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              ))}
            </div>

            {/* NETWORK CONNECTION INPUTS */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Connections</label>
              {!isVpcOnly && publicCount > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">Internet Gateway</span>
                  <input
                    type="text"
                    value={netCustomNames["igw"] || ""}
                    placeholder="igw-default"
                    onChange={(e) => setNetCustomNames(prev => ({ ...prev, igw: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              )}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 font-mono block">S3 Gateway Endpoint</span>
                <input
                  type="text"
                  value={netCustomNames["vpce"] || ""}
                  placeholder="S3 Gateway Endpoint"
                  onChange={(e) => setNetCustomNames(prev => ({ ...prev, vpce: e.target.value }))}
                  className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}


function Field({ label, hint, optional, children }: {
  label: string; hint?: string; info?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium">
          {label}
          {optional && <span className="text-muted-foreground font-normal italic ml-1">- optional</span>}
        </label>
      </div>
      {hint && <div className="text-xs text-muted-foreground mb-2">{hint}</div>}
      {children}
    </div>
  );
}

function RadioRow({ name, value, onChange, options }: {
  name: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" name={name} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className="h-4 w-4 accent-primary" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function SelectCard({ selected, onClick, label, description, disabled}: {
  selected: boolean; onClick: () => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`text-left rounded-md border px-4 py-3 transition ${
        disabled ? "opacity-50 cursor-not-allowed bg-muted" :
        selected ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:bg-accent/30"
      }`}>
      <div className="flex items-center gap-2">
        <span className={`h-4 w-4 rounded-full border grid place-items-center ${selected ? "border-primary" : "border-muted-foreground"}`}>
          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {description && <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</div>}
    </button>
  );
}

function Segmented<T extends string | number>({ 
  value, 
  options, 
  onChange, 
  labels,
  disabledOptions = [] // <-- Add this new prop
}: {
  value: T; 
  options: T[]; 
  onChange: (v: T) => void; 
  labels?: Record<string, string>;
  disabledOptions?: T[]; // <-- Add this type definition
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {options.map((o, i) => {
        const active = o === value;
        const isDisabled = disabledOptions.includes(o); // <-- Check if option is disabled
        
        return (
          <button 
            key={String(o)} 
            type="button" 
            disabled={isDisabled} // <-- Disable HTML button
            onClick={() => !isDisabled && onChange(o)} // <-- Prevent state changes
            className={`px-4 py-1.5 text-sm transition-colors ${
              active 
                ? "bg-primary text-primary-foreground" 
                : isDisabled
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-60" // <-- Disabled styles
                  : "bg-card hover:bg-accent/30"
            } ${i > 0 ? "border-l border-border" : ""}`}
          >
            {labels?.[String(o)] ?? String(o)}
          </button>
        );
      })}
    </div>
  );
}

function Collapsible({ open, setOpen, label, optional, children }: {
  open: boolean; setOpen: (v: boolean) => void; label: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm font-medium">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
        {optional && <span className="text-muted-foreground font-normal italic ml-1">- optional</span>}
      </button>
      {open && <div className="mt-3 pl-5">{children}</div>}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-5" />;
}