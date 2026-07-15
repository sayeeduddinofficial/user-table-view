import { Info } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Section({ title, info, children }: { title: string; info?: boolean; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {info && <Info size={14} className="text-primary" />}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FieldRow({ label, info, children }: { label: string; info?: boolean; children: React.ReactNode }) {
  return (
    <div>
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
    <div className="bg-card border border-border rounded-lg">
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

export function DetailField({ label, value, mono, copy, help }: { label: string; value: string; mono?: boolean; copy?: boolean; help?: string }) {
  const { alert } = useDialog();

  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-semibold mb-1">{label}</div>
      {help && <p className="text-xs text-muted-foreground mb-1">{help}</p>}
      <div className={`text-sm break-all flex items-start gap-2 ${mono ? "font-mono text-xs" : ""}`}>
        {copy && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { navigator.clipboard.writeText(value); alert({ title: "Copied", severity: "success" }); }}
            className="h-auto w-auto p-0 text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
            tooltip="Copy"
          >
            <Copy size={12} />
          </Button>
        )}
        <span className={copy ? "text-primary" : ""}>{value}</span>
      </div>
    </div>
  );
}
