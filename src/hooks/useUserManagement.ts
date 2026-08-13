/**
 * useUserManagement.ts
 * React Query hooks for user management with automatic caching and refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '@/components/ui/dialog-context';
import { useAuth } from '@/hooks/useLogin';
import { ApiError } from '@/lib/api';
import {
  fetchUsersApi,
  updateUserApi,
  type UpdateUserPayload,
} from '@/components/users/userManagementApi';

const QUERY_KEYS = {
  users: ['users'] as const,
};

// ── Fetch Users ──────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: fetchUsersApi,
    staleTime: 15_000, // Consider data fresh for 15 seconds
    refetchInterval: 15_000, // Auto-refetch every 15 seconds
  });
}

// ── Update User ──────────────────────────────────────────────────────────────
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { alert } = useDialog();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) =>
      updateUserApi(userId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      await refreshUser();
      alert({ title: "User updated successfully", severity: "success" });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const msg = err.details?.invalidGiven && err.details?.allowedOnly
          ? `Invalid instance types: ${err.details.invalidGiven.join(", ")}\nAllowed: ${err.details.allowedOnly.join(", ")}`
          : err.message || "Failed to update user";
        alert({ title: msg, severity: "error" });
      } else {
        alert({ title: "Failed to update user", severity: "error" });
      }
    },
  });
}
