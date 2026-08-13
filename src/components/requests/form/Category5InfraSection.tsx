import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_4_INFRA, INSTANCE_TYPES } from "@/types";

type Props = {
  remainingQuota: number;
  CATEGORY_4_TOTAL_VMS: number;
  cat5InstanceTypes: Record<string, string>;
  setCat5InstanceTypes: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  allowedInstanceTypes: string[];
};

export function Category5InfraSection({
  remainingQuota,
  CATEGORY_4_TOTAL_VMS,
  cat5InstanceTypes,
  setCat5InstanceTypes,
  allowedInstanceTypes,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" />
          Predefined Infrastructure
        </h2>
        <div className="text-sm text-muted-foreground">
          Total VMs:
          <Badge
            variant="outline"
            className={cn(
              "ml-2 font-normal text-lg",
              CATEGORY_4_TOTAL_VMS > remainingQuota &&
              "border-destructive text-destructive",
            )}
          >
            {CATEGORY_4_TOTAL_VMS} / {remainingQuota}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {CATEGORY_4_INFRA.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={cat5InstanceTypes[item.id] ?? item.type}
                onValueChange={(val) =>
                  setCat5InstanceTypes((prev) => ({
                    ...prev,
                    [item.id]: val,
                  }))
                }
              >
                <SelectTrigger className="w-[140px] bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_TYPES.filter((t) =>
                    allowedInstanceTypes?.includes(t.value),
                  ).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-mono">{t.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t.vcpu}vCPU / {t.memory}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">x{item.count}</Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
