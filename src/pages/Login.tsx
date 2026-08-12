import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useLogin';
import { Loader2 } from 'lucide-react';
import {
  Cloud,
  ShieldCheck,
  Workflow,
  DollarSign,
  Server,
  Zap,
  Database,
  Boxes,
  HardDrive,
  Network,
  Monitor,
  ChevronUp, ChevronDown,
  Rocket
} from "lucide-react";
import { z } from 'zod';
import { useDialog } from '@/components/ui/dialog-context';
import prudentIcon from '../assets/images/prudent-icon.png';
import { AlertTriangle, Info } from 'lucide-react';
import { motion } from "framer-motion";
// ── Centralised error messages (mirrors Runtimegovernance.utils.ts pattern) ───

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  not_registered: 'Your account is not registered in SplunkOps. Please contact the administrator.',
  not_provisioned: 'Your account is not registered in SplunkOps. Please contact the administrator.',
  not_invited: 'Your account is not registered in SplunkOps. Please contact the administrator.',
  not_authorized: 'Your account is not registered in SplunkOps. Please contact the administrator.',
  deactivated: 'Your account has been deactivated. Please contact the administrator.',
  expired: 'This invitation link has expired. Please contact the administrator.',
  invalid_invitation: 'Invalid invitation link. Please contact the administrator.',
};

function mapLoginError(error: string): string {
  const lower = error.toLowerCase();
  for (const [key, message] of Object.entries(LOGIN_ERROR_MESSAGES)) {
    if (lower.includes(key.replace('_', ' ')) || lower.includes(key)) {
      return message;
    }
  }
  return error; // fallback: show as-is (e.g. "email mismatch" custom message)
}

function getAuthenticatedDestination(searchParams: URLSearchParams): string {
  const returnUrlEncoded = searchParams.get('returnUrl');
  const returnUrl = returnUrlEncoded ? decodeURIComponent(returnUrlEncoded) : null;

  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return returnUrl;
  }

  return '/providers';
}

function redirectAuthenticatedSession(searchParams: URLSearchParams): boolean {
  if (!localStorage.getItem('token')) return false;

  window.location.replace(getAuthenticatedDestination(searchParams));
  return true;
}

// ── Zod schema (v4: safeParse result uses .issues not .errors) ─────────────────

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).max(100),
});

type LoginFormErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

// ── Component ──────────────────────────────────────────────────────────────────

export default function Login() {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { user, loading: authLoading, loginWithMicrosoft, error, clearError, resetLoginState } = useAuth();

  const [msLoading, setMsLoading] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    const loginNotice = sessionStorage.getItem('login_notice');

    if (reason === 'ROLE_CHANGED') {
      setLogoutNotice('Your role has been changed. Please sign in again.');
      sessionStorage.removeItem('logout_reason');
    } else if (loginNotice) {
      setLogoutNotice(loginNotice);
      sessionStorage.removeItem('login_notice');
    }
  }, []);

  const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [bfcacheKey, setBfcacheKey] = useState(0); // used to force remount SSO buttons on bfcache restore
  useLayoutEffect(() => {
    if (location.pathname !== '/login') return;
    if (!localStorage.getItem('token')) return;

    setMsLoading(true);
    redirectAuthenticatedSession(searchParams);
  }, [location.pathname, searchParams]);

  // ── Pre-fill email from query param (email deep-link flow) ───────────────────
  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) setEmail(emailFromParams);
  }, [searchParams]);

  // ── Reset loading/errors on navigation back to /login ────────────────────────
  useEffect(() => {
    if (location.pathname === '/login') {
      setMsLoading(false);
      setFormErrors({});
      // Don't auto-clear auth errors - let user see them and clear them manually
    }
  }, [location.pathname]);

  // ── Auto-trigger Microsoft redirect for email deep-link source ───────────────
  useEffect(() => {
    const source = searchParams.get('source');
    if (source !== 'email') return;

    const alreadyTriggered = sessionStorage.getItem('emailLoginTriggered');
    if (!alreadyTriggered) {
      sessionStorage.setItem('emailLoginTriggered', 'true');
      loginWithMicrosoft(searchParams.get('email') || '');
    }
  }, [searchParams]);

  // ── Redirect authenticated user ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || location.pathname !== '/login') return;

    sessionStorage.removeItem('emailLoginTriggered');
    sessionStorage.removeItem('msalRedirectHandled');

    navigate(getAuthenticatedDestination(searchParams), { replace: true });
  }, [user, navigate, searchParams, location.pathname]);


  // ── Reset msLoading on bfcache restore ────────────────────────────────────────
  useEffect(() => {
    const handlePageShow = () => {
      resetLoginState();

      if (location.pathname === '/login' && localStorage.getItem('token')) {
        setMsLoading(true);
        window.location.replace(getAuthenticatedDestination(searchParams));
        return;
      }

      setMsLoading(false);
      setBfcacheKey(k => k + 1); // force button re-render
      setFormErrors({});

      Object.keys(sessionStorage)
        .filter(k => k.toLowerCase().includes('msal'))
        .forEach(k => {
          if (k.includes('interaction') || k.includes('request') || k.includes('state')) {
            sessionStorage.removeItem(k);
          }
        });

      if (error) clearError();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [error, clearError, resetLoginState, location.pathname, searchParams]);

  // ── Form validation (Zod v4) ─────────────────────────────────────────────────
  // const validateForm = (): boolean => {
  //   const result = loginSchema.safeParse({ email, password });
  //   if (!result.success) {
  //     const errors: LoginFormErrors = {};
  //     result.error.issues.forEach((issue) => {   // v4: .issues
  //       const field = issue.path[0] as keyof LoginFormErrors;
  //       if (field) errors[field] = issue.message;
  //     });
  //     setFormErrors(errors);
  //     return false;
  //   }
  //   setFormErrors({});
  //   return true;
  // };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!validateForm()) return;

  //   clearError();
  //   setLoading(true);
  //   // const success = await loginWithLocal(email.trim().toLowerCase(), password);
  //   setLoading(false);

  //   // if (success) {
  //   //   alert({ title: 'Welcome back!', severity: 'success' });
  //   // } else {
  //     alert({ title: 'Invalid email or password', severity: 'error' });
  //   }
  // };

  const handleMicrosoftLogin = async () => {
    if (msLoading) return;

    if (redirectAuthenticatedSession(searchParams)) {
      setMsLoading(true);
      return;
    }

    setMsLoading(true);
    setFormErrors({});
    clearError();

    if (!window.isSecureContext) {
      alert({ title: 'Microsoft login requires HTTPS. Please use secure URL.', severity: 'warning' });
      setMsLoading(false);
      return;
    }
    try {
      await loginWithMicrosoft(email);
    } catch {
      alert({ title: 'Microsoft login failed. Please try again.', severity: 'error' });
    } finally {
      setMsLoading(false);
    }
  };

  // ── New motion design ──────────────────────────────────────────────────────────────────

  const FeatureStack = () => {

    const features = [
      {
        icon: Cloud,
        title: "Multi-Cloud Management",
        desc: "Manage AWS, Azure, GCP and On-Prem environments from a single pane of glass.",
      },
      {
        icon: Server,
        title: "Automated Splunk Cluster Setup",
        desc: "Deploy and configure Splunk clusters in 5–10 minutes with end-to-end automation.",
      },
      {
        icon: Workflow,
        title: "Self-Service Provisioning",
        desc: "Request VMs, K8s, Databases, Storage and Load Balancers with built-in governance.",
      },
      {
        icon: DollarSign,
        title: "Cost & Resource Insights",
        desc: "Real-time cost visibility and intelligent analytics across all your resources.",
      },
      {
        icon: ShieldCheck,
        title: "Security & Governance",
        desc: "RBAC, approvals, audit trails and compliance built for enterprise scale.",
      },
      {
        icon: Zap,
        title: "Automate. Accelerate. Deliver.",
        desc: "Reduce manual effort and accelerate operations with intelligent workflows.",
      },
    ];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length);
      }, 3000);

      return () => clearInterval(timer);
    }, [features.length]);

    return (
      <div className="flex max-w-[560px] gap-4 lg:gap-6">

        {/* Progress Rail */}
        <div className="relative flex flex-col items-center shrink-0">

          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev === 0 ? features.length - 1 : prev - 1
              )
            }
            className="
flex
h-10
w-10
items-center
justify-center
rounded-xl
border
border-border
bg-card/60
backdrop-blur-md
transition-all
duration-300
hover:border-primary/40
hover:bg-primary/10
hover:text-primary
hover:-translate-y-0.5
hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]
"
          >
            <ChevronUp size={16} />
          </button>

          <div
            className="
              relative
              my-4
              w-[2px]
              bg-border

              h-[200px]

              lg:h-[300px]
              xl:h-[290px]
              2xl:h-[270px]
            "
          >

            {/* Fixed Center Glow Dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

              <div className="absolute inset-0 animate-ping rounded-full bg-primary/50" />

              <div className="h-4 w-4 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8),0_0_25px_hsl(var(--primary)/0.6)]" />

            </div>
          </div>

          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                (prev + 1) % features.length
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 backdrop-blur-md hover:border-violet-500/30"
          >
            <ChevronDown size={16} />
          </button>

        </div>

        {/* Cards */}
        <div
          className="
              relative
              flex-1
              overflow-hidden
              pr-4

              h-[280px]
              md:h-[300px]
              lg:h-[320px]
              xl:h-[340px]
              2xl:h-[420px]
            "
        >

          {/* Top Fade */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-background to-transparent" />

          {/* Bottom Fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-background to-transparent" />

          {/* Stack */}
          <motion.div
            animate={{
              y: -(currentIndex * 140),
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="space-y-4"
          >
            {[...features, ...features].map((card, i) => {

              const isActive = i === currentIndex + 1;

              return (
                <div
                  key={`${card.title}-${i}`}
                  className="h-[124px] w-full"
                >
                  <div
                    className={`w-full rounded-2xl border p-4 backdrop-blur-xl transition-all duration-500
              ${isActive
                        ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-[0_0_35px_hsl(var(--primary)/0.25)]"
                        : "border-border bg-card/40 opacity-60 scale-[0.97]"
                      }`}
                  >
                    <div className="flex items-start gap-4">

                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl
                  ${isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        <card.icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <h3
                          className={`font-semibold text-sm lg:text-sm
                    ${isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                            }`}
                        >
                          {card.title}
                        </h3>

                        <p
                          className={`mt-2 text-sm lg:text-sm leading-relaxed
                    ${isActive
                              ? "text-muted-foreground"
                              : "text-muted-foreground/70"
                            }`}
                        >
                          {card.desc}
                        </p>

                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>

        </div>

      </div>
    );
  }

  /* ---------- Components ---------- */
  const OnPremIcon = () => {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#E5E7EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
        <circle cx="7" cy="7" r="0.8" fill="#E5E7EB" />
        <circle cx="7" cy="17" r="0.8" fill="#E5E7EB" />
      </svg>
    );
  }

  const AwsIcon = () => {
    // AWS — bold "aws" wordmark with smile arrow
    return (

      <svg width="40" height="40" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M225.502 384.35C225.502 394.2 226.502 402.2 228.402 408.1C230.502 413.95 233.202 420.35 236.902 427.3C238.082 429.136 238.723 431.267 238.752 433.45C238.752 436.1 237.152 438.8 233.752 441.45L216.952 452.65C214.935 454.106 212.536 454.94 210.052 455.05C207.352 455.05 204.702 453.75 202.052 451.35C198.458 447.483 195.243 443.281 192.452 438.8C189.477 433.671 186.725 428.416 184.202 423.05C163.452 447.6 137.402 459.9 106.002 459.9C83.6516 459.9 65.8016 453.45 52.8016 440.65C39.7516 427.85 33.1016 410.75 33.1016 389.4C33.1016 366.7 41.1016 348.3 57.3016 334.4C73.5516 320.5 95.1016 313.6 122.502 313.6C131.502 313.6 140.852 314.4 150.702 315.7C160.552 317.05 170.702 319.2 181.302 321.6V302.1C181.302 281.8 177.052 267.65 168.802 259.4C160.302 251.1 145.902 247.1 125.402 247.1C116.102 247.1 106.552 248.2 96.7016 250.6C86.9152 252.929 77.3075 255.953 67.9516 259.65C64.931 261.018 61.8244 262.187 58.6516 263.15C57.2767 263.604 55.8475 263.873 54.4016 263.95C50.6516 263.95 48.8016 261.25 48.8016 255.65V242.55C48.8016 238.3 49.3016 235.05 50.6516 233.25C52.6664 230.797 55.2376 228.86 58.1516 227.6C67.4016 222.8 78.6016 218.8 91.6516 215.6C104.652 212.1 118.502 210.55 133.152 210.55C164.802 210.55 187.952 217.75 202.852 232.15C217.502 246.55 224.952 268.45 224.952 297.85V384.35H225.452H225.502ZM117.452 424.9C126.202 424.9 135.252 423.3 144.852 420.1C154.402 416.9 162.952 411 170.102 403C174.389 398.088 177.486 392.254 179.152 385.95C180.752 379.5 181.852 371.8 181.852 362.7V351.5C173.776 349.542 165.596 348.039 157.352 347C149.061 345.928 140.711 345.376 132.352 345.35C114.502 345.35 101.452 348.85 92.7016 356.05C83.9016 363.25 79.7016 373.4 79.7016 386.75C79.7016 399.25 82.8516 408.6 89.5016 415.05C95.9016 421.7 105.202 424.9 117.452 424.9ZM331.102 453.75C326.302 453.75 323.102 452.95 321.002 451.05C318.852 449.45 317.002 445.75 315.402 440.65L252.902 234.3C251.669 230.842 250.847 227.25 250.452 223.6C250.452 219.35 252.602 216.95 256.852 216.95H282.952C287.952 216.95 291.452 217.75 293.302 219.6C295.452 221.2 297.052 224.95 298.652 230L343.352 406.75L384.852 230C386.152 224.7 387.752 221.2 389.852 219.6C393.06 217.635 396.797 216.709 400.552 216.95H421.802C426.902 216.95 430.302 217.75 432.452 219.6C434.602 221.2 436.452 224.95 437.502 230L479.552 408.9L525.552 230C526.405 226.129 528.248 222.545 530.902 219.6C534 217.637 537.642 216.709 541.302 216.95H566.052C570.302 216.95 572.702 219.1 572.702 223.6C572.702 224.95 572.402 226.3 572.202 227.9C571.772 230.17 571.136 232.396 570.302 234.55L506.152 440.9C504.552 446.25 502.702 449.75 500.602 451.35C497.582 453.281 494.03 454.209 490.452 454H467.602C462.552 454 459.102 453.2 456.952 451.35C454.802 449.45 452.952 446 451.902 440.65L410.652 268.5L369.652 440.45C368.352 445.8 366.752 449.25 364.652 451.1C362.502 453 358.752 453.8 354.002 453.8H331.102V453.75ZM673.002 460.95C659.194 460.968 645.432 459.357 632.002 456.15C618.702 452.95 608.352 449.45 601.402 445.45C597.152 443.05 594.252 440.4 593.152 437.95C592.135 435.597 591.608 433.063 591.602 430.5V416.9C591.602 411.3 593.702 408.6 597.702 408.6C599.334 408.604 600.956 408.874 602.502 409.4C604.102 409.95 606.502 411 609.152 412.1C618.152 416.1 628.052 419.3 638.402 421.45C649.052 423.55 659.402 424.65 670.052 424.65C686.852 424.65 699.852 421.7 708.902 415.85C713.249 413.218 716.821 409.481 719.254 405.019C721.687 400.557 722.894 395.53 722.752 390.45C722.841 387.02 722.251 383.606 721.016 380.405C719.78 377.204 717.923 374.28 715.552 371.8C710.802 366.7 701.752 362.15 688.702 357.9L650.102 345.9C630.702 339.75 616.302 330.65 607.552 318.65C598.986 307.562 594.312 293.961 594.252 279.95C594.252 268.75 596.652 258.85 601.402 250.3C606.202 241.8 612.602 234.3 620.602 228.4C628.602 222.3 637.602 217.75 648.252 214.55C658.902 211.35 670.052 210 681.752 210C687.652 210 693.752 210.25 699.602 211.05C705.702 211.85 711.302 212.95 716.902 214.05C722.202 215.35 727.302 216.65 732.052 218.3C736.852 219.9 740.552 221.5 743.252 223.1C746.391 224.677 749.128 226.951 751.252 229.75C752.963 232.353 753.787 235.44 753.602 238.55V251.1C753.602 256.7 751.502 259.65 747.502 259.65C743.96 259.246 740.53 258.159 737.402 256.45C721.323 249.321 703.887 245.773 686.302 246.05C671.152 246.05 659.152 248.45 650.902 253.55C642.652 258.55 638.402 266.35 638.402 277.3C638.402 284.75 641.052 291.15 646.402 296.25C651.702 301.3 661.552 306.35 675.652 310.9L713.452 322.9C732.602 329.05 746.452 337.6 754.702 348.55C762.952 359.5 766.902 372.05 766.902 385.95C766.902 397.45 764.552 407.8 760.002 416.9C755.291 426.031 748.675 434.045 740.602 440.4C732.352 447.05 722.502 451.9 711.052 455.35C699.052 459.1 686.552 460.95 673.002 460.95Z" fill="white" />
        <path fillRule="evenodd" clipRule="evenodd" d="M723.25 590.645C635.75 655.495 508.55 689.945 399.2 689.945C245.95 689.945 107.85 633.095 3.55042 538.595C-4.69958 531.095 2.75042 520.945 12.5504 526.845C125.4 592.495 264.55 632.295 408.55 632.295C505.6 632.295 612.3 611.995 710.5 570.345C725.15 563.695 737.65 579.945 723.25 590.645Z" fill="#FF9900" />
        <path fillRule="evenodd" clipRule="evenodd" d="M759.699 548.997C748.549 534.647 685.749 542.097 657.299 545.547C648.799 546.647 647.449 539.147 655.149 533.547C705.149 498.297 787.399 508.447 796.949 520.197C806.549 532.197 794.299 614.697 747.449 654.197C740.299 660.347 733.399 657.197 736.549 649.197C747.199 622.697 770.899 563.197 759.699 549.047V548.997Z" fill="#FF9900" />
      </svg>

    );
  }

  const AzureIcon = () => {
    return (
      <svg width="32" height="32" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_13582_39736)">
          <path d="M373.065 559.164C370.956 558.636 372.42 556.878 377.049 554.652C384.726 550.842 389.88 544.221 391.404 536.196C392.343 531.156 394.977 539.652 361.227 439.752C339.255 374.712 339.957 376.764 341.13 376.764C341.715 376.764 342.186 376.704 342.186 376.587C342.186 376.47 338.67 366.039 334.335 353.325C330.057 340.611 320.799 313.188 313.77 292.386C306.798 271.584 300.822 254.358 300.468 254.007C300.117 253.596 299.706 253.773 299.355 254.475C298.416 256.056 297.657 255.648 297.657 253.536C297.657 252.48 295.842 246.213 293.613 239.649C291.387 233.028 281.601 204.024 271.875 175.197C262.149 146.37 249.315 108.282 243.399 90.5876C237.48 72.8936 231.915 57.2486 231.093 55.8416C230.274 54.4346 228.75 52.3256 227.754 51.1526C225.528 48.5756 219.726 44.7656 217.383 44.2376C216.036 43.9436 215.625 43.5356 215.625 42.4226V41.0156L306.915 41.1326L398.205 41.3096L402.6 43.4786C407.814 46.0556 412.209 50.2166 414.435 54.6116C415.314 56.3096 422.463 76.9946 430.431 100.491C438.342 124.047 447.834 152.112 451.467 162.894C455.1 173.676 465.237 203.733 474.027 229.692C482.817 255.648 496.176 295.2 503.733 317.583C538.011 419.067 546.741 444.789 554.124 466.704C558.459 479.595 564.789 498.345 568.188 508.305C573.519 524.067 574.341 527.115 574.632 531.507C575.277 541.35 571.761 548.559 563.088 555.12C556.761 559.926 564.729 559.572 463.83 559.515C414.495 559.455 373.653 559.338 373.068 559.164H373.065Z" fill="#27B3F3" />
          <path d="M43.0641 557.935C38.6691 556.411 35.1531 554.125 32.1081 550.903C27.0681 545.512 24.9021 539.593 25.3101 532.093C25.5441 527.464 26.3061 524.887 34.2171 501.565C43.4751 474.202 55.4271 438.811 70.3101 394.63C75.4071 379.513 89.1201 338.908 100.778 304.396C112.439 269.944 129.605 219.025 138.98 191.311C148.295 163.597 159.02 131.956 162.71 120.997C166.4 110.041 172.787 90.9966 176.948 78.6906C181.109 66.3846 185.21 55.0776 186.029 53.6136C189.485 47.7546 194.993 43.7106 201.968 41.8956C205.658 40.8996 218.258 40.6656 217.73 41.5446C217.496 41.8386 218.141 42.2466 219.077 42.4836C221.48 43.0116 227.279 46.8186 229.508 49.3986C230.504 50.5716 232.028 52.6806 232.847 54.0276C234.545 56.9586 241.988 78.6366 243.452 85.0236C248.375 106 251.597 118.714 260.738 152.056C267.653 177.604 271.169 188.971 284.234 228.463L295.952 263.794L289.976 281.488C286.694 291.157 278.141 316.528 270.932 337.798C263.726 359.008 257.807 376.471 257.807 376.588C257.807 376.705 258.335 376.765 258.98 376.765C259.742 376.765 260.036 377.059 259.799 377.644C259.505 378.406 254.819 378.523 222.884 378.523C182.924 378.523 183.92 378.463 180.287 381.922C177.065 384.97 176.888 385.849 177.533 394.462C178.352 405.829 180.698 414.208 185.735 424.285C190.541 433.72 195.11 439.636 217.844 466.063L224.876 474.265L213.215 508.777C206.828 527.761 200.852 544.579 200.03 546.16C197.804 550.144 192.941 554.599 188.252 556.825L184.268 558.7L115.127 558.817C50.7321 558.934 45.8121 558.877 43.0581 557.938L43.0641 557.935Z" fill="#115DA6" />
          <path d="M354.198 557.817C352.263 557.172 349.452 555.825 347.928 554.769C345.408 552.954 330.351 539.067 286.815 498.342C276.855 488.967 261.327 474.552 252.42 466.233C243.513 457.971 236.013 450.882 235.839 450.588C235.311 449.709 233.202 449.886 232.851 450.882C232.383 451.995 231.444 452.055 231.444 450.942C231.444 450.474 219.9 439.281 205.839 426.099C191.718 412.914 179.178 401.079 178.008 399.789C176.073 397.797 175.782 397.095 175.431 393.753C174.669 385.842 175.254 383.265 178.536 380.16C182.346 376.527 176.955 376.761 263.556 376.761H342.6L345.237 385.14C346.701 389.709 357.366 421.293 368.85 455.277C391.818 523.188 393.048 526.878 393.519 531.156C394.281 537.66 391.233 546.156 386.253 551.253C384.495 553.011 381.684 555.003 378.519 556.527L373.596 558.987L365.628 558.927C359.535 558.927 356.898 558.693 354.201 557.814L354.198 557.817Z" fill="#047FD6" />
          <path d="M222.775 478.536C223.537 476.133 224.65 477.717 206.836 457.032C187.207 434.298 180.235 422.403 177.013 406.29C176.017 401.076 175.138 393.75 175.549 393.75C175.666 393.75 177.13 395.214 178.831 397.032C180.529 398.847 193.48 411.153 207.601 424.338C221.665 437.523 233.206 448.653 233.206 449.007C233.206 450.003 223.186 479.475 222.601 480.12C222.367 480.414 222.424 479.709 222.778 478.539L222.775 478.536Z" fill="#0D3F76" />
          <path d="M293.906 267.42C294.14 266.073 291.503 257.4 282.539 230.214C267.362 184.452 264.257 174.141 251.249 125.391C244.979 101.835 239.765 78.8096 240.527 78.0476C241.055 77.5196 241.874 78.6926 242.462 80.8616C242.813 81.9746 253.946 115.08 267.188 154.398C280.49 193.713 293.321 231.741 295.724 238.89L300.119 251.898L297.365 259.983C294.728 267.834 293.147 271.173 293.909 267.423L293.906 267.42Z" fill="#0D3F76" />
        </g>
        <defs>
          <clipPath id="clip0_13582_39736">
            <rect width="600" height="600" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  }

  const GcpIcon = () => {
    return (
      <svg width="32px" height="32px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><path fill="#EA4335" d="M10.313 5.376l1.887-1.5-.332-.414a5.935 5.935 0 00-5.586-1.217 5.89 5.89 0 00-3.978 4.084c-.03.113.312-.098.463-.056l2.608-.428s.127-.124.201-.205c1.16-1.266 3.126-1.432 4.465-.354l.272.09z" /><path fill="#4285F4" d="M13.637 6.3a5.835 5.835 0 00-1.77-2.838l-1.83 1.82a3.226 3.226 0 011.193 2.564v.323c.9 0 1.63.725 1.63 1.62 0 .893-.73 1.619-1.63 1.619l-3.257-.003-.325.035v2.507l.325.053h3.257a4.234 4.234 0 004.08-2.962A4.199 4.199 0 0013.636 6.3z" /><path fill="#34A853" d="M4.711 13.999H7.97v-2.594H4.71c-.232 0-.461-.066-.672-.161l-.458.14-1.313 1.297-.114.447a4.254 4.254 0 002.557.87z" /><path fill="#FBBC05" d="M4.711 5.572A4.234 4.234 0 00.721 8.44a4.206 4.206 0 001.433 4.688l1.89-1.884a1.617 1.617 0 01.44-3.079 1.63 1.63 0 011.714.936l1.89-1.878A4.24 4.24 0 004.71 5.572z" /></svg>
    );
  }



  // Cloud positions arranged in an arc ABOVE Terraform (center 250,250)
  const clouds: Array<{ x: number; y: number; left: string; top: string; label: string; color: string; Icon: () => React.ReactElement }> = [
    { x: 55, y: 220, left: "8%", top: "38%", label: "AWS", color: "#FF9900", Icon: AwsIcon },
    { x: 160, y: 110, left: "28%", top: "16%", label: "Azure", color: "#00A4EF", Icon: AzureIcon },
    { x: 340, y: 110, left: "62%", top: "16%", label: "GCP", color: "#4285F4", Icon: GcpIcon },
    { x: 445, y: 220, left: "82%", top: "38%", label: "On-Prem", color: "#9CA3AF", Icon: OnPremIcon },
  ];

  // Resource positions at the BOTTOM
  const resources: Array<{ left: string; bottom: string; x: number; y: number; label: string; Icon: typeof Monitor }> = [
    { left: "8%", bottom: "8%", x: 60, y: 420, label: "VMs", Icon: Monitor },
    { left: "26%", bottom: "2%", x: 160, y: 460, label: "Kubernetes", Icon: Boxes },
    { left: "45%", bottom: "0%", x: 249, y: 470, label: "Databases", Icon: Database },
    { left: "63%", bottom: "2%", x: 340, y: 460, label: "Storage", Icon: HardDrive },
    { left: "82%", bottom: "8%", x: 440, y: 420, label: "Load Balancer", Icon: Network },
  ];

  // const heights = [40, 65, 50, 80, 60, 90, 70];

   function TerraformLogo({ size = 40 }: { size?: number }) {
    // Terraform mark — three diagonal panels stacked
    return (

      // <svg width={size} height={size} viewBox="0 0 400 455" className="drop-shadow-[0_4px_12px_rgba(124,58,237,0.7)]">
      //   <path d="M275.75 151.891V295.303L400 223.641V80.0781L275.75 151.891Z" fill="white" />
      //   <path d="M137.875 80.075L262.125 151.887V295.3L137.875 223.55V80.075ZM0 0V143.488L124.25 215.237V71.7375L0 0ZM137.875 382.8L262.125 454.55V311.05L137.875 239.313V382.8Z" fill="white" />
      // </svg>
      <svg width={size} height={size} viewBox="0 0 79 116" fill="none" className="drop-shadow-[0_4px_12px_rgba(124,58,237,0.7)]">
<path d="M9.04587 79C1.04587 87.8 -0.28746 107.333 0.0458732 116H9.04587C6.24585 103.2 7.8792 86 9.04587 79Z" fill="#0458FC"/>
<path d="M19.0459 52.5C7.8459 77.7 10.3792 105.333 13.0459 116H30.0459C20.8459 108.4 18.8792 70.5 19.0459 52.5Z" fill="#0458FC"/>
<path d="M22.5459 68C21.7459 88.8 30.2126 108.667 34.5459 116H63.5459C31.5459 103.6 28.5459 51.1667 31.0459 26.5C28.5459 31.6667 23.3459 47.2 22.5459 68Z" fill="#0458FC"/>
<path d="M55.1055 0C68.0519 0.000241937 78.5469 18.8042 78.5469 42C78.5469 65.1958 68.0519 83.9998 55.1055 84C47.6097 84 40.9357 77.6964 36.6445 67.8867C39.8256 72.4668 43.8669 75.2088 48.2676 75.209C58.517 75.209 66.8262 60.341 66.8262 42C66.8262 23.659 58.517 8.79102 48.2676 8.79102C43.8671 8.79119 39.8255 11.5326 36.6445 16.1123C40.9357 6.30307 47.6099 0 55.1055 0Z" fill="#0458FC"/>
</svg>


    );
  }


  function FloatingCard({
    children,
    className = "",
    delay = 0,
    float = 6,
  }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    float?: number;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay }}
        style={{ animation: `float-y ${4 + float * 0.3}s ease-in-out infinite` }}
        className={`absolute z-20 rounded-xl border border-border glass-panel p-3 shadow-[var(--shadow-elevated)] backdrop-blur-md ${className}`}
      >
        {children}
      </motion.div>
    );
  }


  function CloudNode({
    children,
    label,
    color,
    className = "",
    style,
    delay = 0,
  }: {
    children: React.ReactNode;
    label: string;
    color: string;
    className?: string;
    style?: React.CSSProperties;
    delay?: number;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay }}
        style={style}
        className={`absolute z-20 flex flex-col items-center ${className}`}
      >
        <div className="relative">
          {/* Pulse rings */}
          <span
            className="absolute inset-0 rounded-[22px]"
            style={{
              background: color,
              opacity: 0.18,
              animation: "pulse-ring 2.6s ease-out infinite",
            }}
          />
          <span
            className="absolute -inset-1 rounded-[26px] blur-xl"
            style={{ background: color, opacity: 0.35 }}
          />
          {/* Glass tile */}
          <div
            className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-[20px] border border-white/20 bg-gradient-to-br from-white/20 to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl dark:bg-transparent bg-[rgb(8_25_50)]"

            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 32px ${color}55, 0 12px 30px -8px rgba(0,0,0,0.7)` }}
          >
            {/* Top shine */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
            <span className="pointer-events-none absolute -left-4 -top-4 h-12 w-12 rounded-full bg-white/30 blur-xl" />
            <div className="relative">{children}</div>
          </div>
        </div>
        <span className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/85">
          {label}
        </span>
      </motion.div>
    );
  }

  function ResourceNode({
    children,
    label,
    className = "",
    style,
    delay = 0,
  }: {
    children: React.ReactNode;
    label: string;
    className?: string;
    style?: React.CSSProperties;
    delay?: number;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay }}
        style={style}
        className={`absolute z-10 flex flex-col items-center ${className}`}
      >
       <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/15 to-white/[0.03] text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_22px_-8px_oklch(0.62_0.21_255_/_0.7)] backdrop-blur-md dark:bg-transparent bg-[rgb(8_25_50)]">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="relative text-white">{children}</div>
        </div>
        <span className="mt-1.5 text-[10px] font-medium text-muted-foreground">{label}</span>
      </motion.div>
    );
  }

  // ── End new motion design ───────────────────────────────────────────────────






  // ── Loading state ─────────────────────────────────────────────────────────────
  const hasStoredSession = Boolean(localStorage.getItem('token'));

  if (authLoading || hasStoredSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isActivationWarning =
    error?.includes("Account activation required");

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white text-gray-900 dark:bg-black dark:text-white">
      {/* Background gradient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div
        className="
            grid
            min-h-screen w-full

            grid-cols-1

            gap-6
            2xl:gap-16
            layout-left-sec 
          "
      >
        {/* LEFT HERO */}
        <section className="
          relative
          flex
          min-h-full
          flex-col
          justify-between
          overflow-hidden

          px-6
          py-8
          lg:px-12

          bg-white
          dark:bg-transparent
          ">
          {/* Background Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_50%,rgba(124,58,237,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_30%_50%,rgba(124,58,237,0.12)_0%,transparent_70%)]" />

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_20%,rgba(6,182,212,0.05)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_60%_40%_at_70%_20%,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
          </div>

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3 mb-8">
            <div >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-white ">
                <svg width="79" height="116" viewBox="0 0 79 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.04587 79C1.04587 87.8 -0.28746 107.333 0.0458732 116H9.04587C6.24585 103.2 7.8792 86 9.04587 79Z" fill="white"/>
                <path d="M19.0459 52.5C7.8459 77.7 10.3792 105.333 13.0459 116H30.0459C20.8459 108.4 18.8792 70.5 19.0459 52.5Z" fill="white"/>
                <path d="M22.5459 68C21.7459 88.8 30.2126 108.667 34.5459 116H63.5459C31.5459 103.6 28.5459 51.1667 31.0459 26.5C28.5459 31.6667 23.3459 47.2 22.5459 68Z" fill="white"/>
                <path d="M55.1055 0C68.0519 0.000241937 78.5469 18.8042 78.5469 42C78.5469 65.1958 68.0519 83.9998 55.1055 84C47.6097 84 40.9357 77.6964 36.6445 67.8867C39.8256 72.4668 43.8669 75.2088 48.2676 75.209C58.517 75.209 66.8262 60.341 66.8262 42C66.8262 23.659 58.517 8.79102 48.2676 8.79102C43.8671 8.79119 39.8255 11.5326 36.6445 16.1123C40.9357 6.30307 47.6099 0 55.1055 0Z" fill="white"/>
                </svg>

              </div>
            </div>

            <div>
              <h2 className="text-[22px] font-extrabold">
                PrudentOps
              </h2>
              <p className="text-[12px] tracking-widest text-slate-500 dark:text-slate-400">
                Infrastructure. Automated. Everywhere.
              </p>
            </div>
          </div>


          <div className="
                items-start
                relative
                mx-auto
                grid
                w-full
                max-w-[1600px]
                grid-cols-1
                gap-8

                lg:grid-cols-[minmax(0,1fr)_480px]
                xl:grid-cols-[minmax(0,1fr)_500px]
                2xl:grid-cols-[minmax(0,1fr)_560px]
                ">
            {/* LEFT — features rail */}
            <div>
              {/* Hero Content */}
              <div className="relative z-10 mb-3 max-w-3xl">
                <h1
                  className="
                  hero-title
                    text-3xl
                    font-black
                    leading-[1.1]
                    tracking-tight

                    md:text-[1.25rem]
                    lg:text-[1.75rem]
                    xl:text-[2rem]
                    2xl:text-[3.25rem]
                  "
                >
                  One Platform.
                  <br />
                  <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                    Every Cloud.
                  </span>
                  <br />
                  Unlimited Possibilities.
                </h1>
              </div>
              <FeatureStack />

            </div>



           {/* CENTER — animated 3D visualization */}
            <section className="relative flex items-center justify-center ">
              <div className="relative aspect-square w-full max-w-[560px]">
                {/* Connection lines SVG */}
                <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full" fill="none">
                  <defs>
  {/* Connection Lines */}
  <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.10" />
    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.95" />
    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.10" />
  </linearGradient>

  {/* Terraform / Center Connection Lines */}
  <linearGradient id="lineTf" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
    <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.15" />
  </linearGradient>

  {/* Podium Glow */}
  <radialGradient id="podium" cx="50%" cy="50%" r="65%">
    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.55" />
    <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.40" />
    <stop offset="70%" stopColor="#2563EB" stopOpacity="0.20" />
    <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
  </radialGradient>

  {/* Blue Glow Filter */}
  <filter id="podiumGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="12" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>

{/* Soft Outer Glow */}
<ellipse
  cx="250"
  cy="305"
  rx="190"
  ry="54"
  fill="#2563EB"
  opacity="0.18"
  filter="url(#podiumGlow)"
/>

{/* Podium Fill */}
<ellipse
  cx="250"
  cy="305"
  rx="170"
  ry="42"
  fill="url(#podium)"
/>



{/* Middle Ring */}
<ellipse
  cx="250"
  cy="305"
  rx="118"
  ry="28"
  fill="none"
  stroke="#3B82F6"
  strokeOpacity="0.65"
  strokeWidth="1.2"
/>

{/* Inner Ring */}
<ellipse
  cx="250"
  cy="305"
  rx="82"
  ry="19"
  fill="none"
  stroke="#2563EB"
  strokeOpacity="0.50"
  strokeWidth="1"
/>

                  {/* Clouds → Terraform (center 250,235) */}
                  {clouds.map((c, i) => (
                    <line
                      key={`c-${i}`}
                      x1={c.x}
                      y1={c.y}
                      x2="250"
                      y2="235"
                      stroke="url(#lineTf)"
                      strokeWidth="1.4"
                      strokeDasharray="4 6"
                      className="animate-[dash_3s_linear_infinite]"
                    />
                  ))}

                  {/* Terraform → Resources */}
                  {resources.map((r, i) => (
                    <line
                      key={`r-${i}`}
                      x1="250"
                      y1="275"
                      x2={r.x}
                      y2={r.y}
                      stroke="url(#line)"
                      strokeWidth="1.4"
                      strokeDasharray="4 6"
                      className="animate-[dash_4s_linear_infinite]"
                    />
                  ))}
                </svg>

                {/* Floating dashboard cards */}
                <FloatingCard className="left-[-10%] top-[56%] w-40 -translate-y-6" delay={0.2} float={8}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Provisioning
                  </p>
<div className='flex w-full gap-3'>
                  <p className="font-display text-xl font-bold">
                    1,248
                  </p>

                  <span className="text-[10px] text-emerald-400 flex-grow">
                    ↑ 12.5% resources
                  </span>
                  </div>

                  <div className="mt-2 flex h-10 items-end gap-1">
                    {[40, 65, 50, 80, 60, 90, 70].map((height, index) => (
                      <div
                        key={index}
                        className="animate-bar flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${index * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </FloatingCard>

                <FloatingCard className="right-[-6%] top-[56%] w-38" delay={0.35} float={8}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost Overview</p>
                  <p className="font-display text-lg font-bold">
                    $24,560 <span className="text-[10px] font-medium text-emerald-400">↓ 8.2%</span>
                  </p>
                  <svg viewBox="0 0 100 30" className="mt-1 h-7 w-full">
                    <polyline
                      points="0,22 14,18 28,24 42,12 56,16 70,8 84,14 100,4"
                      fill="none"
                      stroke="oklch(0.78 0.17 60)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="0,22 14,18 28,24 42,12 56,16 70,8 84,14 100,4 100,30 0,30"
                      fill="oklch(0.78 0.17 60 / 0.15)"
                    />
                  </svg>
                </FloatingCard>

                {/* Central Terraform podium */}
                <motion.div
                  initial={{ y: 14, opacity: 0, scale: 0.85 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, delay: 0.4 }}
                  className="absolute left-[37%] top-[37%] z-30 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="animate-float-slow relative">
  {/* Blue Glow */}
  <div className="absolute -inset-4 -z-10 rounded-3xl bg-[#2563EB]/30 blur-2xl" />

  <div
  className="
    relative
    flex h-[144px] w-[144px]
    flex-col items-center justify-center
    overflow-hidden
    rounded-[24px]
    border border-[#4FA3FF]/80
    bg-[#000d21]

    shadow-[0_0_8px_rgba(59,130,246,0.9),
             0_0_18px_rgba(59,130,246,0.65),
             0_0_40px_rgba(37,99,235,0.45),
             0_20px_45px_rgba(0,30,90,0.55),
             inset_0_1px_0_rgba(255,255,255,0.08),
             inset_0_0_18px_rgba(37,99,235,0.18)]
  "
>

    {/* Background Glow */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2563EB33_0%,transparent_70%)]" />

    {/* Glass */}
    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-white/[0.08] to-transparent backdrop-blur-xl" />

    {/* Neon Border */}
    <div className="absolute inset-0 rounded-[24px] shadow-[0_0_8px_rgba(59,130,246,.9),0_0_20px_rgba(59,130,246,.45),inset_0_0_12px_rgba(59,130,246,.18)]" />

    {/* Logo */}
    <div className="relative mb-0">
      <TerraformLogo
        size={50}      />
    </div>

    {/* Title */}
    <h2 className="relative z-20 mt-2 text-[18px] font-semibold tracking-[0.1em] uppercase text-white">
   PRUDENT
</h2>

    {/* Subtitle */}
    <p className="relative z-20 mt-1 text-center text-[10px] leading-[13px] font-light text-white">
  Infrastructure Automation
  <br />
  Platform
</p>
  </div>
</div>
                </motion.div>

                {/* Cloud provider nodes (glassy) */}
                {clouds.map((c, i) => (
                  <CloudNode
                    key={c.label}
                    className=""
                    style={{ left: c.left, top: c.top, transform: "translate(-50%, -50%)" }}
                    label={c.label}
                    color={c.color}
                    delay={0.5 + i * 0.08}
                  >
                    <c.Icon />
                  </CloudNode>
                ))}

                {/* Resource nodes */}
                {resources.map((r, i) => (
                  <ResourceNode
                    key={r.label}
                    style={{ left: r.left, bottom: r.bottom, transform: "translateX(-50%)" }}
                    label={r.label}
                    delay={0.95 + i * 0.06}
                  >
                    <r.Icon className="h-4 w-4" />
                  </ResourceNode>
                ))}
              </div>
            </section>
          </div>
          <div className="mt-6 flex gap-3">

            <div className="flex-1 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <Rocket className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                     Provision
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Infrastructure in minutes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Cloud className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                   Multi-Cloud
                  </p>
                  <p className="text-xs text-muted-foreground">
                    One platform. Every cloud.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Workflow className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Automate
                  </p>
                  <p className="text-xs text-muted-foreground">
                   Simplify everyday operations.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </section>

        <aside
          className="
              relative overflow-hidden
              flex flex-col items-center justify-center

              px-8 py-10 
              bg-background
              dark:bg-[#161c22]
              m-2

              border-l
              border-border
              dark:border-indigo-500/20
              rounded-2xl border shadow-[var(--shadow-elevated)] backdrop-blur-xl
            "
        >
          <div className="w-full max-w-lg relative z-10 text-center">
            {/* Logo */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-3 mb-8">
                <div className="relative p-2 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 shadow-lg">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent" />
                  <img src={prudentIcon} alt="" width="50px" height="auto" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_10px_hsl(25_90%_55%/0.6)]" />
                </div>
              </div>
              <h2
                className="
                mb-2
                text-center
                text-4xl
                font-extrabold
                animate-fade-up
              "
              >
                Welcome to{" "} <br />
                PrudentOps
              </h2>
              <p className="text-muted-foreground mt-2 text-base mb-4">Secure access to your infrastructure<br /> automation platform</p>
            </div>

            <div className="h-1 w-20 mx-auto mb-0 rounded-full bg-gradient-to-r from-primary to-secondary" />

            {/* Auth Form */}
            <div className="animate-fade-in px-3" style={{ animationDelay: '0.1s' }}>
              {/* <form onSubmit={handleSubmit} className="space-y-5"> */}
                {/* Email */}
                {/* <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                disabled={loading}
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div> */}

                {/* Password */}
                {/* <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/90">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                disabled={loading}
              />
              {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
            </div> */}

                {/* <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button> */}
              {/* </form> */}

              {/* SSO buttons */}
              <div className="mt-6">
                {/* <div className="w-full max-w-md mx-auto text-center space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-sm font-medium">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>
            </div> */}

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-6">
                  {/* Google (placeholder — not wired) */}
                  {/* <button className="flex items-center justify-center gap-3 w-full max-w-sm px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 bg-white text-gray-900 border-gray-300 hover:bg-gray-100 dark:bg-[#1f1f1f] dark:text-white dark:border-[#333] dark:hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
                <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.6l6.9-6.9C35.64 2.36 30.2 0 24 0 14.82 0 6.92 5.28 2.88 12.98l8.06 6.26C12.96 13.08 17.98 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.1 24.5c0-1.64-.14-3.2-.4-4.7H24v9h12.44c-.54 2.9-2.18 5.36-4.66 7.02l7.18 5.58C43.96 37.18 46.1 31.38 46.1 24.5z" />
                  <path fill="#FBBC05" d="M10.94 28.24A14.5 14.5 0 019.5 24c0-1.47.26-2.9.72-4.24l-8.06-6.26A23.94 23.94 0 000 24c0 3.82.92 7.42 2.56 10.6l8.38-6.36z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.18-5.58c-2 1.34-4.54 2.14-8.72 2.14-6.02 0-11.04-3.58-13.06-8.74l-8.38 6.36C6.92 42.72 14.82 48 24 48z" />
                </svg>
                <span>Sign in with Google</span>
              </button> */}

                  {/* Microsoft */}
                  <button
                    key={bfcacheKey} // force remount to reset internal state on bfcache restore
                    onClick={handleMicrosoftLogin}
                    disabled={msLoading}
                    className="
                group
                flex
                items-center
                justify-center
                gap-3

                w-full
               

                rounded-xl
                border

                px-4
                py-3

                text-sm
                font-semibold

                transition-all
                duration-300
                ease-out

                /* Light Theme */
                bg-slate-900
                text-white
                border-slate-900

                /* Dark Theme */
                dark:bg-white
                dark:text-slate-900
                dark:border-white

                /* Hover */
                hover:-translate-y-1
                hover:scale-[1.02]
                hover:shadow-[0_10px_30px_rgba(0,0,0,.15),0_0_20px_hsl(var(--primary)/0.15)]

                dark:hover:shadow-[0_12px_35px_rgba(255,255,255,0.18)]

                hover:bg-slate-800
                dark:hover:bg-slate-100

                /* Active */
                active:translate-y-0
                active:scale-[0.98]

                /* Focus */
                focus:outline-none
                focus:ring-2
                focus:ring-primary

                /* Disabled */
                disabled:opacity-60
                disabled:pointer-events-none"
                  >
                    {msLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                        <rect x="13" y="1" width="9" height="9" fill="#7FBA00" />
                        <rect x="1" y="13" width="9" height="9" fill="#00A4EF" />
                        <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
                      </svg>
                    )}
                    <span>Sign in with Microsoft</span>
                    <span
                      className="
                    ml-auto
                    text-lg
                    text-muted-foreground
                    transition-all
                    duration-300
                    group-hover:translate-x-1
                    group-hover:text-primary
                  "
                    >
                      ›
                    </span>
                  </button>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-500 animate-in fade-in slide-in-from-bottom-2 duration-700 justify-center">
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-[14px] w-[14px]"
                    >
                      <path d="M8 1a5 5 0 100 10A5 5 0 008 1zm-1 7.4L4.6 6l1.1-1.1 1.3 1.3 3.3-3.3L11.4 4 7 8.4z" />
                    </svg>

                    <span>
                      SSO via Microsoft Entra ID (SAML / OAuth 2.0)
                    </span>
                  </div>
                </div>

                {/* Role changed notice */}
                {logoutNotice && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/50 mt-3">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-warning">{logoutNotice}</p>
                  </div>
                )}

                {/* Auth error banner */}
                {!authLoading && !user && error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/50 mt-3">
                    {isActivationWarning ? (
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-warning">{mapLoginError(error)}</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Powered by <span className="text-secondary font-medium">Prudent</span> Infrastructure
            </p>
          </div>

        </aside>
      </div>



    </div>
  );
}