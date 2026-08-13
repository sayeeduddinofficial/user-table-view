import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { lbApi } from "@/services/lbApi";
import { useDialog } from "@/components/ui/dialog-context";
import { useAppStore } from "@/store/appStore";
import { LbTypeChooserDialog } from "./LbTypeChooserDialog";
import { LoadBalancerQuotaIncreaseDialog } from "./LoadBalancerQuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";
import { submitLbQuotaRequest } from "./lbShared";
import { LbStatsBar } from "./list/LbStatsBar";
import { LbToolbar } from "./list/LbToolbar";
import { LbMainTable } from "./list/LbMainTable";
import { useLoadBalancersListData } from "./list/useLoadBalancersListData";

export function LoadBalancersList() {
  const nav = useNavigate();
  const { alert, confirm } = useDialog();
  const user = useAppStore((s: any) => s.currentUser);
  const refreshCurrentUser = useAppStore(
    (s) => s.refreshCurrentUser
  );
  useEffect(() => {
    refreshCurrentUser();
  }, []);
  const MAX_LBS = user?.maxLoadBalancers ?? 2;

  const {
    lbs,
    setLbs,
    loading,
    globalFilter,
    setGlobalFilter,
    provisioningAlb,
    provisioningNlb,
    fetchLbs,
    rows,
    sorted,
  } = useLoadBalancersListData(user?.id);

  const userLbs = lbs.filter((lb: any) =>
    Number(lb.user_id) === Number(user?.id) ||
    Number(lb.userId) === Number(user?.id)
  );
  const userLoadBalancerCount = userLbs.length;
  const albCount = userLbs.filter((lb) => String(lb.type).toLowerCase() === "application").length;
  const nlbCount = userLbs.filter((lb) => String(lb.type).toLowerCase() === "network").length;
  const maxPerType = MAX_LBS;

  const [chooserOpen, setChooserOpen] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submitQuota, setSubmitQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);

  const handleRemove = async (id: string, name: string, requestId: string) => {
    const confirmed = await confirm({
      title: `Delete load balancer "${name}"?`,
      description: "This will remove it from AWS immediately.",
      icon: "destroy",
    });
    if (!confirmed) return;

    try {
      // Optimistically mark as destroying in local state so the sidebar
      // and console see the correct status immediately on navigation.
      setLbs((prev) =>
        prev.map((lb) =>
          lb.request_id === requestId ? { ...lb, status: "destroying" } : lb
        )
      );

      await lbApi.deleteSdk(id);

      // Navigate only after the API call succeeds (backend has already set
      // status = 'destroying' in the DB at this point).
      useAppStore.getState().setActiveRequest(requestId, "lb-cli-terminate-service");
      nav("/console");
    } catch (err: any) {
      // Revert optimistic update on failure
      setLbs((prev) =>
        prev.map((lb) =>
          lb.request_id === requestId ? { ...lb, status: "completed" } : lb
        )
      );
      alert({
        title: `Failed to delete "${name}"`,
        description: err?.message ?? "Unknown error",
        severity: "error",
      });
    }
  };

  const remainingQuota = Math.max(
    0,
    MAX_LBS - userLoadBalancerCount
  );

  // provisioningLb.type tells us which kind is currently mid-flight
  const quotaReached = userLoadBalancerCount >= MAX_LBS;
  const isCreateDisabled = quotaReached;
  const albBlocked = !!provisioningAlb || quotaReached || albCount >= maxPerType;
  const nlbBlocked = !!provisioningNlb || quotaReached || nlbCount >= maxPerType;

  const createDisabledReason = quotaReached
    ? `Load Balancer quota reached (${MAX_LBS}).`
    : undefined;

  return (
    <div>
      <Header
        title="Load Balancers"
        subtitle="Network traffic management and distribution resources."
        showSearch={false}
      />

      <div className="space-y-4 p-6">
        <LbStatsBar
          totalLbs={rows.filter((r) => r.state === "Active").length}
          albCount={rows.filter((r) => r.type === "application" || r.type === "ALB").length}
          nlbCount={rows.filter((r) => r.type === "network" || r.type === "NLB").length}
          remainingQuota={remainingQuota}
          onRequestIncrease={() => setShowQuotaDialog(true)}
        />

        <LbToolbar
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRefresh={async () => {
            await Promise.all([
              fetchLbs(),
              refreshCurrentUser(),
            ]);

            alert({
              title: "Refreshed",
              severity: "success",
            });
          }}
          onCreate={() => setChooserOpen(true)}
          createDisabled={isCreateDisabled}
          createDisabledReason={createDisabledReason}
          loading={loading}
        />

        <LbMainTable
          rows={sorted}
          onNavigate={(id) => nav(`/aws/load-balancers/${encodeURIComponent(id)}`)}
          onRemove={handleRemove}
        />
      </div>

      <LbTypeChooserDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onSelect={(type) => {
          setChooserOpen(false);
          nav(`/aws/load-balancers/create/${type}`);
        }}
        albDisabled={albBlocked}
        nlbDisabled={nlbBlocked}
      />

      <LoadBalancerQuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxLoadBalancers={MAX_LBS}
        usedLoadBalancers={userLoadBalancerCount}
        requestedquota={requestedQuota}
        setrequestedquota={setRequestedQuota}
        reason={reason}
        setreason={setReason}
        submitquota={submitQuota}
        quotaError={quotaError}
        setQuotaError={setQuotaError}
        touched={touched}
        setTouched={setTouched}
        isMAxREached={false}
        onSubmit={async (approverEmail) => {
          try {
            setSubmitQuota(true);

            await submitLbQuotaRequest({
              userId: user?.id,
              requestedQuota,
              currentMax: MAX_LBS,
              reason,
              approverEmail,
              lbServiceUrl: env.lbService,
              getClientIp,
            });

            alert({
              title: "Load Balancer quota request submitted successfully",
              severity: "success",
            });

            setShowQuotaDialog(false);
            setRequestedQuota(0);
            setReason("");
            setTouched(false);
            setQuotaError("");

          } catch (error: any) {
            alert({
              title:
                error?.message ||
                "Failed to submit LB quota request",
              severity: "error",
            });
          } finally {
            setSubmitQuota(false);
          }
        }}
      />

    </div>
  );
}