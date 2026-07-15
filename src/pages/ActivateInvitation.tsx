import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/msalConfig";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

const API_BASE = env.auth;

// SessionStorage key used to prevent re-processing after MSAL redirect returns
// to this same route. SessionStorage survives the redirect but is tab-scoped.
const SESSION_KEY = "activateInvitation_processedToken";

export default function ActivateInvitation() {
  const [searchParams] = useSearchParams();
  const { instance } = useMsal();
  const [statusMessage, setStatusMessage] = useState("Verifying your invitation…");
  const [isError, setIsError] = useState(false);

  // Extract token once and memoize it
  const token = useMemo(() => searchParams.get("token"), [searchParams]);

  // In-memory guard for StrictMode double-invoke within the same mount
  const redirectStartedRef = useRef(false);

  useEffect(() => {
    // No token in URL
    if (!token) {
      setIsError(true);
      setStatusMessage("Invalid invitation link. Please contact your administrator.");
      return;
    }

    // CROSS-REDIRECT GUARD: if this exact token was already dispatched to
    // Microsoft login (survives the page reload caused by loginRedirect), skip.
    const alreadyProcessed = sessionStorage.getItem(SESSION_KEY);
    if (alreadyProcessed === token) {
      console.log("[ActivateInvitation] Token already sent to MS login (post-redirect), skipping.");
      return;
    }

    // IN-RENDER GUARD: prevents StrictMode / fast re-render double-fire
    if (redirectStartedRef.current) return;
    redirectStartedRef.current = true;

    let isMounted = true;

    async function activate() {
      try {
        console.log("[ActivateInvitation] Processing token:", token!.substring(0, 20) + "…");

        if (isMounted) setStatusMessage("Verifying your invitation…");

        // Step 1: Validate token with backend BEFORE opening Microsoft login
        const res = await fetch(`${API_BASE}/api/auth/activate-invitation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        console.log("[ActivateInvitation] Backend response:", { status: res.status, hasData: !!data });

        if (!isMounted) return;

        if (!res.ok) {
          if (data.error?.toLowerCase().includes("already used")) {
            if (isMounted) setStatusMessage("Invitation already used. Redirecting to login…");
            setTimeout(() => { window.location.href = "/login"; }, 2000);
            return;
          }
          if (data.error?.toLowerCase().includes("expired")) {
            if (isMounted) {
              setIsError(true);
              setStatusMessage("This invitation link has expired. Please contact your administrator.");
            }
            return;
          }
          if (isMounted) {
            setIsError(true);
            setStatusMessage("Invalid invitation link. Please contact your administrator.");
          }
          console.error("[ActivateInvitation] Backend error:", data.error);
          return;
        }

        // Step 2: Token valid — persist it for AuthProvider to consume post-redirect
        const invitedEmail: string = data.email;
        
        // Determine if this is a reminder token by checking the source parameter
        const isReminderToken = searchParams.get('source') === 'reminder';
        
        if (isReminderToken) {
          localStorage.setItem("remindToken", token!);
          localStorage.setItem("remindEmail", invitedEmail);
          console.log("[ActivateInvitation] Stored as remindToken for email:", invitedEmail);
        } else {
          localStorage.setItem("inviteToken", token!);
          localStorage.setItem("inviteEmail", invitedEmail);
          console.log("[ActivateInvitation] Stored as inviteToken for email:", invitedEmail);
        }

        // Mark token as dispatched BEFORE calling loginRedirect so that if
        // MSAL briefly re-mounts this component during the redirect cycle it
        // will see the guard and bail out immediately.
        sessionStorage.setItem(SESSION_KEY, token!);

        if (isMounted) {
          const tokenType = isReminderToken ? 'reminder' : 'invitation';
          setStatusMessage(`${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} verified. Opening Microsoft sign-in for ${invitedEmail}…`);
        }

        console.log("[ActivateInvitation] Calling loginRedirect with email:", invitedEmail);

        await instance.loginRedirect({
          ...loginRequest,
          loginHint: invitedEmail,
          domainHint: "organizations",
        });

        // loginRedirect navigates away; code below will not run.

      } catch (err) {
        console.error("[ActivateInvitation] Exception:", err);

        // Clean up session guard so the user can retry
        sessionStorage.removeItem(SESSION_KEY);
        redirectStartedRef.current = false;

        if (isMounted) {
          setIsError(true);
          setStatusMessage("Something went wrong. Please contact your administrator.");
        }
      }
    }

    activate();

    return () => {
      isMounted = false;
    };
  }, [token]); // Only depend on token value

  useEffect(() => {
    return () => {
      // Only clear if we're unmounting after a successful redirect (no error).
      // Clearing on error is handled inside the catch block above.
    };
  }, []);

  return (
    <>
      {isError ? (
        <div className="min-h-screen flex items-center justify-center bg-black">

          <div className="relative w-full max-w-md bg-background/95 backdrop-blur rounded-xl border p-8">

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center">
              Invitation link is not valid
            </h2>

            <p className="text-center text-muted-foreground mt-2">
              We couldn't verify this invitation link. It may no longer be active for
              one of the following reasons:
            </p>

            <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">

              {/* <div className="flex gap-2">
                <span className="text-destructive">•</span>
                <p>
                  The link has <strong>expired</strong> — invitation links are valid
                  for <strong> 48 hours only</strong>.
                </p>
              </div> */}

              {/* <div className="border-t border-border"></div> */}

              <div className="flex gap-2">
                <span className="text-destructive">•</span>
                <p>
                  The link has already been <strong>used</strong> — each link works for
                  a single sign-in.
                </p>
              </div>

              <div className="border-t border-border"></div>

              <div className="flex gap-2">
                <span className="text-destructive">•</span>
                <p>
                  The link was <strong>revoked</strong> by your administrator.
                </p>
              </div>

            </div>

            <div className="border-t border-border my-6"></div>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => (window.location.href = "/login")}
            >
              Return to login
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Need help? Contact administrator
            </p>

          </div>
        </div>
      )
        :
        (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4 max-w-md px-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className={`text-base font-medium text-foreground`}>
                {statusMessage}
              </p>
            </div>
          </div>
        )}
    </>
  );
} 