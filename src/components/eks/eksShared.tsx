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

// Shared copy-to-clipboard behavior — one place for the "copied" flash
// state + timeout logic, reused by CopyText and CommandBlock below.
export function useCopyToClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), resetDelayMs);
    return () => window.clearTimeout(timeout);
  }, [copied, resetDelayMs]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return { copied, copy };
}

export function CopyText({ text }: { text: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <span className="inline-flex items-start gap-1.5">
      {copied ? (
        <Check size={12} className="text-success mt-1 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => copy(text)}
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

/** Numbered step badge used to label sections inside multi-step flows (e.g. Connect dialog). */
export function StepBadge({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/10 text-[11px] font-semibold text-blue-400">
        {step}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </span>
    </div>
  );
}

// Quoted where the family name contains a space — unquoted multi-word font
// names are invalid CSS and get silently dropped by some browsers.
const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/**
 * A titled, copyable, terminal-styled command block.
 * Used by the EKS Connect dialog for every install/verification command,
 * so OS-specific content can vary while the chrome stays identical.
 */
export function CommandBlock({
  label,
  code,
  icon,
}: {
  label: string;
  code: string;
  icon?: React.ReactNode;
}) {
  const { copied, copy } = useCopyToClipboard();

  return (
   <div
  className="
    overflow-hidden
    rounded-lg
    border

    border-gray-200
    bg-white

    dark:border-[#202631]
    dark:bg-[#0e1219]
  "
>
      {/* Command title */}
      <div className="flex items-center justify-between 
    bg-white

    dark:border-[#202631]
    dark:bg-[#0e1219] px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          {icon}
          <span>{label}</span>
        </div>

        <button
          type="button"
          onClick={() => copy(code)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Terminal */}
      <pre
        className="
  m-0
  overflow-x-auto
  whitespace-pre-wrap
  break-all
  rounded-md
  px-3
  py-2.5
  text-xs
  leading-relaxed

  bg-gray-50
  text-gray-700

  dark:bg-[#0d1118]
  dark:text-muted-foreground
"
        style={{ fontFamily: MONO_FONT_STACK }}
      >
        <code style={{ fontFamily: MONO_FONT_STACK }}>{code}</code>
      </pre>
    </div>
  );
}

/**
 * A compact command row — just the code and a copy icon, no separate title
 * bar. Used inside NumberedStep, where the step title is already shown above
 * the command, so repeating it in a CommandBlock-style header would be redundant.
 */
export function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#202631] bg-[#0e1219] px-3 py-2.5">
      <pre
        className="m-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-relaxed text-muted-foreground"
        style={{ fontFamily: MONO_FONT_STACK }}
      >
        <code style={{ fontFamily: MONO_FONT_STACK }}>{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => copy(code)}
        aria-label="Copy command"
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/** One individually numbered setup step: "N. Title" + optional note + a single command. */
export function NumberedStep({
  index,
  title,
  note,
  code,
}: {
  index: number;
  title: string;
  note?: string;
  code: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-blue-400 shrink-0">{index}.</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      {note && <p className="text-xs text-muted-foreground pl-5">{note}</p>}
      <div className="pl-5">
        <CodeBlock code={code} />
      </div>
    </div>
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