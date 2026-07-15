import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notificationApi";
import type { Notification, NotificationRaw } from "@/types/api";
import { env } from "@/lib/env";

// Mapper function
const mapNotification = (n: NotificationRaw): Notification => ({
  id: n.id,
  service: n.service,
  eventType: n.event_type,
  title: n.title,
  message: n.message,
  metadata: n.metadata,
  isRead: n.is_read,
  createdAt: n.created_at,
});

const SOCKET_URL = env.socket;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const token = localStorage.getItem("token");

  // ─── Fetch existing notifications from DB on mount ──────────────────────────
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await fetchNotifications();
      const lastCleared = localStorage.getItem("notifications_last_cleared");
      const deletedIds = JSON.parse(
        localStorage.getItem("deleted_notifications") || "[]",
      );
      const filtered = (
        lastCleared
          ? data.filter((n) => new Date(n.createdAt) > new Date(lastCleared))
          : data
      ).filter((n) => !deletedIds.includes(n.id));
      setNotifications(filtered);
      setUnreadCount(filtered.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("[Notifications] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "notifications_last_cleared") {
        const lastCleared = event.newValue;
        if (!lastCleared) return;

        setNotifications((prev) => {
          const filtered = prev.filter(
            (n) => new Date(n.createdAt) > new Date(lastCleared),
          );

          setUnreadCount(filtered.filter((n) => !n.isRead).length);

          return filtered;
        });
      }

      if (event.key === "deleted_notifications") {
        const deletedIds = JSON.parse(event.newValue || "[]");

        setNotifications((prev) => {
          const filtered = prev.filter((n) => !deletedIds.includes(n.id));

          setUnreadCount(filtered.filter((n) => !n.isRead).length);

          return filtered;
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
  }, []);

  // ─── Connect socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    loadNotifications();

    // Connect to notification service
    const socket = io(SOCKET_URL, {
      path: "/notification-service/socket.io",
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected to notification service");
    });

    // Real-time new notification pushed from backend
    socket.on("notification:new", (notification: NotificationRaw) => {
      const mapped = mapNotification(notification);

      const lastCleared = localStorage.getItem("notifications_last_cleared");

      const deletedIds: string[] = JSON.parse(
        localStorage.getItem("deleted_notifications") || "[]",
      );

      if (deletedIds.includes(mapped.id)) return;

      if (lastCleared && new Date(mapped.createdAt) <= new Date(lastCleared)) {
        return;
      }

      setNotifications((prev) => [mapped, ...prev]);
      setUnreadCount((prev) => prev + 1);

      audioRef.current?.play().catch(() => {});
    });

    // ── Single notification updated ──
    socket.on(
      "notification_updated",
      (data: { id: string; isRead: boolean }) => {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === data.id);

          if (target && !target.isRead && data.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }

          return prev.map((n) =>
            n.id === data.id ? { ...n, isRead: data.isRead } : n,
          );
        });
      },
    );

    // ── All notifications marked as read ──
    socket.on("notifications_mark_all_read", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // ─── Mark single as read ─────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);

      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    });

    try {
      await markNotificationRead(id); //apiClient
    } catch (err) {
      console.error("[Notifications] Mark read error:", err);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((c) => c + 1);
    }
  };

  // ─── Mark all as read ────────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead(); //apiClient
    } catch (err) {
      console.error("[Notifications] Mark all read error:", err);
    }
  };

  // ─── Delete locally (no backend delete endpoint needed) ──────────────────────
  const deleteNotification = (id: string) => {
    const deleted: string[] = JSON.parse(
      localStorage.getItem("deleted_notifications") || "[]",
    );

    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem("deleted_notifications", JSON.stringify(deleted));
    }

    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      return prev.filter((n) => n.id !== id);
    });
  };

  // ─── Clear all notifications locally ─────────────────────────────────────────
  const clearAll = () => {
    const now = new Date().toISOString();

    localStorage.setItem("notifications_last_cleared", now);

    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
