import axios from 'axios';
import { env } from './env';
import { refreshTokenApi } from '@/services/tokenApi';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: {
      invalidGiven?: string[];
      allowedOnly?: string[];
      [key: string]: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Cache client IP for 5 minutes
let cachedClientIp: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getClientIp(): Promise<string> {
  const now = Date.now();
  
  // Return cached IP if still valid
  if (cachedClientIp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedClientIp;
  }

  const storedIp = localStorage.getItem('clientIp');
  if (storedIp) {
    cachedClientIp = storedIp;
    cacheTimestamp = now;
    return storedIp;
  }

  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    cachedClientIp = data.ip || "";
    cacheTimestamp = now;
    return cachedClientIp ?? "";
  } catch {
    return cachedClientIp || ""; // Return cached or empty string
  }
}

class ApiClient {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const token = localStorage.getItem('token');
    const clientIp = await getClientIp();
    
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-client-ip': clientIp,
    };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return this.getAuthHeader();
  }

  private parseErrorDetails(details: unknown): ApiError['details'] {
    if (!details || typeof details !== 'object') {
      return undefined;
    }

    const detailsObj = details as Record<string, unknown>;
    return {
      invalidGiven: Array.isArray(detailsObj.invalidGiven) ? detailsObj.invalidGiven as string[] : undefined,
      allowedOnly: Array.isArray(detailsObj.allowedOnly) ? detailsObj.allowedOnly as string[] : undefined,
      ...detailsObj,
    };
  }

  private async handleAxiosError(
    error: any,
    retry: () => Promise<any>,
  ): Promise<any> {
    const res = error.response;

    if (res?.status === 401 && res?.data?.code === "TOKEN_EXPIRED_BUT_ACTIVE") {
      const token = await this.refreshAccessToken();

      if (token) {
        return retry();
      }
    }

    if (res?.data) {
      throw new ApiError(
        res.status,
        res.data.code || "API_ERROR",
        res.data.error || res.data.message || "Request failed",
        this.parseErrorDetails(res.data.details),
      );
    }

    throw new ApiError(
      error.response?.status || 0,
      "NETWORK_ERROR",
      error.message || "Network error",
    );
  }

  async get<T>(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.get<T>(`${baseUrl}${path}`, {
        params,
        headers,
      });

      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.get<T>(`${baseUrl}${path}`, {
          params,
          headers,
        });

        return response.data;
      });
    }
  }

  async post<T>(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.post<T>(`${baseUrl}${path}`, params, {
        headers,
      });

      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.post<T>(`${baseUrl}${path}`, params, {
          headers,
        });

        return response.data;
      });
    }
  }

  async patch<T>(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.patch<T>(`${baseUrl}${path}`, params, {
        headers,
      });

      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.patch<T>(`${baseUrl}${path}`, params, {
          headers,
        });

        return response.data;
      });
    }
  }

  async put<T>(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.put<T>(`${baseUrl}${path}`, params, {
        headers,
      });

      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.put<T>(`${baseUrl}${path}`, params, {
          headers,
        });

        return response.data;
      });
    }
  }

  async delete<T>(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.delete<T>(`${baseUrl}${path}`, {
        params,
        headers,
      });

      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.delete<T>(`${baseUrl}${path}`, {
          params,
          headers,
        });

        return response.data;
      });
    }
  }

  async download(
    baseUrl: string,
    path: string,
    fileName: string,
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeader();
      const response = await axios.get(`${baseUrl}${path}`, {
        responseType: "blob",
        headers,
      });
      const blobUrl = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      return this.handleAxiosError(error, async () => {
        const headers = await this.getAuthHeader();

        const response = await axios.get(`${baseUrl}${path}`, {
          responseType: "blob",
          headers,
        });

        const blobUrl = URL.createObjectURL(response.data);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
    }
  }

  private refreshPromise: Promise<string | null> | null = null;

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const res = await refreshTokenApi();

        if (res?.token) {
          localStorage.setItem("token", res.token);
          return res.token;
        }

        return null;
      })();

      this.refreshPromise.finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }
}

export const apiClient = new ApiClient();
export { ApiError, env };
 