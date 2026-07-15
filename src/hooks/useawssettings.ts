import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { saveAwsConfig } from "@/services/settingsApi";
import { ApiError } from "@/lib/api";
import type { SaveAwsSettingsRequest } from "@/types/api";

type FieldErrors = {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};

function validate(
  accessKeyId: string,
  secretKey: string,
  region: string
): FieldErrors {
  const errors: FieldErrors = {};

  if (!accessKeyId) {
    errors.accessKeyId = "Access Key ID is required";
  } else if (accessKeyId.length < 16) {
    errors.accessKeyId = "Access Key ID must be at least 16 characters";
  } else if (!/^[A-Z0-9]+$/.test(accessKeyId)) {
    errors.accessKeyId =
      "Access Key ID must contain only uppercase letters and numbers";
  }

  if (!secretKey) {
    errors.secretAccessKey = "Secret Access Key is required";
  } else if (secretKey.length < 40) {
    errors.secretAccessKey = "Secret Access Key must be at least 40 characters";
  }

  if (!region) {
    errors.region = "Region is required";
  } else if (!/^[a-z]+-[a-z]+-\d$/.test(region)) {
    errors.region = "Invalid region format (e.g., us-east-1)";
  }

  return errors;
}

export function useAwsSettings() {
  const queryClient                   = useQueryClient();
  const { data: awsConfig, isLoading } = useAwsConfig();

  const [editMode, setEditMode]       = useState(false);
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretKey, setSecretKey]     = useState("");
  const [region, setRegion]           = useState("");
  const [amiId, setAmiId]             = useState("");
  const [awsError, setAwsError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const startEdit = () => {
    setAccessKeyId("");
    setSecretKey("");
    setRegion(awsConfig?.region ?? "");
    setAmiId(awsConfig?.amiId ?? "");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setFieldErrors({});
    setAwsError(null);
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const save = async (): Promise<boolean> => {
    setAwsError(null);
    setFieldErrors({});

    const errors = validate(accessKeyId, secretKey, region);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    try {
      const payload: SaveAwsSettingsRequest = {
        accessKeyId,
        secretAccessKey: secretKey,
        region,
        amiId,
      };

      const data = await saveAwsConfig(payload);

      if (data.status === "CONNECTED") {
        queryClient.setQueryData(["aws-config"], {
          accessKeyId: accessKeyId.replace(/^(.{4}).*/, "$1****"),
          secretKey: secretKey.replace(/^(.{4}).*/, "$1****"),
          region,
          amiId,
          status: "CONNECTED",
        });
      }

      setEditMode(false);
      setSecretKey("");
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        // Field-level errors from backend
        if (error.details && typeof error.details === "object") {
          const backendErrors: FieldErrors = {};
          const details = error.details as Record<string, string[]>;
          if (details.accessKeyId)
            backendErrors.accessKeyId = details.accessKeyId[0];
          if (details.secretAccessKey)
            backendErrors.secretAccessKey = details.secretAccessKey[0];
          if (details.region)
            backendErrors.region = details.region[0];

          if (Object.keys(backendErrors).length > 0) {
            setFieldErrors(backendErrors);
            return false;
          }
        }
        setAwsError(error.message);
      } else {
        setAwsError("Failed to save AWS credentials. Please try again.");
      }
      return false;
    }
  };

  return {
    editMode,
    accessKeyId,
    secretKey,
    region,
    amiId,
    awsError,
    fieldErrors,
    awsConfig,
    isLoading,
    setAccessKeyId,
    setSecretKey,
    setRegion,
    clearFieldError,
    startEdit,
    cancelEdit,
    save,
  };
}