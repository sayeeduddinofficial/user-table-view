/**
 * profileApi.ts
 * All fetch calls for profile management
 */

import { apiClient, env } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export interface ProfileData {
  display_name: string;
  email: string;
  profile_image: string | null;
  time_zone: string | null;
  work_start_time: string | null;
  work_end_time: string | null;
}

export interface UpdateProfilePayload {
  displayName: string;
  imageBase64?: string;
}

export interface UpdateProfileResponse {
  data: {
    display_name: string;
    profile_image: string | null;
  };
}

export async function fetchProfileApi(): Promise<ProfileData> {
  const response = await apiClient.get<ApiResponse<ProfileData>>(
    env.userManagement,
    "/api/profile"
  );
  return response.data!;
}

export async function updateProfileApi(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
  const response = await apiClient.put<ApiResponse<UpdateProfileResponse["data"]>>(
    env.userManagement,
    "/api/profile/update",
    payload
  );
  return { data: response.data! };
}

export async function removeProfileImageApi(): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(
    env.userManagement,
    "/api/profile/remove-image"
  );
}