/**
 * RdsConfirmDialog.tsx
 * Review-and-submit dialog for the RDS create flow.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAcu } from '@/utils/rds.utils';

interface RdsConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  values: {
    identifier: string;
    username: string;
    minCapacity: string;
    maxCapacity: string;
    pauseAfter: string;
    justification: string;
  };
}

export function RdsConfirmDialog({
  open,
  onOpenChange,
  isSubmitting,
  onConfirm,
  values,
}: RdsConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-4 pb-4 border-b">
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-xl font-semibold text-foreground">Confirm RDS Database Request</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Please review the details below before submitting your request.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="DB Engine" value="Aurora PostgreSQL" />
            <SummaryTile label="Engine Version" value="Version 17" />
          </div>

          <SummaryTile label="DB Cluster Identifier" value={values.identifier} />
          <SummaryTile label="Master Username" value={values.username} />

          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Min Capacity" value={formatAcu(values.minCapacity)} />
            <SummaryTile label="Max Capacity" value={formatAcu(values.maxCapacity)} />
          </div>

          <SummaryTile label="Pause After Inactivity" value={`${values.pauseAfter} seconds`} />

          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Storage" value="Aurora Standard" />
            <SummaryTile label="Encryption" value="Enabled" />
          </div>

          <SummaryTile label="Business Justification" value={values.justification} preserveWhitespace />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Go Back &amp; Edit
              </Button>
              <Button onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Confirm & Submit'}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  preserveWhitespace = false,
}: {
  label: string;
  value: string;
  preserveWhitespace?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-medium text-foreground ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}
