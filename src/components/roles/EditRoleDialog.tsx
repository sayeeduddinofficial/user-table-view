import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import PermissionTable from "./PermissionTable";
import type { Role, Permission } from "./ViewRoles";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    onSave: (role: Role) => void;
};

export default function EditRoleDialog({
    open,
    onOpenChange,
    role,
    onSave,
}: Props) {
    const [editedRole, setEditedRole] = useState<Role | null>(null);

    useEffect(() => {
        if (role) {
            setEditedRole(structuredClone(role));
        }
    }, [role]);

    if (!editedRole) return null;

    const updatePermission = (
        section: "workspace" | "services" | "administration",
        module: string,
        field: keyof Permission,
        value: boolean
    ) => {
        setEditedRole((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [module]: {
                        ...(prev[section] as any)[module],
                        [field]: value,
                    },
                },
            };
        });
    };

    return (
       <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl p-0 overflow-hidden">

    {/* Header */}

    <DialogHeader className="border-b border-border/60 px-6 py-5">

      <DialogTitle className="text-2xl font-semibold tracking-tight">
        Edit Role
      </DialogTitle>

      <p className="mt-1 text-sm text-muted-foreground">
        Update role details and manage permissions.
      </p>

    </DialogHeader>

    <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5">

      {/* Role Information */}

      <div className="rounded-lg border border-border/60 bg-card">

        <div className="border-b border-border/60 px-4 py-3">

          <h3 className="text-base font-semibold">
            Role Information
          </h3>

        </div>

        <div className="grid grid-cols-3 gap-3 p-4">

          {/* Role Name */}

          <div className="space-y-2">

            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Role Name
            </label>

            <Input
              value={editedRole.role}
              onChange={(e) =>
                setEditedRole({
                  ...editedRole,
                  role: e.target.value,
                })
              }
            />

          </div>

          {/* Status */}

          <div className="space-y-2">

            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </label>

            <Select
              value={editedRole.status}
              onValueChange={(value) =>
                setEditedRole({
                  ...editedRole,
                  status: value as "Active" | "Inactive",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="Active">
                  Active
                </SelectItem>

                <SelectItem value="Inactive">
                  Inactive
                </SelectItem>

              </SelectContent>

            </Select>

          </div>

          {/* Users */}

          <div className="space-y-2">

            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assigned Users
            </label>

            <Input
              type="number"
              value={editedRole.users}
              onChange={(e) =>
                setEditedRole({
                  ...editedRole,
                  users: Number(e.target.value),
                })
              }
            />

          </div>

        </div>

      </div>

      {/* Workspace */}

      <div className="rounded-lg border border-border/60 bg-card p-4">

        <PermissionTable
          title="Workspace Permissions"
          permissions={editedRole.workspace}
          mode="edit"
          onChange={(module, field, value) =>
            updatePermission(
              "workspace",
              module,
              field,
              value
            )
          }
        />

      </div>

      {/* Services */}

      <div className="rounded-lg border border-border/60 bg-card p-4">

        <PermissionTable
          title="Service Permissions"
          permissions={editedRole.services}
          mode="edit"
          onChange={(module, field, value) =>
            updatePermission(
              "services",
              module,
              field,
              value
            )
          }
        />

      </div>

      {/* Administration */}

      <div className="rounded-lg border border-border/60 bg-card p-4">

        <PermissionTable
          title="Administration Permissions"
          permissions={editedRole.administration}
          mode="edit"
          onChange={(module, field, value) =>
            updatePermission(
              "administration",
              module,
              field,
              value
            )
          }
        />

      </div>

    </div>

    {/* Footer */}

    <div className="flex justify-end gap-3 border-t border-border/60 bg-card px-6 py-4">

      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>

      <Button
        onClick={() => {
          onSave(editedRole);
          onOpenChange(false);
        }}
      >
        Save Changes
      </Button>

    </div>

  </DialogContent>
</Dialog>
    );
}