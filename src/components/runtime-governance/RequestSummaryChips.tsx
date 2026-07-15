import { DisplayRow } from '../runtime-governance/types/index';

interface Props {
  displayRows: DisplayRow[];
}

const chips = [
  { key: 'pending',      label: 'Pending',       color: 'amber'   },
  { key: 'approved',     label: 'Approved',      color: 'emerald' },
  { key: 'rejected',     label: 'Rejected',      color: 'red'     },
  { key: 'expired',      label: 'Expired',       color: 'muted'   },
  { key: 'auto_approved',label: 'Auto-Approved', color: 'blue'    },
] as const;

const colorMap: Record<string, string> = {
  amber:   'border-amber-500/20   bg-amber-500/5   [&>div]:bg-amber-500',
  emerald: 'border-emerald-500/20 bg-emerald-500/5 [&>div]:bg-emerald-500',
  red:     'border-red-500/20     bg-red-500/5     [&>div]:bg-red-500',
  muted:   'border-border/50      bg-muted/30      [&>div]:bg-muted-foreground',
  blue:    'border-blue-500/20    bg-blue-500/5    [&>div]:bg-blue-500',
};

export function RequestSummaryChips({ displayRows }: Props) {
  const counts = {
    pending:      displayRows.filter((r) => r.effectiveStatus === 'pending').length,
    approved:     displayRows.filter((r) => r.effectiveStatus === 'approved').length,
    auto_approved:displayRows.filter((r) => r.effectiveStatus === 'auto_approved').length,
    rejected:     displayRows.filter((r) => r.effectiveStatus === 'rejected').length,
    expired:      displayRows.filter((r) => r.effectiveStatus === 'expired').length,
  };

  return (
    <div className="px-4 md:px-6 pt-4 pb-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {chips.map(({ key, label, color }) => (
          <div
            key={key}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${colorMap[color]}`}
          >
            <div className="h-2.5 w-2.5 rounded-full shrink-0" />
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
            <span className="ml-auto text-xl font-bold text-foreground">
              {counts[key as keyof typeof counts]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}