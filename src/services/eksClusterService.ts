import { apiClient, env } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { EksClusterDetail } from '@/components/eks/eksTypes';

export interface DeleteEksClusterResponse {
  message?: string;
  data?: { requestId?: string; status?: string };
}

export async function checkEksClusterName(name: string, region: string): Promise<{ exists: boolean }> {
  const res = await apiClient.get<{ exists: boolean }>(
    env.eksClusterService,
    `/eks/check-name`,
    { name, region }
  );
  return res ?? { exists: false };
}

export async function deleteEksClusterService(requestId: string): Promise<DeleteEksClusterResponse> {
  return apiClient.delete<DeleteEksClusterResponse>(env.eksClusterService, `/eks/${encodeURIComponent(requestId)}`);
}

export interface EksClusterByRequestId {
  request_id: string;
  status: string;
  region: string;
  cluster_name: string;
  created_at: string;
}

export async function getEksClusterByRequestId(requestId: string): Promise<EksClusterByRequestId> {
  const res = await apiClient.get<ApiResponse<EksClusterByRequestId>>(
    env.eksClusterService,
    `/eks/request/${encodeURIComponent(requestId)}`,
  );
  return res.data as EksClusterByRequestId;
}

export type EksResourceRow = Record<string, unknown>;

export async function getClusterResources(
  clusterName: string,
  type: string,
): Promise<EksResourceRow[]> {
  const res = await apiClient.get<ApiResponse<EksResourceRow[]>>(
    env.eksClusterService,
    `/eks/${encodeURIComponent(clusterName)}/resources`,
    { type },
  );
  return res.data ?? [];
}

export async function getEksClusterDetails(
  clusterName: string,
): Promise<EksClusterDetail> {
  const res = await apiClient.get<ApiResponse<EksClusterDetail>>(
    env.eksClusterService,
    `/eks/${encodeURIComponent(clusterName)}/details`,
  );

  if (res?.status !== 'SUCCESS' || !res.data) {
    throw new Error(res?.message || 'Failed to load cluster details');
  }

  return res.data;
}