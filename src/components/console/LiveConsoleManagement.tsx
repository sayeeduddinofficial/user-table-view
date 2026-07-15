/**
 * LiveConsoleManagement.tsx
 * Top-level orchestrator for Live Console using React Query hooks
 */

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Download, Maximize2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseBackendTimestamp } from "@/utils/date";
import {
  useActiveRequests,
  useRequestLogs,
  useInvalidateLogsOnRequestChange,
} from "@/hooks/useLiveConsole";
import type { LogEntry } from "@/components/console/liveConsoleApi";

interface LiveConsoleManagementProps {
  activeRequestId?: string | null;
  onRequestSelect?: (requestId: string) => void;
}

export function LiveConsoleManagement({ 
  activeRequestId, 
  onRequestSelect 
}: LiveConsoleManagementProps) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(activeRequestId || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const invalidateLogsOnChange = useInvalidateLogsOnRequestChange();

  // React Query hooks
  const { data: activeRequests = [], isLoading: loadingRequests } = useActiveRequests();
  const { data: logsData, isLoading: loadingLogs } = useRequestLogs(selectedRequest);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && logsData?.logs) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsData?.logs]);

  // Handle external request selection
  useEffect(() => {
    if (activeRequestId && activeRequestId !== selectedRequest) {
      invalidateLogsOnChange(selectedRequest, activeRequestId);
      setSelectedRequest(activeRequestId);
    }
  }, [activeRequestId]);

  // Handle request selection
  function handleRequestSelect(requestId: string) {
    invalidateLogsOnChange(selectedRequest, requestId);
    setSelectedRequest(requestId);
    onRequestSelect?.(requestId);
  }

  // Download logs functionality
  function downloadLogs() {
    if (!logsData?.logs || !selectedRequest) return;
    
    const logText = logsData.logs
      .map((log: LogEntry) => `[${log.timestamp}] ${log.level}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRequest}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    provisioning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    destroying: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    retrying: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    retrying_terminate: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Request Selector */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Active Operations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a request to view logs
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loadingRequests ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading requests...
                </div>
              ) : activeRequests.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No active operations
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {activeRequests.map((request) => (
                    <div
                      key={request.request_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRequest === request.request_id
                          ? "bg-primary/10 border-primary"
                          : "bg-card hover:bg-muted/50 border-border"
                      }`}
                      onClick={() => handleRequestSelect(request.request_id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-mono text-sm text-primary">
                          {request.request_id}
                        </span>
                        <Badge
                          variant="outline"
                          className={statusColors[request.status] || statusColors.pending}
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">{request.total_vms} VMs</span>
                          <span className="text-muted-foreground"> • {request.region}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {request.environment}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            parseBackendTimestamp(request.created_at),
                            { addSuffix: true }
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Console Output */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="font-mono text-sm">terraform-console</span>
                {logsData?.status && (
                  <Badge
                    variant="outline"
                    className={statusColors[logsData.status] || statusColors.pending}
                  >
                    {logsData.isComplete ? "Completed" : "Running"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={downloadLogs}
                  disabled={!logsData?.logs?.length}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="bg-black text-green-400 font-mono text-sm h-[calc(100vh-200px)] relative">
              {!selectedRequest ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a request to view live logs</p>
                  </div>
                </div>
              ) : loadingLogs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-blue-400">
                    <div className="animate-pulse">Connecting to live stream...</div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full" ref={scrollRef}>
                  <div className="p-4 space-y-1">
                    {logsData?.logs?.length === 0 ? (
                      <div className="text-muted-foreground">
                        No logs available for this request
                      </div>
                    ) : (
                      logsData?.logs?.map((log: LogEntry, index: number) => (
                        <div key={`${log.id}-${index}`} className="flex gap-2">
                          <span className="text-gray-500 shrink-0">
                            [{log.timestamp}]
                          </span>
                          <span
                            className={
                              log.level === "ERROR"
                                ? "text-red-400"
                                : log.level === "WARN"
                                ? "text-yellow-400"
                                : log.level === "INFO"
                                ? "text-blue-400"
                                : "text-green-400"
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    {logsData?.isComplete && (
                      <div className="text-gray-500 mt-4">
                        --- Process completed ---
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
              
              {/* Lines counter */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                Lines: {logsData?.logs?.length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}