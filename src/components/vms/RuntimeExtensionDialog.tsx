import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, Monitor, Layers, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useDialog } from '@/components/ui/dialog-context';
import { getClientIp } from "@/utils/getClientIP";
import { useMyManager }       from '@/hooks/useMyManager';
import { ManagerDisplay }     from '@/components/common/ManagerDisplay';

// interface ManagerOption {
//   email: string;
//   name: string;
// }

const API_BASE = import.meta.env.VITE_RUNTIME_SERVICE_URL ;

console.log("Using API base URL:", API_BASE);

interface VM {
  id: number;
  name: string;
  role: string;
  instanceId: string;
  instanceType?: string;
  publicIp: string;
  privateIp: string;
  region: string;
  status: string;
  requestId: string | null;
  userId: number;
  workspace?: string;
  launchedAt?: string;
  stop_time?: string | null;
}

type Scope = 'single' | 'request';
type DurationOption = '1h' | '2h' | '4h' | '8h' | 'custom';

interface FreeExtStatus {
  free_threshold: number;
  used_hours: number;
  remaining_free_hours: number;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionContext?: { requestId: string; vm?: VM; vms?: VM[]; requestLevelEnabled?: boolean } | null;
  onSuccess?: () => void;
};

export default function RuntimeExtensionDialog({
  open,
  onOpenChange,
  extensionContext,
  onSuccess,
}: Props) {
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
  // const [managerEmail, setManagerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState('');
  const [touchedReason, setTouchedReason] = useState(false);

  // Free extension status
  const [freeExtStatus, setFreeExtStatus] = useState<FreeExtStatus | null>(null);
  const [freeExtLoading, setFreeExtLoading] = useState(false);

  // // Manager email dropdown
  // const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  // const [managersLoading, setManagersLoading] = useState(false);

  const { manager: myManager, superAdmins, hasActiveManager, loading: managerLoading, error: managerError } = useMyManager();
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

  // // ── Fetch managers only when approval is needed ────────────────────────────
  // useEffect(() => {
  //   if (!open || !requiresManagerApproval) return;
  //   const fetchManagers = async () => {
  //     setManagersLoading(true);
  //     try {
  //       const token = localStorage.getItem('token');
  //       const res = await fetch(
  //         `${API_BASE}/api/runtime-governance/manager-emails`,
  //         { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  //       );
  //       if (res.ok) {
  //         const data = await res.json();
  //         setManagerOptions(data.emails || []);
  //       }
  //     } catch {
  //       // silently ignore
  //     } finally {
  //       setManagersLoading(false);
  //     }
  //   };
  //   fetchManagers();
  // }, [open, requiresManagerApproval]);

  // ── Form validity ──────────────────────────────────────────────────────────
  const isFormValid =
    reason.trim().length >= 10 &&
    getDurationHours() !== null &&
    (!requiresManagerApproval || (!!managerEmail.trim() && !managerLoading && !managerError));

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

  // ── Free extension info label ──────────────────────────────────────────────
  const freeExtInfoLabel = (() => {
    if (freeExtLoading) return null;
    if (!freeExtStatus) return null;
    const { remaining_free_hours, free_threshold } = freeExtStatus;
    const usedInRound = free_threshold - remaining_free_hours;
    return { remaining_free_hours, free_threshold, usedInRound };
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl
        max-h-[90vh]
        overflow-y-auto
        [&::-webkit-scrollbar]:hidden
        [-ms-overflow-style:none]
        [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Request Runtime Extension
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ── Scope selector ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Extension Scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as Scope)}
              className="grid grid-cols-2 gap-3"
            >
              <label
                className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  scope === 'single' ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/30'
                } ${!vm ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <RadioGroupItem value="single" id="scope-single" disabled={!vm} />
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Single VM</p>
                  <p className="text-[11px] text-muted-foreground">
                    {vm ? vm.name : 'Select from instance row'}
                  </p>
                </div>
              </label>

              <label
                className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  !requestLevelEnabled
                    ? 'opacity-40 pointer-events-none cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  scope === 'request' ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/30'
                }`}
              >
                <RadioGroupItem value="request" id="scope-request" disabled={!requestLevelEnabled} />
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Entire Request</p>
                  {!requestLevelEnabled ? (
                    <p className="text-[11px] text-amber-400">Vms under request have different stop times</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground font-mono">{requestId}</p>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* ── Free extension quota banner ──────────────────────────────── */}
          {/* {freeExtLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking free extension quota…
            </div>
          )} */}

          {/* {freeExtInfoLabel && (
            <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Free extension quota</span>
                <span className="font-mono font-semibold text-foreground">
                  {freeExtInfoLabel.remaining_free_hours}h remaining
                </span>
              </div>
              {/* Progress bar */}
              {/* <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all"
                  style={{
                    width: `${Math.max(0, (freeExtInfoLabel.remaining_free_hours / freeExtInfoLabel.free_threshold) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {freeExtInfoLabel.usedInRound.toFixed(1)}h used of {freeExtInfoLabel.free_threshold}h free pool
                {freeExtInfoLabel.remaining_free_hours > 0
                  ? ` · Extensions up to ${freeExtInfoLabel.remaining_free_hours}h need no manager approval`
                  : ' · Free quota exhausted — next extension requires manager approval'}
              </p>
            </div>
          )} */} 

          {/* ── Duration ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Requested Extension Duration</Label>
            <Select
              value={durationOption}
              onValueChange={(v) => setDurationOption(v as DurationOption)}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="2h">2 Hours</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="8h">8 Hours</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {durationOption === 'custom' && (
              <Input
                type="number"
                min="1"
                max="192"
                step="1"
                placeholder="Enter hours (e.g. 10)"
                value={customHours}
                onKeyDown={(e) => {
                  // Block invalid keys: ., e, E, +, -
                  if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  let value = e.target.value;
                  // Allow only digits
                  if (!/^\d*$/.test(value)) return;
                  // Limit to 3 digits
                  if (value.length > 3) return;
                  setCustomHours(value);
                }}
                className="bg-muted/50"
              />
            )}

            {/* ── Approval indicator banner ─────────────────────────────── */}
            {durationHours !== null && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                  requiresManagerApproval
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}
              >
                {requiresManagerApproval ? (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      This duration exceeds your {freeHoursRemaining}h free quota. Manager approval
                      is required — an email will be sent to the selected manager.
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Within your free quota — applied immediately, no manager approval needed.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Reason ───────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>
              Reason for Extension <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Explain why you need more time..."
              value={reason}
              minLength={10}
              maxLength={250}
              onChange={(e) => {
                const value = e.target.value;
                setReason(value);
                if (touchedReason) {
                  setReasonError(value.trim().length < 10 ? 'Minimum 10 characters required' : '');
                }
              }}
              onBlur={() => {
                setTouchedReason(true);
                if (reason.trim().length < 10) setReasonError('Minimum 10 characters required');
              }}
              className="bg-muted/50 min-h-[80px]"
            />
            <div className="flex justify-between items-center text-xs">
              <span className="text-destructive">{reasonError}</span>
              <span className="text-muted-foreground">{reason.length}/250</span>
            </div>
          </div>

          {/* ── Manager Email — only when duration exceeds free limit ─────── */}
          {/* {requiresManagerApproval && (
            <div className="space-y-2">
              <Label>
                Manager Email <span className="text-destructive">*</span>
              </Label>

              {managersLoading ? (
                <div className="flex gap-1 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading managers…
                </div>
              ) : managerOptions.length === 0 ? (
                <p className="text-sm text-destructive">
                  No eligible managers found. Please contact your administrator.
                </p>
              ) : (
                <Select value={managerEmail} onValueChange={setManagerEmail}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Select a manager…" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions.map((opt) => (
                      <SelectItem key={opt.email} value={opt.email}>
                        {opt.name !== opt.email ? `${opt.name} (${opt.email})` : opt.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <p className="text-[11px] text-muted-foreground">
                An approval link will be sent to the selected manager.
              </p>
            </div>
          )} */}

          {requiresManagerApproval && (
            <ManagerDisplay
              manager={myManager}
              superAdmins={superAdmins || []}
              hasActiveManager={hasActiveManager}
              loading={managerLoading}
              error={managerError}
              selectedEmail={selectedSuperAdmin}
              onEmailChange={setSelectedSuperAdmin}
              label="Manager"
            />
          )}

        </div>

        {!isFormValid && (
          <p className="text-xs text-muted-foreground">
            Please fill all required fields correctly to enable submission.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={submitting || !isFormValid}>
            {submitting
              ? requiresManagerApproval ? 'Submitting…' : 'Applying…'
              : requiresManagerApproval
              ? 'Submit Request'
              : 'Apply Extension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}