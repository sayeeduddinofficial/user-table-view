import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import {
  useRequestDetails,
  useClearRequestLogs,
  useDownloadRequestLogs,
} from "@/hooks/useLiveConsole";
import {
  fetchRequestLogsApi,
  fetchLiveRequestLogsStreamApi,
  isLiveOnlyService,
} from "@/components/console/liveConsoleApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Trash2, Download, Loader2 } from "lucide-react";
import type { TerraformLog } from "@/types";
import { useNavigate } from "react-router-dom";
import { useDialog } from "../ui/dialog-context";

const statusLabelMap: Record<string, string> = {
  pending: "Pending",
  provisioning: "Provisioning",
  completed: "Completed",
  failed: "Failed",
  retrying: "Retrying",
  terminated: "Terminated",
  terminating: "Terminating",
  retrying_terminate: "Retrying",
  destroying: "Terminating",
  destroyed: "Terminated",
};

const statusColorMap: Record<string, string> = {
  pending: "border-gray-400 text-gray-400",
  provisioning: "border-blue-500 text-blue-500",
  completed: "border-green-500 text-green-500",
  retrying: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  failed: "border-red-500 text-red-500",
  terminated: "border-gray-500 text-gray-500",
  terminating: "border-yellow-500 text-yellow-500",
  retrying_terminate: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  destroying: "border-yellow-500 text-yellow-500",   
  destroyed: "border-gray-500 text-gray-500",  
};

const stripAnsiCodes = (value: string): string => {
  if (!value) return "";
  return value.replace(/\u001b\[[0-9;]*m/g, "");
};

const NOT_READY_PHRASES = ["logs not available yet", "no logs available"];

const hasDestroyLogs = (logText: string): boolean =>
  /DESTROY\s+LOGS/i.test(logText) ||
  /VPC\s+CLI\s+TERMINATION\s+LOGS/i.test(logText) ||
  /LOAD\s+BALANCER\s+CLI\s+TERMINATION\s+LOGS/i.test(logText) ||
  /INSTANCE\s+TERMINATION\s+LOGS/i.test(logText);

const hasRetryLogs = (logText: string): boolean => /RETRY\s+ATTEMPT/i.test(logText);

type ArchiveFetchKey = { requestId: string; status: string } | null;
type FetchResult = "ready" | "partial" | "not-ready" | "error";

const getLogColor = (level: TerraformLog["level"]) => {
  switch (level) {
    case "success":
      return "text-terminal-green";
    case "warn":
      return "text-terminal-yellow";
    case "error":
      return "text-terminal-red";
    default:
      return "text-foreground/80";
  }
};

function ConsoleHeader({
  requestMeta,
  loading,
  isAwsDisconnected,
  isPaused,
  setIsPaused,
  handleClearLogs,
  downloadLogs,
}: {
  requestMeta?: { requestId: string; status: string };
  loading: boolean;
  isAwsDisconnected: boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  handleClearLogs: (requestId: string) => void;
  downloadLogs: () => void;
}) {
  const terminalStatus =
    requestMeta?.status === "completed" ||
    requestMeta?.status === "terminated" ||
    requestMeta?.status === "failed" ||
    requestMeta?.status === "destroyed";

  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-warning" />
          <div className="w-3 h-3 rounded-full bg-success" />
        </div>
        <span className="font-mono text-sm text-muted-foreground">terraform-console</span>

        {requestMeta && (
          <>
            <Badge variant="outline" className="font-mono text-xs">
              {requestMeta.requestId}
            </Badge>

            <Badge
              variant="outline"
              className={statusColorMap[requestMeta.status] || "border-gray-400 text-gray-400"}
            >
              {statusLabelMap[requestMeta.status] || requestMeta.status}
            </Badge>
          </>
        )}

        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPaused(!isPaused)}
          tooltip={isPaused ? "Play" : "Pause"}
          className="h-8 w-8"
          disabled={!terminalStatus}
        >
          {isPaused ? <Play className="h-4 w-4 text-success" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          tooltip="Clear logs"
          disabled={isAwsDisconnected || !terminalStatus}
          onClick={() => requestMeta && handleClearLogs(requestMeta.requestId)}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          tooltip="Download logs"
          onClick={downloadLogs}
          className="h-8 w-8"
          disabled={!terminalStatus}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ConsoleBody({
  requestMeta,
  displayedLogs,
  loading,
  isAwsDisconnected,
  isLiveMode,
  consoleRef,
}: {
  requestMeta?: { requestId: string; status: string };
  displayedLogs: TerraformLog[];
  loading: boolean;
  isAwsDisconnected: boolean;
  isLiveMode: boolean;
  consoleRef: React.RefObject<HTMLDivElement>;
}) {
  if (!requestMeta) {
    return (
      <div className="flex-1 overflow-auto p-4 bg-terminal-bg font-mono text-sm scrollbar-thin">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          {isAwsDisconnected ? <p>AWS Disconnected</p> : <p>Select a request to view live logs</p>}
        </div>
      </div>
    );
  }

  return (
    <div ref={consoleRef} className="flex-1 overflow-auto p-4 bg-terminal-bg font-mono text-sm scrollbar-thin">
      <div className="space-y-0.5">
        {displayedLogs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-fade-in">
            <span className="text-muted-foreground flex-shrink-0 text-xs">
              {log.timestamp.toLocaleTimeString()}
            </span>
            <span className={cn(getLogColor(log.level), "break-all")}>{log.message}</span>
          </div>
        ))}

        {loading && displayedLogs.length === 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-4 bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Connecting to live stream...</span>
          </div>
        )}

        {isLiveMode && displayedLogs.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Waiting for logs to stream...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsoleFooter({
  displayedLogs,
  isLiveMode,
  isPaused,
}: {
  displayedLogs: TerraformLog[];
  isLiveMode: boolean;
  isPaused: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Lines: {displayedLogs.length}</span>
        <span>
          Mode: <span className={cn(isLiveMode ? "text-blue-500" : "text-muted-foreground")}>{isLiveMode ? "Live" : "Archive"}</span>
        </span>
        {displayedLogs.length > 0 && (
          <span>
            Status: <span className={cn(isPaused ? "text-warning" : "text-success")}>{isPaused ? "Paused" : isLiveMode ? "Streaming" : "Playing"}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function LiveConsole() {
  const { alert, confirm } = useDialog();
  const hasFetchedArchiveRef = useRef<ArchiveFetchKey>(null);
  const isConnectingRef = useRef(false);
  const lastSseAttemptRef = useRef<number>(0);
  const archiveStreamingRef = useRef(false);
  const activeServiceRef = useRef<string | null>(null);
  const activeOperationRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { data: awsConfig } = useAwsConfig();
  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";
  const [searchParams] = useSearchParams();
  const requestIdFromUrl = searchParams.get("request");
  const serviceFromUrl = searchParams.get("service");
  const operationFromUrl = searchParams.get("operation");
  const { activeRequestId, activeService, activeOperation, setActiveRequest } = useAppStore();
  const [isPaused, setIsPaused] = useState(false);
  const [displayedLogs, setDisplayedLogs] = useState<TerraformLog[]>([]);
  const [loading, setLoading] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [allLogs, setAllLogs] = useState<TerraformLog[]>([]);
  const pausedLogsRef = useRef<TerraformLog[]>([]);
  const sseCompletedRef = useRef(false);

  const { data: requestMeta } = useRequestDetails(activeRequestId, activeService ?? undefined);
  const clearLogsMutation = useClearRequestLogs();
  const downloadLogsMutation = useDownloadRequestLogs();
  const liveSseLogsRef = useRef<TerraformLog[]>([]);
  const liveStreamHadRetryRef = useRef(false);

  const TERMINAL_STATUSES = ["completed", "failed", "terminated", "destroyed"];
  const PROVISIONING_STATUSES = [
    "pending",
    "provisioning",
    "terminating",
    "retrying",
    "retrying_terminate",
    "destroying",
  ];

  const isTransientCompleteService =
    activeService === "vpc-terminate-service" || activeService === "lb-cli-terminate-service";
  const effectiveTerminalStatuses = isTransientCompleteService
    ? TERMINAL_STATUSES.filter((status) => status !== "completed")
    : TERMINAL_STATUSES;
  const effectiveProvisioningStatuses = isTransientCompleteService
    ? [...PROVISIONING_STATUSES, "completed"]
    : PROVISIONING_STATUSES;

  useEffect(() => {
    activeServiceRef.current = activeService ?? null;
  }, [activeService]);

  useEffect(() => {
    const metadataOperation =
      ["route53-service", "s3-service"].includes(activeService ?? "") &&
      (requestMeta?.action === "delete" ||
        requestMeta?.last_operation === "delete" ||
        requestMeta?.last_operation === "destroy" ||
        ["terminated", "destroyed", "terminating", "destroying"].includes(requestMeta?.status ?? ""))
        ? "delete"
        : requestMeta?.action === "create"
          ? "create"
          : null;

    activeOperationRef.current = activeOperation ?? metadataOperation;
  }, [activeOperation, activeService, requestMeta?.action, requestMeta?.last_operation, requestMeta?.status]);

  useEffect(() => {
    if (isAwsDisconnected && activeRequestId) {
      setDisplayedLogs([]);
      setIsLiveMode(false);
      setActiveRequest(null);
    }
  }, [isAwsDisconnected, activeRequestId, setActiveRequest]);

  useEffect(() => {
    if (requestIdFromUrl) {
      const resolvedService = serviceFromUrl ?? activeService ?? null;
      setActiveRequest(requestIdFromUrl, resolvedService, operationFromUrl ?? activeOperation);
      navigate("/console", { replace: true });
    }
  }, [requestIdFromUrl, serviceFromUrl, operationFromUrl, setActiveRequest, navigate, activeService, activeOperation]);

  const effectiveRequestId = activeRequestId;

  useEffect(() => {
    setDisplayedLogs([]);
    setCurrentLogIndex(0);
    setAllLogs([]);
    setIsLiveMode(false);
    setIsPaused(false);
    pausedLogsRef.current = [];
    liveSseLogsRef.current = [];
    liveStreamHadRetryRef.current = false;
    isConnectingRef.current = false;
    lastSseAttemptRef.current = 0;
    hasFetchedArchiveRef.current = null;
    sseCompletedRef.current = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [effectiveRequestId, activeService]);

  const detectLogLevel = (message: string): TerraformLog["level"] => {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("error") || lowerMsg.includes("failed") || lowerMsg.includes("❌")) {
      return "error";
    }

    if (lowerMsg.includes("warn") || lowerMsg.includes("warning") || lowerMsg.includes("⚠️")) {
      return "warn";
    }

    if (
      lowerMsg.includes("success") ||
      lowerMsg.includes("completed") ||
      lowerMsg.includes("✅") ||
      lowerMsg.includes("🎉") ||
      lowerMsg.includes("[triggered by]")
    ) {
      return "success";
    }

    return "info";
  };

  const handleClearLogs = async (requestId: string) => {
    const confirmed = await confirm({
      title: `Are you sure you want to delete logs for ${requestId}?`,
      icon: "destroy",
    });

    if (!confirmed) return;

    clearLogsMutation.mutate(requestId, {
      onSuccess: () => {
        setDisplayedLogs([]);
        setAllLogs([]);
        setCurrentLogIndex(0);
        pausedLogsRef.current = [];
        liveSseLogsRef.current = [];
        liveStreamHadRetryRef.current = false;
        hasFetchedArchiveRef.current = null;
        setActiveRequest(null);
      },
    });
  };

  const extractTimestamp = (message: string): Date | null => {
    const timestampMatch = message.match(/^\[([^\]]+)\]/);

    if (!timestampMatch) {
      return null;
    }

    try {
      return new Date(timestampMatch[1]);
    } catch {
      return null;
    }
  };

  const stripTimestamp = (message: string): string => message.replace(/^\[[^\]]+\]\s*/, "");

  const fetchCompletedLogs = useCallback(
    async (requestId: string, targetStatus: string, fallbackLogs: TerraformLog[] = []): Promise<FetchResult> => {
      try {
        setLoading(true);

        const logsData = await fetchRequestLogsApi(
          requestId,
          isLiveOnlyService(activeServiceRef.current ?? undefined)
            ? undefined
            : activeServiceRef.current ?? undefined,
          activeOperationRef.current ?? undefined,
        );

        const logText = logsData.logs || "";
        const isPlaceholder =
          !logText.trim() ||
          NOT_READY_PHRASES.some((phrase) => logText.trim().toLowerCase().startsWith(phrase));

        if (isPlaceholder) {
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "not-ready";
        }

        const usesCombinedLogFile =
          activeServiceRef.current !== "route53-service" &&
          activeServiceRef.current !== "s3-service" &&
          activeServiceRef.current !== "lb-cli-terminate-service";

        if (
          usesCombinedLogFile &&
          (targetStatus === "terminated" || targetStatus === "destroyed") &&
          !hasDestroyLogs(logText)
        ) {
          console.log("[LiveConsole] S3 has provision logs but destroy logs not yet uploaded — retrying…");
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "partial";
        }

        if (
          usesCombinedLogFile &&
          (targetStatus === "terminated" || targetStatus === "destroyed" || targetStatus === "completed") &&
          liveStreamHadRetryRef.current &&
          !hasRetryLogs(logText)
        ) {
          console.log("[LiveConsole] Live stream had a retry but S3 archive does not yet contain retry logs — retrying…");
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "partial";
        }

        const logs: TerraformLog[] = logText
          .split("\n")
          .filter((line) => line.trim())
          .map((line, index) => ({
            id: `log-${requestId}-${index}`,
            timestamp: extractTimestamp(line) || new Date(),
            level: detectLogLevel(line),
            message: stripAnsiCodes(stripTimestamp(line)),
            requestId,
          }));

        if (logs.length === 0) {
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "not-ready";
        }

        liveSseLogsRef.current = [];
        setDisplayedLogs([]);
        setCurrentLogIndex(0);
        setAllLogs(logs);
        return "ready";
      } catch (error) {
        console.error("Failed to fetch completed logs:", error);
        setDisplayedLogs([
          {
            id: "error",
            timestamp: new Date(),
            level: "error",
            message: "Failed to load logs",
            requestId,
          },
        ]);
        return "error";
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const connectToLiveLogs = useCallback(
    async (requestId: string, onComplete?: () => void) => {
      console.log("🔌 Connecting to live logs for:", requestId);

      setDisplayedLogs([]);
      setAllLogs([]);
      setCurrentLogIndex(0);
      liveSseLogsRef.current = [];

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetchLiveRequestLogsStreamApi(
          requestId,
          abortController.signal,
          activeServiceRef.current ?? undefined,
        );

        if (!response.ok) {
          if (response.status === 400 && activeServiceRef.current === "vpc-terminate-service") {
            console.log("[LiveConsole] vpc-terminate SSE not ready yet (400), will retry on next status poll");
            isConnectingRef.current = false;
            setIsLiveMode(false);
            return;
          }

          if (
            response.status === 400 &&
            (activeServiceRef.current === "lb-service" || activeServiceRef.current === "lb-cli-terminate-service")
          ) {
            console.log("[LiveConsole] lb SSE not available (400) — switching to archive");
            isConnectingRef.current = false;
            setIsLiveMode(false);
            return;
          }

          console.log(`[LiveConsole] SSE returned ${response.status} — releasing lock`);
          isConnectingRef.current = false;
          setIsLiveMode(false);
          return;
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        setLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("🏁 Stream complete");
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const message of messages) {
            if (!message.trim()) continue;
            if (message.startsWith(":")) continue;

            if (message.startsWith("data: ")) {
              const jsonData = message.substring(6);

              try {
                const data = JSON.parse(jsonData);

                if (data.type === "connected") {
                  continue;
                }

                if (data.type === "complete") {
                  sseCompletedRef.current = true;
                  setIsLiveMode(false);
                  break;
                }

                if (data.message) {
                  const cleanMessage = stripAnsiCodes(stripTimestamp(data.message));

                  if (/RETRY\s+ATTEMPT/i.test(cleanMessage)) {
                    liveStreamHadRetryRef.current = true;
                  }

                  const logEntry: TerraformLog = {
                    id: `log-${requestId}-${Date.now()}-${Math.random()}`,
                    timestamp: new Date(data.timestamp),
                    level: detectLogLevel(cleanMessage),
                    message: cleanMessage,
                    requestId,
                  };

                  liveSseLogsRef.current = [...liveSseLogsRef.current, logEntry];
                  setDisplayedLogs((prev) => [...prev, logEntry]);
                }
              } catch (err) {
                console.error("❌ Failed to parse SSE message:", err, jsonData);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("❌ SSE error:", error);
        }
        setLoading(false);
      } finally {
        isConnectingRef.current = false;
        if (sseCompletedRef.current && onComplete) {
          onComplete();
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!effectiveRequestId || !requestMeta) return;

    const isLiveOnlyActive = isLiveOnlyService(activeService ?? undefined);

    if (isLiveOnlyActive) {
      const currentStatus = requestMeta.status;
      const isAlreadyTerminal = currentStatus === "terminated" || currentStatus === "failed";

      if (isAlreadyTerminal) {
        const fetchKey: ArchiveFetchKey = { requestId: effectiveRequestId, status: currentStatus };
        const alreadyFetched =
          hasFetchedArchiveRef.current?.requestId === fetchKey.requestId &&
          hasFetchedArchiveRef.current?.status === fetchKey.status;

        if (!alreadyFetched) {
          hasFetchedArchiveRef.current = fetchKey;
          setIsLiveMode(false);

          const tryFetch = async (attemptsLeft: number) => {
            const result = await fetchCompletedLogs(effectiveRequestId, currentStatus, []);
            if (result === "ready" || result === "error") return;
            if (attemptsLeft > 0) {
              hasFetchedArchiveRef.current = null;
              setTimeout(() => {
                hasFetchedArchiveRef.current = fetchKey;
                tryFetch(attemptsLeft - 1);
              }, 3000);
            }
          };

          tryFetch(12);
        }
        return;
      }

      if (!sseCompletedRef.current) {
        const now = Date.now();
        if (!isConnectingRef.current && now - lastSseAttemptRef.current > 5000) {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }

          isConnectingRef.current = true;
          lastSseAttemptRef.current = now;
          hasFetchedArchiveRef.current = null;
          setDisplayedLogs([]);
          setAllLogs([]);
          setIsLiveMode(true);

          const capturedRequestId = effectiveRequestId;
          const sseSnapshot = () => [...liveSseLogsRef.current];

          connectToLiveLogs(capturedRequestId, () => {
            const snapshot = sseSnapshot();
            const tryFetch = async (attemptsLeft: number) => {
              const result = await fetchCompletedLogs(capturedRequestId, "completed", snapshot);
              if (result === "ready" || result === "error") return;
              if (attemptsLeft > 0) {
                setTimeout(() => tryFetch(attemptsLeft - 1), 3000);
              }
            };

            tryFetch(12);
          });
        }
      }
      return;
    }

    const status = requestMeta.status;

    if (effectiveProvisioningStatuses.includes(status)) {
      const now = Date.now();
      const msSinceLastAttempt = now - lastSseAttemptRef.current;

      if (!isConnectingRef.current && msSinceLastAttempt > 5000) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        isConnectingRef.current = true;
        lastSseAttemptRef.current = now;
        hasFetchedArchiveRef.current = null;
        setDisplayedLogs([]);
        setAllLogs([]);
        setIsLiveMode(true);

        if (isTransientCompleteService) {
          const capturedRequestId = effectiveRequestId;
          const sseSnapshot = () => [...liveSseLogsRef.current];

          connectToLiveLogs(capturedRequestId, () => {
            const snapshot = sseSnapshot();
            const tryFetch = async (attemptsLeft: number) => {
              const result = await fetchCompletedLogs(capturedRequestId, "destroyed", snapshot);
              if (result === "ready" || result === "error") return;
              if (attemptsLeft > 0) {
                setTimeout(() => tryFetch(attemptsLeft - 1), 3000);
              }
            };

            tryFetch(12);
          });
        } else {
          connectToLiveLogs(effectiveRequestId);
        }
      }
    } else if (effectiveTerminalStatuses.includes(status)) {
      const fetchKey: ArchiveFetchKey = { requestId: effectiveRequestId, status };
      const alreadyFetched =
        hasFetchedArchiveRef.current?.requestId === fetchKey.requestId &&
        hasFetchedArchiveRef.current?.status === fetchKey.status;

      if (!alreadyFetched) {
        hasFetchedArchiveRef.current = fetchKey;
        setIsLiveMode(false);

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        const sseSnapshot = [...liveSseLogsRef.current];
        const tryFetch = async (attemptsLeft: number) => {
          const result = await fetchCompletedLogs(effectiveRequestId, status, sseSnapshot);

          if (result === "ready" || result === "error") return;

          if (attemptsLeft > 0) {
            hasFetchedArchiveRef.current = null;
            setTimeout(() => {
              hasFetchedArchiveRef.current = fetchKey;
              tryFetch(attemptsLeft - 1);
            }, 3000);
          }
        };

        const initialDelay = status === "terminated" || status === "destroyed" ? 2000 : 0;
        setTimeout(() => tryFetch(12), initialDelay);
      }
    }
  }, [
    activeService,
    connectToLiveLogs,
    effectiveRequestId,
    effectiveProvisioningStatuses,
    effectiveTerminalStatuses,
    fetchCompletedLogs,
    isTransientCompleteService,
    requestMeta,
  ]);

  useEffect(() => {
    if (!isLiveMode && isPaused && displayedLogs.length > 0) {
      pausedLogsRef.current = displayedLogs;
    }
  }, [isPaused, displayedLogs, isLiveMode]);

  useEffect(() => {
    if (consoleRef.current && !isPaused) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [displayedLogs, isPaused]);

  useEffect(() => {
    if (allLogs.length === 0 || currentLogIndex >= allLogs.length) return;
    if (isPaused) {
      if (pausedLogsRef.current.length > 0 && displayedLogs.length === 0) {
        setDisplayedLogs(pausedLogsRef.current);
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLogs((prev) => [...prev, allLogs[currentLogIndex]]);
      setCurrentLogIndex((prev) => prev + 1);
    }, 50);

    return () => clearTimeout(timer);
  }, [currentLogIndex, allLogs, isPaused, displayedLogs]);

  useEffect(() => {
    if (archiveStreamingRef.current && allLogs.length > 0 && currentLogIndex >= allLogs.length) {
      archiveStreamingRef.current = false;
    }
  }, [currentLogIndex, allLogs.length]);

  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestMeta?.status) return;

    const prev = prevStatusRef.current;
    const current = requestMeta.status;

    if (prev === "provisioning" && current === "completed") {
      alert({
        title: `Request ${requestMeta.requestId} completed successfully`,
        severity: "success",
      });
    }

    if (prev === "retrying" && current === "failed") {
      alert({
        title: `Retry Provisioning Request ${requestMeta.requestId} failed`,
        severity: "error",
      });
    }

    if (prev === "retrying_terminate" && current === "failed") {
      alert({
        title: `Retry Terminate Request ${requestMeta.requestId} failed`,
        severity: "error",
      });
    }

    if (prev === "retrying_terminate" && current === "destroyed") {
      alert({
        title: `Request ${requestMeta.requestId} destroyed successfully`,
        severity: "success",
      });
    }

    if (prev === "terminating" && current === "terminated") {
      alert({
        title: `Request ${requestMeta.requestId} terminated successfully`,
        severity: "success",
      });
    }

    prevStatusRef.current = current;
  }, [alert, requestMeta?.status]);

  const downloadLogs = () => {
    if (!effectiveRequestId) return;
    downloadLogsMutation.mutate(effectiveRequestId);
  };

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col">
      <ConsoleHeader
        requestMeta={requestMeta}
        loading={loading}
        isAwsDisconnected={isAwsDisconnected}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        handleClearLogs={handleClearLogs}
        downloadLogs={downloadLogs}
      />

      <ConsoleBody
        requestMeta={requestMeta}
        displayedLogs={displayedLogs}
        loading={loading}
        isAwsDisconnected={isAwsDisconnected}
        isLiveMode={isLiveMode}
        consoleRef={consoleRef}
      />

      <ConsoleFooter displayedLogs={displayedLogs} isLiveMode={isLiveMode} isPaused={isPaused} />
    </div>
  );
}
