import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VmModeSelectorCards } from "./VmModeSelectorCards";
import { SplunkRolesSection } from "./SplunkRolesSection";
import { GeneralPurposeGroupsSection } from "./GeneralPurposeGroupsSection";
import type { GeneralVmGroup, VmMode } from "@/components/requests/vmRequest.types";

type Props = {
  vmMode: VmMode;
  resetVmConfiguration: (nextMode: VmMode) => void;
  newVMs: number;
  remainingQuota: number;
  isOverQuota: boolean;
  roles: Record<string, { count: number; instanceType: string }>;
  updateRole: (roleId: string, field: "count" | "instanceType", value: number | string) => void;
  defaultType: string;
  allowedInstanceTypes: string[];
  isMacAmi: boolean;
  submitted: boolean;
  generalGroups: GeneralVmGroup[];
  setGeneralGroups: (fn: (prev: GeneralVmGroup[]) => GeneralVmGroup[]) => void;
  generalGroupErrors: Record<string, string>;
  setGeneralGroupErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  MAX_GENERAL_GROUPS: number;
};

export function Category1RoleConfigSection({
  vmMode,
  resetVmConfiguration,
  newVMs,
  remainingQuota,
  isOverQuota,
  roles,
  updateRole,
  defaultType,
  allowedInstanceTypes,
  isMacAmi,
  submitted,
  generalGroups,
  setGeneralGroups,
  generalGroupErrors,
  setGeneralGroupErrors,
  MAX_GENERAL_GROUPS,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          {vmMode === "general" ? "Custom VM Configuration" : "VM Role Configuration"}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Total VMs:</span>
          <Badge
            variant="outline"
            className={cn(
              "text-lg font-bold px-3 py-1",
              isOverQuota && "border-destructive text-destructive",
            )}
          >
            {newVMs} / {remainingQuota}
          </Badge>
        </div>
      </div>

      <VmModeSelectorCards vmMode={vmMode} resetVmConfiguration={resetVmConfiguration} />

      {vmMode === "splunk" ? (
        <SplunkRolesSection
          roles={roles}
          updateRole={updateRole}
          defaultType={defaultType}
          allowedInstanceTypes={allowedInstanceTypes}
          isMacAmi={isMacAmi}
          submitted={submitted}
          newVMs={newVMs}
        />
      ) : (
        <GeneralPurposeGroupsSection
          generalGroups={generalGroups}
          setGeneralGroups={setGeneralGroups}
          allowedInstanceTypes={allowedInstanceTypes}
          defaultType={defaultType}
          remainingQuota={remainingQuota}
          newVMs={newVMs}
          submitted={submitted}
          generalGroupErrors={generalGroupErrors}
          setGeneralGroupErrors={setGeneralGroupErrors}
          MAX_GENERAL_GROUPS={MAX_GENERAL_GROUPS}
        />
      )}
    </section>
  );
}
