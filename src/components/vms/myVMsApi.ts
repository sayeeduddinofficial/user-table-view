import { apiClient, env, ApiError } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import { VM, normalizeStatus } from '@/utils/myVMs.utils';

export interface VMSummary { total: number; running: number; stopped: number; }

export interface ConnectInstanceRow {
  name: string;
  instanceId: string;
  type?: string | null;
  publicIp?: string | null;
  privateIp?: string | null;
  availabilityZone?: string | null;
  status?: string | null;
  sshCommand?: string | null;
  rdpCommand?: string | null;
  splunkUrl?: string | null;
}

export interface ConnectAlbData {
  dns?: string | null;
  targetGroup?: string | null;
  dnsRecord?: string | null;
  url?: string | null;
  shcNodes?: any[];
}

export interface RequestConnectPayload {
  requestId: string;
  region?: string | null;
  category?: number | null;
  keyPair?: string | null;
  sshUser?: string | null;
  instances: ConnectInstanceRow[];
  alb: ConnectAlbData;
}

export interface InstanceConnectPayload {
  requestId: string;
  region?: string | null;
  category?: number | null;
  keyPair?: string | null;
  sshUser?: string | null;
  instance: ConnectInstanceRow;
  alb: ConnectAlbData;
}

export async function fetchVMSummaryApi(): Promise<VMSummary> {
  const res = await apiClient.get<ApiResponse<VMSummary>>(env.runtime, '/api/vms/summary/db');
  return res.data!;
}

export async function fetchVMListApi(): Promise<VM[]> {
  const res = await apiClient.get<ApiResponse<VM[]>>(env.runtime, '/api/vms/db/vms');
  return (res.data ?? [])
    .map((vm) => ({ ...vm, status: normalizeStatus(vm.status) }))
    .sort((a, b) => new Date(b.launchedAt ?? 0).getTime() - new Date(a.launchedAt ?? 0).getTime());
}

export async function fetchStatusUpdatesApi(): Promise<{ success: boolean; data: any[] }> {
  return apiClient.get(env.runtime, '/api/vms/status-updates');
}

export async function fetchVMStatusApi(instanceId: string): Promise<{ status: string; publicIp?: string; privateIp?: string; stop_time?: string | null }> {
  return apiClient.get(env.runtime, `/api/vms/${instanceId}/status`);
}

export async function startVMApi(instanceId: string): Promise<{ stop_time?: string | null }> {
  return apiClient.post(env.runtime, `/api/vms/${instanceId}/start`);
}

export async function stopVMApi(instanceId: string): Promise<void> {
  return apiClient.post(env.runtime, `/api/vms/${instanceId}/stop`);
}

export async function deleteVMApi(instanceId: string): Promise<void> {
  return apiClient.delete(env.runtime, `/api/vms/instance/${instanceId}`);
}

export async function startAllVMsApi(requestId: string): Promise<{ stop_time?: string | null }> {
  return apiClient.post(env.runtime, `/api/vms/vm-requests/${requestId}/start`);
}

export async function fetchRequestConnectApi(requestId: string): Promise<RequestConnectPayload> {
  const res = await apiClient.get<{ success?: boolean; data?: RequestConnectPayload }>(env.vmRequest, `/api/vm-requests/${requestId}/connect`);
  return (res?.data ?? res) as RequestConnectPayload;
}

export async function fetchInstanceConnectApi(instanceId: string): Promise<InstanceConnectPayload> {
  const res = await apiClient.get<{ success?: boolean; data?: InstanceConnectPayload }>(env.runtime, `/api/vms/${instanceId}/connect`);
  return (res?.data ?? res) as InstanceConnectPayload;
}

// CHANGED: mEmail removed from payload — backend resolves manager from Azure AD hierarchy
export async function submitQuotaRequestApi(
  userId: string,
  payload: {
    requestedQuota: number;
    reason: string;
    approverEmail?: string;
  }
): Promise<ApiResponse> {
  return apiClient.post(env.vmRequest, `/api/vms/quota-request/${userId}`, payload);
}

export { ApiError };
