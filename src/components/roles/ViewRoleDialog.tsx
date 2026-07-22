import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import PermissionTable from "./PermissionTable";
import type { Role } from "./ViewRoles.tsx";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
};

export default function ViewRoleDialog({
    open,
    onOpenChange,
    role,
}: Props) {
    if (!role) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl p-0 overflow-hidden">

    {/* Header */}
    <DialogHeader className="border-b border-border/60 px-6 py-5">

      <DialogTitle className="text-2xl font-semibold tracking-tight">
        View Role
      </DialogTitle>

      <p className="mt-1 text-sm text-muted-foreground">
        Review role information and assigned permissions.
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

          {/* Role */}

          <div className="rounded-md border border-border/60 bg-muted/20 p-3">

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Role Name
            </p>

            <p className="mt-2 text-lg font-semibold text-foreground">
              {role.role}
            </p>

          </div>

          {/* Status */}

          <div className="rounded-md border border-border/60 bg-muted/20 p-3">

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Status
            </p>

            <div className="mt-2">

              <Badge
                className={
                  role.status === "Active"
                    ? "border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/10"
                    : "border border-slate-600 bg-slate-500/10 text-slate-400 hover:bg-slate-500/10"
                }
              >
                {role.status}
              </Badge>

            </div>

          </div>

          {/* Users */}

          <div className="rounded-md border border-border/60 bg-muted/20 p-3">

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Assigned Users
            </p>

            <p className="mt-2 text-lg font-semibold">
              {role.users}
            </p>

          </div>

        </div>

      </div>

      {/* Workspace */}

      <div className="rounded-lg border border-border/60 bg-card">

        <div className="p-4">

          <PermissionTable
            title="Workspace Permissions"
            permissions={role.workspace}
            mode="view"
            />

        </div>

      </div>

      {/* Services */}

      <div className="rounded-lg border border-border/60 bg-card">

        <div className="p-4">

         <PermissionTable
            title="Service Permissions"
            permissions={role.services}
            mode="view"
/>

        </div>

      </div>

      {/* Administration */}

      <div className="rounded-lg border border-border/60 bg-card">

        <div className="p-4">

            <PermissionTable
            title="Administration Permissions"
            permissions={role.administration}
            mode="view"
            />

        </div>

      </div>

    </div>

    {/* Footer */}

    <div className="flex justify-end gap-3 border-t border-border/60 bg-card px-6 py-4">

      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Close
      </Button>

    </div>

  </DialogContent>
</Dialog>
    );
}