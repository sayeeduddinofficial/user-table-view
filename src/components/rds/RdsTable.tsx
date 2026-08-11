/**
 * RdsTable.tsx
 * Renders the cluster/instance hierarchy table for the RDS list page.
 */

import { useState } from 'react';
import { Database, Minus, Plus, Trash2 } from 'lucide-react';
import { RoleBadge, StatusBadge } from '@/components/rds/rdsShared';
import { RDS_TABLE_COLUMNS, type RdsRow } from '@/utils/rds.utils';

interface RdsTableProps {
  clusters: RdsRow[];
  standalones: RdsRow[];
  instancesOf: (clusterId: string) => RdsRow[];
  loading: boolean;
  isDeleting: boolean;
  onOpenInstance: (row: RdsRow) => void;
  onDelete: (row: RdsRow) => void;
}

export function RdsTable({
  clusters,
  standalones,
  instancesOf,
  loading,
  isDeleting,
  onOpenInstance,
  onDelete,
}: RdsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderRow = (row: RdsRow, depth = 0, isLast = false): JSX.Element => {
    const instances = row.isCluster ? instancesOf(row.id) : [];
    const isOpen = expanded.has(row.id);
    const isInstance = depth > 0;
    const isOpenCluster = row.isCluster && isOpen && instances.length > 0;

    return (
      <>
        <tr
          key={row.id}
          className={`transition-colors hover:bg-accent/20 ${
            isOpenCluster ? '' : isInstance && !isLast ? '' : 'border-b border-border/40 last:border-0'
          }`}
        >
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.requestId}</td>
          <td className="px-5 py-3.5 relative">
            {isOpenCluster && (
              <div className="absolute left-[27px] top-[calc(50%+8px)] bottom-0 w-[1.5px] bg-slate-500" />
            )}
            {isInstance && (
              <>
                <div
                  className={`absolute left-[27px] w-[1.5px] bg-slate-500 ${isLast ? 'top-0 h-1/2' : 'inset-y-0'}`}
                />
                <div className="absolute left-[27px] top-1/2 -translate-y-[0.75px] w-4 h-[2px] bg-slate-500" />
              </>
            )}

            <div className="flex items-center gap-2">
              {!isInstance ? (
                <>
                  {row.isCluster && instances.length > 0 ? (
                    <button
                      onClick={() => toggleExpand(row.id)}
                      className="flex items-center justify-center w-4 h-4 border-[1.5px] border-slate-400 text-slate-400 hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={isOpen ? 'Collapse cluster' : 'Expand cluster'}
                    >
                      {isOpen ? <Minus size={12} /> : <Plus size={12} />}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}

                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                    <Database size={14} className="text-primary" />
                  </div>
                  <button
                    onClick={() => onOpenInstance(row)}
                    className="font-medium text-sm hover:underline cursor-pointer text-primary"
                  >
                    {row.dbIdentifier}
                  </button>
                  {row.isCluster && instances.length > 0 && !isOpen && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border/40">
                      {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-5 shrink-0" />
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                    <Database size={14} className="text-primary" />
                  </div>
                  <button
                    onClick={() => onOpenInstance(row)}
                    className="font-medium text-sm hover:underline cursor-pointer text-primary"
                  >
                    {row.dbIdentifier}
                  </button>
                </>
              )}
            </div>
          </td>
          <td className="px-5 py-3.5">
            <StatusBadge status={row.status} />
          </td>
          <td className="px-5 py-3.5">
            <RoleBadge role={row.role} />
          </td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">
            <div className="font-medium text-foreground text-xs">{row.engine}</div>
            <div className="text-xs text-muted-foreground">{row.engineVersion}</div>
          </td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.upgradeRollout}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.region}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.size}</td>
          <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.created}</td>
          <td className="px-5 py-3.5 text-right">
            {!isInstance && (
              <button
                onClick={() => onDelete(row)}
                disabled={isDeleting || row.status === 'Deleting'}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
              </button>
            )}
          </td>
        </tr>

        {row.isCluster &&
          isOpen &&
          instances.map((inst, idx) => renderRow(inst, 1, idx === instances.length - 1))}
      </>
    );
  };

  const isEmpty = clusters.length === 0 && standalones.length === 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
              {RDS_TABLE_COLUMNS.map((header) => (
                <th
                  key={header}
                  className={`px-5 py-3 text-left font-medium whitespace-nowrap ${
                    header === 'Actions' ? 'text-right' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">
                  Loading RDS resources...
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">
                  No RDS resources found.
                </td>
              </tr>
            ) : (
              <>
                {clusters.map((cluster) => renderRow(cluster, 0))}
                {standalones.map((standalone) => renderRow(standalone, 0))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
