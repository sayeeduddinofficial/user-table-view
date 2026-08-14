/**
 * auditConstants.tsx
 * Static configuration (badges, services, stat cards, date presets) for Audit Logs.
 */

import {
  Shield,
  Server,
  Users,
  Settings,
  FileText,
  Database,
} from "lucide-react";
import { AUDIT_CATEGORIES } from "@/types";
import {
  EC2Icon,
  S3Icon,
  VPCIcon,
  LBIcon,
  Route53Icon,
  RDSIcon,
  EKSIcon,
} from "@/components/icons/aws-icons";

export interface CategoryBadgeConfig {
  icon: React.ElementType;
  className: string;
}

export interface ServiceBadgeConfig {
  icon: React.ElementType;
  color: string;
  bgSelected: string;
  shortName: string;
  displayName: string;
  relatedServices?: string[];
}

export const CATEGORY_BADGE_CONFIG: Record<string, CategoryBadgeConfig> = {
  [AUDIT_CATEGORIES.AUTH]: {
    icon: Shield,
    className: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  },
  [AUDIT_CATEGORIES.AWS_OPS]: {
    icon: Server,
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  },
  [AUDIT_CATEGORIES.USER_MGMT]: {
    icon: Users,
    className: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  },
  [AUDIT_CATEGORIES.SETTINGS]: {
    icon: Settings,
    className: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  },
  [AUDIT_CATEGORIES.REQUESTS]: {
    icon: FileText,
    className: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
  },
  S3: {
    icon: Database,
    className: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  },
  "Load Balancer": {
    icon: Server,
    className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
  },
};

export const SERVICE_BADGE_CONFIG: Record<string, ServiceBadgeConfig> = {
  "vm-request-service": {
    icon: EC2Icon,
    color: "text-[#4E79A7]",
    bgSelected: "bg-[#4E79A7]/15 border border-[#4E79A7]/25",
    shortName: "EC2",
    displayName: "EC2",
    relatedServices: ["vm-runtime-service"],
  },
  "vm-runtime-service": {
    icon: EC2Icon,
    color: "text-[#4E79A7]",
    bgSelected: "bg-[#4E79A7]/15 border border-[#4E79A7]/25",
    shortName: "EC2",
    displayName: "EC2",
    relatedServices: ["vm-request-service"],
  },
  "load-balancer-service": {
    icon: LBIcon,
    color: "text-[#E15759]",
    bgSelected: "bg-[#E15759]/15 border border-[#E15759]/25",
    shortName: "ELB",
    displayName: "ELB",
  },
  "rds-service": {
    icon: RDSIcon,
    color: "text-[#9C6ADE]",
    bgSelected: "bg-[#9C6ADE]/15 border border-[#9C6ADE]/25",
    shortName: "RDS",
    displayName: "RDS",
  },
  "route53-service": {
    icon: Route53Icon,
    color: "text-[#76B7B2]",
    bgSelected: "bg-[#76B7B2]/15 border border-[#76B7B2]/25",
    shortName: "Route 53",
    displayName: "Route 53",
  },
  "s3-bucket-service": {
    icon: S3Icon,
    color: "text-[#F28E2B]",
    bgSelected: "bg-[#F28E2B]/15 border border-[#F28E2B]/25",
    shortName: "S3",
    displayName: "S3",
  },
  "vpc-service": {
    icon: VPCIcon,
    color: "text-[#59A14F]",
    bgSelected: "bg-[#59A14F]/15 border border-[#59A14F]/25",
    shortName: "VPC",
    displayName: "VPC",
  },
  "eks-cluster-service": {
    icon: EKSIcon,
    color: "text-[#EDC948]",
    bgSelected: "bg-[#EDC948]/15 border border-[#EDC948]/25",
    shortName: "EKS",
    displayName: "EKS",
  },
};

export interface CategoryStatConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export const CATEGORY_STAT_CONFIG: CategoryStatConfig[] = [
  {
    key: AUDIT_CATEGORIES.AUTH,
    label: AUDIT_CATEGORIES.AUTH,
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: AUDIT_CATEGORIES.AWS_OPS,
    label: AUDIT_CATEGORIES.AWS_OPS,
    icon: Server,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: AUDIT_CATEGORIES.USER_MGMT,
    label: AUDIT_CATEGORIES.USER_MGMT,
    icon: Users,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    key: AUDIT_CATEGORIES.SETTINGS,
    label: AUDIT_CATEGORIES.SETTINGS,
    icon: Settings,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: AUDIT_CATEGORIES.REQUESTS,
    label: AUDIT_CATEGORIES.REQUESTS,
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
];

export const DEFAULT_DATE_RANGE_OPTION = "thisMonth";

export const DEFAULT_AUDIT_PAGINATION = {
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const EMPTY_VM_LIFECYCLE = {
  requested: 0,
  created: 0,
  started: 0,
  stopped: 0,
  destroyed: 0,
};

export const EMPTY_REQUEST_MANAGEMENT = {
  quotaRequests: { pending: 0, approved: 0, rejected: 0 },
  runtimeExtensions: { pending: 0, approved: 0, rejected: 0 },
};