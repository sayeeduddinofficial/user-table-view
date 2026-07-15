import { apiClient, env } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
  status: string;
  authType: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export const authApi = {
  // login: (email: string, password: string) =>
  //   apiClient.post<LoginResponse>(env.auth, '/api/auth/login', { email, password }),

  me: () =>
    apiClient.get<MeResponse>(env.auth, '/api/auth/me'),

  microsoftCallback: (code: string) =>
    apiClient.post<LoginResponse>(env.auth, '/api/auth/microsoft/callback', { code }),

  activateInvitation: (token: string, idToken: string) =>
    apiClient.post<ApiResponse<{ token: string; user: AuthUser }>>(
      env.auth,
      '/api/auth/activate-invitation',
      { token, idToken }
    ),
};
