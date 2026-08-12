export type DetailTab =
  | "overview"
  | "resources"
  | "compute"
  | "networking"
  | "tags";

export interface EksNode {
  node_name?: string;
  instance_type?: string;
  compute_type?: string;
  managed_by?: string;
  status?: string;
}

export interface EksNodeGroup {
  name?: string;
  desired?: number;
  status?: string;
}

export interface EksCondition {
  type: string;
  status: string;
  reason?: string;
}

export interface EksNodePool {
  metadata?: { name?: string; creationTimestamp?: string };
  status?: {
    conditions?: EksCondition[];
    resources?: Record<string, string>;
  };
  spec?: { template?: { spec?: { nodeClassRef?: { name?: string } } } };
}

export interface EksNodeClass {
  metadata?: { name?: string; creationTimestamp?: string };
  spec?: { role?: string };
  status?: {
    conditions?: EksCondition[];
    instanceProfile?: string;
  };
}

export interface EksClusterDetail {
  id: number;
  request_id: string;
  cluster_name: string;
  region: string;
  kubernetes_version: string;
  cluster_iam_role_arn: string | null;
  node_iam_role_arn: string | null;
  vpc_id: string | null;
  vpc_name: string | null;
  subnet_ids: string[] | null;
  status: string;
  cluster_arn: string | null;
  endpoint: string | null;
  created_at: string;
  certificate_authority: string | null;
  oidc_issuer: string | null;
  platform_version: string | null;
  support_type: string | null;
  support_until: string | null;
  cluster_ip_family: string | null;
  cluster_security_group_id: string | null;
  additional_security_group_ids: string[] | null;
  egress_mode: string | null;
  service_ipv4_cidr: string | null;
  cluster_type: string | null;
  public_access_cidrs: string[] | null;
  node_pools: EksNodePool[] | null;
  node_classes: EksNodeClass[] | null;
  cluster_health: unknown | null;
  node_health: unknown | null;
  upgrade_insights: unknown | null;
  capability_issues: unknown | null;
  node_groups: EksNodeGroup[] | null;
  nodes: EksNode[] | null;
}

export type EksClusterMetric =
  | "cluster_health"
  | "upgrade_insights"
  | "node_health"
  | "capability_issues";