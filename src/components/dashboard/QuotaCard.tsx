// import { Progress } from '@/components/ui/progress';
// import { cn } from '@/lib/utils';

// interface QuotaCardProps {
//   current: number;
//   max: number;
//   label: string;
// }

// export function QuotaCard({ current, max, label }: QuotaCardProps) {
//   const percentage = (current / max) * 100;
//   const isWarning = percentage >= 70 && percentage < 90;
//   const isDanger = percentage >= 90;

//   return (
//     <div className="glass-panel rounded-xl p-6">
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
//         <span
//           className={cn(
//             'text-2xl font-bold',
//             isDanger && 'text-destructive',
//             isWarning && 'text-warning',
//             !isDanger && !isWarning && 'text-foreground'
//           )}
//         >
//           {current}
//           <span className="text-sm font-normal text-muted-foreground">/{max}</span>
//         </span>
//       </div>
//       <Progress
//         value={percentage}
//         className={cn(
//           'h-2',
//           isDanger && '[&>div]:bg-destructive',
//           isWarning && '[&>div]:bg-warning'
//         )}
//       />
//       <p className="mt-2 text-xs text-muted-foreground">
//         {max - current} remaining
//       </p>
//     </div>
//   );
// }


import { cn } from "@/lib/utils";
interface QuotaCardProps {
  current: number;
  max: number;
  label: string;
}

export function QuotaCard({
  current,
  max,
  label,
}: QuotaCardProps) {
  const safeMax = Math.max(max, 1);

  const percentage = (current / safeMax) * 100;
  const remaining = Math.max(max - current, 0);

  const isWarning = percentage >= 70 && percentage < 90;
  const isDanger = percentage >= 90;

  const warningSegment =
    percentage < 100
      ? Math.min(6, Math.max(2, 100 / safeMax))
      : 0;

  const remainingSegment = Math.max(
    100 - percentage - warningSegment,
    0
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {label}
        </h3>

        <div className="text-lg font-semibold">
          <span
            className={cn(
              isDanger
                ? "text-destructive"
                : isWarning
                ? "text-orange-500"
                : "text-foreground"
            )}
          >
            {current}
          </span>

          <span className="text-muted-foreground">
            /{max}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-full bg-[#2b313d] h-2">
        <div className="flex h-full w-full">
          <div
            className="bg-[#4F8EF7] transition-all duration-500"
            style={{
              width: `${Math.max(
                percentage,
                current > 0 ? 2 : 0
              )}%`,
            }}
          />

          <div
            className="bg-[#F6C453]"
            style={{
              width: `${warningSegment}%`,
            }}
          />

          <div
            className="bg-[#3B4352]"
            style={{
              width: `${remainingSegment}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {remaining} remaining
        </span>

        <span className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}% used
        </span>
      </div>
    </div>
  );
}
