import { apiClient, env } from "@/lib/api";

export interface Route53LoadBalancerItem {
  id: string;
  request_id: string;
  name: string;
  type: "application" | "network" | string;
  region: string;
  status: string;
  dns_name: string;
  canonical_hosted_zone_id: string;
  created_at: string;
}

export interface CreateRoute53RecordPayload {
  hostedZoneId: string;
  recordName: string;
  recordType: string;
  routingPolicy: string;
  isAlias?: boolean;
  ttl?: number;
  value?: string;
  values?: string[];
  comment?: string;
  justification?: string;
  aliasDnsName?: string;
  aliasHostedZoneId?: string;
  aliasEndpointType?: string;
  aliasRegion?: string;
  evaluateTargetHealth?: boolean;
  aliasLoadBalancerId?: string;
  aliasLoadBalancerRequestId?: string;
}

export interface Route53RecordItem {
  id: string;
  hosted_zone_id: string;
  hosted_zone_name: string;
  request_id: string;
  user_id: number;
  record_name: string;
  record_type: string;
  routing_policy: string;
  is_alias: boolean;
  ttl: number | null;
  value: string | null;
  alias_endpoint_type: string | null;
  alias_region: string | null;
  alias_dns_name: string | null;
  alias_hosted_zone_id: string | null;
  evaluate_target_health: boolean;
  status: string;
  created_at: string;
}

export interface DeleteRoute53RecordResponse {
  success: boolean;
  message?: string;
  data?: DeleteRoute53RecordResult;
}

export interface DeleteRoute53RecordResult {
  recordId: string;
  hostedZoneId: string;
  requestId: string;
  recordName: string;
  recordType: string;
  awsChangeInfo?: unknown;
}
export interface CreateRoute53RecordResult {
  recordId: string;
  hostedZoneId: string;
  requestId: string;
  awsChangeInfo?: unknown;
  record?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface CreateRoute53RecordResponse {
  success: boolean;
  message?: string;
  data?: CreateRoute53RecordResult;
}

export interface ExistingRoute53RecordResponse {
  success: boolean;
  exists: boolean;
  record: Route53RecordItem | null;
}

export async function checkExistingRoute53Record(hostedZoneId: string) {
  return apiClient.get<ExistingRoute53RecordResponse>(
    env.route53Service,
    "/records/existing",
    { hostedZoneId }
  );
}

export async function fetchRoute53Records() {
  const response = await apiClient.get<{ success: boolean; count?: number; data?: Route53RecordItem[] }>(
    env.route53Service,
    "/records"
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function deleteRoute53Record(identifier: string) {
  return apiClient.delete<DeleteRoute53RecordResponse>(
    env.route53Service,
    `/records/${identifier}`
  );
}

export async function fetchRoute53LoadBalancers(region: string, endpointType: string) {
  const response = await apiClient.get<{ success: boolean; data?: Route53LoadBalancerItem[] }>(
    env.route53Service,
    "/load-balancers",
    {
      region,
      endpointType,
    }
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function createRoute53Record(payload: CreateRoute53RecordPayload) {
  return apiClient.post<CreateRoute53RecordResponse>(
    env.route53Service,
    "/records",
    payload
  );
}
