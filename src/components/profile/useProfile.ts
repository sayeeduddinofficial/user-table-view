/**
 * useProfile.ts
 * Encapsulates profile fetching and update operations
 */

import { useState, useEffect, useCallback } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import { useAuth } from "@/hooks/useLogin";
import { useAppStore } from "@/store/appStore";
import {
  fetchProfileApi,
  updateProfileApi,
  removeProfileImageApi,
  type ProfileData,
  type UpdateProfilePayload,
} from "./profileApi";

export function useProfile() {
  const { alert } = useDialog();
  const { refreshUser } = useAuth();
  const { refreshCurrentUser } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchProfileApi();
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload, isImageRemoved: boolean): Promise<boolean> => {
      setLoading(true);
      try {
        if (isImageRemoved) {
          await removeProfileImageApi();
        }

        const data = await updateProfileApi(payload);

        setProfile((prev) => ({
          ...prev!,
          display_name: data.data.display_name,
          profile_image: isImageRemoved ? null : data.data.profile_image,
        }));

        await refreshUser();
        await refreshCurrentUser();

        alert({ title: "Profile updated successfully", severity: "success" });
        return true;
      } catch (err) {
        const error = err as Error;
        alert({ title: error?.message || "Failed to update profile", severity: "error" });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshUser, refreshCurrentUser, alert]
  );

  return { profile, loading, updateProfile };
}
