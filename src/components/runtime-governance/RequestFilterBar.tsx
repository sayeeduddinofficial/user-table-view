import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';

interface Props {
  search: string;
  statusFilter: string;
  scopeFilter: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onScopeChange: (v: string) => void;
}

export function RequestFiltersBar({
  search, statusFilter, scopeFilter,
  onSearchChange, onStatusChange, onScopeChange,
}: Props) {
  return (
    <div className="sticky top-14 md:top-16 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-4 md:px-6 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Request ID, Instance ID, Request By, Manager Email, Reason"
            className="pl-9 bg-muted/50"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="auto_approved">Auto-Approved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scopeFilter} onValueChange={onScopeChange}>
            <SelectTrigger className="w-[150px] bg-muted/50">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scope</SelectItem>
              <SelectItem value="single">Single VM</SelectItem>
              <SelectItem value="request">Entire Request</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}