import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { useRequestDetails, useClearRequestLogs, useDownloadRequestLogs } from "@/hooks/useLiveConsole";
import { fetchRequestLogsApi, fetchLiveRequestLogsStreamApi, isLiveOnlyService } from "@/components/console/liveConsoleApi";
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
  retrying_terminate: "Retrying Terminate",
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
  retrying_terminate: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  destroying: "border-yellow-500 text-yellow-500",   
  destroyed: "border-gray-500 text-gray-500",  
};

// Strip ANSI escape codes from log messages
const stripAnsiCodes = (str: string): string => {
  if (!str) return "";
  return str.replace(/\u001b\[[0-9;]*m/g, "");
};

const NOT_READY_PHRASES = ["logs not available yet", "no logs available"];

/** True once the merged S3 log contains a DESTROY LOGS section. */
// const hasDestroyLogs = (logText: string): boolean =>
//   /DESTROY\s+LOGS/i.test(logText);
const hasDestroyLogs = (logText: string): boolean =>
  /DESTROY\s+LOGS/i.test(logText) || 
  /VPC\s+CLI\s+TERMINATION\s+LOGS/i.test(logText) ||
  /LOAD\s+BALANCER\s+CLI\s+TERMINATION\s+LOGS/i.test(logText);

const hasRetryLogs = (logText: string): boolean =>
  /TERMINATE\s+RETRY\s+ATTEMPT/i.test(logText);

type ArchiveFetchKey = { requestId: string; status: string } | null;

type FetchResult = "ready" | "partial" | "not-ready" | "error";

export function LiveConsole() {
  const { alert, confirm } = useDialog();
  const hasFetchedArchiveRef = useRef<ArchiveFetchKey>(null);
  const isConnectingRef = useRef(false);
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

  // Use hooks for API calls
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



// Keep it in sync with the store value:
useEffect(() => {
    console.log("activeService changed:", activeService);
  activeServiceRef.current = activeService ?? null;
}, [activeService]);

useEffect(() => {
  const metadataOperation = activeService === "route53-service" &&
    (requestMeta?.action === "delete" || requestMeta?.last_operation === "delete" ||
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
      console.log("Setting active request from URL:", requestIdFromUrl, "service:", resolvedService);
      setActiveRequest(requestIdFromUrl, resolvedService, operationFromUrl ?? activeOperation);
      navigate(`/console`, { replace: true });
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
    hasFetchedArchiveRef.current = null;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [effectiveRequestId]);



  const detectLogLevel = (message: string): TerraformLog["level"] => {
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("error") ||
      lowerMsg.includes("failed") ||
      lowerMsg.includes("❌")
    )
      return "error";
    if (
      lowerMsg.includes("warn") ||
      lowerMsg.includes("warning") ||
      lowerMsg.includes("⚠️")
    )
      return "warn";
    if (
      lowerMsg.includes("success") ||
      lowerMsg.includes("completed") ||
      lowerMsg.includes("✅") ||
      lowerMsg.includes("🎉")
    )
      return "success";
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

  // Extract timestamp from log line if present
  const extractTimestamp = (message: string): Date | null => {
    const timestampMatch = message.match(/^\[([^\]]+)\]/);
    if (timestampMatch) {
      try {
        return new Date(timestampMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  };

  const stripTimestamp = (message: string): string =>
    message.replace(/^\[[^\]]+\]\s*/, "");

  const fetchCompletedLogs = useCallback(
    async (
      requestId: string,
      targetStatus: string,
      fallbackLogs: TerraformLog[] = [],
    ): Promise<FetchResult> => {
      try {
        setLoading(true);
        const logsData = await fetchRequestLogsApi(
          requestId,
          activeServiceRef.current ?? undefined,
          activeOperationRef.current ?? undefined,
        );
        const logText: string = logsData.logs || "";
        const isPlaceholder =
          !logText.trim() ||
          NOT_READY_PHRASES.some((p) =>
            logText.trim().toLowerCase().startsWith(p),
          );

        if (isPlaceholder) {
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "not-ready";
        }
        // s3-service archives each operation to its own dedicated file
        // (create.log / delete.log) instead of a single combined log with
        // "CREATE LOGS" / "DESTROY LOGS" section markers, so the marker
        // checks below only apply to services that use the combined format.
        const usesCombinedLogFile = !["s3-service", "route53-service"].includes(
          activeServiceRef.current ?? "",
        );
        if (
          usesCombinedLogFile &&
          (targetStatus === "terminated" || targetStatus === "destroyed") &&
          !hasDestroyLogs(logText)
        ) {
          console.log(
            "[LiveConsole] S3 has provision logs but destroy logs not yet uploaded — retrying…",
          );
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "partial";
        }
        if (
          usesCombinedLogFile &&
          targetStatus === "terminated" &&
          liveStreamHadRetryRef.current &&
          !hasRetryLogs(logText)
        ) {
          console.log(
            "[LiveConsole] Live stream had a retry but S3 archive does not yet contain retry logs — retrying…",
          );
          if (fallbackLogs.length > 0) setDisplayedLogs(fallbackLogs);
          return "partial";
        }

        const logs: TerraformLog[] = logText
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string, index: number) => ({
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

  // Connect to SSE endpoint using fetch with ReadableStream
  const connectToLiveLogs = useCallback(
    async (requestId: string) => {
      console.log("🔌 Connecting to live logs for:", requestId);

      // Clear previous logs
      setDisplayedLogs([]);
      setAllLogs([]);
      setCurrentLogIndex(0);
      liveSseLogsRef.current = [];
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        console.log("📡 Fetching live SSE for:", requestId);
        console.log("activeServiceRef.current =", activeServiceRef.current);
        const response = await fetchLiveRequestLogsStreamApi(
          requestId,
          abortController.signal,
          activeServiceRef.current ?? undefined,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        console.log("SSE connection established");
        setLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Read stream
        while (true) {
          console.log("READING...");
          const { done, value } = await reader.read();
          console.log("DONE =", done);
          console.log("VALUE LENGTH =", value?.length);

          if (done) {
            console.log("🏁 Stream complete");
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const message of messages) {
            if (!message.trim()) continue;

            // Skip heartbeat messages
            if (message.startsWith(":")) {
              console.log("💓 Heartbeat received");
              continue;
            }

            if (message.startsWith("data: ")) {

    console.log("========== MESSAGE RECEIVED ==========");

              const jsonData = message.substring(6);

              try {
                const data = JSON.parse(jsonData);
                console.log("📨 SSE message:", data);

                if (data.type === "connected") {
                  console.log("🔗 Connected to logs for:", data.requestId);
                  continue;
                }

                if (data.type === "complete") {
                  console.log("🏁 Provisioning complete:", data.status);
               setIsLiveMode(false);
                  // Note: requestMeta is now from hook, status updates automatically
                  break;
                }

                // Regular log message
                if (data.message) {
                  const cleanMessage = stripAnsiCodes(stripTimestamp(data.message));
                 if (/TERMINATE\s+RETRY\s+ATTEMPT/i.test(cleanMessage)) {
                    liveStreamHadRetryRef.current = true;
                  }

                  const logEntry: TerraformLog = {
                    id: `log-${requestId}-${Date.now()}-${Math.random()}`,
                    timestamp: new Date(data.timestamp),
                    level: detectLogLevel(cleanMessage),
                    message: cleanMessage,
                    requestId,
                  };

                  liveSseLogsRef.current = [
                    ...liveSseLogsRef.current,
                    logEntry,
                  ];
                  setDisplayedLogs((prev) => [...prev, logEntry]);
                }
              } catch (err) {
                console.error("❌ Failed to parse SSE message:", err, jsonData);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("🛑 Stream aborted");
        } else {
          console.error("❌ SSE error:", error);
        }
        setLoading(false);
      } finally {
        console.log("🔌 SSE FINALLY CALLED");
        isConnectingRef.current = false;
      }
    },
    [],
  );

  // Handle log streaming based on status
  useEffect(() => {
    if (!effectiveRequestId || !requestMeta) return;

    const status = requestMeta.status;
    const isLiveOnlyActive = isLiveOnlyService(activeService ?? undefined);

    if (PROVISIONING_STATUSES.includes(status) || isLiveOnlyActive) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (!isConnectingRef.current) {
        isConnectingRef.current = true;
        // Reset so the NEXT terminal state triggers a fresh S3 fetch
        hasFetchedArchiveRef.current = null;
         setDisplayedLogs([]);
         setAllLogs([]);
        setIsLiveMode(true);
        connectToLiveLogs(effectiveRequestId);
      }
    } else if (TERMINAL_STATUSES.includes(status)) {
      // Use a compound key so "completed" and "terminated" are treated as
      // distinct fetch targets for the same requestId.
      const fetchKey: ArchiveFetchKey = {
        requestId: effectiveRequestId,
        status,
      };

      const alreadyFetched =
        hasFetchedArchiveRef.current?.requestId === fetchKey.requestId &&
        hasFetchedArchiveRef.current?.status === fetchKey.status;

      if (!alreadyFetched) {
        // Lock immediately to prevent duplicate concurrent fetches
        hasFetchedArchiveRef.current = fetchKey;
        setIsLiveMode(false);

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        if (isLiveOnlyService(activeServiceRef.current ?? undefined)) {
          const sseSnapshot = [...liveSseLogsRef.current];
          setDisplayedLogs(sseSnapshot);
          return;
        }

        const sseSnapshot = [...liveSseLogsRef.current];
        const tryFetch = async (attemptsLeft: number) => {
          const result = await fetchCompletedLogs(
            effectiveRequestId,
            status,
            sseSnapshot,
          );

          console.log(
            `[LiveConsole] fetch result="${result}" attemptsLeft=${attemptsLeft}`,
          );

          if (result === "ready" || result === "error") return;

          if (attemptsLeft > 0) {
            // Release the lock during the wait so the effect can re-enter if
            // the component re-renders, but re-acquire before the next attempt.
            hasFetchedArchiveRef.current = null;
            setTimeout(() => {
              hasFetchedArchiveRef.current = fetchKey;
              tryFetch(attemptsLeft - 1);
            }, 3000);
          } else {
            console.warn(
              "[LiveConsole] Max retries reached waiting for S3 logs.",
            );
          }
        };

        // Give S3 a small head-start for destroyed requests since the DB is
        // updated *before* finalizeLogs finishes uploading to S3.
        const initialDelay = status === "terminated" || status === "destroyed" ? 2000 : 0;
        setTimeout(() => tryFetch(12), initialDelay);
      }
    }
  }, [
    effectiveRequestId,
    requestMeta?.status,
    activeService,     
    connectToLiveLogs,
    fetchCompletedLogs,
  ]);

  // Preserve/restore displayed logs when pausing/resuming archive streaming
  useEffect(() => {
    if (!isLiveMode && isPaused && displayedLogs.length > 0) {
      pausedLogsRef.current = displayedLogs;
    }
  }, [isPaused, displayedLogs, isLiveMode]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (consoleRef.current && !isPaused) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [displayedLogs, isPaused]);

  // Stream logs line-by-line from S3 (for completed requests)
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
    if (
      archiveStreamingRef.current &&
      allLogs.length > 0 &&
      currentLogIndex >= allLogs.length
    ) {
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

    if (prev === "terminating" && current === "terminated") {
      alert({
        title: `Request ${requestMeta.requestId} terminated successfully`,
        severity: "success",
      });
    }

    prevStatusRef.current = current;
  }, [requestMeta?.status]);

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

  const downloadLogs = () => {
    if (!effectiveRequestId) return;
    downloadLogsMutation.mutate(effectiveRequestId);
  };

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col">
      {/* Console Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <div className="w-3 h-3 rounded-full bg-warning" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          <span className="font-mono text-sm text-muted-foreground">
            terraform-console
          </span>

          {requestMeta && (
            <>
              <Badge variant="outline" className="font-mono text-xs">
                {requestMeta.requestId}
              </Badge>

              <Badge
                variant="outline"
                className={
                  statusColorMap[requestMeta.status] ||
                  "border-gray-400 text-gray-400"
                }
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
            disabled={
              requestMeta?.status !== "completed" &&
              requestMeta?.status !== "terminated" &&
              requestMeta?.status !== "failed"
            }
          >
            {isPaused ? (
              <Play className="h-4 w-4 text-success" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            tooltip="Clear logs"
            disabled={
              isAwsDisconnected ||
              (requestMeta?.status !== "completed" &&
                requestMeta?.status !== "terminated" &&
                requestMeta?.status !== "failed")
            }
            onClick={() => handleClearLogs(requestMeta!.requestId)}
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
            disabled={
              requestMeta?.status !== "completed" &&
              requestMeta?.status !== "terminated" &&
              requestMeta?.status !== "failed"
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Console Body */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-auto p-4 bg-terminal-bg font-mono text-sm scrollbar-thin"
      >
        {!effectiveRequestId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isAwsDisconnected ? (
              <p>AWS Disconnected</p>
            ) : (
              <p>Select a request to view live logs</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayedLogs.map((log) => (
              <div key={log.id} className="flex gap-3 animate-fade-in">
                <span className="text-muted-foreground flex-shrink-0 text-xs">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={cn(getLogColor(log.level), "break-all")}>
                  {log.message}
                </span>
              </div>
            ))}
            {loading && displayedLogs.length === 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-4 bg-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Connecting to live stream...
                </span>
              </div>
            )}
            {isLiveMode && displayedLogs.length === 0 && !loading && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Waiting for logs to stream...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Console Footer */}
      <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Lines: {displayedLogs.length}</span>
          <span>
            Mode:{" "}
            <span
              className={cn(
                isLiveMode ? "text-blue-500" : "text-muted-foreground",
              )}
            >
              {isLiveMode ? "Live" : "Archive"}
            </span>
          </span>
          {displayedLogs.length > 0 && (
            <span>
              Status:{" "}
              <span className={cn(isPaused ? "text-warning" : "text-success")}>
                {isPaused ? "Paused" : isLiveMode ? "Streaming" : "Playing"}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
