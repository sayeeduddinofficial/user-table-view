/**
 * RequestsToolbar.tsx
 * Search + status/service/user filters, refresh, and "New Request" action
 * for the Requests list page.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, RefreshCw, Plus } from "lucide-react";
import ChooseServices from "@/components/dialogs/ChooseServices";
import { SERVICE_OPTIONS } from "@/components/requests/vmRequestsApi";

interface RequestsToolbarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  serviceFilter: string;
  onServiceChange: (v: string) => void;
  userFilter: string;
  onUserChange: (v: string) => void;
  isAdmin: boolean;
  users: { id: string; name: string }[];
  onRefresh: () => void;
  isAwsDisconnected: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  hasActiveVpc: boolean;
}

export function RequestsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  serviceFilter,
  onServiceChange,
  userFilter,
  onUserChange,
  isAdmin,
  users,
  onRefresh,
  isAwsDisconnected,
  open,
  setOpen,
  hasActiveVpc,
}: RequestsToolbarProps) {
  return (
    <Card
      className="sticky top-16 z-30 
    glass-panel backdrop-blur 
    border-border/50 p-0"
    >
      <CardContent className="py-0 px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-end p-4 px-6 flex-wrap">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center px-0 flex-wrap flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, user, region..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[160px] bg-background/50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="provisioning">Provisioning</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="destroying">Terminating</SelectItem>
                <SelectItem value="destroyed">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={onServiceChange}>
              <SelectTrigger className="w-[160px] bg-background/50">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {SERVICE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={userFilter} onValueChange={onUserChange}>
                <SelectTrigger className="w-[160px] bg-background/50">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" className="gap-2" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  {isAwsDisconnected ? (
                    <Button disabled className="gap-2"><Plus className="h-4 w-4" />New Request</Button>
                  ) : (
                    <div>
                      <Button onClick={() => setOpen(true)}>
                        <Plus className="h-4 w-4" />New Request
                      </Button>

                      <ChooseServices
                        open={open}
                        onClose={() => setOpen(false)}
                        hasActiveVpc={hasActiveVpc}
                      />
                    </div>
                  )}
                </span>
              </TooltipTrigger>
              {isAwsDisconnected && <TooltipContent side="bottom"><p>AWS Disconnected</p></TooltipContent>}
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
