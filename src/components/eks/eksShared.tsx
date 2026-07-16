import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm break-all">{value ?? "—"}</div>
    </div>
  );
}

export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <span className="inline-flex items-start gap-1.5">
      {copied ? (
        <Check
          size={12}
          className="text-green-500 mt-1 shrink-0"
        />
      ) : (
        <Copy
          size={12}
          className="text-muted-foreground cursor-pointer mt-1 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        />
      )}
      <span className="break-all">{text}</span>
    </span>
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            {columns.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="text-sm font-medium">
                  No {emptyLabel.toLowerCase()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  This cluster does not have any {emptyLabel.toLowerCase()}, or
                  you don't have permission to view them.
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 ${j === 0 ? "font-mono text-primary" : ""}`}
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