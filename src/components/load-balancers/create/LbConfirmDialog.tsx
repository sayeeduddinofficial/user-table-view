/**
 * LbConfirmDialog.tsx
 * Confirmation dialog shown before submitting the Load Balancer create request.
 */

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ListenerConfig, LbKind } from "../lbCreate.types";

interface LbConfirmDialogProps {
  kind: LbKind;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  scheme: "internet-facing" | "internal";
  name: string;
  ipType: string;
  vpc: string;
  azs: string[];
  sgs: string[];
  listeners: ListenerConfig[];
  justifications: string;
  isSubmitting: boolean;
  handleConfirm: () => void;
}

export function LbConfirmDialog({
  kind,
  isDialogOpen,
  setIsDialogOpen,
  scheme,
  name,
  ipType,
  vpc,
  azs,
  sgs,
  listeners,
  justifications,
  isSubmitting,
  handleConfirm,
}: LbConfirmDialogProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] flex flex-col"
        onInteractOutside={(event) => event.preventDefault()}>
        <div className="p-4 pb-4 border-b">
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Confirm Load Balancer Creation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Please review the load balancer settings before creating it.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Load balancer type</p>
              <p className="font-medium text-foreground">{kind}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Scheme</p>
              <p className="font-medium text-foreground">{scheme}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Load balancer name</p>
              <p className="font-medium text-foreground">{name}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">IP type</p>
              <p className="font-medium text-foreground">{ipType}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">VPC</p>
              <p className="font-medium text-foreground">{vpc}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Availability Zones</p>
              <p className="font-medium text-foreground">{azs.length ? azs.join(", ") : "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Security groups</p>
              <p className="font-medium text-foreground">{sgs.join(", ")}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Listeners</p>
              <p className="font-medium text-foreground">{listeners.length} listener{listeners.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Listener details</p>
            <div className="space-y-3">
              {listeners.map((listener) => (
                <div key={listener.id} className="rounded-md border border-border p-3 bg-background/50">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{listener.protocol}:{listener.port}</span>
                    <span className="text-muted-foreground">{listener.action === "forward" ? "Forward" : listener.action === "redirect" ? "Redirect" : "Fixed response"}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div>Target group count: {listener.targetGroups.length}</div>
                    <div>Tags: {listener.tags.length}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Business Justification</p>
            <p className="font-medium text-foreground">{justifications || "-"}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Go Back & Edit
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
