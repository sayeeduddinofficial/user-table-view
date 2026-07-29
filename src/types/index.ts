export type Role = "SplunkOps.Admin" | "SplunkOps.User" | "SuperAdmin" | "SplunkOps.Auditor" | "SplunkOps.Stakeholder";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  status: "ACTIVE" | "DEACTIVATED" | "INVITED";
  maxVMs: number;
  maxBuckets: number;
  maxVpcs: number;
  currentVMs: number;
  allowedInstanceTypes: string[];
  allowedCategories: CategoryType[];
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
  profile_image_url?: string;
  createdAt: Date;
  lastActive: Date;
  displayName?: string;
  entraObjectId: string;
  activeVMs: number;
  provisioningVMs: number;
  maxLoadBalancers: number;
  maxRdsClusters: number;
  maxEksClusters: number;
  maxDnsRecords: number;
}

export interface VMRole {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
}

export type DeploymentMode = "single-region" | "multi-region";
export type EnvironmentTag = "dev" | "qa" | "prod" | "lab";
export type CategoryType = 1 | 2 | 3 | 4 | 5;

export interface VMRequest {
  id: string;
  userId: string;
  userName: string;
  status: "pending" | "running" | "completed" | "failed" | "destroyed";
  action: "create" | "destroy";
  environmentType: "training" | "non-training";
  environmentTag: EnvironmentTag;
  projectIdentifier: string;
  deploymentMode: DeploymentMode;
  namingPrefix: string;
  region: string;
  regions: string[]; // For multi-region deployments
  availabilityZone: string;
  diskSize: number;
  sshKeyId?: string;
  sshKeyName?: string;
  roles: VMRoleConfig[];
  createdAt: Date;
  completedAt?: Date;
  vms?: VMInstance[];
}

export interface VMRoleConfig {
  roleId: string;
  roleName: string;
  count: number;
  instanceType: string;
}

export interface VMInstance {
  id: string;
  name: string;
  role: string;
  publicIp: string;
  privateIp: string;
  status: "running" | "stopped" | "terminated";
  instanceType: string;
}

export interface TerraformLog {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
  requestId: string;
}

export interface InstanceTypeOption {
  value: string;
  label: string;
  vcpu: number;
  memory: string;
  category: "general" | "compute" | "memory" | "mac";
}

export const VM_ROLES: VMRole[] = [
  {
    id: "sh",
    name: "Search Head",
    shortName: "SH",
    icon: "🔍",
    description: "Handles search queries and presents results",
  },
  {
    id: "idx",
    name: "Indexer",
    shortName: "IDX",
    icon: "📊",
    description: "Indexes and stores incoming data",
  },
  {
    id: "cm",
    name: "Cluster Manager",
    shortName: "CM",
    icon: "🎛️",
    description: "Manages indexer cluster",
  },
  {
    id: "uf",
    name: "Universal Forwarder",
    shortName: "UF",
    icon: "📤",
    description: "Lightweight data forwarder",
  },
  {
    id: "hf",
    name: "Heavy Forwarder",
    shortName: "HF",
    icon: "📦",
    description: "Full Splunk instance for forwarding",
  },
  {
    id: "ds",
    name: "Deployment Server",
    shortName: "DS",
    icon: "🚀",
    description: "Distributes configurations to forwarders",
  },
  {
    id: "mc",
    name: "Monitoring Console",
    shortName: "MC",
    icon: "📡",
    description: "Monitors Splunk deployment health",
  },
  {
    id: "lm",
    name: "License Manager",
    shortName: "LM",
    icon: "🔑",
    description: "Manages Splunk licenses",
  },
];

export const ENVIRONMENT_TAGS: { value: EnvironmentTag; label: string }[] = [
  { value: "dev", label: "Development" },
  { value: "qa", label: "QA / Testing" },
  { value: "prod", label: "Production" },
  { value: "lab", label: "Lab / Training" },
];

export const INSTANCE_TYPES: InstanceTypeOption[] = [
  {
    value: "t3.micro",
    label: "t3.micro",
    vcpu: 2,
    memory: "1 GB",
    category: "general",
  },
  {
    value: "t3.small",
    label: "t3.small",
    vcpu: 2,
    memory: "2 GB",
    category: "general",
  },
  {
    value: "t3.medium",
    label: "t3.medium",
    vcpu: 2,
    memory: "4 GB",
    category: "general",
  },
  {
    value: "t3.large",
    label: "t3.large",
    vcpu: 2,
    memory: "8 GB",
    category: "general",
  },
  {
    value: "t3.xlarge",
    label: "t3.xlarge",
    vcpu: 4,
    memory: "16 GB",
    category: "general",
  },
  {
    value: "m5.large",
    label: "m5.large",
    vcpu: 2,
    memory: "8 GB",
    category: "general",
  },
  {
    value: "m5.xlarge",
    label: "m5.xlarge",
    vcpu: 4,
    memory: "16 GB",
    category: "general",
  },
  {
    value: "c5.large",
    label: "c5.large",
    vcpu: 2,
    memory: "4 GB",
    category: "compute",
  },
  {
    value: "c5.xlarge",
    label: "c5.xlarge",
    vcpu: 4,
    memory: "8 GB",
    category: "compute",
  },
  {
    value: "r5.large",
    label: "r5.large",
    vcpu: 2,
    memory: "16 GB",
    category: "memory",
  },
  {
    value: "r5.xlarge",
    label: "r5.xlarge",
    vcpu: 4,
    memory: "32 GB",
    category: "memory",
  },
   {
    value: "mac2.metal",
    label: "mac2.metal",
    vcpu: 12,
    memory: "32 GB",
    category: "mac",
  },
  {
    value: "mac2-m2.metal",
    label: "mac2-m2.metal",
    vcpu: 12,
    memory: "24 GB",
    category: "mac",
  },
  {
    value: "mac2-m2pro.metal",
    label: "mac2-m2pro.metal",
    vcpu: 12,
    memory: "32 GB",
    category: "mac",
  },
];

export const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  // { value: "us-west-1", label: "US West (N. California)" },
  // { value: "us-west-2", label: "US West (Oregon)" },
  // { value: "eu-west-1", label: "Europe (Ireland)" },
  // { value: "eu-central-1", label: "Europe (Frankfurt)" },
  // { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  // { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
];

export const AWS_SERVICES = [
  { value: "ec2", label: "EC2" },
  { value: "s3", label: "S3" },
  { value: "vpc", label: "VPC" },
  { value: "lb", label: "Load Balancer" },
  { value: "route53", label: "Route 53" },
  { value: "rds", label: "RDS" },
  { value: "eks", label: "EKS" },
];

export const SPLUNK_VERSIONS = [
  { value: "10.2.3", label: "Splunk 10.2.3 (Latest)" },
  { value: "9.4.11", label: "Splunk 9.4.11" },
  { value: "9.3.12", label: "Splunk 9.3.12" },
  { value: "9.2.12", label: "Splunk 9.2.12" },
  { value: "8.2.12", label: "Splunk 8.2.12" },
];

export type CategoryOption = {
  value: CategoryType;
  label: string;
  description: string;
  showLockIcon?: boolean;
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 1,
    label: "Category 1 - Manual VM Selection",
    description: "Select VMs manually for provisioning",
  },
  {
    value: 2,
    label: "Category 2 - All in one",
    description: "Manual VM selection with automated role scripts",
  },
  {
    value: 3,
    label: "Category 3 - Standard Cluster",
    description: "Predefined standard Splunk cluster (fixed infrastructure)",
  },
  {
    value: 4,
    label: "Category 4 - HA Cluster",
    description: "Predefined HA cluster with Search Head Deployers",
  },
  {
    value: 5,
    label: "Category 5 – HA Cluster with ALB",
    description: "HA cluster with ALB for SHC",
  }
];

export const DISABLED_CATEGORIES: CategoryType[] = [3, 4];

const CATEGORY_MEDIUM_INSTANCE_TYPE = "t3.medium";

export interface PredefinedInfraRole extends VMRole {
  type: string;
  count: number;
}

export const CATEGORY_3_INFRA: PredefinedInfraRole[] = [
  {
    id: "sh",
    name: "Search Head",
    shortName: "SH",
    icon: "🔍",
    description: "Handles search queries and presents results",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "idx",
    name: "Indexer",
    shortName: "IDX",
    icon: "📊",
    description: "Indexes and stores incoming data",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 3,
  },
  {
    id: "hf",
    name: "Heavy Forwarder",
    shortName: "HF",
    icon: "📦",
    description: "Full Splunk instance for forwarding",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "uf",
    name: "Universal Forwarder",
    shortName: "UF",
    icon: "📤",
    description: "Lightweight data forwarder",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "ds",
    name: "Deployment Server",
    shortName: "DS",
    icon: "🚀",
    description: "Distributes configurations to forwarders",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "lm",
    name: "License Manager",
    shortName: "LM",
    icon: "🔑",
    description: "Manages Splunk licenses",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "cm",
    name: "Cluster Manager",
    shortName: "CM",
    icon: "🎛️",
    description: "Manages indexer cluster",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
];

export const CATEGORY_4_INFRA: PredefinedInfraRole[] = [
  {
    id: "shc",
    name: "Search Head Cluster",
    shortName: "SHC",
    icon: "🔄",
    description: "Manages search head cluster apps",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 3,
  },
  {
    id: "deployer",
    name: "SH Cluster Deployer",
    shortName: "DEP",
    icon: "📋",
    description: "Distributes apps to search head cluster",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "idx",
    name: "Indexer",
    shortName: "IDX",
    icon: "📊",
    description: "Indexes and stores incoming data",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 3,
  },
  {
    id: "hf",
    name: "Heavy Forwarder",
    shortName: "HF",
    icon: "📦",
    description: "Full Splunk instance for forwarding",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "uf",
    name: "Universal Forwarder",
    shortName: "UF",
    icon: "📤",
    description: "Lightweight data forwarder",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "ds",
    name: "Deployment Server",
    shortName: "DS",
    icon: "🚀",
    description: "Distributes configurations to forwarders",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "lm",
    name: "License Manager",
    shortName: "LM",
    icon: "🔑",
    description: "Manages Splunk licenses",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
  {
    id: "cm",
    name: "Cluster Manager",
    shortName: "CM",
    icon: "🎛️",
    description: "Manages indexer cluster",
    type: CATEGORY_MEDIUM_INSTANCE_TYPE,
    count: 1,
  },
];

export const DASHBOARD_ROLE_CONFIG = [
  { shortName: "SH", icon: "🔍" },
  { shortName: "IDX", icon: "📊" },
  { shortName: "CM", icon: "🎛️" },
  { shortName: "UF", icon: "📤" },
  { shortName: "HF", icon: "📦" },
  { shortName: "DS", icon: "🚀" },
  { shortName: "MC", icon: "📡" },
  { shortName: "LM", icon: "🔑" },
  { shortName: "SHC", icon: "🔄" },
  { shortName: "DEPLOYER", icon: "📋" },
  { shortName: "AIO", icon: "🖥️" },
];

export const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: "Super Admin",
  "SplunkOps.Admin": "Admin",
  "SplunkOps.User": "User",
  "SplunkOps.Auditor": "Auditor",
  "SplunkOps.Stakeholder": "Stakeholder"
};
export const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  "Auth": "Auth",
  "AWS Ops": "AWS Ops",
  "User Mgmt": "User Mgmt",
  Settings: "Settings",
  Requests: "Requests",
};

export const ACTION_DISPLAY_LABELS: Record<string, string> = {
  USER_LOGIN: "Login",
  USER_LOGOUT: "Logout",
  VM_CREATED: "Created VM",
  VM_STARTED: "Started VM",
  VM_STOPPED: "Stopped VM",
  VM_DELETED: "Terminated VM",
  VM_REQUEST_SUBMITTED: "Submitted VM Request",
  QUOTA_REQUEST_SUBMITTED: "Quota Increase Request",
  QUOTA_REQUEST_APPROVED: "Approved Quota Increase",
  QUOTA_REQUEST_REJECTED: "Rejected Quota Increase",
  USER_CREATED: "Created User",
  USER_UPDATED: "Updated User",
  USER_DELETED: "Deleted User",
  USER_ROLE_CHANGED: "Role Changed",
  AWS_CONFIG_UPDATED: "Updated AWS Credentials",
  SETTINGS_UPDATED: "Updated Settings",
  REQUEST_SUBMITTED: "Submitted Request",
  REQUEST_APPROVED: "Approved Request",
  REQUEST_REJECTED: "Rejected Request",
  SSH_KEY_CREATED: "Created SSH Key",
  SSH_KEY_DELETED: "Deleted SSH Key",
  FEEDBACK_SUBMITTED: "Submitted Feedback",
  FEEDBACK_REVIEWED: "Reviewed Feedback",
  VM_TERMINATE_REQUESTED: "Requested VM Terminate",
  VM_TERMINATED: "Terminated VM",
  VM_RETRY_REQUESTED: "Retried VM Request",
  VM_CREATED_FAILED: "VM Provisioning Failed",
  VM_TERMINATE_FAILED: "VM Terminate Failed",
  VM_TERMINATE_RETRY_REQUESTED: "Requested VM Terminate Retry",
  USER_DEACTIVATED: "Deactivated User",
  USER_REACTIVATED: "Activated User",
  PROFILE_UPDATED: "Updated Profile",
  // USER_REINVITED: "Resent Invite",
  TERRAFORM_BACKEND_UPDATED: "Updated Terraform Backend",
  RUNTIME_AUTO_STOP: "Auto Stop Vm",
  RUNTIME_AUTO_TERMINATE: "Auto Terminate Vm",
  LOGS_CLEARED: "Cleared Logs",
  RUNTIME_EXTENSION_APPROVED_BY_ADMIN: "Approved Runtime Extension",
  RUNTIME_EXTENSION_REQUESTED: "Requested Runtime Extension",
  RUNTIME_EXTENSION_REJECTED_BY_ADMIN: "Rejected Runtime Extension",
  RUNTIME_EXTENSION_APPROVED: "Approved Runtime Extension",
  RUNTIME_EXTENSION_REJECTED: "Rejected Runtime Extension",
  USER_PROFILE_UPDATED: "Profile Updated",
  USER_QUOTA_UPDATED: "Updated VM Quota",
  USER_SCHEDULE_UPDATED: "Schedule Updated",
  USER_INSTANCE_TYPES_UPDATED: "Instance Types Updated",
  USER_CATEGORIES_UPDATED: "Categories Updated",
  RUNTIME_EXTENSION_APPROVED_DIRECT_INSTANCE: "Self Approved Runtime Extension for Instance",
  RUNTIME_EXTENSION_APPROVED_DIRECT_REQUEST: "Self Approved Runtime Extension for Request",
  UPDATE_SYSTEM_SETTING: "Updated System Setting",
  VPC_REQUEST_SUBMITTED: "Submitted VPC Request",
  VPC_CREATED: "VPC Created",
  VPC_CREATED_FAILED: "VPC Creation Failed",
  VPC_DESTROY_REQUESTED: "Requested VPC Deletion",
  VPC_DESTROYED: "VPC Terminated",
  VPC_DESTROYED_FAILED: "VPC Termination Failed",


  FOLDER_CREATED: "Created Folder in S3 Bucket",
  FOLDER_CREATE_FAILED: "Folder Creation Failed",
  OBJECT_UPLOADED: "Uploaded Object to S3 Bucket",
  OBJECT_UPLOAD_FAILED: "Object Upload Failed",
  OBJECT_DELETED: "Deleted Object from S3 Bucket",
  OBJECT_DELETE_FAILED: "Object Deletion Failed",
  OBJECT_DOWNLOADED: "Downloaded Object from S3 Bucket",
  OBJECT_DOWNLOAD_FAILED: "Object Download Failed",
  BUCKET_CREATED: "Bucket created",
  BUCKET_DELETED: "Bucket Terminated",
  BUCKET_CREATION_FAILED: "Bucket Provisioning Failed ",
  BUCKET_DELETE_FAILED: "Bucket Termination Failed ",
  BUCKET_REQUEST_SUBMITTED: "Submitted Bucket Request",
  BUCKET_DESTROY_REQUESTED: "Requested Bucket Destroy",

  LOAD_BALANCER_CREATED: "Created Load Balancer",
  LOAD_BALANCER_DELETED: "Deleted Load Balancer",

  EKS_CLUSTER_DESTROYED: "EKS Cluster Terminated",
  EKS_CLUSTER_DESTROY_FAILED: "EKS Cluster Termination Failed",
  EKS_CLUSTER_CREATED: "EKS Cluster Created",
  EKS_CLUSTER_REQUEST_SUBMITTED: "Submitted EKS Cluster Request",
  EKS_CLUSTER_DESTROY_REQUESTED: "Requested EKS Cluster Termination",
  EKS_CLUSTER_CREATION_FAILED: "EKS Cluster Creation Failed",

  RDS_DESTROY_COMPLETED: "RDS Cluster Terminated",
  RDS_DESTROY_REQUESTED: "Requested RDS Cluster Termination",
  RDS_PROVISION_COMPLETED: "RDS Cluster Provisioned",
  RDS_REQUEST_SUBMITTED: "RDS Request Submitted",
  RDS_PROVISION_FAILED: "RDS Provisioning Failed",
  RDS_DESTROY_FAILED: "RDS Cluster Termination Failed",

  VPC_QUOTA_REQUEST_SUBMITTED: "VPC Quota Increase Request",
  VPC_QUOTA_REQUEST_APPROVED: "Approved VPC Quota Increase",
  VPC_QUOTA_REQUEST_REJECTED: "Rejected VPC Quota Increase",

  LB_QUOTA_REQUEST_SUBMITTED: "Load Balancer Quota Increase Request",
  LB_QUOTA_REQUEST_APPROVED: "Approved Load Balancer Quota Increase",
  LB_QUOTA_REQUEST_REJECTED: "Rejected Load Balancer Quota Increase",

  RDS_QUOTA_REQUEST_SUBMITTED: "RDS Quota Increase Request",
  RDS_QUOTA_REQUEST_APPROVED: "Approved RDS Quota Increase",
  RDS_QUOTA_REQUEST_REJECTED: "Rejected RDS Quota Increase",

  EKS_QUOTA_REQUEST_SUBMITTED: "EKS Quota Increase Request",
  EKS_QUOTA_REQUEST_APPROVED: "Approved EKS Quota Increase",
  EKS_QUOTA_REQUEST_REJECTED: "Rejected EKS Quota Increase",

  S3_QUOTA_REQUEST_SUBMITTED: "S3 Bucket Quota Increase Request",
  S3_QUOTA_REQUEST_APPROVED: "Approved S3 Bucket Quota Increase",
  S3_QUOTA_REQUEST_REJECTED: "Rejected S3 Bucket Quota Increase",

  LB_REQUEST_SUBMITTED: "Submitted LB Request",
  LB_REQUEST_FAILED: "LB Request Failed",
  LB_CREATED: "Provisioned Load Balancer",
  LB_CREATED_FAILED: "LB Provisioning Failed",
  LB_DESTROY_REQUESTED: "Requested LB Destroy",
  LB_DESTROYED: "Destroyed Load Balancer",
  LB_DESTROYED_FAILED: "LB Destroy Failed",

  DNS_RECORD_CREATED: "DNS Provisioned",
  DNS_RECORD_DELETED: "DNS Terminated",
  DNS_DESTROY_REQUESTED: "Requested DNS Termination",
  DNS_REQUEST_SUBMITTED: "Submitted DNS Request",
  DNS_DESTROY_FAILED: "DNS Termination Failed",
  DNS_CREATION_FAILED: "DNS  Creation Failed",

};

export const ROLE_NAMES = [
  { id: "SH", name: "Search Head" },
  { id: "IDX", name: "Indexer" },
  { id: "CM", name: "Cluster Manager" },
  { id: "UF", name: "Universal Forwarder" },
  { id: "HF", name: "Heavy Forwarder" },
  { id: "DS", name: "Deployment Server" },
  { id: "MC", name: "Monitoring Console" },
  { id: "LM", name: "License Manager" },
  { id: "SHC", name: "Search Head Cluster" },
  { id: "DEPLOYER", name: "SH Cluster Deployer" },
  { id: "AIO", name: "All-In-One SPLUNK" },
];

export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST (India)" },

  { value: "America/New_York", label: "Eastern Time (EST)" },
  { value: "America/Chicago", label: "Central Time (CST)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },

  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Australia/Sydney", label: "Sydney Time (AEST/AEDT)" }
];

export const KUBERNETES_VERSIONS = [
  { value: "1.36", label: "1.36" },
  { value: "1.35", label: "1.35" },
  { value: "1.34", label: "1.34" },
  { value: "1.33", label: "1.33" },
];

export type AmiOption = {
  value: string;
  label: string;
  amiId: string;
  arch: string;
  virtualization: string;
  rootDevice: string;
  minimumDiskSize: number;
  defaultDiskSize: number;
  freeTier?: boolean;
  isMacOS?: boolean;
};

export const OHIO_AMI_OPTIONS: AmiOption[] = [
  { value: "al2023-kernel-6-18", label: "Amazon Linux 2023 kernel-6.18 AMI", amiId: "ami-078fe7ff43e10cf8c", arch: "64-bit (x86), uefi-preferred", virtualization: "hvm", rootDevice: "ebs",  minimumDiskSize: 10,
   defaultDiskSize: 10,freeTier: true },
  // { value: "macos-tahoe", label: "macOS Tahoe", amiId: "ami-0a6d617045de5f5ac", arch: "64-bit (Mac-Arm)", virtualization: "hvm", rootDevice: "ebs",   minimumDiskSize: 100,
  //   defaultDiskSize: 100, isMacOS:true },
  { value: "ubuntu-26-04", label: "Ubuntu Server 26.04 LTS(HVM), SSD Volume Type", amiId: "ami-0e5497a77ef21b5ac", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
  { value: "windows-2025-base", label: "Microsoft Windows Server 2025 Base", amiId: "ami-0daff962b1c050d36", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",   minimumDiskSize: 30,
    defaultDiskSize: 30,freeTier: true },
  { value: "rhel-10-nv", label: "Red Hat Enterprise Linux 10(HVM), SSD Volume Type", amiId: "ami-008f67e1a087a7449", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
  { value: "suse-16", label: "SUSE Linux Enterprise Server 16(HVM), SSD Volume Type", amiId: "ami-00fd5e6c61615bcd0", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
  { value: "debian-13", label: "Debian 13(HVM), SSD Volume Type", amiId: "ami-0e68dc81dc36750a1", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
];

export const NVIRGINIA_AMI_OPTIONS: AmiOption[] = [
  { value: "al2023-kernel-6-18-nv", label: "Amazon Linux 2023 kernel-6.18 AMI", amiId: "ami-0b826bb6d96d2afe4", arch: "64-bit (x86), uefi-preferred", virtualization: "hvm", rootDevice: "ebs", minimumDiskSize: 10,
   defaultDiskSize: 10, freeTier: true },
  // { value: "macos-tahoe", label: "macOS Tahoe", amiId: "ami-01c313e617f4f53dd", arch: "64-bit (Mac-Arm)", virtualization: "hvm", rootDevice: "ebs",   minimumDiskSize: 100,
  //   defaultDiskSize: 100, isMacOS:true },
  { value: "ubuntu-26-04", label: "Ubuntu Server 26.04 LTS(HVM), SSD Volume Type", amiId: "ami-0b6d9d3d33ba97d99", arch: "64-bit (Arm)", virtualization: "hvm", rootDevice: "ebs", freeTier: true, minimumDiskSize: 10,
   defaultDiskSize: 10, },
  { value: "windows-2025-base", label: "Microsoft Windows Server 2025 Base", amiId: "ami-013acec81a2c8ff79", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",  minimumDiskSize: 30,
    defaultDiskSize: 30, freeTier: true },
  { value: "rhel-10-nv", label: "Red Hat Enterprise Linux 10(HVM), SSD Volume Type", amiId: "ami-00adafae70b8029d8", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
  { value: "suse-16", label: "SUSE Linux Enterprise Server 16(HVM), SSD Volume Type", amiId: "ami-0b12a86a613a04fc6", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
  { value: "debian-13", label: "Debian 13(HVM), SSD Volume Type", amiId: "ami-0b75f821522bcff85", arch: "64-bit (x86)", virtualization: "hvm", rootDevice: "ebs",minimumDiskSize: 10,
defaultDiskSize: 10, freeTier: true },
];