/**
 * vmRequestsApi.ts
 * All fetch calls for VM Requests management
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

/** Maps backend service identifiers to display labels */
export const SERVICE_LABELS: Record<string, string> = {
  "vm-service": "EC2",
  "vpc-service": "VPC",
  "s3-service": "S3",
  "lb-service": "Load Balancer",
  "rds-service": "RDS",
  "eks-cluster-service": "EKS",
  "route53-service": "Route 53",
};

/** Ordered list for dropdowns / selects */
export const SERVICE_OPTIONS = Object.entries(SERVICE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export interface VMRequest {
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
  last_operation?: string;
  justification?: string;
  service?: string;
  provision_retry_count?: number;
  terminate_retry_count?: number;
  has_terminating_vms?: boolean;
}

const categoryLabels: Record<number, string> = {
  1: "Category 1",
  2: "Category 2", 
  3: "Category 3",
  4: "Category 4",
  5: "Category 5",
};

const normalizeStatus = (status: string) => {
  switch (status) {
    case "IN_PROGRESS":
      return "provisioning";
    case "RETRYING":
      return "retrying";
    case "SUCCESS":
      return "completed";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    case "DESTROYING":
      return "destroying";
    case "DESTROYED":
      return "destroyed";
    case "RETRYING_TERMINATE":
      return "retrying_terminate";
    default:
      return status.toLowerCase();
  }
};

const normalizeEnvironment = (env: string) => {
  switch (env?.toLowerCase()) {
    case "dev":
    case "development":
      return "Training";
    case "prod":
    case "production":
      return "Production";
    case "non-training":
    case "nontraining":
      return "Non-Training";
    default:
      return env;
  }
};

function normalizeVMRequest(r: any): VMRequest {
  const categoryNum = Number(r.category);
  return {
    ...r,
    status: normalizeStatus(r.status),
    environment: normalizeEnvironment(r.environment),
    categoryLabel: Number.isFinite(categoryNum)
      ? categoryLabels[categoryNum]
      : "Unknown",
  };
}

export interface VMRequestsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  service?: string;
  search?: string;
  userId?: string;
}

export interface VMRequestsResponse {
  data: VMRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── Fetch all VM requests ────────────────────────────────────────────────────
export async function fetchVMRequestsApi(params: VMRequestsQueryParams = {}): Promise<VMRequestsResponse> {
  const query: Record<string, string> = {
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  };
  if (params.status && params.status !== "all") query.status = params.status;
  if (params.service && params.service !== "all") query.service = params.service;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.userId && params.userId !== "all") query.userId = params.userId;

  const response = await apiClient.get<ApiResponse<VMRequestsResponse>>(
    env.vmRequest,
    "/api/requests",
    query
  );
  const result = response.data as any;
  // Support both paginated { data, pagination } and legacy array shapes
  if (result && result.data && result.pagination) {
    return {
      data: result.data.map(normalizeVMRequest),
      pagination: result.pagination,
    };
  }
  const arr = Array.isArray(result) ? result : [];
  return {
    data: arr.map(normalizeVMRequest),
    pagination: { total: arr.length, page: 1, limit: arr.length, totalPages: 1, hasNext: false, hasPrev: false },
  };
}

// ── Fetch single VM request ──────────────────────────────────────────────────
export async function fetchVMRequestApi(requestId: string): Promise<VMRequest> {
  const response = await apiClient.get<ApiResponse<VMRequest>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}`
  );
  return normalizeVMRequest(response.data);
}

// ── Retry VM request ─────────────────────────────────────────────────────────
export async function retryVMRequestApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}/retry`
  );
}

export async function retryVpcRequestApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.vpcService,
    `/requests/${requestId}/retry`
  );
}

// ── Retry terminate VM request ───────────────────────────────────────────────
export async function retryTerminateVMRequestApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}/retry-terminate`
  );
}

// ── Retry S3 bucket provision ────────────────────────────────────────────────
export async function retryBucketProvisionApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.bucketService,
    `buckets/${encodeURIComponent(requestId)}/retry`
  );
}

export async function retryBucketDestroyApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.bucketService,
    `buckets/${encodeURIComponent(requestId)}/retry-destroy`
  );
}

// ── Retry LB provision ────────────────────────────────────────────────────────
export async function retryLbProvisionApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.lbService,
    `/load-balancers/by-request/${requestId}/retry`
  );
}

// ── Retry LB terminate ────────────────────────────────────────────────────────
export async function retryLbTerminateApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.lbService,
    `/load-balancers/by-request/${requestId}/retry-terminate`
  );
}

export async function retryTerminateVpcRequestApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.vpcService,
    `/requests/${requestId}/retry-terminate`
  );
}

export async function retryEKSProvisionApi(requestId: string ): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.eksClusterService,
    `/eks/${requestId}/retry`
  );
}

export async function retryEKSTerminateApi(requestId: string ): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.eksClusterService,
    `/eks/${requestId}/retry-terminate`
  );
}
// ── Delete VM request ────────────────────────────────────────────────────────
export async function deleteVMRequestApi(requestId: string): Promise<ApiResponse<void>> {
  return await apiClient.delete<ApiResponse<void>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}`
  );
} 

export async function fetchVpcRequestApi(requestId: string): Promise<VMRequest> {
  const response = await apiClient.get<ApiResponse<any>>(
    env.vpcService,
    `/requests/${requestId}`
  );
  const d = response.data;
  return normalizeVMRequest({
    ...d,
    request_id: d.request_id,
    service: "vpc-service",
    total_vms: null,
    vm_count: 0,
  });
}

export async function fetchEksRequestApi(requestId: string): Promise<VMRequest> {
  const response = await apiClient.get<ApiResponse<any>>(
    env.eksClusterService,
    `/eks/request/${encodeURIComponent(requestId)}`
  );
  const d = response.data;
  return normalizeVMRequest({
    ...d,
    request_id: d.request_id,
    service: "eks-cluster-service",
    total_vms: null,
    vm_count: 0,
  });
}  

// ── Delete VPC request (terraform destroy) ───────────────────────────────────
export async function deleteVpcRequestApi(requestId: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(
    env.vpcService,
    `/requests/${requestId}`   // ← was missing /api/ but vpcService base already includes it
  );
}

// ── Fetch single LB request status ──────────────────────────────────────────
export async function fetchLbRequestApi(requestId: string): Promise<VMRequest> {
  const response = await apiClient.get<ApiResponse<VMRequest>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}`
  );
  return normalizeVMRequest(response.data);
}

// ── Delete LB request (terraform destroy) ───────────────────────────────────
export async function deleteLbRequestApi(requestId: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(
    env.lbService,
    `/load-balancers/by-request/${requestId}`
  );
} 

// add this to vmRequestsApi.ts
export async function deleteRdsRequestApi(requestId: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}`
  );
}

export async function retryRdsProvisionApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}/retry`
  );
} 


export async function retryRdsTerminateApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.rds,
    `/clusters/${encodeURIComponent(requestId)}/retry-terminate`
  );
}

export async function retryRoute53ProvisionApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.route53Service,
    `/records/${requestId}/retry`
  );
} 
export async function retryRoute53TerminateApi(requestId: string): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    env.route53Service,
    `/records/${requestId}/retry-terminate`
  );
}



// ── Fetch users who have requests (for admin filter dropdown) ───────────────
export async function fetchRequestUsersApi(): Promise<{ id: string; name: string }[]> {
  const rows = await apiClient.get<{ id: number; email: string; name: string }[]>(
    env.vmRequest,
    '/api/vm-requests/users'
  );
  return (Array.isArray(rows) ? rows : []).map(u => ({
    id: String(u.id),
    name: u.name || u.email,
  }));
}

// vmRequestsApi.ts — add at the bottom

export type RetryApiFn = (requestId: string) => Promise<void>;

export const RETRY_PROVISION_API: Record<string, RetryApiFn> = {
  'rds-service': retryRdsProvisionApi,
  's3-service': retryBucketProvisionApi,
 'lb-service': retryLbProvisionApi,
 'vpc-service': retryVpcRequestApi,
'route53-service': retryRoute53ProvisionApi,
 "eks-cluster-service": retryEKSProvisionApi,
};

export const RETRY_TERMINATE_API: Record<string, RetryApiFn> = {
  'rds-service': retryRdsTerminateApi,
  'lb-service': retryLbTerminateApi,
  'vpc-service': retryTerminateVpcRequestApi,
  'route53-service': retryRoute53TerminateApi,
  "eks-cluster-service": retryEKSTerminateApi,
  's3-service': retryBucketDestroyApi,
};





