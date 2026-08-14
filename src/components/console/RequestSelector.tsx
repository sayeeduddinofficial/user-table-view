import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseBackendTimestamp } from "@/utils/date";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { useActiveRequests } from "@/hooks/useLiveConsole";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Request {
  request_id: string;
  user_name: string;
  action: string;
  last_operation?: string | null;
  region: string;
  project?: string;
  environment: string;
  total_vms: number;
  status: string;
  created_at: string;
  updated_at?: string;
  vm_count?: number;
  logs_cleared_at?: string | null;
  service?: string;
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; color: string; label: string; animate?: boolean }
> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  retrying: {
    icon: Loader2,
    color: "text-primary",
    label: "Retrying",
    animate: true,
  },
  provisioning: {
    icon: Loader2,
    color: "text-primary",
    label: "Provisioning",
    animate: true,
  },
  completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  destroying: {
    icon: Trash2,
    color: "text-warning",
    label: "Terminating",
    animate: true,
  },
  destroyed: {
    icon: Trash2,
    color: "text-muted-foreground",
    label: "Terminated",
  },
  retrying_terminate: {
    icon: Loader2,
    color: "text-purple-500",
    label: "Retrying Terminate",
    animate: true,
  },
};



const normalizeStatus = (status: string): string => {
  switch (status) {
    case "IN_PROGRESS":
      return "provisioning";
    case "SUCCESS":
      return "completed";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    case "DESTROYING":
      return "destroying";
    case "DESTROYED":
      return "destroyed";
    case "RETRYING":
      return "retrying";
    case "RETRYING_TERMINATE":
      return "retrying_terminate";
    default:
      return status.toLowerCase();
  }
};

const normalizeEnvironment = (env: string): string => {
  switch (env?.toLowerCase()) {
    case "dev":
    case "development":
      return "Training";
    case "prod":
    case "production":
      return "Production";
    case "non-training":
    case "nontraining":
      return "Non-Training";
    default:
      return env;
  }
};

const getRequestSubtitle = (request: Request): string => {
  switch (request.service) {
    case "vpc-service":
      return `VPC • ${request.region}`;
    case "s3-service":
      return `S3 Bucket • ${request.region}`;
    case "lb-service":
      return `Load balancer • ${request.region}`;
    case "eks-cluster-service":
      return `EKS Cluster • ${request.region}`;
    case "rds-service":
      return `RDS • ${request.region}`;
    case "route53-service":
      return "Route53";
    default: {
      if (!request.total_vms) {
        return request.region;
      }

      return `${request.total_vms} VM${request.total_vms !== 1 ? "s" : ""} • ${request.region}`;
    }
  }
};

const getRequestOperationMode = (request: Request): "create" | "delete" | undefined => {
  if (request.service !== "route53-service") {
    return undefined;
  }

  const currentOperation = (request.last_operation || request.action || "").toLowerCase();

  if (
    currentOperation === "delete" ||
    currentOperation === "destroy" ||
    request.status === "destroyed" ||
    request.status === "destroying"
  ) {
    return "delete";
  }

  return "create";
};

function EmptyState() {
  return (
    <div className="p-4 text-center text-muted-foreground text-xs">
      No active requests
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center p-4 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      <span className="text-xs">Loading...</span>
    </div>
  );
}

export function RequestSelector() {
  const { data: awsConfig } = useAwsConfig();
  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";
  const { activeRequestId, setActiveRequest } = useAppStore();
  const { data: requests = [], isLoading: loading } = useActiveRequests();

  const processedRequests = requests.map((request) => ({
    ...request,
    status: normalizeStatus(request.status),
    environment: normalizeEnvironment(request.environment),
  }));

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Active Operations</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select a request to view logs
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && processedRequests.length === 0 ? (
            <LoadingState />
          ) : processedRequests.length === 0 ? (
            <EmptyState />
          ) : (
            processedRequests.map((request) => (
              <RequestItem
                key={request.request_id}
                request={request}
                isActive={request.request_id === String(activeRequestId)}
                isAwsDisconnected={isAwsDisconnected}
                onClick={() => {
                  if (isAwsDisconnected) {
                    return;
                  }

                  setActiveRequest(
                    request.request_id,
                    request.service ?? null,
                    getRequestOperationMode(request),
                  );
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function RequestItem({
  request,
  isActive,
  isAwsDisconnected,
  onClick,
}: {
  request: Request;
  isActive: boolean;
  isAwsDisconnected: boolean;
  onClick: () => void;
}) {
  const status = statusConfig[request.status] || {
    icon: Clock,
    color: "text-muted-foreground",
    label: request.status,
  };
  const StatusIcon = status.icon;

  const buttonContent = (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all",
        isAwsDisconnected ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
        isActive && !isAwsDisconnected && "bg-primary/10 border border-primary/30",
      )}
      disabled={isAwsDisconnected}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              "h-4 w-4",
              status.color,
              status.animate && "animate-spin",
            )}
          />
          <span className="font-mono text-xs text-muted-foreground">{request.request_id}</span>
        </div>
        <Badge variant="outline" className="text-[10px] capitalize">
          {status.label}
        </Badge>
      </div>

      <p className="text-sm font-medium text-foreground mb-1">{getRequestSubtitle(request)}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{request.user_name}</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseBackendTimestamp(request.updated_at ?? request.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    </button>
  );

  if (isAwsDisconnected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="top">
          <p>AWS Disconnected</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
