export const authSessionConfig = {
  inactivityTimeoutMs: Number(import.meta.env.VITE_AUTH_INACTIVITY_TIMEOUT_MS ?? 10 * 60 * 60 * 1000),
  maxSessionDurationMs: Number(import.meta.env.VITE_AUTH_MAX_SESSION_DURATION_MS ?? 10 * 60 * 60 * 1000),
  refreshLeadTimeMs: Number(import.meta.env.VITE_AUTH_REFRESH_LEAD_TIME_MS ?? 5 * 1000),
};
