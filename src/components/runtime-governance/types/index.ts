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

/**
 * A display row is either:
 *  - an INSTANCE-scope row rendered as-is (one DB row → one UI row)
 *  - a REQUEST-scope group: N DB rows collapsed into one UI row
 */
export interface DisplayRow {
  key: string;
  representativeRow: ExtensionRequest;
  vmCount?: number;
  effectiveStatus: ExtensionRequest['approval_status'];
}