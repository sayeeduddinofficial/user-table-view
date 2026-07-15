import { apiClient } from '@/lib/api';
import { env } from '@/lib/env';
import type {
  Notification,
  AuditLogsResponse,
  AuditFiltersResponse,
  AuditCategoryCountsResponse,
  AuditLogsQueryParams,
  AuditAnalyticsResponse,
} from '@/types/api';

const BASE = env.notification;

// ─── Notifications ──────────────────────────────────────────────────────────

export const fetchNotifications = (): Promise<Notification[]> =>
  apiClient.get<Notification[]>(BASE, '/api/notifications', { limit: '100' });

export const markNotificationRead = (id: string): Promise<void> =>
  apiClient.patch<void>(BASE, `/api/notifications/${id}/read`);

export const markAllNotificationsRead = (): Promise<void> =>
  apiClient.patch<void>(BASE, '/api/notifications/mark-all-read');

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export const fetchAuditLogs = (params: AuditLogsQueryParams): Promise<AuditLogsResponse> => {
  const query: Record<string, string> = {
    page: String(params.page),
    limit: '10',
  };
  if (params.search) query.search = params.search;
  if (params.userId?.length && !params.userId.includes('all'))
    query.userId = params.userId.join(',');
  if (params.category?.length && !params.category.includes('all'))
    query.category = params.category.join(',');
  if (params.dateRangeOption && params.dateRangeOption !== 'all' && params.dateRangeOption !== 'custom')
    query.dateRangeOption = params.dateRangeOption;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;

  return apiClient.get<AuditLogsResponse>(BASE, '/api/audit-logs', query);
};

export const fetchAuditFilters = (): Promise<AuditFiltersResponse> =>
  apiClient.get<AuditFiltersResponse>(BASE, '/api/audit-logs/filters');

export const fetchAuditCategoryCounts = (
  params: Omit<AuditLogsQueryParams, 'page' | 'search'>
): Promise<AuditCategoryCountsResponse> => {
  const query: Record<string, string> = {};
  if (params.userId?.length && !params.userId.includes('all'))
    query.userId = params.userId.join(',');
  if (params.category?.length && !params.category.includes('all'))
    query.category = params.category.join(',');
  if (params.dateRangeOption && params.dateRangeOption !== 'all' && params.dateRangeOption !== 'custom')
    query.dateRangeOption = params.dateRangeOption;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;

  return apiClient.get<AuditCategoryCountsResponse>(BASE, '/api/audit-logs/category-counts', query);
};

export const fetchAuditAnalytics = (
  params: Omit<AuditLogsQueryParams, 'page' | 'search'>
): Promise<AuditAnalyticsResponse> => {
  const query: Record<string, string> = {};
  if (params.userId?.length && !params.userId.includes('all'))
    query.userId = params.userId.join(',');
  if (params.category?.length && !params.category.includes('all'))
    query.category = params.category.join(',');
  if (params.dateRangeOption && params.dateRangeOption !== 'all' && params.dateRangeOption !== 'custom')
    query.dateRangeOption = params.dateRangeOption;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;

  return apiClient.get<AuditAnalyticsResponse>(BASE, '/api/audit-logs/analytics', query);
};

export const downloadAuditLogsCSV = (
  params: Omit<AuditLogsQueryParams, 'page' | 'search'>
): Promise<void> => {
  const query = new URLSearchParams();
  if (params.userId?.length && params.userId[0] !== 'all')
    query.set('userId', params.userId.join(','));
  if (params.category?.length && params.category[0] !== 'all')
    query.set('category', params.category.join(','));
  if (params.dateRangeOption && params.dateRangeOption !== 'all' && params.dateRangeOption !== 'custom')
    query.set('dateRangeOption', params.dateRangeOption);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  return apiClient.download(
    BASE,
    `/api/audit-logs/exportcsv?${query.toString()}`,
    'audit_logs.csv'
  );
};
