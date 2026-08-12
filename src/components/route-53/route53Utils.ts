import type { Route53RecordItem } from "@/services/route53Api";
import type { HostedZone } from "./route53Types";

const RECORD_NAME_PATTERN =
  /^[A-Za-z0-9*]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

/** Loose shape check used while the user is still typing an IPv4 address. */
export function isIPv4Address(value: string): boolean {
  return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value.trim());
}

/** Strict IPv4 validation: 4 octets, 0-255, no leading zeros. */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const octet = Number(part);
    return octet >= 0 && octet <= 255 && String(octet) === part;
  });
}

export function findInvalidIPv4s(values: string[]): string[] {
  return values.filter((value) => !isValidIPv4(value));
}

/** Human-readable reason why an IPv4 entry is invalid. */
export function ipv4Reason(ip: string): string {
  if (/[^\d.]/.test(ip)) return "only digits and dots are allowed";
  const parts = ip.split(".");
  if (parts.length !== 4) return "must have 4 octets (e.g. 3.17.183.49)";
  if (parts.some((part) => part === "")) return "each octet must have a value";
  if (parts.some((part) => Number(part) > 255))
    return "each octet must be between 0 and 255";
  if (parts.some((part) => part.length > 1 && part.startsWith("0")))
    return "octets cannot have leading zeros";
  return "is not a valid IPv4 address";
}

export function ipv4ErrorMessage(invalid: string[]): string {
  return invalid.map((ip) => `'${ip}' — ${ipv4Reason(ip)}`).join("; ");
}

/** Keep only characters valid in a newline-separated list of IPv4 addresses. */
export function sanitizeIPv4Input(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/[^\d.]/g, ""))
    .join("\n");
}

export function parseValueEntries(raw: string): string[] {
  return raw
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) duplicates.add(value);
    seen.add(key);
  }
  return Array.from(duplicates);
}

export function isValidRecordName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "@") return true;
  return RECORD_NAME_PATTERN.test(trimmed);
}

export function validateRecordNameField(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Record name is required.";
  if (!isValidRecordName(trimmed))
    return "Record name can only contain letters, numbers, hyphens, and periods.";
  return "";
}

/** Display value for a record: alias target, joined value list, or the raw value. */
export function formatRecordValue(record: Route53RecordItem): string {
  if (record.is_alias) return record.alias_dns_name ?? "-";
  if (!record.value) return "-";
  try {
    const parsed = JSON.parse(record.value);
    if (Array.isArray(parsed)) return parsed.join("\n");
  } catch {
    // not JSON — plain string value
  }
  return record.value;
}

/** True when a non-alias record points at one or more IPv4 addresses. */
export function recordHasIPv4Value(record: Route53RecordItem): boolean {
  if (record.is_alias || !record.value) return false;
  try {
    const parsed = JSON.parse(record.value);
    if (Array.isArray(parsed)) {
      return parsed.some((value) => isIPv4Address(String(value)));
    }
  } catch {
    // plain string value
  }
  return isIPv4Address(record.value);
}

export function countRecordsInZone(
  records: Route53RecordItem[],
  zoneName: string,
): number {
  return records.filter((record) => record.hosted_zone_name === zoneName)
    .length;
}

export function filterHostedZones(
  zones: HostedZone[],
  search: string,
): HostedZone[] {
  const query = search.trim().toLowerCase();
  if (!query) return zones;
  return zones.filter((zone) =>
    [zone.name, zone.type, zone.id, zone.createdBy].some((field) =>
      field.toLowerCase().includes(query),
    ),
  );
}

export function filterRecords(
  records: Route53RecordItem[],
  search: string,
): Route53RecordItem[] {
  const query = search.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) =>
    [
      record.record_name,
      record.request_id,
      record.record_type,
      record.routing_policy,
      record.is_alias ? "yes" : "no",
      formatRecordValue(record),
    ].some((field) => (field ?? "").toLowerCase().includes(query)),
  );
}
