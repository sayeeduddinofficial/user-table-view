import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSetting } from "@/services/settingsApi";
import type { SystemSettings } from "@/types/api";
import { useDialog } from "../components/ui/dialog-context";

export const useSystemSettings = () => {
  const { alert } = useDialog();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSystemSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      key,
      value,
    }: {
      key: keyof SystemSettings;
      value: { enabled: boolean };
    }) => updateSystemSetting(key, value),

    onMutate: async ({ key, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["system-settings"] });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<SystemSettings>([
        "system-settings",
      ]);

      // Optimistically update
      queryClient.setQueryData<SystemSettings>(["system-settings"], (old) => ({
        ...old!,
        [key]: value,
      }));

      return { previousSettings };
    },

    onError: (err: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(["system-settings"], context.previousSettings);
      }

      alert({
        title: "Update Failed",
        description: err.message,
        severity: "error",
      });
    },

    onSuccess: (_, { key, value }) => {
      const displayName = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const status = value.enabled ? "enabled" : "disabled";
      alert({
        title: "Settings Updated",
        description: `${displayName} ${status} updated successfully`,
        severity: "success",
      });
    },

    onSettled: () => {
      // Refetch to ensure sync with backend
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSetting: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
