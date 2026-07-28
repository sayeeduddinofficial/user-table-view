/**
 * useDashboard.ts
 * React Query hooks for Dashboard data management
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchAWSCountsApi,
  fetchAverageProvisionTimeApi,
  fetchActiveUsersApi,
  fetchProcessingRequestsCountApi,
  fetchCurrentUserApi,
  fetchDashboardOverviewApi,
  fetchRoleCountsApi,
  fetchServiceQuotasApi,
} from '@/components/dashboard/dashboardApi';
import { fetchAuditLogs } from '@/services/notificationApi';

const QUERY_KEYS = {
  awsCounts: ['awsCounts'] as const,
  averageProvisionTime: ['averageProvisionTime'] as const,
  activeUsers: ['activeUsers'] as const,
  processingRequests: ['processingRequests'] as const,
  currentUser: ['currentUser'] as const,
  dashboardOverview: ['dashboardOverview'] as const,
  roleCounts: ['roleCounts'] as const,
  recentActivity: ['dashboardRecentActivity'] as const,
  serviceQuotas: ['serviceQuotas'] as const,
};

// ── Fetch AWS Counts ─────────────────────────────────────────────────────────
export function useAWSCounts() {
  return useQuery({
    queryKey: QUERY_KEYS.awsCounts,
    queryFn: fetchAWSCountsApi,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 15_000, // 15 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ── Fetch Average Provision Time ─────────────────────────────────────────────
export function useAverageProvisionTime() {
  return useQuery({
    queryKey: QUERY_KEYS.averageProvisionTime,
    queryFn: fetchAverageProvisionTimeApi,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 30_000, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ── Fetch Active Users ───────────────────────────────────────────────────────
export function useActiveUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.activeUsers,
    queryFn: fetchActiveUsersApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 30_000, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ── Fetch Processing Requests Count ──────────────────────────────────────────
export function useProcessingRequestsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.processingRequests,
    queryFn: fetchProcessingRequestsCountApi,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 15_000, // 15 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ── Fetch Current User ───────────────────────────────────────────────────────
export function useCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEYS.currentUser,
    queryFn: fetchCurrentUserApi,
    staleTime: 0,
    refetchInterval: 15_000, // 15 seconds
    enabled: !!localStorage.getItem("token"),
  });
}

// ── Fetch Dashboard Overview ───────────────────────────────────────────────
export function useDashboardOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardOverview,
    queryFn: fetchDashboardOverviewApi,
    staleTime: 1000 * 15,
    refetchInterval: 15_000,
    gcTime: 1000 * 60 * 5,
  });
}

// ── Fetch Role Counts ────────────────────────────────────────────────────────
export function useRoleCounts() {
  return useQuery({
    queryKey: QUERY_KEYS.roleCounts,
    queryFn: fetchRoleCountsApi,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 15_000, // 15 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDashboardRecentActivity() {
  return useQuery({
    queryKey: QUERY_KEYS.recentActivity,
    queryFn: () => fetchAuditLogs({ page: 1 }),
    staleTime: 1000 * 15,
    refetchInterval: 15_000,
    gcTime: 1000 * 60 * 5,
  });
}

// ── Fetch Service Quotas ─────────────────────────────────────────────────────
export function useServiceQuotas() {
  return useQuery({
    queryKey: QUERY_KEYS.serviceQuotas,
    queryFn: fetchServiceQuotasApi,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 30_000, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!localStorage.getItem("token"),
  });
}