import { Layers } from "lucide-react";
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
import type { VpcItem } from "@/services/lbApi";
import type { TargetType } from "../targetGroup.types";
import { TARGET_TYPES } from "../targetGroup.constants";
import { RadioRow } from "./RadioRow";
import { HealthCheckSection } from "./HealthCheckSection";

type Props = {
  targetType: TargetType;
  onTargetTypeChange: (value: TargetType) => void;
  name: string;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  nameError: string | null;
  nameCheckLoading: boolean;
  nameExistsError: boolean;
  region: string;
  protocol: string;
  onProtocolChange: (value: string) => void;
  protocolOptions: string[];
  port: string;
  onPortChange: (value: string) => void;
  ipAddressType: "ipv4" | "ipv6";
  onIpAddressTypeChange: (value: "ipv4" | "ipv6") => void;
  activeVpc: VpcItem;
  vpcId: string;
  onVpcIdChange: (value: string) => void;
  showProtocolVersion: boolean;
  protocolVersion: "HTTP1" | "HTTP2" | "GRPC";
  onProtocolVersionChange: (value: "HTTP1" | "HTTP2" | "GRPC") => void;
  healthCheckProtocol: string;
  healthCheckProtocolOptions: string[];
  onHealthCheckProtocolChange: (value: string) => void;
  showHealthCheckPath: boolean;
  healthCheckPath: string;
  onHealthCheckPathChange: (value: string) => void;
  onHealthCheckPathTouched: () => void;
  healthCheckPathError: string | null;
  onCancel: () => void;
  onContinue: () => void;
};

export function TargetGroupDetailsStep({
  targetType,
  onTargetTypeChange,
  name,
  onNameChange,
  onNameBlur,
  nameError,
  nameCheckLoading,
  nameExistsError,
  region,
  protocol,
  onProtocolChange,
  protocolOptions,
  port,
  onPortChange,
  ipAddressType,
  onIpAddressTypeChange,
  activeVpc,
  vpcId,
  onVpcIdChange,
  showProtocolVersion,
  protocolVersion,
  onProtocolVersionChange,
  healthCheckProtocol,
  healthCheckProtocolOptions,
  onHealthCheckProtocolChange,
  showHealthCheckPath,
  healthCheckPath,
  onHealthCheckPathChange,
  onHealthCheckPathTouched,
  healthCheckPathError,
  onCancel,
  onContinue,
}: Props) {
  return (
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
            onValueChange={(v) => onTargetTypeChange(v as TargetType)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {TARGET_TYPES.map((t) => (
              <label
                key={t.value}
                htmlFor={`target-type-${t.value}`}
                onClick={() => !t.disabled && onTargetTypeChange(t.value)}
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
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            placeholder="e.g., splunk-web-tg"
            className={cn("bg-muted/50", nameError && "border-destructive ring-1 ring-destructive/30")}
            maxLength={32}
            spellCheck={false}
          />
          {nameError ? (
            <p className="text-xs text-destructive">{nameError}</p>
          ) : nameCheckLoading ? (
            <p className="text-xs text-muted-foreground">Checking availability...</p>
          ) : nameExistsError ? (
            <p className="text-xs text-destructive">A target group named "{name}" already exists in {region}. Choose a different name.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Accepts: a-z, A-Z, 0-9, and hyphen (-). Can't begin or end with hyphen. 1-32 total characters; Count: {name.length}/32
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <Label>Protocol</Label>
            <Select value={protocol} onValueChange={onProtocolChange}>
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
              onChange={(e) => onPortChange(e.target.value)}
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">1 - 65535</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <Label>IP address type</Label>
          <RadioRow
            checked={ipAddressType === "ipv4"}
            onChange={() => onIpAddressTypeChange("ipv4")}
            title="IPv4"
            desc="Each instance has a default network interface (eth0) that is assigned the primary private IPv4 address. The instance's primary private IPv4 address is the one that will be applied to the target."
          />
          <RadioRow
            disabled={true}
            checked={ipAddressType === "ipv6"}
            onChange={() => onIpAddressTypeChange("ipv6")}
            title="IPv6"
            desc="Each instance you register must have an assigned primary IPv6 address. This is configured on the instance's default network interface (eth0)."
          />
        </div>

        <div className="space-y-3 mb-6">
          <Label>VPC</Label>
          <Select value={vpcId} onValueChange={onVpcIdChange}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Select a VPC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={activeVpc.id}>
                {activeVpc.id} ({activeVpc.name}) — {activeVpc.cidr}
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
              onChange={() => onProtocolVersionChange("HTTP1")}
              title="HTTP1"
              desc="Send requests to targets using HTTP/1.1. Supported when the request protocol is HTTP/1.1 or HTTP/2."
            />
            <RadioRow
              disabled={true}
              checked={protocolVersion === "HTTP2"}
              onChange={() => onProtocolVersionChange("HTTP2")}
              title="HTTP2"
              desc="Send requests to targets using HTTP/2. Supported when the request protocol is HTTP/2 or gRPC, but gRPC-specific features are not available."
            />
            <RadioRow
              disabled={true}
              checked={protocolVersion === "GRPC"}
              onChange={() => onProtocolVersionChange("GRPC")}
              title="gRPC"
              desc="Send requests to targets using gRPC. Supported when the request protocol is gRPC."
            />
          </div>
        )}
      </section>

      <HealthCheckSection
        healthCheckProtocol={healthCheckProtocol}
        healthCheckProtocolOptions={healthCheckProtocolOptions}
        onHealthCheckProtocolChange={onHealthCheckProtocolChange}
        showHealthCheckPath={showHealthCheckPath}
        healthCheckPath={healthCheckPath}
        onHealthCheckPathChange={onHealthCheckPathChange}
        onHealthCheckPathTouched={onHealthCheckPathTouched}
        healthCheckPathError={healthCheckPathError}
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onContinue} className="min-w-[100px]">
          Next
        </Button>
      </div>
    </>
  );
}
