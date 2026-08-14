import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { VM, getRuntimeInfo } from "@/utils/myVMs.utils";
import { GroupHeader } from "@/components/vms/group/GroupHeader";
import { VMTable } from "@/components/vms/group/VMTable";

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
      <GroupHeader
        requestId={requestId}
        vms={vms}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((p) => !p)}
        isAwsConnected={isAwsConnected}
        anyStopped={anyStopped}
        anyRunning={anyRunning}
        allSameStopTime={allSameStopTime}
        showStopAndTimer={showStopAndTimer}
        launchedAt={launchedAt}
        syncedStopTime={syncedStopTime}
        headerStatus={headerStatus}
        onStartAll={onStartAll}
        onStopAll={onStopAll}
        onRequestExtension={onRequestExtension}
      />

      {expanded && (
        <VMTable
          requestId={requestId}
          vms={vms}
          operatingVMs={operatingVMs}
          copiedIp={copiedIp}
          isAwsConnected={isAwsConnected}
          allSameStopTime={allSameStopTime}
          onCopyIp={onCopyIp}
          onStartVM={onStartVM}
          onStopVM={onStopVM}
          onDeleteVM={onDeleteVM}
          onRequestExtension={onRequestExtension}
        />
      )}
    </div>
  );
}