/**
 * useVMRequests.ts
 * React Query hooks for VM requests management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '@/components/ui/dialog-context';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import {
  fetchVMRequestsApi,
  fetchVMRequestApi,
  retryVMRequestApi,
  retryTerminateVMRequestApi,
  deleteVMRequestApi,
  type VMRequest,
  type VMRequestsResponse,
  deleteVpcRequestApi,
} from '@/components/requests/vmRequestsApi';

const QUERY_KEYS = {
  vmRequests: ['vmRequests'] as const,
  vmRequest: (id: string) => ['vmRequest', id] as const,
};

// ── Fetch VM Requests ────────────────────────────────────────────────────────
export function useVMRequests() {
  return useQuery<VMRequestsResponse>({
    queryKey: QUERY_KEYS.vmRequests,
    queryFn: () => fetchVMRequestsApi(),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

// ── Fetch Single VM Request ──────────────────────────────────────────────────
export function useVMRequest(requestId: string) {
  return useQuery<VMRequest>({
    queryKey: QUERY_KEYS.vmRequest(requestId),
    queryFn: () => fetchVMRequestApi(requestId),
    enabled: !!requestId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

// ── Retry VM Request ─────────────────────────────────────────────────────────
export function useRetryVMRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();
  const { setActiveRequest } = useAppStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: retryVMRequestApi,
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vmRequests });
      alert({
        title: "Retry Provisioning in Progress",
        severity: "loading",
      });
      setActiveRequest(requestId);
      navigate("/console");
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Retry failed";
      alert({
        title: message,
        severity: "error",
      });
    },
  });
}

// ── Retry Terminate VM Request ───────────────────────────────────────────────
export function useRetryTerminateVMRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();
  const { setActiveRequest } = useAppStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: retryTerminateVMRequestApi,
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vmRequests });
      alert({
        title: "Retry Terminate in Progress",
        severity: "loading",
      });
      setActiveRequest(requestId);
      navigate("/console");
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Retry terminate failed";
      alert({
        title: message,
        severity: "error",
      });
    },
  });
}

// ── Delete VM Request ────────────────────────────────────────────────────────
export function useDeleteVMRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: deleteVMRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vmRequests });
      alert({
        title: "Terminating in progress",
        severity: "loading",
      });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to terminate request";
      alert({
        title: message,
        severity: "error",
      });
    },
  });
}

// ── Delete VPC Request ───────────────────────────────────────────────────────
export function useDeleteVpcRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: deleteVpcRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vmRequests });
      alert({ title: "VPC deletion in progress", severity: "loading" });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to delete VPC request";
      alert({ title: message, severity: "error" });
    },
  });
}
