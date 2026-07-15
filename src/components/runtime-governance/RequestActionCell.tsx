import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplayRow } from '../runtime-governance/types/index';
import { isVMTransitioning } from "../../utils/Runtimegovernance.utils";

interface Props {
  row: DisplayRow;
  canAct: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (row: DisplayRow) => void;
  onReject: (row: DisplayRow) => void;
}

export function RequestActionCell({
  row, canAct, isApproving, isRejecting, onApprove, onReject,
}: Props) {
  const req = row.representativeRow;
  const isActing = isApproving || isRejecting;

  // VM in transition — show disabled buttons with tooltip
  if (row.effectiveStatus === 'pending' && isVMTransitioning(req)) {
    const tooltip = `VM is ${req.vm_status} — actions unavailable until VM reaches a stable state`;
    return (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" disabled tooltip={tooltip}
          className="h-8 w-8 text-muted-foreground/40 cursor-not-allowed">
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled tooltip={tooltip}
          className="h-8 w-8 text-muted-foreground/40 cursor-not-allowed">
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!canAct) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost" size="icon" disabled={isActing} tooltip="Approve"
        className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
        onClick={() => onApprove(row)}
      >
        {isApproving
          ? <RefreshCw className="h-4 w-4 animate-spin" />
          : <CheckCircle2 className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost" size="icon" disabled={isActing} tooltip="Reject"
        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        onClick={() => onReject(row)}
      >
        {isRejecting
          ? <RefreshCw className="h-4 w-4 animate-spin" />
          : <XCircle className="h-4 w-4" />}
      </Button>
    </div>
  );
}