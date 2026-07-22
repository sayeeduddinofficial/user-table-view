import { useMemo, useState } from "react";
import { Search, ShieldCheck, Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import ViewRoleDialog from "@/components/roles/ViewRoleDialog";
import EditRoleDialog from "@/components/roles/EditRoleDialog";
import DeleteRoleDialog from "@/components/roles/DeleteRoleDialog";
import { Header } from "../layout/Header";
import AddRoleDialog from "./AddRoleDialog";


export type Permission = {
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
};

export type Role = {
    id: number;
    role: string;
    users: number;
    status: "Active" | "Inactive";

    workspace: {
        dashboard: Permission;
        requests: Permission;
    };

    services: {
        ec2: Permission;
        s3: Permission;
        vpc: Permission;
        lb: Permission;
        route53: Permission;
        rds: Permission;
        eks: Permission;
    };

    administration: {
        users: Permission;
        audit: Permission;
        finops: Permission;
        runtime: Permission;
        quota: Permission;
        feedback: Permission;
        settings: Permission;
    };
};

const full: Permission = {
    read: true,
    create: true,
    edit: true,
    delete: true,
};

const readOnly: Permission = {
    read: true,
    create: false,
    edit: false,
    delete: false,
};

const none: Permission = {
    read: false,
    create: false,
    edit: false,
    delete: false,
};

const initialRoles: Role[] = [
    {
        id: 1,
        role: "Administrator",
        users: 5,
        status: "Active",

        workspace: {
            dashboard: full,
            requests: full,
        },

        services: {
            ec2: full,
            s3: full,
            vpc: full,
            lb: full,
            route53: full,
            rds: full,
            eks: full,
        },

        administration: {
            users: full,
            audit: full,
            finops: full,
            runtime: full,
            quota: full,
            feedback: full,
            settings: full,
        },
    },

    {
        id: 2,
        role: "Developer",
        users: 12,
        status: "Active",

        workspace: {
            dashboard: readOnly,
            requests: full,
        },

        services: {
            ec2: full,
            s3: full,
            vpc: readOnly,
            lb: readOnly,
            route53: readOnly,
            rds: readOnly,
            eks: readOnly,
        },

        administration: {
            users: none,
            audit: none,
            finops: none,
            runtime: none,
            quota: none,
            feedback: readOnly,
            settings: none,
        },
    },

    {
        id: 3,
        role: "Read Only",
        users: 8,
        status: "Inactive",

        workspace: {
            dashboard: readOnly,
            requests: readOnly,
        },

        services: {
            ec2: readOnly,
            s3: readOnly,
            vpc: readOnly,
            lb: readOnly,
            route53: readOnly,
            rds: readOnly,
            eks: readOnly,
        },

        administration: {
            users: readOnly,
            audit: readOnly,
            finops: readOnly,
            runtime: readOnly,
            quota: readOnly,
            feedback: readOnly,
            settings: readOnly,
        },
    },
];

export default function ViewRoles() {
    const navigate = useNavigate();

    const [roles, setRoles] = useState<Role[]>(initialRoles);

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const [viewOpen, setViewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [addOpen, setAddOpen] = useState(false);
    const handleAddRole = (newRole: Role) => {
    setRoles((prev) => [...prev, newRole]);
};

    const handleView = (role: Role) => {
        setSelectedRole(role);
        setViewOpen(true);
    };

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setEditOpen(true);
    };

    const handleDelete = (role: Role) => {
        setSelectedRole(role);
        setDeleteOpen(true);
    };

    const handleSaveRole = (updatedRole: Role) => {
        setRoles((prev) =>
            prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
        );
    };

    const handleDeleteRole = (id: number) => {
        setRoles((prev) => prev.filter((r) => r.id !== id));
    };

    const filteredRoles = useMemo(() => {
        return roles.filter((role) => {
            const matchesSearch = role.role
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesStatus =
                status === "all" || role.status === status;

            return matchesSearch && matchesStatus;
        });
    }, [roles, search, status]);

    return (
        <div className="space-y-4">
            <Header
                title="All Roles"
                subtitle="Manage user roles and permissions across your platform."
                showSearch={false}
            />
            <div className="space-y-4 p-6">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-4">

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="bg-card"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div>
                            <h1 className="text-xl font-semibold text-foreground">
                                Roles List
                            </h1>

                            <p className="text-sm text-muted-foreground">
                                Manage role permissions across your platform.
                            </p>
                        </div>

                    </div>

                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Role
                    </Button>

                </div>
                {/* Summary */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                    <div className="rounded-xl border bg-card p-5">

                        <div className="text-sm text-muted-foreground">

                            Total Roles

                        </div>

                        <div className="mt-2 text-3xl font-bold">

                            {roles.length}

                        </div>

                    </div>

                    <div className="rounded-xl border bg-card p-5">

                        <div className="text-sm text-muted-foreground">

                            Active Roles

                        </div>

                        <div className="mt-2 text-3xl font-bold text-green-600">

                            {roles.filter((r) => r.status === "Active").length}

                        </div>

                    </div>

                    <div className="rounded-xl border bg-card p-5">

                        <div className="text-sm text-muted-foreground">

                            Assigned Users

                        </div>

                        <div className="mt-2 text-3xl font-bold">

                            {roles.reduce((sum, role) => sum + role.users, 0)}

                        </div>

                    </div>

                </div>

                <div className="flex flex-wrap gap-4">

                    <div className="relative w-80">

                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                        <Input
                            className="pl-10"
                            placeholder="Search role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                    </div>

                    <Select
                        value={status}
                        onValueChange={setStatus}
                    >

                        <SelectTrigger className="w-52">

                            <SelectValue placeholder="Status" />

                        </SelectTrigger>

                        <SelectContent>

                            <SelectItem value="all">
                                All Status
                            </SelectItem>

                            <SelectItem value="Active">
                                Active
                            </SelectItem>

                            <SelectItem value="Inactive">
                                Inactive
                            </SelectItem>

                        </SelectContent>

                    </Select>

                </div>

                {/* Roles Table */}

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">

                    <table className="w-full">

                        <thead className="bg-muted/40">

                            <tr>

                                <th className="w-16 px-5 py-4 text-left text-xs font-semibold uppercase">
                                    #
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase">
                                    Role
                                </th>

                                <th className="w-32 px-5 py-4 text-center text-xs font-semibold uppercase">
                                    Users
                                </th>

                                <th className="w-40 px-5 py-4 text-center text-xs font-semibold uppercase">
                                    Status
                                </th>

                                <th className="w-40 px-5 py-4 text-center text-xs font-semibold uppercase">
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {filteredRoles.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan={5}
                                        className="py-16 text-center"
                                    >

                                        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />

                                        <h3 className="text-lg font-semibold">
                                            No Roles Found
                                        </h3>

                                        <p className="mt-2 text-muted-foreground">
                                            Try changing your search or filter.
                                        </p>

                                    </td>

                                </tr>

                            ) : (

                                filteredRoles.map((role, index) => (

                                    <tr
                                        key={role.id}
                                        className="border-t transition hover:bg-muted/30"
                                    >

                                        <td className="px-5 py-4 text-muted-foreground">

                                            {index + 1}

                                        </td>

                                        <td className="px-5 py-4">

                                            <div>

                                                <div className="font-semibold">

                                                    {role.role}

                                                </div>

                                                <div className="mt-1 text-xs text-muted-foreground">

                                                    Workspace :
                                                    {" "}
                                                    {Object.keys(role.workspace).length}

                                                    {" | "}

                                                    Services :
                                                    {" "}
                                                    {Object.keys(role.services).length}

                                                    {" | "}

                                                    Administration :
                                                    {" "}
                                                    {Object.keys(role.administration).length}

                                                </div>

                                            </div>

                                        </td>

                                        <td className="text-center">

                                            <span className="font-semibold">

                                                {role.users}

                                            </span>

                                        </td>

                                        <td className="text-center">

                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium
                ${role.status === "Active"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                    }`}
                                            >

                                                {role.status}

                                            </span>

                                        </td>

                                        <td>

                                            <div className="flex justify-center gap-2">

                                                <button
                                                    onClick={() => handleView(role)}
                                                    className="rounded-md p-2 transition hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-500/20"
                                                >

                                                    <Eye className="h-4 w-4" />

                                                </button>

                                                <button
                                                    onClick={() => handleEdit(role)}
                                                    className="rounded-md p-2 transition hover:bg-primary/10 hover:text-primary"
                                                >

                                                    <Pencil className="h-4 w-4" />

                                                </button>

                                                <button
                                                    onClick={() => handleDelete(role)}
                                                    className="rounded-md p-2 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20"
                                                >

                                                    <Trash2 className="h-4 w-4" />

                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>


            </div>
            {/* View Role Dialog */}
            <AddRoleDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onSave={handleAddRole}
            />
            {selectedRole && (
                <ViewRoleDialog
                    open={viewOpen}
                    onOpenChange={setViewOpen}
                    role={selectedRole}
                />
            )}

            {/* Edit Role Dialog */}
            {selectedRole && (
                <EditRoleDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    role={selectedRole}
                    onSave={handleSaveRole}
                />
            )}

            {/* Delete Role Dialog */}
            {selectedRole && (
                <DeleteRoleDialog
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                    role={selectedRole}
                    onDelete={handleDeleteRole}
                />
            )}
        </div>
    );
}