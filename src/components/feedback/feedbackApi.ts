/**
 * feedbackApi.ts
 * All fetch calls for feedback — import from here, not inline in components.
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export interface FeedbackEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  attachment_count: number;
}

export interface FeedbackRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export interface AttachmentItem {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  url: string;
}

export interface SubmitFeedbackPayload {
  type: string;
  priority: string;
  title: string;
  description: string;
  files: File[];
}

export interface ReviewFeedbackPayload {
  feedbackId: string;
  status: string;
  adminNotes: string;
}

// ── Fetch my feedbacks ───────────────────────────────────────────────────────
export async function fetchMyFeedbackApi(): Promise<FeedbackEntry[]> {
  const response = await apiClient.get<ApiResponse<FeedbackEntry[]>>(env.feedback, "/feedback/my");
  return response.data ?? [];
}

// ── Fetch all feedbacks (admin) ──────────────────────────────────────────────
export async function fetchAllFeedbackApi(): Promise<FeedbackRow[]> {
  const response = await apiClient.get<ApiResponse<FeedbackRow[]>>(env.feedback, "/feedback/all");
  return response.data ?? [];
}

// ── Submit feedback (FormData — apiClient.post now supports it) ──────────────
export async function submitFeedbackApi(payload: SubmitFeedbackPayload): Promise<void> {
  const formData = new FormData();
  formData.append("type", payload.type);
  formData.append("priority", payload.priority);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  payload.files.forEach((file) => formData.append("attachments", file));

  await apiClient.post<ApiResponse>(env.feedback, "/feedback", formData);
}

// ── Fetch attachments ────────────────────────────────────────────────────────
export async function fetchAttachmentsApi(feedbackId: string): Promise<AttachmentItem[]> {
  const response = await apiClient.get<ApiResponse<AttachmentItem[]>>(
    env.feedback,
    `/feedback/${feedbackId}/attachments`,
  );
  return response.data ?? [];
}

// ── Review feedback (admin) ──────────────────────────────────────────────────
export async function reviewFeedbackApi(payload: ReviewFeedbackPayload): Promise<void> {
  await apiClient.put<ApiResponse>(env.feedback, `/feedback/${payload.feedbackId}/review`, {
    status: payload.status,
    adminNotes: payload.adminNotes,
  });
}

// ── Download attachment (blob response — cannot use apiClient) ───────────────
export async function downloadAttachmentApi(
  feedbackId: string,
  attachmentId: number,
  fileName: string,
): Promise<void> {
  await apiClient.download(
    env.feedback,
    `/feedback/${feedbackId}/attachments/${attachmentId}/download`,
    fileName,
  );
}
