import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/appStore";
import { formatDistanceToNow } from "date-fns";
import { deleteRoute53Record } from "@/services/route53Api";
import { parseBackendTimestamp } from "@/utils/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, Eye, Trash2, Plus, RotateCcw } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useDialog } from "@/components/ui/dialog-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import {
  fetchVMRequestsApi,
  fetchVMRequestApi,
  fetchVpcRequestApi,
  retryVMRequestApi,
  retryTerminateVMRequestApi,
  deleteVMRequestApi,
  deleteVpcRequestApi,
  deleteLbRequestApi,
  SERVICE_LABELS,
  SERVICE_OPTIONS,
  deleteRdsRequestApi,
  type VMRequest as Request,
} from "@/components/requests/vmRequestsApi";
import { DataTable, type Column } from "@/components/common/DataTable";
import ChooseServices from "@/components/dialogs/ChooseServices";
import { fetchVpcListApi } from "@/services/vpcService";
import { deleteBucketApi } from "@/services/bucketService";
import {  deleteEksClusterService } from "@/services/eksClusterService";


const statusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    label: "Pending",
  },
  provisioning: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    label: "Provisioning",
  },
  completed: {
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    label: "Completed",
  },
  failed: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "Failed",
  },
  destroying: {
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    label: "Terminating",
  },
  destroyed: {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    label: "Terminated",
  },
  retrying: {
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    label: "Retrying",
  },
  retrying_terminate: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    label: "Retrying Terminate",
  },
};


export default function VMRequests() {
  const [open, setOpen] = useState(false);
  const [hasActiveVpc, setHasActiveVpc] = useState(false);
  const { alert, confirm } = useDialog();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    total: 0, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const watchers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const watcherAttempts = useRef<Record<string, number>>({});
  const { refreshCurrentUser, setActiveRequest } = useAppStore();
  const navigate = useNavigate();
  const { data: awsConfig } = useAwsConfig();

  const clearAllWatchers = () => {
    Object.values(watchers.current).forEach(clearInterval);
    watchers.current = {};
  };

  const isMounted = useRef(false);
  const isFirstRender = useRef(true);

  const fetchRequests = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      clearAllWatchers();

      const result = await fetchVMRequestsApi({
        page: currentPage,
        limit: 10,
        status: statusFilter !== "all" ? statusFilter : undefined,
        service: serviceFilter !== "all" ? serviceFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      const visibleData = result.data.filter(
        (req) => !(req.service === "s3-service" && req.status === "failed")
      );

      setRequests(visibleData);
      setPagination(result.pagination);

      visibleData.forEach((req) => {
        if (
          req.status === "pending" ||
          req.status === "provisioning" ||
          req.status === "retrying" ||
          req.status === "destroying" ||
          req.status === "retrying_terminate"
        ) {
          watchRequest(req.request_id, req.service);
        }
      });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, serviceFilter, searchQuery]);

  useEffect(() => {
    isMounted.current = true;
    fetchRequests(page);
    return () => {
      Object.values(watchers.current).forEach(clearTimeout);
      watchers.current = {};
    };
  }, [page, statusFilter, serviceFilter]);

  useEffect(() => {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser) return;
    fetchVpcListApi()
      .then((list) => {
        const mine = list.filter((v: any) => Number(v.userId) === Number(currentUser.id));
        setHasActiveVpc(mine.length > 0);
      })
      .catch(() => { });
  }, []);

  // Debounce search — skip on initial mount to avoid double fetch
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchRequests(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const watchRequest = (requestId: string, service?: string) => {
    if (watchers.current[requestId]) return;

    watcherAttempts.current[requestId] = 0;

    const poll = async () => {
      if (document.visibilityState === "hidden") {
        watchers.current[requestId] = setTimeout(poll, 10000);
        return;
      }

      try {
        const data = service === "vpc-service"
          ? await fetchVpcRequestApi(requestId)
          : await fetchVMRequestApi(requestId);
        const normalized = data.status; // already normalized by the api layer
        if (data.status) {
          setRequests((prev) =>
            prev.map((r) => {
              if (r.request_id !== requestId) return r;
              if (r.status === "destroying" && normalized === "provisioning")
                return r;
              return {
                ...r,
                status: normalized,
                ...(data.updated_at ? { updated_at: data.updated_at } : {}),
                // Keep last_operation in sync so button logic stays correct
                ...(data.last_operation !== undefined ? { last_operation: data.last_operation } : {}),
              };
            }),
          );
        }

        if (
          normalized === "completed" ||
          normalized === "failed" ||
          normalized === "destroyed"
        ) {

          if (normalized === "destroyed") {
            refreshCurrentUser();
            setDeletingIds(prev => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
            fetchRequests();

            alert({
              title: `Successfully terminated request ${requestId}`,
              severity: "success",
            });
          }

          clearTimeout(watchers.current[requestId]);
          delete watchers.current[requestId];
          delete watcherAttempts.current[requestId];

          return;
        }

        watcherAttempts.current[requestId] += 1;
        const attempt = watcherAttempts.current[requestId];

        let delay = 5000;
        if (attempt > 2) delay = 10000;
        if (attempt > 5) delay = 20000;

        watchers.current[requestId] = setTimeout(poll, delay);
      } catch (err) {
        console.error("Request watcher failed", err);
        watchers.current[requestId] = setTimeout(poll, 15000);
      }
    };

    poll();
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        Object.values(watchers.current).forEach(clearTimeout);
        watchers.current = {};
      } else {
        requests.forEach((req) => {
          if (
            req.status === "pending" ||
            req.status === "provisioning" ||
            req.status === "retrying" ||
            req.status === "destroying" ||
            req.status === "retrying_terminate"
          ) {
            watchRequest(req.request_id);
          }
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [requests]);

  useEffect(() => {}, [deletingIds]);

  // ─── FIXED: Retry now only works for "failed" status, updates to "retrying",
  //            then redirects to the LiveConsole page ───────────────────────────
  const retryRequest = async (requestId: string) => {
    const confirmed = await confirm({
      title: `Do you want to retry provisioning this VM?`,
      icon: "retry",
    });

    if (!confirmed) return;

    try {
      await retryVMRequestApi(requestId);

      alert({
        title: "Retry Provisioning in Progress",
        severity: "loading",
      });

      // Update status to "retrying" immediately in the list
      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === requestId ? { ...r, status: "retrying" } : r,
        ),
      );

      // Start polling watcher for this request
      watchRequest(requestId);

      // Set the active request in the store so LiveConsole picks it up
      setActiveRequest(requestId);

      // Redirect to the console page to show live logs
      navigate("/console");
    } catch (err) {
      console.error("Retry failed:", err);
      alert({
        title: "Retry failed",
        severity: "error",
      });
    }
  };


  const retryTerminateRequest = async (requestId: string) => {
    const confirmed = await confirm({
      title: `Do you want to retry terminating the resources for this request?`,
      icon: "destroy",
    });

    if (!confirmed) return;

    try {
      await retryTerminateVMRequestApi(requestId);

      alert({
        title: "Retry Terminate in Progress",
        severity: "loading",
      });

      // Update status to "destroying" immediately in the list
      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === requestId ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" } : r,
        ),
      );

      // Start polling watcher for this request
      watchRequest(requestId);

      // Set the active request in the store so LiveConsole picks it up
      setActiveRequest(requestId);

      // Redirect to the console page to show live logs
      navigate("/console");
    } catch (err) {
      console.error("Retry terminate failed:", err);
      alert({
        title: "Retry terminate failed",
        severity: "error",
      });
    }
  };

  const deleteRequest = async (requestId: string, service?: string) => {
    if (deletingIds.has(requestId)) return;

    const confirmed = await confirm({
      title: `Are you sure you want to terminate all resources for ${requestId}?`,
      icon: "destroy",
    });

    if (!confirmed) return;

    alert({
      title: "Terminating in progress",
      severity: "loading",
    });

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      if (service === "vpc-service") {
        await deleteVpcRequestApi(requestId);
      }
      else if (service === "lb-service") {
        await deleteLbRequestApi(requestId);          // ← add this
        setRequests((prev) =>
          prev.map((r) =>
            r.request_id === requestId
              ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
              : r,
          ),
        );
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      }
      else if (service === "s3-service") {
        await deleteBucketApi(requestId);
        setRequests((prev) =>
          prev.map((r) =>
            r.request_id === requestId
              ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
              : r,
          ),
        );
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      } else if (service === "route53-service") {
        await deleteRoute53Record(requestId); // now resolves via request_id
        setRequests((prev) =>
          prev.map((r) =>
            r.request_id === requestId
              ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
              : r,
          ),
        );
        watchRequest(requestId, service);
        setActiveRequest(requestId, service, "delete"); // 3rd arg sets operation → fixes the create.log fallback bug
        navigate("/console");
      }
     else if (service === "eks-cluster-service") {
      await deleteEksClusterService(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === requestId
            ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
            : r,
        ),
      );
      watchRequest(requestId, service);
      setActiveRequest(requestId, service);
      navigate("/console");
    }
    else if (service === "rds-service") {
  await deleteRdsRequestApi(requestId);
  setRequests((prev) =>
    prev.map((r) =>
      r.request_id === requestId
        ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
        : r,
    ),
  );
  watchRequest(requestId, service);
  setActiveRequest(requestId, service);
  navigate("/console");
}
      else {
        const deleteResult = await deleteVMRequestApi(requestId);
        console.log("Delete request result:", deleteResult);

        if (deleteResult?.status === "SUCCESS") {
          setRequests((prev) =>
            prev.map((r) =>
              r.request_id === requestId
                ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
                : r,
            ),
          );
          watchRequest(requestId);
        }
      }
      fetchRequests(page);
    } catch (error) {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      console.error("Failed to terminate request:", error);
      alert({
        title: `Failed to terminate request ${requestId}`,
        severity: "error",
      });
    }
  };

  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";

  const columns: Column<Request>[] = [
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
    // {
    //   key: "vm_count",
    //   header: "VMs",
    //   render: (req) => (
    //     <div className="text-sm">
    //       <span className="font-semibold text-foreground">{req.vm_count || 0}</span>
    //       <span className="text-muted-foreground"> / {req.total_vms}</span>
    //     </div>
    //   ),
    // },
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
          {formatDistanceToNow(
            parseBackendTimestamp(
              (req.status === "destroyed" || req.status === "destroying") && req.updated_at
                ? req.updated_at
                : req.created_at
            ),
            { addSuffix: true }
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="flex justify-end">Actions</span>,
      render: (req) => {
        const isTerminateFailed = req.status === "failed" && req.last_operation === "destroy";
        const canRetry = req.status === "failed";
        const canDestroy = req.status === "completed" || (req.status === "failed" && !isTerminateFailed);
        const logsCleared = !!req.logs_cleared_at;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 transition-colors ${logsCleared || isAwsDisconnected
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "text-muted-foreground hover:text-primary"
                }`}
              disabled={logsCleared || isAwsDisconnected}
              onClick={() => {
                if (logsCleared) return;
                const operation = req.service === "route53-service"
                  ? ((req.action || req.last_operation || "").toLowerCase() === "delete" ||
                    (req.action || req.last_operation || "").toLowerCase() === "destroy" ||
                    req.status === "destroyed" || req.status === "destroying"
                      ? "delete"
                      : "create")
                  : undefined;
                setActiveRequest(req.request_id, req.service, operation);
                navigate("/console");
              }}
              tooltip={
                logsCleared
                  ? "Logs have been cleared"
                  : isAwsDisconnected
                    ? "AWS Disconnected"
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
                isTerminateFailed
                  ? retryTerminateRequest(req.request_id)
                  : retryRequest(req.request_id);
              }}
              tooltip={
                isAwsDisconnected
                  ? "AWS Disconnected"
                  : canRetry
                    ? isTerminateFailed
                      ? "Retry Terminate"
                      : "Retry Provisioning"
                    : "Retry is only available for failed requests"
              }
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canDestroy || isAwsDisconnected || deletingIds.has(req.request_id)}
              className={`h-8 w-8 transition-colors ${canDestroy && !isAwsDisconnected && !deletingIds.has(req.request_id)
                  ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  : "text-muted-foreground/30 cursor-not-allowed"
                }`}
              onClick={() =>
                canDestroy && !deletingIds.has(req.request_id) && deleteRequest(req.request_id, req.service)
              }
              tooltip={
                isAwsDisconnected
                  ? "AWS Disconnected"
                  : deletingIds.has(req.request_id)
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
      },
    },
  ];

  return (
    <TooltipProvider>
      <div>
        <Header
          title="VM Requests"
          subtitle="Manage and track all provisioning requests"
          showNewRequest={false}
          showSearch={false}
        />
        <div className="p-5 space-y-5">
          {/* Filters */}
          <Card
            className="sticky top-16 z-30 
          bg-card/80 backdrop-blur 
          border-border/50 p-0"
          >
            <CardContent className="py-0 px-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-end p-4 px-6 flex-wrap">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center px-0 flex-wrap flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by ID, user, region..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background/50"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-background/50">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="provisioning">Provisioning</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="retrying">Retrying</SelectItem>
                      <SelectItem value="retrying_terminate">Retrying Terminate</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="destroying">Terminating</SelectItem>
                      <SelectItem value="destroyed">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-background/50">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {SERVICE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2" onClick={() => fetchRequests(page)}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        {isAwsDisconnected ? (
                          <Button disabled className="gap-2"><Plus className="h-4 w-4" />New Request</Button>
                        ) : (
                          // <Link to="/requests/new">
                          //   <Button className="gap-2"><Plus className="h-4 w-4" />New Request</Button>
                          // </Link>
                          <div>
                            <Button onClick={() => setOpen(true)}>
                              <Plus className="h-4 w-4" />New Request
                            </Button>

                            <ChooseServices
                              open={open}
                              onClose={() => setOpen(false)}
                              hasActiveVpc={hasActiveVpc}
                            />
                          </div>
                        )}
                      </span>
                    </TooltipTrigger>
                    {isAwsDisconnected && <TooltipContent side="bottom"><p>AWS Disconnected</p></TooltipContent>}
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={requests}
            isLoading={loading}
            emptyMessage="No requests found"
            pagination={pagination}
            onPageChange={(p) => setPage(p)}
            rowKey={(req) => req.request_id}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
