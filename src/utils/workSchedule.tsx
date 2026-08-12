/**
 * Work Schedule & Timezone Constants
 *
 * Phase 1: IST only.
 * To add more timezones in the future, append entries to TIMEZONES.
 * Shift selection is fully dynamic (hour + minute + AM/PM) — no fixed shift list.
 */

export interface TimezoneOption {
  value: string;
  label: string;
}

export const TIMEZONES: TimezoneOption[] = [
 { value: "Asia/Kolkata", label: "India (IST)" },

  { value: "America/New_York", label: "Eastern Time (EST)" },
  { value: "America/Chicago", label: "Central Time (CST)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },

  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Australia/Sydney", label: "Sydney Time (AEST/AEDT)" }
];

/** Hours shown in the dropdown: 1–12 */
export const HOURS: string[] = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);

/** Minutes shown in the dropdown */
export const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export const PERIODS: string[] = ["AM", "PM"];

/**
 * Converts 12-hour clock to "HH:MM" (24h).
 *   "09","00","AM" → "09:00"
 *   "12","00","AM" → "00:00"
 *   "12","00","PM" → "12:00"
 *   "05","30","PM" → "17:30"
 */
export function to24Hour(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
}

/**
 * Converts "HH:MM" (24h) to { hour, minute, period }.
 *   "09:00" → { hour:"09", minute:"00", period:"AM" }
 *   "17:30" → { hour:"05", minute:"30", period:"PM" }
 *   "00:00" → { hour:"12", minute:"00", period:"AM" }
 */
export function from24Hour(time24: string): { hour: string; minute: string; period: string } {
  const [hStr, mStr] = (time24 || "09:00").split(":");
  let h = parseInt(hStr, 10);
  const minute = mStr || "00";
  let period = "AM";

  if (h === 0) {
    h = 12;
    period = "AM";
  } else if (h === 12) {
    period = "PM";
  } else if (h > 12) {
    h -= 12;
    period = "PM";
  }

  return { hour: String(h).padStart(2, "0"), minute, period };
}

/**
 * Shift duration in minutes; handles overnight shifts.
 */
export function getShiftDurationMinutes(startTime24: string, endTime24: string): number {
  const [sh, sm] = startTime24.split(":").map(Number);
  const [eh, em] = endTime24.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins > startMins) return endMins - startMins;
  return 24 * 60 - startMins + endMins; // overnight
}

/**
 * Returns null if valid (>= 8 h), or an error string.
 */
export function validateShiftDuration(startTime24: string, endTime24: string): string | null {
  if (!startTime24 || !endTime24) return "Work start and end times are required";
  if (startTime24 === endTime24) return "Work start and end times cannot be the same";
  const duration = getShiftDurationMinutes(startTime24, endTime24);
  if (duration < 8 * 60 || duration > 10 * 60) {
    const hours = (duration / 60).toFixed(1);
    return `Shift duration should be between 8 and 10 hours. Current duration: ${hours} hrs`;
  }
  return null;
}

export const DEFAULT_SHIFT_BY_TIMEZONE: Record<string, { start: string; end: string }> = {
  "Asia/Kolkata": { start: "09:00", end: "18:00" },
  "Asia/Singapore": { start: "09:00", end: "18:00" },
  "Australia/Sydney": { start: "09:00", end: "18:00" },

  "America/New_York": { start: "08:00", end: "18:00" },
  "America/Chicago": { start: "08:00", end: "18:00" },
  "America/Denver": { start: "08:00", end: "18:00" },

  "America/Los_Angeles": { start: "09:00", end: "18:00" }
};

export const getTimeZoneAbbreviation = (timeZone?: string) => {
  if (!timeZone) return "";

  const timezone = TIMEZONES.find((tz) => tz.value === timeZone);

  if (!timezone) return timeZone;

  // Extract text inside parentheses
  const match = timezone.label.match(/\((.*?)\)/);

  return match ? match[1] : timezone.label;
};


export const formatTime = (time?: string) => {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  return new Date(0, 0, 0, hours, minutes).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
