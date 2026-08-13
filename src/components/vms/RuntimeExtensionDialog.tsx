import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { ManagerDisplay } from '@/components/common/ManagerDisplay';
import { useRuntimeExtensionForm } from '@/hooks/useRuntimeExtensionForm';
import { ScopeSelector } from '@/components/vms/runtime-extension/ScopeSelector';
import { DurationSection } from '@/components/vms/runtime-extension/DurationSection';
import { ReasonSection } from '@/components/vms/runtime-extension/ReasonSection';
import type { RuntimeExtensionDialogProps } from '@/components/vms/runtimeExtension.types';

export default function RuntimeExtensionDialog({
  open,
  onOpenChange,
  extensionContext,
  onSuccess,
}: RuntimeExtensionDialogProps) {
  const {
    requestId,
    vm,
    requestLevelEnabled,
    scope,
    setScope,
    durationOption,
    setDurationOption,
    customHours,
    setCustomHours,
    reason,
    setReason,
    submitting,
    reasonError,
    setReasonError,
    touchedReason,
    setTouchedReason,
    durationHours,
    freeHoursRemaining,
    requiresManagerApproval,
    resetForm,
    isFormValid,
    handleSubmit,
    myManager,
    superAdmins,
    hasActiveManager,
    managerLoading,
    managerError,
    selectedSuperAdmin,
    setSelectedSuperAdmin,
  } = useRuntimeExtensionForm({ open, extensionContext, onOpenChange, onSuccess });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl
        max-h-[90vh]
        overflow-y-auto
        [&::-webkit-scrollbar]:hidden
        [-ms-overflow-style:none]
        [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Request Runtime Extension
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ScopeSelector
            scope={scope}
            onScopeChange={setScope}
            vm={vm}
            requestLevelEnabled={requestLevelEnabled}
            requestId={requestId}
          />

          <DurationSection
            durationOption={durationOption}
            onDurationOptionChange={setDurationOption}
            customHours={customHours}
            onCustomHoursChange={setCustomHours}
            durationHours={durationHours}
            requiresManagerApproval={requiresManagerApproval}
            freeHoursRemaining={freeHoursRemaining}
          />

          <ReasonSection
            reason={reason}
            onReasonChange={setReason}
            reasonError={reasonError}
            onReasonErrorChange={setReasonError}
            touchedReason={touchedReason}
            onTouchedReasonChange={setTouchedReason}
          />

          {requiresManagerApproval && (
            <ManagerDisplay
              manager={myManager}
              superAdmins={superAdmins || []}
              hasActiveManager={hasActiveManager}
              loading={managerLoading}
              error={managerError}
              selectedEmail={selectedSuperAdmin}
              onEmailChange={setSelectedSuperAdmin}
              label="Manager"
            />
          )}
        </div>

        {!isFormValid && (
          <p className="text-xs text-muted-foreground">
            Please fill all required fields correctly to enable submission.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={submitting || !isFormValid}>
            {submitting
              ? requiresManagerApproval ? 'Submitting…' : 'Applying…'
              : requiresManagerApproval
              ? 'Submit Request'
              : 'Apply Extension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
