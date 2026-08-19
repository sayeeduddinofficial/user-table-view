/**
 * dashboardUtils.ts
 * Pure helpers for the Dashboard screen.
 */

import { EC2Icon } from "@/components/icons/aws-icons";
import {
  DEFAULT_SERVICE_COLOR,
  DEFAULT_STATUS_CONFIG,
  REQUEST_STATUS_CONFIG,
  SERVICE_COLORS,
  SERVICE_ICON_MAP,
  STAKEHOLDER_ROLE,
  type RequestStatusConfig,
} from "./dashboardConstants";

export const getServiceIcon = (service?: string) =>
  SERVICE_ICON_MAP[service?.toLowerCase() as keyof typeof SERVICE_ICON_MAP] ?? EC2Icon;

export const getServiceColor = (label?: string, service?: string): string =>
  SERVICE_COLORS[label ?? ""] ?? SERVICE_COLORS[service ?? ""] ?? DEFAULT_SERVICE_COLOR;

export const getStatusConfig = (status?: string): RequestStatusConfig =>
  REQUEST_STATUS_CONFIG[status ?? ""] ?? DEFAULT_STATUS_CONFIG;

/** Falls back to a capitalised raw status when the status is unknown. */
export const getStatusLabel = (status?: string): string =>
  REQUEST_STATUS_CONFIG[status ?? ""]?.label ??
  (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown");

export const isStakeholderRole = (role?: string): boolean => role === STAKEHOLDER_ROLE;

/** Percentage of the largest value in a set, floored so tiny bars stay visible. */
export const getBarPercentage = (value: number, max: number, minPercent = 2): number =>
  Math.max((value / Math.max(max, 1)) * 100, minPercent);