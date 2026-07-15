import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/services/authService';
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

// function resolveDestination(role: string, savedReturnUrl?: string | null): string {
//   if (savedReturnUrl) return savedReturnUrl;
//   return role === 'SplunkOps.Admin' || role === 'SuperAdmin' ? '/' : '/my-vms';
// }

// ── AuthProvider ───────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
  msalEnabled,
  redirectResult,
}: {
  children: React.ReactNode;
  msalEnabled?: boolean;
  redirectResult?: AuthenticationResult | null;
}) {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const loginInProgressRef = useRef(false);
  const { instance, accounts } = useMsal();

  const clearError = () => setError(undefined);
  const resetLoginState = () => { 
    loginInProgressRef.current = false;
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
      console.log('[loginWithMicrosoft] calling handleRedirectPromise to clear stale state');
      try {
        await instance.handleRedirectPromise();
        console.log('[loginWithMicrosoft] handleRedirectPromise done');
      } catch (e) {
        console.log('[loginWithMicrosoft] handleRedirectPromise error (ignored):', e);
      }

      console.log('[loginWithMicrosoft] MSAL keys at call time:',
        Object.keys(sessionStorage).filter(k => k.toLowerCase().includes('msal'))
      );

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
    localStorage.removeItem('token');
    setUser(null);
    setCurrentUser(null);
    navigate('/login', { replace: true });
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
            } else {
              localStorage.removeItem('token');
              setUser(null);
            }
          } catch {
            localStorage.removeItem('token');
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      const redirectHandled = sessionStorage.getItem('msalRedirectHandled');

      // Case A: Handle Microsoft redirect result
      if (redirectResult && !redirectHandled) {
        sessionStorage.setItem('msalRedirectHandled', 'true');
        try {
          console.log('[AuthProvider] Case A: Handling Microsoft redirect');

          const tokenResponse = await instance.acquireTokenSilent({
            account: redirectResult.account,
            scopes: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`],
          });

          const inviteToken = localStorage.getItem('inviteToken');
          const inviteEmail = localStorage.getItem('inviteEmail');
          const remindToken = localStorage.getItem('remindToken');
          const remindEmail = localStorage.getItem('remindEmail');

          // Validate Microsoft account matches invited/reminded email
          const expectedEmail = inviteEmail || remindEmail;
          const tokenType = inviteToken ? 'inviteToken' : 'remindToken';
          const activeToken = inviteToken || remindToken;
          
          if (activeToken && expectedEmail) {
            const msEmail = redirectResult.account?.username;
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
          const data = await microsoftLoginApi(tokenResponse.accessToken, { 
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
            localStorage.removeItem('token');
            setUser(null);
            setCurrentUser(null);
          }
        } else {
          setUser(null);
          setCurrentUser(null);
        }
      } catch {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty — runs once on mount. redirectResult is a stable prop from main.tsx.

  // ── Activity tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    let activityTimer: ReturnType<typeof setTimeout>;

    const trackActivity = () => {
      // Update activity timestamp in localStorage for reference
      localStorage.setItem('lastActivity', Date.now().toString());
      
      // Reset timer
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        // Auto-logout after 4 hours of inactivity
        if (user) {
          console.log('[AuthProvider] Auto-logout due to inactivity');
          logout();
        }
      }, 4 * 60 * 60 * 1000); // 4 hours
    };

    if (user) {
      // Track mouse, keyboard, and scroll activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, trackActivity, true);
      });
      
      // Initialize timer
      trackActivity();
    }

    return () => {
      clearTimeout(activityTimer);
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, [user]);

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
