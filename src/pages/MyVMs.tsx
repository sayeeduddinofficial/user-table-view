import { useState } from "react";
import { RefreshCw, Monitor } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VMStatsBar } from "@/components/vms/VMStatsBar";
import { VMFilterBar } from "@/components/vms/VMFilterBar";
import { VMRequestGroup } from "@/components/vms/VMRequestGroup";
import { QuotaIncreaseDialog } from "@/components/vms/QuotaIncreaseDialog";
import RuntimeExtensionDialog from "@/components/vms/RuntimeExtensionDialog";
import { useMyVMs } from "@/hooks/useMyVMs";
import { VM } from "@/utils/myVMs.utils";

export default function MyVMs() {
  const {
    vms, summary, loading, operatingVMs, copiedIp,
    isAwsConnected, currentUser,
    activeVMs, provisioningVMs, usedVMs, remainingquota, isMAxREached,
    openExtension, setOpenExtension, extensionContext,
    showModal, setShowModal,
    requestedquota, setrequestedquota, reason, setreason,
    submitquota, quotaError, setQuotaError, touched, setTouched,
    silentRefresh, handleCopyIp, handleRequestExtension, submitQuotaRequest,
    startVM, stopVM, deleteSingleVM, startAllVMs, stopAllVMs,
  } = useMyVMs();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Filtering & grouping ──────────────────────────────────────────────────
  const filteredVMs = vms.filter((vm) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      vm.name.toLowerCase().includes(q) ||
      (vm.publicIp ?? "").includes(searchQuery) ||
      (vm.privateIp ?? "").includes(searchQuery) ||
      (vm.requestId ?? "").toLowerCase().includes(q) ||
      (vm.instanceType ?? "").toLowerCase().includes(q);
    const matchesRole =
      roleFilter === "all" ||
      vm.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || vm.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const requestGroups = filteredVMs.reduce<Record<string, VM[]>>((acc, vm) => {
    const key = vm.requestId || "unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(vm);
    return acc;
  }, {});

  const sortedRequestIds = Object.keys(requestGroups).sort((a, b) => {
    const latestA = Math.max(
      ...requestGroups[a].map((v) => new Date(v.launchedAt ?? 0).getTime()),
    );
    const latestB = Math.max(
      ...requestGroups[b].map((v) => new Date(v.launchedAt ?? 0).getTime()),
    );
    return latestB - latestA;
  });

  const uniqueRoles = Array.from(new Set(vms.map((vm) => vm.role)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading VMs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="My Virtual Machines"
        subtitle="Manage and monitor your provisioned Splunk VMs"
        showSearch={false}
      />

      <div className="space-y-4 p-6">
        <VMStatsBar
          total={summary.total}
          running={summary.running}
          stopped={summary.stopped}
          remainingquota={remainingquota}
          onRequestIncrease={() => setShowModal(true)}
        />

        <VMFilterBar
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          uniqueRoles={uniqueRoles}
          onSearchChange={setSearchQuery}
          onRoleChange={setRoleFilter}
          onStatusChange={setStatusFilter}
        />

        <TooltipProvider>
          <div className="space-y-3">
            {sortedRequestIds.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-0">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Monitor className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No VMs found</p>
                    <p className="text-sm text-muted-foreground/70">
                      {vms.length === 0
                        ? "You don't have any VMs yet. Create a new VM request to get started."
                        : "Try adjusting your filters to see more results"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sortedRequestIds.map((reqId) => (
                <VMRequestGroup
                  key={reqId}
                  requestId={reqId}
                  vms={requestGroups[reqId]}
                  operatingVMs={operatingVMs}
                  copiedIp={copiedIp}
                  isAwsConnected={isAwsConnected}
                  onCopyIp={handleCopyIp}
                  onStartVM={startVM}
                  onStopVM={stopVM}
                  onDeleteVM={deleteSingleVM}
                  onStartAll={startAllVMs}
                  onStopAll={stopAllVMs}
                  onRequestExtension={handleRequestExtension}
                />
              ))
            )}
          </div>
        </TooltipProvider>
      </div>

      <QuotaIncreaseDialog
        open={showModal}
        onOpenChange={setShowModal}
        currentMaxVMs={currentUser?.maxVMs ?? 0}
        usedVMs={usedVMs}
        activeVMs={activeVMs}
        provisioningVMs={provisioningVMs}
        requestedquota={requestedquota}
        setrequestedquota={setrequestedquota}
        reason={reason}
        setreason={setreason}
        submitquota={submitquota}
        quotaError={quotaError}
        setQuotaError={setQuotaError}
        touched={touched}
        setTouched={setTouched}
        isMAxREached={isMAxREached}
        onSubmit={(approverEmail) => submitQuotaRequest(approverEmail)}
      />

      <RuntimeExtensionDialog
        open={openExtension}
        onOpenChange={setOpenExtension}
        extensionContext={extensionContext}
        onSuccess={silentRefresh}
      />
    </div>
  );
}
