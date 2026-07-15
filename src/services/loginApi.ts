import { ApiError } from '@/lib/api';

const API_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:5001/auth-service';

// ── Types ──────────────────────────────────────────────────────────────────────

// export interface LocalLoginPayload {
//   email: string;
//   password: string;
// }

    // export interface LocalLoginResponse {
    //   token: string;
    // }

export interface MicrosoftLoginPayload {
  inviteToken: string | null;
  remindToken?: string | null;
}

export interface MicrosoftLoginResponse {
  token?: string;
  message?: string;
  error?: string;
}

export interface AuthTypeResponse {
  authType: 'entra' | 'local';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getClientIpHeader(): Promise<string> {
  try {
    const { getClientIp } = await import('@/utils/getClientIP');
    return (await getClientIp()) || '';
  } catch {
    return '';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || data?.error || 'Request failed';
    const code = data?.code || String(res.status);
    throw new ApiError(message, code, data);
  }
  return data as T;
}

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * POST /api/local/local-login
 * Authenticates a user with email + password.
 */
// export async function localLoginApi(payload: LocalLoginPayload): Promise<LocalLoginResponse> {
//   const clientIp = await getClientIpHeader();

//   const res = await fetch(`${API_BASE}/api/local/local-login`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-client-ip': clientIp,
//     },
//     body: JSON.stringify(payload),
//   });

//   return handleResponse<LocalLoginResponse>(res);
// }

/**
 * POST /api/auth/microsoft-login
 * Exchanges a Microsoft access token for a backend session JWT.
 */
export async function microsoftLoginApi(
  accessToken: string,
  payload: MicrosoftLoginPayload
): Promise<MicrosoftLoginResponse> {
  const clientIp = await getClientIpHeader();

  const res = await fetch(`${API_BASE}/api/auth/microsoft-login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-client-ip': clientIp,
    },
    body: JSON.stringify(payload),
  });

  // microsoft-login returns 200 even for rejected logins (backend puts error in body)
  // so we read the body and let callers decide
  return res.json() as Promise<MicrosoftLoginResponse>;
}

/**
 * GET /api/auth/auth-type?email=
 * Returns whether the email uses SSO (entra) or password (local) auth.
 */
export async function fetchAuthTypeApi(email: string): Promise<AuthTypeResponse> {
  const res = await fetch(
    `${API_BASE}/api/auth/auth-type?email=${encodeURIComponent(email)}`
  );
  return handleResponse<AuthTypeResponse>(res);
}

export { ApiError };