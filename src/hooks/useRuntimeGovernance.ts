import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExtensionRequest, DisplayRow } from '../components/runtime-governance/types';
import {
  EMAIL_ACTION_ERRORS,
  UI_APPROVE_ERRORS,
  UI_REJECT_ERRORS,
} from '../utils/Runtimegovernance.utils';
import { useDialog } from '@/components/ui/dialog-context';
import {
  fetchAllRuntimeRequestsApi,
  emailApproveApi,
  emailRejectApi,
  approveByAdminApi,
  rejectByAdminApi,
  ApiError,
} from '../components/runtime-governance/runtimeGovernanceApi';

export function useRuntimeGovernance() {
  const { alert, confirm } = useDialog();
  const [, setSearchParams] = useSearchParams();

  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectInProgress, setRejectInProgress] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllRuntimeRequestsApi();
      setRequests(data);
    } catch (err) {
      console.error('Fetch runtime requests failed:', err);
      alert({ title: 'Failed to load extension requests.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Email link: Approve ────────────────────────────────────────────────────
  const handleEmailApprove = useCallback(async (jwtToken: string) => {
    try {
      setActionInProgress('email-token');
      await emailApproveApi(jwtToken);
      alert({ title: 'Runtime extension approved successfully.', severity: 'success' });
      fetchRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        alert({
          title: EMAIL_ACTION_ERRORS[err.code] || err.message || 'Approval failed.',
          severity: err.code === 'ALREADY_PROCESSED' ? 'warning' : 'error',
        });
      } else {
        console.error('Email approve failed:', err);
        alert({ title: 'An unexpected error occurred during approval.', severity: 'error' });
      }
    } finally {
      setActionInProgress(null);
    }
  }, [fetchRequests]);

  // ── Email link: Reject ─────────────────────────────────────────────────────
  const handleEmailReject = useCallback(async (jwtToken: string) => {
    try {
      setActionInProgress('email-reject-token');
      await emailRejectApi(jwtToken);
      alert({ title: 'Runtime extension request rejected successfully.', severity: 'success' });
      fetchRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        alert({
          title: EMAIL_ACTION_ERRORS[err.code] || err.message || 'Rejection failed.',
          severity: err.code === 'ALREADY_PROCESSED' ? 'warning' : 'error',
        });
      } else {
        console.error('Email reject failed:', err);
        alert({ title: 'An unexpected error occurred during rejection.', severity: 'error' });
      }
    } finally {
      setActionInProgress(null);
    }
  }, [fetchRequests]);

  // ── UI button: Approve ─────────────────────────────────────────────────────
  const handleUIApprove = useCallback(async (row: DisplayRow) => {
    const req = row.representativeRow;
    const scopeLabel =
      req.request_type === 'REQUEST'
        ? `all ${row.vmCount ?? ''} VM(s) in request ${req.request_id}`
        : `instance ${req.instance_id}`;

    const confirmed = await confirm({
      title: 'Approve Extension Request',
      description: `Approve a ${req.requested_duration}h extension for ${scopeLabel}?`,
      icon: 'info',
    });
    if (!confirmed) return;

    try {
      setActionInProgress(row.key);
      const data = await approveByAdminApi({
        request_id: req.request_id,
        instance_id: req.instance_id,
        scope: req.request_type,
      });

      const skipped: { instance_id: string; state: string }[] = data?.skipped_instances ?? [];
      if (skipped.length > 0) {
        alert({
          title: `Extension approved for ${data?.data?.length ?? 0} running VM(s).`,
          description: `${skipped.length} VM(s) were skipped because they are currently stopped: ${skipped.map((s) => s.instance_id).join(', ')}. Start those VMs and approve again to extend them.`,
          severity: 'warning',
        });
      } else {
        alert({ title: 'Extension approved successfully.', severity: 'success' });
      }
      fetchRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        const friendlyMsg =
          err.code === 'INSTANCE_NOT_RUNNING'
            ? `The VM is currently ${(err.details as { state?: string })?.state ?? 'stopped'}. The VM must be running to approve a runtime extension.`
            : UI_APPROVE_ERRORS[err.code] || err.message || 'Approval failed.';
        alert({ title: friendlyMsg, severity: 'error' });
      } else {
        console.error('UI approve failed:', err);
        alert({ title: 'An unexpected error occurred.', severity: 'error' });
      }
    } finally {
      setActionInProgress(null);
    }
  }, [fetchRequests, confirm]);

  // ── UI button: Reject ──────────────────────────────────────────────────────
  const handleUIReject = useCallback(async (row: DisplayRow) => {
    const req = row.representativeRow;
    const scopeLabel =
      req.request_type === 'REQUEST'
        ? `all ${row.vmCount ?? ''} VM(s) in request ${req.request_id}`
        : `VM ${req.vm_name ?? req.instance_id}`;

    const confirmed = await confirm({
      title: 'Reject Extension Request',
      description: `Reject the runtime extension for ${scopeLabel}? This cannot be undone.`,
      icon: 'info',
    });
    if (!confirmed) return;

    try {
      setRejectInProgress(row.key);
      await rejectByAdminApi({
        request_id: req.request_id,
        instance_id: req.instance_id,
        scope: req.request_type,
      });
      alert({ title: 'Extension request rejected.', severity: 'success' });
      fetchRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        alert({
          title: UI_REJECT_ERRORS[err.code] || err.message || 'Rejection failed.',
          severity: 'error',
        });
      } else {
        console.error('UI reject failed:', err);
        alert({ title: 'An unexpected error occurred.', severity: 'error' });
      }
    } finally {
      setRejectInProgress(null);
    }
  }, [fetchRequests, confirm]);

  return {
    requests,
    loading,
    fetchRequests,
    actionInProgress,
    rejectInProgress,
    handleEmailApprove,
    handleEmailReject,
    handleUIApprove,
    handleUIReject,
    setSearchParams,
  };
}
