import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  max: number;
}

export function DashboardQuota({ current, max }: Props) {
  const safeMax = Math.max(max, 1);
  const percentage = max > 0 ? (current / safeMax) * 100 : 0;
  const remaining = Math.max(max - current, 0);

  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">
          Your AWS Service Quota
        </h3>

        <span className="text-xl font-semibold">
          {current}/{max}
        </span>
      </div>

      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              percentage >= 90 && "bg-destructive",
              percentage >= 70 && percentage < 90 && "bg-warning",
              percentage < 70 && "bg-blue-500"
            )}
            style={{ width: `${Math.max(percentage, current > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {remaining} remaining
      </p>
    </div>
  );
}