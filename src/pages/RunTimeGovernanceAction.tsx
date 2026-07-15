/**
 * RuntimeGovernanceAction.tsx
 *
 * PUBLIC route — no auth wrapper.
 * Handles the email approve/reject deep-link for BOTH Microsoft and local-auth
 * (SuperAdmin) managers.
 *
 * Flow:
 *  1. Page mounts at /runtime-governance-action?token=...&email=...&source=email
 *  2. If manager is already logged in → navigate straight to runtime-governance.
 *  3. Call GET /auth-service/api/auth/auth-type?email=... to detect login method.
 *  4a. Microsoft manager → save returnUrl to sessionStorage → loginRedirect()
 *      → AuthProvider reads postLoginReturnUrl and navigates back after login.
 *  4b. Local (SuperAdmin) manager → navigate to /login?returnUrl=...&email=...
 *      Login.tsx handles local login and navigates to returnUrl on success.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/msalConfig";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {env} from "@/lib/env";

const AUTH_API = env.auth;

export default function RuntimeGovernanceAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [statusMessage, setStatusMessage] = useState("Verifying your request…");
  const [isError, setIsError] = useState(false);
  const redirectStartedRef = useRef(false);

  useEffect(() => {
    if (redirectStartedRef.current) return;

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

    // Build the destination inside the protected app
    const query = token
      ? `?token=${encodeURIComponent(token)}`
      : `?reject_token=${encodeURIComponent(rejectToken!)}`;
    const destination = `/admin/runtime-governance${query}${
      email  ? `&email=${encodeURIComponent(email)}`   : ""
    }${
      source ? `&source=${encodeURIComponent(source)}` : ""
    }`;

    // ── Already logged in — go straight there ────────────────────────────
    const appToken = localStorage.getItem("token");
    if (appToken) {
      navigate(destination, { replace: true });
      return;
    }

    // ── Post-redirect guard: loginRedirect already fired for this token ───
    const SESSION_KEY = "runtimeGovernanceAction_redirected";
    const alreadyRedirected = sessionStorage.getItem(SESSION_KEY);
    if (alreadyRedirected === actionToken) {
      // AuthProvider is handling the MS response — just show loading screen
      setStatusMessage("Completing sign-in… please wait.");
      return;
    }

    redirectStartedRef.current = true;

    async function handleAction() {
      // ── Detect auth type for this manager email ───────────────────────
      let authType = "microsoft"; // safe default
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
        console.warn("[RuntimeGovernanceAction] Could not detect auth type, defaulting to microsoft:", err);
      }

      // // ── Local auth (SuperAdmin with email+password) ───────────────────
      // if (authType === "local") {
      //   // Store returnUrl so Login.tsx navigates there after local login
      //   sessionStorage.setItem("postLoginReturnUrl", destination);
      //   sessionStorage.removeItem("emailLoginTriggered");

      //   navigate(
      //     `/login?returnUrl=${encodeURIComponent(destination)}&email=${encodeURIComponent(email)}`,
      //     { replace: true }
      //   );
      //   return;
      // }

      // ── Microsoft auth ────────────────────────────────────────────────
      setStatusMessage(
        email
          ? `Opening Microsoft sign-in for ${email}…`
          : "Opening Microsoft sign-in…"
      );

      // Save return URL — survives the Microsoft redirect round-trip
      sessionStorage.setItem("postLoginReturnUrl", destination);
      sessionStorage.removeItem("emailLoginTriggered");
      // Mark that we've fired redirect for this token
      sessionStorage.setItem(SESSION_KEY, actionToken!);

      instance
        .loginRedirect({
          ...loginRequest,
          loginHint: email || undefined,
          prompt: "select_account",
        })
        .catch((err: unknown) => {
          console.error("[RuntimeGovernanceAction] loginRedirect failed:", err);
          sessionStorage.removeItem(SESSION_KEY);
          redirectStartedRef.current = false;
          // MSAL unavailable — fall back to /login with returnUrl
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
          <Button
            className="w-full"
            variant="outline"
            onClick={() => (window.location.href = "/login")}
          >
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
        <p className="text-sm text-muted-foreground">
          Please wait while we verify your account…
        </p>
      </div>
    </div>
  );
}