import type { AwsConnectionStatus } from "@/types/api";

export function getAwsStatusStyles(status: AwsConnectionStatus | undefined): string {
  switch (status) {
    case "CONNECTED":
      return "border-green-500 text-green-600";
    case "NOT_CONNECTED":
      return "border-red-500 text-red-600";
    case "CONNECTION_UNAVAILABLE":
      return "";
    default:
      return "border-muted text-muted-foreground";
  }
}

export function formatAwsStatus(status?: AwsConnectionStatus): string {
  if (!status) return "Unknown";
  if (status === "CONNECTED") {
    return status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Disconnected";
}