import { Monitor, Power, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  total: number;
  running: number;
  stopped: number;
  remainingquota: number;
  onRequestIncrease: () => void;
}

export function VMStatsBar({ total, running, stopped, remainingquota, onRequestIncrease }: Props) {
  return (
    <div className="pb-2">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total VMs</p>
          </div>
        </div>

        <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Power className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{running}</p>
            <p className="text-xs text-muted-foreground">Running</p>
          </div>
        </div>

        <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Power className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stopped}</p>
            <p className="text-xs text-muted-foreground">Stopped</p>
          </div>
        </div>

        <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{remainingquota}</p>
            <p className="text-xs text-muted-foreground">Quota Remaining</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-primary text-primary bg-primary/10 text-xs whitespace-nowrap hover:bg-primary hover:text-white"
            onClick={onRequestIncrease}
          >
            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
            Request Increase
          </Button>
        </div>
      </div>
    </div>
  );
}
