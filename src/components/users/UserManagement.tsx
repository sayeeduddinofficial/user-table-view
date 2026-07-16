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

        {/* {admin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )} */}
      </div>

      {/* User list */}
      <div className="grid gap-4">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onEdit={() => setEditingUser(user)}
            // onDelete={() => handleDelete(user)}
            // onReinvite={() => handleReinvite(user)}
            // onDeactivate={() => handleToggleActive(user, "deactivate")}
            // onReactivate={() => handleToggleActive(user, "reactivate")}
          />
        ))}
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