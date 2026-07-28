import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus, X, XCircle, RefreshCw, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useCreateLoadBalancer } from "@/hooks/useLoadBalancers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useDialog } from "@/components/ui/dialog-context";
import { Header } from "../layout/Header";
import { CreateLbPayload } from "@/services/lbApi";
import { REGIONS } from "@/utils/s3.utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Info as InfoIcon, RefreshCw as RefreshIcon } from "lucide-react";
import { lbApi, type VpcItem, type SubnetItem, type SgItem, type TgItem, type EipItem, type AzItem } from "@/services/lbApi";
import { CreateTargetGroupPage } from "./CreateTargetGroupPage";

type LbKind = "ALB" | "NLB";
type RoutingAction = "forward" | "redirect" | "fixed-response";
type RedirectMode = "uri" | "full";

type TagRow = {
  id: number;
  key: string;
  value: string;
};

type TargetGroupRow = {
  id: number;
  group: string;
  weight: number;
};

type ListenerConfig = {
  id: number;
  protocol: string;
  port: number;
  action: RoutingAction;
  redirectMode: RedirectMode;
  expanded: boolean;
  tags: TagRow[];
  stickiness: boolean;
  stickinessDurationType: "seconds" | "dhms";
  stickinessSeconds: number;
  stickinessDays: number;
  stickinessHours: number;
  stickinessMinutes: number;
  stickinessDhmsSecs: number;
  targetGroups: TargetGroupRow[];
  customHostPath: boolean;
  redirectHost: string;
  redirectPath: string;
  redirectQuery: string;
  redirectPort: string;
  redirectProtocol: string;
  fixedResponseCode: string;
  fixedResponseContentType: string;
  fixedResponseBody: string;

};

interface Props {
  kind: LbKind;
}

const createTagRow = (): TagRow => ({ id: Date.now() + Math.floor(Math.random() * 1000), key: "", value: "" });
const createTargetGroup = (): TargetGroupRow => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  group: "",
  weight: 1,
});


const createListener = (id: number, isAlb: boolean, port = 80): ListenerConfig => ({
  id,
  protocol: isAlb ? "HTTP" : "TCP",
  port,
  action: "forward",
  redirectMode: "uri",
  expanded: true,
  tags: [],
  stickiness: false,
  stickinessDurationType: "dhms",
  stickinessSeconds: 3600,
  stickinessDays: 0,
  stickinessHours: 1,
  stickinessMinutes: 0,
  stickinessDhmsSecs: 0,
  targetGroups: [createTargetGroup()],
  customHostPath: false,
  redirectHost: "#{host}",
  redirectPath: "/#{path}",
  redirectQuery: "#{query}",
  redirectPort: "#{port}",
  redirectProtocol: "#{protocol}",
  fixedResponseCode: "503",
  fixedResponseContentType: "text/plain",
  fixedResponseBody: ""

});
const LB_NAME_REGEX = /^[a-zA-Z0-9-]+$/;

function validateLbName(value: string): string | null {
  if (!value) return "Load balancer name is required.";
  if (value.length > 32) return "Load balancer name must be 32 characters or fewer.";
  if (!LB_NAME_REGEX.test(value)) return "Only letters, numbers, and hyphens are allowed.";
  if (value.startsWith("-") || value.endsWith("-")) return "Name can't start or end with a hyphen.";
  if (value.includes("--")) return "Name can't contain consecutive hyphens.";
  return null;
}

export function LoadBalancerCreate({ kind }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppStore((s: any) => s.currentUser);
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const { alert } = useDialog()
  const isAlb = kind === "ALB";
  const title = isAlb ? "Create Application Load Balancer" : "Create Network Load Balancer";
  const subtitle = isAlb
    ? "The Application Load Balancer distributes incoming HTTP and HTTPS traffic across multiple targets such as Amazon EC2 instances, microservices, and containers, based on request attributes. When the load balancer receives a connection request, it evaluates the listener rules in priority order to determine which rule to apply, and if applicable, it selects a target from the target group for the rule action."
    : "The Network Load Balancer distributes incoming TCP and UDP traffic across multiple targets such as Amazon EC2 instances, microservices, and containers. When the load balancer receives a connection request, it selects a target based on the protocol and port that are specified in the listener configuration, and the routing rule specified as the default action.";

  const [portErrorIds, setPortErrorIds] = useState<number[]>([]);

  const sanitizePort = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");        // strip non-digits
    const noLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, ""); // "05" -> "5", "008" -> "8"
    return noLeadingZeros;
  };

  const sanitizeStatusCode = (raw: string) => raw.replace(/[^0-9]/g, "").slice(0, 3);

  const isValidStatusCode = (code: string) => /^[245]\d\d$/.test(code);

  const [fixedResponseErrorIds, setFixedResponseErrorIds] = useState<number[]>([]);

  const [vpcError, setVpcError] = useState(false);
  const [subnetError, setSubnetError] = useState(false);
  const [sgError, setSgError] = useState(false);
  const [listenerTgError, setListenerTgError] = useState<number[]>([]);
  const [existingLbs, setExistingLbs] = useState<import("@/services/lbApi").ExistingLbItem[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingLbDialogOpen, setExistingLbDialogOpen] = useState(false);
  const [nameFormatError, setNameFormatError] = useState(false);
  const [justificationError, setJustificationError] = useState(false);
  const [justificationTouched, setJustificationTouched] = useState(false);
  const [provisioningLb, setProvisioningLb] = useState<import("@/services/lbApi").ProvisioningLbItem | null>(null);
  const [checkingProvisioning, setCheckingProvisioning] = useState(false);
  const [name, setName] = useState("");
  const [justifications, setJustifications] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("us-east-2");
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [scheme, setScheme] = useState<"internet-facing" | "internal">("internet-facing");
  const [ipType, setIpType] = useState("ipv4");
  const [ipv6SourceNat, setIpv6SourceNat] = useState<"off" | "on">("off");


  const currentTypeValue = isAlb ? "application" : "network";
  const relevantExistingLbs = existingLbs.filter((lb) => lb.type === currentTypeValue);

  const hasActiveBalancer = relevantExistingLbs.some((lb) =>
    ["active", "completed"].includes(String(lb.state || "").toLowerCase())
  );

  const isProvisioningSameType = provisioningLb?.type === currentTypeValue;

  const disabledReason = isProvisioningSameType
    ? `"${provisioningLb.name}" is still provisioning. Wait for it to finish before creating another.`
    : hasActiveBalancer || relevantExistingLbs.length > 0
      ? `You already have an ${kind} under your name. Use the existing one or delete it before creating a new one.`
      : null;
  // const [vpc, setVpc] = useState(isAlb ? "vpc-0a1b2c (splunkops-vpc)" : "vpc-bbd2a2c1 (prudent-default-vpc)");
  // const [azs, setAzs] = useState<string[]>(isAlb ? ["us-east-2a", "us-east-2b"] : []);
  // const [sgs, setSgs] = useState<string[]>([isAlb ? "default (sg-a1b2c3)" : "default (sg-f12ca2ad)"]);
  // const sgOptions = isAlb
  //   ? ["web-tier (sg-1111aaaa)", "app-tier (sg-2222bbbb)", "alb-public (sg-3333cccc)", "monitoring (sg-4444dddd)"]
  //   : ["nlb-public (sg-5555eeee)", "splunk-indexer (sg-6666ffff)", "splunk-search (sg-7777aaaa)", "monitoring (sg-8888bbbb)"];

  const [buyIpamPool, setBuyIpamPool] = useState(false);
  const [ipamPool, setIpamPool] = useState("");
  const [azSubnets, setAzSubnets] = useState<Record<string, { subnet: string; ipv4: string; eip?: string }>>({});
  const [listenerSeq, setListenerSeq] = useState(1);

  const getAzSubnetEntry = (entry?: { subnet?: string; ipv4?: string; eip?: string }) => ({
    subnet: entry?.subnet ?? "",
    ipv4: entry?.ipv4 ?? "Assigned by AWS",
    eip: entry?.eip ?? "",
  });

  const updateAzSubnet = (az: string, changes: Partial<{ subnet: string; ipv4: string; eip?: string }>) => {
    setAzSubnets((prev) => {
      const current = prev[az] ? getAzSubnetEntry(prev[az]) : getAzSubnetEntry();
      return { ...prev, [az]: { ...current, ...changes } };
    });
  };

  const [listeners, setListeners] = useState<ListenerConfig[]>(() => [createListener(1, isAlb, 80)]);
  const [loadBalancerTags, setLoadBalancerTags] = useState<TagRow[]>([]);
  const [reviewIssueOpen, setReviewIssueOpen] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isJustificationValid = justifications.trim().length >= 20;
  // Integration toggles
  const [cfWafEnabled, setCfWafEnabled] = useState(false);
  const [cfSecurityBestPractice, setCfSecurityBestPractice] = useState(true);
  const [wafEnabled, setWafEnabled] = useState(false);
  const [wafMode, setWafMode] = useState<"new" | "existing">("new");
  const [wafCustomNameEnabled, setWafCustomNameEnabled] = useState(false);
  const [wafCustomName, setWafCustomName] = useState("");
  const [wafExistingAcl, setWafExistingAcl] = useState("");
  const [wafRuleAction, setWafRuleAction] = useState<"Block" | "Count">("Block");
  const [wafResourceNameMode, setWafResourceNameMode] = useState<"auto" | "custom">("auto");
  const [wafDdosProtection, setWafDdosProtection] = useState(false);
  const [wafLowRepMode, setWafLowRepMode] = useState<"active" | "always">("active");
  const [gaEnabled, setGaEnabled] = useState(false);
  const [gaName, setGaName] = useState("");
  const primaryListener = listeners[0] ?? createListener(1, isAlb);

  const ipPoolsDisabled = scheme === "internal" || ipType === "dualstack-public";

  // const allAzs = isAlb
  // ? ["us-east-2a (use2-az1)", "us-east-2b (use2-az2)", "us-east-2c (use2-az3)", "us-east-2a (use2-az4)", "us-east-2b (use2-az5)", "us-east-2c (use2-az6)"]
  // : ["us-east-1a (use1-az4)", "us-east-1b (use1-az6)", "us-east-1c (use1-az1)", "us-east-1d (use1-az2)", "us-east-1e (use1-az3)", "us-east-1f (use1-az5)"];
  const [vpc, setVpc] = useState("");
  const [azs, setAzs] = useState<string[]>([]);
  const [sgs, setSgs] = useState<string[]>([]);
  const [selectedSgId, setSelectedSgId] = useState("");
  const [vpcList, setVpcList] = useState<VpcItem[]>([]);
  const [subnetMap, setSubnetMap] = useState<Record<string, SubnetItem[]>>({});
  const [sgOptions, setSgOptions] = useState<SgItem[]>([]);
  const [tgOptions, setTgOptions] = useState<TgItem[]>([]);
  // Add this derived variable near the top of the component (after tgOptions is declared)
  const ALB_PROTOCOLS = ["HTTP", "HTTPS"];
  const filteredTgOptions = tgOptions.filter((tg) => {
    if (!tg.protocol) return false;
    return isAlb ? ALB_PROTOCOLS.includes(tg.protocol) : !ALB_PROTOCOLS.includes(tg.protocol);
  });
  const ALLOWED_VPCS: Record<string, string> = {
    "us-east-2": "vpc-02e99db96569078e6",
    "us-east-1": "vpc-00f1dd2c4bab98af5",
  };

  const filteredVpcList = ALLOWED_VPCS[selectedRegion]
    ? vpcList.filter((v) => v.id === ALLOWED_VPCS[selectedRegion])
    : vpcList;

  const [eipOptions, setEipOptions] = useState<EipItem[]>([]);
  const [allAzs, setAllAzs] = useState<AzItem[]>([]);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [loadingVpc, setLoadingVpc] = useState(false);
  const [nameErrorMsg, setNameErrorMsg] = useState<string | null>(null);

  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameExistsError, setNameExistsError] = useState(false);
  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);

    if (!name || validateLbName(name)) {
      setNameExistsError(false);
      setNameCheckLoading(false);
      return;
    }

    setNameCheckLoading(true);
    nameCheckTimer.current = setTimeout(() => {
      lbApi.checkLbName(name, selectedRegion)
        .then((res) => setNameExistsError(!!res.exists))
        .catch(() => setNameExistsError(false)) // fail open on lookup errors
        .finally(() => setNameCheckLoading(false));
    }, 500);

    return () => { if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current); };
  }, [name, selectedRegion]);
  const isFormComplete = (() => {
    if (validateLbName(name)) return false;
    if (nameExistsError || nameCheckLoading) return false;
    if (!vpc) return false;
    if (azs.length < 2 || azs.some((az) => !azSubnets[az]?.subnet)) return false;
    if (isAlb && sgs.length === 0) return false;

    const listenersOk = listeners.every((l) => {
      if (!l.port || l.port < 1 || l.port > 65535) return false;
      if (l.action === "forward" && !l.targetGroups.some((t) => t.group)) return false;
      if (l.action === "fixed-response" && !isValidStatusCode(l.fixedResponseCode)) return false;
      return true;
    });
    if (!listenersOk) return false;

    if (!isJustificationValid) return false;
    return true;
  })();

  useEffect(() => {
    if (azs.length === 0) return;
    setAzSubnets((prev) => {
      const next = { ...prev };
      let changed = false;

      azs.forEach((az) => {
        if (!next[az]) {
          next[az] = getAzSubnetEntry();
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [azs]);

  useEffect(() => {
    if (loadingRegion || vpc || !selectedRegion) return;
    const preferredVpc = filteredVpcList.find((item) => item.id === ALLOWED_VPCS[selectedRegion]) ?? (filteredVpcList.length === 1 ? filteredVpcList[0] : null);
    if (preferredVpc) {
      setVpc(preferredVpc.id);
    }
  }, [loadingRegion, selectedRegion, filteredVpcList, vpc]);

  useEffect(() => {
    if (!user?.id) return;
    setCheckingProvisioning(true);
    lbApi.checkProvisioning(user.id,  currentTypeValue as "application" | "network")
      .then((res) => setProvisioningLb(res.loadBalancer ?? null))
      .catch(() => setProvisioningLb(null))
      .finally(() => setCheckingProvisioning(false));
  }, [user?.id, currentTypeValue]);

  useEffect(() => {
    if (!selectedRegion) return;
    setCheckingExisting(true);
    lbApi.checkExisting(selectedRegion)
      .then((res) => {
         const all = res.loadBalancers ?? [];
      setExistingLbs(all);
      const sameType = all.filter((lb) => lb.type === currentTypeValue);
      setExistingLbDialogOpen(sameType.length > 0);
      })
      .catch(() => setExistingLbs([])) // fail open on lookup errors, don't block the page
      .finally(() => setCheckingExisting(false));
  }, [selectedRegion,currentTypeValue]);


  useEffect(() => {
    if (!selectedRegion) return;
    setLoadingRegion(true);
    setVpc(""); setAzs([]); setSgs([]); setAzSubnets({}); setSubnetMap({});
    Promise.all([
      lbApi.vpcs(selectedRegion).catch(() => ({ vpcs: [] as VpcItem[] })),
      lbApi.availabilityZones(selectedRegion).catch(() => ({ availabilityZones: [] as AzItem[] })),
      lbApi.elasticIps(selectedRegion).catch(() => ({ elasticIps: [] as EipItem[] })),
    ]).then(([vpcRes, azRes, eipRes]) => {
      setVpcList(vpcRes.vpcs);
      setAllAzs(azRes.availabilityZones);
      setEipOptions(eipRes.elasticIps);
    }).finally(() => setLoadingRegion(false));
  }, [selectedRegion]);

  useEffect(() => {
    if (!vpc || !selectedRegion) return;
    setLoadingVpc(true);
    Promise.all([
      lbApi.securityGroups(selectedRegion, vpc).catch(() => ({ securityGroups: [] as SgItem[] })),
      lbApi.targetGroups(selectedRegion, vpc).catch(() => ({ targetGroups: [] as TgItem[] })),
    ]).then(([sgRes, tgRes]) => {
      setSgOptions(sgRes.securityGroups);
      setTgOptions(tgRes.targetGroups);
      if (sgs.length === 0 && sgRes.securityGroups.length > 0) {
        const firstSg = sgRes.securityGroups[0].id;
        setSgs([firstSg]);
        setSelectedSgId(firstSg);
      }
    }).finally(() => setLoadingVpc(false));
  }, [vpc, selectedRegion]);

  useEffect(() => {
    if (!vpc || !selectedRegion || azs.length === 0) return;
    azs.forEach((az) => {
      if (subnetMap[az]) return;
      lbApi.subnets(selectedRegion, vpc).then((res) => {
        const forAz = res.subnets.filter((s) => s.az === az);
        setSubnetMap((prev) => ({ ...prev, [az]: forAz }));
        if (!azSubnets[az]?.subnet && forAz.length === 1) {
          updateAzSubnet(az, { subnet: forAz[0].id });
        }
      }).catch(() => { });
    });
  }, [azs, vpc, selectedRegion]);


  const toggleAz = (az: string) =>
    setAzs((p) => (p.includes(az) ? p.filter((x) => x !== az) : [...p, az]));

  const region = isAlb ? "us-east-2" : "us-east-1";

  const scrollToSection = (id: string, focusName = false) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusName) setTimeout(() => nameInputRef.current?.focus(), 350);
  };

  const updateListener = (id: number, changes: Partial<ListenerConfig>) => {
    setListeners((prev) => prev.map((listener) => (listener.id === id ? { ...listener, ...changes } : listener)));
  };

  const remainingListeners = Math.max(0, 50 - listeners.length);

  const addListener = () => {
    const nextId = listenerSeq + 1;
    setListenerSeq(nextId);
    const maxPort = listeners.reduce((m, l) => Math.max(m, l.port || 0), 79);
    setListeners((prev) => [...prev.map((listener) => ({ ...listener, expanded: false })), createListener(nextId, isAlb, maxPort + 1)]);
  };

  const removeListener = (id: number) => {
    setListeners((prev) => (prev.length === 1 ? prev : prev.filter((listener) => listener.id !== id)));
  };

  const addListenerTag = (listenerId: number) => {
    setListeners((prev) => prev.map((listener) => (
      listener.id === listenerId ? { ...listener, tags: [...listener.tags, createTagRow()] } : listener
    )));
  };

  const updateListenerTag = (listenerId: number, tagId: number, field: "key" | "value", value: string) => {
    setListeners((prev) => prev.map((listener) => (
      listener.id === listenerId
        ? { ...listener, tags: listener.tags.map((tag) => (tag.id === tagId ? { ...tag, [field]: value } : tag)) }
        : listener
    )));
  };

  const removeListenerTag = (listenerId: number, tagId: number) => {
    setListeners((prev) => prev.map((listener) => (
      listener.id === listenerId ? { ...listener, tags: listener.tags.filter((tag) => tag.id !== tagId) } : listener
    )));
  };

  const addTargetGroup = (listenerId: number) => {
    setListeners((prev) => prev.map((l) => (
      l.id === listenerId && l.targetGroups.length < 5
        ? { ...l, targetGroups: [...l.targetGroups, createTargetGroup()] }
        : l
    )));
  };

  const updateTargetGroup = (listenerId: number, tgId: number, changes: Partial<TargetGroupRow>) => {
    setListeners((prev) => prev.map((l) => (
      l.id === listenerId
        ? { ...l, targetGroups: l.targetGroups.map((t) => (t.id === tgId ? { ...t, ...changes } : t)) }
        : l
    )));
  };

  const removeTargetGroup = (listenerId: number, tgId: number) => {
    setListeners((prev) => prev.map((l) => (
      l.id === listenerId && l.targetGroups.length > 1
        ? { ...l, targetGroups: l.targetGroups.filter((t) => t.id !== tgId) }
        : l
    )));
  };

  const updateLoadBalancerTag = (tagId: number, field: "key" | "value", value: string) => {
    setLoadBalancerTags((prev) => prev.map((tag) => (tag.id === tagId ? { ...tag, [field]: value } : tag)));
  };

  async function submit() {
    let valid = true;

    if (provisioningLb) {
      alert({ title: `"${provisioningLb.name}" is still provisioning`, description: "Wait for it to finish before creating another.", severity: "error" });
      return;
    }

    if (relevantExistingLbs.length > 0) {
      setExistingLbDialogOpen(true);
      alert({ title: "You already have a load balancer under your name.", severity: "error" });
      return;
    }

    const nameValidationError = validateLbName(name);
    if (nameValidationError) {
      setNameErrorMsg(nameValidationError);
      if (valid) {
        alert({ title: nameValidationError, severity: "error" });
        nameInputRef.current?.focus();
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      valid = false;
    } else {
      setNameErrorMsg(null);
    }

    if (!vpc) {
      setVpcError(true);
      if (valid) {
        alert({ title: "Please select a VPC", severity: "error" });
        document.getElementById("network-mapping")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    } else {
      setVpcError(false);
    }

    const missingSubnet = azs.length < 2 || azs.some((az) => !azSubnets[az]?.subnet);
    if (azs.length < 2 || missingSubnet) {
      setSubnetError(true);
      if (valid) {
        alert({
          title: azs.length < 2 ? "Select at least 2 Availability Zones" : "Each selected AZ must have a subnet chosen",
          severity: "error",
        });
        document.getElementById("network-mapping")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    } else {
      setSubnetError(false);
    }

    if (isAlb && sgs.length === 0) {
      setSgError(true);
      if (valid) {
        alert({ title: "At least one security group is required", severity: "error" });
        document.getElementById("security-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    } else {
      setSgError(false);
    }

    const badListeners = listeners
      .filter((l) => l.action === "forward" && !l.targetGroups.some((t) => t.group))
      .map((l) => l.id);
    setListenerTgError(badListeners);
    if (badListeners.length > 0) {
      if (valid) {
        alert({ title: "Each forward listener must have a target group selected", severity: "error" });
        document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    }

    const badPorts = listeners
      .filter((l) => !l.port || l.port < 1 || l.port > 65535)
      .map((l) => l.id);
    setPortErrorIds(badPorts);
    if (badPorts.length > 0) {
      if (valid) {
        alert({ title: "Port must be an integer between 1 and 65535, inclusive.", severity: "error" });
        document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    }

    const badFixedResponses = listeners
      .filter((l) => l.action === "fixed-response" && !isValidStatusCode(l.fixedResponseCode))
      .map((l) => l.id);
    setFixedResponseErrorIds(badFixedResponses);
    if (badFixedResponses.length > 0) {
      if (valid) {
        alert({ title: "Response code must be a valid HTTP status code (2xx, 4xx, or 5xx).", severity: "error" });
        document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      valid = false;
    }

    if (justifications.trim().length < 20) {
      setJustificationError(true);
      if (valid) {
        alert({ title: "Business justification is required (minimum 20 characters)", severity: "error" });
        document.getElementById("justification")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      valid = false;
    } else {
      setJustificationError(false);
    }

    if (valid && !validateLbName(name)) {
      try {
        const res = await lbApi.checkLbName(name, selectedRegion);
        if (res.exists) {
          setNameExistsError(true);
          alert({
            title: `A load balancer named "${name}" already exists in ${selectedRegion}.`,
            severity: "error",
          });
          nameInputRef.current?.focus();
          nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          valid = false;
        }
      } catch {
        // fail open — a network hiccup shouldn't block submission; a true dupe still gets caught by AWS on create
      }
    }

    if (!valid) return;
    setIsDialogOpen(true);
  }

  const handleConfirm = async () => {
    if (!user?.id) {
      alert({
        title: "Unable to create load balancer. User context is missing.",
        severity: "error",
      });
      return;
    }

    if (!isJustificationValid) {
      setJustificationError(true);
      alert({
        title: "Business justification is required (minimum 20 characters)",
        severity: "error",
      });
      document.getElementById("justification")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build subnets array from azSubnets state
      const subnets = azs
        .filter((az) => azSubnets[az]?.subnet)
        .map((az) => {
          const detail = azSubnets[az];
          const base = {
            availability_zone: az,
            subnet_id: detail.subnet,
          };
          if (!isAlb && detail.ipv4 === 'Use an Elastic IP' && detail.eip) {
            return {
              ...base,
              ip_assignment_type: 'elastic_ip',
              elastic_ip_allocation_id: detail.eip,
            };
          }
          return base;
        });

      // Build listeners array
      const listenersPayload = listeners.map((l) => {
        let action_config: Record<string, string> = {};
        if (l.action === 'forward') {
          const tg = l.targetGroups.find((t) => t.group);
          action_config = { target_group_arn: tg?.group ?? '' };
        } else if (l.action === 'redirect') {
          action_config = {
            redirect_protocol: l.redirectProtocol || 'HTTPS',
            redirect_port: String(l.redirectPort || '80'),
            redirect_status_code: 'HTTP_301',
          };
        } else if (l.action === 'fixed-response') {
          action_config = {
            status_code: l.fixedResponseCode || '503',
            content_type: l.fixedResponseContentType || 'text/plain',
            message_body: l.fixedResponseBody || '',
          };
        }
        return {
          protocol: l.protocol,
          port: l.port,
          action_type: l.action,
          action_config,
          listener_tags: l.tags
            .filter((t) => t.key)
            .map((t) => ({ key: t.key, value: t.value })),
        };
      });

      const payload = {
        user_id: user?.id as number,
        region: selectedRegion,
        name,
        type: isAlb ? 'application' : 'network',
        vpc_id: vpc,
        scheme,
        ip_address_type: ipType,
        security_group_ids: sgs,
        subnets,
        listeners: listenersPayload,
        lb_tags: [
          { key: "region", value: selectedRegion },
          { key: "Owner", value: user?.displayName ?? user?.name ?? "" },
          ...loadBalancerTags
            .filter((t) => t.key)
            .map((t) => ({ key: t.key, value: t.value })),
        ],

        justification: justifications || undefined,
      } as CreateLbPayload;

      const response = await lbApi.create(payload);
      const requestId = response?.data?.request_id;

      alert({
        title: "Request submitted successfully",
        severity: "success",
      });

      if (requestId) {
        setActiveRequest(requestId, 'lb-service');
        navigate(`/console?request=${requestId}`);
      } else {
        // fallback if backend didn't return an id
        navigate('/aws/load-balancers');
      }
    } catch (err: any) {
      alert({
        title: "Failed to create load balancer",
        description: err?.message ?? "Unknown error",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
      setIsDialogOpen(false);
    }
  };


  const panel = searchParams.get("panel");
  const showCreateTargetGroup = panel === "create-target-group";

  const handleCreateTargetGroup = () => {
    const next = new URLSearchParams(searchParams);
    next.set("panel", "create-target-group");
    next.set("region", selectedRegion);
    if (vpc) next.set("vpcId", vpc);
    setSearchParams(next);
  };

  const closeCreateTargetGroup = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    next.delete("region");
    next.delete("vpcId");
    setSearchParams(next);
  };

  const handleTargetGroupCreated = (tg: TgItem) => {
    setTgOptions((prev) => [...prev, tg]);
    alert({
      title: `Target group "${tg.name}" created successfully`,
      severity: "success",
    });
    closeCreateTargetGroup();
  };

  if (showCreateTargetGroup) {
    return (
      <div>
        <Header title="Load Balancers" subtitle="" />
        <div className="max-w-[1100px] mx-auto pb-8 m-5">
          <CreateTargetGroupPage
            isAlb={isAlb}
            vpcList={filteredVpcList}
            defaultVpcId={searchParams.get("vpcId") ?? vpc}
            onCancel={closeCreateTargetGroup}
            onCreate={handleTargetGroupCreated}
          />
        </div>


      </div>
    );
  }

  return (
    <div>
      <Header title="Load Balancers" subtitle="" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
        <Link
          to="/aws/load-balancers"
          className="text-primary hover:underline"
        >
          Load Balancers
        </Link>
        <span>/</span>
        <span>{title}</span>
      </div>
      <div className="max-w-[1100px] mx-auto pb-8 m-5">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-5xl">{subtitle}</p>
        </div>

        {/* How it works */}
        <Section>
          <Collapsible title={isAlb ? "How Application Load Balancers work" : "How Network Load Balancers work"}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
              <ol className="text-sm text-muted-foreground space-y-3">
                <li><span className="text-foreground font-medium">1.</span> Clients send requests to your {isAlb ? "application" : "load balancer"}.</li>
                <li><span className="text-foreground font-medium">2.</span> The listener in your load balancer receives requests matching the protocol and port that you configure.</li>
                <li><span className="text-foreground font-medium">3.</span> The receiving listener evaluates the incoming request against the rules you specify, and if applicable, routes the request to the appropriate target group. {isAlb && "You can use an HTTPS listener to offload the work of TLS encryption and decryption to your load balancer."}</li>
                <li><span className="text-foreground font-medium">4.</span> Healthy targets in one or more target groups receive traffic based on the load balancing algorithm, and the routing rules you specify in the listener.</li>
              </ol>
              <div className="border border-border rounded-md bg-background/100 aspect-square">
                {isAlb ? <AlbHowItWorks /> : <NlbHowItWorks />}
              </div>
            </div>
          </Collapsible>
        </Section>

        {/* Basic configuration */}
        <Section id="basic-configuration" title="Basic Configuration">
          <Field label="AWS Region">

            <Select
              value={selectedRegion}
              onValueChange={setSelectedRegion}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select AWS Region" />
              </SelectTrigger>

              <SelectContent>
                {REGIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Load Balancer Name"
          >
            <p className="text-xs text-muted-foreground m-1">Name must be unique within your AWS account and can't be changed after the load balancer is created.</p>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                setNameErrorMsg(validateLbName(value));
              }}
              className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${nameErrorMsg || nameExistsError ? "border-red-500 ring-red-200" : "border-blue-500 ring-blue-200"
                }`}
              placeholder=""
            />
            {nameErrorMsg ? (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                <XCircle size={14} className="mt-0.5 shrink-0" />
                <span>{nameErrorMsg}</span>
              </div>
            ) : nameCheckLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Checking availability...</p>
            ) : nameExistsError ? (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                <XCircle size={14} className="mt-0.5 shrink-0" />
                <span>A load balancer named "{name}" already exists in {selectedRegion}. Choose a different name.</span>
              </div>
            ) : null}
          </Field>

          <Field label="Scheme" >
            <p className="text-xs text-muted-foreground m-1">Scheme can't be changed after the load balancer is created.</p>
            <div className="grid grid-cols-2 gap-3">
              <RadioCard
                checked={scheme === "internet-facing"}
                onClick={() => setScheme("internet-facing")}
                title="Internet-facing"
                bullets={["Serves internet-facing traffic.", "Has public IP addresses.", "DNS name resolves to public IPs.", "Requires a public subnet."]}
              />
              <RadioCard
                checked={scheme === "internal"}
                onClick={() => ""}
                title="Internal"
                bullets={["Serves internal traffic.", "Has private IP addresses.", "DNS name resolves to private IPs."]}
              />
            </div>
          </Field>

          <Field label="Load Balancer IP Address Type">
            <div className="space-y-2">
              {[
                { value: "ipv4", title: "IPv4", desc: "Includes only IPv4 addresses.", disabled: false },
                { value: "dualstack", title: "Dualstack", desc: "Includes IPv4 and IPv6 addresses.", disabled: true },
                ...(scheme === "internet-facing" && isAlb
                  ? [{ value: "dualstack-public", title: "Dualstack without public IPv4", desc: "Includes public IPv6 address, and private IPv4 and IPv6 addresses. Compatible with Internet-facing load balancers only.", disabled: true }]
                  : []),
              ].map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={ipType === opt.value}
                    disabled={opt.disabled}
                    onChange={() => setIpType(opt.value)}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="text-sm">{opt.title}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </Section>

        {/* Network mapping */}
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
            {vpcError && (
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

          {/* {isAlb && (
          <Field label="IP pools">
            <p className="text-xs text-muted-foreground mb-2">
              You can optionally choose to configure an IPAM pool as the preferred source for your load balancers IP addresses.
            </p>
            <label className={`flex items-start gap-2 ${ipPoolsDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={ipPoolsDisabled ? false : buyIpamPool}
                disabled={ipPoolsDisabled}
                onChange={(e) => setBuyIpamPool(e.target.checked)}
                className="mt-1 accent-primary disabled:cursor-not-allowed"
              />
              <div>
                <div className="text-sm">Use IPAM pool for public IPv4 addresses</div>
                <div className="text-xs text-muted-foreground">
                 The IPAM pool you choose will be the preferred source of public IPv4 addresses. If the pool is depleted IPv4 addresses will be assigned by AWS.
                </div>
              </div>
            </label>
            {!ipPoolsDisabled && buyIpamPool && (
              <div className="mt-3 pl-6 space-y-1.5">
                <div className="text-sm font-medium">Public IPv4 IPAM pool</div>
                <div className="flex gap-2">
                  <select
                    value={ipamPool}
                    onChange={(e) => setIpamPool(e.target.value)}
                    className="flex-1 bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Choose an IPAM pool</option>
                    <option value="ipam-pool-0a1b2c3d">ipam-pool-0a1b2c3d (public-ipv4-pool)</option>
                    <option value="ipam-pool-1d2e3f4a">ipam-pool-1d2e3f4a (prod-ipv4-pool)</option>
                  </select>
                  <button type="button" className="p-2 border border-border rounded-md hover:bg-accent/40"><RefreshCw size={14} /></button>
                </div>
                <p className="text-xs text-muted-foreground">Choose the IPAM pool from which to assign public IPv4 addresses.</p>
              </div>
            )}
          </Field>
        )} */}

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
                            <div className="space-y-2">
                              {/* <label className="flex items-start gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={detail.ipv4 === "Assigned by AWS"} onChange={(e) => updateAzSubnet(k, { ipv4: e.target.checked ? "Assigned by AWS" : "" })} className="mt-1 accent-primary" />
                                <div><div className="text-sm">Assigned by AWS</div><div className="text-xs text-muted-foreground">A public IPv4 address auto-assigned by AWS.</div></div>
                              </label> */}
                              {/* <label className="flex items-start gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={detail.ipv4 === "Use an Elastic IP"} onChange={() => updateAzSubnet(k, { ipv4: "Use an Elastic IP", eip: detail.eip ?? "" })} className="mt-1 accent-primary" />
                                <div><div className="text-sm">Use an Elastic IP address</div><div className="text-xs text-muted-foreground">Choose an existing Elastic IP allocation in this zone.</div></div>
                              </label>
                              {detail.ipv4 === "Use an Elastic IP" && (
                                <div className="pl-6">
                                  <div className="text-sm">IP address</div>
                                  <div className="text-xs text-muted-foreground">Specify an elastic IP address to provide your load balancer with a static IPv4 address in the selected Availability Zone.</div>
                                  <select value={detail.eip ?? ""} onChange={(e) => updateAzSubnet(k, { eip: e.target.value })} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
                                    <option value="">Select an Elastic IP</option>
                                    {eipOptions.map((e) => <option key={e.allocationId} value={e.allocationId}>{e.allocationId} ({e.publicIp})</option>)}
                                  </select>
                                </div>
                              )} */}
                            </div>
                          </div>

                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {subnetError && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle size={12} /> {azs.length < 2 ? "Select at least 2 Availability Zones." : "Each selected Availability Zone must have a subnet chosen."}
                </p>
              )}

            </div>
          </Field>
        </Section>



        {/* Security groups */}
        <Section id="security-groups" title="Security Groups">
          <Field label={isAlb ? "Security groups" : "Security groups - recommended"}>
            <div className="flex flex-col gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !sgs.includes(value) && sgs.length < 5) {
                    setSgs((p) => [...p, value]);
                  }
                  setSelectedSgId("");
                }}
                disabled={!vpc || loadingVpc}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!vpc ? "Select a VPC" : loadingVpc ? "Loading..." : "Select a security group"} />
                </SelectTrigger>
                <SelectContent>
                  {sgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} disabled={sgs.includes(o.id) && selectedSgId !== o.id}>
                      {o.name} ({o.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sgError && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle size={12} /> At least one security group is required.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {sgs.map((g) => {
                  const sg = sgOptions.find((o) => o.id === g);
                  return (
                    <span key={g} className="inline-flex items-center gap-2 px-2.5 py-1 text-xs border border-border rounded-md bg-primary/10 text-primary">
                      {sg ? `${sg.name} (${sg.id})` : g}
                      <button
                        type="button"
                        onClick={() => {
                          const nextSgs = sgs.filter((x) => x !== g);
                          setSgs(nextSgs);
                          setSelectedSgId(nextSgs[nextSgs.length - 1] ?? "");
                        }}
                        className="hover:text-foreground"
                        aria-label={`Remove ${g}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </Field>
        </Section>

        {/* Listeners */}
        <Section id="listeners-routing" title="Listeners and Routing">
          <p className="text-xs text-muted-foreground mb-3">
            A listener is a process that checks for connection requests using the protocol and port you configure.
          </p>
          <div className="space-y-3">
            {listeners.map((listener) => (
              <div key={listener.id} className="border border-border rounded-md bg-card/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/30">
                  <button
                    type="button"
                    onClick={() => updateListener(listener.id, { expanded: !listener.expanded })}
                    className="flex items-center gap-2 font-medium text-sm"
                  >
                    {listener.expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} className="rotate-90" />}
                    Listener {listener.protocol}:{listener.port}
                  </button>
                  <Button variant="outline" size="sm" disabled={listeners.length === 1} onClick={() => removeListener(listener.id)}>Remove</Button>
                </div>

                {listener.expanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Field label="Protocol" inline>
                        <select
                          value={listener.protocol}
                          onChange={(e) => updateListener(listener.id, { protocol: e.target.value })}
                          className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                        >
                          {(isAlb ? ["HTTP", "HTTPS"] : ["TCP", "UDP", "TCP_UDP", "TLS"]).map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Port" inline>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={listener.port === 0 ? "" : listener.port}
                          onChange={(e) => {
                            const cleaned = sanitizePort(e.target.value);
                            const num = cleaned === "" ? 0 : Number(cleaned);
                            updateListener(listener.id, { port: num });
                            // live-clear the error once it's valid again
                            if (num >= 1 && num <= 65535) {
                              setPortErrorIds((prev) => prev.filter((id) => id !== listener.id));
                            }
                          }}
                          className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm ${portErrorIds.includes(listener.id)
                            ? "border-red-500 ring-2 ring-red-200"
                            : "border-border"
                            }`}
                        />
                        {portErrorIds.includes(listener.id) ? (
                          <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                            <XCircle size={14} className="mt-0.5 shrink-0" />
                            <span>Port must be an integer between 1 and 65535, inclusive.</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1">1 - 65535</p>
                        )}
                      </Field>
                    </div>

                    {isAlb && (
                      <Field label="Default action">
                        <p className="text-xs text-muted-foreground mb-3">The default action is used if no other rules apply. Choose the default action for traffic on this listener.</p>
                        <div className="text-xs font-medium mb-3">Routing action</div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {([
                            { id: "forward", label: "Forward to target groups", disabled: false },
                            { id: "redirect", label: "Redirect to URL", disabled: true },
                            { id: "fixed-response", label: "Return fixed response", disabled: false },
                          ] as const).map((a) => (
                            <label key={a.id} className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-md cursor-pointer ${listener.action === a.id ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                              <input
                                type="radio"
                                name={`action-${listener.id}`}
                                checked={listener.action === a.id}
                                disabled={a.disabled}
                                onChange={() =>
                                  !a.disabled && updateListener(listener.id, { action: a.id })
                                }
                                className="accent-primary"
                              />
                              {a.label}
                            </label>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-3">Forward to target group</div>
                           <p className="text-xs text-muted-foreground mb-3">Choose a target group and specify routing weight or <button type="button" onClick={handleCreateTargetGroup} className="text-primary hover:underline text-xs cursor-pointer"> Create target group</button></p>
                        </div>
                              
                      </Field>
                    )}

                    {(!isAlb || listener.action === "forward") && (
                      <div className="border-l-2 border-border pl-4">
                        <Field label="Forward to target group">
                          <div className="space-y-2">
                            {listener.targetGroups.map((tg) => {
                              const totalWeight = listener.targetGroups.reduce((s: number, t: TargetGroupRow) => s + (Number(t.weight) || 0), 0);
                              const pct = totalWeight > 0 ? Math.round(((Number(tg.weight) || 0) / totalWeight) * 100) : 0;
                              const selectedElsewhere = new Set(
                                listener.targetGroups
                                  .filter((other) => other.id !== tg.id && other.group)
                                  .map((other) => other.group)
                              );
                              return (
                                <div key={tg.id} className="grid grid-cols-[1fr_auto_110px_70px_auto] gap-2 items-end">
                                  <div>
                                    <Select
                                      value={tg.group}
                                      onValueChange={(value) =>
                                        updateTargetGroup(listener.id, tg.id, { group: value })
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a target group" />
                                      </SelectTrigger>

                                      <SelectContent>
                                        {filteredTgOptions.map((opt) => {
                                          const isAssociated = (opt.loadBalancerArns ?? []).length > 0;
                                          const isUsedElsewhere = selectedElsewhere.has(opt.arn);
                                          const isDisabled = isAssociated || isUsedElsewhere;
                                          return (
                                            <SelectItem
                                              key={opt.arn}
                                              value={opt.arn}
                                              disabled={isDisabled}
                                            >
                                              {opt.name} ({opt.protocol}:{opt.port})
                                              {isAssociated ? " — already in use" : isUsedElsewhere
                                                ? " — already selected"
                                                : ""}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Weight</div>
                                    <input
                                      type="number"
                                      min={0}
                                      max={999}
                                      value={tg.weight}
                                      onChange={(e) => updateTargetGroup(listener.id, tg.id, { weight: Number(e.target.value) })}
                                      className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Percent</div>
                                    <div className="px-2 py-2 text-sm">{pct}%</div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={listener.targetGroups.length === 1}
                                    onClick={() => removeTargetGroup(listener.id, tg.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => addTargetGroup(listener.id)}
                            disabled={listener.targetGroups.length >= 5}
                            className="mt-2 inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium"
                          >
                            Add target group
                          </button>
                          <p className="text-xs text-muted-foreground mt-1.5">You can add up to {Math.max(0, 5 - listener.targetGroups.length)} more target group{5 - listener.targetGroups.length === 1 ? "" : "s"}.</p>
                        </Field>
                      </div>
                    )}

                    {isAlb && listener.action === "redirect" && (
                      <div className="border-l-2 border-border pl-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-medium">Redirect to URL</span>
                          <a className="text-xs text-primary hover:underline">Info</a>
                        </div>
                        <div className="inline-flex rounded-md border border-border overflow-hidden mb-3 text-xs">
                          <button type="button" onClick={() => updateListener(listener.id, { redirectMode: "uri" })} className={`px-3 py-1.5 ${listener.redirectMode === "uri" ? "bg-primary text-primary-foreground" : "bg-background/40"}`}>URI parts</button>
                          <button type="button" disabled onClick={() => updateListener(listener.id, { redirectMode: "full" })} className={`px-3 py-1.5 ${listener.redirectMode === "full" ? "bg-primary text-primary-foreground" : "bg-background/40"}`}>Full URL</button>
                        </div>
                        {listener.redirectMode === "full" ? (
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium mb-1">Full URL</div>
                              <p className="text-xs text-muted-foreground mb-1.5">Enter the full destination URL, including protocol, hostname, path, and query string.</p>
                              <input defaultValue="https://#{host}/#{path}?#{query}" className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <div className="text-sm font-medium mb-1">Status code</div>
                              <select className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
                                <option>301 - Permanently moved</option>
                                <option>302 - Found</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-sm font-medium mb-1">Protocol</div>
                                <p className="text-xs text-muted-foreground mb-1.5">Used for connections from clients to the load balancer.</p>
                                <select
                                  value={listener.redirectProtocol}
                                  onChange={(e) => updateListener(listener.id, { redirectProtocol: e.target.value })}
                                  className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                >
                                  {listener.protocol === 'HTTPS' ? (
                                    <option value="HTTPS">HTTPS</option>
                                  ) : (
                                    <>
                                      <option value="HTTP">HTTP</option>
                                      <option value="HTTPS">HTTPS</option>
                                    </>
                                  )}
                                </select>

                              </div>
                              <div>
                                <div className="text-sm font-medium mb-1">Port</div>
                                <p className="text-xs text-muted-foreground mb-1.5">The port on which the load balancer is listening for connections.</p>
                                <input
                                  placeholder="Port number"
                                  value={listener.redirectPort}
                                  onChange={(e) => updateListener(listener.id, { redirectPort: e.target.value })}
                                  className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                />
                                <p className="text-[11px] text-muted-foreground mt-0.5">1-65535 or to retain the original port enter {"#{port}"}</p>
                              </div>
                            </div>
                            <label className="flex items-start gap-2 cursor-pointer mt-3">
                              <input
                                type="checkbox"
                                checked={listener.customHostPath}
                                onChange={(e) => updateListener(listener.id, { customHostPath: e.target.checked })}
                                className="mt-1 accent-primary"
                              />
                              <div>
                                <div className="text-sm">Custom host, path, query</div>
                                <div className="text-xs text-muted-foreground">Select to modify host, path and query. If no changes are made, settings from the request URL are retained.</div>
                              </div>
                            </label>
                            {listener.customHostPath && (
                              <div className="mt-3 pl-6 grid grid-cols-1 gap-3">
                                <div>
                                  <div className="text-sm font-medium mb-1">Host</div>
                                  <div className="text-xs text-muted-foreground">Specify a host or retain the original host by using. Not case sensitive.</div>
                                  <input
                                    value={listener.redirectHost}
                                    onChange={(e) => updateListener(listener.id, { redirectHost: e.target.value })}
                                    className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters. Allowed characters are a-z, A-Z, 0-9; the following special characters: -.; and wildcards (* and ?). At least one “.” is required. Only alphabetical characters are allowed after the final “.” character.</p>
                                </div>
                                <div>
                                  <div className="text-sm font-medium mb-1">Path</div>
                                  <div className="text-xs text-muted-foreground">Specify a path or retain the original path by using. Case sensitive.</div>
                                  <input
                                    value={listener.redirectPath}
                                    onChange={(e) => updateListener(listener.id, { redirectPath: e.target.value })}
                                    className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters. Allowed characters are a-z, A-Z, 0-9; the following special characters: _-.$/~"'@:+; & (using &amp;); and wildcards (* and ?).</p>
                                </div>
                                <div>
                                  <div className="text-sm font-medium mb-1">Query</div>
                                  <div className="text-xs text-muted-foreground">Specify a query or retain the original query by using. Not case sensitive.</div>
                                  <input
                                    value={listener.redirectQuery}
                                    onChange={(e) => updateListener(listener.id, { redirectQuery: e.target.value })}
                                    className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters.</p>
                                </div>
                              </div>
                            )}
                            <div className="mt-3">
                              <div className="text-sm font-medium mb-1">Status code</div>
                              <select className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
                                <option>301 - Permanently moved</option>
                                <option>302 - Found</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {isAlb && listener.action === "fixed-response" && (
                      <div className="border-l-2 border-border pl-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm font-medium mb-0.5">Response code</div>
                            <p className="text-xs text-muted-foreground mb-1.5">The type of message you want to send.</p>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={listener.fixedResponseCode}
                              onChange={(e) => {
                                const cleaned = sanitizeStatusCode(e.target.value);
                                updateListener(listener.id, { fixedResponseCode: cleaned });
                                if (isValidStatusCode(cleaned)) {
                                  setFixedResponseErrorIds((prev) => prev.filter((id) => id !== listener.id));
                                }
                              }}
                              className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm ${fixedResponseErrorIds.includes(listener.id) ? "border-red-500 ring-2 ring-red-200" : "border-border"
                                }`}
                            />
                            {fixedResponseErrorIds.includes(listener.id) ? (
                              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                                <XCircle size={14} className="mt-0.5 shrink-0" />
                                <span>Response code must be a valid HTTP status code (2xx, 4xx, or 5xx).</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground mt-0.5">2xx, 4xx, 5xx</p>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-0.5">Content type</div>
                            <p className="text-xs text-muted-foreground mb-1.5">The format of your message.</p>
                            <select
                              value={listener.fixedResponseContentType}
                              onChange={(e) => updateListener(listener.id, { fixedResponseContentType: e.target.value })}
                              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                            >
                              <option value="text/plain">text/plain</option>
                              <option value="text/html">text/html</option>
                              <option value="application/json">application/json</option>
                              <option value="application/javascript">application/javascript</option>
                              <option value="text/css">text/css</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-sm font-medium">Response body - <span className="italic font-normal">optional</span></div>
                          <p className="text-xs text-muted-foreground mb-1.5">Enter your response message.</p>
                          <textarea
                            value={listener.fixedResponseBody}
                            onChange={(e) => updateListener(listener.id, { fixedResponseBody: e.target.value })}
                            className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm min-h-[90px]"
                          />
                          <p className="text-[11px] text-muted-foreground mt-0.5">1024 character maximum</p>
                        </div>
                      </div>
                    )}


                    {/* <div className="mt-5 pt-5 border-t border-border">
                    {/* <div className="mt-5 pt-5 border-t border-border">
                      <h3 className="text-sm font-medium mb-1">Listener tags - <span className="italic font-normal text-muted-foreground">optional</span></h3>
                      <TagEditor tags={listener.tags} onChange={(tagId, field, value) => updateListenerTag(listener.id, tagId, field, value)} onRemove={(tagId) => removeListenerTag(listener.id, tagId)} />
                      <button type="button" onClick={() => addListenerTag(listener.id)} className="inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium">
                        Add listener tag
                      </button>
                      <p className="text-[11px] text-muted-foreground mt-2">You can add up to {50 - listener.tags.length} more tags.</p>
                    </div> */}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addListener} className="inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium">
            Add listener
          </button>
          <p className="text-[11px] text-muted-foreground"> You can add up to {remainingListeners} more listeners.</p>
        </Section>

        {/* Tags */}
        {/* <Section id="load-balancer-tags"> */}
        {/* <Collapsible title="Load balancer tags - optional" defaultOpen>
            <TagEditor tags={loadBalancerTags} onChange={updateLoadBalancerTag} onRemove={(tagId) => setLoadBalancerTags((prev) => prev.filter((tag) => tag.id !== tagId))} />
            {/* <button type="button" onClick={() => setLoadBalancerTags((prev) => [...prev, createTagRow()])} className="inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium">
              Add new tag
            </button> */}
        {/* </Collapsible> */}
        {/* </Section> */}

        {/* Summary */}
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



            {/* <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-xs">
              <SumCol title="Service integrations" editable onEdit={() => scrollToSection("service-integrations")}>
                {isAlb && <div>Amazon CloudFront + AWS Web Application Firewall (WAF): -</div>}
                {isAlb && <div>AWS <a className="text-primary hover:underline">WAF</a>: -</div>}
                <div>AWS Global Accelerator: -</div>
              </SumCol>
              <SumCol title="Tags" editable onEdit={() => scrollToSection("load-balancer-tags")}>
                <div>{loadBalancerTags.length ? `${loadBalancerTags.length} tag${loadBalancerTags.length > 1 ? "s" : ""}` : "-"}</div>
              </SumCol>
            </div> */}
          </div>

        </Section>
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Business Justification</h2>
          </div>

          <div className="space-y-3">
            <Textarea
              id="justification"
              className={`w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-1 text-sm ${justificationError ? "border-red-500 ring-1 ring-red-200" : "border-input"
                }`}
              placeholder="Provide a brief justification for this VM request."
              value={justifications}
              onChange={(e) => {
                const value = e.target.value;
                setJustifications(value);
                if (justificationTouched) setJustificationError(value.trim().length > 0 && value.trim().length < 20);
              }}
              onBlur={() => {
                setJustificationTouched(true);
                setJustificationError(justifications.trim().length > 0 && justifications.trim().length < 20);
              }}
              rows={3}
              maxLength={250}
            />
            <div className="flex justify-between items-center">
              {justificationError ? (
                <div className="text-xs text-red-600">
                  Business justification must contain at least 20 characters.
                </div>
              ) : <span />}
              <p className="text-xs text-muted-foreground">{justifications.length}/250</p>
            </div>
          </div>
        </section>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 pb-4 border-b">
              <DialogHeader className="text-center items-center">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Confirm Load Balancer Creation
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Please review the load balancer settings before creating it.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Load balancer type</p>
                  <p className="font-medium text-foreground">{kind}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Scheme</p>
                  <p className="font-medium text-foreground">{scheme}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Load balancer name</p>
                  <p className="font-medium text-foreground">{name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">IP type</p>
                  <p className="font-medium text-foreground">{ipType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">VPC</p>
                  <p className="font-medium text-foreground">{vpc}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Availability Zones</p>
                  <p className="font-medium text-foreground">{azs.length ? azs.join(", ") : "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Security groups</p>
                  <p className="font-medium text-foreground">{sgs.join(", ")}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Listeners</p>
                  <p className="font-medium text-foreground">{listeners.length} listener{listeners.length === 1 ? "" : "s"}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Listener details</p>
                <div className="space-y-3">
                  {listeners.map((listener) => (
                    <div key={listener.id} className="rounded-md border border-border p-3 bg-background/50">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{listener.protocol}:{listener.port}</span>
                        <span className="text-muted-foreground">{listener.action === "forward" ? "Forward" : listener.action === "redirect" ? "Redirect" : "Fixed response"}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div>Target group count: {listener.targetGroups.length}</div>
                        <div>Tags: {listener.tags.length}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Load balancer tags</p>
                <p className="font-medium text-foreground">{loadBalancerTags.length ? loadBalancerTags.map((t) => `${t.key}:${t.value}`).join(", ") : "-"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Business Justification</p>
                <p className="font-medium text-foreground">{justifications || "-"}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Go Back & Edit
                </Button>

                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Create"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>



        {/* Footer actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/aws/load-balancers")}>Cancel</Button>
          <span title={disabledReason ?? undefined}>
            <Button
              onClick={submit}
              disabled={!isFormComplete}
              className="bg-warning text-warning-foreground hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Load Balancer
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, infoTip, children }: { id?: string; title?: string; infoTip?: boolean; children: ReactNode }) {
  return (
    <div id={id} className="border border-border rounded-lg bg-card mb-4 scroll-mt-4">
      {title && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {infoTip && <Info size={14} className="text-primary" />}
        </div>
      )}
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, inline, children }: { label: string; hint?: string; inline?: boolean; children: ReactNode }) {
  return (
    <div className={inline ? "" : ""}>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function RadioCard({ checked, onClick, title, bullets }: { checked: boolean; onClick: () => void; title: string; bullets: string[] }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-left rounded-md border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-accent/20"
        }`}
    >
      <div className="flex items-start gap-2">
        <input type="radio" checked={checked} readOnly className="mt-1 accent-primary" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          <ul className="list-disc pl-4 text-xs text-muted-foreground mt-1 space-y-0.5">
            {bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      </div>
    </button>
  );
}

function TagEditor({
  tags,
  onChange,
  onRemove,
}: {
  tags: TagRow[];
  onChange: (tagId: number, field: "key" | "value", value: string) => void;
  onRemove: (tagId: number) => void;
}) {
  if (!tags.length) return null;
  return (
    <div className="space-y-2 mb-3">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] text-muted-foreground">
        <div>Key</div>
        <div>Value - optional</div>
        <div className="w-[86px]" />
      </div>
      {tags.map((tag) => (
        <div key={tag.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <input value={tag.key} onChange={(e) => onChange(tag.id, "key", e.target.value)} placeholder="Key" className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm" />
          <input value={tag.value} onChange={(e) => onChange(tag.id, "value", e.target.value)} placeholder="Value" className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm" />
          <Button type="button" variant="outline" size="sm" onClick={() => onRemove(tag.id)}>Remove</Button>
        </div>
      ))}
    </div>
  );
}

function SumCol({ title, children, editable, warn, onEdit }: { title: string; children: ReactNode; editable?: boolean; warn?: boolean; onEdit?: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-medium text-foreground">{title}</span>
        {editable && <button type="button" onClick={onEdit} className="text-primary hover:underline text-xs cursor-pointer">Edit</button>}
        {warn && <AlertTriangle size={12} className="text-warning" />}
      </div>
      <div className="text-muted-foreground space-y-0.5">{children}</div>
    </div>
  );
}

function Collapsible({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} className="rotate-90" />}
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function IntegrationCard({
  accent,
  tag,
  title,
  subtitle,
  option,
  benefits,
  considerations,
  enabled,
  onToggle,
  children,
}: {
  accent: string;
  tag?: string;
  title: string;
  subtitle: string;
  option: string;
  benefits: string[];
  considerations: string[];
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-md bg-background/40 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 border border-border/60`}>
          <div className="w-4 h-4 rounded-sm bg-background/80" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium">{title}</div>
            {tag && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/20 text-warning border border-warning/40">{tag}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
          <label className="flex items-start gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!enabled}
              onChange={(e) => onToggle?.(e.target.checked)}
              className="mt-1 accent-primary"
            />
            <span className="text-sm">{option} <a className="text-primary text-xs ml-1 hover:underline">Additional charges apply ↗</a></span>
          </label>
          {enabled && children && (
            <div className="mt-3 pl-6 border-l-2 border-border">{children}</div>
          )}
        </div>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center gap-1.5 text-xs font-medium border-t border-border text-left hover:bg-accent/20"
      >
        {open ? <ChevronDown size={12} /> : <ChevronUp size={12} className="rotate-90" />}
        Benefits and considerations
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border-t border-border bg-card/30">
          <div>
            <div className="text-xs font-medium mb-1.5">Benefits</div>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              {benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium mb-1.5">Considerations</div>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              {considerations.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AlbHowItWorks() {
  return (
    <img
      src="https://a.b.cdn.console.awsstatic.com/a/v1/4W7DRZLCHOQQABQG7A5U4FUW3YT6NW5XVQYTZPECJILICUXBQ5FA/2026-06-18T03-17-56_07d174ccb00f33e/Static/01030e35e897efab51b7c20523feb957.svg"
      alt="ALB how it works"
      className="w-full h-full object-contain"
      width={320}
      height={320}
    />
  );
}

function NlbHowItWorks() {
  return (
    <img
      src="https://a.b.cdn.console.awsstatic.com/a/v1/4W7DRZLCHOQQABQG7A5U4FUW3YT6NW5XVQYTZPECJILICUXBQ5FA/2026-06-18T03-17-56_07d174ccb00f33e/Static/782fe33b3ac3872a65cf305d3bf9ed42.svg"
      alt="NLB how it works"
      className="w-full h-full object-contain"
      width={320}
      height={320}
    />
  );
}

