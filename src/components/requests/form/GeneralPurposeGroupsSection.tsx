import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSTANCE_TYPES } from "@/types";
import { makeGroupId } from "@/components/requests/vmRequest.constants";
import type { GeneralVmGroup } from "@/components/requests/vmRequest.types";

type Props = {
  generalGroups: GeneralVmGroup[];
  setGeneralGroups: (fn: (prev: GeneralVmGroup[]) => GeneralVmGroup[]) => void;
  allowedInstanceTypes: string[];
  defaultType: string;
  remainingQuota: number;
  newVMs: number;
  submitted: boolean;
  generalGroupErrors: Record<string, string>;
  setGeneralGroupErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  MAX_GENERAL_GROUPS: number;
};

export function GeneralPurposeGroupsSection({
  generalGroups,
  setGeneralGroups,
  allowedInstanceTypes,
  defaultType,
  remainingQuota,
  newVMs,
  submitted,
  generalGroupErrors,
  setGeneralGroupErrors,
  MAX_GENERAL_GROUPS,
}: Props) {
  return (
    <div className="space-y-3">
      {generalGroups.map((group, idx) => {
        const typeOptions = INSTANCE_TYPES.filter((t) =>
          allowedInstanceTypes.includes(t.value),
        );
        const updateGroup = (patch: Partial<GeneralVmGroup>) => {
          setGeneralGroups((prev) => {
            const next = prev.map((g) => (g.id === group.id ? { ...g, ...patch } : g));
            // Enforce quota when count changes
            if (patch.count !== undefined) {
              const total = next.reduce((s, g) => s + (g.count || 0), 0);
              if (total > remainingQuota) return prev;
            }
            return next;
          });
        };
        return (
          <div
            key={group.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_220px_160px_auto] gap-3 items-center p-4 rounded-lg border border-border bg-muted/20"
          >
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Name Tag
              </label>
              <Input
                placeholder="e.g. app-server-1"
                value={group.name}
                onChange={(e) => {
                  updateGroup({ name: e.target.value });
                  if (submitted && generalGroupErrors[group.id]) {
                    setGeneralGroupErrors((prev) => { const n = { ...prev }; delete n[group.id]; return n; });
                  }
                }}
                maxLength={64}
                className={submitted && generalGroupErrors[group.id] ? "border-destructive" : ""}
              />
              {submitted && generalGroupErrors[group.id] && (
                <p className="text-xs text-destructive mt-1">{generalGroupErrors[group.id]}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Instance Type
              </label>
              <Select
                value={group.instanceType}
                onValueChange={(v) => updateGroup({ instanceType: v })}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-mono">{t.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t.vcpu}vCPU / {t.memory}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Count
              </label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => updateGroup({ count: Math.max(1, (group.count || 1) - 1) })}
                  disabled={(group.count || 1) <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-10 text-center font-mono font-semibold">
                  {group.count}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => updateGroup({ count: (group.count || 0) + 1 })}
                  disabled={newVMs >= remainingQuota}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end md:pt-5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setGeneralGroups((prev) =>
                    prev.length > 1 ? prev.filter((g) => g.id !== group.id) : prev,
                  )
                }
                disabled={generalGroups.length <= 1}
                aria-label={`Delete VM group ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {generalGroups.length} / {MAX_GENERAL_GROUPS} VM groups
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setGeneralGroups((prev) =>
              prev.length >= MAX_GENERAL_GROUPS
                ? prev
                : [
                    ...prev,
                    {
                      id: makeGroupId(),
                      name: "",
                      instanceType: defaultType,
                      count: 1,
                    },
                  ],
            )
          }
          disabled={generalGroups.length >= MAX_GENERAL_GROUPS || newVMs >= remainingQuota}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add VM Group
        </Button>
      </div>
    </div>
  );
}
