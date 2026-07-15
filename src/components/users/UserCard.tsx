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
  Trash2,
  Shield,
  // UserRoundPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/types";
import { isAdmin } from "@/utils/roles";
import { useDialog } from "@/components/ui/dialog-context";
import type { User } from "@/types";

// ── Role display helpers ─────────────────────────────────────────────────────
const ROLE_DISPLAY: Record<string, string> = {
  SuperAdmin: "Super Admin",
  "SplunkOps.Admin": "Admin",
  "SplunkOps.User": "User",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  SuperAdmin: "border-purple-500 text-purple-400 bg-purple-500/10",
  "SplunkOps.Admin": "border-blue-500 text-blue-400 bg-blue-500/10",
  "SplunkOps.User": "border-green-500 text-green-400 bg-green-500/10",
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
  // onDelete: () => void;
  // onReinvite: () => void;
  // onDeactivate: () => void;
  // onReactivate: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function UserCard({
  user,
  onEdit,
  // onDelete,
  // onReinvite: () => void;
  // onDeactivate,
  // onReactivate,
}: UserCardProps) {
  const { user: authUser } = useAuth();
  const { confirm } = useDialog();

  const viewerIsSuperAdmin = authUser?.role === "SuperAdmin";
  const viewerIsAdmin = isAdmin(authUser?.role);
  const userIsAdmin = isAdmin(user.role);
  const userIsSuperAdmin = user.role === "SuperAdmin";
  const isSelf = authUser?.email === user?.email;
  const canManage = viewerIsSuperAdmin || (viewerIsAdmin && !userIsAdmin);

  const usedVMs = (user.activeVMs ?? user.currentVMs ?? 0) + (user.provisioningVMs ?? 0);
  const quotaPercentage = user.maxVMs ? (usedVMs / user.maxVMs) * 100 : 0;

  const categoryCount = user.allowedCategories?.length ?? 0;
  const instanceCount = user.allowedInstanceTypes?.length ?? 0;
  const categoryLabels =
    user.allowedCategories
      ?.map((v) => CATEGORY_OPTIONS.find((c) => c.value === v)?.label.split(" - ")[0] ?? `Cat ${v}`)
      .join(", ") || "None";

  const statusBadge = user.status ? STATUS_BADGE[user.status] : null;

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

        {/* ── Action buttons ── */}
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

      {/* ── Stats row ── */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">VM Quota</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">{usedVMs}</span>
              <span className="text-sm text-muted-foreground">/ {user.maxVMs}</span>
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  quotaPercentage >= 90
                    ? "bg-destructive"
                    : quotaPercentage >= 70
                      ? "bg-warning"
                      : "bg-primary",
                )}
                style={{ width: `${quotaPercentage}%` }}
              />
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
    </div>
  );
}