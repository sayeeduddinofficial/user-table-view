/**
 * UserManagement.tsx
 * Top-level orchestrator using React Query hooks
 */

import { useMemo, useState } from "react";
import { Search, Users as UsersIcon, ShieldCheck, ShieldAlert, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useLogin";
// import { isAdmin } from "@/utils/roles";
import { useDialog } from "@/components/ui/dialog-context";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserCard } from "./UserCard";
import { UserForm, type UserFormValues } from "./UserForm";
import {
  useUsers,
  // useCreateUser,
  useUpdateUser,
  // useDeleteUser,
  // useReinviteUser,
  // useToggleUserActive,
} from "@/hooks/useUserManagement";
import type { User } from "@/types";

export function UserManagement() {
  const { user: authUser } = useAuth();
  const { confirm } = useDialog();
  // const admin = isAdmin(authUser?.role);

  // React Query hooks
  const { data: users = [], isLoading } = useUsers();
  // const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  // const deleteUserMutation = useDeleteUser();
  // const reinviteUserMutation = useReinviteUser();
  // const toggleUserActiveMutation = useToggleUserActive();

  // const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "SuperAdmin" | "SplunkOps.Admin" | "SplunkOps.User">("all");

  // ── Handlers ─────────────────────────────────────────────────────────────
  // async function handleCreate(values: UserFormValues) {
  //   await createUserMutation.mutateAsync({
  //     displayName: values.name,
  //     email: values.email,
  //     entraObjectId: values.entraObjectId,
  //     role: values.role,
  //     maxVMs: values.maxVMs,
  //     allowedInstanceTypes: values.allowedInstanceTypes,
  //     allowedCategories: values.allowedCategories as number[],
  //     timeZone: values.timeZone,
  //     workStartTime: values.workStartTime,
  //     workEndTime: values.workEndTime,
  //   });
  //   setIsAddDialogOpen(false);
  // }

  async function handleUpdate(values: UserFormValues) {
    if (!editingUser) return;
    const userId = editingUser.entraObjectId || editingUser.id;
    
    await updateUserMutation.mutateAsync({
      userId,
      payload: {
        displayName: values.name,
        // role: values.role,
        maxVMs: values.maxVMs,
        allowedInstanceTypes: values.allowedInstanceTypes,
        allowedCategories: Array.from(new Set(values.allowedCategories)) as number[],
        adminEmail: authUser?.email,
        timeZone: values.timeZone,
        workStartTime: values.workStartTime,
        workEndTime: values.workEndTime,
      },
    });
    setEditingUser(null);
  }

  // async function handleDelete(user: User) {
  //   const confirmed = await confirm({
  //     title: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
  //     icon: "destroy",
  //   });
  //   if (!confirmed) return;

  //   const userId = user.entraObjectId || user.id;
  //   await deleteUserMutation.mutateAsync(userId);
  // }

  // async function handleReinvite(user: User) {
  //   const userId = user.entraObjectId || user.id;
  //   await reinviteUserMutation.mutateAsync(userId);
  // }

  // async function handleToggleActive(user: User, action: "deactivate" | "reactivate") {
  //   await toggleUserActiveMutation.mutateAsync({
  //     entraObjectId: user.entraObjectId,
  //     action,
  //   });
  // }

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  // ── Filtering ────────────────────────────────────────────────────────────
  const roleCounts = useMemo(() => ({
    all: users.length,
    SuperAdmin: users.filter((u) => u.role === "SuperAdmin").length,
    "SplunkOps.Admin": users.filter((u) => u.role === "SplunkOps.Admin").length,
    "SplunkOps.User": users.filter((u) => u.role === "SplunkOps.User").length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const stats = [
    { key: "all" as const, label: "Total Users", value: roleCounts.all, icon: UsersIcon, color: "text-primary", bg: "bg-primary/10" },
    { key: "SuperAdmin" as const, label: "Super Admins", value: roleCounts.SuperAdmin, icon: ShieldAlert, color: "text-purple-400", bg: "bg-purple-500/10" },
    { key: "SplunkOps.Admin" as const, label: "Admins", value: roleCounts["SplunkOps.Admin"], icon: ShieldCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
    { key: "SplunkOps.User" as const, label: "Users", value: roleCounts["SplunkOps.User"], icon: UserIcon, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage user access and VM quotas
          </p>
        </div>
      </div>

      {/* Stat cards (click to filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const active = roleFilter === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setRoleFilter(s.key)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border bg-card/50 backdrop-blur px-4 py-3 text-left transition-colors",
                active ? "border-primary ring-1 ring-primary/40" : "border-border/50 hover:border-primary/30"
              )}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-foreground leading-tight mt-1">
                  {s.value}
                </p>
              </div>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", s.bg)}>
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + role filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 bg-card/50 border-border/50"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-[220px] bg-card/50 border-border/50">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="SuperAdmin">Super Admin</SelectItem>
            <SelectItem value="SplunkOps.Admin">Admin</SelectItem>
            <SelectItem value="SplunkOps.User">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing <span className="text-foreground font-medium">{filteredUsers.length}</span> of{" "}
        <span className="text-foreground font-medium">{users.length}</span> users
      </p>

      {/* User list */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card/30 py-12 text-center text-sm text-muted-foreground">
            No users match your filters.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={() => setEditingUser(user)}
            />
          ))
        )}
      </div>


      {/* Add dialog */}
      {/* <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="max-w-xl w-[95vw] max-h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Add a new user and configure their VM quota and allowed instance types.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="model-scroll-hide flex-1 overflow-y-auto p-6">
            <UserForm
              onSubmit={handleCreate}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog> */}

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details, quotas, and allowed instance types.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="model-scroll-hide flex-1 overflow-y-auto p-6">
            {editingUser && (
              <UserForm
                user={editingUser}
                onSubmit={handleUpdate}
                onCancel={() => setEditingUser(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}