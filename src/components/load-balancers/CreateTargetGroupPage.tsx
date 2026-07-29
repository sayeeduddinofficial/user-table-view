import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layers, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/dialog-context";
import type { VpcItem, TgItem } from "@/services/lbApi";
import { RegisterTargetsStep, type PendingTarget } from "./RegisterTargetsStep";
import { ReviewAndCreateStep } from "./ReviewAndCreateStep";

function RadioRow({
  checked,
  onChange,
  title,
  desc,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  desc?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-2 py-1", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <div>
        <div className="text-sm">{title}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
    </label>
  );
}

type WizardStep = "settings" | "register" | "review";

type TargetType = "instances" | "ip" | "lambda" | "alb";

const TARGET_TYPES: {
  value: TargetType;
  label: string;
  description: string;
  suitable: { label: string; className: string }[];
  disabled?: boolean;
}[] = [
  {
    value: "instances",
    label: "Instances",
    description:
      "Supports load balancing to instances in a VPC. Integrate with Auto Scaling Groups or ECS services for automatic management.",
    suitable: [
      { label: "ALB", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      { label: "NLB", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
      { label: "GWLB", className: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
    ],
  },
  {
    value: "ip",
    label: "IP addresses",
    description:
      "Supports load balancing to VPC and on-premises resources. Facilitates routing to IP addresses and network interfaces on the same instance. Supports IPv6 targets.",
    suitable: [
      { label: "ALB", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      { label: "NLB", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
      { label: "GWLB", className: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
    ],
    disabled: true,
  },
  {
    value: "lambda",
    label: "Lambda function",
    description: "Supports load balancing to a single Lambda function. ALB required as traffic source.",
    suitable: [{ label: "ALB", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }],
    disabled: true,
  },
  {
    value: "alb",
    label: "Application Load Balancer",
    description:
      "Allows use of static IP addresses and PrivateLink with an Application Load Balancer. NLB required as traffic source.",
    suitable: [{ label: "NLB", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" }],
    disabled: true,
  },
];

// Only one VPC is selectable for now — matches the VPC used elsewhere in the load balancer flow.
const SPLUNKOPS_VPC: VpcItem = { id: "vpc-02e99db96569078e6", name: "splunk-poc", cidr: "10.0.0.0/16" };

const HTTP_PROTOCOLS = ["HTTP", "HTTPS"];
const ALB_PROTOCOL_OPTIONS = ["HTTP", "HTTPS"];
const NLB_PROTOCOL_OPTIONS = ["TCP", "UDP", "TCP_UDP", "TLS"];
const NAME_REGEX = /^[a-zA-Z0-9-]{1,32}$/;

function validateTgName(value: string): string | null {
  if (!value) return "Target group name is required.";
  if (value.length > 32) return "Name must be 32 characters or fewer.";
  if (!NAME_REGEX.test(value)) return "Only letters, numbers, and hyphens are allowed.";
  if (value.startsWith("-") || value.endsWith("-")) return "Name can't start or end with a hyphen.";
  return null;
}

type Props = {
  isAlb: boolean;
  vpcList: VpcItem[];
  defaultVpcId?: string;
  onCancel: () => void;
  onCreate: (tg: TgItem) => void;
};

export function CreateTargetGroupPage({ isAlb, onCancel, onCreate }: Props) {
  const { alert } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [targetType, setTargetType] = useState<TargetType>("instances");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [protocol, setProtocol] = useState(isAlb ? "HTTP" : "TCP");
  const [port, setPort] = useState("80");
  const [ipAddressType, setIpAddressType] = useState<"ipv4" | "ipv6">("ipv4");
  const [vpcId, setVpcId] = useState(SPLUNKOPS_VPC.id);
  const [protocolVersion, setProtocolVersion] = useState<"HTTP1" | "HTTP2" | "GRPC">("HTTP1");
  const [healthCheckProtocol, setHealthCheckProtocol] = useState("HTTP");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);

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

  const buildTg = (): TgItem => ({
    arn: `local-${Date.now()}`,
    name,
    protocol,
    port: Number(port),
    loadBalancerArns: [],
  });

  const handleContinueToRegisterTargets = () => {
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

    goToRegisterTargets();
  };

  const handleFinalCreate = () => {
    onCreate(buildTg());
  };

  const targetTypeLabel = TARGET_TYPES.find((t) => t.value === targetType)?.label ?? targetType;
  const vpcLabel = `${SPLUNKOPS_VPC.id} (${SPLUNKOPS_VPC.name})`;

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="max-w-5xl mx-auto space-y-8">
          {step === "register" ? (
            <RegisterTargetsStep
              pendingTargets={pendingTargets}
              onPendingTargetsChange={setPendingTargets}
              onCancel={onCancel}
              onPrevious={backToSettings}
              onNext={goToReview}
            />
          ) : step === "review" ? (
            <ReviewAndCreateStep
              name={name}
              targetTypeLabel={targetTypeLabel}
              protocol={protocol}
              port={port}
              showProtocolVersion={showProtocolVersion}
              protocolVersion={protocolVersion}
              vpcLabel={vpcLabel}
              ipAddressType={ipAddressType}
              healthCheckProtocol={healthCheckProtocol}
              showHealthCheckPath={showHealthCheckPath}
              healthCheckPath={healthCheckPath}
              pendingTargets={pendingTargets}
              onCancel={onCancel}
              onPrevious={goToRegisterTargets}
              onEditSettings={backToSettings}
              onEditTargets={goToRegisterTargets}
              onCreate={handleFinalCreate}
            />
          ) : (
            <>
              <div className="mb-2">
                <h1 className="text-2xl font-semibold">Create target group</h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                  A target group can be made up of one or more targets. Your load balancer routes requests to the
                  targets in a target group and performs health checks on the targets.
                </p>
              </div>

              {/* Settings */}
              <section className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Settings
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Choose a target type and the load balancer and listener will route traffic to your target. These
                  settings can't be modified after target group creation.
                </p>

                <div className="space-y-3 mb-6">
                  <Label>Target type</Label>
                  <RadioGroup
                    value={targetType}
                    onValueChange={(v) => setTargetType(v as TargetType)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {TARGET_TYPES.map((t) => (
                      <label
                        key={t.value}
                        htmlFor={`target-type-${t.value}`}
                        onClick={() => !t.disabled && setTargetType(t.value)}
                        className={cn(
                          "flex gap-3 p-4 rounded-xl border transition",
                          t.disabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          targetType === t.value ? "border-primary bg-primary/10" : "border-muted",
                        )}
                      >
                        <RadioGroupItem
                          value={t.value}
                          id={`target-type-${t.value}`}
                          disabled={t.disabled}
                          className="mt-1 shrink-0"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{t.label}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                          <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            <span className="text-[11px] text-muted-foreground">Suitable for:</span>
                            {t.suitable.map((s) => (
                              <Badge key={s.label} className={cn("border-transparent", s.className)}>
                                {s.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3 mb-6">
                  <Label htmlFor="tg-name">Target group name</Label>
                  <Input
                    id="tg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    placeholder="e.g., splunk-web-tg"
                    className={cn("bg-muted/50", nameError && "border-destructive ring-1 ring-destructive/30")}
                    maxLength={32}
                    spellCheck={false}
                  />
                  {nameError ? (
                    <p className="text-xs text-destructive">{nameError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Accepts: a-z, A-Z, 0-9, and hyphen (-). Can't begin or end with hyphen. 1-32 total characters; Count:{" "}
                      {name.length}/32
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <Label>Protocol</Label>
                    <Select value={protocol} onValueChange={setProtocol}>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {protocolOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="tg-port">Port</Label>
                    <Input
                      id="tg-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">1 - 65535</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Label>IP address type</Label>
                  <RadioRow
                    checked={ipAddressType === "ipv4"}
                    onChange={() => setIpAddressType("ipv4")}
                    title="IPv4"
                    desc="Each instance has a default network interface (eth0) that is assigned the primary private IPv4 address. The instance's primary private IPv4 address is the one that will be applied to the target."
                  />
                  <RadioRow
                    disabled={true}
                    checked={ipAddressType === "ipv6"}
                    onChange={() => setIpAddressType("ipv6")}
                    title="IPv6"
                    desc="Each instance you register must have an assigned primary IPv6 address. This is configured on the instance's default network interface (eth0)."
                  />
                </div>

                <div className="space-y-3 mb-6">
                  <Label>VPC</Label>
                  <Select value={vpcId} onValueChange={setVpcId}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select a VPC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SPLUNKOPS_VPC.id}>
                        {SPLUNKOPS_VPC.id} ({SPLUNKOPS_VPC.name}) — {SPLUNKOPS_VPC.cidr}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the VPC with the instances that you want to include in the target group.
                  </p>
                </div>

                {showProtocolVersion && (
                  <div className="space-y-3">
                    <Label>Protocol version</Label>
                    <RadioRow
                      checked={protocolVersion === "HTTP1"}
                      onChange={() => setProtocolVersion("HTTP1")}
                      title="HTTP1"
                      desc="Send requests to targets using HTTP/1.1. Supported when the request protocol is HTTP/1.1 or HTTP/2."
                    />
                    <RadioRow
                      disabled={true}
                      checked={protocolVersion === "HTTP2"}
                      onChange={() => setProtocolVersion("HTTP2")}
                      title="HTTP2"
                      desc="Send requests to targets using HTTP/2. Supported when the request protocol is HTTP/2 or gRPC, but gRPC-specific features are not available."
                    />
                    <RadioRow
                      disabled={true}
                      checked={protocolVersion === "GRPC"}
                      onChange={() => setProtocolVersion("GRPC")}
                      title="gRPC"
                      desc="Send requests to targets using gRPC. Supported when the request protocol is gRPC."
                    />
                  </div>
                )}
              </section>

              {/* Health checks */}
              <section className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  Health checks
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  The associated load balancer periodically sends requests, per the settings below, to the registered
                  targets to test their status.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Health check protocol</Label>
                    <Select value={healthCheckProtocol} onValueChange={setHealthCheckProtocol}>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HTTP">HTTP</SelectItem>
                        <SelectItem value="HTTPS">HTTPS</SelectItem>
                        <SelectItem value="TCP">TCP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showHealthCheckPath && (
                    <div className="space-y-3">
                      <Label htmlFor="hc-path">Health check path</Label>
                      <Input
                        id="hc-path"
                        value={healthCheckPath}
                        onChange={(e) => setHealthCheckPath(e.target.value)}
                        className="bg-muted/50"
                        maxLength={1024}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use the default path of "/" to perform health checks on the root, or specify a custom path.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={handleContinueToRegisterTargets} className="min-w-[100px]">
                  Next
                </Button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
