/**
 * MicrosoftRedirect.tsx
 *
 * This page is the redirectUri that Azure AD returns to after Microsoft login.
 * IMPORTANT: It must NOT call instance.handleRedirectPromise() itself.
 *
 * AuthProvider (in useLogin.tsx) is the single place that calls
 * handleRedirectPromise(). MSAL only allows that promise to be consumed once —
 * if this page consumed it first, AuthProvider would receive null and the
 * backend token exchange would never happen.
 *
 * This component is a passive loading screen that navigates away once auth
 * state is resolved:
 *   - If a user session exists → go to the post-login landing page.
 *   - If auth finished loading and there is still no user → go to /login.
 *
 * This prevents the user from getting stuck on this page when they arrive here
 * via the browser back button (MSAL's handleRedirectPromise returns null for
 * an already-consumed auth code, so AuthProvider's Case A never fires, but the
 * existing localStorage JWT still restores the session — nothing else would
 * navigate away from /microsoft/redirect).
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useLogin";

export default function MicrosoftRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (user) {
      const savedReturnUrl = sessionStorage.getItem("postLoginReturnUrl");
      sessionStorage.removeItem("postLoginReturnUrl");
      navigate(savedReturnUrl || "/providers", { replace: true });
      return;
    }

    // Auth finished loading but no user — likely a stale back-nav to this
    // route with an already-consumed auth code. Send the user back to login.
    navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-base font-medium text-foreground">
          Completing sign-in…
        </p>
        <p className="text-sm text-muted-foreground">
          Please wait while we verify your account.
        </p>
      </div>
    </div>
  );
}
