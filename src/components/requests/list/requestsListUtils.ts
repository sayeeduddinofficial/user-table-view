/**
 * requestsListUtils.ts
 * Pure helpers for the Requests list page.
 */
import { parseBackendTimestamp } from "@/utils/date";
import type { VMRequest as Request } from "@/components/requests/vmRequestsApi";

export const MAX_RETRIES = 3;

export const statusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    label: "Pending",
  },
  provisioning: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    label: "Provisioning",
  },
  completed: {
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    label: "Completed",
  },
  failed: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "Failed",
  },
  destroying: {
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    label: "Terminating",
  },
  destroyed: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    label: "Terminated",
  },
  "retry provisioning": {
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    label: "Retry Provisioning",
  },
  retrying: {
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    label: "Retrying",
  },
  retrying_terminate: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    label: "Retrying Terminate",
  },
};

export const ACTIVE_STATUSES = new Set([
  "pending",
  "provisioning",
  "retrying",
  "retry provisioning",
  "destroying",
  "retrying_terminate",
]);

export const getRequestActivityTime = (req: Request) => {
  const createdAt = parseBackendTimestamp(req.created_at).getTime();
  const updatedAt = req.updated_at ? parseBackendTimestamp(req.updated_at).getTime() : NaN;
  if (Number.isFinite(updatedAt)) {
    return Math.max(createdAt, updatedAt);
  }
  return createdAt;
};

export const sortRequestsByLatestActivity = (items: Request[]) =>
  [...items].sort((a, b) => getRequestActivityTime(b) - getRequestActivityTime(a));
