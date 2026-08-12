import type { VpcItem } from "@/services/lbApi";
import type { TargetType, TargetTypeOption } from "./targetGroup.types";

export const TARGET_TYPES: TargetTypeOption[] = [
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
export const SPLUNKOPS_VPC: VpcItem = { id: "vpc-02e99db96569078e6", name: "splunk-poc", cidr: "10.0.0.0/16" };
export const REGION_VPC: Record<string, VpcItem> = {
  "us-east-2": { id: "vpc-02e99db96569078e6", name: "splunk-poc", cidr: "10.0.0.0/16" },
  "us-east-1": { id: "vpc-00f1dd2c4bab98af5", name: "Splunk-Poc", cidr: "10.0.0.0/16" }, // update name/cidr if different
};

export const HTTP_PROTOCOLS = ["HTTP", "HTTPS"];
export const ALB_PROTOCOL_OPTIONS = ["HTTP", "HTTPS"];
export const NLB_PROTOCOL_OPTIONS = ["TCP", "UDP", "TCP_UDP", "TLS"];
export const NAME_REGEX = /^[a-zA-Z0-9-]{1,32}$/;

export const DEFAULT_PORT_BY_PROTOCOL: Record<string, string> = {
  TCP: "80",
  UDP: "53",
  TCP_UDP: "53",
  TLS: "443",
};

export const TARGET_TYPE_TO_API: Record<TargetType, "instance" | "ip" | "lambda"> = {
  instances: "instance",
  ip: "ip",
  lambda: "lambda",
  alb: "instance",
};

export function validateTgName(value: string): string | null {
  if (!value) return "Target group name is required.";
  if (value.length > 32) return "Name must be 32 characters or fewer.";
  if (!NAME_REGEX.test(value)) return "Only letters, numbers, and hyphens are allowed.";
  if (value.startsWith("-") || value.endsWith("-")) return "Name can't start or end with a hyphen.";
  return null;
}

export function validateHealthCheckPath(protocol: string, path: string): string | null {
  if (!HTTP_PROTOCOLS.includes(protocol)) return null; // not applicable for TCP
  if (!path || !path.startsWith("/") || path.length > 1024) {
    return "Health check path must begin with a '/' and be no longer than 1024 characters.";
  }
  return null;
}
