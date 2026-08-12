import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { lbApi, type ManagedTargetGroup, type CreateTgPayload, type VpcItem } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";
import {
  ALB_PROTOCOL_OPTIONS,
  DEFAULT_PORT_BY_PROTOCOL,
  HTTP_PROTOCOLS,
  NLB_PROTOCOL_OPTIONS,
  REGION_VPC,
  TARGET_TYPE_TO_API,
  validateHealthCheckPath,
  validateTgName,
} from "@/components/load-balancers/targetGroup.constants";
import type { PendingTarget, TargetType, WizardStep } from "@/components/load-balancers/targetGroup.types";

type UseTargetGroupCreateFormArgs = {
  isAlb: boolean;
  vpcList: VpcItem[];
  defaultVpcId?: string;
  region: string;
  userId: number;
  onCreate: (tg: ManagedTargetGroup) => void;
};

export function useTargetGroupCreateForm({ isAlb, vpcList, defaultVpcId, region, userId, onCreate }: UseTargetGroupCreateFormArgs) {
  const activeVpc = vpcList.find((v) => v.id === (defaultVpcId ?? vpcList[0]?.id)) ?? REGION_VPC[region] ?? REGION_VPC["us-east-2"];

  const { alert } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vpcId, setVpcId] = useState(defaultVpcId || activeVpc.id);
  const [targetType, setTargetType] = useState<TargetType>("instances");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [protocol, setProtocol] = useState(isAlb ? "HTTP" : "TCP");

  const healthCheckProtocolOptions = HTTP_PROTOCOLS.includes(protocol)
    ? ["HTTP", "HTTPS"]
    : ["HTTP", "HTTPS", "TCP"];

  const [port, setPort] = useState("80");
  const [ipAddressType, setIpAddressType] = useState<"ipv4" | "ipv6">("ipv4");
  const [protocolVersion, setProtocolVersion] = useState<"HTTP1" | "HTTP2" | "GRPC">("HTTP1");
  const [healthCheckProtocol, setHealthCheckProtocol] = useState("HTTP");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);

  // keep healthCheckProtocol valid whenever the main protocol changes
  useEffect(() => {
    if (!healthCheckProtocolOptions.includes(healthCheckProtocol)) {
      setHealthCheckProtocol(healthCheckProtocolOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol]);

  useEffect(() => {
    if (protocol in DEFAULT_PORT_BY_PROTOCOL) {
      setPort(DEFAULT_PORT_BY_PROTOCOL[protocol]);
    }
  }, [protocol]);

  useEffect(() => {
    if (defaultVpcId) setVpcId(defaultVpcId);
  }, [defaultVpcId]);

  const protocolOptions = isAlb ? ALB_PROTOCOL_OPTIONS : NLB_PROTOCOL_OPTIONS;
  const showProtocolVersion = isAlb && HTTP_PROTOCOLS.includes(protocol);
  const showHealthCheckPath = HTTP_PROTOCOLS.includes(healthCheckProtocol);
  const nameError = nameTouched ? validateTgName(name) : null;

  const stepParam = searchParams.get("step");
  const step: WizardStep = stepParam === "review" ? "review" : stepParam === "register-targets" ? "register" : "settings";

  const goToRegisterTargets = () => {
    const next = new URLSearchParams(searchParams);
    next.set("step", "register-targets");
    setSearchParams(next);
  };

  const goToReview = () => {
    const next = new URLSearchParams(searchParams);
    next.set("step", "review");
    setSearchParams(next);
  };

  const backToSettings = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("step");
    setSearchParams(next);
  };

  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameExistsError, setNameExistsError] = useState(false);
  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);
    if (!name || validateTgName(name)) {
      setNameExistsError(false);
      setNameCheckLoading(false);
      return;
    }
    setNameCheckLoading(true);
    nameCheckTimer.current = setTimeout(() => {
      lbApi.checkTgName(name, region)
        .then((res) => setNameExistsError(!!res.exists))
        .catch(() => setNameExistsError(false)) // fail open
        .finally(() => setNameCheckLoading(false));
    }, 500);
    return () => { if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current); };
  }, [name, region]);

  const [healthCheckPathTouched, setHealthCheckPathTouched] = useState(false);

  const healthCheckPathError = healthCheckPathTouched
    ? validateHealthCheckPath(healthCheckProtocol, healthCheckPath)
    : null;

  const handleContinueToRegisterTargets = () => {
    if (nameExistsError || nameCheckLoading) {
      alert({ title: nameCheckLoading ? "Still checking name availability, please wait." : `A target group named "${name}" already exists in ${region}.`, severity: "error" });
      return;
    }
    setNameTouched(true);
    const err = validateTgName(name);
    if (err) {
      alert({ title: err, severity: "error" });
      return;
    }

    const portNum = Number(port);
    if (!portNum || portNum < 1 || portNum > 65535) {
      alert({ title: "Port must be between 1 and 65535.", severity: "error" });
      return;
    }

    if (!vpcId) {
      alert({ title: "Please select a VPC.", severity: "error" });
      return;
    }

    if (HTTP_PROTOCOLS.includes(healthCheckProtocol)) {
      setHealthCheckPathTouched(true);
      const hcErr = validateHealthCheckPath(healthCheckProtocol, healthCheckPath);
      if (hcErr) {
        alert({ title: hcErr, severity: "error" });
        return;
      }
    }

    goToRegisterTargets();
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleFinalCreate = async () => {
    setIsCreating(true);
    try {
      const payload: CreateTgPayload = {
        user_id: userId,
        name,
        protocol,
        port: Number(port),
        vpc_id: vpcId,
        region,
        target_type: TARGET_TYPE_TO_API[targetType],
        ...(showProtocolVersion && { protocol_version: protocolVersion }),
        health_check_protocol: healthCheckProtocol,
        ...(showHealthCheckPath && { health_check_path: healthCheckPath }),
        targets: pendingTargets.map((t) => ({
          instance_id: t.instanceId,
          port: Number(t.port),
        })),
      };

      const response = await lbApi.createTargetGroup(payload);
      onCreate(response.data);
    } catch (error: any) {
      alert({
        title: "Failed to create target group",
        description: error?.response?.data?.error ?? error?.message ?? "Something went wrong.",
        severity: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return {
    activeVpc,
    vpcId,
    setVpcId,
    targetType,
    setTargetType,
    name,
    setName,
    nameTouched,
    setNameTouched,
    protocol,
    setProtocol,
    healthCheckProtocolOptions,
    port,
    setPort,
    ipAddressType,
    setIpAddressType,
    protocolVersion,
    setProtocolVersion,
    healthCheckProtocol,
    setHealthCheckProtocol,
    healthCheckPath,
    setHealthCheckPath,
    pendingTargets,
    setPendingTargets,
    protocolOptions,
    showProtocolVersion,
    showHealthCheckPath,
    nameError,
    step,
    goToRegisterTargets,
    goToReview,
    backToSettings,
    nameCheckLoading,
    nameExistsError,
    healthCheckPathTouched,
    setHealthCheckPathTouched,
    healthCheckPathError,
    handleContinueToRegisterTargets,
    isCreating,
    handleFinalCreate,
  };
}
