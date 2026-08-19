/**
 * dashboardApi.ts
 * All fetch calls for Dashboard data management
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export interface AWSSummary {
  running: number;
  stopped: number;
  avgToday: number;
  avgYesterday: number;
}

export interface AverageProvisionTime {
  formatted: string;
  minutes: number;
}

export interface CurrentUser {
  activeVMs: number;
  provisioningVMs: number;
  maxVMs: number;
}

export interface ActiveUsersResponse {
  count: number;
}

export interface ProcessingRequestsResponse {
  processingCount: number;
}

export interface DashboardOverviewResponse {
  totalResources: number;
  activeResources: number;
  provisioningResources: number;
  resourceTrend?: {
    value: number;
    display: string;
    tooltip: string;
    positive: boolean;
    showTooltip?: boolean;
  };
  averageProvisionTime: {
    formatted: string;
    averageMs: number;
    count: number;
    breakdown?: Record<string, string>;
  };
  quotaUsage: {
    current: number;
    max: number;
    remaining: number;
    percentage: number;
  };
  resourcesByService: Array<{
    service: string;
    label: string;
    count: number;
  }>;
}

export interface UserResponse {
  user: CurrentUser;
}

export interface RoleCountsResponse {
  [key: string]: number;
}

export interface ServiceQuota {
  service: string;
  label: string;
  current: number;
  max: number;
  remaining: number;
  percentage: number;
}

export interface DashboardRequest {
  request_id: string;
  user_name: string;
  action: string;
  region: string;
  project: string;
  environment: string;
  category: number | string;
  categoryLabel?: string;
  total_vms: number;
  status: string;
  created_at: string;
  updated_at?: string;
  vm_count: number;
  logs_cleared_at: string | null;
  service?: string;
}

export interface CurrentUserSummary {
  name?: string;
  role?: string;
}

type RecentRequestsPayload =
  | DashboardRequest[]
  | { data?: DashboardRequest[] }
  | undefined;

// ── Fetch Recent Requests ────────────────────────────────────────────────────
export async function fetchRecentRequestsApi(limit: number): Promise<DashboardRequest[]> {
  const response = await apiClient.get<{ data?: RecentRequestsPayload }>(
    env.vmRequest,
    "/api/requests?dashboard=true"
  );

  const payload = response?.data;
  const requests = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return requests.slice(0, limit);
}

// ── Fetch AWS Counts ─────────────────────────────────────────────────────────
export async function fetchAWSCountsApi(): Promise<AWSSummary> {
  const response = await apiClient.get<ApiResponse<AWSSummary>>(
    env.vmRequest,
    "/api/vms/summary/db"
  );
   if (!response.data) {
    throw new Error("AWS summary data not found");
  }
  return response.data;
}

// ── Fetch Average Provision Time ─────────────────────────────────────────────
export async function fetchAverageProvisionTimeApi(): Promise<AverageProvisionTime> {
  const response = await apiClient.get<ApiResponse<AverageProvisionTime>>(
    env.vmRequest,
    "/api/dashboard/average-provision-time"
  );
    if (!response.data) {
    throw new Error("Average provision time data not found");
  }

  return response.data;
}

// ── Fetch Active Users ───────────────────────────────────────────────────────
export async function fetchActiveUsersApi(): Promise<number> {
  const response = await apiClient.get<ApiResponse<ActiveUsersResponse>>(
    env.vmRequest,
    "/api/dashboard/summary/users"
  );

  if (!response.data) {
    throw new Error("Active users data not found");
  }
  return response.data.count;
}

// ── Fetch Processing Requests Count ──────────────────────────────────────────
export async function fetchProcessingRequestsCountApi(): Promise<number> {
  const response = await apiClient.get<ApiResponse<ProcessingRequestsResponse>>(
    env.vmRequest,
    "/api/dashboard/summary/processing-requests"
  );
  if (!response.data) {
    throw new Error("Processing requests data not found");
  }
  return response.data.processingCount;
}

export async function fetchDashboardOverviewApi(): Promise<DashboardOverviewResponse> {
  const response = await apiClient.get<ApiResponse<DashboardOverviewResponse>>(
    env.vmRequest,
    "/api/dashboard/overview"
  );
  if (!response.data) {
    throw new Error("Dashboard overview data not found");
  }
  return response.data;
}

// ── Fetch Current User ───────────────────────────────────────────────────────
export async function fetchCurrentUserApi(): Promise<CurrentUser> {
  const response = await apiClient.get<ApiResponse<UserResponse>>(
    env.auth,
    "/api/auth/me"
  );
  if (!response.data) {
    throw new Error("Current user data not found");
  } 
  return response.data.user;
}

// ── Fetch Role Counts ────────────────────────────────────────────────────────
export async function fetchRoleCountsApi(): Promise<RoleCountsResponse> {
  const response = await apiClient.get<ApiResponse<RoleCountsResponse>>(
    env.vmRequest,
    "/api/dashboard/role-count"
  );
  if (!response.data) {
    throw new Error("Role counts data not found");
  }
  return response.data;
}

// ── Fetch Service Quotas ─────────────────────────────────────────────────────
export async function fetchServiceQuotasApi(): Promise<ServiceQuota[]> {
  const response = await apiClient.get<ApiResponse<ServiceQuota[]>>(
    env.vmRequest,
    "/api/dashboard/service-quotas"
  );
  if (!response.data) {
    throw new Error("Service quotas data not found");
  }
  return response.data;
}