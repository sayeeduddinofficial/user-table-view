/**
 * LbFooterActions.tsx
 * Footer create/cancel actions for the Load Balancer create flow.
 */

import { Button } from "@/components/ui/button";

interface LbFooterActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export function LbFooterActions({
  onCancel,
  onSubmit,
}: LbFooterActionsProps) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <span>
        <Button onClick={onSubmit}>
          Create Load Balancer
        </Button>
      </span>
    </div>
  );
}
