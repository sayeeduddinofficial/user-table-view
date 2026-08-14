/**
 * auditUtils.ts
 * Pure helpers for the Audit Logs screen.
 */

import { format } from "date-fns";
import { SERVICE_BADGE_CONFIG, type ServiceBadgeConfig } from "./auditConstants";

export const DATE_RANGE_LABELS: Record<string, string> = {
  last7days: "Last 7 days",
  last30days: "Last 30 days",
  lastMonth: "Last month",
  last3months: "Last 3 months",
  last6months: "Last 6 months",
  thisYear: "This year",
};

/** Merges duplicate AWS services (e.g. the two EC2 services) into one chip. */
export const getUniqueAwsServices = (): Array<[string, ServiceBadgeConfig]> => {
  const seen = new Set<string>();

  return Object.entries(SERVICE_BADGE_CONFIG).reduce<Array<[string, ServiceBadgeConfig]>>(
    (unique, [key, config]) => {
      if (!seen.has(config.shortName)) {
        seen.add(config.shortName);
        unique.push([key, config]);
      }
      return unique;
    },
    [],
  );
};

export const getDateRangeDisplay = (
  dateRangeOption: string,
  dateRange: { from?: Date; to?: Date },
): string => {
  if (dateRangeOption === "custom" && dateRange.from && dateRange.to) {
    return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
  }

  return DATE_RANGE_LABELS[dateRangeOption] ?? format(new Date(), "MMMM yyyy");
};

export const formatTimestamp = (timestamp: string): string =>
  new Date(timestamp).toLocaleString("sv-SE").replace("T", " ");

export const formatIpAddress = (ip?: string | null): string => ip || "—";

/** Builds the inclusive list of days between a range start and the hovered day. */
export const getHoverRangeDays = (start: Date, end: Date): Date[] => {
  const isForward = end >= start;
  const minDate = isForward ? start : end;
  const maxDate = isForward ? end : start;

  const days: Date[] = [];
  const current = new Date(minDate);
  current.setDate(current.getDate() + 1);

  while (current < maxDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

export const toApiDate = (date?: Date): string | undefined =>
  date ? format(date, "yyyy-MM-dd") : undefined;