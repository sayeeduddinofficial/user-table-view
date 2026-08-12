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
    <div>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <svg width={16} height={16} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" >
        <path stroke="#3B82F6" fillRule="evenodd" clipRule="evenodd" d="M5.89286 16.1071H15.7143V6.28571H5.89286V16.1071ZM16.5 6.28571H18.0714V7.07143H16.5V8.64286H18.0714V9.42857H16.5V10.6071H18.0714V11.3929H16.5V12.9643H18.0714V13.75H16.5V15.3214H18.0714V16.1071H16.5V16.1606C16.5 16.5644 16.1716 16.8929 15.7677 16.8929H15.7143V18.4643H14.9286V16.8929H13.3571V18.4643H12.5714V16.8929H11.3929V18.4643H10.6071V16.8929H9.03571V18.4643H8.25V16.8929H6.67857V18.4643H5.89286V16.8929H5.83943C5.43557 16.8929 5.10714 16.5644 5.10714 16.1606V16.1071H3.92857V15.3214H5.10714V13.75H3.92857V12.9643H5.10714V11.3929H3.92857V10.6071H5.10714V9.42857H3.92857V8.64286H5.10714V7.07143H3.92857V6.28571H5.10714V6.23229C5.10714 5.82843 5.43557 5.5 5.83943 5.5H5.89286V3.92857H6.67857V5.5H8.25V3.92857H9.03571V5.5H10.6071V3.92857H11.3929V5.5H12.5714V3.92857H13.3571V5.5H14.9286V3.92857H15.7143V5.5H15.7677C16.1716 5.5 16.5 5.82843 16.5 6.23229V6.28571ZM11.3929 21.1656C11.3929 21.1923 11.3709 21.2143 11.3441 21.2143H0.834429C0.807715 21.2143 0.785714 21.1923 0.785714 21.1656V10.6559C0.785714 10.6291 0.807715 10.6071 0.834429 10.6071H3.14286V9.82143H0.834429C0.374393 9.82143 0 10.1958 0 10.6559V21.1656C0 21.6255 0.374393 22 0.834429 22H11.3441C11.8042 22 12.1786 21.6255 12.1786 21.1656V19.25H11.3929V21.1656ZM22 0.834429V11.3441C22 11.8042 21.6255 12.1786 21.1656 12.1786H18.8571V11.3929H21.1656C21.1923 11.3929 21.2143 11.3709 21.2143 11.3441V0.834429C21.2143 0.807715 21.1923 0.785714 21.1656 0.785714H10.6559C10.6291 0.785714 10.6071 0.807715 10.6071 0.834429V3.14286H9.82143V0.834429C9.82143 0.374393 10.1958 0 10.6559 0H21.1656C21.6255 0 22 0.374393 22 0.834429Z" fill="#3B82F6" />
    </svg>
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
