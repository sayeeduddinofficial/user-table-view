import axios from "axios";
import { env } from "@/lib/env";
import { useAppStore } from "../store/appStore";

function dispatchAuthLogout(reason: string) {
  localStorage.removeItem('token');
  localStorage.removeItem('clientIp');
  sessionStorage.setItem('logout_reason', reason);
  window.dispatchEvent(new Event('auth:unauthorized'));
}

let refreshPromise: Promise<string> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  // Prevent multiple concurrent refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return null;

      const response = await axios.post(
        `${env.auth}/api/auth/refresh-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );

      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error: any) {
      console.error('[refreshAuthToken] Failed:', error.response?.data?.message || error.message);
      dispatchAuthLogout('SESSION_EXPIRED');
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getCurrentUser(accessToken: string) {
  try {
    const response = await axios.get(
      `${env.auth}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching current user:", error);
    throw error;
  }
}

let interceptorAttached = false;
let cachedClientIp: string | null = null;
let ipCacheTimestamp = 0;
const IP_CACHE_DURATION = 5 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const now = Date.now();
  if (cachedClientIp && (now - ipCacheTimestamp) < IP_CACHE_DURATION) return cachedClientIp;

  const storedIp = localStorage.getItem('clientIp');
  if (storedIp) {
    cachedClientIp = storedIp;
    ipCacheTimestamp = now;
    return storedIp;
  }

  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    cachedClientIp = data.ip || '';
    ipCacheTimestamp = now;
    return cachedClientIp ?? '';
  } catch {
    return cachedClientIp || '';
  }
}
if (!interceptorAttached) {
  axios.interceptors.request.use(async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    const ip = await getClientIp();
    if (ip) {
      config.headers.set("x-client-ip", ip);
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;

      // ROLE_CHANGED — logout only on non-/me endpoints (user-initiated or polling API calls)
      const isMeEndpoint = error.config?.url?.includes('/api/auth/me');
      if (error.response?.status === 401 && error.response?.data?.code === 'ROLE_CHANGED' && !isMeEndpoint) {
        dispatchAuthLogout('ROLE_CHANGED');
        return Promise.reject(error);
      }

      const isAuthExpiredError = error.response?.status === 401 && (
        error.response?.data?.code === 'TOKEN_EXPIRED_BUT_ACTIVE' ||
        error.response?.data?.code === 'TOKEN_EXPIRED' ||
        error.response?.data?.code === 'UNAUTHORIZED' ||
        error.response?.data?.code === 'INVALID_TOKEN'
      );

      // Token expired but user was active — refresh and retry
      if (isAuthExpiredError && error.response?.data?.code === 'TOKEN_EXPIRED_BUT_ACTIVE' && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        const newToken = await refreshAuthToken();
        if (newToken) {
          const retryConfig = {
            ...originalRequest,
            headers: {
              ...originalRequest.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };

          if (axios.defaults.headers.common) {
            axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          }

          return axios(retryConfig);
        }
      }

      if (isAuthExpiredError) {
        dispatchAuthLogout('SESSION_EXPIRED');
        return Promise.reject(error);
      }
      
      if (
        error.response?.status === 403 &&
        originalRequest?.url && !originalRequest.url.includes("/api/auth/me")
      ) {
        const { refreshCurrentUser } = useAppStore.getState();
        await refreshCurrentUser();
      }
      
      return Promise.reject(error);
    }
  );

  interceptorAttached = true;
}

