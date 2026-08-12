import {
  Bell,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  X,
  Info,
  Trash2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchVpcListApi } from "@/services/vpcService";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROLE_LABELS } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ThemeToggle } from "../ui/theme-toggle";
import ChooseServices from "@/components/dialogs/ChooseServices";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showNewRequest?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  showProfile?: boolean;
}

export function Header({
  title,
  subtitle,
  showNewRequest = false,
  showNotifications = true,
  showSearch = false,
  showProfile = true,
}: HeaderProps) {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const [isFullView, setIsFullView] = useState(false);
  const { setCurrentUser } = useAppStore();
  const [activeDropdown, setActiveDropdown] = useState<
    "profile" | "notification" | null
  >(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hasActiveVpc, setHasActiveVpc] = useState(false);

  const { data: awsConfig } = useAwsConfig();
  const API = import.meta.env.VITE_USER_MANAGEMENT_URL;

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const handleProfileNavigate = () => {
    setActiveDropdown(null); // close dropdown
    navigate("/profile", { state: { from: location.pathname } });
  };

  // ✅ One outside click handler for everything
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNewRequest || !currentUser || !open) return;
    fetchVpcListApi()
      .then((list) => {
        const mine = list.filter((v: any) => Number(v.userId) === Number(currentUser.id));
        setHasActiveVpc(mine.length > 0);
      })
      .catch(() => { });
  }, [open, showNewRequest, currentUser]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const getIcon = (eventType?: string) => {
    if (!eventType)
      return <Info className="h-4 w-4 text-blue-400 mt-1 shrink-0" />;

    if (eventType.includes("FAILED") || eventType.includes("DISCONNECTED")) {
      return <XCircle className="h-4 w-4 text-red-400 mt-1 shrink-0" />;
    }
    if (eventType.includes("PENDING") || eventType.includes("RETRY")) {
      return <Clock className="h-4 w-4 text-yellow-400 mt-1 shrink-0" />;
    }
    if (
      eventType.includes("SUCCESS") ||
      eventType.includes("CONNECTED") ||
      eventType.includes("CREATED") ||
      eventType.includes("UPDATED") ||
      eventType.includes("UPLOADED") ||
      eventType.includes("DELETED") ||
      eventType.includes("DOWNLOADED") 
    ) {
      return <CheckCircle2 className="h-4 w-4 text-green-400 mt-1 shrink-0" />;
    }
    return <Info className="h-4 w-4 text-blue-400 mt-1 shrink-0" />;
  };

  // Format timestamp
  const formatTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const visibleNotifications = isFullView
    ? notifications
    : notifications.slice(0, 3);

  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";

  const tooltipMessage = isAwsDisconnected
    ? "AWS Disconnected"
    : "";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              className="w-64 pl-9 bg-muted/50 border-border focus:bg-background"
            />
          </div>
        )}

        {showNewRequest && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    disabled={isAwsDisconnected}
                    onClick={() => setOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </span>
              </TooltipTrigger>

              {isAwsDisconnected && (
                <TooltipContent>
                  <p>{tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
       {showNewRequest && (
         <ChooseServices
           open={open}
           onClose={() => setOpen(false)}
           hasActiveVpc={hasActiveVpc}
         />
       )}
        <ThemeToggle />
        <div ref={headerRef} className="flex items-center gap-3 relative">
          {/* 🔔 Notification Button */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
               <button
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === "notification" ? null : "notification",
                    )
                  }
                  className="
                relative p-2 rounded-lg transition-all duration-200

                /* Light theme */
                hover:bg-gray-100

                /* Dark theme */
                dark:hover:bg-gray-800

                /* Hover effects */
                hover:scale-105 hover:bg-gray-200

                /* Active click effect */
                active:scale-95
              "
                >
                  <Bell className="h-5 w-5 text-gray-400" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 h-5 w-5 text-[10px]
                          bg-primary text-white rounded-full
                          flex items-center justify-center"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
            {activeDropdown === "notification" && (
              <div
  className={`
    ${
      isFullView
        ? "fixed top-16 right-0 h-[calc(100vh-70px)] w-full sm:w-[420px] z-50 border-l rounded-none flex flex-col"
        : "absolute right-0 mt-3 w-96 rounded-xl shadow-sm"
    }

    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-700

    transition-all duration-300
  `}
>
                {/* Header */}
                <div
                  className="px-4 py-4 border-b border-gray-200 dark:border-gray-800
                flex items-center justify-between"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Notifications
                  </h3>

                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-sm
                                  text-primary hover:bg-primary/10 border border-primary/20
                                  hover:border-primary/40 transition"
                          >
                            <Check className="h-3 w-3" />
                            Mark All Read
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Mark all notifications as read</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {notifications.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={clearAll}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-sm
                 text-red-400 hover:bg-red-500/10 border border-red-500/20
                 hover:border-red-500/40 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                            Clear All
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Clear all notifications</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {isFullView && (
                      <button
                        onClick={() => {
                          setIsFullView(false);
                          setActiveDropdown(null);
                        }}
                        className="text-gray-400 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* <div className="flex items-center gap-3">
                    {isFullView && (
                      <button
                        onClick={() => {
                          setIsFullView(false);
                          setActiveDropdown(null); // 👈 close entire popup
                        }}
                        className="text-gray-400 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div> */}
                </div>

                {/* ✅ Single Scroll Container */}

                <div
                  className={`
    ${isFullView ? "flex-1 overflow-y-auto no-scrollbar" : ""}
  `}
                >
                  {/* Loading */}
                  {isLoading && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  )}

                  {/* Empty */}
                  {!isLoading && notifications.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No notifications yet
                      </p>
                    </div>
                  )}

                  {!isLoading &&
                    visibleNotifications?.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => !item.isRead && markAsRead(item.id)}
                        className={`
                          flex items-start justify-between
                          gap-3 px-4 py-3
                          transition group cursor-pointer

                          ${
                            item.isRead
                              ? `
                                bg-transparent 
                                hover:bg-gray-100 
                                dark:hover:bg-gray-900
                              `
                              : `
                                bg-gray-100/70 
                                hover:bg-gray-200
                                dark:bg-gray-900/60 
                                dark:hover:bg-gray-900
                              `
                          }
                        `}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          {getIcon(item?.eventType)}

                          <div>
                            {/* Title + Blue Dot */}
                            <div className="flex items-center gap-2">
                             <p
                                className={`
                                  text-sm font-medium
                                  ${
                                    item.isRead
                                      ? "text-gray-500 dark:text-gray-400"
                                      : "text-gray-900 dark:text-white"
                                  }
                                `}
                              >
                                {item.title}
                              </p>

                              {!item.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                              )}
                            </div>

                            {/* Message */}
                            <p className="text-xs text-gray-400">
                              {item.message}
                            </p>

                            <p className="text-xs text-gray-600 mt-0.5">
                              {formatTime(item.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(item.id);
                        }}
                        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      </div>
                    ))}
                </div>

                {/* Footer */}
                {!isFullView && notifications.length > 3 && (
                  <div className="border-t border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsFullView(true)}
                    className="
                      w-full text-center px-4 py-3 text-sm font-medium
                      transition

                      /* Light theme */
                      text-blue-600 hover:bg-gray-100

                      /* Dark theme */
                      dark:text-blue-400 dark:hover:bg-gray-900
                    "
                  >
                    View All Notifications
                  </button>
                </div>
                )}
              </div>
            )}
          </div>

          {/* 👤 Profile Button */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === "profile" ? null : "profile",
                    )
                  }
                  className="
                  flex items-center gap-2 px-2 py-2
                  rounded-lg transition

                  hover:bg-gray-200 dark:hover:bg-gray-800
                "
                >
                  <Avatar
                    className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-900 dark:text-gray-100 text-sm"
                    key={currentUser?.profile_image_url || "fallback"}
                  >

                    {currentUser?.profile_image_url && (
                      <AvatarImage src={currentUser?.profile_image_url} />
                    )}
                    <AvatarFallback>
                      {currentUser?.name
                        ? currentUser?.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                        : "U"}
                    </AvatarFallback>
                  </Avatar>

                  {/**
           * <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              activeDropdown === "profile" ? "rotate-180" : ""
            }`}
          />
           */}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>

            {activeDropdown === "profile" && (
              <div
                  className="
                    absolute right-0 mt-3 w-52
                    bg-white dark:bg-gray-900
                    border border-gray-200 dark:border-gray-700
                    rounded-xl
                    shadow-sm dark:shadow-[0_0_20px_rgba(0,180,216,0.2)]
                    overflow-hidden
                  "
                >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {currentUser?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleProfileNavigate}
                  className="
                    w-full flex items-center gap-3
                    px-4 py-3 text-sm
                    transition

                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-800
                  "
                >
                  <Settings size={16} />
                  Profile Details
                </button>

                <div className="h-px border-b border-gray-200 dark:border-gray-800"></div>

                {/* Logout */}
                <button
                  className="w-full flex items-center gap-3
                                    px-4 py-3 text-sm
                                    text-red-400
                                    hover:bg-red-500/10
                                    transition"
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
    </header>
  );
}
