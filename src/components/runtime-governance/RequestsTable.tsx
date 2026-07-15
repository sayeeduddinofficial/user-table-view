import { RefreshCw, Clock, Layers, Monitor } from 'lucide-react';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DisplayRow } from '../runtime-governance/types/index';
import { StatusBadge } from './StatusBadge';
import { RequestActionCell } from './RequestActionCell';
import { formatDateTime } from '../../utils/Runtimegovernance.utils';

interface Props {
  loading: boolean;
  totalRequests: number;
  paginatedRows: DisplayRow[];
  actionInProgress: string | null;
  rejectInProgress: string | null;
  currentUserRole: string;
  currentUserEmail: string;
  onApprove: (row: DisplayRow) => void;
  onReject: (row: DisplayRow) => void;
}

export function RequestsTable({
  loading, totalRequests, paginatedRows,
  actionInProgress, rejectInProgress,
  currentUserRole, currentUserEmail,
  onApprove, onReject,
}: Props) {
  function canActOnRow(row: DisplayRow): boolean {
    if (row.effectiveStatus !== 'pending') return false;
    const req = row.representativeRow;
    const requesterRole = req.requester_role ?? '';
    const requesterEmail = req.requester_email?.trim().toLowerCase() ?? '';

    if (currentUserRole === 'SuperAdmin') return true;
    if (currentUserRole === 'SplunkOps.Admin') {
      return requesterRole === 'SplunkOps.User' && requesterEmail !== currentUserEmail;
    }
    return false;
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading requests...</span>
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No extension requests found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {totalRequests === 0
                ? 'No requests have been submitted yet.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {['Request ID', 'Scope', 'Instance / Request', 'VM Name',
                      'Requested By', 'Duration', 'Reason', 'Manager Email',
                      'Request Time', 'Status', 'Actions'].map((h) => (
                      <TableHead key={h}
                        className={`text-muted-foreground font-medium${h === 'Actions' ? ' text-right' : ''}`}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedRows.map((row) => {
                    const req = row.representativeRow;
                    const isRequestRow = req.request_type === 'REQUEST';
                    const canAct = canActOnRow(row);
                    const isApproving = actionInProgress === row.key;
                    const isRejecting = rejectInProgress === row.key;

                    return (
                      <TableRow key={row.key}
                        className="border-border/50 hover:bg-muted/20 transition-colors h-12">

                        {/* 1. Request ID */}
                        <TableCell className="font-mono text-sm font-semibold text-foreground py-2">
                          {req.request_id}
                        </TableCell>

                        {/* 2. Scope */}
                        <TableCell>
                          {isRequestRow ? (
                            <Badge variant="outline"
                              className="bg-primary/10 text-primary border-primary/30 gap-1">
                              <Layers className="h-3 w-3" /> Request
                            </Badge>
                          ) : (
                            <Badge variant="outline"
                              className="bg-muted/50 text-muted-foreground border-border/50 gap-1">
                              <Monitor className="h-3 w-3" /> Single
                            </Badge>
                          )}
                        </TableCell>

                        {/* 3. Instance / Request */}
                        <TableCell className="font-mono text-sm text-muted-foreground py-2">
                          {isRequestRow ? req.request_id : req.instance_id}
                        </TableCell>

                        {/* 4. VM Name */}
                        <TableCell className="font-mono text-sm py-2 max-w-[180px]">
                          {isRequestRow ? (
                            <span className="text-foreground">
                              All Running VMs ({req.request_id})
                              {row.vmCount !== undefined && (
                                <span className="ml-1.5 text-[11px] text-muted-foreground font-sans">
                                  · {row.vmCount} VM{row.vmCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-foreground">{req.vm_name ?? '—'}</span>
                          )}
                        </TableCell>

                        {/* 5. Requested By */}
                        <TableCell className="text-sm text-foreground py-2">
                          {req.requester_email}
                        </TableCell>

                        {/* 6. Duration */}
                        <TableCell>
                          <Badge variant="outline" className="font-mono gap-1">
                            <Clock className="h-3 w-3" />
                            {req.requested_duration}h
                          </Badge>
                        </TableCell>

                        {/* 7. Reason */}
                        <TableCell
                          className="text-sm text-foreground max-w-[200px] truncate py-2"
                          title={req.reason}>
                          {req.reason}
                        </TableCell>

                        {/* 8. Manager Email */}
                        <TableCell className="text-sm text-muted-foreground py-2">
                          {req.manager_email}
                        </TableCell>

                        {/* 9. Request Time */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap py-2">
                          {formatDateTime(req.request_timestamp)}
                        </TableCell>

                        {/* 10. Status */}
                        <TableCell>
                          <StatusBadge status={row.effectiveStatus} />
                        </TableCell>

                        {/* 11. Actions */}
                        <TableCell className="text-right">
                          <RequestActionCell
                            row={row}
                            canAct={canAct}
                            isApproving={isApproving}
                            isRejecting={isRejecting}
                            onApprove={onApprove}
                            onReject={onReject}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
}

export function RequestsPagination({
  currentPage, totalPages, totalRows, rowsPerPage, onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <p className="text-xs text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">
          {(currentPage - 1) * rowsPerPage + 1}–
          {Math.min(currentPage * rowsPerPage, totalRows)}
        </span>{' '}
        of <span className="font-medium text-foreground">{totalRows}</span> requests
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs"
          disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </Button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button key={p} variant={currentPage === p ? 'default' : 'outline'}
              size="sm" className="h-8 w-8 p-0 text-xs"
              onClick={() => onPageChange(p as number)}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs"
          disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}