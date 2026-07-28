/**
 * useLiveConsole.ts
 * React Query hooks for Live Console management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '@/components/ui/dialog-context';
import { useAppStore } from '@/store/appStore';
import {
  fetchActiveRequestsApi,
  fetchRequestDetailsApi,
  fetchRequestLogsApi,
  clearRequestLogsApi,
  downloadRequestLogsApi,
} from '@/components/console/liveConsoleApi';

const QUERY_KEYS = {
  activeRequests: ['activeRequests'] as const,
  requestDetails: (requestId: string, service?: string) => ['requestDetails', requestId, service?? 'vm-service'] as const,
  requestLogs: (requestId: string) => ['requestLogs', requestId] as const,
};

// Same terminal-state definition LiveConsole.tsx already uses to decide
// when to stop live-streaming and fetch the archived log.
const TERMINAL_REQUEST_STATUSES = new Set([
  'completed',
  'failed',
  'terminated',
  'destroyed',
]);

// ── Fetch Active Requests ────────────────────────────────────────────────────
export function useActiveRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.activeRequests,
    queryFn: fetchActiveRequestsApi,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

// ── Fetch Request Details ────────────────────────────────────────────────────
export function useRequestDetails(requestId: string | null, service?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.requestDetails(requestId || '', service),
    queryFn: () => fetchRequestDetailsApi(requestId!, service),
    enabled: !!requestId,
    staleTime: 3_000,
    refetchInterval: (query) =>
      query.state.data && TERMINAL_REQUEST_STATUSES.has(query.state.data.status)
        ? false
        : 3_000,
  });
}

// ── Fetch Request Logs ───────────────────────────────────────────────────────
export function useRequestLogs(requestId: string | null, service?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.requestLogs(requestId || ''),
    queryFn: () => fetchRequestLogsApi(requestId!, service),
    enabled: !!requestId,
    staleTime: 0,
    refetchInterval: 3_000,
  });
}

// ── Clear Request Logs ───────────────────────────────────────────────────────
export function useClearRequestLogs() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();
  const { setActiveRequest, triggerRequestsRefresh } = useAppStore();

  return useMutation({
    mutationFn: clearRequestLogsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeRequests });
      setActiveRequest(null);
      triggerRequestsRefresh();
      alert({
        title: "Logs cleared successfully",
        severity: "success",
      });
    },
    onError: (err) => {
      alert({
        title: err instanceof Error ? err.message : "Failed to clear logs",
        severity: "error",
      });
    },
  });
}

// ── Download Request Logs ────────────────────────────────────────────────────
export function useDownloadRequestLogs() {
  const { alert } = useDialog();
  const { activeService } = useAppStore();

  return useMutation({
    mutationFn: (requestId: string) => downloadRequestLogsApi(requestId, activeService ?? undefined),
    onError: (err) => {
      alert({
        title: err instanceof Error ? err.message : "Failed to download logs",
        severity: "error",
      });
    },
  });
}

// ── Invalidate logs when request changes ─────────────────────────────────────
export function useInvalidateLogsOnRequestChange() {
  const queryClient = useQueryClient();

  return (currentRequestId: string | null, newRequestId: string | null) => {
    if (newRequestId !== currentRequestId) {
      queryClient.removeQueries({ 
        queryKey: QUERY_KEYS.requestLogs(currentRequestId || '') 
      });
    }
  };
}