import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuotaCardProps {
  current: number;
  max: number;
  label: string;
}

export function QuotaCard({ current, max, label }: QuotaCardProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= 70 && percentage < 90;
  const isDanger = percentage >= 90;

  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <span
          className={cn(
            'text-2xl font-bold',
            isDanger && 'text-destructive',
            isWarning && 'text-warning',
            !isDanger && !isWarning && 'text-foreground'
          )}
        >
          {current}
          <span className="text-sm font-normal text-muted-foreground">/{max}</span>
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          isDanger && '[&>div]:bg-destructive',
          isWarning && '[&>div]:bg-warning'
        )}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {max - current} remaining
      </p>
    </div>
  );
}
