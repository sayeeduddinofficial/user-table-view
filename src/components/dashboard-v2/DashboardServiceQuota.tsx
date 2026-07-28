import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface ServiceQuota {
  id: string;
  name: string;
  used: number;
  limit: number;
  icon: LucideIcon;
}

interface Props {
  quotas: ServiceQuota[];
  title?: string;
  subtitle?: string;
}

const getBarColor = (percentage: number) => {
  if (percentage >= 90) return "bg-destructive";
  if (percentage >= 70) return "bg-warning";
  return "bg-blue-500";
};

export function DashboardServiceQuota({
  quotas,
  title = "Service Quotas",
  subtitle = "Usage by AWS service",
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <span className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          compact
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {quotas.map((quota) => {
          const safeLimit = Math.max(quota.limit, 1);
          const percentage = safeLimit > 0 ? Math.min((quota.used / safeLimit) * 100, 100) : 0;
          const barColor = getBarColor(percentage);
          const Icon = quota.icon;

          return (
            <div key={quota.id} className="flex items-center gap-4">
              <div className="flex min-w-[10rem] items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-muted/70 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{quota.name}</span>
              </div>

              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="w-16 text-right text-sm font-semibold text-foreground">
                {quota.used}/{quota.limit}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
