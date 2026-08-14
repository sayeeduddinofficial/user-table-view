import { useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/common/DataTable";
import { useRequestsList } from "@/hooks/useRequestsList";
import { RequestsToolbar } from "@/components/requests/list/RequestsToolbar";
import { buildRequestsColumns } from "@/components/requests/list/requestsColumns";

export default function VMRequests() {
  const {
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
  } = useRequestsList();

  const columns = useMemo(
    () =>
      buildRequestsColumns({
        isAwsDisconnected,
        deletingIds,
        onView: (req) => {
          const operation = ["route53-service", "s3-service"].includes(req.service ?? "")
            ? ((req.action || req.last_operation || "").toLowerCase() === "delete" ||
              (req.action || req.last_operation || "").toLowerCase() === "destroy" ||
              req.status === "destroyed" || req.status === "destroying" || req.status === "terminated" || req.status === "terminating"
                ? "delete"
                : "create")
            : undefined;
          setActiveRequest(req.request_id, req.service, operation);
          navigate("/console");
        },
        onRetry: (req) => retryRequest(req.request_id, req.service),
        onRetryTerminate: (req) => retryTerminateRequest(req.request_id, req.service),
        onDelete: (req) => deleteRequest(req.request_id, req.service),
      }),
    [isAwsDisconnected, deletingIds, setActiveRequest, navigate, retryRequest, retryTerminateRequest, deleteRequest]
  );

  return (
    <TooltipProvider>
      <div>
        <Header
          title="Requests"
          subtitle="Manage and track all requests"
          showNewRequest={false}
          showSearch={false}
        />
        <div className="p-5 space-y-5">
          <RequestsToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
            serviceFilter={serviceFilter}
            onServiceChange={(v) => { setServiceFilter(v); setPage(1); }}
            userFilter={userFilter}
            onUserChange={(v) => { setUserFilter(v); setPage(1); }}
            isAdmin={isAdmin}
            users={users}
            onRefresh={() => fetchRequests(page)}
            isAwsDisconnected={isAwsDisconnected}
            open={open}
            setOpen={setOpen}
            hasActiveVpc={hasActiveVpc}
          />

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