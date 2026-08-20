import type { Role } from "@/types";

export const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: "Super Admin",
  "SplunkOps.Admin": "Admin",
  "SplunkOps.User": "User",
  "SplunkOps.Auditor": "Auditor",
  "SplunkOps.Stakeholder": "Stakeholder",
  "SplunkOps.Approver": "Approver",
};

export const isAdmin = (role?: Role | string) =>
  role === "SplunkOps.Admin" || role === "SuperAdmin";

export const isDeveloper = (role?: Role | string) =>
  role === "SplunkOps.User";

export const isSuperAdmin = (role?: Role | string) => 
  role === "SuperAdmin";

export const isAdminUser = (role?: Role | string) =>
  role === "SplunkOps.Admin";

export const isApprover = (role?: Role | string) =>
  role === "SplunkOps.Approver";

export const canApproveRequests = (role?: Role | string) =>
  role === "SplunkOps.Admin" || role === "SuperAdmin" || role === "SplunkOps.Approver";

export const canViewDashboard = (role?: Role | string) =>
  role === "SplunkOps.Admin" || role === "SuperAdmin" || role === "SplunkOps.Stakeholder";

export const canViewAuditLogs = (role?: Role | string) =>
  role === "SplunkOps.Admin" || role === "SuperAdmin" || role === "SplunkOps.Auditor";

export const canViewFinOps = (role?: Role | string) =>
  role === "SplunkOps.Admin" || role === "SuperAdmin" || role === "SplunkOps.Auditor" || role === "SplunkOps.Stakeholder" || role === "SplunkOps.Approver";
