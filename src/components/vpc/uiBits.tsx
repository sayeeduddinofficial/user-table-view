import { ChevronDown, ChevronRight, Info } from "lucide-react";

/* ---------- Shared form/layout primitives used across VPC screens ---------- */

export function InfoLink() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-primary">
      <Info size={12} /> Info
    </span>
  );
}

export function Field({
  label,
  hint,
  info,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  info?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium">
          {label}
          {optional && (
            <span className="text-muted-foreground font-normal italic ml-1">
              - optional
            </span>
          )}
        </label>
        {info && <InfoLink />}
      </div>
      {hint && <div className="text-xs text-muted-foreground mb-2">{hint}</div>}
      {children}
    </div>
  );
}

export function RadioRow({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex items-center gap-2 cursor-pointer text-sm"
        >
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="h-4 w-4 accent-primary"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function SelectCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-md border px-4 py-3 transition ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border bg-card hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-4 w-4 rounded-full border grid place-items-center ${
            selected ? "border-primary" : "border-muted-foreground"
          }`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {description && (
        <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {description}
        </div>
      )}
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  labels,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {options.map((o, i) => {
        const active = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className={`px-4 py-1.5 text-sm ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent/30"
            } ${i > 0 ? "border-l border-border" : ""}`}
          >
            {labels?.[String(o)] ?? String(o)}
          </button>
        );
      })}
    </div>
  );
}

export function Collapsible({
  open,
  setOpen,
  label,
  optional,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal italic ml-1">
            - optional
          </span>
        )}
      </button>
      {open && <div className="mt-3 pl-5">{children}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="border-t border-border my-5" />;
}

export function cidrSize(cidr: string) {
  const m = cidr.match(/\/(\d+)$/);
  if (!m) return "—";
  const n = parseInt(m[1], 10);
  if (isNaN(n) || n < 0 || n > 32) return "—";
  return (2 ** (32 - n)).toLocaleString();
}