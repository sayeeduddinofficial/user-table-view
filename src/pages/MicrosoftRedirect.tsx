/**
 * MicrosoftRedirect.tsx
 *
 * This page is the redirectUri that Azure AD returns to after Microsoft login.
 * IMPORTANT: It must NOT call instance.handleRedirectPromise() itself.
 *
 * AuthProvider (in useLogin.tsx) is the single place that calls
 * handleRedirectPromise(). MSAL only allows that promise to be consumed once —
 * if this page consumed it first, AuthProvider would receive null and the
 * backend token exchange would never happen, leaving the page stuck here forever.
 *
 * This component is intentionally a passive loading screen.
 * AuthProvider handles the redirect, exchanges tokens with the backend,
 * sets the user, and navigates away — at which point this page disappears.
 */
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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