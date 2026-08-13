import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Power, Play, ChevronDown, Clock } from "lucide-react";
import { VM, formatTime } from "@/utils/myVMs.utils";

interface Props {
  requestId: string;
  vms: VM[];
  expanded: boolean;
  onToggleExpanded: () => void;
  isAwsConnected: boolean;
  anyStopped: boolean;
  anyRunning: boolean;
  allSameStopTime: boolean;
  showStopAndTimer: boolean;
  launchedAt?: string;
  syncedStopTime: string | null;
  headerStatus: React.ReactNode;
  onStartAll: (requestId: string) => void;
  onStopAll: (requestId: string) => void;
  onRequestExtension: (requestId: string, vm?: VM, requestLevelEnabled?: boolean) => void;
}

export function GroupHeader({
  requestId, vms, expanded, onToggleExpanded, isAwsConnected,
  anyStopped, anyRunning, allSameStopTime, showStopAndTimer, launchedAt,
  syncedStopTime, headerStatus, onStartAll, onStopAll, onRequestExtension,
}: Props) {
  return (
    <div
      onClick={onToggleExpanded}
      className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-t-xl border border-border/50 bg-muted/20 px-4 py-2.5"
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      <span className="font-mono font-semibold text-foreground text-sm">{requestId}</span>
      <span className="text-xs text-muted-foreground">{vms.length} VM{vms.length !== 1 ? "s" : ""}</span>

      {vms[0]?.environment && (
        <span className={cn("text-xs text-muted-foreground")}>{vms[0].environment}</span>
      )}

      {showStopAndTimer && launchedAt && (
        <span className="text-xs text-muted-foreground">Launch: {formatTime(launchedAt)}</span>
      )}
      {showStopAndTimer && syncedStopTime && (
        <span className="text-xs text-muted-foreground">Stop: {formatTime(syncedStopTime)}</span>
      )}

      {headerStatus}

      <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {anyStopped && (
          <Button size="sm" variant="outline" disabled={!isAwsConnected}
            className="h-7 gap-1.5 border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-xs"
            tooltip={isAwsConnected ? "Start all stopped VMs in this request" : "AWS Disconnected"}
            onClick={() => onStartAll(requestId)}>
            <Play className="h-3 w-3" /> Start All
          </Button>
        )}
        {anyRunning && (
          <Button size="sm" variant="outline" disabled={!isAwsConnected}
            className="h-7 gap-1.5 border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-400 hover:!text-amber-700 dark:hover:!text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10 text-xs"
            tooltip={isAwsConnected ? "Stop all running VMs in this request" : "AWS Disconnected"}
            onClick={() => onStopAll(requestId)}>
            <Power className="h-3 w-3" /> Stop All
          </Button>
        )}
        {anyRunning && (
          <Button size="sm" variant="outline" disabled={!isAwsConnected || !allSameStopTime}
            className="h-7 gap-1.5 border-primary/50 text-primary hover:text-primary hover:bg-primary/10 text-xs"
            tooltip={
              !isAwsConnected ? "AWS Disconnected"
              : !allSameStopTime ? "Extension disabled — Stop all VMs, then click Start All to sync runtimes."
              : "Request runtime extension for all running VMs in this request"
            }
            onClick={() => onRequestExtension(requestId, undefined, allSameStopTime)}>
            <Clock className="h-3 w-3" /> Request Extension
          </Button>
        )}
      </div>
    </div>
  );
}
