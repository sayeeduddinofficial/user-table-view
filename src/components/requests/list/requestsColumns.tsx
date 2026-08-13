/**
 * requestsColumns.tsx
 * DataTable column definitions for the Requests list page.
 */
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type { Column } from "@/components/common/DataTable";
import { SERVICE_LABELS, type VMRequest as Request } from "@/components/requests/vmRequestsApi";
import { getRequestActivityTime, statusConfig } from "@/components/requests/list/requestsListUtils";
import { RequestActionsCell } from "@/components/requests/list/RequestActionsCell";

interface BuildRequestsColumnsArgs {
  isAwsDisconnected: boolean;
  deletingIds: Set<string>;
  onView: (req: Request) => void;
  onRetry: (req: Request) => void;
  onRetryTerminate: (req: Request) => void;
  onDelete: (req: Request) => void;
}

export function buildRequestsColumns({
  isAwsDisconnected,
  deletingIds,
  onView,
  onRetry,
  onRetryTerminate,
  onDelete,
}: BuildRequestsColumnsArgs): Column<Request>[] {
  return [
    {
      key: "request_id",
      header: "Request ID",
      render: (req) => <span className="font-mono text-sm text-primary">{req.request_id}</span>,
    },
    {
      key: "user_name",
      header: "User",
      render: (req) => <span className="text-sm text-foreground">{req.user_name || "Unknown"}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (req) => <Badge variant="outline" className="font-medium capitalize">{req.action}</Badge>,
    },
    {
      key: "region",
      header: "Region",
      render: (req) => <span className="text-sm text-muted-foreground">{req.region}</span>,
    },
    {
      key: "service",
      header: "Service",
      render: (req) => (
        <Badge variant="outline" className="border-gray-500/30">
          {SERVICE_LABELS[req.service ?? ""] ?? req.service ?? "Unknown"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (req) => (
        <Badge variant="outline" className={statusConfig[req.status]?.color || statusConfig.pending.color}>
          {statusConfig[req.status]?.label || req.status}
        </Badge>
      ),
    },
    {
      key: "justification",
      header: "Justification",
      render: (req) => {
        const text = req.justification || "-";
        if (text.length <= 80) return <span className="text-sm text-muted-foreground">{text}</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[100px] truncate text-sm text-muted-foreground">{text}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap break-words">{text}</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: "created_at",
      header: "Requested",
      render: (req) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(getRequestActivityTime(req), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="flex justify-end">Actions</span>,
      render: (req) => (
        <RequestActionsCell
          req={req}
          isAwsDisconnected={isAwsDisconnected}
          isDeleting={deletingIds.has(req.request_id)}
          onView={() => onView(req)}
          onRetry={() => onRetry(req)}
          onRetryTerminate={() => onRetryTerminate(req)}
          onDelete={() => onDelete(req)}
        />
      ),
    },
  ];
}
