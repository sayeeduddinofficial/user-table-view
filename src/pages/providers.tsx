import { useEffect, useRef, useState } from "react";
import { ArrowRight, LogOut, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useLogin";
import { useAppStore } from "@/store/appStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROLE_LABELS } from "@/types";
import awsIcon from "@/assets/images/aws.png";
import azureIcon from "@/assets/images/azure.png";
import gcpIcon from "@/assets/images/cloud.png";
import onPremIcon from "@/assets/images/on-prem.png";

const providers = [
  {
    id: "aws" as const,
    name: "Amazon Web Services",
    short: "AWS",
    color: "from-[#ff9900]/30 to-[#ff9900]/5",
    accent: "#ff9900",
    desc: "EC2, S3, VPC, Route 53, ALB/NLB, EKS, Aurora RDS",
    enabled: true,
    icon: awsIcon,
    available: true,
  },
  {
    id: "azure" as const,
    name: "Microsoft Azure",
    short: "Azure",
    color: "from-[#0078d4]/30 to-[#0078d4]/5",
    accent: "#0078d4",
    desc: "VMs, Blob Storage, AKS, Azure DNS, Load Balancer",
    enabled: true,
    icon: azureIcon,
    available: false,
  },
  {
    id: "gcp" as const,
    name: "Google Cloud",
    short: "GCP",
    color: "from-[#4285f4]/30 to-[#4285f4]/5",
    accent: "#4285f4",
    desc: "GCE, GCS, GKE, Cloud DNS, Cloud Load Balancing",
    enabled: true,
    icon: gcpIcon,
    available: false,
  },
  {
    id: "onprem" as const,
    name: "On-Premises",
    short: "On-Prem",
    color: "from-[#10b981]/30 to-[#10b981]/5",
    accent: "#10b981",
    desc: "vSphere, bare metal, private cloud Terraform providers",
    enabled: true,
    icon: onPremIcon,
    available: false,
  },
];

/**
 * ProvidersHeader — A self-contained, restricted header for the provider
 * selection page. It intentionally:
 *   - Shows no sidebar toggle
 *   - Shows no notification bell (avoids sidebar-dependent navigation)
 *   - Profile dropdown only offers "Sign Out" — no navigation to internal pages
 *   - Reads user from BOTH useAuth (local state) and appStore (persisted) so
 *     the avatar is correct immediately after login, with no "U" flash.
 */
function ProvidersHeader() {
  const { user: authUser } = useAuth();
  const { currentUser: storeUser, setCurrentUser } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Prefer the auth context user (set synchronously during login),
  // fall back to store (persisted across refreshes).
  const user = authUser ?? storeUser;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("token");
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border bg-background/80 backdrop-blur-lg">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap className="h-6 w-6" />
        </div>
        <div className="animate-fade-in">
          <h1 className="font-semibold text-sidebar-foreground">PrudentOps</h1>
          <p className="text-xs text-muted-foreground">Automation Console</p>
        </div>
      </div>

      {/* Right controls */}
      <div ref={headerRef} className="flex items-center gap-3 relative">
        <ThemeToggle />

        {/* Profile avatar — only shows logout, no internal navigation */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <Avatar
              className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center text-sm"
              key={user?.profile_image_url || "fallback"}
            >
              {user?.profile_image_url && (
                <AvatarImage src={user.profile_image_url} />
              )}
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm dark:shadow-[0_0_20px_rgba(0,180,216,0.2)] overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {ROLE_LABELS[user?.role] || user?.role}
                </p>
              </div>

              {/* Sign out only — no navigation to internal app pages */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Providers() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  const choose = (id: (typeof providers)[number]["id"]) => {
    if (id === "aws") {
      if (user?.role === "SplunkOps.Admin" || user?.role === "SuperAdmin") {
        navigate("/");
      } else {
        navigate("/my-vms");
      }
      return;
    }
    navigate(`/${id}`);
  };

  return (
    <div>
      {/* Restricted header: no sidebar, no notification bell, no internal navigation */}
      <ProvidersHeader />

      <div className="min-h-screen p-8 lg:p-16 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl font-semibold">Choose a cloud provider</h1>
              <p className="text-muted-foreground mt-2">
                Pick the platform you want to manage. You can switch anytime.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {providers.map((p) => (
              <button
                key={p.id}
                disabled={!p.available}
                onClick={() => p.available && choose(p.id)}
                className={`
                  group relative text-left bg-card border rounded-xl p-6 overflow-hidden transition-all
                  ${p.available
                    ? "border-border hover:border-primary/60 cursor-pointer"
                    : "border-border/50 cursor-not-allowed"
                  }
                `}
              >
                {!p.available && (
                  <div className="absolute right-[-42px] top-[22px] z-20 rotate-45">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-semibold tracking-wider uppercase px-12 py-1 shadow-lg">
                      Coming Soon
                    </div>
                  </div>
                )}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-50 pointer-events-none`}
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={p.icon}
                        alt={p.name}
                        className="h-[140px] w-[140px] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,.15)] transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        {p.short}
                      </div>
                      <p className="relative text-sm text-muted-foreground mt-6">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}