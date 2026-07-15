/**
 * quotaRequestsApi.ts
 * All fetch calls for Quota Requests management
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export interface QuotaRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  current_quota: number;
  requested_quota: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  requested_by_role: string;
  manager_email: string;
  expires_at: string;
}

export interface QuotaRequestsResponse {
  data: QuotaRequest[];
}

// ── Fetch all quota requests ─────────────────────────────────────────────────
export async function fetchQuotaRequestsApi(): Promise<QuotaRequest[]> {
  const response = await apiClient.get<ApiResponse<QuotaRequest[]>>(
    env.vmRequest,
    "/api/vms/getall/quota-requests"
  );
  return Array.isArray(response.data) ? response.data : [];
}

// ── Approve quota request ────────────────────────────────────────────────────
export async function approveQuotaRequestApi(requestId: string, adminNotes?: string): Promise<void> {
  await apiClient.put<ApiResponse<void>>(
    env.vmRequest,
    `/api/vms/quota-request/${requestId}/approve`,
    { admin_notes: adminNotes }
  );
}

// ── Reject quota request ─────────────────────────────────────────────────────
export async function rejectQuotaRequestApi(requestId: string, adminNotes?: string): Promise<void> {
  await apiClient.put<ApiResponse<void>>(
    env.vmRequest,
    `/api/vms/quota-request/${requestId}/deny`,
    { admin_notes: adminNotes }
  );
}

// ── Approve by email token ───────────────────────────────────────────────────
export async function approveQuotaRequestByTokenApi(jwtToken: string): Promise<void> {
  await apiClient.patch<ApiResponse<void>>(
    env.vmRequest,
    `/api/vms/quota-request/approve?token=${encodeURIComponent(jwtToken)}`
  );
}

// ── Reject by email token ────────────────────────────────────────────────────
export async function rejectQuotaRequestByTokenApi(jwtToken: string): Promise<void> {
  await apiClient.patch<ApiResponse<void>>(
    env.vmRequest,
    `/api/vms/quota-request/reject?token=${encodeURIComponent(jwtToken)}`
  );
}