import {
    AlertTriangle,
    Trash2,
    Users,
} from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import type { Role } from "./ViewRoles";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    onDelete: (roleId: number) => void;
};

export default function DeleteRoleDialog({
    open,
    onOpenChange,
    role,
    onDelete,
}: Props) {
    if (!role) return null;

    const hasUsers = role.users > 0;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-lg">

                <DialogHeader>

                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">

                        <Trash2 className="h-7 w-7 text-red-600" />

                    </div>

                    <DialogTitle className="text-center text-xl">
                        Delete Role
                    </DialogTitle>

                    <DialogDescription className="text-center">

                        This action cannot be undone.

                    </DialogDescription>

                </DialogHeader>

                <div className="mt-4 rounded-lg border p-4">

                    <div className="mb-3">

                        <div className="text-sm text-muted-foreground">
                            Role Name
                        </div>

                        <div className="font-semibold text-lg">
                            {role.role}
                        </div>

                    </div>

                    <div className="flex items-center gap-2 text-sm">

                        <Users className="h-4 w-4 text-muted-foreground" />

                        <span>

                            Assigned Users:

                            <strong className="ml-1">
                                {role.users}
                            </strong>

                        </span>

                    </div>

                </div>

                {hasUsers && (

                    <div className="mt-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/20">

                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />

                        <div>

                            <div className="font-semibold text-amber-700 dark:text-amber-400">

                                This role is assigned to users.

                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">

                                Remove this role from all users before deleting it,
                                or reassign those users to another role.

                            </p>

                        </div>

                    </div>

                )}

                {!hasUsers && (

                    <div className="mt-5 rounded-lg bg-muted/40 p-4 text-sm">

                        Are you sure you want to permanently delete

                        <strong className="mx-1">

                            "{role.role}"

                        </strong>

                        role?

                    </div>

                )}

                <div className="mt-6 flex justify-end gap-3">

                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        disabled={hasUsers}
                        onClick={() => {
                            onDelete(role.id);
                            onOpenChange(false);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />

                        Delete Role

                    </Button>

                </div>

            </DialogContent>
        </Dialog>
    );
}