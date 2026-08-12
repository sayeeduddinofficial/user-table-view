// Shared API response types

export interface ApiResponse<T = unknown> {
  status: 'SUCCESS' | 'ERROR';
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  entraObjectId: string;
  displayName: string;
  role: 'SuperAdmin' | 'SplunkOps.Admin' | 'SplunkOps.User';
  status: 'ACTIVE' | 'DEACTIVATED' | 'INVITED' | 'INACTIVE';
  maxVMs: number;
  currentVMs: number;
  provisioningVMs: number;
  allowedInstanceTypes: string[];
  allowedCategories: number[];
  timeZone: string;
  workStartTime: string;
  workEndTime: string;
  createdBy: string;
  createdAt: string;
  profileImage?: string;
}

export interface AzureAdUser {
  id: string;
  displayName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
}

export interface AzureAdSearchResponse {
  status: 'SUCCESS' | 'ERROR';
  data?: AzureAdUser[];
  error?: string;
}

export interface Profile {
  id: number;
  email: string;
  displayName: string;
  role: string;
  status: string;
  profileImage?: string;
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: 'SplunkOps.Admin' | 'SplunkOps.User';
  maxVMs: number;
  allowedInstanceTypes: string[];
  allowedCategories: number[];
  timeZone: string;
  workStartTime: string;
  workEndTime: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: 'SuperAdmin' | 'SplunkOps.Admin' | 'SplunkOps.User';
  maxVMs?: number;
  maxBuckets?: number;
  maxVpcs?: number;
  maxLoadBalancers?: number;
  maxEksClusters?: number;
  maxDnsRecords?: number;
  maxRdsClusters?: number;
  allowedInstanceTypes?: string[];
  allowedCategories?: number[];
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  imageBase64?: string;
}

// Raw API response types (snake_case from backend)
export interface RawUserApiResponse {
  id: number;
  email: string;
  entra_object_id?: string;
  display_name?: string;
  role: string;
  status: string;
  max_vms: number;
  current_vms?: number;
  provisioning_vms?: number;
  max_vpcs?: number;
  max_load_balancers?: number;
  max_dns_records?: number;
  max_rds_clusters?: number;
  max_eks_clusters?: number;
  max_buckets?: number;
  current_buckets?: number;
  current_vpcs?: number;
  current_load_balancers?: number;
  current_rds_clusters?: number;
  current_eks_clusters?: number;
  current_dns_records?: number;
  allowed_instance_types?: string[];
  allowed_categories?: number[] | string;
  time_zone?: string;
  work_start_time?: string;
  work_end_time?: string;
  profile_image?: string;
  created_at: string;
}

export interface UserApiResponse {
  status: 'SUCCESS' | 'ERROR';
  data: RawUserApiResponse[];
  message?: string;
}

export interface CreateUserResponse {
  status: 'SUCCESS' | 'ERROR';
  data?: {
    entraObjectId: string;
    emailSent: boolean;
  };
  message?: string;
  error?: string;
}

export interface UpdateUserResponse {
  status: 'SUCCESS' | 'ERROR';
  data?: {
    entraObjectId: string;
  };
  message?: string;
  error?: string;
}

export interface DeleteUserResponse {
  status: 'SUCCESS' | 'ERROR';
  message?: string;
  error?: string;
}

// export interface ReinviteUserResponse {
//   success: boolean;
//   message: string;
//   emailSent: boolean;
// }

export interface ToggleUserActiveResponse {
  status: 'SUCCESS' | 'ERROR';
  message?: string;
  error?: string;
}

export interface ApiErrorResponse {
  status?: 'ERROR';
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
  invalidGiven?: string[];
  allowedOnly?: string[];
} 


// ─── AWS Settings ──────────────────────────────────────────────────────────

export type AwsConnectionStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'CONNECTION_UNAVAILABLE';

export interface AwsConfigResponse {
  accessKeyId: string;
  secretKey: string;
  region: string;
  amiId: string;
  status: AwsConnectionStatus;
  lastValidatedAt?: string;
  error?: string;
}

export interface SaveAwsSettingsRequest {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  amiId?: string;
}

export interface SaveAwsSettingsResponse {
  status: AwsConnectionStatus;
  error?: string;
}

// ─── System Settings ───────────────────────────────────────────────────────

export interface SystemSettingValue {
  enabled: boolean;
}

export interface SystemSettings {
  email_notifications: SystemSettingValue;
  failure_alerts: SystemSettingValue;
  audit_logging: SystemSettingValue;
}

export type SystemSettingKey = keyof SystemSettings;

export interface GetSystemSettingsResponse {
  success: boolean;
  settings: SystemSettings;
}

export interface UpdateSystemSettingResponse {
  success: boolean;
  message: string;
  setting: {
    setting_key: string;
    setting_value: SystemSettingValue;
    updated_at: string;
  };
}


// ─── Notifications ─────────────────────────────────────────────────────────

export interface NotificationRaw {
  id: string;
  service: string;
  event_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  service: string;
  eventType: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Audit Logs ────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  user_id: number;
  user_name: string;
  user_role: string;
  user_email?: string;
  user_avatar?: string;
  user_status?: string;
  action: string;
  category: string;
  target?: string;
  details: Record<string, unknown>;
  service_name?: string;
  request_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface AuditLogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: AuditLogPagination;
}

export interface AuditFiltersResponse {
  users: { user_id: number; user_name: string }[];
  categories: string[];
}

export interface AuditCategoryCountsResponse {
  [category: string]: number;
}

export interface AuditLogsQueryParams {
  search?: string;
  userId?: string[];
  category?: string[];
  serviceName?: string[];
  page: number;
  dateRangeOption?: string;
  startDate?: string;
  endDate?: string;
}


export interface ActivityTimelineItem {
  date: string;
  category: string;
  count: number;
}

export interface TopUser {
  user_id: number;
  user_name: string;
  avatar?: string;
  count: number;
}

export interface HourlyActivityItem {
  day: number;
  hour: number;
  count: number;
}

export interface AuditAnalyticsResponse {
  activityTimeline: ActivityTimelineItem[];
  topUsers: TopUser[];
  vmLifecycle: Record<string, number>;
  requestManagement: {
    quotaRequests: { pending: number; approved: number; rejected: number };
    runtimeExtensions: { pending: number; approved: number; rejected: number };
  };
  hourlyActivity: HourlyActivityItem[];
}

