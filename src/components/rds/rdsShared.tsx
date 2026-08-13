/**
 * rdsShared.tsx
 * Presentational primitives shared across the RDS screens.
 */

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { RdsRole, RdsStatus } from "@/components/rds/rdsTypes";

const STATUS_STYLES: Partial<Record<RdsStatus, { cls: string; icon: ReactNode }>> = {
  Available: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={11} /> },
  Provisioning: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Clock size={11} /> },
  Terminating: { cls: "bg-orange-500/10 text-orange-400 border-red-500/20", icon: <AlertCircle size={11} /> },
  Stopped: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <AlertCircle size={11} /> },
  Modifying: { cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <Clock size={11} /> },
};

const ROLE_STYLES: Record<RdsRole, string> = {
  "Regional cluster": "bg-primary/10 text-primary border-primary/20",
  "Writer instance": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Reader instance": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Standalone: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function StatusBadge({ status }: { status: RdsStatus }) {
  const { cls, icon } = STATUS_STYLES[status] ?? STATUS_STYLES.Available!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {icon} {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: RdsRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  );
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
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}