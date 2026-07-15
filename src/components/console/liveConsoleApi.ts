/**
 * liveConsoleApi.ts
 * All fetch calls for Live Console management
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export interface ActiveRequest {
  request_id: string;
  user_name: string;
  action: string;
  region: string;
  environment: string;
  total_vms: number;
  status: string;
  created_at: string;
  logs_cleared_at: string | null;
  service?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: string;
}

export interface RequestDetails {
  requestId: string;
  status: string;
  service?: string;
  user_name?: string;
  action?: string;
  region?: string;
  environment?: string;
  total_vms?: number;
  created_at?: string;
}

export interface LogsResponse {
  logs: string;
  status: string;
}

const normalizeStatus = (status: string) => {
  switch (status) {
    case "IN_PROGRESS":
      return "provisioning";
    case "SUCCESS":
      return "completed";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    case "DESTROYING":
      return "terminating";
    case "DESTROYED":
      return "terminated";
    case "RETRYING":
      return "retrying";
    case "RETRYING_TERMINATE":
      return "retrying_terminate";
    default:
      return status.toLowerCase();
  }
};

// ── Fetch active requests ────────────────────────────────────────────────────
export async function fetchActiveRequestsApi(): Promise<ActiveRequest[]> {
  const response = await apiClient.get<ApiResponse<any>>(
    env.vmRequest,
    "/api/requests",
    { limit: "1000" }
  );
  const raw = response.data;
  const requests: ActiveRequest[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  console.log("Active requests fetched:", requests);
   return requests
    .filter((r: any) => !r.logs_cleared_at)
    .map((r: any) => ({ ...r }));
}

// ── Per-service endpoint config ──────────────────────────────────────────────
// Each service exposes its live console endpoints under its own base URL and
// path convention. `details` is optional — services backed by the shared
// `requests` table (e.g. S3, LB) don't need their own details endpoint and
// fall back to vm-request-service's generic lookup below.
interface ServiceEndpoints {
  base: string;
  details?: (requestId: string) => string;
  logs?: (requestId: string, operation?: string) => string;
  // "text" services return the raw log file body (e.g. piped straight from S3)
  // instead of the default `{ logs, status }` JSON envelope.
  logsFormat?: "json" | "text";
  live: (requestId: string) => string;
  liveOnly?: boolean;
}

const SERVICE_ENDPOINTS: Record<string, ServiceEndpoints> = {
  "vpc-service": {
    base: env.vpcService,
    details: (id) => `/requests/${id}`,
    logs: (id) => `/requests/${id}/logs`,
    live: (id) => `/requests/${id}/logs/live`,
  },
  "s3-service": {
    base: env.bucketService,
    // Archived operation logs are stored per-operation in S3 as
    // `<requestId>/<operation>/<operation>.log` (see bucketS3LogService.js).
    // `operation` defaults to "create" since that's the only operation that
    // can be in-flight when this is polled during/after provisioning.
    logs: (id, operation = "create") => `logs/${id}/${operation}/${operation}.log`,
    logsFormat: "text",
    live: (id) => `buckets/${id}/live-logs`,
  },
  "lb-service": {
    base: env.lbService,
    logs: (id) => `/load-balancers/by-request/${id}/logs`,
    live: (id) => `/load-balancers/by-request/${id}/logs/live`,
  },
};

const DEFAULT_ENDPOINTS: Required<Pick<ServiceEndpoints, "details" | "logs" | "live">> & { base: string } = {
  base: env.vmRequest,
  details: (id) => `/api/vm-requests/${id}`,
  logs: (id) => `/api/vm-requests/${id}/logs`,
  live: (id) => `/api/vm-requests/${id}/logs/live`,
};

// ── Fetch request details ────────────────────────────────────────────────────
export async function fetchRequestDetailsApi(requestId: string, service?: string): Promise<RequestDetails> {
  const endpoints = service ? SERVICE_ENDPOINTS[service] : undefined;

  if (endpoints?.details) {
    const response = await apiClient.get<ApiResponse<any>>(
      endpoints.base,
      endpoints.details(requestId)
    );
    const d = response.data;
    return {
      requestId: d.request_id,
      status: normalizeStatus(d.status ?? "pending"),
      region: d.region,
      created_at: d.created_at,
    };
  }

  const response = await apiClient.get<ApiResponse<RequestDetails>>(
    DEFAULT_ENDPOINTS.base,
    DEFAULT_ENDPOINTS.details(requestId)
  );
  if (!response.data) {
    throw new Error("Request details not found");
  }

  return {
    ...response.data,
    status: normalizeStatus(response.data.status),
  };
}

// ── Fetch request logs ───────────────────────────────────────────────────────
export async function fetchRequestLogsApi(
  requestId: string,
  service?: string,
  operation?: string
): Promise<LogsResponse> {
  const endpoints = service ? SERVICE_ENDPOINTS[service] : undefined;

  if (endpoints) {
    if (!endpoints.logs) {
      return { logs: "", status: "UNKNOWN" };
    }

    if (endpoints.logsFormat === "text") {
      try {
        const text = await apiClient.get<string>(
          endpoints.base,
          endpoints.logs(requestId, operation)
        );
        return { logs: typeof text === "string" ? text : "", status: "SUCCESS" };
      } catch {
        // The archive file may not have finished uploading to S3 yet — treat
        // as "not ready" so the caller's retry loop keeps polling instead of
        // surfacing a hard error.
        return { logs: "", status: "PENDING" };
      }
    }

    const response = await apiClient.get<ApiResponse<any>>(
      endpoints.base,
      endpoints.logs(requestId)
    );
    return response.data;
  }

  const response = await apiClient.get<ApiResponse<LogsResponse>>(
    DEFAULT_ENDPOINTS.base,
    DEFAULT_ENDPOINTS.logs(requestId)
  );
  if (!response.data) {
    throw new Error("Request logs not found");
  }
  return response.data;
}

export function isLiveOnlyService(service?: string): boolean {
  const endpoints = service ? SERVICE_ENDPOINTS[service] : undefined;
  return !!endpoints?.liveOnly;
}

export async function fetchLiveRequestLogsStreamApi(
  requestId: string,
  signal?: AbortSignal,
  service?: string
): Promise<Response> {
  const headers = await apiClient.getAuthHeaders();
  const endpoints = service ? SERVICE_ENDPOINTS[service] : undefined;
  const url = endpoints
    ? `${endpoints.base}${endpoints.live(requestId)}`
    : `${DEFAULT_ENDPOINTS.base}${DEFAULT_ENDPOINTS.live(requestId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to connect to live logs: ${response.status} ${response.statusText}`);
  }

  return response;
}

// ── Clear request logs ───────────────────────────────────────────────────────
export async function clearRequestLogsApi(requestId: string): Promise<void> {
  await apiClient.delete<ApiResponse<void>>(
    env.vmRequest,
    `/api/vm-requests/${requestId}/logs`
  );
}

// ── Download request logs ────────────────────────────────────────────────────
export async function downloadRequestLogsApi(requestId: string): Promise<void> {
  await apiClient.download(
    env.vmRequest,
    `/api/vm-requests/${requestId}/logs/download`,
    `terraform-logs-${requestId}.txt`
  );
}