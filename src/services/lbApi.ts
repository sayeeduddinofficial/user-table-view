import { apiClient } from '@/lib/api';
import { env } from '@/lib/env';

const BASE = env.lbService ?? 'http://localhost:5010/lb-service/api';

export type VpcItem = { id: string; name: string; cidr: string };
export type SubnetItem = { id: string; name: string; cidr: string; az: string };
export type SgItem = { id: string; name: string; description: string };
export type TgItem = { arn: string; name: string; protocol: string; port: number, loadBalancerArns: string[] };
export type CertItem = { arn: string; domain: string; status: string };
export type EipItem = { allocationId: string; publicIp: string };
export type AzItem = { name: string; zoneId: string };
export type ExistingLbItem = {
  name: string;
  arn: string;
  type: string;
  dnsName: string;
  state: string;
  scheme: string;
  region: string;
};
export type ProvisioningLbItem = {
  id: string;
  name: string;
  request_id: string;
  region: string;
  type: string;
  status: string;
  created_at: string;
};


export const lbApi = {
  vpcs: (region: string) =>
    apiClient.get<{ vpcs: VpcItem[] }>(BASE, '/vpcs', { region }),
  subnets: (region: string, vpcId: string) =>
    apiClient.get<{ subnets: SubnetItem[] }>(BASE, '/subnets', { region, vpcId }),
  securityGroups: (region: string, vpcId: string) =>
    apiClient.get<{ securityGroups: SgItem[] }>(BASE, '/security-groups', { region, vpcId }),
  targetGroups: (region: string, vpcId?: string) =>
    apiClient.get<{ targetGroups: TgItem[] }>(BASE, '/target-groups', { region, ...(vpcId ? { vpcId } : {}) }),
  certificates: (region: string) =>
    apiClient.get<{ certificates: CertItem[] }>(BASE, '/certificates', { region }),
  elasticIps: (region: string) =>
    apiClient.get<{ elasticIps: EipItem[] }>(BASE, '/elastic-ips', { region }),
  availabilityZones: (region: string) =>
    apiClient.get<{ availabilityZones: AzItem[] }>(BASE, '/availability-zones', { region }),
  create: (payload: CreateLbPayload) =>
  apiClient.post<CreateLbResponse>(BASE, '/load-balancers', payload),
  delete: (id: string) =>
    apiClient.delete<{ message: string }>(BASE, `/load-balancers/${id}`),
  deleteSdk: (id: string) =>
    apiClient.delete<{ message: string }>(BASE, `/load-balancers/${id}/sdk`),
  deleteByRequest: (requestId: string) =>
    apiClient.delete<{ message: string }>(BASE, `/load-balancers/by-request/${requestId}`),
  list: (userId?: number) =>
    apiClient.get<{ data: LbItem[] }>(BASE, '/load-balancers', userId ? { user_id: String(userId) } : {}),
  getById: (id: string) =>
    apiClient.get<{ data: LbItem }>(BASE, `/load-balancers/${id}`),
  liveLogsUrl: (requestId: string) =>
    `${BASE}/load-balancers/by-request/${requestId}/logs/live`,
  logs: (requestId: string) =>
    apiClient.get<{ requestId: string; status: string; logs: string }>(
      BASE, `/load-balancers/by-request/${requestId}/logs`, {}
    ),
  checkExisting: (region: string) =>
    apiClient.get<{ exists: boolean; loadBalancers: ExistingLbItem[] }>(
      BASE, '/load-balancers/check-existing', { region }
    ),
  checkProvisioning: (userId: number) =>
    apiClient.get<{ exists: boolean; loadBalancer: ProvisioningLbItem | null }>(
      BASE, '/load-balancers/check-provisioning', { user_id: String(userId) }
    ),


};

export type LbItem = {
  id: string; request_id: string; name: string; type: string; scheme: string;
  ip_address_type: string; vpc_id: string; region: string;
  security_group_ids: string[]; status: string; justification: string | null;
  created_at: string; updated_at: string;
  subnets: { id: string; availability_zone: string; subnet_id: string; ip_assignment_type: string; private_ipv4_address: string | null; elastic_ip_allocation_id: string | null }[];
  lb_tags: { id: string; key: string; value: string }[];
  listeners: { id: string; protocol: string; port: number; action_type: string; action_config: Record<string, any>; listener_tags: { id: string; key: string; value: string }[] }[];
};

export type CreateLbResponse = {
  data: {
    id: string;
    request_id: string;
    name: string;
    status: string;
    [key: string]: any;
  };
};

export type CreateLbPayload = {
  user_id: number;
  region: string;
  name: string;
  type: 'application' | 'network';
  vpc_id: string;
  scheme: string;
  ip_address_type: string;
  security_group_ids: string[];
  subnets: {
    availability_zone: string;
    subnet_id: string;
    ip_assignment_type?: string;
    elastic_ip_allocation_id?: string;
  }[];
  listeners: {
    protocol: string;
    port: number;
    action_type: string;
    action_config: Record<string, string>;
    listener_tags: { key: string; value: string }[];
  }[];
  lb_tags: { key: string; value: string }[];
  justification?: string;
};
