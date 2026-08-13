/**
 * RequestActionsCell.tsx
 * View / Retry / Terminate action buttons rendered per request row.
 */
import { Button } from "@/components/ui/button";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import type { VMRequest as Request } from "@/components/requests/vmRequestsApi";
import { MAX_RETRIES } from "@/components/requests/list/requestsListUtils";

interface RequestActionsCellProps {
  req: Request;
  isAwsDisconnected: boolean;
  isDeleting: boolean;
  onView: () => void;
  onRetry: () => void;
  onRetryTerminate: () => void;
  onDelete: () => void;
}

export function RequestActionsCell({
  req,
  isAwsDisconnected,
  isDeleting,
  onView,
  onRetry,
  onRetryTerminate,
  onDelete,
}: RequestActionsCellProps) {
  const isTerminateFailed = req.status === "failed" && req.last_operation === "destroy";
  const provisionRetriesExhausted = (req.provision_retry_count ?? 0) >= MAX_RETRIES;
  const terminateRetriesExhausted = (req.terminate_retry_count ?? 0) >= MAX_RETRIES;
  const canRetry = req.status === "failed" && (
    isTerminateFailed ? !terminateRetriesExhausted : !provisionRetriesExhausted
  );
  const canDestroy = req.status === "completed" || (req.status === "failed" && !isTerminateFailed);
  const logsCleared = !!req.logs_cleared_at;
  // If any activity ran AFTER the logs were cleared, new logs exist.
  // This covers: destroy/delete operations AND individual EC2 instance
  // terminations (vm-service) which only update requests.updated_at.
  const hasNewLogsAfterClear = logsCleared && req.updated_at &&
    new Date(req.updated_at) > new Date(req.logs_cleared_at!);
  const eyeDisabled = (logsCleared && !hasNewLogsAfterClear && !req.has_terminating_vms) || isAwsDisconnected;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 transition-colors ${eyeDisabled
            ? "text-muted-foreground/30 cursor-not-allowed"
            : "text-muted-foreground hover:text-primary"
          }`}
        disabled={eyeDisabled}
        onClick={() => {
          if (eyeDisabled) return;
          onView();
        }}
        tooltip={
          isAwsDisconnected
            ? "AWS Disconnected"
            : logsCleared && !hasNewLogsAfterClear
              ? "Logs have been cleared"
              : "View Live Console"
        }
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canRetry || isAwsDisconnected}
        className={`h-8 w-8 transition-colors ${canRetry && !isAwsDisconnected
            ? isTerminateFailed
              ? "text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
              : "text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
            : "text-muted-foreground/30 cursor-not-allowed"
          }`}
        onClick={() => {
          if (!canRetry) return;
          isTerminateFailed ? onRetryTerminate() : onRetry();
        }}
        tooltip={(() => {
          if (isAwsDisconnected) return "AWS Disconnected";
          if (isTerminateFailed) {
            const used = req.terminate_retry_count ?? 0;
            if (terminateRetriesExhausted) return `Retry Terminate — ${used}/${MAX_RETRIES} attempts used (limit reached)`;
            return `Retry Terminate — ${used}/${MAX_RETRIES} attempts used`;
          } else {
            const used = req.provision_retry_count ?? 0;
            if (provisionRetriesExhausted) return `Retry Provisioning — ${used}/${MAX_RETRIES} attempts used (limit reached)`;
            if (req.status !== "failed") return "Retry is only available for failed requests";
            return `Retry Provisioning — ${used}/${MAX_RETRIES} attempts used`;
          }
        })()}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canDestroy || isAwsDisconnected || isDeleting}
        className={`h-8 w-8 transition-colors ${canDestroy && !isAwsDisconnected && !isDeleting
            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            : "text-muted-foreground/30 cursor-not-allowed"
          }`}
        onClick={() => canDestroy && !isDeleting && onDelete()}
        tooltip={
          isAwsDisconnected
            ? "AWS Disconnected"
            : isDeleting
              ? "Terminating..."
              : isTerminateFailed
                ? "Use 'Retry Terminate' to retry the failed termination"
                : canDestroy
                  ? "Terminate Resources"
                  : "Terminate is only available for completed or failed requests"
        }
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
