import { cn } from "@/lib/utils";

interface ServiceQuota {
  service: string;
  label: string;
  current: number;
  max: number;
  remaining: number;
  percentage: number;
}

interface Props {
  quotas: ServiceQuota[];
  isLoading?: boolean;
}

export function ServiceQuotasCard({ quotas, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">Service Quotas</h3>
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!quotas || quotas.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">Service Quotas</h3>
        <p className="text-xs text-muted-foreground">No quotas available</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-6">
      <h3 className="text-sm font-medium mb-4">Your AWS Service Quota</h3>

      <div className="space-y-2">
        {quotas.map((quota) => {
          const percentage = quota.max > 0 ? (quota.current / quota.max) * 100 : 0;
          const barWidth = Math.max(percentage, quota.current > 0 ? 4 : 0);
          
          let barColor = "bg-blue-500";
          if (percentage >= 90) barColor = "bg-destructive";
          else if (percentage >= 70) barColor = "bg-warning";

          return (
            <div key={quota.service} className="flex items-center justify-between text-xs">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{quota.label}</span>
                  <span className="text-muted-foreground">{quota.current}/{quota.max}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
