export interface ExtensionRequest {
  id: number;
  instance_id: string;
  request_id: string;
  requester_email: string;
  requester_role: string | null;
  manager_email: string | null;
  requested_duration: number;
  reason: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_approved';
  approval_token: string;
  original_stop_time: string | null;
  extended_stop_time: string | null;
  approved_at: string | null;
  request_timestamp: string;
  expires_at: string;
  request_type: 'INSTANCE' | 'REQUEST';
  scope: 'INSTANCE' | 'REQUEST';
  vm_name: string | null;
  vm_status: string | null;
}

export interface DisplayRow {
  key: string;
  representativeRow: ExtensionRequest;
  vmCount?: number;
  effectiveStatus: ExtensionRequest['approval_status'];
}

export function formatDateTime(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const TERMINATED_VM_STATES = new Set(['terminated', 'terminating', 'shutting-down', 'destroyed']);
const TRANSITIONING_VM_STATES = new Set(['stopping', 'starting', 'pending']);

export function isVMTransitioning(row: ExtensionRequest): boolean {
  return row.vm_status != null && TRANSITIONING_VM_STATES.has(row.vm_status);
}

export function resolveRowStatus(row: ExtensionRequest): ExtensionRequest['approval_status'] {
  if (row.approval_status !== 'pending') return row.approval_status;
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  if (row.vm_status != null && TRANSITIONING_VM_STATES.has(row.vm_status)) return 'pending';
  if (row.vm_status != null && TERMINATED_VM_STATES.has(row.vm_status)) return 'expired';
  return 'pending';
}

export function resolveGroupStatus(rows: ExtensionRequest[]): ExtensionRequest['approval_status'] {
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
      (a, b) => new Date(b.request_timestamp).getTime() - new Date(a.request_timestamp).getTime()
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
