import type { EksCondition } from "./eksTypes";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Human readable "x minutes ago" style label for an ISO date string. */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < MINUTE) return `${seconds} seconds ago`;
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)} minutes ago`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)} hours ago`;
  return `${Math.floor(seconds / DAY)} days ago`;
}

/** "Standard until August 2, 2027" from the raw support fields. */
export function formatSupportPeriod(
  supportType: string | null | undefined,
  supportUntil: string | null | undefined,
): string {
  const type = supportType
    ? supportType.charAt(0).toUpperCase() + supportType.slice(1).toLowerCase()
    : "—";

  if (!supportUntil) return type;

  const date = new Date(supportUntil);
  if (Number.isNaN(date.getTime())) return type;

  return `${type} until ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

/** Semantic text colour for a cluster/node status value. */
export function getStatusToneClass(status?: string | null): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
    case "READY":
      return "text-success";
    case "PENDING":
    case "CREATING":
    case "UPDATING":
      return "text-primary";
    case "FAILED":
    case "DELETE_FAILED":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function findCondition(
  conditions: EksCondition[] | undefined,
  type: string,
): EksCondition | undefined {
  return conditions?.find((condition) => condition.type === type);
}

export function isConditionReady(condition?: EksCondition): boolean {
  return condition?.status === "True";
}

export function formatMetric(value: unknown): string {
  return value === null || value === undefined ? "—" : String(value);
}