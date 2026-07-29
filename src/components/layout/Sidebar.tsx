import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppStore } from '@/store/appStore';
import { useAuth } from "@/hooks/useLogin";
import { isAdmin, canViewDashboard, canViewAuditLogs, canViewFinOps } from "@/utils/roles";
import { FinOpsIcon } from "@/components/icons/FinOpsIcon";
import { EC2Icon, S3Icon, VPCIcon, LBIcon, Route53Icon, RDSIcon, EKSIcon } from "@/components/icons/aws-icons";

import {
  LayoutDashboard,
  Server,
  Terminal,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  MessageSquarePlus,
  ArrowUpCircle,
  ScrollText,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
  visibleTo?: (role?: string) => boolean;
};

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", visibleTo: canViewDashboard },
      { to: "/requests", icon: Server, label: "Requests" }, 
      { to: "/console", icon: Terminal, label: "Live Console" },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/my-vms", icon: EC2Icon, label: "EC2" },
      { to: "/aws/s3", icon: S3Icon, label: "S3", adminOnly: false },
      { to: "/aws/vpcs", icon: VPCIcon, label: "VPC", adminOnly: false },
      { to: "/aws/load-balancers", icon: LBIcon, label: "Load Balancers", adminOnly: false },
      { to: "/aws/route53", icon: Route53Icon, label: "Route 53", adminOnly: false },
      { to: "/aws/rds", icon: RDSIcon, label: "RDS", adminOnly: false },
      { to: "/aws/eks", icon: EKSIcon, label: "EKS", adminOnly: false }
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", icon: Users, label: "User Management", adminOnly: true },
      // {to: "/rolesmanagement", icon: UserCog, label: "Role Management", adminOnly: true },
      { to: "/auditlogs", icon: ScrollText, label: "Audit Logs",visibleTo: canViewAuditLogs },
      { to: "/leadership-billing", icon: FinOpsIcon, label: "FinOps", visibleTo: canViewFinOps},
      { to: "/admin/runtime-governance", icon: Clock, label: "Runtime Governance", adminOnly: true },
      { to: "/admin/quota-requests", icon: ArrowUpCircle, label: "Quota Requests", adminOnly: true },
      { to: "/admin/feedback", icon: MessageSquarePlus, label: "Feedback Mgmt", adminOnly: true },
       { to: "/feedback", icon: MessageSquarePlus, label: "Feedback" },
      { to: "/settings", icon: Settings, label: "Settings" },
      
    ],
  },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();
  const { currentUser } = useAppStore();
  const { user, logout } = useAuth();

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.visibleTo) return item.visibleTo(user?.role);
        if (item.adminOnly) return isAdmin(user?.role);
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/requests") return location.pathname === "/requests";
    if (path === "/my-vms") return location.pathname.startsWith("/my-vms") || location.pathname.startsWith("/requests/new");
    return location.pathname.startsWith(path);
  };

  // same initials logic used in Header so icons match
  // const getInitials = (name?: string) => {
  //   if (!name) return "U";
  //   const parts = name.trim().split(" ").filter(Boolean);
  //   const first = parts[0]?.[0] || "";
  //   const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  //   return (first + last).toUpperCase();
  // };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
        "bg-sidebar border-r border-sidebar-border",
        sidebarOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-semibold text-sidebar-foreground">
                  SplunkOps
                </h1>
                <p className="text-xs text-muted-foreground">
                  Automation Console
                </p>
              </div>
            )}
          </div>
          <Tooltip key={`collapse-${sidebarOpen}`}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 p-3 overflow-y-auto">
          {filteredGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className="space-y-1">
              {group.label && sidebarOpen && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <Tooltip key={`${item.to}-${location.pathname}-${sidebarOpen}`}>
                    <TooltipTrigger asChild>
                      <span>
                        <NavLink
                          to={item.to}
                          className={cn(
                            "group flex flex-row items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 border",
                            active
                              ? "bg-primary/20 text-primary border-primary shadow-[0_0_20px_rgba(0,180,216,0.5)]"
                              : "text-muted-foreground border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:shadow-[0_0_15px_rgba(0,180,216,0.3)]",
                            !sidebarOpen && "justify-center px-2",
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                          {sidebarOpen && (
                            <span className="whitespace-nowrap">{item.label}</span>
                          )}
                        </NavLink>
                      </span>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent>
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2",
              sidebarOpen ? "justify-between" : "justify-center",
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar 
              className="h-9 w-9 border border-border" 
              key={currentUser?.profile_image_url || "fallback"}
              >

                {currentUser?.profile_image_url && (
                    <AvatarImage src={currentUser?.profile_image_url} />
                  )}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {currentUser?.name
                      ? currentUser?.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                      : "U"}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="animate-fade-in">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {ROLE_LABELS[currentUser?.role ?? ""] || currentUser?.role}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                title="Sign Out"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
