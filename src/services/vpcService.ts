import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import { apiClient, ApiError, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

const VPC_BASE_URL = env.vpcService || "";

export interface CreateVpcOnlyPayload {
  vpc_resource_type: "vpc_only";
  vpc_name: string;
  vpc_cidr: string;
  region: string;
  instance_tenancy: string;
  enable_ipv6: boolean;
  vpc_encryption: string;
  enable_dns_hostnames: boolean;
  enable_dns_support: boolean;
  tags: Record<string, string>;
  justification: string;
}

export interface CreateVpcAndMorePayload extends Omit<CreateVpcOnlyPayload, "vpc_resource_type"> {
  vpc_resource_type: "vpc_and_more";
  availability_zones: string[];
  public_subnet_cidrs: string[];
  private_subnet_cidrs: string[];
  nat_gateway_type: string;
  nat_gateway_count_type: string;
  vpc_endpoint_type: string;
}

interface ProvisionVpcResponse {
  requestId?: string;
  request_id?: string;
}

export type CreateVpcPayload = CreateVpcOnlyPayload | CreateVpcAndMorePayload;

export async function provisionVpcApi(payload: CreateVpcPayload): Promise<ApiResponse<ProvisionVpcResponse>> {
  return apiClient.post<ApiResponse<ProvisionVpcResponse>>(VPC_BASE_URL, "/provision", payload);
}

// ─── VPC Requests (GET) ────────────────────────────────────────────────────

export interface VpcListItemRaw {
  request_id: string;
   user_id: number; 
  user_name: string;
  region: string;
  vpc_status: string;
  created_at: string;
  updated_at: string;
  vpc_name: string;
  aws_vpc_id: string | null;
  cidr_block: string | null;
  vpc_db_id: number | null;
  subnet_count: number | null;
  nat_gateway_count: number | null;
  availability_zones?: string[] | null;
  availability_zones_count?: number | null;
}

export interface VpcDetailRaw {
  request_id: string;
  user_id?: number;
  user_name?: string;
  region: string;
  status: string;
  created_at: string;
  updated_at?: string;
  resource_name: string;
  metadata_json?: Record<string, any>;
  vpc_db_id?: number | null;
  aws_vpc_id: string | null;
  vpc_name?: string;
  cidr_block: string | null;
  vpc_status?: string;
  enable_ipv6?: boolean;
  instance_tenancy?: string;
  enable_dns_support?: boolean;
  enable_dns_hostnames?: boolean;
  is_default?: boolean;
  owner_id?: string | null;
  dhcp_options_id?: string | null;
  default_route_table_id?: string | null;
  main_network_acl_id?: string | null;
  vpc_encryption?: string | null;
  subnets?: Array<{
    id?: number;
    cidr: string;
    status?: string;
    subnet_type: "public" | "private";
    aws_subnet_id: string;
    availability_zone: string;
  }>;
  route_tables?: Array<{
    id?: number;
    status?: string;
    route_table_type: "public" | "private";
    aws_route_table_id: string;
  }>;
  nat_gateways?: Array<{
    id?: number;
    status?: string;
    subnet_id?: number;
    elastic_ip?: string;
    aws_nat_gateway_id: string;
  }>;
}


/** Map raw list item to the shape the VPC table renders. */
export function mapVpcListItem(r: VpcListItemRaw) {
  return {
    id: r.request_id,
    name: r.vpc_name,
    status: r.vpc_status,
     userId: r.user_id,
    cidr: r.cidr_block ?? "—",
    subnetCount: Number(r.subnet_count),
    natGateways: Number(r.nat_gateway_count),
    region: r.region,
    zones: r.availability_zones?.length ?? r.availability_zones_count ?? 0,
    createdDate: r.created_at,
    userName: r.user_name,
    awsVpcId: r.aws_vpc_id,
    vpcDbId: r.vpc_db_id,
    raw: r,
  };
}

export async function fetchVpcListApi() {
  const res = await apiClient.get<ApiResponse<VpcListItemRaw[]>>(
    VPC_BASE_URL,
    "/requests",
  );
  return (res.data ?? []).map(mapVpcListItem);
}

export async function fetchVpcDetailsApi(requestId: string) {
  const res = await apiClient.get<ApiResponse<VpcDetailRaw>>(
    VPC_BASE_URL,
    `/requests/${requestId}`,
  );
  return res.data!;
}

export async function deleteVpcApi(requestId: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(VPC_BASE_URL, `/vpc/${requestId}`);
}

export { ApiError };

export const vpcApi = {
  deleteVpc(id: string, displayName?: string) {
    useAppStore.getState().deleteVpc(id);
    toast.success(`Deleted VPC ${displayName || id}`);
  },

  deleteMany(ids: string[]) {
    const store = useAppStore.getState();
    ids.forEach((id) => store.deleteVpc(id));
    toast.success(`Deleted ${ids.length} VPC(s)`);
  },

  reapplyMany(ids: string[]) {
    toast.info(`Re-applying ${ids.length} VPC(s)`);
  },

  refresh() {
    toast.info("Refreshed");
  },

  copyTerraform(terraform: string) {
    navigator.clipboard.writeText(terraform || "");
    toast.success("Terraform copied");
  },

  addVpc(vpc: {
    id: string;
    name: string;
    region: string;
    status: string;
    cidr: string;
  }) {
    useAppStore.getState().addVpc(vpc);
    toast.success("VPC provisioning started", { description: vpc.name });
  },

  createEncryptionControl() {
    toast.success("Encryption control created");
  },

  createFlowLog() {
    toast.success("Flow log created successfully");
  },
};