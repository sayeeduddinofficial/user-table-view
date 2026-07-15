/**
 * useQuotaRequests.ts
 * React Query hooks for Quota Requests management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '@/components/ui/dialog-context';
import { ApiError } from '@/lib/api';
import {
  fetchQuotaRequestsApi,
  approveQuotaRequestApi,
  rejectQuotaRequestApi,
  approveQuotaRequestByTokenApi,
  rejectQuotaRequestByTokenApi,
} from '@/components/quota/quotaRequestsApi';

const QUERY_KEYS = {
  quotaRequests: ['quotaRequests'] as const,
};

// ── Fetch Quota Requests ─────────────────────────────────────────────────────
export function useQuotaRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.quotaRequests,
    queryFn: fetchQuotaRequestsApi,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ── Approve Quota Request ────────────────────────────────────────────────────
export function useApproveQuotaRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) =>
      approveQuotaRequestApi(requestId, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotaRequests });
      alert({
        title: "Request approved successfully",
        severity: "success",
      });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to approve request";
      alert({
        title: message,
        severity: "error",
      });
    },
  });
}

// ── Reject Quota Request ─────────────────────────────────────────────────────
export function useRejectQuotaRequest() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) =>
      rejectQuotaRequestApi(requestId, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotaRequests });
      alert({
        title: "Request rejected successfully",
        severity: "success",
      });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to reject request";
      alert({
        title: message,
        severity: "error",
      });
    },
  });
}

// ── Approve by Email Token ───────────────────────────────────────────────────
export function useApproveQuotaRequestByToken() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: approveQuotaRequestByTokenApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotaRequests });
      alert({
        title: "Quota request approved successfully.",
        severity: "success",
      });
    },
    onError: (err: any) => {
      const friendlyErrors: Record<string, string> = {
        INVALID_TOKEN: "Invalid approval link. Please contact your administrator.",
        INVALID_OR_EXPIRED_TOKEN: "This link has expired (links are valid for 48 hours). No action was taken.",
        REQUEST_NOT_FOUND: "This quota request could not be found. It may have been deleted.",
        ALREADY_PROCESSED: "This request has already been approved or rejected. No further action is needed.",
        REQUEST_EXPIRED: "This request has expired. It may have been superseded by a newer request or the 48-hour time limit has passed.",
        QUOTA_EXCEEDED: "Approval would exceed the maximum VM quota (50). No action was taken.",
        UNAUTHORIZED_USER: "This link was sent to a different manager. Only the recipient manager can approve or reject this request.",
      };

      const message = err instanceof ApiError 
        ? (friendlyErrors[err.code] || err.message)
        : "Approval failed.";

      alert({
        title: message,
        severity: err instanceof ApiError && err.code === "ALREADY_PROCESSED" ? "warning" : "error",
      });
    },
  });
}

// ── Reject by Email Token ────────────────────────────────────────────────────
export function useRejectQuotaRequestByToken() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: rejectQuotaRequestByTokenApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotaRequests });
      alert({
        title: "Quota request rejected successfully.",
        severity: "success",
      });
    },
    onError: (err: any) => {
      const friendlyErrors: Record<string, string> = {
        INVALID_TOKEN: "Invalid rejection link. Please contact your administrator.",
        INVALID_OR_EXPIRED_TOKEN: "This link has expired (links are valid for 48 hours). No action was taken.",
        REQUEST_NOT_FOUND: "This quota request could not be found. It may have been deleted.",
        ALREADY_PROCESSED: "This request has already been approved or rejected. No further action is needed.",
        REQUEST_EXPIRED: "This request has expired. It may have been superseded by a newer request or the 48-hour time limit has passed.",
        UNAUTHORIZED_USER: "This link was sent to a different manager. Only the recipient manager can approve or reject this request.",
      };

      const message = err instanceof ApiError 
        ? (friendlyErrors[err.code] || err.message)
        : "Rejection failed.";

      alert({
        title: message,
        severity: err instanceof ApiError && err.code === "ALREADY_PROCESSED" ? "warning" : "error",
      });
    },
  });
}