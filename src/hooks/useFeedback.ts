/**
 * useFeedback.ts
 * React Query hooks for feedback with automatic caching and refetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/components/ui/dialog-context";
import {
  fetchMyFeedbackApi,
  fetchAllFeedbackApi,
  fetchAttachmentsApi,
  submitFeedbackApi,
  reviewFeedbackApi,
  downloadAttachmentApi,
  type SubmitFeedbackPayload,
  type ReviewFeedbackPayload,
} from "@/components/feedback/feedbackApi";

const QUERY_KEYS = {
  myFeedback: ["feedback", "my"] as const,
  allFeedback: ["feedback", "all"] as const,
  attachments: (id: string) => ["feedback", "attachments", id] as const,
};

// ── My Feedbacks ─────────────────────────────────────────────────────────────
export function useMyFeedback(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.myFeedback,
    queryFn: fetchMyFeedbackApi,
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ── All Feedbacks (admin) ────────────────────────────────────────────────────
export function useAllFeedback(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.allFeedback,
    queryFn: fetchAllFeedbackApi,
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ── Attachments ──────────────────────────────────────────────────────────────
export function useAttachments(feedbackId: string | null, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.attachments(feedbackId ?? ""),
    queryFn: () => fetchAttachmentsApi(feedbackId!),
    enabled: enabled && !!feedbackId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ── Submit Feedback ──────────────────────────────────────────────────────────
export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: (payload: SubmitFeedbackPayload) => submitFeedbackApi(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myFeedback });
      alert({ title: "Feedback submitted successfully", severity: "success" });
    },
    onError: (err: Error) => {
      alert({ title: err.message || "Failed to submit feedback", severity: "error" });
    },
  });
}

// ── Review Feedback (admin) ──────────────────────────────────────────────────
export function useReviewFeedback() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();

  return useMutation({
    mutationFn: (payload: ReviewFeedbackPayload) => reviewFeedbackApi(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allFeedback });
      alert({ title: "Feedback Review Submitted Successfully", severity: "success" });
    },
    onError: (err: Error) => {
      alert({ title: err.message || "Failed to update feedback", severity: "error" });
    },
  });
}

// ── Download Attachment ──────────────────────────────────────────────────────
export function useDownloadAttachment() {
  const { alert } = useDialog();

  return useMutation({
    mutationFn: ({
      feedbackId,
      attachmentId,
      fileName,
    }: {
      feedbackId: string;
      attachmentId: number;
      fileName: string;
    }) => downloadAttachmentApi(feedbackId, attachmentId, fileName),
    onError: () => {
      alert({ title: "Download failed", severity: "error" });
    },
  });
}
