import { apiClient, env, ApiError } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { ExtensionRequest } from './types';

export interface AdminActionPayload {
  request_id: string;
  instance_id: string;
  scope: string;
}

export interface ApproveByAdminResponse extends ApiResponse {
  data?: ExtensionRequest[];
  skipped_instances?: { instance_id: string; state: string }[];
}

export async function fetchAllRuntimeRequestsApi(): Promise<ExtensionRequest[]> {
  const res = await apiClient.get<ApiResponse<ExtensionRequest[]>>(
    env.runtime,
    '/api/runtime-governance/all-requests'
  );
  return res.data ?? [];
}

export async function emailApproveApi(token: string): Promise<ApiResponse> {
  return apiClient.patch<ApiResponse>(
    env.runtime,
    `/api/runtime-governance/approve?token=${encodeURIComponent(token)}`
  );
}

export async function emailRejectApi(token: string): Promise<ApiResponse> {
  return apiClient.patch<ApiResponse>(
    env.runtime,
    `/api/runtime-governance/reject?token=${encodeURIComponent(token)}`
  );
}

export async function approveByAdminApi(payload: AdminActionPayload): Promise<ApproveByAdminResponse> {
  return apiClient.patch<ApproveByAdminResponse>(
    env.runtime,
    '/api/runtime-governance/approve-by-admin',
    payload
  );
}

export async function rejectByAdminApi(payload: AdminActionPayload): Promise<ApiResponse> {
  return apiClient.patch<ApiResponse>(
    env.runtime,
    '/api/runtime-governance/reject-by-admin',
    payload
  );
}

export { ApiError };
