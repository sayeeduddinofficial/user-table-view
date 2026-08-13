import { Clock, AlertCircle, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuntimePolicyInfo } from "@/components/requests/vmRequest.types";

type Props = {
  runtimePolicyInfo: RuntimePolicyInfo;
  maxRuntimeHours: number;
  runtimeDuration: number;
  setRuntimeDuration: (value: number) => void;
  vmStopTime: string | null;
};

export function ScheduleSection({
  runtimePolicyInfo,
  maxRuntimeHours,
  runtimeDuration,
  setRuntimeDuration,
  vmStopTime,
}: Props) {
  if (!runtimePolicyInfo.show) return null;
  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Runtime Policy
      </h2>

      <div className="mb-4 p-4 rounded-lg border border-orange-500/50 bg-orange-500/10 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-orange-400">Late request detected</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            This request is outside or near the end of your working hours. Select the required runtime (up to {maxRuntimeHours} hours).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Select Runtime Duration</Label>
        <Select
          value={String(runtimeDuration)}
          onValueChange={(v) => setRuntimeDuration(Number(v))}
        >
          <SelectTrigger className="bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxRuntimeHours }, (_, i) => i + 1).map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h} {h === 1 ? "hour" : "hours"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Maximum runtime: {maxRuntimeHours} hours</p>
      </div>

      <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        VM will stop automatically after the selected duration.
      </div>

      {vmStopTime && (
        <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          VM will stop at: <span className="font-semibold text-foreground">{vmStopTime}</span>
        </div>
      )}
    </section>
  );
}
