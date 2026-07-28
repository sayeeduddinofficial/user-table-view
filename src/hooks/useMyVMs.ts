import { useState, useRef, useEffect, useCallback } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import { useAppStore } from "@/store/appStore";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { VM, normalizeStatus } from "@/utils/myVMs.utils";
import { useNavigate } from 'react-router-dom';
import {
  fetchVMSummaryApi,
  fetchVMListApi,
  fetchStatusUpdatesApi,
  fetchVMStatusApi,
  startVMApi,
  stopVMApi,
  deleteVMApi,
  startAllVMsApi,
  // syncExistingVMsApi,
  //fetchManagerEmailsApi,
  submitQuotaRequestApi,
  ApiError,
} from "@/components/vms/myVMsApi";

export function useMyVMs() {
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const { currentUser, refreshCurrentUser, setActiveRequest } = useAppStore();
  const { data: awsConfig } = useAwsConfig();
  const isAwsConnected = awsConfig?.status === "CONNECTED";

  const [vms, setVMs] = useState<VM[]>([]);
  const [summary, setSummary] = useState({ total: 0, running: 0, stopped: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingRequest, setDeletingRequest] = useState<string | null>(null);
  const [operatingVMs, setOperatingVMs] = useState<Set<string>>(new Set());
  const [pollingActive, setPollingActive] = useState(true);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const [openExtension, setOpenExtension] = useState(false);
  const [extensionContext, setExtensionContext] = useState<{
    requestId: string; vm?: VM; vms?: VM[]; requestLevelEnabled?: boolean;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  // const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  //const [managersLoading, setManagersLoading] = useState(false);
  const [requestedquota, setrequestedquota] = useState(0);
  const [reason, setreason] = useState("");
 // const [mEmail, setMEmail] = useState("");
  const [submitquota, setsubmitquota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);

  const watchers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overQuotaToastShown = useRef(false);

  const activeVMs = currentUser?.activeVMs || 0;
  const provisioningVMs = currentUser?.provisioningVMs || 0;
  const usedVMs = activeVMs + provisioningVMs;
  const remainingquota = (currentUser?.maxVMs || 0) - usedVMs;
  const RemainingQuota = (currentUser?.maxVMs || 0) - (currentUser?.currentVMs || 0);
  const isOverQuota = RemainingQuota < 0;
  const isMAxREached = (currentUser?.maxVMs ?? 0) >= 50;

  const resetForm = useCallback(() => {
    setrequestedquota(0);
    setreason("");
    // setMEmail("");
    setQuotaError("");
    setTouched(false);
  }, []);

  useEffect(() => {
    if (!isOverQuota) { overQuotaToastShown.current = false; return; }
    if (!overQuotaToastShown.current) {
      alert({
        title: `You are over quota by ${Math.abs(RemainingQuota)} VM(s).`,
        description: `Please stop or delete ${Math.abs(RemainingQuota)} VM(s) to continue creating new ones.`,
        severity: "warning",
      });
      overQuotaToastShown.current = true;
    }
  }, [isOverQuota, RemainingQuota, alert]);

  useEffect(() => { if (!showModal) resetForm(); }, [showModal, resetForm]);

  // useEffect(() => {
  //   if (!showModal) return;
  //   const fetchManagers = async () => {
  //     setManagersLoading(true);
  //     try {
  //       const emails = await fetchManagerEmailsApi();
  //       setManagerOptions(emails);
  //     } catch { /* silently ignore */ }
  //     finally { setManagersLoading(false); }
  //   };
  //   fetchManagers();
  // }, [showModal]);

  const fetchAWSCounts = useCallback(async () => {
    const data = await fetchVMSummaryApi();
    setSummary(data);
  }, []);

  const fetchVMList = useCallback(async () => {
    const normalized = await fetchVMListApi();
    setVMs((prev) =>
      normalized.map((incoming: VM) => {
        const existing = prev.find((v) => v.instanceId === incoming.instanceId);
        if (watchers.current[incoming.instanceId] && existing) {
          return { ...incoming, status: existing.status, publicIp: existing.publicIp, privateIp: existing.privateIp };
        }
        if (existing) {
          const transitionalStates = ["starting", "stopping", "terminating"];
          if (transitionalStates.includes(existing.status)) {
            const allowed: Record<string, string> = { starting: "running", stopping: "stopped", terminating: "terminated" };
            if (incoming.status !== allowed[existing.status]) return { ...incoming, status: existing.status };
          }
        }
        return incoming;
      })
    );
  }, []);

  const pollStatusUpdates = useCallback(async () => {
    try {
      const json = await fetchStatusUpdatesApi();
      if (json.success && json.data) {
        setVMs((prevVms) =>
          prevVms.map((vm) => {
            if (watchers.current[vm.instanceId]) return vm;
            const update = json.data.find((s: any) => s.instanceId === vm.instanceId);
            if (update) {
              const incomingStatus = normalizeStatus(update.status);
              const transitionalStates = ["starting", "stopping", "terminating"];
              if (transitionalStates.includes(vm.status) && !transitionalStates.includes(incomingStatus)) {
                const allowed: Record<string, string> = { starting: "running", stopping: "stopped", terminating: "terminated" };
                if (incomingStatus !== allowed[vm.status]) return vm;
              }
              return {
                ...vm, status: incomingStatus,
                publicIp: update.publicIp !== undefined ? update.publicIp : vm.publicIp,
                privateIp: update.privateIp !== undefined ? update.privateIp : vm.privateIp,
                stop_time: update.stop_time !== undefined ? update.stop_time : vm.stop_time,
              };
            }
            return vm;
          })
        );
        await fetchAWSCounts();
        setPollingActive(true);
      }
    } catch (err) {
      console.error("Polling error:", err);
      setPollingActive(false);
    }
  }, [fetchAWSCounts]);

  const silentRefresh = useCallback(async () => {
    try { await Promise.all([fetchVMList(), fetchAWSCounts()]); }
    catch (error) { console.error("Silent refresh failed:", error); }
  }, [fetchVMList, fetchAWSCounts]);

  const watchVM = useCallback((instanceId: string, vmName: string) => {
    if (watchers.current[instanceId]) return;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (document.visibilityState === "hidden") {
        timeoutId = setTimeout(poll, 5000);
        watchers.current[instanceId] = timeoutId;
        return;
      }
      try {
        const data = await fetchVMStatusApi(instanceId);
        const normalized = normalizeStatus(data.status);

        setVMs((prev) =>
          prev.map((vm) =>
            vm.instanceId === instanceId
              ? {
                  ...vm, status: normalized,
                  publicIp: data.publicIp !== undefined ? data.publicIp : vm.publicIp,
                  privateIp: data.privateIp !== undefined ? data.privateIp : vm.privateIp,
                  stop_time: data.stop_time !== undefined ? data.stop_time : vm.stop_time,
                }
              : vm
          )
        );

        // For "running": only stop polling once stop_time is present in DB
        // (monitorInstanceState writes stop_time atomically with status=running)
        if (normalized === "running" && !data.stop_time) {
          attempt++;
          timeoutId = setTimeout(poll, attempt > 5 ? 10000 : 5000);
          watchers.current[instanceId] = timeoutId;
          return;
        }

        if (normalized === "running" || normalized === "stopped" || normalized === "terminated") {
          // let vmName = instanceId;
          // setVMs((prev) => {
          //   const found = prev.find((v) => v.instanceId === instanceId);
          //   if (found) vmName = found.name;
          //   return prev;
          // });
          delete watchers.current[instanceId];

          if (normalized === "running") alert({ title: `VM "${vmName}" started successfully`, severity: "success" });
          if (normalized === "stopped") alert({ title: `VM "${vmName}" stopped successfully`, severity: "success" });
          if (normalized === "terminated") alert({ title: `VM "${vmName}" terminated successfully`, severity: "success" });
          if (normalized === "terminated") await refreshCurrentUser();

          await silentRefresh();
          return;
        }

        attempt++;
        timeoutId = setTimeout(poll, attempt > 5 ? 10000 : 5000);
        watchers.current[instanceId] = timeoutId;
      } catch (err) {
        console.error("Watcher failed for", instanceId, err);
        timeoutId = setTimeout(poll, 10000);
        watchers.current[instanceId] = timeoutId;
      }
    };
    poll();
  }, [alert, refreshCurrentUser, silentRefresh]);

  const startVM = useCallback(async (instanceId: string, vmName: string) => {
    if (!isAwsConnected) return;
    if (operatingVMs.has(instanceId)) { alert({ title: "VM operation already in progress", severity: "warning" }); return; }
    const confirmed = await confirm({ title: `Start VM "${vmName}"`, description: "The VM will be started and made available for use.", icon: "info" });
    if (!confirmed) return;
    alert({ title: "Starting VM in Progress", severity: "loading" });
    setOperatingVMs((prev) => new Set(prev).add(instanceId));
    try {
      const data = await startVMApi(instanceId);
      const freshStopTime: string | null = data?.stop_time ?? null;
      setVMs((prev) => prev.map((vm) => vm.instanceId === instanceId ? { ...vm, status: "starting", stop_time: freshStopTime } : vm));
      watchVM(instanceId,vmName);
    } catch (error: any) {
      const msg = error instanceof ApiError
        ? `${error.message}${error.details ? `\n\nDetails: ${JSON.stringify(error.details)}` : ""}`
        : error instanceof Error ? error.message : "Failed to start VM";
      alert({ title: msg, severity: "error" });
    } finally {
      setOperatingVMs((prev) => { const s = new Set(prev); s.delete(instanceId); return s; });
    }
  }, [isAwsConnected, operatingVMs, alert, confirm, watchVM]);

  const stopVM = useCallback(async (instanceId: string, vmName: string) => {
    if (!isAwsConnected) return;
    if (operatingVMs.has(instanceId)) { alert({ title: "VM operation already in progress", severity: "warning" }); return; }
    const confirmed = await confirm({ title: `Stop VM "${vmName}"`, description: "The VM will be stopped and all running processes will be halted.", icon: "info" });
    if (!confirmed) return;
    alert({ title: "Stopping VM in Progress", severity: "loading" });
    setOperatingVMs((prev) => new Set(prev).add(instanceId));
    try {
      await stopVMApi(instanceId);
      setVMs((prev) => prev.map((vm) => vm.instanceId === instanceId ? { ...vm, status: "stopping" } : vm));
      watchVM(instanceId,vmName);
    } catch (error: any) {
      const msg = error instanceof ApiError
        ? `${error.message}${error.details ? `\n\nDetails: ${JSON.stringify(error.details)}` : ""}`
        : error instanceof Error ? error.message : "Failed to stop VM";
      alert({ title: msg, severity: "error" });
    } finally {
      setOperatingVMs((prev) => { const s = new Set(prev); s.delete(instanceId); return s; });
    }
  }, [isAwsConnected, operatingVMs, alert, confirm, watchVM]);

  const deleteSingleVM = useCallback(async (instanceId: string, vmName: string) => {
    if (!isAwsConnected) return;
    if (operatingVMs.has(instanceId)) { alert({ title: "VM operation already in progress", severity: "warning" }); return; }
    const confirmed = await confirm({ title: `Confirm VM Termination for ${vmName}`, description: "This action will permanently terminate the VM and cannot be undone.", icon: "destroy" });
    if (!confirmed) return;
    alert({ title: "VM Termination in progress", severity: "loading" });
    setDeletingRequest(instanceId);
    setOperatingVMs((prev) => new Set(prev).add(instanceId));
    try {
      await deleteVMApi(instanceId);
      const targetVM = vms.find((v) => v.instanceId === instanceId);
      if (targetVM?.requestId) {
      setActiveRequest(targetVM.requestId, "ec2-service");
      // ✅ ADD THIS: Navigate to Console to view live logs
      // await new Promise(resolve => setTimeout(resolve, 100));
      navigate("/console");
    }

      await refreshCurrentUser();
      setVMs((prev) => prev.map((vm) => vm.instanceId === instanceId ? { ...vm, status: "terminating", publicIp: "", privateIp: "" } : vm));
      watchVM(instanceId,vmName);
      setDeletingRequest(null);
    } catch (error) {
      alert({ title: `Failed to delete VM: ${error instanceof Error ? error.message : "Unknown error"}`, severity: "error" });
      setDeletingRequest(null);
    } finally {
      setOperatingVMs((prev) => { const s = new Set(prev); s.delete(instanceId); return s; });
    }
  }, [isAwsConnected, operatingVMs, alert, confirm, watchVM, refreshCurrentUser]);

  const startAllVMs = useCallback(async (requestId: string) => {
    const stoppedVMs = vms.filter((vm) => vm.requestId === requestId && vm.status === "stopped");
    if (!stoppedVMs.length) return;
    const confirmed = await confirm({
      title: `Start stopped VMs for ${requestId}?`,
      description: `${stoppedVMs.length} stopped VM(s) will be started. Already-running VMs are not affected.`,
      icon: "info",
    });
    if (!confirmed) return;
    alert({ title: "Starting stopped VMs…", severity: "loading" });
    try {
      const data = await startAllVMsApi(requestId);
      const freshStopTime: string | null = data?.stop_time ?? null;
      setVMs((prev) => prev.map((vm) => vm.requestId === requestId && vm.status === "stopped" ? { ...vm, status: "starting", stop_time: freshStopTime } : vm));
      stoppedVMs.forEach((vm) => watchVM(vm.instanceId, vm.name));
    } catch (error: any) {
      const msg = error instanceof ApiError
        ? `${error.message}${error.details ? `\n\nDetails: ${JSON.stringify(error.details)}` : ""}`
        : error instanceof Error ? error.message : "Failed to start VMs";
      alert({ title: msg, severity: "error" });
    }
  }, [vms, alert, confirm, watchVM]);

  const stopAllVMs = useCallback(async (requestId: string) => {
    if (!isAwsConnected) return;
    const runningVMs = vms.filter((vm) => vm.requestId === requestId && vm.status === "running");
    if (!runningVMs.length) return;
    const confirmed = await confirm({ title: `Stop all running VMs for ${requestId}?`, description: `${runningVMs.length} running VM(s) will be stopped.`, icon: "info" });
    if (!confirmed) return;
    alert({ title: "Stopping all VMs in Progress", severity: "loading" });
    for (const vm of runningVMs) {
      if (operatingVMs.has(vm.instanceId)) continue;
      setOperatingVMs((prev) => new Set(prev).add(vm.instanceId));
      try {
        await stopVMApi(vm.instanceId);
        setVMs((prev) => prev.map((v) => v.instanceId === vm.instanceId ? { ...v, status: "stopping" } : v));
        watchVM(vm.instanceId,vm.name);
      } catch { /* continue stopping others */ }
      finally { setOperatingVMs((prev) => { const s = new Set(prev); s.delete(vm.instanceId); return s; }); }
    }
  }, [isAwsConnected, vms, operatingVMs, alert, confirm, watchVM]);

  const handleCopyIp = useCallback((ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  }, []);

  const handleRequestExtension = useCallback((requestId: string, vm?: VM, requestLevelEnabled?: boolean) => {
    const requestVms = vm ? undefined : vms.filter((v) => v.requestId === requestId);
    setExtensionContext({ requestId, vm, vms: requestVms, requestLevelEnabled });
    setOpenExtension(true);
  }, [vms]);

  const submitQuotaRequest = useCallback(async (approverEmail: string) => {
    if (!currentUser) return;
    if (currentUser.maxVMs >= 50) { alert({ title: "Maximum VM quota limit reached (50). Cannot request further increase.", severity: "error" }); return; }
    if (requestedquota <= currentUser.maxVMs) { alert({ title: `New limit must be greater than ${currentUser.maxVMs}`, severity: "error" }); return; }
    if (requestedquota <= 0) { alert({ title: "Requested limit must be at least 1 VM", severity: "error" }); return; }
    if (!reason.trim()) { alert({ title: "Reason is required", severity: "error" }); return; }
    // if (!mEmail.trim()) { alert({ title: "Please select a manager email", severity: "error" }); return; }
    try {
      setsubmitquota(true);
      const requestedIncrease = requestedquota - currentUser.maxVMs;
      await submitQuotaRequestApi(currentUser.id, {
        requestedQuota: requestedIncrease,
        reason,
        approverEmail
      });
      alert({ title: "Quota Increase request submitted successfully", severity: "success" });
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "An error occurred";
      alert({ title: msg, severity: "error" });
    } finally { setsubmitquota(false); }
  }, [currentUser, requestedquota, reason, alert]);

  // ── Mount / Polling / Visibility ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    refreshCurrentUser();
    Promise.all([fetchAWSCounts(), fetchVMList()])
      .then(() => pollStatusUpdates())
      .finally(() => setLoading(false));
    return () => {
      Object.values(watchers.current).forEach(clearTimeout);
      watchers.current = {};
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

//   useEffect(() => {
//   const load = async () => {
//     try {
//       setLoading(true);

//       await refreshCurrentUser();

//       // Import tagged AWS VMs
//       await syncExistingVMsApi();

//       await Promise.all([
//         fetchAWSCounts(),
//         fetchVMList()
//       ]);

//       await pollStatusUpdates();
//     } catch (err) {
//       console.error("VM load failed:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   load();

//   return () => {
//     Object.values(watchers.current).forEach(clearTimeout);
//     watchers.current = {};
//     if (pollingIntervalRef.current) {
//       clearInterval(pollingIntervalRef.current);
//     }
//   };
// }, []);

  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") pollStatusUpdates();
    }, 15000);
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        Object.values(watchers.current).forEach(clearTimeout);
        watchers.current = {};
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
      } else {
        vms.forEach((vm) => {
          if (["starting", "stopping", "terminating"].includes(vm.status)) watchVM(vm.instanceId,vm.name);
        });
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => {
            if (document.visibilityState === "visible") pollStatusUpdates();
          }, 15000);
          pollStatusUpdates();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [vms, watchVM, pollStatusUpdates]);

  return {
    vms, summary, loading, operatingVMs, copiedIp, pollingActive, deletingRequest,
    isAwsConnected, currentUser,
    activeVMs, provisioningVMs, usedVMs, remainingquota, isMAxREached,
    openExtension, setOpenExtension, extensionContext,
    showModal, setShowModal,
    //  managerOptions, managersLoading,
    requestedquota, setrequestedquota, reason, setreason,
    // mEmail, setMEmail,
     submitquota, quotaError, setQuotaError, touched, setTouched,
    silentRefresh, handleCopyIp, handleRequestExtension, submitQuotaRequest,
    startVM, stopVM, deleteSingleVM, startAllVMs, stopAllVMs,
  };
}
