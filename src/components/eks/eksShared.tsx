import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { getStatusToneClass } from "./eksUtils";

export const EMPTY_VALUE = "—";

export function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm break-all">{value ?? EMPTY_VALUE}</div>
    </div>
  );
}

export function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm font-semibold text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/** Status value with a check icon when healthy. */
export function StatusText({ status }: { status?: string | null }) {
  const tone = getStatusToneClass(status);
  const isHealthy = tone === "text-success";

  return (
    <span className={`inline-flex items-center gap-1.5 ${tone}`}>
      {isHealthy && <CheckCircle2 size={12} />}
      {status ?? EMPTY_VALUE}
    </span>
  );
}

export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <span className="inline-flex items-start gap-1.5">
      {copied ? (
        <Check size={12} className="text-success mt-1 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Copy size={12} />
        </button>
      )}
      <span className="break-all">{text}</span>
    </span>
  );
}

export function TableEmptyState({
  colSpan,
  title,
  description,
}: {
  colSpan: number;
  title: string;
  description: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs mt-1">{description}</div>
      </td>
    </tr>
  );
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
        {columns.map((column) => (
          <th
            key={column}
            className="px-4 py-2 text-left font-medium whitespace-nowrap"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export interface EksTableColumn<T> {
  header: string;
  /** Cell renderer; keep presentation-only. */
  cell: (row: T) => React.ReactNode;
  /** Render the first column with the monospace/primary treatment. */
  mono?: boolean;
  muted?: boolean;
}

/** Generic read-only table used by the EKS detail tabs. */
export function EksTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle,
  emptyDescription,
}: {
  columns: EksTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <TableHead columns={columns.map((c) => c.header)} />
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyState
              colSpan={columns.length}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-border/40 last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3 ${column.mono ? "font-mono text-primary" : ""} ${
                      column.muted ? "text-muted-foreground" : ""
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ResourceTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[];
  rows: (string | number)[][];
  emptyLabel: string;
}) {
  const label = emptyLabel.toLowerCase();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <TableHead columns={columns} />
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyState
              colSpan={columns.length}
              title={`No ${label}`}
              description={`This cluster does not have any ${label}, or you don't have permission to view them.`}
            />
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/40 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-3 ${cellIndex === 0 ? "font-mono text-primary" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}