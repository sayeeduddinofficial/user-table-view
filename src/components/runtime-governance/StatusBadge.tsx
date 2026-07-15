import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExtensionRequest } from '../runtime-governance/types/index';

interface Props {
  status: ExtensionRequest['approval_status'];
}

const CONFIG = {
  pending:      { icon: AlertTriangle, label: 'Pending',       cls: 'bg-amber-500/10   text-amber-500   border-amber-500/30'   },
  approved:     { icon: CheckCircle2,  label: 'Approved',      cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  rejected:     { icon: XCircle,       label: 'Rejected',      cls: 'bg-red-500/10     text-red-500     border-red-500/30'     },
  expired:      { icon: Clock,         label: 'Expired',       cls: 'bg-muted/50       text-muted-foreground border-border/50' },
  auto_approved:{ icon: CheckCircle2,  label: 'Auto-Approved', cls: 'bg-blue-500/10    text-blue-500    border-blue-500/30'    },
} as const;

export function StatusBadge({ status }: Props) {
  const { icon: Icon, label, cls } = CONFIG[status] ?? CONFIG.expired;
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}