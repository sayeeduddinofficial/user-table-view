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

const variants = {
  primary: {
    bg: "bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
    card:
      "hover:border-blue-500/40 hover:shadow-[0_20px_45px_rgba(37,99,235,.1)] card-bg1",
    icon: "bg-blue-500/10 text-blue-400",
  },

  warning: {
    bg: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
    card:
      "hover:border-amber-500/40 hover:shadow-[0_20px_45px_rgba(245,158,11,.1)] card-bg3",
    icon: "bg-amber-500/10 text-amber-400",
  },

  success: {
    bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
    card:
      "hover:border-emerald-500/40 hover:shadow-[0_20px_45px_rgba(16,185,129,.1)] card-bg2",
    icon: "bg-emerald-500/10 text-emerald-400",
  },

  info: {
    bg: "bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent",
    card:
      "hover:border-violet-500/40 hover:shadow-[0_20px_45px_rgba(139,92,246,.1)] card-bg4",
    icon: "bg-violet-500/10 text-violet-400",
  },

  destructive: {
    bg: "bg-gradient-to-br from-red-500/15 via-red-500/5 to-transparent",
    card:
      "hover:border-red-500/40 hover:shadow-[0_20px_45px_rgba(239,68,68,.1)] ",
    icon: "bg-red-500/10 text-red-400",
  },

  default: {
    bg: "bg-card",
    card: "hover:border-primary/30 card-bg4",
    icon: "bg-primary/10 text-primary",
  },
} as const;


export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {

  const style = variants[variant ?? "default"];
   const iconColors = {
    default: 'text-muted-foreground bg-muted',
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

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
  `,
  style.bg,
  style.card
)}
>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-normal text-sm">{title}</p>
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
        <div className={cn('rounded-lg p-3', iconColors[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      </div>
    </div>
  );
}
