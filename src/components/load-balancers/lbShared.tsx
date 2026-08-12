/**
 * lbShared.tsx
 * Small presentational primitives reused across the Load Balancer screens.
 */

import type { ReactNode } from "react";

export const LB_STATUS_CONFIG: Record<string, { color: string; label: string; text: string }> = {
  pending: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Pending", text: "text-gray-400" },
  provisioning: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Provisioning", text: "text-blue-400" },
  creating: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Creating", text: "text-blue-400" },
  completed: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Active", text: "text-emerald-400" },
  active: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Active", text: "text-emerald-400" },
  failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Failed", text: "text-red-400" },
  destroying: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Destroying", text: "text-orange-400" },
  deleting: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Deleting", text: "text-orange-400" },
  terminating: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Terminating", text: "text-orange-400" },
  destroyed: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Destroyed", text: "text-gray-400" },
  deleted: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Deleted", text: "text-gray-400" },
  terminated: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Terminated", text: "text-gray-400" },
  retrying: { color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", label: "Retrying", text: "text-indigo-400" },
  retrying_terminate: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Retrying Terminate", text: "text-purple-400" },
};

export function getLbStatusColor(status: string): string {
  return LB_STATUS_CONFIG[status?.toLowerCase()]?.color ?? LB_STATUS_CONFIG.pending.color;
}

export function getLbStatusLabel(status: string): string {
  return LB_STATUS_CONFIG[status?.toLowerCase()]?.label ?? status;
}

export function getLbStatusTextClass(status: string): string {
  return LB_STATUS_CONFIG[status?.toLowerCase()]?.text ?? "text-gray-400";
}

export function formatLbDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export async function submitLbQuotaRequest({
  userId,
  requestedQuota,
  currentMax,
  reason,
  approverEmail,
  lbServiceUrl,
  getClientIp,
}: {
  userId: number | string | undefined;
  requestedQuota: number;
  currentMax: number;
  reason: string;
  approverEmail: string;
  lbServiceUrl: string;
  getClientIp: () => Promise<string | null>;
}): Promise<void> {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${lbServiceUrl}/lb-quota/${userId}/request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-client-ip": (await getClientIp()) || "",
      },
      body: JSON.stringify({
        requestedQuota: requestedQuota - currentMax,
        reason,
        approverEmail,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Failed to submit LB quota request"
    );
  }
}
