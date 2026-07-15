// src/utils/myVMs.utils.ts
import { ROLE_NAMES } from "@/types";

export interface VM {
  id: number;
  name: string;
  role: string;
  instanceId: string;
  instanceType?: string;
  publicIp: string;
  privateIp: string;
  region: string;
  status:
    | "running" | "stopped" | "starting" | "stopping" | "pending"
    | "shutting-down" | "terminating" | "destroyed" | "terminated";
  requestId: string | null;
  userId: number;
  workspace?: string;
  launchedAt?: string;
  stop_time?: string | null;
  base_stop_time?: string | null;
  environment?: string;
}

export interface ManagerOption {
  email: string;
  name: string;
}

export const statusConfig: Record<string, { color: string; label: string }> = {
  running:    { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Running" },
  stopped:    { color: "bg-amber-500/20 text-amber-400 border-amber-500/30",       label: "Stopped" },
  starting:   { color: "bg-blue-500/20 text-blue-400 border-blue-500/30",          label: "Starting" },
  stopping:   { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",    label: "Stopping" },
  terminating:{ color: "bg-orange-500/20 text-orange-400 border-orange-500/30",    label: "Terminating" },
  terminated: { color: "bg-red-500/20 text-red-400 border-red-500/30",             label: "Terminated" },
  unknown:    { color: "bg-muted text-muted-foreground border-border",              label: "Unknown" },
};

export const roleMap: Record<string, string> = Object.fromEntries(
  ROLE_NAMES.map((r) => [r.name.toLowerCase(), r.id])
);

export function formatTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const RUNTIME_WINDOW_MS = 8 * 60 * 60 * 1000;

export function getRuntimeInfo(
  stop_time?: string | null,
  _launchedAt?: string | null,
  _base_stop_time?: string | null
): {
  label: string;
  isExpired: boolean;
  remainingMs: number;
  progressPct: number;
  urgency: "green" | "amber" | "red";
  elapsedLabel: string;
} {
  if (!stop_time) {
    return { label: "—", isExpired: false, remainingMs: 0, progressPct: 0, urgency: "green", elapsedLabel: "" };
  }

  const now = Date.now();
  const stop = new Date(stop_time).getTime();
  const remainingMs = stop - now;
  const launchMs = _launchedAt ? new Date(_launchedAt).getTime() : null;
  const totalMs = launchMs ? stop - launchMs : RUNTIME_WINDOW_MS;

  if (remainingMs <= 0) {
    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1);
    return { label: "Expired", isExpired: true, remainingMs: 0, progressPct: 0, urgency: "red", elapsedLabel: `${totalHours}h / ${totalHours}h used` };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const elapsedMs = totalMs - remainingMs;
  const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
  const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1);
  const urgency = remainingMs < 30 * 60 * 1000 ? "red" : remainingMs < 2 * 60 * 60 * 1000 ? "amber" : "green";

  return {
    label: hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`,
    isExpired: false, remainingMs, progressPct, urgency,
    elapsedLabel: `${elapsedHours}h / ${totalHours}h used`,
  };
}

export function normalizeStatus(status: VM["status"]): VM["status"] {
  if (status === "shutting-down") return "terminating";
  if (status === "pending") return "starting";
  return status;
}
