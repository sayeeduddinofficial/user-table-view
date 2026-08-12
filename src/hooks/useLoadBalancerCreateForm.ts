/**
 * useLoadBalancerCreateForm.ts
 * Owns all form state, effects, validation and submission logic for the
 * Load Balancer create flow (LoadBalancerCreate.tsx).
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import {
  lbApi,
  type VpcItem,
  type SubnetItem,
  type SgItem,
  type EipItem,
  type AzItem,
  type ManagedTargetGroup,
  type CreateLbPayload,
  type ExistingLbItem,
  type ProvisioningLbItem,
} from "@/services/lbApi";
import {
  ALLOWED_VPCS,
  DEFAULT_SG_NAME,
  STATIC_SUBNETS_BY_REGION,
  createListener,
  createTargetGroup,
} from "@/components/load-balancers/lbCreate.constants";
import type { ListenerConfig, LbKind, TagRow, TargetGroupRow } from "@/components/load-balancers/lbCreate.types";
import { isValidStatusCode, sanitizePort, sanitizeStatusCode, validateLbName } from "@/utils/lb.utils";

export function useLoadBalancerCreateForm(kind: LbKind) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppStore((s: any) => s.currentUser);
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const { alert, confirm } = useDialog();
  const isAlb = kind === "ALB";

  const [portErrorIds, setPortErrorIds] = useState<number[]>([]);
  const [fixedResponseErrorIds, setFixedResponseErrorIds] = useState<number[]>([]);

  const [vpcError, setVpcError] = useState(false);
  const [subnetError, setSubnetError] = useState(false);
  const [sgError, setSgError] = useState(false);
  const [listenerTgError, setListenerTgError] = useState<number[]>([]);
  const [existingLbs, setExistingLbs] = useState<ExistingLbItem[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingLbDialogOpen, setExistingLbDialogOpen] = useState(false);
  const [justificationError, setJustificationError] = useState(false);
  const [provisioningLb, setProvisioningLb] = useState<ProvisioningLbItem | null>(null);
  const [checkingProvisioning, setCheckingProvisioning] = useState(false);
  const [name, setName] = useState("");
  const [justifications, setJustifications] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(() => searchParams.get("region") ?? "us-east-2");
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
  const [loadBalancerTags, setLoadBalancerTags] = useState<TagRow[]>([]);
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
    setCheckingProvisioning(true);
    lbApi.checkProvisioning(user.id, currentTypeValue as "application" | "network")
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
      setEipOptions(eipRes.elasticIps);
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

    if (provisioningLb) {
      alert({ title: `"${provisioningLb.name}" is still provisioning`, description: "Wait for it to finish before creating another.", severity: "error" });
      return;
    }
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
      console.log("The User data is missing");
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

  return {
    // meta
    isAlb, user, navigate,
    // basic config
    selectedRegion, setSelectedRegion,
    name, setName,
    nameInputRef,
    nameErrorMsg, setNameErrorMsg,
    nameCheckLoading, nameExistsError,
    scheme, setScheme,
    ipType, setIpType,
    ipv6SourceNat, setIpv6SourceNat,
    // network mapping
    vpc, setVpc,
    azs, toggleAz,
    azSubnets, updateAzSubnet, getAzSubnetEntry,
    subnetMap,
    allAzs,
    eipOptions,
    loadingRegion,
    filteredVpcList,
    vpcError, subnetError,
    // security groups
    sgs, setSgs,
    selectedSgId, setSelectedSgId,
    sgOptions,
    loadingVpc,
    sgError,
    // listeners
    listeners, updateListener,
    addListener, removeListener,
    addTargetGroup, updateTargetGroup, removeTargetGroup,
    remainingListeners,
    portErrorIds, setPortErrorIds,
    fixedResponseErrorIds, setFixedResponseErrorIds,
    listenerTgError,
    getFilteredTgOptions,
    primaryListener,
    // target groups panel
    tgOptions, deletingTgId,
    handleCreateTargetGroup, closeCreateTargetGroup, handleTargetGroupCreated, handleDeleteTargetGroup,
    showCreateTargetGroup, searchParams,
    // tags
    loadBalancerTags,
    // justification
    justifications, setJustifications,
    justificationError, setJustificationError,
    isJustificationValid,
    // submit / dialog
    submitted, isDialogOpen, setIsDialogOpen, isSubmitting,
    submit, handleConfirm,
    isFormComplete,
    // existing / provisioning
    existingLbs, checkingExisting, existingLbDialogOpen, setExistingLbDialogOpen,
    provisioningLb, checkingProvisioning,
    disabledReason,
    // misc helpers
    scrollToSection,
  };
}
