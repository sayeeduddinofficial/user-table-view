import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import { Header } from "../layout/Header";
import { CreateLbPayload } from "@/services/lbApi";
import { lbApi, type VpcItem, type SubnetItem, type SgItem, type EipItem, type AzItem, type ManagedTargetGroup } from "@/services/lbApi";
import { CreateTargetGroupPage } from "./CreateTargetGroupPage";
import { STATIC_SUBNETS_BY_REGION, createTargetGroup, createListener, LB_NAME_REGEX, DEFAULT_SG_NAME } from "./lbCreate.constants";
import type { ListenerConfig, TargetGroupRow, TagRow, LbKind } from "./lbCreate.types";
import { Collapsible, AlbHowItWorks, NlbHowItWorks, Section } from "./lbCreateShared";
import { LbBasicConfigSection } from "./create/LbBasicConfigSection";
import { LbNetworkMappingSection } from "./create/LbNetworkMappingSection";
import { LbSecurityGroupsSection } from "./create/LbSecurityGroupsSection";
import { LbListenersSection } from "./create/LbListenersSection";
import { LbSummarySection } from "./create/LbSummarySection";
import { LbConfirmDialog } from "./create/LbConfirmDialog";
import { LbBusinessJustificationSection } from "./create/LbBusinessJustificationSection";
import { LbFooterActions } from "./create/LbFooterActions";

interface Props {
  kind: LbKind;
}

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
  const { alert, confirm } = useDialog()
  const isAlb = kind === "ALB";
  const title = isAlb ? "Create Application Load Balancer" : "Create Network Load Balancer";
  const subtitle = isAlb
    ? "The Application Load Balancer distributes incoming HTTP and HTTPS traffic across multiple targets such as Amazon EC2 instances, microservices, and containers, based on request attributes. When the load balancer receives a connection request, it evaluates the listener rules in priority order to determine which rule to apply, and if applicable, it selects a target from the target group for the rule action."
    : "The Network Load Balancer distributes incoming TCP and UDP traffic across multiple targets such as Amazon EC2 instances, microservices, and containers. When the load balancer receives a connection request, it selects a target based on the protocol and port that are specified in the listener configuration, and the routing rule specified as the default action.";

  const [portErrorIds, setPortErrorIds] = useState<number[]>([]);

  const isValidStatusCode = (code: string) => /^[245]\d\d$/.test(code);

  const [fixedResponseErrorIds, setFixedResponseErrorIds] = useState<number[]>([]);

  const [vpcError, setVpcError] = useState(false);
  const [subnetError, setSubnetError] = useState(false);
  const [sgError, setSgError] = useState(false);
  const [listenerTgError, setListenerTgError] = useState<number[]>([]);
  const [existingLbs, setExistingLbs] = useState<import("@/services/lbApi").ExistingLbItem[]>([]);
  const [justificationError, setJustificationError] = useState(false);
  const [provisioningLb, setProvisioningLb] = useState<import("@/services/lbApi").ProvisioningLbItem | null>(null);
  const [name, setName] = useState("");
  const [justifications, setJustifications] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(
    () => searchParams.get("region") ?? "us-east-2"
  );
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
  const [loadBalancerTags] = useState<TagRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isJustificationValid = justifications.trim().length >= 20;
  const primaryListener = listeners[0] ?? createListener(1, isAlb);

  const [vpc, setVpc] = useState("");
  const [azs, setAzs] = useState<string[]>([]);
  const [sgs, setSgs] = useState<string[]>([]);
  const [selectedSgId, setSelectedSgId] = useState("");
  const [vpcList, setVpcList] = useState<VpcItem[]>([]);
  const [subnetMap, setSubnetMap] = useState<Record<string, SubnetItem[]>>({});
  const [sgOptions, setSgOptions] = useState<SgItem[]>([]);
  const [tgOptions, setTgOptions] = useState<ManagedTargetGroup[]>([]);
  const getFilteredTgOptions = (listenerProtocol: string) =>
    tgOptions.filter(
      (tg) => tg.protocol === listenerProtocol && tg.vpc_id === vpc && tg.region === selectedRegion
    );
  const ALLOWED_VPCS: Record<string, string> = {
    "us-east-2": "vpc-02e99db96569078e6",
    "us-east-1": "vpc-00f1dd2c4bab98af5",
  };

  const filteredVpcList = ALLOWED_VPCS[selectedRegion]
    ? vpcList.filter((v) => v.id === ALLOWED_VPCS[selectedRegion])
    : vpcList;

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

  useEffect(() => {
    if (!submitted) return;
    setJustificationError(justifications.trim().length < 20);
  }, [justifications, submitted]);

  useEffect(() => {
    if (!submitted) return;
    const badListeners = listeners
      .filter((l) => l.action === "forward" && !l.targetGroups.some((t) => t.group))
      .map((l) => l.id);
    setListenerTgError(badListeners);
  }, [listeners, submitted]);

  useEffect(() => {
    if (!submitted) return;
    if (vpc) setVpcError(false);
  }, [vpc, submitted]);

  useEffect(() => {
    if (!submitted) return;
    if (!isAlb || sgs.length > 0) setSgError(false);
  }, [sgs, submitted]);

  useEffect(() => {
    if (!submitted) return;
    const missingSubnet = azs.length < 2 || azs.some((az) => !azSubnets[az]?.subnet);
    setSubnetError(missingSubnet);
  }, [azs, azSubnets, submitted]);

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
    lbApi.checkProvisioning(user.id, currentTypeValue as "application" | "network")
      .then((res) => setProvisioningLb(res.loadBalancer ?? null))
      .catch(() => setProvisioningLb(null));
  }, [user?.id, currentTypeValue]);

  useEffect(() => {
    if (!selectedRegion) return;
    lbApi.checkExisting(selectedRegion)
      .then((res) => {
        const all = res.loadBalancers ?? [];
        setExistingLbs(all);
      })
      .catch(() => setExistingLbs([]));
  }, [selectedRegion, currentTypeValue]);


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
      void eipRes;
    }).finally(() => setLoadingRegion(false));
  }, [selectedRegion]);

  useEffect(() => {
    if (!vpc || !selectedRegion) return;
    setLoadingVpc(true);
    Promise.all([
      lbApi.securityGroups(selectedRegion, vpc).catch(() => ({ securityGroups: [] as SgItem[] })),
      lbApi.listManagedTargetGroups().catch(() => ({ data: [] as ManagedTargetGroup[] })),
    ]).then(([sgRes, tgRes]) => {
      setSgOptions(sgRes.securityGroups);
      setTgOptions(tgRes.data);
      if (sgs.length === 0 && sgRes.securityGroups.length > 0) {
        const defaultSg = sgRes.securityGroups.find((sg) => sg.name.toLowerCase() === DEFAULT_SG_NAME.toLowerCase());
        const selectedSg = defaultSg ? defaultSg.id : sgRes.securityGroups[0].id;
        setSgs([selectedSg]);
        setSelectedSgId(selectedSg);
      }
    }).finally(() => setLoadingVpc(false));
  }, [vpc, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion) {
      setSubnetMap({});
      return;
    }

    const regionSubnets = STATIC_SUBNETS_BY_REGION[selectedRegion] ?? [];
    const nextSubnetMap = regionSubnets.reduce<Record<string, SubnetItem[]>>((acc, subnet) => {
      const key = subnet.az;
      if (!acc[key]) acc[key] = [];
      acc[key].push(subnet);
      return acc;
    }, {});

    setSubnetMap(nextSubnetMap);

    setAzSubnets((prev) => {
      const next = { ...prev };
      let changed = false;

      azs.forEach((az) => {
        const subnetsForAz = nextSubnetMap[az] ?? [];
        if (!next[az]?.subnet && subnetsForAz.length === 1) {
          next[az] = getAzSubnetEntry(next[az]);
          next[az].subnet = subnetsForAz[0].id;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [azs, selectedRegion]);


  const toggleAz = (az: string) =>
    setAzs((p) => (p.includes(az) ? p.filter((x) => x !== az) : [...p, az]));

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

  async function submit() {
    setSubmitted(true);
    let valid = true;

    const nameValidationError = validateLbName(name);
    if (nameValidationError) {
      setNameErrorMsg(nameValidationError);
      if (valid) {
        nameInputRef.current?.focus();
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      valid = false;
    } else {
      setNameErrorMsg(null);
    }

    if (!vpc) {
      setVpcError(true);
      if (valid) document.getElementById("network-mapping")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    } else {
      setVpcError(false);
    }

    const missingSubnet = azs.length < 2 || azs.some((az) => !azSubnets[az]?.subnet);
    if (missingSubnet) {
      setSubnetError(true);
      if (valid) document.getElementById("network-mapping")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    } else {
      setSubnetError(false);
    }

    if (isAlb && sgs.length === 0) {
      setSgError(true);
      if (valid) document.getElementById("security-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    } else {
      setSgError(false);
    }

    const badListeners = listeners
      .filter((l) => l.action === "forward" && !l.targetGroups.some((t) => t.group))
      .map((l) => l.id);
    setListenerTgError(badListeners);
    if (badListeners.length > 0) {
      if (valid) document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    }

    const badPorts = listeners
      .filter((l) => !l.port || l.port < 1 || l.port > 65535)
      .map((l) => l.id);
    setPortErrorIds(badPorts);
    if (badPorts.length > 0) {
      if (valid) document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    }

    const badFixedResponses = listeners
      .filter((l) => l.action === "fixed-response" && !isValidStatusCode(l.fixedResponseCode))
      .map((l) => l.id);
    setFixedResponseErrorIds(badFixedResponses);
    if (badFixedResponses.length > 0) {
      if (valid) document.getElementById("listeners-routing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      valid = false;
    }

    if (justifications.trim().length < 20) {
      setJustificationError(true);
      if (valid) document.getElementById("justification")?.scrollIntoView({ behavior: "smooth", block: "center" });
      valid = false;
    } else {
      setJustificationError(false);
    }

    if (nameCheckLoading || nameExistsError) {
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      valid = false;
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

  useEffect(() => {
    if (showCreateTargetGroup) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [showCreateTargetGroup]);

  const handleCreateTargetGroup = () => {
    if (!user?.id) {
    alert({
      title: `The User data is missing`,
      severity: "error",
    });
    }
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
    next.delete("step");
    setSearchParams(next);
  };

  const handleTargetGroupCreated = (tg: ManagedTargetGroup) => {
    setTgOptions((prev) => [
      ...prev,
      {
        ...tg, is_used: false, used_by: [] // freshly created — not attached to any LB yet
      },
    ]);
    alert({
      title: `Target group "${tg.name}" created successfully`,
      severity: "success",
    });
    closeCreateTargetGroup();
  };

  const [deletingTgId, setDeletingTgId] = useState<string | null>(null);

  const handleDeleteTargetGroup = async (tg: ManagedTargetGroup, e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (tg.is_used) {
      alert({ title: "Can't delete this target group", description: `"${tg.name}" is attached to a load balancer. Remove it from the listener first.`, severity: "error" });
      return;
    }

    const confirmed = await confirm({
      title: `Delete target group "${tg.name}"?`,
      description: "This can't be undone.",
      icon: "destroy",
    });
    if (!confirmed) return;

    setDeletingTgId(tg.id);
    try {
      await lbApi.deleteManagedTargetGroup(tg.id);

      setTgOptions((prev) => prev.filter((t) => t.id !== tg.id));

      // Clear it out of any listener row that had it selected
      setListeners((prev) => prev.map((l) => ({
        ...l,
        targetGroups: l.targetGroups.map((t) => (t.group === tg.arn ? { ...t, group: "" } : t)),
      })));

      alert({ title: `Target group "${tg.name}" deleted`, severity: "success" });
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      alert({
        title: status === 409 ? "Target group is in use" : "Failed to delete target group",
        description: err?.response?.data?.error ?? err?.message ?? "Something went wrong.",
        severity: "error",
      });
    } finally {
      setDeletingTgId(null);
    }
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
            region={selectedRegion}
            userId={user?.id as number}
            onCancel={closeCreateTargetGroup}
            onCreate={handleTargetGroupCreated}
          />
        </div>


      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title="Load Balancers" subtitle=""
        showSearch={false}
      />
      <div className="space-y-4 p-6 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
          <LbBasicConfigSection
            isAlb={isAlb}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            name={name}
            setName={setName}
            nameInputRef={nameInputRef}
            nameErrorMsg={nameErrorMsg}
            setNameErrorMsg={setNameErrorMsg}
            nameCheckLoading={nameCheckLoading}
            nameExistsError={nameExistsError}
            submitted={submitted}
            scheme={scheme}
            setScheme={setScheme}
            ipType={ipType}
            setIpType={setIpType}
          />

          {/* Network mapping */}
          <LbNetworkMappingSection
            isAlb={isAlb}
            vpc={vpc}
            setVpc={setVpc}
            filteredVpcList={filteredVpcList}
            loadingRegion={loadingRegion}
            submitted={submitted}
            vpcError={vpcError}
            ipType={ipType}
            ipv6SourceNat={ipv6SourceNat}
            setIpv6SourceNat={setIpv6SourceNat}
            allAzs={allAzs}
            azs={azs}
            toggleAz={toggleAz}
            azSubnets={azSubnets}
            getAzSubnetEntry={getAzSubnetEntry}
            updateAzSubnet={updateAzSubnet}
            subnetMap={subnetMap}
            subnetError={subnetError}
          />

          {/* Security groups */}
          <LbSecurityGroupsSection
            isAlb={isAlb}
            sgOptions={sgOptions}
            selectedSgId={selectedSgId}
            setSelectedSgId={setSelectedSgId}
            sgs={sgs}
            setSgs={setSgs}
            vpc={vpc}
            loadingVpc={loadingVpc}
            submitted={submitted}
            sgError={sgError}
          />

          {/* Listeners */}
          <LbListenersSection
            isAlb={isAlb}
            listeners={listeners}
            updateListener={updateListener}
            removeListener={removeListener}
            addListener={addListener}
            remainingListeners={remainingListeners}
            portErrorIds={portErrorIds}
            setPortErrorIds={setPortErrorIds}
            fixedResponseErrorIds={fixedResponseErrorIds}
            setFixedResponseErrorIds={setFixedResponseErrorIds}
            listenerTgError={listenerTgError}
            submitted={submitted}
            getFilteredTgOptions={getFilteredTgOptions}
            handleCreateTargetGroup={handleCreateTargetGroup}
            deletingTgId={deletingTgId}
            handleDeleteTargetGroup={handleDeleteTargetGroup}
            addTargetGroup={addTargetGroup}
            updateTargetGroup={updateTargetGroup}
            removeTargetGroup={removeTargetGroup}
          />

          {/* Summary */}
          <LbSummarySection
            name={name}
            scheme={scheme}
            ipType={ipType}
            vpc={vpc}
            azs={azs}
            sgs={sgs}
            primaryListener={primaryListener}
            listeners={listeners}
            scrollToSection={scrollToSection}
          />
          <LbBusinessJustificationSection
            justifications={justifications}
            setJustifications={(value) => {
              setJustifications(value);
              if (submitted) setJustificationError(value.trim().length < 20);
            }}
            justificationError={justificationError}
            submitted={submitted}
          />

          <LbConfirmDialog
            kind={kind}
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            scheme={scheme}
            name={name}
            ipType={ipType}
            vpc={vpc}
            azs={azs}
            sgs={sgs}
            listeners={listeners}
            justifications={justifications}
            isSubmitting={isSubmitting}
            handleConfirm={handleConfirm}
          />

          <LbFooterActions
            onCancel={() => navigate("/aws/load-balancers")}
            onSubmit={submit}
          />
        </div>
      </div>
    </div>
  );
}