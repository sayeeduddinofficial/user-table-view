import { useEffect, useState } from "react";
import { Check, Copy, Info, LucideIcon } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";
import { Button } from "@/components/ui/button";

export function CopyIconButton({
  value, icon: Icon = Copy, label = "Copy", alertTitle = "Copied", iconSize = 14, className, stopPropagation,
}: {
  value: string;
  icon?: LucideIcon;
  label?: string;
  alertTitle?: string;
  iconSize?: number;
  className?: string;
  stopPropagation?: boolean;
}) {
  const { alert } = useDialog();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        alert({ title: alertTitle, severity: "success" });
      }}
      className={className}
      tooltip={copied ? "Copied" : label}
    >
      {copied ? <Check size={iconSize} /> : <Icon size={iconSize} />}
    </Button>
  );
}

export function Section({ title, info, children, icon, id }: { title: string; info?: boolean; children: React.ReactNode; icon?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="glass-panel rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span>{icon}</span>
        <h3 className="text-base font-semibold">{title}</h3>
        {info && <Info size={14} className="text-primary" />}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FieldRow({ label, info, children }: { label: string; info?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <label className="text-sm font-medium block mb-1.5">
        {label}
        {info && <Info size={14} className="inline text-primary ml-1 align-text-top" />}
      </label>
      {children}
    </div>
  );
}

export function RadioCard({ checked, onChange, title, desc, disabled }: {
  checked: boolean; onChange: () => void; title: string; desc: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`text-left rounded-md border px-4 py-3 transition ${
        disabled
          ? "cursor-not-allowed opacity-50 border-muted bg-card"
          : checked
            ? "border-primary bg-primary/10 ring-1 ring-primary/40"
            : "border-border bg-card hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-4 w-4 shrink-0 rounded-full border grid place-items-center ${
            checked ? "border-primary" : "border-muted-foreground"
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{desc}</div>
    </button>
  );
}

export function RadioRow({ checked, onChange, title, desc, disabled }: {
  checked: boolean; onChange: () => void; title: string; desc?: string; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 py-1 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
      <input type="radio" checked={checked} onChange={onChange} disabled={disabled} className="mt-1 h-4 w-4 accent-primary" />
      <div>
        <div className="text-sm">{title}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
    </label>
  );
}

export function DetailCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
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
        <Check size={12} className="text-green-500 mt-1 shrink-0" />
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

export function DetailField({ label, value, mono, copy, help }: { label: string; value: string; mono?: boolean; copy?: boolean; help?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {help && <p className="text-xs text-muted-foreground mb-1">{help}</p>}
      <div className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>
        {copy ? <CopyText text={value} /> : (value ?? "—")}
      </div>
    </div>
  );
}

export function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}