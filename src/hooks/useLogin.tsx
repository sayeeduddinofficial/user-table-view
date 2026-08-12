import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUser, refreshAuthToken } from '@/services/authService';
import { authSessionConfig } from '../config/authSessionConfig';
import { useAppStore } from '@/store/appStore';
import { loginRequest } from '@/auth/msalConfig';
import type { AuthenticationResult } from '@azure/msal-browser';
import { useDialog } from '@/components/ui/dialog-context';
import { getClientIp } from '@/utils/getClientIP';
import { microsoftLoginApi } from '@/services/loginApi';

type AuthContextType = {
  user: any;
  loading: boolean;
  logout: () => void;
  loginWithMicrosoft: (email?: string) => Promise<void>;
  // loginWithLocal: (email: string, password: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  error?: string;
  clearError: () => void;
  resetLoginState: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeEmail(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : undefined;
}

function getClaimEmail(claims: AuthenticationResult['idTokenClaims']): string | undefined {
  const record = claims as Record<string, unknown> | undefined;
  if (!record) return undefined;

  return (
    normalizeEmail(record.preferred_username) ||
    normalizeEmail(record.email) ||
    normalizeEmail(record.upn) ||
    normalizeEmail(record.unique_name)
  );
}

function getJwtPayload(token: string | undefined): Record<string, unknown> | undefined {
  if (!token) return undefined;

  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function getPayloadEmail(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined;

  return (
    normalizeEmail(payload.preferred_username) ||
    normalizeEmail(payload.email) ||
    normalizeEmail(payload.upn) ||
    normalizeEmail(payload.unique_name)
  );
}

function getMicrosoftEmail(result: AuthenticationResult): string | undefined {
  return (
    normalizeEmail(result.account?.username) ||
    getClaimEmail(result.idTokenClaims) ||
    getPayloadEmail(getJwtPayload(result.idToken)) ||
    getPayloadEmail(getJwtPayload(result.accessToken))
  );
}

function getBackendUserEmail(userData: any): string | undefined {
  return (
    normalizeEmail(userData?.email) ||
    normalizeEmail(userData?.username) ||
    normalizeEmail(userData?.userPrincipalName) ||
    normalizeEmail(userData?.upn) ||
    normalizeEmail(userData?.mail)
  );
}

function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('clientIp');
  localStorage.removeItem('inviteToken');
  localStorage.removeItem('inviteEmail');
  localStorage.removeItem('remindToken');
  localStorage.removeItem('remindEmail');
  sessionStorage.removeItem('msalRedirectHandled');
  sessionStorage.removeItem('activateInvitation_processedToken');
  sessionStorage.removeItem('emailLoginTriggered');
}

function getTokenExpirationTime(token: string | null | undefined): number | null {
  if (!token) return null;

  try {
    const payload = jwtDecode<{ exp?: number }>(token);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// function resolveDestination(role: string, savedReturnUrl?: string | null): string {
//   if (savedReturnUrl) return savedReturnUrl;
//   return role === 'SplunkOps.Admin' || role === 'SuperAdmin' ? '/' : '/my-vms';
// }

// ── AuthProvider ───────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
  msalEnabled,
  redirectResult,
  msalRedirectResponseDetected,
  msalRedirectError,
}: {
  children: React.ReactNode;
  msalEnabled?: boolean;
  redirectResult?: AuthenticationResult | null;
  msalRedirectResponseDetected?: boolean;
  msalRedirectError?: string | null;
}) {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const loginInProgressRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const { instance, accounts } = useMsal();

  const clearError = () => setError(undefined);
  const resetLoginState = () => { 
    loginInProgressRef.current = false;
  };

  const handleSessionExpired = (reason: string) => {
    clearStoredSession();
    setUser(null);
    setCurrentUser(null);
    sessionStorage.setItem('logout_reason', reason);
    window.dispatchEvent(new Event('auth:unauthorized'));
    navigate('/login', { replace: true });
  };
  // ── Local login ──────────────────────────────────────────────────────────────
  // const loginWithLocal = async (email: string, password: string): Promise<boolean> => {
  //   try {
  //     setLoading(true);

  //     const data = await localLoginApi({ email, password });

  //     if (!data.token) throw new Error('Invalid credentials');

  //     localStorage.setItem('token', data.token);
  //     const ip = await getClientIp();
  //     if (ip) localStorage.setItem('clientIp', ip);

  //     const backendUser = await getCurrentUser(data.token);
  //     if (!backendUser?.data?.user) throw new Error('Failed to fetch user data');

  //     const loggedInUser = backendUser.data.user;
  //     setUser(loggedInUser);
  //     setCurrentUser(loggedInUser);
  //     clearError();
  //     sessionStorage.removeItem('msalRedirectHandled');

  //     const savedReturnUrl = sessionStorage.getItem('postLoginReturnUrl');
  //     sessionStorage.removeItem('postLoginReturnUrl');

  //     navigate(resolveDestination(loggedInUser.role, savedReturnUrl), { replace: true });
  //     return true;
  //   } catch (err: any) {
  //     setError(err.message || 'Login failed');
  //     setUser(null);
  //     return false;
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // ── Microsoft login (redirect) ───────────────────────────────────────────────
  const loginWithMicrosoft = async (email?: string) => {
    console.log('[loginWithMicrosoft] called, inProgress:', loginInProgressRef.current);

    if (loginInProgressRef.current) {
      console.log('[loginWithMicrosoft] BLOCKED by loginInProgressRef');
      return;
    }
    loginInProgressRef.current = true;

    try {
      console.log('[loginWithMicrosoft] MSAL keys at call time:',
        Object.keys(sessionStorage).filter(k => k.toLowerCase().includes('msal'))
      );

      clearStoredSession();
      setUser(null);
      setCurrentUser(null);

      await instance.loginRedirect({
        ...loginRequest,
        loginHint: email,
        prompt: 'select_account',
      });
    } catch (err: any) {
      console.log('[loginWithMicrosoft] CATCH errorCode:', err?.errorCode);
      console.log('[loginWithMicrosoft] CATCH message:', err?.message);
      loginInProgressRef.current = false;

      if (
        err?.errorCode === 'interaction_in_progress' ||
        err?.message?.includes('interaction_in_progress')
      ) {
        console.log('[loginWithMicrosoft] clearing interaction lock and retrying');
        sessionStorage.removeItem('msal.interaction.status');
        Object.keys(sessionStorage)
          .filter(k => k.includes('msal') && (
            k.includes('interaction') ||
            k.includes('request') ||
            k.includes('state')
          ))
          .forEach(k => sessionStorage.removeItem(k));

        try {
          await instance.loginRedirect({
            ...loginRequest,
            loginHint: email,
            prompt: 'select_account',
          });
        } catch (retryErr: any) {
          console.log('[loginWithMicrosoft] RETRY also failed:', retryErr?.errorCode, retryErr?.message);
          setError('Microsoft login failed. Please try again.');
        }
        return;
      }

      setError('Microsoft login failed. Please try again.');
    } finally {
      loginInProgressRef.current = false;
    }
  };

  useEffect(() => {
    const handleRoleChanged = () => {
      setUser(null);
      setCurrentUser(null);
      navigate('/login', { replace: true });
    };
    const handleUnauthorized = () => {
      setUser(null);
      setCurrentUser(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:role-changed', handleRoleChanged);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:role-changed', handleRoleChanged);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [navigate]);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async () => {
    handleSessionExpired('USER_LOGOUT');
  };

  // ── Refresh user ─────────────────────────────────────────────────────────────
  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const backendUser = await getCurrentUser(token);
      if (backendUser?.data?.user) {
        setUser(backendUser.data.user);
        setCurrentUser(backendUser.data.user);
      }
    } catch {
      console.error('Failed to refresh user');
    }
  };

  // ── Sync MSAL active account ─────────────────────────────────────────────────
  useEffect(() => {
    if (!msalEnabled) return;
    const activeAccount = instance.getActiveAccount();
    if (!activeAccount && accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance, msalEnabled]);

  // ── Refresh active token before expiry and handle inactivity logout ───────────
  useEffect(() => {
    const resetInactivityTimer = () => {
      lastActivityRef.current = Date.now();
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(() => {
        console.log('[AuthProvider] Inactivity timeout reached');
        handleSessionExpired('SESSION_EXPIRED');
      }, authSessionConfig.inactivityTimeoutMs);
    };

    const scheduleRefresh = (tokenToUse?: string | null) => {
      if (!user) return;
      const token = tokenToUse ?? localStorage.getItem('token');
      if (!token) return;

      const expirationTime = getTokenExpirationTime(token);
      if (!expirationTime) return;

      const refreshLeadTime = authSessionConfig.refreshLeadTimeMs;
      const timeUntilExpiry = expirationTime - Date.now();
      const delay = Math.max(timeUntilExpiry - refreshLeadTime, 0);

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(async () => {
        const lastActivity = Date.now() - lastActivityRef.current;
        if (lastActivity >= authSessionConfig.inactivityTimeoutMs) {
          handleSessionExpired('SESSION_EXPIRED');
          return;
        }

        try {
          const newToken = await refreshAuthToken();
          if (newToken) {
            scheduleRefresh(newToken);
          } else {
            handleSessionExpired('SESSION_EXPIRED');
          }
        } catch {
          handleSessionExpired('SESSION_EXPIRED');
        }
      }, delay);
    };

    if (!user) {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'keydown'];
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    resetInactivityTimer();
    scheduleRefresh(localStorage.getItem('token'));

    return () => {
      activityEvents.forEach((event) => document.removeEventListener(event, resetInactivityTimer, true));
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [user, msalEnabled]);

  // ── Main auth initialisation (runs once on mount) ────────────────────────────
  useEffect(() => {
    async function initAuth() {
      // Case: MSAL disabled (HTTP / insecure context)
      if (!sessionStorage.getItem('msalRedirectHandled')) {
        sessionStorage.removeItem('msal.interaction.status');
      }

      if (!msalEnabled) {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            const backendUser = await getCurrentUser(storedToken);
            if (backendUser?.data?.user) {
              setUser(backendUser.data.user);
              setCurrentUser(backendUser.data.user);
            } else {
              clearStoredSession();
              setUser(null);
              setCurrentUser(null);
            }
          } catch {
            clearStoredSession();
            setUser(null);
            setCurrentUser(null);
          }
        } else {
          setUser(null);
          setCurrentUser(null);
        }
        setLoading(false);
        return;
      }

      if (msalRedirectResponseDetected && !redirectResult) {
        clearStoredSession();
        setUser(null);
        setCurrentUser(null);
        sessionStorage.removeItem('msalRedirectHandled');
        sessionStorage.removeItem('msal.interaction.status');
        sessionStorage.setItem('login_notice', 'Your previous sign-in session was cleared. Please sign in again.');
        setError(msalRedirectError || 'Microsoft sign-in could not be completed. Please sign in again.');
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      // Case A: Handle Microsoft redirect result
      if (redirectResult) {
        sessionStorage.setItem('msalRedirectHandled', 'true');

        // Read invite/remind tokens BEFORE clearStoredSession wipes them
        const inviteToken = localStorage.getItem('inviteToken');
        const inviteEmail = localStorage.getItem('inviteEmail');
        const remindToken = localStorage.getItem('remindToken');
        const remindEmail = localStorage.getItem('remindEmail');

        clearStoredSession();
        setUser(null);
        setCurrentUser(null);
        try {
          console.log('[AuthProvider] Case A: Handling Microsoft redirect');
          if (!redirectResult.account) {
            throw new Error('Microsoft did not return an account. Please try again.');
          }

          instance.setActiveAccount(redirectResult.account);
          const selectedMicrosoftEmail = getMicrosoftEmail(redirectResult);

          const accessToken = redirectResult.accessToken || (await instance.acquireTokenSilent({
            account: redirectResult.account,
            scopes: loginRequest.scopes,
          })).accessToken;

          // Validate Microsoft account matches invited/reminded email
          const expectedEmail = inviteEmail || remindEmail;
          const tokenType = inviteToken ? 'inviteToken' : 'remindToken';
          const activeToken = inviteToken || remindToken;
          
          if (activeToken && expectedEmail) {
            const msEmail = selectedMicrosoftEmail;
            if (msEmail?.toLowerCase() !== expectedEmail.toLowerCase()) {
              console.error(`[AuthProvider] Wrong Microsoft account used for ${tokenType}`);
              localStorage.removeItem('inviteToken');
              localStorage.removeItem('inviteEmail');
              localStorage.removeItem('remindToken');
              localStorage.removeItem('remindEmail');
              sessionStorage.removeItem('msalRedirectHandled');
              setError(`User not authorized`);
              navigate('/login', { replace: true });
              return;
            }
          }

          // Exchange with backend for session JWT — using centralized API
          const data = await microsoftLoginApi(accessToken, { 
            inviteToken: inviteToken || null, 
            remindToken: remindToken || null 
          });

          // Always clean up tokens
          if (inviteToken) {
            localStorage.removeItem('inviteToken');
            localStorage.removeItem('inviteEmail');
          }
          if (remindToken) {
            localStorage.removeItem('remindToken');
            localStorage.removeItem('remindEmail');
          }

          if (data.token) {
            sessionStorage.removeItem('msalRedirectHandled');
            sessionStorage.removeItem('activateInvitation_processedToken');
            localStorage.setItem('token', data.token);
            sessionStorage.removeItem('emailLoginTriggered');

            const ip = await getClientIp();
            if (ip) localStorage.setItem('clientIp', ip);

            const backendUser = await getCurrentUser(data.token);
            const loggedInUser = backendUser.data.user;
            const loggedInEmail = getBackendUserEmail(loggedInUser);

            if (selectedMicrosoftEmail && loggedInEmail && selectedMicrosoftEmail !== loggedInEmail) {
              console.error('[AuthProvider] Microsoft account mismatch after backend exchange');
              clearStoredSession();
              setUser(null);
              setCurrentUser(null);
              setError('Selected Microsoft account does not match the signed-in application user. Please try again.');
              navigate('/login', { replace: true });
              return;
            }

            setUser(loggedInUser);
            setCurrentUser(loggedInUser);

            const savedReturnUrl = sessionStorage.getItem('postLoginReturnUrl');
            sessionStorage.removeItem('postLoginReturnUrl');
            sessionStorage.removeItem('runtimeGovernanceAction_redirected');

            if (savedReturnUrl) {
              navigate(savedReturnUrl, { replace: true });
            } else {
              navigate("/providers", { replace: true });
            }
            return;
          }

          // Backend rejected
          const backendMessage = data.message || data.error || 'Access denied';
          console.error('[AuthProvider] Backend rejected login:', backendMessage);
          sessionStorage.removeItem('msalRedirectHandled');
          setError(backendMessage);
          navigate('/login', { replace: true });
          return;
        } catch (err: any) {
          console.error('[AuthProvider] Microsoft redirect login error:', err);
          clearStoredSession();
          localStorage.removeItem('inviteToken');
          localStorage.removeItem('inviteEmail');
          localStorage.removeItem('remindToken');
          localStorage.removeItem('remindEmail');
          sessionStorage.removeItem('msalRedirectHandled');
          setError(err?.message || 'Microsoft login failed. Please try again.');
          navigate('/login', { replace: true });
          return;
        } finally {
          setLoading(false);
        }
      }

      // Case B: Normal page load / refresh — restore from stored JWT
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const backendUser = await getCurrentUser(storedToken);
          if (backendUser?.data?.user) {
            setUser(backendUser.data.user);
            setCurrentUser(backendUser.data.user);
            if (!localStorage.getItem('clientIp')) {
              const ip = await getClientIp();
              if (ip) localStorage.setItem('clientIp', ip);
            }
          } else {
            clearStoredSession();
            setUser(null);
            setCurrentUser(null);
          }
        } else {
          setUser(null);
          setCurrentUser(null);
        }
      } catch {
        clearStoredSession();
        setUser(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty — runs once on mount. redirectResult is a stable prop from main.tsx.

  // ── Cross-tab logout detection ───────────────────────────────────────────────
  useEffect(() => {
    const checkToken = () => {
      if (!localStorage.getItem('token')) {
        setUser(null);
        setCurrentUser(null);
      }
    };
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

  // ── Passive session-expiry watchdog ──────────────────────────────────────────
  // Logs the user out when the JWT expires, even with zero clicks / API calls.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let expired = false;

    const expire = () => {
      if (expired) return;
      expired = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      handleSessionExpired('SESSION_EXPIRED');
    };

    const schedule = async () => {
      if (timeoutId) clearTimeout(timeoutId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const expiresAt = getTokenExpirationTime(token);
      if (!expiresAt) return; // no exp claim — nothing to watch

      const msLeft = expiresAt - Date.now();
      if (msLeft <= 0) {
        expire();
        return;
      }
      // setTimeout caps around ~24.8 days; clamp to be safe.
      timeoutId = setTimeout(schedule, Math.min(msLeft, 60_000));
    };

    // Fallback poll: catches system sleep/clock jumps where timers are throttled.
    intervalId = setInterval(schedule, 15_000);

    const onWake = () => void schedule();
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    document.addEventListener('visibilitychange', onWake);

    void schedule();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── MSAL disabled render ─────────────────────────────────────────────────────
  if (!msalEnabled) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          logout: () => {},
          loginWithMicrosoft: async () => {
            alert({ title: 'Microsoft login requires HTTPS.', severity: 'warning' });
          },
          // loginWithLocal,
          refreshUser: async () => {},
          error: 'Application must be accessed via HTTPS to use Microsoft login.',
          clearError,
          resetLoginState
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, logout, loginWithMicrosoft, /* loginWithLocal, */ refreshUser, error, clearError, resetLoginState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}