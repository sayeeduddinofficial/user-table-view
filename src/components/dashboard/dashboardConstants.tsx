/**
 * dashboardConstants.tsx
 * Static configuration (status badges, service icons and colors) for the Dashboard.
 */

import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import {
  EC2Icon,
  RDSIcon,
  S3Icon,
  VPCIcon,
  LBIcon,
  Route53Icon,
  EKSIcon,
} from "@/components/icons/aws-icons";

export interface RequestStatusConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  animate?: boolean;
}

const RUNNING: RequestStatusConfig = {
  icon: Loader2,
  color: "text-primary",
  bg: "bg-primary/10",
  label: "Running",
  animate: true,
};

const RETRYING: RequestStatusConfig = {
  icon: Loader2,
  color: "text-warning",
  bg: "bg-warning/10",
  label: "Retrying",
  animate: true,
};

export const DEFAULT_STATUS_CONFIG: RequestStatusConfig = {
  icon: Clock,
  color: "text-muted-foreground",
  bg: "bg-muted",
  label: "Unknown",
  animate: false,
};

export const REQUEST_STATUS_CONFIG: Record<string, RequestStatusConfig> = {
  pending: { ...DEFAULT_STATUS_CONFIG, label: "Pending" },
  running: RUNNING,
  provisioning: RUNNING,
  starting: { ...RUNNING, label: "Starting" },
  stopping: {
    icon: Loader2,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Stopping",
    animate: true,
  },
  terminating: {
    icon: Loader2,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Terminating",
    animate: true,
  },
  terminated: {
    icon: Loader2,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Terminated",
    animate: true,
  },
  stopped: {
    icon: PauseCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Stopped",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Failed",
  },
  destroyed: {
    icon: Trash2,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Terminated",
  },
  destroying: {
    icon: Trash2,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    label: "Terminating",
    animate: true,
  },
  retrying: RETRYING,
  retrying_terminate: RETRYING,
  retrying_provision: RETRYING,
};

export const SERVICE_ICON_MAP = {
  ec2: EC2Icon,
  vpc: VPCIcon,
  lb: LBIcon,
  s3: S3Icon,
  rds: RDSIcon,
  route53: Route53Icon,
  eks: EKSIcon,
} as const;

export const SERVICE_COLORS: Record<string, string> = {
  EC2: "#3B82F6",
  VPC: "#8B5CF6",
  LB: "#F97316",
  "Load Balancers": "#F97316",
  S3: "#10B981",
  RDS: "#06B6D4",
  Route53: "#EC4899",
  "Route 53": "#EC4899",
  EKS: "#FACC15",
};

export const DEFAULT_SERVICE_COLOR = "#3B82F6";

export const STAKEHOLDER_ROLE = "SplunkOps.Stakeholder";

export const RECENT_REQUESTS_LIMIT = 5;