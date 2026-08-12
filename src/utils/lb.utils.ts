/**
 * lb.utils.ts
 * Pure validation/formatting helpers for the Load Balancer create flow.
 */

import { LB_NAME_REGEX } from "@/components/load-balancers/lbCreate.constants";

export function validateLbName(value: string): string | null {
  if (!value) return "Load balancer name is required.";
  if (value.length > 32) return "Load balancer name must be 32 characters or fewer.";
  if (!LB_NAME_REGEX.test(value)) return "Only letters, numbers, and hyphens are allowed.";
  if (value.startsWith("-") || value.endsWith("-")) return "Name can't start or end with a hyphen.";
  if (value.includes("--")) return "Name can't contain consecutive hyphens.";
  return null;
}

export function sanitizePort(raw: string): string {
  const digitsOnly = raw.replace(/[^0-9]/g, ""); // strip non-digits
  const noLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, ""); // "05" -> "5", "008" -> "8"
  return noLeadingZeros;
}

export function sanitizeStatusCode(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 3);
}

export function isValidStatusCode(code: string): boolean {
  return /^[245]\d\d$/.test(code);
}
