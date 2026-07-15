import { ExtensionRequest, DisplayRow } from '../components/runtime-governance/types/index';

export const TERMINATED_VM_STATES = new Set([
  'terminated', 'terminating', 'shutting-down', 'destroyed',
]);

export const TRANSITIONING_VM_STATES = new Set([
  'stopping', 'starting', 'pending',
]);

export function formatDateTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isVMTransitioning(row: ExtensionRequest): boolean {
  return row.vm_status != null && TRANSITIONING_VM_STATES.has(row.vm_status);
}

export function resolveRowStatus(
  row: ExtensionRequest
): ExtensionRequest['approval_status'] {
  if (row.approval_status !== 'pending') return row.approval_status;

  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';

  if (row.vm_status != null && TRANSITIONING_VM_STATES.has(row.vm_status)) {
    return 'pending';
  }

  if (
    row.vm_status != null &&
    TERMINATED_VM_STATES.has(row.vm_status)
  ) {
    return 'expired';
  }

  return 'pending';
}

export function resolveGroupStatus(
  rows: ExtensionRequest[]
): ExtensionRequest['approval_status'] {
  const statuses = rows.map(resolveRowStatus);

  if (statuses.some((s) => s === 'pending')) return 'pending';
  if (statuses.every((s) => s === 'approved')) return 'approved';
  if (statuses.every((s) => s === 'rejected')) return 'rejected';
  if (statuses.every((s) => s === 'expired')) return 'expired';
  if (statuses.some((s) => s === 'auto_approved')) return 'auto_approved';
  if (statuses.some((s) => s === 'approved')) return 'approved';
  if (statuses.some((s) => s === 'rejected')) return 'rejected';
  return 'expired';
}

/**
 * Collapse raw DB rows into display rows.
 * INSTANCE rows → one display row per DB row.
 * REQUEST rows  → one display row per unique approval_token (submission batch).
 */
export function buildDisplayRows(rows: ExtensionRequest[]): DisplayRow[] {
  const display: DisplayRow[] = [];
  const requestGroups = new Map<string, ExtensionRequest[]>();

  for (const row of rows) {
    if (row.request_type === 'INSTANCE') {
      display.push({
        key: `INSTANCE-${row.id}`,
        representativeRow: row,
        effectiveStatus: resolveRowStatus(row),
      });
    } else {
      const groupKey = row.approval_token || `${row.request_id}-${row.id}`;
      if (!requestGroups.has(groupKey)) requestGroups.set(groupKey, []);
      requestGroups.get(groupKey)!.push(row);
    }
  }

  for (const [, groupRows] of requestGroups) {
    const sorted = [...groupRows].sort(
      (a, b) =>
        new Date(b.request_timestamp).getTime() -
        new Date(a.request_timestamp).getTime()
    );
    const rep = sorted[0];
    display.push({
      key: `REQUEST-${rep.id}`,
      representativeRow: rep,
      vmCount: groupRows.length,
      effectiveStatus: resolveGroupStatus(groupRows),
    });
  }

  display.sort(
    (a, b) =>
      new Date(b.representativeRow.request_timestamp).getTime() -
      new Date(a.representativeRow.request_timestamp).getTime()
  );

  return display;
}

export function decodeTokenPayload(field: 'role' | 'email'): string {
  try {
    const token = localStorage.getItem('token') ?? '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    const value = payload?.[field] ?? '';
    return field === 'email' ? value.trim().toLowerCase() : value;
  } catch {
    return '';
  }
}

/** Friendly error messages for email-link-based approval/rejection actions */
export const EMAIL_ACTION_ERRORS: Record<string, string> = {
  INVALID_OR_EXPIRED_TOKEN: 'This link has expired (links are valid for 30 minutes). No action was taken.',
  REQUEST_NOT_FOUND: 'The extension request could not be found. It may have already expired.',
  ALREADY_PROCESSED: 'This request has already been approved or rejected. No further action is needed.',
  REQUEST_INVALIDATED: 'The VM was restarted after this request was created — it is no longer valid.',
  INSTANCE_TERMINATED: 'The instance has been terminated. This extension request is no longer valid.',
  INSTANCE_NOT_RUNNING: 'The VM is currently stopped. The VM must be running to approve a runtime extension.',
  ALL_INSTANCES_STOPPED: 'All VMs in this request are currently stopped. Please start at least one VM before approving.',
};

/** Friendly error messages for UI approve action */
export const UI_APPROVE_ERRORS: Record<string, string> = {
  REQUEST_NOT_FOUND: 'No valid pending request found.',
  REQUEST_INVALIDATED: 'The VM was restarted — this request is no longer valid.',
  INSTANCE_TERMINATED: 'This instance has been terminated. The extension request has been marked as expired.',
  ALL_INSTANCES_STOPPED: 'All VMs in this request are currently stopped. Please start at least one VM before approving.',
  FORBIDDEN: 'You do not have permission to approve this request.',
};

/** Friendly error messages for UI reject action */
export const UI_REJECT_ERRORS: Record<string, string> = {
  REQUEST_NOT_FOUND: 'No pending request found. It may have already been processed or expired.',
  MISSING_FIELDS: 'Required fields are missing.',
  MISSING_INSTANCE_ID: 'Instance ID is required for single-VM rejection.',
  FORBIDDEN: 'You do not have permission to reject this request.',
};