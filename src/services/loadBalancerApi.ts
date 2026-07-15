import { apiClient, env } from "@/lib/api";

export interface LoadBalancerMeta {
  type?: string;
  scheme?: string;
  ipType?: string;
  vpc?: string;
  subnets?: string;
  azs?: string;
  securityGroups?: string;
  dnsName?: string;
  arn?: string;
}

export interface LoadBalancerSubnet {
  availability_zone: string;
  subnet_id: string;
  ip_assignment_type?: string;
  private_ipv4_address?: string | null;
  elastic_ip_allocation_id?: string | null;
}

export interface LoadBalancer {
  id: string;
  user_id: number;
  request_id: string;
  name: string;

  type: "application" | "network";
  scheme: string;
  ip_address_type: string;

  vpc_id: string;
  subnets: LoadBalancerSubnet[];
  security_group_ids: string[];

  region: string;
  status: string;

  created_at: string;
  updated_at: string;

  listeners?: any[];
  lb_tags?: any[];

  dns_name?: string;
  arn?: string;
}

export async function fetchLoadBalancers(): Promise<LoadBalancer[]> {
  const response = await apiClient.get<{ data: LoadBalancer[] }>(
    env.loadBalancer,
    "/lb-service/api/load-balancers"
  );

  return response.data ?? [];
}

export async function fetchLoadBalancerByName(name: string): Promise<LoadBalancer | null> {
  const response = await apiClient.get<{ data?: LoadBalancer | null }>(
    env.loadBalancer,
    `/lb-service/api/load-balancers/${encodeURIComponent(name)}`
  );

  return response.data ?? null;
}

export async function deleteLoadBalancer(id: string): Promise<void> {
  await apiClient.delete<void>(
    env.loadBalancer,
    `/lb-service/api/load-balancers/${encodeURIComponent(id)}`
  );
}

export async function createLoadBalancer(payload: any): Promise<any> {
  const response = await apiClient.post<{ data: any }>(
    env.loadBalancer,
    "/lb-service/api/load-balancers",
    payload
  );

  return response.data;
}

export async function updateLoadBalancer(id: string, payload: any): Promise<any> {
  const response = await apiClient.put<{ data: any }>(
    env.loadBalancer,
    `/lb-service/api/load-balancers/${encodeURIComponent(id)}`,
    payload
  );      

  return response.data;
}
