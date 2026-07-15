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
  // createUserApi,
  updateUserApi,
  // deleteUserApi,
  // reinviteUserApi,
  // setUserActiveApi,
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

// ── Create User ──────────────────────────────────────────────────────────────
// export function useCreateUser() {
//   const queryClient = useQueryClient();
//   const { alert } = useDialog();
//   const { refreshUser } = useAuth();

//   return useMutation({
//     mutationFn: createUserApi,
//     onSuccess: async (response) => {
//       await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
//       await refreshUser();
//       alert({
//         title: response.data?.emailSent
//           ? (response.message || "User created successfully")
//           : "User created but invitation email failed to send",
//         severity: response.data?.emailSent ? "success" : "warning",
//       });
//     },
//     onError: (err) => {
//       if (err instanceof ApiError) {
//         const msg = err.details?.invalidGiven && err.details?.allowedOnly
//           ? `Invalid instance types: ${err.details.invalidGiven.join(", ")}\nAllowed: ${err.details.allowedOnly.join(", ")}`
//           : err.message || "Failed to create user";
//         alert({ title: msg, severity: "error" });
//       } else {
//         alert({ title: "Failed to create user", severity: "error" });
//       }
//     },
//   });
// }

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

// ── Delete User ──────────────────────────────────────────────────────────────
// export function useDeleteUser() {
//   const queryClient = useQueryClient();
//   const { alert } = useDialog();

//   return useMutation({
//     mutationFn: deleteUserApi,
//     onSuccess: async () => {
//       await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
//       alert({ title: "User deleted", severity: "success" });
//     },
//     onError: (err) => {
//       const msg = err instanceof ApiError ? err.message : "Failed to delete user";
//       alert({ title: msg, severity: "error" });
//     },
//   });
// }

// ── Reinvite User ────────────────────────────────────────────────────────────
// export function useReinviteUser() {
//   const { alert } = useDialog();

//   return useMutation({
//     mutationFn: reinviteUserApi,
//     onSuccess: (data) => {
//       alert({
//         title: data.message || "Reinvitation email sent",
//         severity: data.emailSent ? "success" : "warning",
//       });
//     },
//     onError: (err) => {
//       const msg = err instanceof ApiError ? err.message : "Failed to send reinvitation";
//       alert({ title: msg, severity: "error" });
//     },
//   });
// }

// ── Toggle User Active ───────────────────────────────────────────────────────
// export function useToggleUserActive() {
//   const queryClient = useQueryClient();
//   const { alert } = useDialog();

//   return useMutation({
//     mutationFn: ({ entraObjectId, action }: { entraObjectId: string; action: "deactivate" | "reactivate" }) =>
//       setUserActiveApi(entraObjectId, action),
//     onSuccess: async (_, variables) => {
//       await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
//       alert({
//         title: variables.action === "deactivate" ? "User deactivated" : "User reactivated",
//         severity: "success",
//       });
//     },
//     onError: (_, variables) => {
//       alert({
//         title: `Failed to ${variables.action} user`,
//         severity: "error",
//       });
//     },
//   });
// }