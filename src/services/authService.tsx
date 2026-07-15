import axios from "axios";
import { env } from "@/lib/env";
import { useAppStore } from "../store/appStore";

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
      console.log('[refreshAuthToken] Token refreshed successfully');
      return newToken;
    } catch (error: any) {
      console.error('[refreshAuthToken] Failed:', error.response?.data?.message || error.message);
      // If refresh fails, remove invalid token
      localStorage.removeItem('token');
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getCurrentUser(accessToken: string) {
  try {
    console.log("Fetching current user with token from:", env.auth);
    const response = await axios.get(
      `${env.auth}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    console.log("User fetched successfully:", response.data);
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
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const ip = await getClientIp();
    if (ip && config.headers) {
      config.headers['x-client-ip'] = ip;
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
        localStorage.removeItem('token');
        sessionStorage.setItem('logout_reason', 'ROLE_CHANGED');
        window.location.replace('/login');
        return Promise.reject(error);
      }

      // Token expired but user was active — refresh and retry
      if (
        error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED_BUT_ACTIVE' &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        
        const newToken = await refreshAuthToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      }
      
      if (
        error.response?.status === 403 &&
        !error.config.url.includes("/api/auth/me")
      ) {
        const { refreshCurrentUser } = useAppStore.getState();
        await refreshCurrentUser();
      }
      
      return Promise.reject(error);
    }
  );

  interceptorAttached = true;
}

