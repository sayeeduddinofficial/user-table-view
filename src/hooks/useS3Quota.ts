import { useState } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import { requestS3QuotaIncrease } from "@/services/bucketService";
import { useAppStore } from "@/store/appStore";

/**
 * Encapsulates the S3 bucket quota-increase request flow
 * (dialog state, form state and submission).
 */
export function useS3Quota(currentMaxBuckets: number) {
  const { alert } = useDialog();
  const currentUser = useAppStore((s) => s.currentUser);
  const refreshCurrentUser = useAppStore((s) => s.refreshCurrentUser);

  const [open, setOpen] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = () => {
    setRequestedQuota(0);
    setReason("");
    setQuotaError("");
    setTouched(false);
  };

  const submit = async (approverEmail: string) => {
    if (!currentUser?.id) return;

    setSubmitting(true);
    try {
      await requestS3QuotaIncrease(currentUser.id, {
        requestedQuota: requestedQuota - currentMaxBuckets,
        reason,
        approverEmail,
      });
      alert({ title: "S3 quota request submitted successfully", severity: "success" });
      await refreshCurrentUser();
      setOpen(false);
      reset();
    } catch (error) {
      alert({
        title: "Failed",
        description: error instanceof Error ? error.message : "Failed to submit S3 quota request",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    open,
    setOpen,
    requestedQuota,
    setRequestedQuota,
    reason,
    setReason,
    submitting,
    quotaError,
    setQuotaError,
    touched,
    setTouched,
    submit,
  };
}