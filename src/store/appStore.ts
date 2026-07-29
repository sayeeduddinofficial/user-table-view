import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, VMRequest, TerraformLog } from "@/types";
import {env} from "@/lib/env";

interface AppState {
  currentUser: User | null;
  users: User[];
  requests: VMRequest[];
  requestsLoading?: boolean;
  logs: TerraformLog[];
  activeRequestId: string | null;
  activeService: string | null;
  activeOperation: string | null;
  sidebarOpen: boolean;
  authLoading?: boolean;
  requestsRefreshKey: number;
  vpcs: any[]; 
  vpcsLoading: boolean;
  maxVpcs?: number;

  // Actions
  setCurrentUser: (
    userOrUpdater: User | null | ((prev: User | null) => User | null),
  ) => void;
  refreshCurrentUser: () => Promise<void>;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addRequest: (request: VMRequest) => void;
  updateRequest: (id: string, updates: Partial<VMRequest>) => void;
  addLog: (log: TerraformLog) => void;
  clearLogs: (requestId: string) => void;
  setActiveRequest: (id: string | null, service?: string | null, operation?: string | null) => void;
  toggleSidebar: () => void;
  fetchRequests: () => Promise<void>;
  triggerRequestsRefresh: () => void;
  setVpcs: (vpcs: any[]) => void;
  addVpc: (vpc: any) => void;
  deleteVpc: (id: string) => void;
}
const API_BASE = env.auth;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      users: [],
      requests: [],
      logs: [],
      activeRequestId: null,
      activeService: null,
      activeOperation: null,
      sidebarOpen: true,
      authLoading: true,
      requestsLoading: false,
      requestsRefreshKey: 0,

      vpcs: [],
      vpcsLoading: false,

      setCurrentUser: (userOrUpdater) =>
        set((state) => ({
          currentUser:
            typeof userOrUpdater === "function"
              ? userOrUpdater(state.currentUser)
              : userOrUpdater,
        })),
      refreshCurrentUser: async () => {
        set({ authLoading: true });

        const rawToken = localStorage.getItem("token");
        if (!rawToken) {
          set({ authLoading: false });
          return;
        }

        try {
         const response = await axios.get(`${API_BASE}/api/auth/me`); 

          const user = response?.data?.user;

          if (!user) {
            set({ authLoading: false });
            return;
          }

          set({
            currentUser: user,
            authLoading: false,
          });
        } catch (err) {
          console.warn("Error refreshing user", err);
          set({ authLoading: false });
        }
      },

      setUsers: (users) => set({ users }),

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),

      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, ...updates } : u,
          ),
        })),

      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        })),

      addRequest: (request) =>
        set((state) => ({ requests: [request, ...state.requests] })),

      updateRequest: (id, updates) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        })),

      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

      clearLogs: (requestId) =>
        set((state) => ({
          logs: state.logs.filter((l) => l.requestId !== requestId),
        })),

      setActiveRequest: (id, service = null, operation = null) =>
      set({ activeRequestId: id, activeService: service ?? null, activeOperation: operation ?? null }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      triggerRequestsRefresh: () =>
        set((state) => ({ requestsRefreshKey: state.requestsRefreshKey + 1 })),

      fetchRequests: async () => {
        set({ requestsLoading: true });

        try {
          const token = localStorage.getItem("token");

          if (!token) {
            set({ requestsLoading: false });
            return;
          }

         const response = await axios.get(`${env.vmRequest}/api/requests`);
         const data = response.data;

          const requestData = Array.isArray(data) ? data : data?.data ?? [];

          set({
            requests: requestData,
            requestsLoading: false,
          });
        } catch (err) {
          console.error("Error fetching requests:", err);
          set({ requestsLoading: false });
        }
      },
      setVpcs: (vpcs) => set({ vpcs }),

      addVpc: (vpc) => set((state) => ({ vpcs: [vpc, ...state.vpcs] })),

      deleteVpc: (id) =>
        set((state) => ({
          vpcs: state.vpcs.filter((v) => v.id !== id),
        })),
    }),

    {
      name: "app-store", // stored in localStorage
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);


