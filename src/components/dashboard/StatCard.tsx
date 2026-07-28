import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon; // optional
  trend?: {
    value: number;
    display: string;
    tooltip: string;
    positive: boolean;
    showTooltip?: boolean;
  };
  variant?: "default" | "success" | "warning";
}


export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {


  return (
    <div
 className={cn(
  `
  group
  relative
  overflow-hidden

  rounded-md
  border
  border-border

  bg-card

  p-6

  backdrop-blur-xl

  transition-all
  duration-500
  ease-out

  hover:-translate-y-1
  `
)}
>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-2 text-3xl font-medium",
              variant === "success" && "text-green-600 dark:text-green-400",
              variant === "warning" && "text-orange-500 dark:text-orange-400",
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-[14px] text-muted-foreground">
            {subtitle}
          </p>
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
              <p className='mt-2 text-sm font-medium text-muted-foreground'>
              <span
                className={cn(
                  " cursor-default",
                  trend.positive ? "text-success" : "text-destructive"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.display} 
              </span>
              <span>{" "}from last 7 days</span>
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
       {Icon && (
        <Icon className="h-5 w-5 text-muted-foreground" />
      )}
      </div>
    </div>
  );
}
