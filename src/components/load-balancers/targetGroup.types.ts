import type { VpcItem } from "@/services/lbApi";

export type WizardStep = "settings" | "register" | "review";

export type TargetType = "instances" | "ip" | "lambda" | "alb";

export type TargetTypeOption = {
  value: TargetType;
  label: string;
  description: string;
  suitable: { label: string; className: string }[];
  disabled?: boolean;
};

export type InstanceRow = {
  id: string;
  instanceId: string;
  name: string;
  state: string;
  securityGroups: string;
  zone: string;
  subnetId: string;
  privateIpv4: string;
};

export type PendingTarget = InstanceRow & { port: string; launchTime: string };

export type { VpcItem };
