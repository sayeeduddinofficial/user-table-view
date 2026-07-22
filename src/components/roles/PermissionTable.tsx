import { Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export type Permission = {
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
};

export type PermissionTableProps = {
    title: string;
    permissions: Record<string, Permission>;
    mode?: "view" | "edit";
    onChange?: (
        module: string,
        field: keyof Permission,
        value: boolean
    ) => void;
};

export default function PermissionTable({
    title,
    permissions,
    mode = "view",
    onChange,
}: PermissionTableProps) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">

            {/* Header */}

            <div className="border-b bg-muted/40 px-4 py-3">

                <h3 className="font-normal">{title}</h3>

            </div>

            <table className="w-full">

                <thead>

                    <tr className="border-b bg-muted/20">

                        <th className="px-4 py-3 text-left w-56 text-xs font-light text-muted-foreground uppercase tracking-wide">
                            Module
                        </th>

                        <th className="w-14 px-2 py-2 text-center text-xs font-light text-muted-foreground uppercase tracking-wide">
                            Read
                        </th>

                        <th className="w-14 px-2 py-2 text-center text-xs font-light text-muted-foreground uppercase tracking-wide">
                            Create
                        </th>

                        <th className="w-14 px-2 py-2 text-center text-xs font-light text-muted-foreground uppercase tracking-wide">
                            Edit
                        </th>

                        <th className="w-14 px-2 py-2 text-center text-xs font-light text-muted-foreground uppercase tracking-wide">
                            Delete
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {Object.entries(permissions).map(([module, permission]) => (

                        <tr
                            key={module}
                            className="border-b hover:bg-muted/20"
                        >

                            <td className="px-4 py-3 font-normal text-sm capitalize">

                                {module.replace(/([A-Z])/g, " $1")}

                            </td>

                            {(["read", "create", "edit", "delete"] as const).map((field) => (

                                <td
                                    key={field}
                                    className="text-center py-3"
                                >

                                    {mode === "view" ? (

                                        permission[field] ? (

                                            <div className="flex justify-center">

                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">

                                                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />

                                                </div>

                                            </div>

                                        ) : (

                                            <div className="flex justify-center">

                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">

                                                    <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />

                                                </div>

                                            </div>

                                        )

                                    ) : (

                                        <Checkbox
                                            checked={permission[field]}
                                            onCheckedChange={(checked) =>
                                                onChange?.(
                                                    module,
                                                    field,
                                                    checked === true
                                                )
                                            }
                                        />

                                    )}

                                </td>

                            ))}

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    );
}