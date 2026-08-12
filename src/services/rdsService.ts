import { apiClient, env } from '@/lib/api';

export type RdsInstanceApi = {
  id: string;
  instance_identifier: string;
  instance_arn?: string;
  resource_id?: string;
  instance_role: string;
  instance_class: string;
  availability_zone: string;
  endpoint?: string;
  status: string;
  engine_version?: string;
  publicly_accessible?: boolean;
  upgrade_rollout_order?: string;
  port?: number;
  ca_certificate_identifier?: string;
  ca_certificate_expiry?: string | null;
  failover_priority?: number;
  subnets_json?: { SubnetIdentifier: string; SubnetAvailabilityZone: string }[];
  created_at?: string;
  [key: string]: unknown;
};

export type RdsClusterApi = {
  request_id: string;
  user_id: number;
  user_name: string;
  request_status: string;
  request_created_at: string;
  cluster_db_id: number;
  cluster_identifier: string;
  cluster_arn?: string;
  engine: string;
  engine_version: string;
  engine_mode?: string;
  cluster_status: string;
  endpoint?: string;
  upgrade_rollout_order?: string;
  reader_endpoint?: string;
  port?: number;
  database_name?: string;
  master_username?: string;
  master_user_secret_arn?: string | null;   // ← add
  parameter_group?: string | null;      
  region: string;
  iam_auth_enabled?: boolean;
  storage_type?: string;
  encryption_enabled?: boolean;
  min_acu?: number;
  max_acu?: number;
  auto_pause_seconds?: number;
  cluster_created_at?: string;
  instances: RdsInstanceApi[];
  [key: string]: unknown;
};
export type AwsRegion = 'us-east-1' | 'us-east-2';

export type ProvisionRdsRequest = {
  cluster_identifier: string;
  master_username: string;
  database_name: string;
  region: AwsRegion;
  min_acu: number;
  max_acu: number;
  auto_pause_seconds: number;
  justification: string;
};

export type ProvisionRdsResponse = {
  requestId: string;
};

export async function fetchRdsClusters(): Promise<RdsClusterApi[]> {
  const response = await apiClient.get<{ success: boolean; data: RdsClusterApi[] }>(
    env.rds,
    '/clusters'
  );
  return response.data ?? [];
}

export async function fetchRdsCluster(requestId: string): Promise<RdsClusterApi> {
  const response = await apiClient.get<{ success: boolean; data: RdsClusterApi }>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}`
  );
  if (!response.data) {
    throw new Error('RDS cluster not found');
  }
  return response.data;
}

export async function provisionRds(payload: ProvisionRdsRequest): Promise<ProvisionRdsResponse> {
  const response = await apiClient.post<{ success: boolean; data: ProvisionRdsResponse }>(
    env.rds,
    '/provision',
    payload
  );
  if (!response.data) {
    throw new Error('Failed to provision RDS cluster');
  }
  return response.data;
}

export async function checkRdsIdentifier(identifier: string, region: string): Promise<{ exists: boolean }> {
  const response = await apiClient.get<{ exists: boolean }>(
    env.rds,
    `/clusters/check-identifier`,
    { identifier, region }
  );
  return response ?? { exists: false };
}

export async function deleteRdsCluster(requestId: string): Promise<void> {
  await apiClient.delete<{ success: boolean; data?: unknown }>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}`
  );
} 


export async function deleteRdsInstance(requestId: string, instanceIdentifier: string): Promise<void> {
  await apiClient.delete<{ success: boolean; data?: unknown }>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}/instances/${encodeURIComponent(instanceIdentifier)}`
  );
}

