import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VM_ROLES, INSTANCE_TYPES } from "@/types";

type Props = {
  roles: Record<string, { count: number; instanceType: string }>;
  updateRole: (roleId: string, field: "count" | "instanceType", value: number | string) => void;
  defaultType: string;
  allowedInstanceTypes: string[];
  isMacAmi: boolean;
  submitted: boolean;
  newVMs: number;
};

export function SplunkRolesSection({
  roles,
  updateRole,
  defaultType,
  allowedInstanceTypes,
  isMacAmi,
  submitted,
  newVMs,
}: Props) {
  return (
    <div className="space-y-4">
      {VM_ROLES.map((role) => {
        const roleState = roles[role.id] ?? {
          count: 0,
          instanceType: defaultType,
        };
        return (
          <RoleRow
            key={role.id}
            role={role}
            count={roleState.count || 0}
            instanceType={roleState.instanceType}
            allowedTypes={allowedInstanceTypes}
            isMacAmi={isMacAmi}
            onUpdateCount={(count) => updateRole(role.id, "count", count)}
            onUpdateType={(type) => updateRole(role.id, "instanceType", type)}
          />
        );
      })}
      {submitted && newVMs === 0 && (
        <p className="text-xs text-destructive">Please select at least one VM role.</p>
      )}
    </div>
  );
}

function RoleRow({
  role,
  count,
  instanceType,
  allowedTypes,
  isMacAmi,
  onUpdateCount,
  onUpdateType,
}: {
  role: (typeof VM_ROLES)[0];
  count: number;
  instanceType: string;
  allowedTypes: string[];
  isMacAmi: boolean;
  onUpdateCount: (count: number) => void;
  onUpdateType: (type: string) => void;
}) {
  const filteredTypes = INSTANCE_TYPES.filter((t) =>
    allowedTypes.includes(t.value) &&
    (isMacAmi ? t.category === "mac" : t.category !== "mac"),
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        count > 0 ? "border-primary/50 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">{role.icon}</span>
        <div>
          <p className="font-medium text-foreground">{role.name}</p>
          <p className="text-xs text-muted-foreground">{role.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={instanceType}
          onValueChange={onUpdateType}
          disabled={count === 0}
        >
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="font-mono">{t.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {t.vcpu}vCPU / {t.memory}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateCount(Math.max(0, count - 1))}
            disabled={count === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-mono text-lg">{count}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateCount(count + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
