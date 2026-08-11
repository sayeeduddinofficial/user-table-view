/**
 * RdsTokenDialog.tsx
 * Shows the (placeholder) IAM authentication token for a database.
 */

import { Copy, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { copyToClipboard } from '@/utils/rds.utils';

interface RdsTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dbIdentifier: string;
  token: string;
}

export function RdsTokenDialog({ open, onOpenChange, dbIdentifier, token }: RdsTokenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Get token for {dbIdentifier}</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-sm font-semibold mb-1">Authentication token (password)</p>
          <p className="text-xs text-muted-foreground mb-4">
            Choose the authentication option that aligns with the policy attached to your IAM identity. Copy the
            authentication token and provide it as the password when you connect to your cluster. To learn more, see{' '}
            <a href="#" className="text-primary hover:underline">
              Understanding authentication and authorization ↗
            </a>
          </p>
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-md px-4 py-3 mb-4 text-xs text-blue-400">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>The following authentication token will expire in 15 minutes</span>
          </div>
          <div className="bg-muted/20 border border-border rounded-md">
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">1</span>
              <span className="font-mono text-xs text-foreground break-all flex-1">{token}</span>
              <button
                onClick={() => copyToClipboard(token, 'Token')}
                className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
