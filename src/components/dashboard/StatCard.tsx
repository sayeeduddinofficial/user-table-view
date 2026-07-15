import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    display: string,
    tooltip: string,
    positive: boolean,
    showTooltip?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const iconColors = {
    default: 'text-muted-foreground bg-muted',
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <div className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {/* {trend && (
            <p
              className={cn(
                'mt-2 text-sm font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last week
            </p>
          )} */}
          {trend && (
            <div className="relative group inline-block">
              <p
                className={cn(
                  "mt-2 text-sm font-medium cursor-default",
                  trend.positive ? "text-success" : "text-destructive"
                )}
              >
                {trend.positive ? "↓" : "↑"} {trend.display} from last 7 days
              </p>

              {trend.showTooltip && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 hidden group-hover:block z-50">
                  <div className="bg-[#1f2937] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-white/10 whitespace-nowrap">
                    {trend.tooltip}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={cn('rounded-lg p-3', iconColors[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
