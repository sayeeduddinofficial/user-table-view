import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Power, Trash2, Play, Copy, Check, ChevronDown, Clock, AlertTriangle,
} from "lucide-react";
import { VM, statusConfig, roleMap, formatTime, getRuntimeInfo } from "@/utils/myVMs.utils";

interface Props {
  requestId: string;
  vms: VM[];
  operatingVMs: Set<string>;
  copiedIp: string | null;
  isAwsConnected: boolean;
  onCopyIp: (ip: string) => void;
  onStartVM: (instanceId: string, name: string) => void;
  onStopVM: (instanceId: string, name: string) => void;
  onDeleteVM: (instanceId: string, name: string) => void;
  onStartAll: (requestId: string) => void;
  onStopAll: (requestId: string) => void;
  onRequestExtension: (requestId: string, vm?: VM, requestLevelEnabled?: boolean) => void;
}

export function VMRequestGroup({
  requestId, vms, operatingVMs, copiedIp, isAwsConnected,
  onCopyIp, onStartVM, onStopVM, onDeleteVM, onStartAll, onStopAll, onRequestExtension,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const nonTerminated = vms.filter((v) => v.status !== "terminated" && v.status !== "terminating");
  const anyStopped = nonTerminated.some((v) => v.status === "stopped");
  const anyRunning = nonTerminated.some((v) => v.status === "running");
  const runningWithTime = vms.filter((v) => v.status === "running" && v.stop_time);

  const allStopTimes = nonTerminated.map((v) => v.stop_time).filter(Boolean) as string[];
  const SYNC_TOLERANCE_MS = 15 * 1000;
  const allSameStopTime =
    allStopTimes.length > 0 &&
    allStopTimes.length === nonTerminated.length &&
    (() => {
      const times = allStopTimes.map((t) => new Date(t).getTime());
      return Math.max(...times) - Math.min(...times) <= SYNC_TOLERANCE_MS;
    })();

  const syncedStopTime: string | null = allSameStopTime
    ? allStopTimes.reduce((earliest, t) =>
        new Date(t).getTime() < new Date(earliest).getTime() ? t : earliest)
    : null;

  const earliestRunningStopTime: string | null = runningWithTime.length > 0
    ? runningWithTime.reduce<string>((earliest, v) => {
        if (!earliest) return v.stop_time!;
        return new Date(v.stop_time!).getTime() < new Date(earliest).getTime() ? v.stop_time! : earliest;
      }, "")
    : nonTerminated.find((v) => v.stop_time)?.stop_time ?? null;

  const launchedAt = vms
    .filter((v) => v.launchedAt)
    .sort((a, b) => new Date(a.launchedAt!).getTime() - new Date(b.launchedAt!).getTime())[0]?.launchedAt;

  const { label: runtimeLabel, isExpired, urgency: headerUrgency } = getRuntimeInfo(earliestRunningStopTime, null, null);

  const allExpired =
    nonTerminated.length > 0 &&
    nonTerminated.every((v) => v.stop_time && new Date(v.stop_time).getTime() <= Date.now());

  const urgencyTextColor =
    headerUrgency === "red" ? "text-red-400" :
    headerUrgency === "amber" ? "text-amber-400" : "text-green-400";

  const showStopAndTimer = allSameStopTime && runningWithTime.length > 0;

  const headerStatus =
    nonTerminated.length === 0 ? null
    : (allExpired || isExpired) ? (
      <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400 font-semibold">
        <Clock className="h-3 w-3" /> Expired
      </span>
    ) : allSameStopTime && runningWithTime.length > 0 ? (
      <span className={`flex items-center gap-1 text-xs font-mono font-medium ${urgencyTextColor}`}>
        <Clock className="h-3.5 w-3.5" /> {runtimeLabel}
      </span>
    ) : null;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* ── Group Header ── */}
      <div
        onClick={() => setExpanded((p) => !p)}
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

      {/* ── VM Table ── */}
      {expanded && (
        <div className="border border-t-0 border-border/50 rounded-b-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent h-8">
                <TableHead className="px-3 truncate">VM Name</TableHead>
                <TableHead className="px-3 w-[60px] truncate">Role</TableHead>
                <TableHead className="px-3 w-[160px] truncate">Instance Type</TableHead>
                <TableHead className="px-3 w-[160px] truncate">Public IP</TableHead>
                <TableHead className="px-3 w-[130px] truncate">Private IP</TableHead>
                <TableHead className="px-3 w-[200px] truncate">Runtime Remaining</TableHead>
                <TableHead className="px-3 w-[120px] truncate">Status</TableHead>
                <TableHead className="px-3 w-[120px] truncate">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vms.map((vm) => {
                const { label: vmRuntimeLabel, isExpired: vmExpired, progressPct: vmPct, urgency: vmUrgency, elapsedLabel } =
                  getRuntimeInfo(vm.stop_time, vm.launchedAt, vm.base_stop_time);
                const cfg = statusConfig[vm.status] ?? statusConfig.unknown;
                const isOp = operatingVMs.has(vm.instanceId);
                const isTerminated = vm.status === "terminated" || vm.status === "terminating";
                const isTransitioning = vm.status === "starting" || vm.status === "stopping";

                const barColor = vmExpired || vmUrgency === "red" ? "bg-red-500" : vmUrgency === "amber" ? "bg-amber-400" : "bg-emerald-400";
                const textColor = vmExpired || vmUrgency === "red" ? "text-red-400" : vmUrgency === "amber" ? "text-amber-400" : "text-green-400";

                return (
                  <TableRow key={vm.instanceId}
                    className={`border-border/20 hover:bg-muted/15 h-11 ${isTerminated ? "opacity-50" : ""}`}>

                    {/* VM Name */}
                    <TableCell className="px-3 font-mono w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          vm.status === "running" ? "bg-emerald-400" :
                          vm.status === "stopped" ? "bg-red-400" :
                          isTerminated ? "bg-muted-foreground/40" : "bg-blue-400"
                        }`} />
                        <span className="font-mono text-sm text-foreground">{vm.name}</span>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-3">
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase px-1.5">
                        {roleMap[vm.role?.toLowerCase()] || vm.role?.toUpperCase() || "—"}
                      </Badge>
                    </TableCell>

                    {/* Instance Type */}
                    <TableCell className="px-3 font-mono">{vm.instanceType || "—"}</TableCell>

                    {/* Public IP */}
                    <TableCell className="px-3">
                      {!isTerminated && vm.publicIp ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm text-primary">{vm.publicIp}</span>
                           <Button variant="ghost" size="icon" className="h-5 w-5"
                            tooltip={copiedIp === vm.publicIp ? "Copied!" : "Copy"}
                            onClick={() => onCopyIp(vm.publicIp)}>
                            {copiedIp === vm.publicIp
                              ? <Check className="h-3 w-3 text-green-500" />
                              : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Private IP */}
                    <TableCell className="px-3 font-mono">
                      {!isTerminated && vm.privateIp ? vm.privateIp : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>

                    {/* Runtime Remaining */}
                    <TableCell className="px-3 min-w-[160px]">
                      {(() => {
                        if (isTransitioning || isTerminated || !vm.stop_time)
                          return <span className="text-muted-foreground text-sm">—</span>;
                        if (vm.status === "stopped" && !vmExpired)
                          return <span className="text-muted-foreground text-sm">—</span>;
                        if (vmExpired) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400 font-semibold whitespace-nowrap">
                                <Clock className="h-3 w-3" /> Expired
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="h-1.5 w-16 rounded-full bg-muted/40 overflow-hidden cursor-default flex-shrink-0">
                                    <div className="h-full w-full rounded-full bg-red-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs font-mono">{elapsedLabel}</TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 font-mono text-xs whitespace-nowrap ${textColor}`}>
                              <Clock className="h-3.5 w-3.5" /> {vmRuntimeLabel}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-1.5 w-16 rounded-full bg-muted/60 border border-muted/70 overflow-hidden cursor-default flex-shrink-0">
                                  <div className={`h-full rounded-full transition-all ${barColor} shadow-sm`} style={{ width: `${vmPct}%` }} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs font-mono">{elapsedLabel}</TooltipContent>
                            </Tooltip>
                            {vmUrgency === "red" && <AlertTriangle className="h-3 w-3 text-red-400" />}
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-3">
                      <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-1.5 px-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {!isTerminated && (
                          <>
                            {vm.status === "running" && (
                              <Button variant="ghost" size="icon" disabled={!isAwsConnected}
                                className={`h-7 w-7 ${!isAwsConnected ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-emerald-400"}`}
                                tooltip={isAwsConnected ? "Request Extension" : "AWS Disconnected"}
                                onClick={() => onRequestExtension(requestId, vm, allSameStopTime)}>
                                <Clock className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {vm.status === "stopped" && (
                              <Button variant="ghost" size="icon" disabled={!isAwsConnected || isOp}
                                className={`h-7 w-7 ${isOp ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-emerald-400"}`}
                                tooltip={isAwsConnected ? (isOp ? "Operation in progress" : "Start VM") : "AWS Disconnected"}
                                onClick={() => onStartVM(vm.instanceId, vm.name)}>
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {vm.status === "running" && (
                              <Button variant="ghost" size="icon" disabled={!isAwsConnected || isOp}
                                className={`h-7 w-7 ${isOp ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-amber-400"}`}
                                tooltip={isAwsConnected ? (isOp ? "Operation in progress" : "Stop VM") : "AWS Disconnected"}
                                onClick={() => onStopVM(vm.instanceId, vm.name)}>
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon"
                              disabled={!isAwsConnected || isOp || isTransitioning}
                              className={`h-8 w-8 ${!isAwsConnected || isOp || isTransitioning ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-destructive"}`}
                              tooltip={isAwsConnected ? ((isOp || isTransitioning) ? "Destroy disabled while transitioning" : "Terminate VM") : "AWS Disconnected"}
                              onClick={() => onDeleteVM(vm.instanceId, vm.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
