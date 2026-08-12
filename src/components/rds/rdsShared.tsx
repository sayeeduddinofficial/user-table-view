/**
 * rdsShared.tsx
 * Small presentational primitives reused across the RDS screens.
 */

import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy } from 'lucide-react';
import { copyToClipboard, type RdsRole, type RdsStatus } from '@/utils/rds.utils';

const STATUS_STYLES: Record<RdsStatus, { cls: string; icon: ReactNode }> = {
  Available: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={11} /> },
  Creating: { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Clock size={11} /> },
  Deleting: { cls: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertCircle size={11} /> },
  Stopped: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <AlertCircle size={11} /> },
  Modifying: { cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: <Clock size={11} /> },
};

export function StatusBadge({ status }: { status: RdsStatus }) {
  const { cls, icon } = STATUS_STYLES[status] ?? STATUS_STYLES.Available;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {icon} {status}
    </span>
  );
}

const ROLE_STYLES: Record<RdsRole, string> = {
  'Regional cluster': 'bg-primary/10 text-primary border-primary/20',
  'Writer instance': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Reader instance': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Standalone: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

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
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function FieldWithCopy({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <Copy
          size={14}
          className="text-muted-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={() => copyToClipboard(value, label)}
        />
        <span className="text-sm font-mono break-all">{value}</span>
      </div>
    </div>
  );
}

export function ConfigField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      {label && <div className="text-xs text-muted-foreground mb-0.5">{label}</div>}
      <div className="text-sm text-foreground break-words">{value ?? '—'}</div>
    </div>
  );
}

export function CopyableArn({ arn, label = 'ARN' }: { arn?: string; label?: string }) {
  return (
    <div className="flex items-start gap-1">
      <Copy
        size={12}
        className="text-muted-foreground cursor-pointer hover:text-primary mt-0.5 shrink-0"
        onClick={() => copyToClipboard(arn ?? '', label)}
      />
      <span className="text-xs text-primary break-all">{arn ?? '—'}</span>
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold text-foreground mb-4">{children}</p>;
}
