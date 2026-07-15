export function parseBackendTimestamp(value: string | Date | null | undefined): Date {
  if (!value) {
    return new Date(NaN);
  }

  if (value instanceof Date) {
    return value;
  }

  let normalized = value.trim();

  // Normalize common separator format from PostgreSQL if needed
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(" ", "T");
  }

  // If the string has no timezone, assume UTC
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized += "Z";
  }

  return new Date(normalized);
}
