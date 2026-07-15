import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { env } from "@/lib/env";
import { useDialog } from "@/components/ui/dialog-context";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { ApiError } from "@/lib/api";

export function useTerraformBackend(canView: boolean) {
  const { alert, confirm }              = useDialog();
  const { data: awsConfig }             = useAwsConfig();
  const [backendType, setBackendType]   = useState("s3");
  const [bucketName, setBucketName]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const API_BASE                        = env.vmRequest;

  useEffect(() => {
    if (!canView) return;

    const fetchTerraformBackend = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<{
          status: string;
          data: {
            backend_type: string;
            bucket_name: string;
            region: string;
          };
        }>(API_BASE, "/api/vms/settings/terraform-backend");

        const data = response.data;
        setBackendType(data.backend_type || "s3");
        setBucketName(data.bucket_name || "");
      } catch(error) {
       if (error instanceof ApiError) {
    alert({
      title: error.message,
      severity: "error",
    });
  } else {
    alert({
      title: "Network error while updating Terraform backend",
      severity: "error",
    });
}
      } finally {
        setLoading(false);
      }
    };

    fetchTerraformBackend();
  }, [canView]); // ← was [isAdmin] before — now correctly tracks the right dep

  const save = async () => {
    if (!bucketName) {
      alert({ title: "Bucket name is required", severity: "error" });
      return;
    }

    const confirmed = await confirm({
      title: "Update Terraform Backend",
      description: `Are you sure you want to change the Terraform state bucket to ${bucketName}?`,
      icon: "info",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      await apiClient.post(API_BASE, "/api/vms/settings/terraform-backend", {
        backendType,
        bucketName,
        region: awsConfig?.region,
      });

      alert({
        title: "Terraform backend updated. New requests will use the new configuration.",
        severity: "success",
      });
    } catch(error) {
       if (error instanceof ApiError) {
    alert({
      title: error.message,
      severity: "error",
    });
  } else {
    alert({
      title: "Network error while updating Terraform backend",
      severity: "error",
    });
  }
    } finally {
      setSaving(false);
    }
  };

  return {
    backendType,
    bucketName,
    setBucketName,
    loading,
    saving,
    save,
  };
}