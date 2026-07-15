/**
 * userManagementApi.ts
 * All fetch calls for user management — import from here, not inline in components.
 */

import { apiClient, env } from "@/lib/api";
import type { User, CategoryType } from "@/types";
import type {
  RawUserApiResponse,
  ApiResponse,
  // CreateUserResponse,
  UpdateUserResponse,
  DeleteUserResponse,
  // ReinviteUserResponse,
  ToggleUserActiveResponse,
} from "@/types/api";
import type { Role } from "@/types/index";

// ── Normalize raw API user → frontend User ──────────────────────────────────
export function normalizeUser(u: RawUserApiResponse): User {
  // Ensure allowedCategories is an array of numbers
  let categories: CategoryType[] = [1];
  if (u.allowed_categories) {
    if (typeof u.allowed_categories === 'string') {
      try {
        categories = JSON.parse(u.allowed_categories) as CategoryType[];
      } catch {
        categories = [1];
      }
    } else if (Array.isArray(u.allowed_categories)) {
      categories = u.allowed_categories.map(c => Number(c)) as CategoryType[];
    }
  }

  // Type guard for role
  const validRoles: Role[] = ['SuperAdmin', 'SplunkOps.Admin', 'SplunkOps.User'];
  const role: Role = validRoles.includes(u.role as Role) ? (u.role as Role) : 'SplunkOps.User';

  // Type guard for status
  const validStatuses = ['ACTIVE', 'DEACTIVATED', 'INVITED'] as const;
  const status = validStatuses.includes(u.status as typeof validStatuses[number]) 
    ? (u.status as typeof validStatuses[number]) 
    : 'ACTIVE';

  return {
    id: String(u.id),
    entraObjectId: u.entra_object_id || String(u.id),
    name: u.display_name || u.email?.split("@")[0] || "User",
    email: u.email,
    role,
    status,
    maxVMs: u.max_vms,
    profile_image_url: u.profile_image,
    activeVMs: u.current_vms ?? 0,
    provisioningVMs: u.provisioning_vms ?? 0,
    currentVMs: u.current_vms ?? 0,
    allowedInstanceTypes: u.allowed_instance_types ?? [],
    allowedCategories: categories,
    timeZone: u.time_zone ?? "",
    workStartTime: u.work_start_time ?? "",
    workEndTime: u.work_end_time ?? "",
    createdAt: new Date(u.created_at),
    lastActive: new Date(),
  };
}

// ── Fetch all users ──────────────────────────────────────────────────────────
export async function fetchUsersApi(): Promise<User[]> {
  const response = await apiClient.get<ApiResponse<RawUserApiResponse[]>>(
    env.userManagement,
    "/api/users/users"
  );
  const users = Array.isArray(response.data) ? response.data : [];
  return users.map(normalizeUser);
}

// ── Create user ──────────────────────────────────────────────────────────────
  // export interface CreateUserPayload {
  //   displayName: string;
  //   email: string;
  //   entraObjectId?: string;
  //   role: string;
  //   maxVMs: number;
  //   allowedInstanceTypes: string[];
  //   allowedCategories: number[];
  //   timeZone: string;
  //   workStartTime: string;
  //   workEndTime: string;
  // }

// export async function createUserApi(payload: CreateUserPayload): Promise<CreateUserResponse> {
//   return apiClient.post<CreateUserResponse>(
//     env.userManagement,
//     "/api/users/users",
//     payload
//   );
// }

// ── Update user ──────────────────────────────────────────────────────────────
export interface UpdateUserPayload {
  displayName?: string;
  role?: string;
  maxVMs?: number;
  allowedInstanceTypes?: string[];
  allowedCategories?: number[];
  adminEmail?: string;
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
}

export async function updateUserApi(userId: string, payload: UpdateUserPayload): Promise<UpdateUserResponse> {
  return apiClient.patch<UpdateUserResponse>(
    env.userManagement,
    `/api/users/users/${userId}`,
    payload
  );
}

// ── Delete user ──────────────────────────────────────────────────────────────
// export async function deleteUserApi(userId: string): Promise<DeleteUserResponse> {
//   return apiClient.delete<DeleteUserResponse>(
//     env.userManagement,
//     `/api/users/users/${userId}`
//   );
// }

// ── Reinvite user ────────────────────────────────────────────────────────────
// export async function reinviteUserApi(userId: string): Promise<ReinviteUserResponse> {
//   const response = await apiClient.post<ApiResponse<{ emailSent: boolean }>>(
//     env.userManagement,
//     `/api/users/users/${userId}/reinvite`
//   );
  
//   return {
//     success: true,
//     message: response.message || "Reinvitation email sent",
//     emailSent: response.data?.emailSent ?? false,
//   };
// }

// ── Deactivate / Reactivate ──────────────────────────────────────────────────
// export async function setUserActiveApi(
//   entraObjectId: string,
//   action: "deactivate" | "reactivate",
// ): Promise<ToggleUserActiveResponse> {
//   return apiClient.post<ToggleUserActiveResponse>(
//     env.userManagement,
//     `/api/users/users/${entraObjectId}/${action}`
//   );
// }