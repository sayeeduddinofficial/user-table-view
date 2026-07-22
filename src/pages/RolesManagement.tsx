import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from '@/components/layout/Header';
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

const users = [
  {
    id: 1,
    name: "John Anderson",
    email: "john.anderson@company.com",
    role: "Administrator",
    status: "Active",
  },
  {
    id: 2,
    name: "Sophia Miller",
    email: "sophia.miller@company.com",
    role: "DevOps Engineer",
    status: "Active",
  },
  {
    id: 3,
    name: "William Brown",
    email: "william.brown@company.com",
    role: "Developer",
    status: "Inactive",
  },
  {
    id: 4,
    name: "Emma Wilson",
    email: "emma.wilson@company.com",
    role: "Read Only",
    status: "Inactive",
  },
  {
    id: 5,
    name: "Michael Davis",
    email: "michael.davis@company.com",
    role: "Support",
    status: "Active",
  },
];

export type Permission = {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};
const roles = [
  "Administrator",
  "DevOps Engineer",
  "Developer",
  "Read Only",
  "Support",
];





export default function RolesManagement() {
    const [userList, setUserList] = useState(users);

const [selectedUser, setSelectedUser] = useState<(typeof users)[0] | null>(null);

const [dialogOpen, setDialogOpen] = useState(false);

const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
const [deleteOpen, setDeleteOpen] = useState(false);
const [userFilter, setUserFilter] = useState<
  "all" | "active" | "inactive" | "roles"
>("all");

const userCounts = {
  all: userList.length,
  active: userList.filter((u) => u.status === "Active").length,
  inactive: userList.filter((u) => u.status === "Inactive").length,
  roles: [...new Set(userList.map((u) => u.role))].length,
};

const stats = [
  {
    key: "all" as const,
    label: "Total Users",
    value: userCounts.all,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    key: "active" as const,
    label: "Active Users",
    value: userCounts.active,
    icon: UserCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "roles" as const,
    label: "Available Roles",
    value: userCounts.roles,
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "inactive" as const,
    label: "Inactive Users",
    value: userCounts.inactive,
    icon: UserX,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
];

    const navigate = useNavigate();

    const handleSave = () => {
  if (!selectedUser) return;

  setUserList((prev) =>
    prev.map((u) =>
      u.id === selectedUser.id ? selectedUser : u
    )
  );

  setDialogOpen(false);
};
const handleDelete = () => {
  if (!selectedUser) return;

  setUserList((prev) =>
    prev.filter((user) => user.id !== selectedUser.id)
  );

  setDeleteOpen(false);
  setSelectedUser(null);
};
  
  return (
     <div className="space-y-4">
              <Header
                title="Roles Management"
                subtitle="Manage user roles and permissions within the application."
                showSearch={false}
              />
              <div className="space-y-4 p-6">

  {/* Header */}
  <div className="flex items-center justify-between">

    <div>
      <h2 className="text-xl font-semibold">
        All Users
      </h2>

      <p className="text-sm text-muted-foreground">
        Manage user roles and permissions
      </p>
    </div>

    <div className="flex gap-3">

      <Button
            onClick={() => navigate("/roles/viewroles")}
            >
            <ShieldCheck className="mr-2 h-4 w-4" />
            View Roles
            </Button>
    </div>

  </div>

  {/* Stats */}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-3">
  {stats.map((s) => {
    const Icon = s.icon;
    const active = userFilter === s.key;

    return (
      <button
        key={s.key}
        type="button"
        onClick={() => setUserFilter(s.key)}
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border bg-card/50 backdrop-blur px-4 py-3 text-left transition-colors",
          active
            ? "border-primary ring-1 ring-primary/40"
            : "border-border/50 hover:border-primary/30"
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {s.label}
          </p>

          <p className="mt-1 text-2xl font-bold leading-tight text-foreground">
            {s.value}
          </p>
        </div>

        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            s.bg
          )}
        >
          <Icon className={cn("h-5 w-5", s.color)} />
        </div>
      </button>
    );
  })}
</div>

  {/* Table */}

  <div className="overflow-hidden rounded-xl border border-border bg-card">

    <div className="overflow-x-auto">

      <table className="w-full text-sm min-w-[1200px]">

        <thead className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">

          <tr className="border-b bg-muted/40">

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
              User
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
              Email
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
              Role
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
              Status
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider">
              Actions
            </th>

          </tr>

        </thead>

        <tbody>

          {userList.map((user) => (

            <tr
              key={user.id}
              className="border-b last:border-none hover:bg-accent/30 transition-colors"
            >

              <td className="px-6 py-4 font-medium">
                {user.name}
              </td>

              <td className="px-6 py-4 text-muted-foreground">
                {user.email}
              </td>

              <td className="px-6 py-4">
                {user.role}
              </td>

              <td className="px-6 py-4">

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium
                    ${
                      user.status === "Active"
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                        : user.status === "Inactive"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400"
                    }`}
                >
                  {user.status}
                </span>

              </td>

              <td className="px-6 py-4">

                <div className="flex justify-end gap-2">

                  <button
                    className="rounded-md p-2 text-muted-foreground hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-500/15"
                    onClick={() => {
                        setSelectedUser({ ...user });
                        setDialogMode("view");
                        setDialogOpen(true);
                    }}
                    >
                    <Eye size={16} />
                    </button>

                <button
                    className="rounded-md p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                        setSelectedUser({ ...user });
                        setDialogMode("edit");
                        setDialogOpen(true);
                    }}
                    >
                    <Pencil size={16} />
                    </button>

                  <button
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                    onClick={() => {
                        setSelectedUser(user);
                        setDeleteOpen(true);
                    }}
                    >
                    <Trash2 size={16} />
                    </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>

</div>
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="max-w-lg">

    <DialogHeader>
      <DialogTitle>
        {dialogMode === "view" ? "View User" : "Edit User"}
      </DialogTitle>
    </DialogHeader>

    {selectedUser && (
      <div className="space-y-5">

        <div>
          <label className="mb-2 block text-sm font-medium">
            Name
          </label>

          <Input
            value={selectedUser.name}
            disabled
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email
          </label>

          <Input
            value={selectedUser.email}
            disabled
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Role
          </label>

          {dialogMode === "view" ? (
            <Input
              value={selectedUser.role}
              disabled
            />
          ) : (
            <Select
              value={selectedUser.role}
              onValueChange={(value) =>
                setSelectedUser({
                  ...selectedUser,
                  role: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {roles.map((role) => (
                  <SelectItem
                    key={role}
                    value={role}
                  >
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Status
          </label>

          {dialogMode === "view" ? (
            <Input
              value={selectedUser.status}
              disabled
            />
          ) : (
            <Select
              value={selectedUser.status}
              onValueChange={(value) =>
                setSelectedUser({
                  ...selectedUser,
                  status: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
          >
            {dialogMode === "view" ? "Close" : "Cancel"}
          </Button>

          {dialogMode === "edit" && (
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          )}
        </div>

      </div>
    )}

  </DialogContent>
</Dialog>

<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <DialogContent className="max-w-md">

    <DialogHeader>
      <DialogTitle className="text-red-600">
        Delete User
      </DialogTitle>
    </DialogHeader>

    {selectedUser && (
      <>
        <div className="py-2 space-y-3">

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this user?
          </p>

          <div className="rounded-lg border bg-muted/30 p-4">

            <div className="space-y-2">

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Name
                </span>

                <span className="font-medium">
                  {selectedUser.name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Email
                </span>

                <span className="font-medium">
                  {selectedUser.email}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Role
                </span>

                <span className="font-medium">
                  {selectedUser.role}
                </span>
              </div>

            </div>

          </div>

          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            This action cannot be undone.
          </div>

        </div>

        <div className="flex justify-end gap-3 pt-4">

          <Button
            variant="outline"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            Delete User
          </Button>

        </div>

      </>
    )}

  </DialogContent>
</Dialog>
</div>
  )
}
