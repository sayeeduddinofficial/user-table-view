import { apiClient, env } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface DeleteEksClusterResponse {
  message?: string;
  data?: { requestId?: string; status?: string };
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
