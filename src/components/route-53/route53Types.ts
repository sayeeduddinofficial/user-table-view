/** Shared Route 53 domain types used across the Route 53 pages and components. */

export interface HostedZone {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  records: number;
  description: string;
}

export interface Route53QuotaUsage {
  usedRecords: number;
  maxRecords: number;
  remainingRecords: number;
}

export interface Route53QuotaRequestPayload {
  requestedQuota: number;
  reason: string;
  approverEmail: string;
}

export interface HostedZoneRouteState {
  hostedZoneId?: string;
  hostedZoneName?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}
