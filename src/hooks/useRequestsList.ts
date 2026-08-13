/**
 * useRequestsList.ts
 * All data-fetching, polling, filtering, and mutation state for the
 * Requests (EC2 VM requests) list page.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { deleteRoute53Record } from "@/services/route53Api";
import { fetchVpcListApi } from "@/services/vpcService";
import { deleteBucketApi } from "@/services/bucketService";
import { deleteEksClusterService } from "@/services/eksClusterService";
import { fetchUsersApi } from "@/components/users/userManagementApi";
import {
  fetchVMRequestsApi,
  fetchVMRequestApi,
  fetchVpcRequestApi,
  fetchEksRequestApi,
  retryVMRequestApi,
  retryTerminateVMRequestApi,
  deleteVMRequestApi,
  deleteVpcRequestApi,
  deleteLbRequestApi,
  deleteRdsRequestApi,
  RETRY_PROVISION_API,
  RETRY_TERMINATE_API,
  type VMRequest as Request,
} from "@/components/requests/vmRequestsApi";
import { ACTIVE_STATUSES, sortRequestsByLatestActivity } from "@/components/requests/list/requestsListUtils";

export function useRequestsList() {
  const [open, setOpen] = useState(false);
  const [hasActiveVpc, setHasActiveVpc] = useState(false);
  const { alert, confirm } = useDialog();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    total: 0, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const watchers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const watcherAttempts = useRef<Record<string, number>>({});
  const { refreshCurrentUser, setActiveRequest } = useAppStore();
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === "SplunkOps.Admin" || currentUser?.role === "SuperAdmin";
  const navigate = useNavigate();
  const { data: awsConfig } = useAwsConfig();
  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";

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
        status: statusFilter === "all" || statusFilter === "retrying" ? undefined : statusFilter,
        service: serviceFilter !== "all" ? serviceFilter : undefined,
        search: searchQuery.trim() || undefined,
        userId: isAdmin && userFilter !== "all" ? userFilter : undefined,
      });

      const filteredData =
        statusFilter === "retrying"
          ? result.data.filter((req) =>
              ["retrying", "retrying_terminate"].includes(req.status)
            )
          : result.data;

      const sortedData = sortRequestsByLatestActivity(filteredData);
      setRequests(sortedData);
      setPagination(result.pagination);

      sortedData.forEach((req) => {
        if (ACTIVE_STATUSES.has(req.status)) {
          watchRequest(req.request_id, req.service);
        }
      });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, serviceFilter, searchQuery, userFilter]);

  useEffect(() => {
    isMounted.current = true;
    fetchRequests(page);
    return () => {
      Object.values(watchers.current).forEach(clearTimeout);
      watchers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, serviceFilter, userFilter]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRequests((prev) => sortRequestsByLatestActivity(prev));
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

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

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsersApi()
      .then((list) => setUsers(list.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, [isAdmin]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          : service === "eks-cluster-service"
            ? await fetchEksRequestApi(requestId)
            : await fetchVMRequestApi(requestId);
        const normalized = data.status; // already normalized by the api layer
        if (data.status) {
          setRequests((prev) =>
            sortRequestsByLatestActivity(
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
              })
            )
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
          if (ACTIVE_STATUSES.has(req.status)) {
            watchRequest(req.request_id, req.service);
          }
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  // ─── FIXED: Retry now only works for "failed" status, updates to "retrying",
  //            then redirects to the LiveConsole page ───────────────────────────
  const retryRequest = async (requestId: string, service?: string) => {
    const confirmed = await confirm({
      title: "Do you want to retry provisioning the resources for this request?",
      icon: "retry",
    });

    if (!confirmed) return;

    try {
      const retryFn = (service ? RETRY_PROVISION_API[service] : undefined) ?? retryVMRequestApi;
      await retryFn(requestId);

      alert({
        title: "Retry Provisioning in Progress",
        severity: "loading",
      });

      // Update status to "retrying" immediately in the list
      setRequests((prev) =>
        sortRequestsByLatestActivity(
          prev.map((r) =>
            r.request_id === requestId ? { ...r, status: service === "s3-service" ? "retry provisioning" : "retrying" } : r,
          )
        ),
      );

      // Start polling watcher for this request
      watchRequest(requestId, service);

      // Set the active request in the store so LiveConsole picks it up
      setActiveRequest(requestId, service);

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

  const retryTerminateRequest = async (requestId: string, service?: string) => {
    const confirmed = await confirm({
      title: `Do you want to retry terminating the resources for this request?`,
      icon: "destroy",
    });

    if (!confirmed) return;

    try {
      const retryFn = (service ? RETRY_TERMINATE_API[service] : undefined) ?? retryTerminateVMRequestApi;
      await retryFn(requestId);

      alert({
        title: "Retry Terminate in Progress",
        severity: "loading",
      });

      // Update status immediately so the UI reflects the retry path
      setRequests((prev) =>
        sortRequestsByLatestActivity(
          prev.map((r) =>
            r.request_id === requestId
              ? {
                  ...r,
                  status: "destroying",
                  logs_cleared_at: null,
                  last_operation: "destroy",
                }
              : r,
          )
        ),
      );

      // Start polling watcher for this request
      watchRequest(requestId, service);

      // Set the active request in the store so LiveConsole picks it up
      setActiveRequest(requestId, service);

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

    const markDestroying = () => {
      setRequests((prev) =>
        sortRequestsByLatestActivity(
          prev.map((r) =>
            r.request_id === requestId
              ? { ...r, status: "destroying", logs_cleared_at: null, last_operation: "destroy" }
              : r,
          )
        ),
      );
    };

    try {
      if (service === "vpc-service") {
        await deleteVpcRequestApi(requestId);
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      }
      else if (service === "lb-service") {
        await deleteLbRequestApi(requestId);
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      }
      else if (service === "s3-service") {
        await deleteBucketApi(requestId);
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      } else if (service === "route53-service") {
        await deleteRoute53Record(requestId); // now resolves via request_id
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service, "delete"); // 3rd arg sets operation → fixes the create.log fallback bug
        navigate("/console");
      }
      else if (service === "eks-cluster-service") {
        await deleteEksClusterService(requestId);
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      }
      else if (service === "rds-service") {
        await deleteRdsRequestApi(requestId);
        markDestroying();
        watchRequest(requestId, service);
        setActiveRequest(requestId, service);
        navigate("/console");
      }
      else {
        const deleteResult = await deleteVMRequestApi(requestId);
        console.log("Delete request result:", deleteResult);

        if (deleteResult?.status === "SUCCESS") {
          markDestroying();
          watchRequest(requestId, service);
          setActiveRequest(requestId, service);
          navigate("/console");
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

  return {
    open,
    setOpen,
    hasActiveVpc,
    requests,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    serviceFilter,
    setServiceFilter,
    userFilter,
    setUserFilter,
    users,
    isAdmin,
    page,
    setPage,
    deletingIds,
    pagination,
    isAwsDisconnected,
    navigate,
    setActiveRequest,
    fetchRequests,
    retryRequest,
    retryTerminateRequest,
    deleteRequest,
  };
}
