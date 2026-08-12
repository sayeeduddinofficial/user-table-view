/**
 * UserCard.tsx
 * Displays a single user row with actions (edit, reinvite, deactivate, reactivate, delete).
 */

import { useAuth } from "@/hooks/useLogin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Shield,
} from "lucide-react";
import {
  EC2Icon,
  S3Icon,
  VPCIcon,
  LBIcon,
  Route53Icon,
  RDSIcon,
  EKSIcon,
} from "@/components/icons/aws-icons";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/types";
import { isAdmin } from "@/utils/roles";
import type { User } from "@/types";
import { formatTime, getTimeZoneAbbreviation } from "@/utils/workSchedule";

// ── Role display helpers ─────────────────────────────────────────────────────
const ROLE_DISPLAY: Record<string, string> = {
  SuperAdmin: "Super Admin",
  "SplunkOps.Admin": "Admin",
  "SplunkOps.User": "User",
  "SplunkOps.Auditor": "Auditor",
  "SplunkOps.Stakeholder": "Stakeholder",
  "SplunkOps.Approver": "Approver",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  SuperAdmin: "border-purple-500 text-purple-400 bg-purple-500/10",
  "SplunkOps.Admin": "border-blue-500 text-blue-400 bg-blue-500/10",
  "SplunkOps.User": "border-green-500 text-green-400 bg-green-500/10",
  "SplunkOps.Stakeholder": "border-[#F28E2B] text-[#F28E2B] bg-[#F28E2B]/10",
  "SplunkOps.Auditor": "border-[#EDC948] text-[#EDC948] bg-[#EDC948]/10",
  "SplunkOps.Approver": "border-[#00a2b1] text-[#00a2b1] bg-[#00a2b1]/10",
};



const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  // INVITED: {
  //   label: "Invited",
  //   className: "border-yellow-500 text-yellow-400 bg-yellow-500/10",
  // },
  DEACTIVATED: {
    label: "Deactivated",
    className: "border-red-500 text-red-400 bg-red-500/10",
  },
  ACTIVE: {
    label: "Active",
    className: "border-green-500 text-green-400 bg-green-500/10",
  },
};

// ── Props ────────────────────────────────────────────────────────────────────
interface UserCardProps {
  user: User;
  onEdit: () => void;
}

interface ServiceQuota {
  label: string;
  icon: (props: { className?: string; size?: number; style?: React.CSSProperties }) => JSX.Element;
  color: string;
  max?: number;
  used?: number;
}

const SERVICE_COLORS: Record<string, string> = {
  EC2: "#3B82F6",
  VPC: "#8B5CF6",
  "Load Balancers": "#F97316",
  S3: "#10B981",
  RDS: "#06B6D4",
  Route53: "#EC4899",
  "Route 53": "#EC4899",
  EKS: "#FACC15",
};

// ── Component ────────────────────────────────────────────────────────────────
export function UserCard({
  user,
  onEdit,
}: UserCardProps) {
  const { user: authUser } = useAuth();
  const viewerIsSuperAdmin = authUser?.role === "SuperAdmin";
  const viewerIsAdmin = isAdmin(authUser?.role);
  const userIsAdmin = isAdmin(user.role);
  const userIsSuperAdmin = user.role === "SuperAdmin";
  const canManage = viewerIsSuperAdmin || (viewerIsAdmin && !userIsAdmin);
  const usedVMs = (user.activeVMs ?? user.currentVMs ?? 0) + (user.provisioningVMs ?? 0);
  const categoryCount = user.allowedCategories?.length ?? 0;
  const instanceCount = user.allowedInstanceTypes?.length ?? 0;
  const categoryLabels =
    user.allowedCategories
      ?.map((v) => CATEGORY_OPTIONS.find((c) => c.value === v)?.label.split(" - ")[0] ?? `Cat ${v}`)
      .join(", ") || "None";

  const statusBadge = user.status ? STATUS_BADGE[user.status] : null;

  const serviceQuotas: ServiceQuota[] = [
    { label: "EC2", icon: EC2Icon, color: SERVICE_COLORS.EC2, used: usedVMs, max: user.maxVMs },
    { label: "S3", icon: S3Icon, color: SERVICE_COLORS.S3, used: user.currentBuckets, max: user.maxBuckets },
    { label: "RDS", icon: RDSIcon, color: SERVICE_COLORS.RDS, used: user.currentRdsClusters, max: user.maxRdsClusters },
    { label: "EKS", icon: EKSIcon, color: SERVICE_COLORS.EKS, used: user.currentEksClusters, max: user.maxEksClusters },
    { label: "VPC", icon: VPCIcon, color: SERVICE_COLORS.VPC, used: user.currentVpcs, max: user.maxVpcs },
    { label: "LB", icon: LBIcon, color: SERVICE_COLORS["Load Balancers"], used: user.currentLoadBalancers, max: user.maxLoadBalancers },
    { label: "Route 53", icon: Route53Icon, color: SERVICE_COLORS["Route 53"], used: user.currentDnsRecords, max: user.maxDnsRecords },
  ];


  return (
    <div className="glass-panel rounded-xl p-5 hover:border-primary/30 transition-colors">
      {/* ── Top row: avatar + name + actions ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-border" key={user?.profile_image_url || "fallback"}>
            {user?.profile_image_url && <AvatarImage src={user?.profile_image_url} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.name
                ? user?.name.split(" ").map((n) => n[0]).join("")
                : "U"}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2 ">
              <p className="font-medium text-foreground">{user.name}</p>

              <Badge
                variant="outline"
                className={cn(
                  "capitalize text-xs flex items-center gap-1",
                  ROLE_BADGE_CLASS[user.role] ?? "",
                )}
              >
                {(userIsSuperAdmin || userIsAdmin) && <Shield className="h-3 w-3" />}
                {ROLE_DISPLAY[user.role] ?? user.role}
              </Badge>

              {statusBadge && (
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* ── action buttons ── */}
        <div className="flex items-start gap-4">
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit} tooltip="Edit User">
              <Pencil className="h-4 w-4" />
            </Button>

            {/* {user.status === "INVITED" && (
              <Button
                variant="ghost"
                size="icon"
                tooltip="Reinvite User"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Send a new invitation email to "${user.name}" (${user.email})?`,
                    icon: "info",
                  });
                  if (ok) onReinvite();
                }}
              >
                <UserRoundPlus className="h-4 w-4 text-yellow-500" />
              </Button>
            )} */}

            {/* {user.status === "ACTIVE" &&
              !isSelf &&
              !(viewerIsSuperAdmin && userIsSuperAdmin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  tooltip="Deactivate User"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Deactivate user "${user.name}"?`,
                      icon: "destroy",
                    });
                    if (ok) onDeactivate();
                  }}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              )} */}

            {/* {user.status === "DEACTIVATED" && (
              <Button
                variant="ghost"
                size="icon"
                tooltip="Reactivate User"
                onClick={onReactivate}
              >
                <UserCheck className="h-4 w-4 text-green-500" />
              </Button>
            )} */}

            {/* {!isSelf && !(viewerIsSuperAdmin && userIsSuperAdmin) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                tooltip="Delete User"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )} */}
          </div>
        )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Working Hours</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium">{formatTime(user.workStartTime)} - {formatTime(user.workEndTime)} {getTimeZoneAbbreviation(user.timeZone)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Allowed Instances</p>
            <p className="text-sm font-medium">
              {instanceCount} {instanceCount === 1 ? "type" : "types"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Allowed Categories</p>
            <p className="text-sm font-medium" title={categoryLabels}>
              {categoryCount} {categoryCount === 1 ? "category" : "categories"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Member Since</p>
            <p className="text-sm font-medium">
              {user.status === "INVITED"
                ? "Invitation Sent"
                : new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Service quota row ── */}
      <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground pb-2">Service Quotas</p>
        
        <div className="flex flex-wrap items-stretch gap-3">
          {serviceQuotas.map((q) => {
            const Icon = q.icon;
            const hasUsage = q.used !== undefined;
            return (
              <div
                key={q.label}
                className="flex items-center gap-2 rounded-sm border px-2 py-1 min-w-[92px]"
                style={{ borderColor: `${q.color}50` }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${q.color}20` }}
                >
                  <Icon size={15} className="shrink-0" style={{ color: `${q.color}60` }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-foreground truncate">{q.label}</span>
                  <span className="text-sm pt-0">
                    {hasUsage ? (
                      <>
                        <span className="font-semibold">{q.used}</span>
                        <span className="font-normal text-xs text-muted-foreground"> / {q.max ?? "—"}</span>
                      </>
                    ) : (
                      <span className="font-semibold">{q.max ?? "—"}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}