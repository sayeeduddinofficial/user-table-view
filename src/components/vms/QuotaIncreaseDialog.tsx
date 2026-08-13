import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyManager } from "@/hooks/useMyManager";
import {ManagerDisplay} from "@/components/common/ManagerDisplay";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMaxVMs: number;
  usedVMs: number;
  activeVMs: number;
  provisioningVMs: number;
  requestedquota: number;
  setrequestedquota: (v: number) => void;
  reason: string;
  setreason: (v: string) => void;
  submitquota: boolean;
  quotaError: string;
  setQuotaError: (v: string) => void;
  touched: boolean;
  setTouched: (v: boolean) => void;
  isMAxREached: boolean;
   onSubmit: (approverEmail: string) => void;
}

export function QuotaIncreaseDialog({
  open, onOpenChange, currentMaxVMs, usedVMs, activeVMs, provisioningVMs,
  requestedquota, setrequestedquota, reason, setreason,
  submitquota, quotaError, setQuotaError, setTouched,
  isMAxREached, onSubmit,
}: Props) {
  // Use the new manager hook that handles both active managers and Super Admin fallback
  const { manager, superAdmins, hasActiveManager, loading: managerLoading, error: managerError } = useMyManager();
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState('');
  const [quotaTouched, setQuotaTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);
  const [submitTouched, setSubmitTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuotaTouched(false);
      setReasonTouched(false);
      setSubmitTouched(false);
      setSelectedSuperAdmin('');
    }
  }, [open]);

  const managerEmail = hasActiveManager && manager?.email
    ? manager.email
    : selectedSuperAdmin;

  const quotaValidationError = quotaTouched
    ? requestedquota === 0
      ? "New limit is required"
      : requestedquota <= currentMaxVMs
      ? `New limit must be greater than ${currentMaxVMs}`
      : requestedquota > 50
      ? "Maximum VM quota limit (50) exceeded"
      : ""
    : "";
  const reasonError = reasonTouched
    ? !reason.trim()
      ? "Reason is required"
      : submitTouched && reason.trim().length < 10
      ? "Reason must be at least 10 characters"
      : ""
    : submitTouched && reason.trim().length < 10
    ? "Reason must be at least 10 characters"
    : "";
  const managerError2 = submitTouched && !managerLoading && !managerEmail.trim() ? "Please select an approver" : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Request Quota Increase</DialogTitle>
          <DialogDescription>
            Submit a request to increase your VM quota. An admin will review and respond.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Current Quota</Label>
              <p className="text-lg font-semibold">{currentMaxVMs} VMs</p>
              <p className="text-xs text-muted-foreground">
                {usedVMs} in use ({activeVMs} running, {provisioningVMs} provisioning)
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="requested-quota">New limit</Label>
              <Input
                id="requested-quota"
                type="number"
                className={quotaError ? "border-red-500" : ""}
                min="0"
                max="50"
                value={requestedquota === 0 ? "" : requestedquota}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuotaTouched(true);
                  if (value === "") {
                    setrequestedquota(0);
                    setQuotaError("");
                    return;
                  }
                  let numericValue = Number(value);
                  if (value.length > 1 && value.startsWith("0")) {
                    numericValue = Number(value.replace(/^0+/, ""));
                  }
                  setrequestedquota(numericValue);
                  if (currentMaxVMs >= 50) {
                    setQuotaError("Maximum VM quota limit (50) already reached");
                    return;
                  }
                  setQuotaError(numericValue <= currentMaxVMs ? `New limit must be greater than ${currentMaxVMs}` : "");
                }}
              />
              {quotaValidationError && <p className="text-sm text-red-500">{quotaValidationError}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">
              Reason / Justification
            </Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Explain why you need additional VM capacity..."
              value={reason}
              onChange={(e) => { setReasonTouched(true); setreason(e.target.value); }}
            />
            {reasonError && <p className="text-sm text-red-500">{reasonError}</p>}
          </div>

          <ManagerDisplay
            manager={manager}
            superAdmins={superAdmins || []}
            hasActiveManager={hasActiveManager}
            loading={managerLoading}
            error={managerError}
            selectedEmail={selectedSuperAdmin}
            onEmailChange={setSelectedSuperAdmin}
            label="Manager (Approver)"
          />
          {managerError2 && (
            <p className="text-sm text-red-500">{managerError2}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setTouched(true);
              setQuotaTouched(true);
              setReasonTouched(true);
              setSubmitTouched(true);
              if (requestedquota === 0 || requestedquota <= currentMaxVMs || requestedquota > 50) return;
              if (!reason.trim() || reason.trim().length < 10) return;
              if (!managerEmail.trim()) return;
              onSubmit(managerEmail);
            }}
            disabled={isMAxREached || submitquota}
          >
            {submitquota ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
