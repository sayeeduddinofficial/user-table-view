import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  PauseCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { parseBackendTimestamp } from "@/utils/date";
import { useQuery } from "@tanstack/react-query";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import axios from "axios";

interface Request {
  request_id: string;
  user_name: string;
  action: string;
  region: string;
  project: string;
  environment: string;
  category: number | string;
  categoryLabel?: string;
  total_vms: number;
  status: string;
  created_at: string;
  updated_at?: string;
  vm_count: number;
  logs_cleared_at: string | null;
}

interface RequestsResponse {
  data: Request[] | { data: Request[] };
}

const statusConfig: Record<
  string,
  {
    icon: typeof Clock;
    color: string;
    bg: string;
    label: string;
    animate?: boolean;
  }
> = {
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Running",
    animate: true,
  },
  provisioning: {
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Running",
    animate: true,
  },
  starting: {
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Starting",
    animate: true,
  },
  stopping: {
    icon: Loader2,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Stopping",
    animate: true,
  },
  terminating: {
    icon: Loader2,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Terminating",
    animate: true,
  },
  terminated: {
    icon: Loader2,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Terminated",
    animate: true,
  },
  stopped: {
    icon: PauseCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Stopped",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Failed",
  },
  destroyed: {
    icon: Trash2,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Terminated",
  },
  destroying: {
    icon: Trash2,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    label: "Terminating",
    animate: true,
  },
  retrying: {
    icon: Loader2,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Retrying",
    animate: true,
  },
  retrying_terminate: {
    icon: Loader2,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Retrying",
    animate: true,
  },
  retrying_provision: {
    icon: Loader2,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Retrying",
    animate: true,
  },
};

const defaultStatusConfig = {
  icon: Clock,
  color: "text-muted-foreground",
  bg: "bg-muted",
  label: "Unknown",
  animate: false,
};

export function RecentRequests() {
  const fetchRequestsApi = async () => {
    const res = await axios.get(`${env.vmRequest}/api/requests`);
    return res.data;
  };
  const {
    data: requests,
    isLoading,
    error,
  } = useQuery<RequestsResponse>({
    queryKey: ["requests"],
    queryFn: fetchRequestsApi,
    refetchInterval: 15000, // every 15 seconds
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem("token"),
  });
  const navigate = useNavigate();

  const requestItems = Array.isArray(requests?.data)
    ? requests.data
    : requests?.data && typeof requests.data === "object" && "data" in requests.data
      ? requests.data.data
      : [];

  const recentRequests =
    requestItems.filter((r: Request) => !r.logs_cleared_at).slice(0, 5) || [];

  return (
    <div className="glass-panel rounded-xl">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Recent Requests
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/requests")}
          className="text-muted-foreground hover:text-foreground"
        >
          View All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading requests...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            Failed to load requests
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No recent requests
          </div>
        ) : (
          recentRequests.map((request: Request) => (
            <RequestRow key={request.request_id} request={request} />
          ))
        )}
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: Request }) {
  const { data: awsConfig } = useAwsConfig();
  const isAwsConnected = awsConfig?.status === "CONNECTED";
  const navigate = useNavigate();
  const status = statusConfig[request?.status] ?? defaultStatusConfig;
  const StatusIcon = status?.icon;
  const totalVMs = request?.total_vms;

  const rowContent = (
    <div
      onClick={() => isAwsConnected && navigate(`/console?request=${request.request_id}`)}
      className={cn(
        "flex items-center justify-between p-4 transition-colors",
        isAwsConnected
          ? "hover:bg-muted/30 cursor-pointer"
          : "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("rounded-lg p-2", status.bg)}>
          <StatusIcon
            className={cn(
              "h-5 w-5",
              status.color,
              status.animate && "animate-spin",
            )}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {statusConfig[request.status]?.label ?? (request.status
              ? request.status.charAt(0).toUpperCase() + request.status.slice(1)
              : "Unknown")}{" "}
            {totalVMs} VMs
          </p>
          <p className="text-xs text-muted-foreground">
            {request.user_name} • {request.region}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            request.status === "training" && "border-warning/50 text-warning",
          )}
        >
          {statusConfig[request.status]?.label ?? request.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(
            parseBackendTimestamp(
              (request.status === "destroyed" || request.status === "destroying") && request.updated_at
                ? request.updated_at
                : request.created_at
            ),
            { addSuffix: true }
          )}
        </span>
      </div>
    </div>
  );

  if (!isAwsConnected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {rowContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>AWS Disconnected</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return rowContent;
}