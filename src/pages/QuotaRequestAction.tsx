import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/msalConfig";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/services/authService";
import { env } from "@/lib/env";

const AUTH_API = env.auth;

export default function QuotaRequestAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [statusMessage, setStatusMessage] = useState("Verifying your request…");
  const [isError, setIsError] = useState(false);
  const redirectStartedRef = useRef(false);

  useEffect(() => {
    if (redirectStartedRef.current) return;
    redirectStartedRef.current = true;

    const token       = searchParams.get("token");
    const rejectToken = searchParams.get("reject_token");
    const email       = searchParams.get("email") || "";
    const source      = searchParams.get("source") || "";

    const actionToken = token || rejectToken;

    if (!actionToken) {
      setIsError(true);
      setStatusMessage("Invalid link — no action token found. Please contact your administrator.");
      return;
    }

    // Build destination inside the protected app
    const query = token
      ? `?token=${encodeURIComponent(token)}`
      : `?reject_token=${encodeURIComponent(rejectToken!)}`;

    const destination = `/admin/quota-requests${query}${
      email  ? `&email=${encodeURIComponent(email)}`   : ""
    }${
      source ? `&source=${encodeURIComponent(source)}` : ""
    }`;

    async function handleAction() {
      const appToken = localStorage.getItem("token");
      if (appToken) {
        if (email) {
          setStatusMessage("Checking signed-in account…");
          try {
            const currentUser = await getCurrentUser(appToken);
            const currentEmail = currentUser?.data?.user?.email?.toLowerCase();
            if (currentEmail === email.toLowerCase()) {
              setStatusMessage("Redirecting to quota requests...");
              navigate(destination, { replace: true });
              return;
            }
            setStatusMessage(`Please sign in as ${email} to complete this approval.`);
          } catch (err) {
            console.warn("[QuotaRequestAction] Existing session validation failed:", err);
          }
        } else {
          setStatusMessage("Redirecting to quota requests...");
          navigate(destination, { replace: true });
          return;
        }
      }

      const SESSION_KEY = "quotaRequestAction_redirected";
      const alreadyRedirected = sessionStorage.getItem(SESSION_KEY);
      if (alreadyRedirected === actionToken) {
        setStatusMessage("Completing sign-in… please wait.");
        return;
      }

      redirectStartedRef.current = true;

      let authType = "microsoft";
      try {
        if (email) {
          const res = await fetch(
            `${AUTH_API}/api/auth/auth-type?email=${encodeURIComponent(email)}`
          );
          if (res.ok) {
            const data = await res.json();
            authType = data.authType || "microsoft";
          }
        }
      } catch (err) {
        console.warn("[QuotaRequestAction] Could not detect auth type, defaulting to microsoft:", err);
      }

      if (authType === "local") {
        sessionStorage.setItem("postLoginReturnUrl", destination);
        sessionStorage.removeItem("emailLoginTriggered");
        setStatusMessage("Redirecting to login...");
        navigate(
          `/login?returnUrl=${encodeURIComponent(destination)}&email=${encodeURIComponent(email)}`,
          { replace: true }
        );
        return;
      }

      setStatusMessage(
        email ? `Opening Microsoft sign-in for ${email}…` : "Opening Microsoft sign-in…"
      );

      sessionStorage.setItem("postLoginReturnUrl", destination);
      sessionStorage.removeItem("emailLoginTriggered");
      sessionStorage.setItem(SESSION_KEY, actionToken!);

      instance
        .loginRedirect({
          ...loginRequest,
          loginHint: email || undefined,
          prompt: "select_account",
        })
        .catch((err: unknown) => {
          console.error("[QuotaRequestAction] loginRedirect failed:", err);
          sessionStorage.removeItem(SESSION_KEY);
          redirectStartedRef.current = false;
          navigate(
            `/login?returnUrl=${encodeURIComponent(destination)}&email=${encodeURIComponent(email)}&source=${encodeURIComponent(source)}`,
            { replace: true }
          );
        });
    }

    handleAction();
  }, []);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-full max-w-md bg-background/95 backdrop-blur rounded-xl border p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center">Invalid approval link</h2>
          <p className="text-center text-muted-foreground mt-2">{statusMessage}</p>
          <div className="border-t border-border my-6" />
          <Button className="w-full" variant="outline" onClick={() => (window.location.href = "/login")}>
            Return to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-base font-medium text-foreground">{statusMessage}</p>
        <p className="text-sm text-muted-foreground">Please wait while we verify your account…</p>
      </div>
    </div>
  );
}