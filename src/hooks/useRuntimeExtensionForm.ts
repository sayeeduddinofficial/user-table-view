import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useDialog } from '@/components/ui/dialog-context';
import { getClientIp } from '@/utils/getClientIP';
import { useMyManager } from '@/hooks/useMyManager';
import type {
  DurationOption,
  FreeExtStatus,
  RuntimeExtensionContext,
  Scope,
} from '@/components/vms/runtimeExtension.types';

interface UseRuntimeExtensionFormArgs {
  open: boolean;
  extensionContext?: RuntimeExtensionContext | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
const API_BASE = import.meta.env.VITE_RUNTIME_SERVICE_URL;
export function useRuntimeExtensionForm({
  open,
  extensionContext,
  onOpenChange,
  onSuccess,
}: UseRuntimeExtensionFormArgs) {
  const { currentUser } = useAppStore();
  const { alert } = useDialog();

  const requestId = extensionContext?.requestId ?? '';
  const vm = extensionContext?.vm;
  const requestLevelEnabled = extensionContext?.requestLevelEnabled !== false;
  const defaultScope: Scope = vm ? 'single' : 'request';

  const [scope, setScope] = useState<Scope>(defaultScope);
  const [durationOption, setDurationOption] = useState<DurationOption>('8h');
  const [customHours, setCustomHours] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState('');
  const [touchedReason, setTouchedReason] = useState(false);

  // Free extension status
  const [freeExtStatus, setFreeExtStatus] = useState<FreeExtStatus | null>(null);
  const [freeExtLoading, setFreeExtLoading] = useState(false);

  const { manager: myManager, superAdmins, hasActiveManager, loading: managerLoading, error: managerError } = useMyManager(open);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState('');

  // Determine which email to use for submission
  const managerEmail = hasActiveManager && myManager?.email
    ? myManager.email
    : selectedSuperAdmin;

  // ── Derived ────────────────────────────────────────────────────────────────
  const getDurationHours = (): number | null => {
    if (durationOption === 'custom') {
      const h = parseFloat(customHours);
      return isNaN(h) || h <= 0 ? null : h;
    }
    return parseInt(durationOption, 10);
  };

  const durationHours = getDurationHours();

  // Dynamic threshold: if we have status data use remaining free hours, else default 8
  const freeHoursRemaining = freeExtStatus?.remaining_free_hours ?? 8;
  const requiresManagerApproval =
    durationHours !== null && durationHours > freeHoursRemaining;

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setScope(vm ? 'single' : (requestLevelEnabled ? defaultScope : 'single'));
    setDurationOption('8h');
    setCustomHours('');
    setReason('');
    setSelectedSuperAdmin('');
    setReasonError('');
    setTouchedReason(false);
  };

  // Reset form + clear status when dialog opens with fresh context
  useEffect(() => {
    if (open) {
      resetForm();
      setFreeExtStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If request-level is disabled and scope is 'request', force back to 'single'
  useEffect(() => {
    if (!requestLevelEnabled && scope === 'request') {
      setScope('single');
    }
  }, [requestLevelEnabled, scope]);

  // ── Fetch free extension status when dialog opens ──────────────────────────
  useEffect(() => {
    if (!open || !requestId) return;

    const fetchFreeExtStatus = async () => {
      setFreeExtLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({ request_id: requestId });

        if (scope === 'single' && vm?.instanceId) {
          params.set('scope', 'INSTANCE');
          params.set('instance_id', vm.instanceId);
        } else {
          params.set('scope', 'REQUEST');
        }

        const res = await fetch(
          `${API_BASE}/api/runtime-governance/free-extension-status?${params}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          setFreeExtStatus(data);
        }
      } catch {
        // silently fall back to default 8 h threshold
      } finally {
        setFreeExtLoading(false);
      }
    };

    fetchFreeExtStatus();
  }, [open, scope, vm?.instanceId, requestId]);

  // ── Form validity ──────────────────────────────────────────────────────────
  const isFormValid =
    reason.trim().length >= 10 &&
    getDurationHours() !== null &&
    (!requiresManagerApproval || (!!managerEmail.trim() && !managerLoading && !managerError));

  // ── Direct apply (within free limit) ──────────────────────────────────────
  const handleDirectApply = async (hours: number, headers: Record<string, string>) => {
    if (scope === 'single') {
      if (!vm?.instanceId) {
        alert({ title: 'No VM selected for single-VM extension.', severity: 'error' });
        return;
      }

      const body = {
        instance_id: vm.instanceId,
        request_id: requestId,
        requester_email: currentUser!.email,
        requester_name: currentUser!.displayName || currentUser!.name || currentUser!.email,
        vm_name: vm.name,
        duration_hours: hours,
        reason: reason.trim(),
        request_type: 'INSTANCE',
      };

      const res = await fetch(
        `${API_BASE}/api/runtime-governance/apply-direct-extension`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );
      const data = await res.json();

      if (!res.ok) {
        const friendlyErrors: Record<string, string> = {
          INSTANCE_NOT_RUNNING:
            data?.message || 'This VM is not currently running. Please start it before requesting an extension.',
          INVALID_INSTANCE_REQUEST_MAPPING: 'Instance does not belong to this request.',
          EXCEEDS_FREE_LIMIT:
            data?.message || `Only ${data?.remaining_free_hours ?? '?'}h of free extension remaining.`,
        };
        alert({
          title: friendlyErrors[data?.code] || data?.message || 'Failed to apply extension.',
          severity: 'error',
        });
        return;
      }

      alert({
        title: `Extension of ${hours}h applied immediately to ${vm.name}. No manager approval needed.`,
        severity: 'success',
      });
    } else {
      const body = {
        request_id: requestId,
        requester_email: currentUser!.email,
        requester_name: currentUser!.displayName || currentUser!.name || currentUser!.email,
        duration_hours: hours,
        reason: reason.trim(),
      };

      const res = await fetch(
        `${API_BASE}/api/runtime-governance/apply-direct-extension-all`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );
      const data = await res.json();

      if (!res.ok) {
        const friendlyErrors: Record<string, string> = {
          NO_VMS_FOUND: 'No VMs found for this request.',
          NO_INSTANCES_RUNNING:
            data?.message || 'None of the VMs in this request are currently running.',
          EXCEEDS_FREE_LIMIT:
            data?.message || `Only ${data?.remaining_free_hours ?? '?'}h of free extension remaining.`,
        };
        alert({
          title: friendlyErrors[data?.code] || data?.message || 'Failed to apply extension.',
          severity: 'error',
        });
        return;
      }

      const applied = Array.isArray(data.data) ? data.data.length : 0;
      const skipped = Array.isArray(data.skipped_instances) ? data.skipped_instances.length : 0;

      alert({
        title:
          skipped > 0
            ? `Extension of ${hours}h applied to ${applied} running VM(s). ${skipped} stopped VM(s) were skipped.`
            : `Extension of ${hours}h applied immediately to all ${applied} running VM(s). No manager approval needed.`,
        severity: 'success',
      });
    }

    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  // ── Approval flow (beyond free limit) ─────────────────────────────────────
  const handleApprovalFlow = async (hours: number, headers: Record<string, string>) => {
    if (scope === 'single') {
      if (!vm?.instanceId) {
        alert({ title: 'No VM selected for single-VM extension.', severity: 'error' });
        return;
      }

      const body = {
        instance_id: vm.instanceId,
        request_id: requestId,
        requester_email: currentUser!.email,
        requester_name: currentUser!.displayName || currentUser!.name || currentUser!.email,
        vm_name: vm.name,
        manager_email: managerEmail.trim().toLowerCase(),
        duration_hours: hours,
        reason: reason.trim(),
        request_type: 'INSTANCE',
      };

      const res = await fetch(`${API_BASE}/api/runtime-governance/request-extension`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const friendlyErrors: Record<string, string> = {
          PENDING_REQUEST: 'A pending extension request already exists for this VM.',
          INSTANCE_NOT_RUNNING:
            data?.message || 'This VM is not currently running. Please start it before requesting an extension.',
          MANAGER_NOT_FOUND: data?.message || 'This email is not registered in SplunkOps.',
          MANAGER_INACTIVE: data?.message || 'The manager account is inactive.',
          MANAGER_NOT_ADMIN: data?.message || 'This email does not belong to an admin or super admin.',
        };
        alert({
          title: friendlyErrors[data?.code] || data?.message || 'Failed to submit extension request.',
          severity: data?.code === 'PENDING_REQUEST' ? 'warning' : 'error',
        });
        return;
      }

      alert({
        title: `Extension request for ${hours}h submitted for ${vm.name}. Your manager will receive an approval email.`,
        severity: 'success',
      });
    } else {
      const body = {
        request_id: requestId,
        requester_email: currentUser!.email,
        requester_name: currentUser!.displayName || currentUser!.name || currentUser!.email,
        manager_email: managerEmail.trim().toLowerCase(),
        duration_hours: hours,
        reason: reason.trim(),
      };

      const res = await fetch(`${API_BASE}/api/runtime-governance/request-extension-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const friendlyErrors: Record<string, string> = {
          NO_VMS_FOUND: 'No VMs found for this request.',
          NO_INSTANCES_RUNNING: data?.message || 'None of the VMs are currently running.',
          PENDING_REQUEST: 'A pending extension request already exists for one or more VMs.',
          MANAGER_NOT_FOUND: data?.message || 'This email is not registered in SplunkOps.',
          MANAGER_INACTIVE: data?.message || 'The manager account is inactive.',
          MANAGER_NOT_ADMIN: data?.message || 'This email does not belong to an admin or super admin.',
        };
        alert({
          title: friendlyErrors[data?.code] || data?.message || 'Failed to submit extension request.',
          severity: 'error',
        });
        return;
      }

      const created = Array.isArray(data.data) ? data.data.length : 0;
      const skipped = Array.isArray(data.skipped_instances) ? data.skipped_instances.length : 0;

      alert({
        title:
          skipped > 0
            ? `Extension request submitted for ${created} running VM(s). ${skipped} stopped VM(s) were skipped.`
            : `Extension request for ${hours}h submitted for all ${created} running VM(s). Your manager will receive an approval email.`,
        severity: 'success',
      });
    }

    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const hours = getDurationHours();
    if (hours === null) {
      alert({ title: 'Please enter a valid duration (positive number of hours)', severity: 'error' });
      return;
    }
    if (hours > 192) {
      alert({
        title: 'Maximum allowed duration is 192 hours',
        severity: 'error'
      });
      return;
    }
    if (!reason.trim()) {
      alert({ title: 'Reason is required', severity: 'error' });
      return;
    }
    if (reason.trim().length < 10) {
      alert({ title: 'Minimum 10 characters required for reason', severity: 'error' });
      return;
    }
    if (requiresManagerApproval && !managerEmail.trim()) {
      alert({ title: 'Manager not resolved. Please wait or contact your administrator.', severity: 'error' });
      return;
    }
    if (!currentUser?.email) {
      alert({ title: 'Unable to determine your account. Please refresh.', severity: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}`, 'x-client-ip': (await getClientIp()) || '' }
        : {}),
    };

    try {
      setSubmitting(true);
      if (requiresManagerApproval) {
        await handleApprovalFlow(hours, headers);
      } else {
        await handleDirectApply(hours, headers);
      }
    } catch (err) {
      console.error('Extension request failed:', err);
      alert({ title: 'An unexpected error occurred. Please try again.', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Free extension info label ──────────────────────────────────────────────
  const freeExtInfoLabel = (() => {
    if (freeExtLoading) return null;
    if (!freeExtStatus) return null;
    const { remaining_free_hours, free_threshold } = freeExtStatus;
    const usedInRound = free_threshold - remaining_free_hours;
    return { remaining_free_hours, free_threshold, usedInRound };
  })();

  return {
    requestId,
    vm,
    requestLevelEnabled,
    scope,
    setScope,
    durationOption,
    setDurationOption,
    customHours,
    setCustomHours,
    reason,
    setReason,
    submitting,
    reasonError,
    setReasonError,
    touchedReason,
    setTouchedReason,
    durationHours,
    freeHoursRemaining,
    requiresManagerApproval,
    resetForm,
    isFormValid,
    handleSubmit,
    freeExtInfoLabel,
    myManager,
    superAdmins,
    hasActiveManager,
    managerLoading,
    managerError,
    selectedSuperAdmin,
    setSelectedSuperAdmin,
  };
}
