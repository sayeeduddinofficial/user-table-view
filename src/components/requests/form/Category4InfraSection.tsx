import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_4_INFRA } from "@/types";

type Props = {
  remainingQuota: number;
  CATEGORY_4_TOTAL_VMS: number;
};

export function Category4InfraSection({ remainingQuota, CATEGORY_4_TOTAL_VMS }: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" />
          HA Cluster Infrastructure
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
              <Badge variant="secondary">{item.type}</Badge>
              <Badge variant="outline">x{item.count}</Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
